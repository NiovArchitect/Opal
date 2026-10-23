defmodule OpalCore.SocialFlow.Checkin do
  @moduledoc """
  Repair #18 Division B, Track B3 - circle check-in sweep context.

  One organizer action asks every member of a chosen circle "are you
  okay / where are you / what do you need"; answers roll into ONE
  organizer summary projected from two tables (checkin_sweeps +
  checkin_responses) - the single source of truth every surface
  renders. Design: coordination/repair18/track-b3-checkin-sweep.md.

  Law held here, server-side:
  - The target is a frozen snapshot resolved from one source at
    creation (section 1.6, rules R1-R7). Membership changes after
    creation never mutate an open sweep.
  - Delivery is a private Opal 1:1 ask card per member (section 2.2),
    never a blast into the group conversation. A conversation source
    gets exactly one organizer-authored marker message.
  - Answers are structured and verbatim (section 2.3). No LLM
    paraphrase, no sentiment inference, no memory admission, no
    intelligence pipeline processing (section 5.6).
  - QUIET law (section 3.4): one open sweep per (organizer, circle),
    a 24-hour cooldown after close, ZERO reminders to anyone, ever.
  - Location is stated, or tapped (section 5.3): coordinates are
    taken only from the respond request's own payload and coarsened
    by Center.DeviceLocation. Stored device coords are never read
    into a sweep.
  - Creating a sweep (Act 1) is user-initiated contact: it does NOT
    require any proactive opt-in. Opal SUGGESTING a sweep (Act 2)
    lives in CheckinSuggestion behind the full gate stack.
  """

  require Logger
  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Center.{DeviceLocation, PlanningContext}
  alias OpalCore.Messaging.Conversation
  alias OpalCore.OpalConversations
  alias OpalCore.OpalConversations.OpalMessage
  alias OpalCore.Push.NotificationIntelligence
  alias OpalCore.Relationships
  alias OpalCore.Relationships.RelationshipType
  alias OpalCore.Repo

  alias OpalCore.SocialFlow.{
    AttentionCenter,
    CheckinResponse,
    CheckinSweep,
    Clock,
    FamilyContext,
    FamilyMembership,
    PlanParticipant,
    SharedPlan,
    TrustSafety
  }

  alias OpalCoreWeb.Endpoint

  @max_targets 20
  @cooldown_hours 24
  @default_expiry_hours 48
  @marker_body "I asked Opal to check in with everyone here. Replies come back to me privately - if you would rather answer here in the group, that is fine too, but Opal will not count it in my summary."
  @terminal_statuses CheckinResponse.terminal_statuses()

  # =====================================================================
  # Creation
  # =====================================================================

  @doc """
  Create (or return the already-open) sweep for a circle.

  `source` is `%{"kind" => kind, "ref_id" => id | nil, "filter" => map}`.
  Returns `{:ok, sweep, :created | :already_open}` or `{:error, reason}`
  with reason in `:not_a_member | :not_found | :no_targets |
  :circle_too_large | :sweep_quiet_window | :invalid_source |
  :invalid_expiry`; the quiet-window error is
  `{:error, :sweep_quiet_window, next_allowed_at}`.
  """
  def create_sweep(organizer_id, source, opts \\ [])

  def create_sweep(organizer_id, source, opts)
      when is_binary(organizer_id) and is_map(source) do
    idempotency_key = opts[:idempotency_key] || source["idempotency_key"]

    if is_binary(idempotency_key) do
      case Repo.get_by(CheckinSweep, idempotency_key: idempotency_key) do
        %CheckinSweep{organizer_user_id: ^organizer_id} = existing ->
          {:ok, existing, :already_open}

        %CheckinSweep{} ->
          {:error, :invalid}

        nil ->
          do_create(organizer_id, source, opts, idempotency_key)
      end
    else
      {:error, :idempotency_key_required}
    end
  end

  def create_sweep(_, _, _), do: {:error, :invalid}

  defp do_create(organizer_id, source, opts, idempotency_key) do
    with {:ok, resolved} <- resolve_targets(organizer_id, source),
         :ok <- check_size(resolved),
         {:ok, expiry_hours} <- expiry_hours(opts[:expires_in_hours]),
         :ok <- quiet_gate(organizer_id, resolved.circle_key) do
      insert_and_deliver(organizer_id, resolved, opts, idempotency_key, expiry_hours)
    else
      {:already_open, %CheckinSweep{} = open} -> {:ok, open, :already_open}
      other -> other
    end
  end

  defp insert_and_deliver(organizer_id, resolved, opts, idempotency_key, expiry_hours) do
    now = Clock.utc_now()

    attrs = %{
      organizer_user_id: organizer_id,
      source_kind: resolved.source_kind,
      source_ref_id: resolved.source_ref_id,
      source_filter: resolved.source_filter,
      circle_key: resolved.circle_key,
      circle_label: resolved.circle_label,
      member_ids: resolved.askable_ids,
      not_askable_ids: resolved.not_askable_ids,
      minor_ids: resolved.minor_ids,
      prompt_theme: clean_theme(opts[:prompt_theme]),
      status: "open",
      expires_at: DateTime.add(now, expiry_hours * 3600, :second),
      idempotency_key: idempotency_key
    }

    case insert_sweep_with_responses(attrs, resolved) do
      {:ok, sweep} ->
        after_create(sweep, resolved)
        {:ok, sweep, :created}

      {:error, :already_open} ->
        case open_sweep_for(organizer_id, resolved.circle_key) do
          %CheckinSweep{} = open -> {:ok, open, :already_open}
          nil -> {:error, :already_open}
        end

      {:error, reason} ->
        {:error, reason}
    end
  end

  defp insert_sweep_with_responses(attrs, resolved) do
    Repo.transaction(fn ->
      sweep =
        case %CheckinSweep{} |> CheckinSweep.changeset(attrs) |> Repo.insert() do
          {:ok, sweep} -> sweep
          {:error, cs} -> Repo.rollback(changeset_reason(cs))
        end

      Enum.each(resolved.askable_ids, fn member_id ->
        %CheckinResponse{}
        |> CheckinResponse.changeset(%{
          sweep_id: sweep.id,
          member_user_id: member_id,
          status: "asked",
          delivery_state: "deliverable"
        })
        |> Repo.insert!()
      end)

      sweep
    end)
  rescue
    e in Ecto.ConstraintError ->
      if String.contains?(e.message, "one_open_per_circle") or
           String.contains?(e.message, "idempotency_key") do
        {:error, :already_open}
      else
        reraise e, __STACKTRACE__
      end
  end

  defp changeset_reason(cs) do
    if Keyword.has_key?(cs.errors, :idempotency_key) or
         Keyword.has_key?(cs.errors, :organizer_user_id) do
      :already_open
    else
      {:invalid, cs.errors}
    end
  end

  # Side effects after the creation transaction commits: per-member
  # private ask delivery, the single group marker, Attention items.
  # Delivery failures never un-create the sweep - the response rows
  # are the record of who was asked.
  defp after_create(sweep, resolved) do
    Enum.each(resolved.askable_ids, fn member_id ->
      deliver_ask(sweep, member_id)
    end)

    maybe_post_marker(sweep)
    ingest_organizer_attention(sweep, organizer_summary(sweep))
    deliver_summary_card(sweep)
    :ok
  end

  # The organizer's Center summary card (design 4.4): an OpalMessage
  # whose metadata points at the sweep; the client renders the live
  # projection for it, never this body text as data.
  defp deliver_summary_card(sweep) do
    with {:ok, conversation} <-
           OpalConversations.get_or_create_conversation(sweep.organizer_user_id),
         {:ok, _msg} <-
           %OpalMessage{}
           |> OpalMessage.changeset(%{
             "conversation_id" => conversation.id,
             "role" => "opal",
             "body" =>
               "Check-in started for #{sweep.circle_label} - answers come back to you privately and roll up in one summary.",
             "metadata" => %{
               "source" => "checkin_sweep",
               "kind" => "summary_ref",
               "sweep_id" => sweep.id
             }
           })
           |> Repo.insert() do
      :ok
    end
  rescue
    _ -> :ok
  end

  @doc """
  The server-derived circle key for a source, without creating
  anything. For relationship_set the key is the same snapshot hash
  creation computes (read-only resolution over the organizer's own
  rows). Used by CheckinSuggestion so suggestion dedupe and sweep
  dedupe can never disagree about which circle is which.
  """
  def circle_key_for(_organizer_id, %{"kind" => kind, "ref_id" => ref_id})
      when kind in ~w(conversation plan family_context) and is_binary(ref_id) do
    case cast_uuid(ref_id) do
      {:ok, uuid} -> {:ok, "#{kind}:#{uuid}"}
      _ -> {:error, :invalid_source}
    end
  end

  def circle_key_for(organizer_id, %{"kind" => "relationship_set"} = source)
      when is_binary(organizer_id) do
    case resolve_targets(organizer_id, source) do
      {:ok, resolved} -> {:ok, resolved.circle_key}
      {:error, reason} -> {:error, reason}
    end
  end

  def circle_key_for(_, _), do: {:error, :invalid_source}

  @doc "Resolved askable target ids for a source (read-only; suggestion gate 3b)."
  def resolved_member_ids(organizer_id, source) do
    case resolve_targets(organizer_id, source) do
      {:ok, resolved} -> {:ok, resolved.askable_ids, resolved.minor_ids}
      {:error, reason} -> {:error, reason}
    end
  end

  # =====================================================================
  # Resolution (section 1.6, R1-R7)
  # =====================================================================

  defp resolve_targets(organizer_id, %{"kind" => "conversation", "ref_id" => ref_id})
       when is_binary(ref_id) do
    with {:ok, ref_id} <- cast_uuid(ref_id),
         %Conversation{} = conv <- Repo.get(Conversation, ref_id) do
      members = OpalCore.Messages.member_user_ids(ref_id)

      if organizer_id in members do
        targets = Enum.reject(members, &(&1 == organizer_id))
        label = conversation_circle_label(conv, targets)

        {:ok,
         base_resolution(
           "conversation",
           ref_id,
           %{},
           "conversation:#{ref_id}",
           label,
           targets,
           organizer_id
         )}
      else
        {:error, :not_a_member}
      end
    else
      _ -> {:error, :not_found}
    end
  end

  defp resolve_targets(organizer_id, %{"kind" => "plan", "ref_id" => ref_id})
       when is_binary(ref_id) do
    with {:ok, ref_id} <- cast_uuid(ref_id),
         %SharedPlan{} = plan <- Repo.get(SharedPlan, ref_id) do
      participant_ids =
        from(p in PlanParticipant, where: p.plan_id == ^ref_id, select: p.user_id)
        |> Repo.all()

      actor_ok? =
        plan.created_by_user_id == organizer_id or organizer_id in participant_ids

      cond do
        # Polish C P3 (per-viewer vault): vault marks never gate a
        # check-in sweep - membership (actor_ok?) is the whole rule.
        not actor_ok? ->
          {:error, :not_a_member}

        participant_ids != [] ->
          targets = Enum.reject(participant_ids, &(&1 == organizer_id))

          {:ok,
           base_resolution(
             "plan",
             ref_id,
             %{},
             "plan:#{ref_id}",
             plan.title || "Plan",
             targets,
             organizer_id
           )}

        is_binary(plan.conversation_id) ->
          # R4: fold-born plan with no participant rows - fall back to
          # its conversation members and record the fallback honestly.
          targets =
            plan.conversation_id
            |> OpalCore.Messages.member_user_ids()
            |> Enum.reject(&(&1 == organizer_id))

          {:ok,
           base_resolution(
             "plan",
             ref_id,
             %{"fallback" => "conversation_members"},
             "plan:#{ref_id}",
             plan.title || "Plan",
             targets,
             organizer_id
           )}

        true ->
          {:error, :no_targets}
      end
    else
      _ -> {:error, :not_found}
    end
  end

  defp resolve_targets(organizer_id, %{"kind" => "family_context", "ref_id" => ref_id})
       when is_binary(ref_id) do
    with {:ok, ref_id} <- cast_uuid(ref_id),
         %FamilyContext{} = family <- Repo.get(FamilyContext, ref_id) do
      memberships =
        from(m in FamilyMembership,
          where: m.family_id == ^ref_id and m.status == "active"
        )
        |> Repo.all()

      if Enum.any?(memberships, &(&1.user_id == organizer_id)) do
        {youth, adults} =
          Enum.split_with(memberships, fn m ->
            m.role == "youth" or m.account_kind == "guardian_managed_youth"
          end)

        targets =
          adults
          |> Enum.map(& &1.user_id)
          |> Enum.reject(&(&1 == organizer_id))

        minor_ids =
          youth
          |> Enum.map(& &1.user_id)
          |> Enum.reject(&(&1 == organizer_id))

        resolved =
          base_resolution(
            "family_context",
            ref_id,
            %{},
            "family_context:#{ref_id}",
            family.label || "Family",
            targets,
            organizer_id
          )

        {:ok, %{resolved | minor_ids: (resolved.minor_ids ++ minor_ids) |> Enum.uniq()}}
      else
        {:error, :not_a_member}
      end
    else
      _ -> {:error, :not_found}
    end
  end

  defp resolve_targets(organizer_id, %{"kind" => "relationship_set"} = source) do
    filter = source["filter"] || %{}
    types = filter_types(filter)
    subtype = filter["subtype"]

    if types == [] do
      {:error, :invalid_source}
    else
      rows =
        Relationships.for_user(organizer_id)
        |> Enum.filter(fn %RelationshipType{} = r ->
          r.type in types and (is_nil(subtype) or r.family_subtype == subtype)
        end)

      targets = rows |> Enum.map(& &1.contact_user_id) |> Enum.uniq()

      minor_ids =
        rows |> Enum.filter(&(&1.family_minor == true)) |> Enum.map(& &1.contact_user_id)

      label = filter["label"] || relationship_label(types, subtype)
      key_filter = %{"types" => Enum.sort(types)}
      key_filter = if subtype, do: Map.put(key_filter, "subtype", subtype), else: key_filter
      sorted = targets |> Enum.reject(&(&1 in minor_ids)) |> Enum.sort()
      hash = :crypto.hash(:sha256, Jason.encode!(%{"f" => key_filter, "m" => sorted}))

      circle_key =
        "relationship_set:" <> Base.url_encode64(binary_part(hash, 0, 12), padding: false)

      resolved =
        base_resolution(
          "relationship_set",
          nil,
          Map.put(key_filter, "label", label),
          circle_key,
          label,
          targets,
          organizer_id
        )

      {:ok, %{resolved | minor_ids: (resolved.minor_ids ++ minor_ids) |> Enum.uniq()}}
    end
  end

  defp resolve_targets(_, _), do: {:error, :invalid_source}

  # Repair #28 (W28-3): a conversation's stored label can be an
  # internal key ("direct-<id8>-<id8>", minted by
  # Messages.create_direct_conversation as a dedupe key) - never a
  # display label. When it is not human, the circle is named by its
  # other members, the same discipline Messages.conversation_title
  # applies. Internal identifiers are never user-facing.
  defp conversation_circle_label(%Conversation{} = conv, target_ids) do
    if OpalCore.Messages.human_conversation_label?(conv.label) do
      conv.label
    else
      member_names_label(target_ids) || "Group"
    end
  end

  defp member_names_label(user_ids) when is_list(user_ids) and user_ids != [] do
    names =
      from(u in User, where: u.id in ^user_ids, select: u.display_name)
      |> Repo.all()
      |> Enum.reject(&is_nil/1)
      |> Enum.sort()

    case names do
      [] -> nil
      _ -> Enum.join(names, ", ")
    end
  end

  defp member_names_label(_), do: nil

  @doc """
  Repair #28 (W28-3): the user-facing circle label for a sweep.
  Sweeps persisted before the resolve-time fix can carry a
  conversation's machine label in `circle_label`; when the stored
  label is machine-shaped and the source is a conversation, the
  human label is re-derived from the conversation's other members
  at read time, so existing sweeps heal without rewriting rows.
  """
  def display_circle_label(%CheckinSweep{} = sweep) do
    if OpalCore.Messages.human_conversation_label?(sweep.circle_label) do
      sweep.circle_label
    else
      derived_circle_label(sweep) || sweep.circle_label
    end
  end

  defp derived_circle_label(%CheckinSweep{source_kind: "conversation"} = sweep) do
    with {:ok, conv_id} <- cast_uuid(sweep.source_ref_id),
         %Conversation{} = conv <- Repo.get(Conversation, conv_id) do
      others =
        conv_id
        |> OpalCore.Messages.member_user_ids()
        |> Enum.reject(&(&1 == sweep.organizer_user_id))

      if OpalCore.Messages.human_conversation_label?(conv.label) do
        conv.label
      else
        member_names_label(others)
      end
    else
      _ -> nil
    end
  end

  defp derived_circle_label(_sweep), do: nil

  # Shared tail of resolution: R7 blocks split into not_askable, minors
  # split out (5.4), order preserved from the source.
  defp base_resolution(kind, ref_id, filter, circle_key, label, targets, organizer_id) do
    targets = targets |> Enum.uniq() |> Enum.reject(&(&1 == organizer_id))

    {minor_ids, rest} =
      Enum.split_with(targets, fn id -> family_minor?(organizer_id, id) end)

    {blocked, askable} =
      Enum.split_with(rest, fn id ->
        TrustSafety.blocked?(organizer_id, id) or TrustSafety.blocked?(id, organizer_id)
      end)

    %{
      source_kind: kind,
      source_ref_id: ref_id,
      source_filter: filter,
      circle_key: circle_key,
      circle_label: label,
      askable_ids: askable,
      not_askable_ids: blocked,
      minor_ids: minor_ids
    }
  end

  defp family_minor?(organizer_id, contact_id) do
    case Relationships.get_family_subtype(organizer_id, contact_id) do
      %{minor: true} -> true
      _ -> false
    end
  end

  defp filter_types(%{"types" => types}) when is_list(types) do
    Enum.filter(
      types,
      &(&1 in ~w(spouse partner family close_friend friend business acquaintance))
    )
  end

  defp filter_types(%{"type" => type}) when is_binary(type),
    do: filter_types(%{"types" => [type]})

  defp filter_types(_), do: []

  defp relationship_label(types, subtype) do
    cond do
      is_binary(subtype) -> String.capitalize(subtype) <> "s"
      types == ["family"] -> "Family"
      Enum.sort(types) == ~w(close_friend family partner spouse) -> "Close circle"
      true -> "Circle"
    end
  end

  defp check_size(%{askable_ids: ids, not_askable_ids: na, minor_ids: minors}) do
    total = length(ids) + length(na) + length(minors)

    cond do
      ids == [] -> {:error, :no_targets}
      total > @max_targets -> {:error, :circle_too_large}
      true -> :ok
    end
  end

  defp expiry_hours(nil), do: {:ok, @default_expiry_hours}
  defp expiry_hours(h) when h in [24, 48, 168], do: {:ok, h}
  defp expiry_hours("24"), do: {:ok, 24}
  defp expiry_hours("48"), do: {:ok, 48}
  defp expiry_hours("168"), do: {:ok, 168}
  defp expiry_hours(_), do: {:error, :invalid_expiry}

  defp clean_theme(nil), do: nil

  defp clean_theme(theme) when is_binary(theme) do
    case String.trim(theme) do
      "" -> nil
      t -> String.slice(t, 0, 140)
    end
  end

  defp clean_theme(_), do: nil

  # =====================================================================
  # Quiet law (section 3.4)
  # =====================================================================

  @doc "The currently open sweep for (organizer, circle_key), if any."
  def open_sweep_for(organizer_id, circle_key) do
    sweep =
      from(s in CheckinSweep,
        where:
          s.organizer_user_id == ^organizer_id and s.circle_key == ^circle_key and
            s.status == "open",
        limit: 1
      )
      |> Repo.one()

    case sweep do
      %CheckinSweep{} = s ->
        case maybe_expire(s) do
          %CheckinSweep{status: "open"} = open -> open
          _ -> nil
        end

      nil ->
        nil
    end
  end

  @doc "When the next sweep for this circle becomes lawful, or nil."
  def next_sweep_allowed_at(organizer_id, circle_key) do
    latest_closed =
      from(s in CheckinSweep,
        where:
          s.organizer_user_id == ^organizer_id and s.circle_key == ^circle_key and
            not is_nil(s.closed_at),
        order_by: [desc: s.closed_at],
        limit: 1,
        select: s.closed_at
      )
      |> Repo.one()

    case latest_closed do
      %DateTime{} = closed_at ->
        next = DateTime.add(closed_at, @cooldown_hours * 3600, :second)
        if DateTime.compare(next, Clock.utc_now()) == :gt, do: next, else: nil

      _ ->
        nil
    end
  end

  # Returns :ok, {:already_open, sweep}, or
  # {:error, :sweep_quiet_window, next_allowed_at}. The :already_open
  # tuple deliberately falls out of the caller's `with` and is
  # translated by create_sweep/3's caller contract in do_create's
  # wrapper below.
  defp quiet_gate(organizer_id, circle_key) do
    case open_sweep_for(organizer_id, circle_key) do
      %CheckinSweep{} = open ->
        {:already_open, open}

      nil ->
        case next_sweep_allowed_at(organizer_id, circle_key) do
          %DateTime{} = next -> {:error, :sweep_quiet_window, next}
          nil -> :ok
        end
    end
  end

  # =====================================================================
  # Delivery (section 2.2)
  # =====================================================================

  @doc "The verbatim member-facing ask copy for a sweep (design 5.2)."
  def ask_copy(%CheckinSweep{} = sweep) do
    organizer = Repo.get(User, sweep.organizer_user_id)
    first = first_name(organizer)
    label = display_circle_label(sweep)

    body =
      "#{first} asked Opal to check in with #{label}. " <>
        "Your answers go only to #{first} - nobody else in the group sees them. " <>
        "Answer what you want; skipping is completely fine."

    %{
      "title" => "Quick check-in from #{first}",
      "body" => body,
      "theme_line" => if(sweep.prompt_theme, do: "They said: #{sweep.prompt_theme}", else: nil),
      "organizer_name" => organizer && organizer.display_name,
      "circle_label" => label,
      "fields" => %{
        "okay_label" => "Are you okay?",
        "where_label" => "Where are you? (only if you want to say)",
        "needs_label" => "Do you need anything?",
        "share_area_label" => "Share my general area",
        "share_area_subcopy" =>
          "Shares a rough area (about a city block or two) with #{first} only, just for this check-in. Opal never shares your location without this tap.",
        "decline_label" => "I would rather not answer"
      }
    }
  end

  defp deliver_ask(%CheckinSweep{} = sweep, member_id) do
    copy = ask_copy(sweep)

    body =
      case copy["theme_line"] do
        nil -> copy["body"]
        line -> copy["body"] <> " " <> line
      end

    with {:ok, conversation} <- OpalConversations.get_or_create_conversation(member_id),
         {:ok, _msg} <-
           %OpalMessage{}
           |> OpalMessage.changeset(%{
             "conversation_id" => conversation.id,
             "role" => "opal",
             "body" => String.slice(body, 0, OpalMessage.max_body()),
             "metadata" => %{
               "source" => "checkin_sweep",
               "kind" => "ask",
               "sweep_id" => sweep.id
             }
           })
           |> Repo.insert() do
      # Arm free-text capture ONLY when the member's one outstanding
      # slot is free - a sweep never evicts a live planning question.
      if is_nil(PlanningContext.outstanding_question(PlanningContext.get_for_user(member_id))) do
        PlanningContext.set_outstanding_question(member_id, %{
          "kind" => "checkin_sweep",
          "sweep_id" => sweep.id,
          "prompt" => sweep.prompt_theme || copy["title"]
        })
      end

      ingest_member_attention(sweep, member_id)
      safe_push(member_id, copy["title"], "Are you okay? Tap to answer privately.", :low, sweep)
      :ok
    end
  rescue
    e ->
      Logger.warning(
        "checkin.ask_delivery_failed sweep=#{sweep.id} member=#{member_id}: #{Exception.message(e)}"
      )

      {:error, :delivery_failed}
  end

  defp maybe_post_marker(
         %CheckinSweep{source_kind: "conversation", source_ref_id: conv_id} = sweep
       )
       when is_binary(conv_id) do
    case OpalCore.Messages.accept_message(%{
           conversation_id: conv_id,
           sender_user_id: sweep.organizer_user_id,
           client_message_id: "checkin-marker-#{sweep.id}",
           body: @marker_body
         }) do
      {:ok, _msg, _} ->
        :ok

      {:error, reason} ->
        Logger.warning("checkin.marker_failed sweep=#{sweep.id}: #{inspect(reason)}")
    end

    :ok
  end

  defp maybe_post_marker(%CheckinSweep{source_kind: "plan", source_ref_id: plan_id} = sweep) do
    case Repo.get(SharedPlan, plan_id) do
      %SharedPlan{conversation_id: conv_id} when is_binary(conv_id) ->
        maybe_post_marker(%{sweep | source_kind: "conversation", source_ref_id: conv_id})

      _ ->
        :ok
    end
  end

  defp maybe_post_marker(_), do: :ok

  defp safe_push(user_id, title, body, tier, sweep) do
    NotificationIntelligence.enqueue(user_id, title, body, %{"sweep_id" => sweep.id}, tier: tier)
    :ok
  rescue
    _ -> :ok
  end

  # =====================================================================
  # Respond / decline / pass / withdraw (sections 2.3, 4.2, 5.6)
  # =====================================================================

  @doc """
  Record a member's answer. The author is ALWAYS the session member
  id passed by the caller (the controller derives it from the
  session); any user id in `attrs` is ignored by construction - it is
  never read here.
  """
  def respond(sweep_id, member_id, attrs)
      when is_binary(sweep_id) and is_binary(member_id) and is_map(attrs) do
    with %CheckinSweep{} = sweep <- Repo.get(CheckinSweep, sweep_id),
         %CheckinResponse{} = row <- response_row(sweep.id, member_id) do
      sweep = maybe_expire(sweep)

      if sweep.status != "open" do
        {:error, :sweep_closed}
      else
        apply_response(sweep, row, attrs)
      end
    else
      _ -> {:error, :not_found}
    end
  end

  def respond(_, _, _), do: {:error, :invalid}

  defp apply_response(sweep, row, attrs) do
    now = Clock.utc_now()

    changes =
      cond do
        attrs["decline"] == true ->
          %{
            status: "declined",
            okay: nil,
            where_text: nil,
            needs_text: nil,
            free_text: nil,
            shared_area: nil,
            answer_source: "card"
          }

        attrs["pass"] == true ->
          %{
            status: "passed",
            okay: nil,
            where_text: nil,
            needs_text: nil,
            free_text: nil,
            shared_area: nil,
            answer_source: "card"
          }

        true ->
          case structured_changes(attrs) do
            {:ok, fields} ->
              Map.merge(
                %{status: "answered", answer_source: "card", free_text: nil},
                fields
              )

            {:error, reason} ->
              {:error, reason}
          end
      end

    case changes do
      {:error, reason} ->
        {:error, reason}

      %{} = fields ->
        fields =
          if row.responded_at == nil and fields.status in ~w(answered declined passed) do
            Map.put(fields, :responded_at, now)
          else
            fields
          end

        case row |> CheckinResponse.changeset(fields) |> Repo.update() do
          {:ok, updated} ->
            disarm_text_capture(updated.member_user_id, sweep.id)
            after_response(sweep, updated)
            {:ok, updated}

          {:error, cs} ->
            {:error, {:invalid, cs.errors}}
        end
    end
  end

  # A card answer (or a pass/decline) settles the ask: the free-text
  # capture armed at delivery must be disarmed for THIS sweep, or the
  # member's next unrelated Center message would be consumed as a
  # second sweep answer. Only this sweep's armed question is cleared;
  # a planning question or another sweep's question is never touched.
  defp disarm_text_capture(member_id, sweep_id) do
    q = PlanningContext.outstanding_question(PlanningContext.get_for_user(member_id))

    if q && q["kind"] == "checkin_sweep" && q["sweep_id"] == sweep_id do
      PlanningContext.clear_outstanding_question(member_id)
    end

    :ok
  rescue
    _ -> :ok
  end

  defp structured_changes(attrs) do
    okay =
      case attrs["okay"] do
        nil -> nil
        "ok" -> "ok"
        "not_ok" -> "not_ok"
        _ -> :invalid
      end

    if okay == :invalid do
      {:error, :invalid_okay}
    else
      fields = %{}
      fields = if okay, do: Map.put(fields, :okay, okay), else: fields
      fields = put_text(fields, :where_text, attrs["where_text"])
      fields = put_text(fields, :needs_text, attrs["needs_text"])

      case share_changes(attrs) do
        {:ok, nil} -> {:ok, fields}
        {:ok, area} -> {:ok, Map.put(fields, :shared_area, area)}
        {:error, reason} -> {:error, reason}
      end
    end
  end

  defp put_text(fields, _key, nil), do: fields

  defp put_text(fields, key, value) when is_binary(value) do
    case String.trim(value) do
      "" -> Map.put(fields, key, nil)
      t -> Map.put(fields, key, String.slice(t, 0, 280))
    end
  end

  defp put_text(fields, _key, _), do: fields

  # Location share: coordinates come ONLY from this request's payload
  # (section 5.3) and are coarsened server-side by DeviceLocation.
  defp share_changes(%{"share_area" => true} = attrs) do
    params = %{"lat" => attrs["lat"], "lng" => attrs["lon"] || attrs["lng"]}

    case DeviceLocation.validate_coords(params) do
      {:ok, %{lat: lat, lon: lon}} ->
        {:ok,
         %{
           "label" => clean_area_label(attrs["area_label"]) || "Shared area",
           "lat" => lat,
           "lon" => lon,
           "shared_at" => Clock.utc_now() |> DateTime.to_iso8601()
         }}

      {:ok, coords} when is_map(coords) ->
        lat = coords["lat"] || coords[:lat]
        lon = coords["lon"] || coords["lng"] || coords[:lon]

        {:ok,
         %{
           "label" => clean_area_label(attrs["area_label"]) || "Shared area",
           "lat" => lat,
           "lon" => lon,
           "shared_at" => Clock.utc_now() |> DateTime.to_iso8601()
         }}

      _ ->
        {:error, :invalid_coords}
    end
  end

  defp share_changes(%{"share_area" => false}), do: {:ok, nil}
  defp share_changes(_), do: {:ok, nil}

  defp clean_area_label(label) when is_binary(label) do
    case String.trim(label) do
      "" -> nil
      t -> String.slice(t, 0, 80)
    end
  end

  defp clean_area_label(_), do: nil

  @doc """
  Consume a member's free-text Center reply as their sweep answer
  (section 2.3 secondary path). `okay` stays unstated - the summary
  shows the words, never a guessed sentiment. A skip-shaped text
  records a pass (ProfileGap skip law: permanent for this sweep).
  """
  def consume_text_answer(member_id, sweep_id, text)
      when is_binary(member_id) and is_binary(sweep_id) and is_binary(text) do
    with %CheckinSweep{} = sweep <- Repo.get(CheckinSweep, sweep_id),
         %CheckinResponse{} = row <- response_row(sweep.id, member_id) do
      sweep = maybe_expire(sweep)

      if sweep.status != "open" do
        {:error, :sweep_closed}
      else
        now = Clock.utc_now()
        trimmed = String.trim(text)

        fields =
          if skip_shaped?(trimmed) do
            %{status: "passed", answer_source: "center_text"}
          else
            %{
              status: "answered",
              okay: "unstated",
              free_text: String.slice(trimmed, 0, 2000),
              answer_source: "center_text"
            }
          end

        fields =
          if row.responded_at == nil,
            do: Map.put(fields, :responded_at, now),
            else: fields

        case row |> CheckinResponse.changeset(fields) |> Repo.update() do
          {:ok, updated} ->
            # Clear ONLY this sweep's armed question; never a planning
            # question and never another sweep's.
            q = PlanningContext.outstanding_question(PlanningContext.get_for_user(member_id))

            if q && q["kind"] == "checkin_sweep" && q["sweep_id"] == sweep.id do
              PlanningContext.clear_outstanding_question(member_id)
            end

            after_response(sweep, updated)
            {:ok, updated}

          {:error, cs} ->
            {:error, {:invalid, cs.errors}}
        end
      end
    else
      _ -> {:error, :not_found}
    end
  end

  def consume_text_answer(_, _, _), do: {:error, :invalid}

  defp skip_shaped?(text) do
    Regex.match?(
      ~r/^\s*(skip|not now|no thanks|pass|later)\b/i,
      String.downcase(text)
    )
  end

  @doc """
  Withdraw an answer: content fields are nulled in the same write
  (section 5.6). Honored even after the sweep closes - consent
  withdrawal outranks record freezing.
  """
  def withdraw(sweep_id, member_id) when is_binary(sweep_id) and is_binary(member_id) do
    with %CheckinSweep{} = sweep <- Repo.get(CheckinSweep, sweep_id),
         %CheckinResponse{} = row <- response_row(sweep.id, member_id) do
      fields = %{
        status: "withdrawn",
        okay: nil,
        where_text: nil,
        needs_text: nil,
        free_text: nil,
        shared_area: nil
      }

      case row |> CheckinResponse.changeset(fields) |> Repo.update() do
        {:ok, updated} ->
          disarm_text_capture(updated.member_user_id, sweep.id)
          after_response(sweep, updated)
          {:ok, updated}

        {:error, cs} ->
          {:error, {:invalid, cs.errors}}
      end
    else
      _ -> {:error, :not_found}
    end
  end

  def withdraw(_, _), do: {:error, :invalid}

  defp after_response(sweep, row) do
    sweep = maybe_complete(sweep)
    summary = organizer_summary(sweep)
    broadcast_summary(sweep, summary)
    ingest_organizer_attention(sweep, summary)

    # The answering member's Needs You item resolves the moment they
    # answer, decline, pass, or withdraw (design 4.4).
    if row.status in @terminal_statuses do
      resolve_member_attention(sweep.id, row.member_user_id)
    end

    :ok
  end

  # =====================================================================
  # Close / expire / complete (sections 4.5, 3.4)
  # =====================================================================

  def close_sweep(sweep_id, organizer_id) when is_binary(sweep_id) and is_binary(organizer_id) do
    case Repo.get(CheckinSweep, sweep_id) do
      %CheckinSweep{organizer_user_id: ^organizer_id} = sweep ->
        sweep = maybe_expire(sweep)

        if sweep.status == "open" do
          do_close(sweep, "organizer")
        else
          {:ok, sweep}
        end

      %CheckinSweep{} ->
        {:error, :not_found}

      nil ->
        {:error, :not_found}
    end
  end

  def close_sweep(_, _), do: {:error, :invalid}

  defp maybe_complete(%CheckinSweep{status: "open"} = sweep) do
    rows = responses_for(sweep.id)

    if rows != [] and Enum.all?(rows, &(&1.status in @terminal_statuses)) do
      case do_close(sweep, "complete") do
        {:ok, closed} ->
          safe_push(
            sweep.organizer_user_id,
            "Check-in complete",
            "Everyone in #{display_circle_label(sweep)} has answered.",
            :normal,
            sweep
          )

          closed

        _ ->
          sweep
      end
    else
      sweep
    end
  end

  defp maybe_complete(sweep), do: sweep

  @doc "Lazy expiry, run on every read/create for the sweep (4.3)."
  def maybe_expire(%CheckinSweep{status: "open"} = sweep) do
    if DateTime.compare(Clock.utc_now(), sweep.expires_at) in [:gt, :eq] do
      case do_close(sweep, "expired") do
        {:ok, closed} -> closed
        _ -> sweep
      end
    else
      sweep
    end
  end

  def maybe_expire(sweep), do: sweep

  defp do_close(sweep, reason) do
    status = if reason == "complete", do: "complete", else: "closed"

    result =
      sweep
      |> CheckinSweep.changeset(%{
        status: status,
        closed_at: Clock.utc_now(),
        close_reason: reason
      })
      |> Repo.update()

    case result do
      {:ok, closed} ->
        summary = organizer_summary(closed)
        broadcast_summary(closed, summary)
        ingest_organizer_attention(closed, summary)
        {:ok, closed}

      other ->
        other
    end
  end

  # =====================================================================
  # The projection (section 4.3) - the ONLY read path
  # =====================================================================

  @doc """
  THE summary projection. Organizer: the full rollup. Member: only
  their own member_view. Anyone else: `{:error, :not_found}` so sweep
  existence never leaks across accounts.
  """
  def summary_for(sweep_id, viewer_id) when is_binary(sweep_id) and is_binary(viewer_id) do
    case Repo.get(CheckinSweep, sweep_id) do
      nil ->
        {:error, :not_found}

      %CheckinSweep{} = sweep ->
        sweep = maybe_expire(sweep)

        cond do
          sweep.organizer_user_id == viewer_id ->
            {:ok, organizer_summary(sweep)}

          viewer_id in sweep.member_ids ->
            {:ok, member_view(sweep, viewer_id)}

          true ->
            {:error, :not_found}
        end
    end
  end

  def summary_for(_, _), do: {:error, :not_found}

  defp organizer_summary(%CheckinSweep{} = sweep) do
    rows = responses_for(sweep.id)
    by_id = Map.new(rows, &{&1.member_user_id, &1})
    names = display_names(sweep.member_ids ++ sweep.not_askable_ids ++ sweep.minor_ids)

    members =
      Enum.map(sweep.member_ids, fn member_id ->
        row = Map.fetch!(by_id, member_id)

        %{
          "user_id" => member_id,
          "display_name" => Map.get(names, member_id),
          "response_status" => row.status,
          "okay" => row.okay,
          "where_text" => row.where_text,
          "needs_text" => row.needs_text,
          "free_text" => row.free_text,
          "shared_area" => shared_area_view(row.shared_area),
          "responded_at" => iso(row.responded_at),
          "updated_at" => iso(row.updated_at),
          "answer_source" => row.answer_source,
          "delivery_state" => row.delivery_state
        }
      end)

    answered = Enum.count(rows, &(&1.status == "answered"))
    declined_or_passed = Enum.count(rows, &(&1.status in ~w(declined passed)))
    withdrawn = Enum.count(rows, &(&1.status == "withdrawn"))
    not_ok = Enum.count(rows, &(&1.status == "answered" and &1.okay == "not_ok"))
    still_waiting = Enum.count(rows, &(&1.status == "asked"))

    waiting_names =
      rows
      |> Enum.filter(&(&1.status == "asked"))
      |> Enum.map(&Map.get(names, &1.member_user_id))
      |> Enum.reject(&is_nil/1)

    # Repair #28 (W28-3): the headline is the ONE tally statement.
    # It used to append the not-ok / still-waiting counts, which the
    # thread card and the summary then stated again - the same facts
    # three times, once garbled. Who still waits is carried by
    # still_waiting_line; who needs something is in the member rows.
    headline = "#{answered + declined_or_passed + withdrawn} of #{length(rows)} answered"

    still_waiting_line =
      if still_waiting > 0 do
        "Still waiting on: #{Enum.join(waiting_names, ", ")}. Not answering is not the same as being okay."
      else
        "No one is still waiting."
      end

    not_askable_names =
      Enum.map(sweep.not_askable_ids, &Map.get(names, &1)) |> Enum.reject(&is_nil/1)

    minor_names =
      Enum.map(sweep.minor_ids, &Map.get(names, &1)) |> Enum.reject(&is_nil/1)

    show_minor_line =
      sweep.source_kind in ~w(family_context relationship_set) and minor_names != []

    %{
      "view" => "organizer",
      "sweep" => sweep_view(sweep),
      "counts" => %{
        "asked_total" => length(rows),
        "answered" => answered,
        "declined_or_passed" => declined_or_passed,
        "withdrawn" => withdrawn,
        "not_ok" => not_ok,
        "still_waiting" => still_waiting,
        "not_askable" => length(sweep.not_askable_ids) + length(sweep.minor_ids)
      },
      "members" => members,
      "not_askable_names" => not_askable_names,
      "not_askable_note" =>
        if(not_askable_names != [],
          do: "Could not be asked: #{Enum.join(not_askable_names, ", ")}",
          else: nil
        ),
      "minor_note" =>
        if(show_minor_line,
          do:
            "Not asked directly: #{Enum.join(minor_names, ", ")} (young family members are not asked by Opal - check in with their guardian.)",
          else: nil
        ),
      "copy" => %{
        "headline" => headline,
        "still_waiting_line" => still_waiting_line
      }
    }
  end

  defp member_view(%CheckinSweep{} = sweep, member_id) do
    row = response_row(sweep.id, member_id)
    organizer = Repo.get(User, sweep.organizer_user_id)

    %{
      "view" => "member",
      "sweep" => sweep_view(sweep),
      "organizer_name" => organizer && organizer.display_name,
      "ask" => ask_copy(sweep),
      "my_response" =>
        row &&
          %{
            "status" => row.status,
            "okay" => row.okay,
            "where_text" => row.where_text,
            "needs_text" => row.needs_text,
            "free_text" => row.free_text,
            "shared_area" => shared_area_view(row.shared_area),
            "responded_at" => iso(row.responded_at),
            "updated_at" => iso(row.updated_at)
          },
      "closed_copy" =>
        if(sweep.status != "open" and organizer,
          do:
            "This check-in closed on #{closed_date(sweep)} - message #{first_name(organizer)} directly if you still need something.",
          else: nil
        )
    }
  end

  defp sweep_view(%CheckinSweep{} = sweep) do
    %{
      "id" => sweep.id,
      "source_kind" => sweep.source_kind,
      "source_ref_id" => sweep.source_ref_id,
      "source_fallback" => sweep.source_filter["fallback"],
      "circle_label" => display_circle_label(sweep),
      "status" => sweep.status,
      "prompt_theme" => sweep.prompt_theme,
      "created_at" => iso(sweep.inserted_at),
      "expires_at" => iso(sweep.expires_at),
      "closed_at" => iso(sweep.closed_at),
      "close_reason" => sweep.close_reason,
      "next_sweep_allowed_at" =>
        iso(next_sweep_allowed_at(sweep.organizer_user_id, sweep.circle_key))
    }
  end

  defp shared_area_view(nil), do: nil

  defp shared_area_view(%{} = area) do
    %{
      "label" => area["label"],
      "lat" => area["lat"],
      "lon" => area["lon"],
      "shared_at" => area["shared_at"]
    }
  end

  @doc "Sweep lookup for the circle surface row (GET for-source)."
  def for_source(organizer_id, source) when is_binary(organizer_id) and is_map(source) do
    kind = source["kind"]
    ref_id = source["ref_id"]
    filter = source["filter"] || %{}

    cond do
      kind in ~w(conversation plan family_context) and is_binary(ref_id) ->
        case open_or_latest(organizer_id, "#{kind}:#{ref_id}") do
          nil -> {:ok, nil, "#{kind}:#{ref_id}"}
          sweep -> {:ok, sweep, sweep.circle_key}
        end

      kind == "relationship_set" ->
        # The relationship circle_key is a snapshot hash; the surface
        # row resolves through the organizer's latest sweep whose
        # stored filter matches the requested types.
        types = filter |> filter_types() |> Enum.sort()

        sweep =
          from(s in CheckinSweep,
            where: s.organizer_user_id == ^organizer_id and s.source_kind == "relationship_set",
            order_by: [desc: s.inserted_at],
            limit: 25
          )
          |> Repo.all()
          |> Enum.find(fn s ->
            types == [] or (s.source_filter["types"] || []) |> Enum.sort() == types
          end)

        case sweep do
          nil -> {:ok, nil, nil}
          sweep -> {:ok, maybe_expire(sweep), sweep.circle_key}
        end

      true ->
        {:error, :invalid_source}
    end
  end

  def for_source(_, _), do: {:error, :invalid_source}

  defp open_or_latest(organizer_id, circle_key) do
    from(s in CheckinSweep,
      where: s.organizer_user_id == ^organizer_id and s.circle_key == ^circle_key,
      order_by: [desc: s.inserted_at],
      limit: 1
    )
    |> Repo.one()
    |> case do
      %CheckinSweep{} = sweep -> maybe_expire(sweep)
      nil -> nil
    end
  end

  # =====================================================================
  # Broadcasts + Attention (sections 4.3, 4.4)
  # =====================================================================

  defp broadcast_summary(sweep, summary) do
    Endpoint.broadcast("user:#{sweep.organizer_user_id}", "inbox:checkin", %{
      "event" => "checkin.updated",
      "sweep_id" => sweep.id,
      "summary" => summary
    })

    if sweep.source_kind == "conversation" and is_binary(sweep.source_ref_id) do
      Endpoint.broadcast("conversation:#{sweep.source_ref_id}", "checkin:updated", %{
        "sweep_id" => sweep.id,
        "counts" => summary["counts"]
      })
    end

    :ok
  rescue
    _ -> :ok
  end

  defp ingest_member_attention(sweep, member_id) do
    copy = ask_copy(sweep)

    AttentionCenter.ingest(%{
      "items" => [
        %{
          "recipient_user_id" => member_id,
          "dedupe_key" => "checkin:#{sweep.id}:#{member_id}",
          "level" => "attention",
          "action_required" => true,
          "title" => copy["title"],
          "copy" =>
            "Are you okay? Your answer goes only to #{first_name(Repo.get(User, sweep.organizer_user_id))}.",
          "source_type" => "checkin_sweep",
          "source_id" => sweep.id,
          "reason" => "checkin_ask"
        }
      ]
    })

    :ok
  rescue
    _ -> :ok
  end

  defp ingest_organizer_attention(sweep, summary) do
    counts = summary["counts"]
    not_ok = counts["not_ok"] > 0

    AttentionCenter.ingest(%{
      "items" => [
        %{
          "recipient_user_id" => sweep.organizer_user_id,
          "dedupe_key" => "checkin:#{sweep.id}:organizer",
          "level" => if(not_ok, do: "attention", else: "ambient"),
          "action_required" => not_ok,
          "title" => "Check-in: #{display_circle_label(sweep)}",
          "copy" => summary["copy"]["headline"],
          "source_type" => "checkin_sweep",
          "source_id" => sweep.id,
          "reason" => if(not_ok, do: "checkin_not_ok", else: "checkin_progress")
        }
      ]
    })

    :ok
  rescue
    _ -> :ok
  end

  @doc "Resolve a member's Needs You item (called on any terminal answer)."
  def resolve_member_attention(sweep_id, member_id) do
    AttentionCenter.resolve(member_id, "checkin:#{sweep_id}:#{member_id}")
    :ok
  rescue
    _ -> :ok
  end

  # =====================================================================
  # Helpers
  # =====================================================================

  defp response_row(sweep_id, member_id) do
    Repo.get_by(CheckinResponse, sweep_id: sweep_id, member_user_id: member_id)
  end

  defp responses_for(sweep_id) do
    from(r in CheckinResponse, where: r.sweep_id == ^sweep_id, order_by: [asc: r.inserted_at])
    |> Repo.all()
  end

  defp display_names(ids) do
    ids = ids |> Enum.uniq() |> Enum.reject(&is_nil/1)

    if ids == [] do
      %{}
    else
      from(u in User, where: u.id in ^ids, select: {u.id, u.display_name})
      |> Repo.all()
      |> Map.new()
    end
  end

  defp first_name(nil), do: "Your organizer"

  defp first_name(%User{display_name: name}) when is_binary(name) do
    name |> String.split(" ") |> List.first() || name
  end

  defp first_name(_), do: "Your organizer"

  defp cast_uuid(id) do
    case Ecto.UUID.cast(id) do
      {:ok, uuid} -> {:ok, uuid}
      :error -> {:error, :invalid}
    end
  end

  defp iso(nil), do: nil
  defp iso(%DateTime{} = dt), do: DateTime.to_iso8601(dt)
  defp iso(other), do: other

  defp closed_date(%CheckinSweep{closed_at: %DateTime{} = dt}),
    do: dt |> DateTime.to_date() |> Date.to_iso8601()

  defp closed_date(%CheckinSweep{expires_at: %DateTime{} = dt}),
    do: dt |> DateTime.to_date() |> Date.to_iso8601()

  defp closed_date(_), do: "the close date"
end
