defmodule OpalCore.SocialFlow.Households do
  @moduledoc """
  Repair #18 Division B (B5a) — household pod context.

  Declaration only: a pod exists because a user declared it and each
  member accepted for themselves. Nothing in this module reads
  location, TravelState, plan history, or family edges to infer a
  household, and membership grants no visibility — a pod is a
  planning context (defaults + suggestions), never a trust tier.

  What a pod changes, and only this:
  - plan-creation defaults (participants / home label / timezone),
    applied per-create from the creator's PRIMARY pod and never
    learned over an edit;
  - one weekly supply suggestion (a batched AttentionCenter card,
    one AttentionBudget batch slot) whose acceptance creates ONE
    ordinary SharedPlan for the whole pod;
  - a context label on NowStrip plan events whose participant set is
    exactly the pod.
  """

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Intelligence.AttentionBudget
  alias OpalCore.Repo

  alias OpalCore.SocialFlow.{
    AttentionCenter,
    Clock,
    Household,
    HouseholdMembership,
    PlanParticipant,
    SharedPlan
  }

  alias OpalCore.SocialMemory.SurfacedNudge

  @supply_dedupe_prefix "pod_supply:"
  @supply_weekly_seconds 7 * 86_400
  @supply_dismiss_seconds 30 * 86_400

  # --- Laws ---

  def inferred_households?, do: false
  def pod_grants_visibility?, do: false
  def reads_travel_state?, do: false
  def reads_location?, do: false

  # --- Declare / invite / accept / leave ---

  def create_household(creator_id, attrs) when is_binary(creator_id) and is_map(attrs) do
    a = stringify(attrs)

    invites =
      a["invite_user_ids"] |> List.wrap() |> Enum.reject(&(&1 == creator_id)) |> Enum.uniq()

    with :ok <- ensure_users_exist([creator_id | invites]) do
      Repo.transaction(fn ->
        {:ok, household} =
          %Household{}
          |> Household.changeset(%{
            label: a["label"],
            home_label: a["home_label"] || "Home",
            created_by_user_id: creator_id,
            timezone: a["timezone"] || "America/Los_Angeles",
            status: "active"
          })
          |> Repo.insert()

        {:ok, _} =
          insert_membership(
            household.id,
            creator_id,
            "admin",
            "active",
            primary_if_none(creator_id)
          )

        Enum.each(invites, fn uid ->
          {:ok, _} = insert_membership(household.id, uid, "member", "invited", false)
        end)

        household
      end)
      |> case do
        {:ok, household} -> {:ok, household}
        {:error, reason} -> {:error, reason}
      end
    end
  end

  def create_household(_, _), do: {:error, :invalid}

  defp insert_membership(household_id, user_id, role, status, primary?) do
    %HouseholdMembership{}
    |> HouseholdMembership.changeset(%{
      household_id: household_id,
      user_id: user_id,
      role: role,
      status: status,
      is_primary: primary?,
      idempotency_key: "hm:#{household_id}:#{user_id}"
    })
    |> Repo.insert()
  end

  defp primary_if_none(user_id) do
    not Repo.exists?(
      from(m in HouseholdMembership,
        where: m.user_id == ^user_id and m.is_primary == true and m.status == "active"
      )
    )
  end

  def accept(household_id, user_id), do: transition(household_id, user_id, "invited", "active")
  def decline(household_id, user_id), do: transition(household_id, user_id, "invited", "declined")

  @doc "Leaving is unilateral and immediate. A departing primary clears the flag."
  def leave(household_id, user_id) do
    case membership(household_id, user_id) do
      %HouseholdMembership{status: status} = m when status in ~w(active invited) ->
        m
        |> HouseholdMembership.changeset(%{status: "left", is_primary: false})
        |> Repo.update()

      %HouseholdMembership{} ->
        {:error, :not_a_member}

      nil ->
        {:error, :not_found}
    end
  end

  defp transition(household_id, user_id, from_status, to_status) do
    case membership(household_id, user_id) do
      %HouseholdMembership{status: ^from_status} = m ->
        m |> HouseholdMembership.changeset(%{status: to_status}) |> Repo.update()

      %HouseholdMembership{status: status} ->
        if status == to_status,
          do: {:ok, membership(household_id, user_id)},
          else: {:error, :not_invited}

      nil ->
        {:error, :not_found}
    end
  end

  @doc "Set this pod as the user's primary (the one plan defaults read). Exactly one per user."
  def set_primary(household_id, user_id) do
    case membership(household_id, user_id) do
      %HouseholdMembership{status: "active"} = m ->
        Repo.transaction(fn ->
          from(mm in HouseholdMembership,
            where: mm.user_id == ^user_id and mm.is_primary == true and mm.id != ^m.id
          )
          |> Repo.update_all(set: [is_primary: false, updated_at: Clock.utc_now()])

          {:ok, updated} =
            m |> HouseholdMembership.changeset(%{is_primary: true}) |> Repo.update()

          updated
        end)
        |> case do
          {:ok, updated} -> {:ok, updated}
          {:error, reason} -> {:error, reason}
        end

      %HouseholdMembership{} ->
        {:error, :not_active}

      nil ->
        {:error, :not_found}
    end
  end

  # --- Reads ---

  def membership(household_id, user_id) do
    Repo.get_by(HouseholdMembership, household_id: household_id, user_id: user_id)
  end

  def fetch(household_id) do
    case Repo.get(Household, household_id) do
      %Household{} = h -> {:ok, h}
      _ -> {:error, :not_found}
    end
  end

  def get_for_user(household_id, user_id) do
    with {:ok, household} <- fetch(household_id) do
      case membership(household_id, user_id) do
        %HouseholdMembership{status: status} when status in ~w(active invited) ->
          {:ok, to_contract(household, user_id)}

        _ ->
          {:error, :not_found}
      end
    end
  end

  def list_for_user(user_id) do
    from(h in Household,
      join: m in HouseholdMembership,
      on: m.household_id == h.id,
      where: m.user_id == ^user_id and m.status in ~w(active invited),
      order_by: [desc: h.inserted_at],
      select: h
    )
    |> Repo.all()
    |> Enum.map(&to_contract(&1, user_id))
  end

  def active_member_ids(household_id) do
    from(m in HouseholdMembership,
      where: m.household_id == ^household_id and m.status == "active",
      order_by: [asc: m.inserted_at],
      select: m.user_id
    )
    |> Repo.all()
  end

  def pending_member_ids(household_id) do
    from(m in HouseholdMembership,
      where: m.household_id == ^household_id and m.status == "invited",
      order_by: [asc: m.inserted_at],
      select: m.user_id
    )
    |> Repo.all()
  end

  def any_active_membership?(user_id) do
    Repo.exists?(
      from(m in HouseholdMembership, where: m.user_id == ^user_id and m.status == "active")
    )
  end

  @doc "The user's primary pod (active membership flagged primary), or nil."
  def primary_pod(user_id) do
    from(h in Household,
      join: m in HouseholdMembership,
      on: m.household_id == h.id,
      where:
        m.user_id == ^user_id and m.status == "active" and m.is_primary == true and
          h.status == "active",
      select: h,
      limit: 1
    )
    |> Repo.one()
  end

  @doc "The one explicit projection every pod surface renders."
  def to_contract(%Household{} = h, viewer_id \\ nil) do
    viewer_membership = if is_binary(viewer_id), do: membership(h.id, viewer_id), else: nil

    %{
      "id" => h.id,
      "label" => h.label,
      "home_label" => h.home_label,
      "created_by_user_id" => h.created_by_user_id,
      "timezone" => h.timezone,
      "status" => h.status,
      "active_member_user_ids" => active_member_ids(h.id),
      "pending_member_user_ids" => pending_member_ids(h.id),
      "viewer_status" => viewer_membership && viewer_membership.status,
      "viewer_is_primary" => viewer_membership != nil and viewer_membership.is_primary == true,
      "plan_defaults" => %{
        "participant_user_ids" => active_member_ids(h.id),
        "location" => h.home_label,
        "timezone" => h.timezone
      }
    }
  end

  # --- Plan defaults + creation from a context ---

  @doc "Defaults for a plan started from the user's primary pod context."
  def plan_defaults(user_id) do
    case primary_pod(user_id) do
      %Household{} = pod ->
        %{
          "participant_user_ids" => active_member_ids(pod.id),
          "location" => pod.home_label,
          "timezone" => pod.timezone,
          "context_label" => pod.label,
          "household_id" => pod.id
        }

      _ ->
        nil
    end
  end

  @doc """
  Create an ordinary SharedPlan from a named context ("pod" | "none").
  Pod defaults fill only fields the caller did not set; an explicit
  value always wins and is never learned over. Plan type beats place:
  a virtual plan never inherits the home label.
  """
  def create_plan_from_context(user_id, attrs) when is_binary(user_id) and is_map(attrs) do
    a = stringify(attrs)
    defaults = if a["context"] == "pod", do: plan_defaults(user_id), else: nil

    participants =
      a["participant_user_ids"] || (defaults && defaults["participant_user_ids"]) || [user_id]

    participants = (List.wrap(participants) ++ [user_id]) |> Enum.uniq()

    plan_type = a["plan_type"] || "in_person"

    location =
      cond do
        Map.has_key?(a, "location") -> a["location"]
        plan_type == "virtual" -> nil
        defaults -> defaults["location"]
        true -> nil
      end

    timezone = a["timezone"] || (defaults && defaults["timezone"]) || "America/Los_Angeles"

    with :ok <- ensure_users_exist(participants) do
      Repo.transaction(fn ->
        {:ok, plan} =
          %SharedPlan{}
          |> SharedPlan.changeset(%{
            title: a["title"] || "Plan",
            status: "tentative",
            source: "center",
            location: location,
            timezone: timezone,
            plan_type: plan_type,
            start_at: parse_dt(a["start_at"]),
            end_at: parse_dt(a["end_at"]),
            created_by_user_id: user_id,
            alignment:
              Map.merge(a["alignment"] || %{}, %{
                "context" => a["context"] || "none",
                "household_id" => defaults && defaults["household_id"]
              })
          })
          |> Repo.insert()

        Enum.each(participants, fn uid ->
          {:ok, _} =
            %PlanParticipant{}
            |> PlanParticipant.changeset(%{
              plan_id: plan.id,
              user_id: uid,
              role: if(uid == user_id, do: "organizer", else: "participant"),
              response_state: if(uid == user_id, do: "accepted", else: "pending")
            })
            |> Repo.insert()
        end)

        # A dated plan projects to the native calendar, the same
        # projection real plan paths make — NowStrip reads nothing else.
        if plan.start_at do
          {:ok, _} = OpalCore.SocialFlow.OpalCalendar.project_from_shared_plan(plan)
        end

        plan
      end)
      |> case do
        {:ok, plan} -> {:ok, plan_contract(Repo.preload(plan, :participants))}
        {:error, reason} -> {:error, reason}
      end
    end
  end

  def create_plan_from_context(_, _), do: {:error, :invalid}

  @doc "The one explicit projection every plan-from-context surface renders."
  def plan_contract(%SharedPlan{} = plan) do
    participants =
      case plan.participants do
        %Ecto.Association.NotLoaded{} ->
          from(pp in PlanParticipant,
            where: pp.plan_id == ^plan.id,
            order_by: [asc: pp.inserted_at]
          )
          |> Repo.all()

        list ->
          list
      end

    %{
      "id" => plan.id,
      "title" => plan.title,
      "status" => plan.status,
      "source" => plan.source,
      "location" => plan.location,
      "timezone" => plan.timezone,
      "plan_type" => plan.plan_type,
      "created_by_user_id" => plan.created_by_user_id,
      "participants" =>
        Enum.map(participants, fn pp ->
          %{"user_id" => pp.user_id, "role" => pp.role, "response_state" => pp.response_state}
        end)
    }
  end

  # --- Supply suggestion (weekly, batched, one budget slot) ---

  @doc """
  Maybe surface the pod supply card for a user: primary pod with 2+
  active members, no open supply plan, no live card, outside the
  weekly gate and any dismissal suppression. One `grant_batch` slot
  for the whole card. Denial is a silent skip.
  """
  def maybe_surface_supply(user_id, now \\ Clock.utc_now()) do
    case primary_pod(user_id) do
      %Household{} = pod ->
        members = active_member_ids(pod.id)

        cond do
          length(members) < 2 ->
            {:skip, :pod_too_small}

          open_supply_plan?(user_id, pod.id) ->
            {:skip, :supply_plan_open}

          live_card?(user_id, pod.id) ->
            {:skip, :already_surfaced}

          suppressed?(user_id, pod.id, now) ->
            {:skip, :suppressed}

          recently_surfaced?(user_id, pod.id, now) ->
            {:skip, :weekly_gate}

          true ->
            surface_supply(user_id, pod, now)
        end

      _ ->
        {:skip, :no_primary_pod}
    end
  end

  defp surface_supply(user_id, %Household{} = pod, now) do
    copy = "Supply run for #{pod.label}? One plan, everyone adds to it."

    case AttentionBudget.grant_batch(
           user_id,
           "pod_supply",
           [%{"person_id" => pod.id, "topic" => "pod_supply"}],
           provenance: "stated"
         ) do
      {:granted, _} ->
        {:ok, _row} =
          %SurfacedNudge{}
          |> SurfacedNudge.changeset(%{
            account_id: user_id,
            type: "pod_supply",
            ref_id: pod.id,
            priority: 50,
            reason: copy,
            message_draft: copy,
            surfaced_at: now,
            status: "active"
          })
          |> Repo.insert()

        _ =
          AttentionCenter.ingest(%{
            "items" => [
              %{
                "recipient_user_id" => user_id,
                "level" => "attention",
                "reason" => "pod_supply",
                "title" => "Supply run for #{pod.label}?",
                "copy" => "One plan, everyone adds to it.",
                "dedupe_key" => "#{@supply_dedupe_prefix}#{pod.id}",
                "action_required" => true,
                "source_type" => "pod_supply",
                "source_id" => pod.id,
                "privacy_safe" => true
              }
            ],
            "source_type" => "pod_supply"
          })

        {:ok, :surfaced}

      {:denied, reason} ->
        {:denied, reason}
    end
  end

  @doc "Accept the supply suggestion: create ONE ordinary SharedPlan for the whole pod."
  def accept_supply(user_id) do
    case primary_pod(user_id) do
      %Household{} = pod ->
        if open_supply_plan?(user_id, pod.id) do
          {:error, :supply_plan_open}
        else
          members = active_member_ids(pod.id)

          result =
            Repo.transaction(fn ->
              {:ok, plan} =
                %SharedPlan{}
                |> SharedPlan.changeset(%{
                  title: "Supply run - #{pod.label}",
                  status: "tentative",
                  source: "center",
                  location: pod.home_label,
                  timezone: pod.timezone,
                  plan_type: "in_person",
                  created_by_user_id: user_id,
                  alignment: %{"kind" => "pod_supply", "household_id" => pod.id}
                })
                |> Repo.insert()

              Enum.each(members, fn uid ->
                {:ok, _} =
                  %PlanParticipant{}
                  |> PlanParticipant.changeset(%{
                    plan_id: plan.id,
                    user_id: uid,
                    role: if(uid == user_id, do: "organizer", else: "participant"),
                    response_state: if(uid == user_id, do: "accepted", else: "pending")
                  })
                  |> Repo.insert()
              end)

              plan
            end)

          _ = AttentionCenter.resolve_key("#{@supply_dedupe_prefix}#{pod.id}")

          case result do
            {:ok, plan} -> {:ok, plan_contract(Repo.preload(plan, :participants))}
            {:error, reason} -> {:error, reason}
          end
        end

      _ ->
        {:error, :no_primary_pod}
    end
  end

  @doc "Dismiss the supply card: permanent for 30 days (SurfacedNudge suppression)."
  def dismiss_supply(user_id) do
    case primary_pod(user_id) do
      %Household{} = pod ->
        now = Clock.utc_now()

        from(n in SurfacedNudge,
          where: n.account_id == ^user_id and n.type == "pod_supply" and n.ref_id == ^pod.id
        )
        |> Repo.update_all(
          set: [
            status: "dismissed",
            suppressed_until:
              DateTime.add(now, @supply_dismiss_seconds, :second)
              |> DateTime.truncate(:microsecond),
            updated_at: now
          ]
        )

        _ = AttentionCenter.resolve_key("#{@supply_dedupe_prefix}#{pod.id}")
        :ok

      _ ->
        {:error, :no_primary_pod}
    end
  end

  def open_supply_plan?(user_id, household_id) do
    Repo.exists?(
      from(p in SharedPlan,
        where:
          p.created_by_user_id == ^user_id and p.status in ~w(tentative agreed changed) and
            fragment("? ->> 'kind' = 'pod_supply'", p.alignment) and
            fragment("? ->> 'household_id' = ?", p.alignment, ^household_id)
      )
    )
  end

  defp live_card?(user_id, household_id) do
    alias OpalCore.SocialFlow.AttentionCenterItem

    Repo.exists?(
      from(i in AttentionCenterItem,
        where:
          i.owner_user_id == ^user_id and i.status == "active" and
            i.dedupe_key == ^"#{@supply_dedupe_prefix}#{household_id}"
      )
    )
  end

  defp suppressed?(user_id, household_id, now) do
    Repo.exists?(
      from(n in SurfacedNudge,
        where:
          n.account_id == ^user_id and n.type == "pod_supply" and n.ref_id == ^household_id and
            not is_nil(n.suppressed_until) and n.suppressed_until > ^now
      )
    )
  end

  defp recently_surfaced?(user_id, household_id, now) do
    since = DateTime.add(now, -@supply_weekly_seconds, :second)

    Repo.exists?(
      from(n in SurfacedNudge,
        where:
          n.account_id == ^user_id and n.type == "pod_supply" and n.ref_id == ^household_id and
            n.surfaced_at > ^since
      )
    )
  end

  # --- Helpers ---

  defp ensure_users_exist(ids) do
    found =
      from(u in User, where: u.id in ^ids, select: u.id)
      |> Repo.all()
      |> MapSet.new()

    if Enum.all?(ids, &MapSet.member?(found, &1)), do: :ok, else: {:error, :unknown_member}
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end

  defp parse_dt(%DateTime{} = dt), do: DateTime.truncate(dt, :microsecond)

  defp parse_dt(iso) when is_binary(iso) do
    case DateTime.from_iso8601(iso) do
      {:ok, dt, _} -> DateTime.truncate(dt, :microsecond)
      _ -> nil
    end
  end

  defp parse_dt(_), do: nil
end
