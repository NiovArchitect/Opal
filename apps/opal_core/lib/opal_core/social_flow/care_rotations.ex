defmodule OpalCore.SocialFlow.CareRotations do
  @moduledoc """
  Repair #18 Division B (B4) — care rotation context.

  A rotation rides the existing temporal follow-through substrate: one
  occurrence = one ledger row (`CareCheckIn`) + one TFT loop of kind
  `care_check_in`. Materialization is driven by the TFT tick (every
  minute) and is idempotent end to end (occurrence key + TFT
  idempotency key), so retries and restarts mint nothing twice.

  Missed check-in law (QUIET):
  - A miss is exactly one fact: window end passed, occurrence still
    open, no cover completed it.
  - It surfaces exactly once, to exactly the member set (assignee
    included — the set shares one truth), through AttentionAuthority +
    AttentionCenter with dedupe key `care:<occurrence_key>:missed`,
    gated per recipient by AttentionBudget (provenance `stated` — a
    rotation is an explicit human agreement, never inferred). A budget
    or quiet-hours denial downgrades that member's row to ambient; it
    is never an error and never retries as a second surface.
  - The TFT loop is resolved by the surface itself, so re-evaluation
    can never re-decide it. No escalation at any miss count, ever.
  - A late cover retracts the surface for the whole set via
    `AttentionCenter.resolve_key/2`.

  The pointer advances when an occurrence closes, keyed off the
  occurrence's original slot (`slot_user_id`), so passes can never
  reshuffle who owes which turn.
  """

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Intelligence.AttentionBudget
  alias OpalCore.Repo

  alias OpalCore.SocialFlow.{
    AttentionAuthority,
    AttentionCenter,
    CareCheckIn,
    CareRotation,
    Clock,
    TemporalFollowThrough,
    TemporalFollowThroughLoop
  }

  alias OpalCore.SocialFlow.CareRotations.Schedule

  # --- Laws ---

  def health_data_collected?, do: false
  def escalation_ladder?, do: false
  def miss_surfaces_more_than_once?, do: false
  def per_member_miss_scores?, do: false
  def shadow_subject_accounts?, do: false
  def new_scheduler?, do: false

  # --- Create / membership ---

  @doc """
  Create a rotation. The creator is the first (and initially only)
  active member and the admin; everyone in `member_user_ids` is a
  proposal until that person accepts.
  """
  def create_rotation(creator_id, attrs) when is_binary(creator_id) and is_map(attrs) do
    a = stringify(attrs)

    proposed =
      a["member_user_ids"] |> List.wrap() |> Enum.reject(&(&1 == creator_id)) |> Enum.uniq()

    with {:ok, cadence} <- Schedule.validate_cadence(a["cadence"] || %{}),
         :ok <- ensure_users_exist([creator_id | proposed]),
         :ok <- ensure_set_size(1 + length(proposed)) do
      %CareRotation{}
      |> CareRotation.changeset(%{
        subject_label: a["subject_label"],
        created_by_user_id: creator_id,
        admin_user_id: creator_id,
        member_user_ids: [creator_id],
        pending_member_user_ids: proposed,
        next_assignee_index: 0,
        cadence: cadence,
        timezone: a["timezone"] || "America/Los_Angeles",
        conversation_id: a["conversation_id"],
        status: "active"
      })
      |> Repo.insert()
    end
  end

  def create_rotation(_, _), do: {:error, :invalid}

  @doc "Accept a proposed membership. Idempotent for existing members."
  def accept_membership(rotation_id, user_id) do
    with {:ok, rotation} <- fetch(rotation_id) do
      cond do
        user_id in rotation.member_user_ids ->
          {:ok, rotation}

        user_id in rotation.pending_member_user_ids ->
          rotation
          |> CareRotation.changeset(%{
            member_user_ids: rotation.member_user_ids ++ [user_id],
            pending_member_user_ids: List.delete(rotation.pending_member_user_ids, user_id)
          })
          |> Repo.update()

        true ->
          {:error, :not_invited}
      end
    end
  end

  @doc "Decline a proposed membership."
  def decline_membership(rotation_id, user_id) do
    with {:ok, rotation} <- fetch(rotation_id) do
      if user_id in rotation.pending_member_user_ids do
        rotation
        |> CareRotation.changeset(%{
          pending_member_user_ids: List.delete(rotation.pending_member_user_ids, user_id)
        })
        |> Repo.update()
      else
        {:error, :not_invited}
      end
    end
  end

  @doc """
  Remove a member (admin, or the member themselves). Future
  unmaterialized assignments rewrite themselves via the pointer; an
  open occurrence held by the departing member becomes unassigned-open.
  A set that drops to zero ends automatically.
  """
  def remove_member(rotation_id, actor_id, target_id) do
    with {:ok, rotation} <- fetch(rotation_id) do
      cond do
        actor_id != rotation.admin_user_id and actor_id != target_id ->
          {:error, :not_admin}

        target_id not in rotation.member_user_ids and
            target_id not in rotation.pending_member_user_ids ->
          {:error, :not_a_member}

        true ->
          members = List.delete(rotation.member_user_ids, target_id)
          pending = List.delete(rotation.pending_member_user_ids, target_id)

          {:ok, updated} =
            rotation
            |> CareRotation.changeset(%{
              member_user_ids: members,
              pending_member_user_ids: pending,
              status: if(members == [], do: "ended", else: rotation.status)
            })
            |> Repo.update()

          if target_id in rotation.member_user_ids do
            from(c in CareCheckIn,
              where:
                c.rotation_id == ^rotation.id and c.status == "open" and
                  c.assignee_user_id == ^target_id
            )
            |> Repo.update_all(set: [assignee_user_id: nil, updated_at: Clock.utc_now()])
          end

          if members == [], do: cancel_open_occurrences(updated)
          {:ok, updated}
      end
    end
  end

  # --- Subject link (consented) ---

  @doc "Admin proposes linking the subject's own account."
  def propose_subject_link(rotation_id, actor_id, subject_user_id) do
    with {:ok, rotation} <- fetch(rotation_id),
         :ok <- ensure_admin(rotation, actor_id),
         :ok <- ensure_users_exist([subject_user_id]) do
      rotation
      |> CareRotation.changeset(%{pending_subject_user_id: subject_user_id})
      |> Repo.update()
    end
  end

  @doc "The subject accepts the link. Visibility stays OFF until the subject turns it on."
  def accept_subject_link(rotation_id, user_id) do
    with {:ok, rotation} <- fetch(rotation_id) do
      if rotation.pending_subject_user_id == user_id do
        rotation
        |> CareRotation.changeset(%{subject_user_id: user_id, pending_subject_user_id: nil})
        |> Repo.update()
      else
        {:error, :not_proposed}
      end
    end
  end

  @doc "Only the linked subject controls whether they may view the rotation."
  def set_subject_visible(rotation_id, user_id, visible) when is_boolean(visible) do
    with {:ok, rotation} <- fetch(rotation_id) do
      if rotation.subject_user_id == user_id do
        rotation |> CareRotation.changeset(%{subject_visible: visible}) |> Repo.update()
      else
        {:error, :not_subject}
      end
    end
  end

  # --- Lifecycle ---

  def pause(rotation_id, actor_id), do: set_status(rotation_id, actor_id, "paused")
  def resume(rotation_id, actor_id), do: set_status(rotation_id, actor_id, "active")

  @doc "Admin ends the rotation: open occurrences cancel, loops resolve, no miss ever surfaces for them."
  def end_rotation(rotation_id, actor_id) do
    with {:ok, rotation} <- fetch(rotation_id),
         :ok <- ensure_admin(rotation, actor_id) do
      {:ok, updated} =
        rotation |> CareRotation.changeset(%{status: "ended"}) |> Repo.update()

      cancel_open_occurrences(updated)
      {:ok, updated}
    end
  end

  defp set_status(rotation_id, actor_id, status) do
    with {:ok, rotation} <- fetch(rotation_id),
         :ok <- ensure_admin(rotation, actor_id) do
      if rotation.status == "ended" do
        {:error, :already_ended}
      else
        rotation |> CareRotation.changeset(%{status: status}) |> Repo.update()
      end
    end
  end

  defp cancel_open_occurrences(%CareRotation{} = rotation) do
    now = Clock.utc_now()

    rows =
      from(c in CareCheckIn,
        where: c.rotation_id == ^rotation.id and c.status in ~w(open scheduled)
      )
      |> Repo.all()

    Enum.each(rows, fn row ->
      row |> CareCheckIn.changeset(%{status: "cancelled"}) |> Repo.update()
      if row.tft_loop_id, do: resolve_loop(row.tft_loop_id, "cancelled", now)
      _ = AttentionCenter.resolve_key("care:#{row.occurrence_key}")
      _ = AttentionCenter.resolve_key("care:#{row.occurrence_key}:missed")
    end)

    :ok
  end

  # --- Materialization (driven by the TFT tick) ---

  @doc """
  Materialize the currently-open occurrence for every active rotation.
  Idempotent: an existing ledger row for the occurrence key is reused,
  and its TFT loop registration is idempotent by key.
  """
  def materialize_active(now \\ Clock.utc_now()) do
    rotations =
      from(r in CareRotation, where: r.status == "active")
      |> Repo.all()

    results = Enum.map(rotations, &materialize_one(&1, now))
    %{materialized: Enum.count(results, &(&1 == :created)), rotations: length(rotations)}
  end

  defp materialize_one(%CareRotation{} = rotation, now) do
    members = rotation.member_user_ids || []

    if members == [] do
      :skipped
    else
      case Schedule.latest_opened_window(rotation.cadence, rotation.timezone, now) do
        {date, start_at, end_at} ->
          key = Schedule.occurrence_key(rotation.id, date)

          case Repo.get_by(CareCheckIn, rotation_id: rotation.id, occurrence_key: key) do
            %CareCheckIn{} = existing ->
              _ = ensure_loop(rotation, existing)
              :existing

            nil ->
              idx = rem(rotation.next_assignee_index || 0, length(members))
              assignee = Enum.at(members, idx)

              %CareCheckIn{}
              |> CareCheckIn.changeset(%{
                rotation_id: rotation.id,
                occurrence_key: key,
                assignee_user_id: assignee,
                slot_user_id: assignee,
                window_start_at: start_at,
                window_end_at: end_at,
                status: "open"
              })
              |> Repo.insert()
              |> case do
                {:ok, row} ->
                  _ = ensure_loop(rotation, row)
                  :created

                {:error, _} ->
                  :existing
              end
          end

        nil ->
          :skipped
      end
    end
  end

  defp ensure_loop(%CareRotation{} = rotation, %CareCheckIn{} = row) do
    if is_binary(row.tft_loop_id) do
      {:ok, :present}
    else
      case TemporalFollowThrough.register(%{
             "kind" => "care_check_in",
             "source_id" => row.occurrence_key,
             "conversation_id" => rotation.conversation_id,
             "owner_user_id" => row.assignee_user_id,
             "responsibility_user_id" => row.assignee_user_id,
             "participant_ids" => rotation.member_user_ids,
             "timezone" => rotation.timezone,
             "precision" => "datetime",
             "semantic_deadline_at" => DateTime.to_iso8601(row.window_end_at),
             "attention_dedupe_key" => "care:#{row.occurrence_key}",
             "idempotency_key" => "care-loop:#{row.occurrence_key}",
             "metadata" => %{
               "subject_label" => rotation.subject_label,
               "occurrence_key" => row.occurrence_key,
               "rotation_id" => rotation.id
             }
           }) do
        {:ok, loop, _} ->
          row |> CareCheckIn.changeset(%{tft_loop_id: loop.id}) |> Repo.update()

        other ->
          other
      end
    end
  end

  # --- Complete / pass ---

  @doc """
  The one completion write path (every surface calls this): validates
  membership, records done/covered, completes the TFT loop, retracts
  any miss surface for the whole set, advances the pointer off the
  occurrence's slot, and materializes the next occurrence if its
  window is already open. Idempotent on an already-closed occurrence.
  """
  def complete_check_in(rotation_id, occurrence_key, user_id, note \\ nil) do
    with {:ok, rotation} <- fetch(rotation_id),
         :ok <- ensure_member(rotation, user_id),
         {:ok, row} <- fetch_check_in(rotation, occurrence_key) do
      cond do
        row.status in ~w(done covered) ->
          {:ok, row}

        row.status == "cancelled" ->
          {:error, :occurrence_closed}

        true ->
          now = Clock.utc_now()

          status =
            cond do
              not is_nil(row.missed_surfaced_at) -> "covered"
              is_nil(row.assignee_user_id) -> "done"
              row.assignee_user_id == user_id -> "done"
              true -> "covered"
            end

          attrs = %{
            status: status,
            done_by_user_id: user_id,
            done_at: now
          }

          attrs = if is_binary(note) and note != "", do: Map.put(attrs, :note, note), else: attrs

          {:ok, updated} = row |> CareCheckIn.changeset(attrs) |> Repo.update()

          if updated.tft_loop_id, do: TemporalFollowThrough.complete(updated.tft_loop_id)
          _ = AttentionCenter.resolve_key("care:#{occurrence_key}")
          _ = AttentionCenter.resolve_key("care:#{occurrence_key}:missed")

          rotation = advance_pointer(rotation, updated)
          _ = materialize_one(Repo.get!(CareRotation, rotation.id), now)
          {:ok, updated}
      end
    end
  end

  @doc """
  Pass an open occurrence: the assignee (or admin) hands it to another
  member, or opens it to the set with no target. The TFT loop's
  reassign keeps the previous-owner trail; the ledger stamps the
  latest handoff. A swap is two passes with reason "swap".
  """
  def pass_check_in(rotation_id, occurrence_key, user_id, to_user_id \\ nil, reason \\ nil) do
    with {:ok, rotation} <- fetch(rotation_id),
         :ok <- ensure_member(rotation, user_id),
         {:ok, row} <- fetch_check_in(rotation, occurrence_key) do
      cond do
        row.status != "open" ->
          {:error, :occurrence_closed}

        row.assignee_user_id != user_id and rotation.admin_user_id != user_id ->
          {:error, :not_assignee}

        is_binary(to_user_id) and to_user_id not in rotation.member_user_ids ->
          {:error, :invalid_target}

        true ->
          now = Clock.utc_now()

          {:ok, updated} =
            row
            |> CareCheckIn.changeset(%{
              assignee_user_id: to_user_id,
              handoff_from_user_id: row.assignee_user_id,
              handoff_to_user_id: to_user_id,
              handoff_at: now,
              handoff_reason: reason
            })
            |> Repo.update()

          if is_binary(updated.tft_loop_id) and is_binary(to_user_id) do
            TemporalFollowThrough.reassign(updated.tft_loop_id, to_user_id)
          end

          {:ok, updated}
      end
    end
  end

  # Advance keyed off the occurrence's ORIGINAL slot: if the pointer
  # still sits on that slot, move it one past. Passes rewrite the
  # assignee, never the slot, so they cannot move the pointer.
  defp advance_pointer(%CareRotation{} = rotation, %CareCheckIn{} = row) do
    members = rotation.member_user_ids || []
    slot = row.slot_user_id

    if is_binary(slot) and slot in members and members != [] do
      current = rem(rotation.next_assignee_index || 0, length(members))

      if Enum.at(members, current) == slot do
        idx = Enum.find_index(members, &(&1 == slot))

        {:ok, updated} =
          rotation
          |> CareRotation.changeset(%{next_assignee_index: idx + 1})
          |> Repo.update()

        updated
      else
        rotation
      end
    else
      rotation
    end
  end

  # --- Missed surfacing (exactly once, QUIET) ---

  @doc """
  Surface every due, still-open, never-surfaced occurrence exactly
  once to its whole set. Called by the TFT tick after re-evaluation.
  The claim (stamping `missed_surfaced_at`) happens BEFORE ingestion,
  guarded on the stamp being null, so concurrent ticks cannot double
  surface. The occurrence's TFT loop is then resolved so no later
  evaluation can re-decide it.
  """
  def surface_missed(now \\ Clock.utc_now()) do
    due =
      from(c in CareCheckIn,
        join: r in CareRotation,
        on: r.id == c.rotation_id,
        where:
          c.status == "open" and is_nil(c.missed_surfaced_at) and c.window_end_at <= ^now and
            r.status == "active",
        select: {c, r}
      )
      |> Repo.all()

    surfaced =
      Enum.count(due, fn {row, rotation} ->
        surface_one_missed(row, rotation, now) == :surfaced
      end)

    %{surfaced: surfaced, due: length(due)}
  end

  defp surface_one_missed(%CareCheckIn{} = row, %CareRotation{} = rotation, now) do
    {claimed, _} =
      from(c in CareCheckIn, where: c.id == ^row.id and is_nil(c.missed_surfaced_at))
      |> Repo.update_all(set: [missed_surfaced_at: now, updated_at: now])

    if claimed == 1 do
      members = rotation.member_user_ids || []
      missed_key = "care:#{row.occurrence_key}:missed"

      granted =
        Enum.map(members, fn member ->
          case AttentionBudget.request_slot(member, "care_rotation", "reminder", %{
                 person_id: rotation.id,
                 topic: "care_missed:#{row.occurrence_key}",
                 date: Date.to_iso8601(DateTime.to_date(now)),
                 provenance: "stated"
               }) do
            {:granted, _} -> true
            _ -> false
          end
        end)

      all_granted? = members != [] and Enum.all?(granted)

      title = "No check-in logged for #{rotation.subject_label} today"

      body =
        "#{weekday_name(row, rotation)}'s window (#{Schedule.window_label(row.window_start_at, row.window_end_at, rotation.timezone)}) passed without a check-in. Anyone can cover it."

      if all_granted? do
        decision =
          AttentionAuthority.decide(%{
            "source_type" => "proposal",
            "source_id" => row.occurrence_key,
            "dedupe_key" => missed_key,
            "title" => title,
            "copy" => body,
            "required_responder_ids" => members,
            "participants" => members,
            "conversation_id" => rotation.conversation_id
          })

        # AttentionAuthority decides level/recipients; the item title
        # is presentation the Center renders verbatim (decide/1 does
        # not carry one), so it is stamped onto its items here.
        decision =
          Map.update!(decision, "items", fn items ->
            Enum.map(items, &Map.put(&1, "title", title))
          end)

        _ = AttentionCenter.ingest(decision)
      else
        # Budget / quiet-hours denial: the Center row is still written,
        # ambient only — a silent skip of the interruption, never an
        # error and never a retry.
        items =
          Enum.map(members, fn member ->
            %{
              "recipient_user_id" => member,
              "level" => "ambient",
              "reason" => "care_check_in_missed",
              "title" => title,
              "copy" => body,
              "dedupe_key" => missed_key,
              "action_required" => false,
              "source_type" => "care_check_in",
              "source_id" => row.occurrence_key,
              "conversation_id" => rotation.conversation_id
            }
          end)

        _ = AttentionCenter.ingest(%{"items" => items, "source_type" => "care_check_in"})
      end

      if row.tft_loop_id, do: resolve_loop(row.tft_loop_id, "resolved", now)
      :surfaced
    else
      :already_surfaced
    end
  end

  defp weekday_name(%CareCheckIn{} = row, %CareRotation{} = rotation) do
    ~w(Monday Tuesday Wednesday Thursday Friday Saturday Sunday)
    |> Enum.at(Date.day_of_week(Schedule.local_date(row.window_start_at, rotation.timezone)) - 1)
  end

  defp resolve_loop(loop_id, status, now) do
    case Repo.get(TemporalFollowThroughLoop, loop_id) do
      %TemporalFollowThroughLoop{} = loop ->
        loop
        |> TemporalFollowThroughLoop.changeset(%{
          status: status,
          maturity: "resolved",
          last_evaluated_at: now
        })
        |> Repo.update()

      _ ->
        :ok
    end
  end

  # --- Reads / contracts ---

  def fetch(rotation_id) do
    case Repo.get(CareRotation, rotation_id) do
      %CareRotation{} = r -> {:ok, r}
      _ -> {:error, :not_found}
    end
  end

  @doc "Full contract for a member (or pending invitee); note-free subject contract for a visible linked subject."
  def get_for_user(rotation_id, user_id) do
    with {:ok, rotation} <- fetch(rotation_id) do
      cond do
        user_id in rotation.member_user_ids or user_id in rotation.pending_member_user_ids ->
          {:ok, to_contract(rotation, user_id)}

        rotation.subject_user_id == user_id and rotation.subject_visible ->
          {:ok, subject_contract(rotation)}

        true ->
          {:error, :not_found}
      end
    end
  end

  def list_for_user(user_id) do
    rotations =
      from(r in CareRotation,
        where:
          fragment("? = ANY(?)", ^user_id, r.member_user_ids) or
            fragment("? = ANY(?)", ^user_id, r.pending_member_user_ids) or
            (r.subject_user_id == ^user_id and r.subject_visible == true),
        order_by: [desc: r.inserted_at]
      )
      |> Repo.all()

    Enum.map(rotations, fn r ->
      if user_id in r.member_user_ids or user_id in r.pending_member_user_ids do
        to_contract(r, user_id)
      else
        subject_contract(r)
      end
    end)
  end

  def member?(rotation_id, user_id) do
    case fetch(rotation_id) do
      {:ok, r} -> user_id in r.member_user_ids
      _ -> false
    end
  end

  @doc "The one explicit projection every rotation surface renders."
  def to_contract(%CareRotation{} = r, viewer_id \\ nil) do
    check_ins =
      from(c in CareCheckIn,
        where: c.rotation_id == ^r.id,
        order_by: [asc: c.window_start_at],
        limit: 60
      )
      |> Repo.all()

    %{
      "id" => r.id,
      "subject_label" => r.subject_label,
      "subject_user_id" => r.subject_user_id,
      "subject_visible" => r.subject_visible == true,
      "created_by_user_id" => r.created_by_user_id,
      "admin_user_id" => r.admin_user_id,
      "member_user_ids" => r.member_user_ids || [],
      "pending_member_user_ids" => r.pending_member_user_ids || [],
      "next_assignee_index" => r.next_assignee_index,
      "cadence" => r.cadence,
      "timezone" => r.timezone,
      "conversation_id" => r.conversation_id,
      "status" => r.status,
      "viewer_is_member" => is_binary(viewer_id) and viewer_id in (r.member_user_ids || []),
      "viewer_is_admin" => is_binary(viewer_id) and viewer_id == r.admin_user_id,
      "check_ins" => Enum.map(check_ins, &check_in_contract/1)
    }
  end

  @doc "Read-only subject view: cadence + completed check-ins, NEVER notes."
  def subject_contract(%CareRotation{} = r) do
    done =
      from(c in CareCheckIn,
        where: c.rotation_id == ^r.id and c.status in ~w(done covered),
        order_by: [asc: c.window_start_at],
        limit: 60
      )
      |> Repo.all()

    %{
      "id" => r.id,
      "subject_label" => r.subject_label,
      "subject_view" => true,
      "cadence" => r.cadence,
      "timezone" => r.timezone,
      "status" => r.status,
      "check_ins" =>
        Enum.map(done, fn c ->
          %{
            "occurrence_key" => c.occurrence_key,
            "window_start_at" => iso(c.window_start_at),
            "window_end_at" => iso(c.window_end_at),
            "status" => c.status,
            "done_at" => iso(c.done_at)
          }
        end)
    }
  end

  def check_in_contract(%CareCheckIn{} = c) do
    %{
      "id" => c.id,
      "rotation_id" => c.rotation_id,
      "occurrence_key" => c.occurrence_key,
      "assignee_user_id" => c.assignee_user_id,
      "slot_user_id" => c.slot_user_id,
      "window_start_at" => iso(c.window_start_at),
      "window_end_at" => iso(c.window_end_at),
      "status" => c.status,
      "done_by_user_id" => c.done_by_user_id,
      "done_at" => iso(c.done_at),
      "note" => c.note,
      "handoff_from_user_id" => c.handoff_from_user_id,
      "handoff_to_user_id" => c.handoff_to_user_id,
      "handoff_at" => iso(c.handoff_at),
      "handoff_reason" => c.handoff_reason,
      "missed_surfaced_at" => iso(c.missed_surfaced_at)
    }
  end

  # --- Helpers ---

  defp fetch_check_in(%CareRotation{} = rotation, occurrence_key) do
    case Repo.get_by(CareCheckIn, rotation_id: rotation.id, occurrence_key: occurrence_key) do
      %CareCheckIn{} = row -> {:ok, row}
      _ -> {:error, :not_found}
    end
  end

  defp ensure_member(%CareRotation{} = rotation, user_id) do
    if user_id in rotation.member_user_ids, do: :ok, else: {:error, :not_a_member}
  end

  defp ensure_admin(%CareRotation{} = rotation, user_id) do
    if rotation.admin_user_id == user_id, do: :ok, else: {:error, :not_admin}
  end

  defp ensure_set_size(n) do
    if n <= CareRotation.max_members(), do: :ok, else: {:error, :set_too_large}
  end

  defp ensure_users_exist(ids) do
    found =
      from(u in User, where: u.id in ^ids, select: u.id)
      |> Repo.all()
      |> MapSet.new()

    if Enum.all?(ids, &MapSet.member?(found, &1)), do: :ok, else: {:error, :unknown_member}
  end

  defp iso(nil), do: nil
  defp iso(%DateTime{} = dt), do: DateTime.to_iso8601(dt)

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
