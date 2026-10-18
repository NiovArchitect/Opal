defmodule OpalCore.SocialFlow.ConversationAlignment do
  @moduledoc """
  Folds real conversation messages into one SharedPlan.

  Dimensions move UNKNOWN → CANDIDATE → CONSTRAINED → AGREED → LOCKED.
  A later contradiction reopens only the field it changes.
  Button taps are explicit actions on that same plan. They replay with
  messages, so a later refetch cannot drop a confirmation.
  """

  import Ecto.Query

  alias OpalCore.Events.Publisher
  alias OpalCore.Messages
  alias OpalCore.Messaging.Message
  alias OpalCore.Repo

  alias OpalCore.SocialFlow.{
    ActivityIntent,
    CandidateProvider,
    DateTimeChange,
    PlaceIdentity,
    PlanParticipant,
    PlanRevision,
    PlanStateArbitration,
    PlanTransition,
    SeedFixtureLeak,
    SharedPlan,
    SmokeResidue,
    TemporalFollowThrough
  }

  @activities ["coffee", "dinner", "drinks", "something active", "somewhere quiet"]
  @schema_version 1

  # F12-58 — stale alignment change proposals must die on their own.
  # A proposal nobody answers (e.g. a solo founder's own change proposal, which
  # accept_committed_change cannot confirm) may not sit at
  # "Waiting on one response." forever.
  @change_proposal_ttl_seconds 24 * 3600

  @doc "Alignment action schema version — shared with direct writers (SocialFlow.change_plan_schedule)."
  def schema_version, do: @schema_version

  @doc "How long an alignment change_proposal stays actionable (seconds)."
  def change_proposal_ttl_seconds, do: @change_proposal_ttl_seconds

  def consequential?(body) when is_binary(body) do
    text = normalize(body)
    # Repair #18 (Division A): a schedule-change request naming a
    # new time ("let's change dinner to 8 PM", "move dinner to 8")
    # is consequential - it must sync the fold, or the change is
    # silently dropped on the message path (track-revision H4).
    # Repair #18 (W4-01): a new-plan scheduling signal ("Schedule
    # 7 am church at Awaken", "Add soccer Saturday 10 am") is
    # consequential too - the fold must run at send time so the
    # intent gate can create the new plan (or ASK) in the same turn,
    # not only when some later read happens to sync.
    text != "" and not trivial?(text) and not SeedFixtureLeak.seed_fixture_body?(body) and
      (Regex.match?(
         ~r/tomorrow|\bmeet\b|after\s+\d|let'?s do|lets do|make it\s+\d|\bwhere\b|\bconfirm\b/,
         text
       ) or
         Regex.match?(~r/\b(?:change|move|switch|shift|reschedule)\b[^.]*\bto\b/, text) or
         plan_signal?(text))
  end

  def consequential?(_), do: false

  # W4-01: a scheduling verb ("schedule", "add", "book", "create",
  # "set up") together with a clock or a day is a plan signal. The
  # verb alone ("add me", "book club") is not.
  defp plan_signal?(text) do
    Regex.match?(
      ~r/\b(?:schedule|add|book|create|set up)\b/,
      text
    ) and
      Regex.match?(
        ~r/\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b|\b(?:tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/,
        text
      )
  end

  def fold(messages, member_ids, actions \\ [], opts \\ [])

  def fold(messages, member_ids, actions, opts)
      when is_list(messages) and is_list(member_ids) and is_list(actions) do
    base = %{
      "schema_version" => @schema_version,
      "plan_timezone" => DateTimeChange.timezone(),
      # Repair #18 residuals (R-2a): the plan row's current clock,
      # seeded by sync_locked only (pure folds pass nothing and keep
      # pure formation semantics). Internal: stripped before return.
      "plan_row_clock" => Keyword.get(opts, :plan_row_clock),
      "plan_version" => 0,
      # Repair #18 (W4-01): other active plans in this conversation
      # (siblings of the fold's own plan), seeded by sync_locked only;
      # pure folds pass none. The intent gate names them as ASK
      # candidates. Internal: stripped before return.
      "sibling_plans" => Keyword.get(opts, :sibling_plans, []),
      "participants" => field("locked", member_ids, nil),
      "activity" => field("unknown", nil, nil),
      "date" => field("unknown", nil, nil),
      "time_window" => field("unknown", nil, nil),
      "exact_time" => field("unknown", nil, nil),
      "place" => field("unknown", nil, nil),
      "execution" => field("unknown", nil, nil),
      "prompt" => nil,
      "completion" => nil,
      "next" => nil,
      "confirmable" => false
    }

    message_events =
      messages
      |> Enum.with_index(1)
      |> Enum.map(fn {message, index} ->
        %{at: event_at(message, index), order: index, kind: :message, message: message}
      end)

    action_events =
      actions
      |> Enum.with_index(1)
      |> Enum.map(fn {action, index} ->
        %{at: event_at(action, index), order: index, kind: :action, action: action}
      end)

    (message_events ++ action_events)
    |> Enum.sort_by(&{&1.at, &1.order, if(&1.kind == :message, do: 0, else: 1)})
    |> Enum.reduce(base, fn
      %{kind: :message, message: message}, acc -> apply_message(acc, message)
      %{kind: :action, action: action}, acc -> apply_action(acc, action)
    end)
    |> Map.put("explicit_actions", actions)
    |> present()
    |> Map.delete("plan_row_clock")
    |> Map.delete("sibling_plans")
  end

  def sync_conversation(conversation_id) when is_binary(conversation_id) do
    {:ok, state} = Repo.transaction(fn -> sync_locked(conversation_id) end)

    # Repair #18 residuals (R-2b): a chat confirmation the fold applied
    # during this replay must land in the revision chain (the ONE
    # change system), not only in fold state - otherwise the plan
    # row's schedule authority (the last recorded schedule_change)
    # vetoes the thread's own newest agreement on every later sync,
    # and System A never learns the change was accepted. The fold
    # marks message-driven acceptances in state["settled_change"];
    # the settlement is recorded here, AFTER the sync transaction
    # commits (record_fold_change_acceptance opens its own), and is
    # idempotent: once the chain carries a schedule_change at the
    # settled clock, later replays skip it. The marker is internal
    # bookkeeping and is stripped from the returned state.
    settle_fold_acceptance(conversation_id, state)

    # Repair #18 (W4-01): materialize the fold's new-plan signals as
    # separate SharedPlan rows (see materialize_new_plans/2). Runs
    # after the sync transaction commits, like the settlement above,
    # and is idempotent per source message.
    materialize_new_plans(conversation_id, state)

    Map.delete(state, "settled_change")
  end

  # W4-01: a new-plan signal the intent gate recorded during the fold
  # becomes a real, separate SharedPlan in the same conversation,
  # through the same creation door as every conversation plan
  # (SocialFlow.create_tentative_plan_from_conversation - dedupe
  # identity, participant rows, PlanTransition gate included). The
  # row is stamped with its origin + source message so replays never
  # create it twice, and so the fold's own plan selection can tell
  # the thread's fold lineage from separate plans (prefer_fold_plan/1).
  defp materialize_new_plans(conversation_id, state) do
    signals = if is_map(state), do: state["new_plan_signals"] || [], else: []

    Enum.each(signals, fn signal ->
      message_id = signal["message_id"]
      actor = signal["actor_user_id"]

      if is_binary(message_id) and is_binary(actor) and
           not new_plan_materialized?(conversation_id, message_id) do
        case OpalCore.SocialFlow.create_tentative_plan_from_conversation(
               conversation_id,
               actor,
               %{
                 "title" => signal["title"],
                 "place" => signal["place"],
                 "location" => signal["place"],
                 "time_label" => signal["time_label"]
               }
             ) do
          {:ok, plan, _participants} ->
            alignment =
              (plan.alignment || %{})
              |> Map.put("origin", "chat_new_plan")
              |> Map.put("separate_lineage", true)
              |> Map.put("source_message_id", message_id)
              |> Map.update("source_message_ids", [message_id], fn ids ->
                Enum.uniq(ids ++ [message_id])
              end)

            _ =
              plan
              |> SharedPlan.changeset(%{alignment: alignment})
              |> Repo.update()

            :ok

          _ ->
            :ok
        end
      end
    end)

    :ok
  rescue
    _ -> :ok
  end

  defp new_plan_materialized?(conversation_id, message_id) do
    from(p in SharedPlan, where: p.conversation_id == ^conversation_id)
    |> Repo.all()
    |> Enum.any?(fn plan ->
      alignment = plan.alignment || %{}
      ids = alignment["source_message_ids"] || List.wrap(alignment["source_message_id"])
      alignment["origin"] == "chat_new_plan" and message_id in ids
    end)
  end

  defp settle_fold_acceptance(conversation_id, state) do
    marker = state["settled_change"]

    exact_clock =
      OpalCore.SocialFlow.PlanIdentity.parse_clock(get_in(state, ["exact_time", "value"]) || "")

    newest_action_clock =
      (state["explicit_actions"] || [])
      |> Enum.filter(&(&1["kind"] == "schedule_change"))
      |> List.last()
      |> case do
        %{"value" => value} -> OpalCore.SocialFlow.PlanIdentity.parse_clock(value || "")
        _ -> nil
      end

    cond do
      not is_map(marker) ->
        :ok

      # The acceptance is no longer the thread's current agreement
      # (a later message or action moved the time again) - the
      # newer state owns the schedule; record nothing.
      is_nil(marker["clock"]) or marker["clock"] != exact_clock ->
        :ok

      # The revision chain already carries this settlement.
      newest_action_clock == marker["clock"] ->
        :ok

      true ->
        label =
          [get_in(state, ["date", "value"]), get_in(state, ["exact_time", "value"])]
          |> Enum.filter(&(is_binary(&1) and &1 != ""))
          |> Enum.join(" ")

        _ =
          OpalCore.SocialFlow.record_fold_change_acceptance(%{
            conversation_id: conversation_id,
            user_id: marker["actor_user_id"],
            value: label,
            trace_id: "fold-sync-settle"
          })

        :ok
    end
  rescue
    _ -> :ok
  end

  @doc """
  Replay one final call utterance through the same fold as a chat message.
  The spoken text is not inserted as a chat message.
  """
  def record_voice_utterance(conversation_id, attrs)
      when is_binary(conversation_id) and is_map(attrs) do
    action = %{
      "kind" => "voice_utterance",
      "actor_user_id" => attrs["speaker_user_id"],
      "value" => attrs["source_segment_id"],
      "utterance" => attrs["text"],
      "normalized" => attrs["normalized"] || attrs["text"],
      "source_type" => "call_transcript",
      "source_call_id" => attrs["call_id"],
      "source_segment_id" => attrs["source_segment_id"],
      "confidence" => attrs["confidence"],
      "truth" => "proposed",
      "explicit" => true,
      "schema_version" => @schema_version,
      "at" => DateTime.utc_now() |> DateTime.truncate(:microsecond) |> DateTime.to_iso8601()
    }

    saved =
      Repo.transaction(fn ->
        case lock_plan(conversation_id) do
          nil ->
            Repo.rollback(:no_plan)

          %SharedPlan{} = plan ->
            actions = actions_from_plan(plan)

            if Enum.any?(actions, &(&1["source_segment_id"] == action["source_segment_id"])) do
              :duplicate
            else
              alignment = plan.alignment || %{}
              updated = Map.put(alignment, "explicit_actions", actions ++ [action])

              case plan |> SharedPlan.changeset(%{alignment: updated}) |> Repo.update() do
                {:ok, _} -> :recorded
                {:error, _} -> Repo.rollback(:persist_failed)
              end
            end
        end
      end)

    case saved do
      {:ok, :duplicate} ->
        {:ok, sync_conversation(conversation_id)}

      {:ok, :recorded} ->
        state = sync_conversation(conversation_id)
        deliver_alignment(conversation_id, state)
        {:ok, state}

      {:error, reason} ->
        {:error, reason}
    end
  end

  defp deliver_alignment(conversation_id, state) when is_map(state) do
    OpalCoreWeb.Endpoint.broadcast("conversation:#{conversation_id}", "alignment:updated", %{
      "conversation_id" => conversation_id,
      "plan_id" => state["lineage_id"],
      "plan_version" => state["plan_version"],
      "proposal_id" => get_in(state, ["change_proposal", "proposal_id"]),
      "schema_version" => 1
    })

    OpalCore.Messaging.Inbox.fanout_plan(conversation_id, state)
  rescue
    _ -> :ok
  end

  defp sync_locked(conversation_id) do
    plan = lock_plan(conversation_id)

    messages =
      from(m in Message,
        where: m.conversation_id == ^conversation_id,
        order_by: [asc: m.server_seq]
      )
      |> Repo.all()
      |> Enum.reject(
        &(SmokeResidue.smoke_body?(&1.body) or SeedFixtureLeak.seed_fixture_body?(&1.body))
      )

    members = Messages.member_user_ids(conversation_id)
    actions = actions_from_plan(plan)

    # Repair #18 residuals (R-2a): seed the plan row's current clock
    # so the fold can tell a revision (a change against the row's
    # committed time) from formation refinement (see
    # existing_time_change?/3).
    row_clock =
      plan && OpalCore.SocialFlow.PlanIdentity.parse_clock(plan.time_label || "")

    # Repair #18 (W4-01): the conversation's OTHER active plans are
    # ASK candidates for ambiguous retargets (see the intent gate).
    sibling_plans =
      from(p in SharedPlan,
        where:
          p.conversation_id == ^conversation_id and p.status in ^~w(tentative agreed changed),
        order_by: [desc: p.updated_at, desc: p.inserted_at]
      )
      |> Repo.all()
      |> Enum.reject(&(plan && &1.id == plan.id))
      |> Enum.map(fn p ->
        %{"id" => p.id, "title" => p.title, "time_label" => p.time_label}
      end)

    state =
      fold(messages, members, actions, plan_row_clock: row_clock, sibling_plans: sibling_plans)
      |> freeze_plan_set_event(plan && plan.alignment)
      |> PlaceIdentity.attach_resolved(plan && plan.alignment)
      |> surface_pending_revision(plan)
      |> surface_attendance(plan)

    if plan_material?(state) do
      # Repair #18: the fold-born plan's creator is deterministic - the
      # earliest speaking member (the plan initiator), never List.first
      # of an unordered member query (which made lead authority a coin
      # flip on fold-born plans, track-revision H3). Participant rows
      # for every member are written inside upsert_plan (plan truth).
      _ = upsert_plan(conversation_id, state, members, plan_initiator(messages, members))
      _ = reconcile_duplicate_plans(conversation_id)
    end

    state
  end

  defp plan_initiator(messages, members) do
    first_speaker =
      Enum.find_value(messages, fn message ->
        sender = message_actor(message)
        if is_binary(sender) and sender in members, do: sender
      end)

    first_speaker || members |> Enum.sort() |> List.first()
  end

  # Repair #18 (Division A, F18-06): wire the reconcile discipline into
  # the fold, scoped to TRUE duplicates - active plans in this
  # conversation whose dedupe identity matches (same participants,
  # venue and day per PlanIdentity). Distinct plans in one conversation
  # stay lawful; only same-intent rivals are cancelled, through
  # PlanTransition, with merged_into stamps (no deletion).
  defp reconcile_duplicate_plans(conversation_id) do
    active =
      from(p in SharedPlan,
        where:
          p.conversation_id == ^conversation_id and p.status in ^~w(tentative agreed changed),
        order_by: [desc: p.updated_at, desc: p.inserted_at]
      )
      |> Repo.all()

    if length(active) < 2 do
      :noop
    else
      components_by_id =
        Map.new(active, fn plan ->
          participant_ids =
            case get_in(plan.alignment || %{}, ["participants", "value"]) do
              ids when is_list(ids) -> Enum.filter(ids, &is_binary/1)
              _ -> OpalCore.SocialFlow.plan_participant_ids(plan)
            end

          {plan.id,
           OpalCore.SocialFlow.PlanIdentity.components(
             plan.created_by_user_id,
             participant_ids,
             plan
           )}
        end)

      {survivors, losers} =
        Enum.reduce(active, {[], []}, fn plan, {keep, drop} ->
          components = components_by_id[plan.id]

          if Enum.any?(keep, fn kept ->
               OpalCore.SocialFlow.PlanIdentity.components_match?(
                 components,
                 components_by_id[kept.id]
               )
             end) do
            {keep, drop ++ [plan]}
          else
            {keep ++ [plan], drop}
          end
        end)

      now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

      Enum.each(losers, fn loser ->
        survivor =
          Enum.find(survivors, fn kept ->
            OpalCore.SocialFlow.PlanIdentity.components_match?(
              components_by_id[loser.id],
              components_by_id[kept.id]
            )
          end)

        alignment =
          (loser.alignment || %{})
          |> Map.put("merged_into", survivor && survivor.id)
          |> Map.put("superseded_by", survivor && survivor.id)
          |> Map.put("reconcile_reason", "duplicate_intent")
          |> Map.put("reconciled_at", DateTime.to_iso8601(now))

        _ =
          loser
          |> SharedPlan.changeset(%{status: "cancelled", cancelled_at: now, alignment: alignment})
          |> PlanTransition.guard_changeset(:plan, :cancel)
          |> Repo.update()
      end)

      :ok
    end
  rescue
    _ -> :noop
  end

  @doc """
  The first committed summary stays put. Later edits update the live plan only.
  """
  def freeze_plan_set_event(state, previous) when is_map(state) do
    existing = previous && previous["plan_set_event"]

    cond do
      # Repair #18 (Division A, F18-02): a schedule_change explicit
      # action newer than the frozen event REGENERATES the summary from
      # the current folded lines - the frozen first summary must not
      # outrank an accepted revision. (The pinned freeze behavior for
      # states without a schedule_change action is unchanged.)
      regenerated = regenerated_set_event(state, existing) ->
        Map.put(state, "plan_set_event", regenerated)

      is_map(existing) and is_binary(existing["summary"]) and existing["summary"] != "" ->
        Map.put(state, "plan_set_event", existing)

      state["commitment"] in ["aligned", "execution_ready"] and is_list(state["plan_lines"]) and
          state["plan_lines"] != [] ->
        Map.put(state, "plan_set_event", %{
          "summary" => Enum.join(state["plan_lines"], " · "),
          "at" => DateTime.utc_now() |> DateTime.truncate(:second) |> DateTime.to_iso8601()
        })

      true ->
        state
    end
  end

  def freeze_plan_set_event(state, _), do: state

  # The regenerated summary for a state carrying a schedule_change
  # action the stored event has not absorbed yet; nil otherwise.
  defp regenerated_set_event(state, existing) do
    actions = state["explicit_actions"] || []

    latest_change =
      actions
      |> Enum.filter(&(&1["kind"] == "schedule_change" and is_binary(&1["revision_id"])))
      |> List.last()

    cond do
      is_nil(latest_change) ->
        nil

      is_map(existing) and
          existing["regenerated_from_revision_id"] == latest_change["revision_id"] ->
        nil

      true ->
        lines =
          state["plan_lines"] ||
            [
              get_in(state, ["date", "value"]),
              get_in(state, ["exact_time", "value"]),
              get_in(state, ["place", "value"])
            ]
            |> Enum.filter(&(is_binary(&1) and &1 != ""))

        if lines == [] do
          nil
        else
          %{
            "summary" => Enum.join(lines, " · "),
            "at" => DateTime.utc_now() |> DateTime.truncate(:second) |> DateTime.to_iso8601(),
            "regenerated_from_revision_id" => latest_change["revision_id"]
          }
        end
    end
  end

  # Repair #17 (W4-1) — a live PlanRevision proposal is part of the current
  # truth of the thread. The fold is built from messages + explicit actions,
  # so a revision proposed through the revision authority (channel button or
  # NL executor) never appeared in it: surfaces kept rendering the frozen
  # plan_set_event ("… · Sat 7:30 PM is locked") as if nothing was pending.
  # Overlay the newest proposed revision from the plan row's own revision
  # chain: state["pending_revision"] carries the proposed label and who must
  # still confirm, and the frozen set event is flagged as superseded by the
  # pending revision so no surface may present it as the current truth.
  defp surface_pending_revision(state, %SharedPlan{} = plan) when is_map(state) do
    revision =
      from(r in PlanRevision,
        where: r.plan_id == ^plan.id and r.status == "proposed",
        order_by: [desc: r.inserted_at],
        limit: 1
      )
      |> Repo.one()

    case revision do
      %PlanRevision{} = rev ->
        pending = %{
          "revision_id" => rev.id,
          "plan_id" => plan.id,
          "status" => "awaiting_confirmation",
          "proposed_changes" => rev.proposed_changes || %{},
          "proposed_time_label" => (rev.proposed_changes || %{})["time_label"],
          "proposed_by_user_id" => rev.proposed_by_user_id,
          "required_approvals" => rev.required_approvals || [],
          "current_time_label" => plan.time_label
        }

        state
        |> Map.put("pending_revision", pending)
        |> then(fn s ->
          case s["plan_set_event"] do
            %{} = event ->
              Map.put(
                s,
                "plan_set_event",
                Map.merge(event, %{
                  "pending_revision_id" => rev.id,
                  "superseded_by_pending_revision" => true
                })
              )

            _ ->
              s
          end
        end)

      _ ->
        state
    end
  rescue
    _ -> state
  end

  defp surface_pending_revision(state, _), do: state

  # Repair #18 residuals (R-2): exactly ONE pending representation may
  # be PRESENTED on the thread alignment surface. The PlanRevision row
  # is the record of authority for a pending change; the fold's
  # change_proposal for the same change is its projection (the
  # unification law from Division A). The dedupe is presentation-only
  # and lives in the HTTP alignment presenter
  # (ConversationController): the sync state itself keeps both keys,
  # because fold consumers (keep_committed_plan,
  # accept_committed_change, the call-outcome paths) act on the fold
  # proposal - hiding it here made a live proposal unanswerable.

  @doc """
  Presentation dedupe for the thread alignment surface (Repair #18
  residuals R-2): when a proposed PlanRevision and the fold's
  change_proposal name the same clock, they are ONE pending change -
  the revision is the record of authority and the fold proposal is
  its projection, so the projection is not presented alongside it.
  Sync state itself is untouched (fold consumers act on the
  proposal); a fold proposal naming a different clock is a
  different pending change and stays.
  """
  def dedupe_pending_presentation(state) when is_map(state) do
    pending = state["pending_revision"]
    proposal = state["change_proposal"]

    revision_clock =
      if is_map(pending) do
        OpalCore.SocialFlow.PlanIdentity.parse_clock(pending["proposed_time_label"] || "")
      end

    if is_map(proposal) and not is_nil(revision_clock) and
         proposal_clock(proposal) == revision_clock do
      Map.delete(state, "change_proposal")
    else
      state
    end
  end

  def dedupe_pending_presentation(state), do: state

  # Repair #18 residuals (R-4c) - the thread alignment output carries
  # the ONE attendance counter for the conversation's plan, merged
  # from JourneyAuthority.attendance_contract/1 exactly as the plan
  # payload and the chats-list card merge it. The founder read the
  # wrong count IN the thread; a thread surface with no count at all
  # left the chat free to disagree with the graph forever. No
  # participant rows -> no fields (absence stays honest).
  defp surface_attendance(state, %SharedPlan{} = plan) when is_map(state) do
    Map.merge(state, OpalCore.SocialFlow.JourneyAuthority.attendance_contract(plan.id))
  rescue
    _ -> state
  end

  defp surface_attendance(state, _), do: state

  @doc """
  Multiple SharedPlans per conversation are lawful (new lineage / residue).
  Canonical open lineage = newest active (tentative|agreed|changed) by updated_at.
  Never use Repo.get_by/2 here — MultipleResultsError is a coherence crash.

  Repair #18 (W4-01): plans the intent gate created as SEPARATE
  lineages (alignment origin "chat_new_plan") are never the thread's
  fold plan, however new they are - the fold keeps owning the plan
  the conversation's messages formed. When several plans qualify,
  the newest non-separate plan wins; a conversation holding only
  separate plans still resolves to the newest of them.
  """
  def active_plan_for_conversation(conversation_id) when is_binary(conversation_id) do
    plans =
      from(p in SharedPlan,
        where: p.conversation_id == ^conversation_id and p.status in ^~w(tentative agreed changed),
        order_by: [desc: p.updated_at, desc: p.inserted_at]
      )
      |> Repo.all()

    prefer_fold_plan(plans)
  end

  def active_plan_for_conversation(_), do: nil

  # W4-01: the fold's plan is the newest active plan that is not a
  # separate new-plan lineage (see active_plan_for_conversation/1).
  defp prefer_fold_plan(plans) when is_list(plans) do
    Enum.find(plans, fn plan ->
      get_in(plan.alignment || %{}, ["origin"]) != "chat_new_plan"
    end) || List.first(plans)
  end

  @doc """
  Reconcile duplicate active SharedPlans for one conversation.

  Keeps `active_plan_for_conversation/1` as current reality.
  Cancels other tentative|agreed|changed rows and stamps alignment
  `superseded_by` / `reconcile_reason` so history remains readable.

  Returns `{:ok, %{kept: id, cancelled: [id...]}}` or `{:ok, :noop}`.
  """
  def reconcile_conversation_plans(conversation_id) when is_binary(conversation_id) do
    Repo.transaction(fn ->
      active =
        from(p in SharedPlan,
          where:
            p.conversation_id == ^conversation_id and p.status in ^~w(tentative agreed changed),
          order_by: [desc: p.updated_at, desc: p.inserted_at],
          lock: "FOR UPDATE"
        )
        |> Repo.all()

      case active do
        [] ->
          :noop

        [%SharedPlan{id: kept_id} = _kept | rivals] ->
          cancelled =
            Enum.map(rivals, fn rival ->
              alignment =
                (rival.alignment || %{})
                |> Map.put("superseded_by", kept_id)
                |> Map.put("reconcile_reason", "duplicate_active_lineage")
                |> Map.put(
                  "reconciled_at",
                  DateTime.utc_now() |> DateTime.truncate(:microsecond) |> DateTime.to_iso8601()
                )

              {:ok, updated} =
                rival
                |> SharedPlan.changeset(%{
                  status: "cancelled",
                  cancelled_at: DateTime.utc_now() |> DateTime.truncate(:microsecond),
                  alignment: alignment
                })
                # Gyroscope (R13): even the (currently uncalled) dedupe passes
                # the gate — a duplicate that already resolved terminal stays.
                |> PlanTransition.guard_changeset(:plan, :cancel)
                |> Repo.update()

              updated.id
            end)

          %{kept: kept_id, cancelled: cancelled}
      end
    end)
  end

  def reconcile_conversation_plans(_), do: {:error, :invalid}

  # Multiple SharedPlans per conversation are lawful; lock the fold's
  # active plan (W4-01: never a separate new-plan lineage while a
  # fold plan exists - see prefer_fold_plan/1).
  defp lock_plan(conversation_id) do
    plans =
      from(p in SharedPlan,
        where: p.conversation_id == ^conversation_id and p.status in ^~w(tentative agreed changed),
        order_by: [desc: p.updated_at, desc: p.inserted_at],
        lock: "FOR UPDATE"
      )
      |> Repo.all()

    prefer_fold_plan(plans)
  end

  def set_activity(conversation_id, user_id, activity) when is_binary(activity) do
    with :ok <- member?(conversation_id, user_id) do
      value = activity |> String.downcase() |> String.trim()

      if value in @activities do
        _ = sync_conversation(conversation_id)

        with :ok <-
               append_action(
                 conversation_id,
                 action("activity_lock", user_id, value, "user_stated")
               ) do
          {:ok, sync_conversation(conversation_id)}
        end
      else
        {:error, :unknown_activity}
      end
    end
  end

  def confirm_exact_time(conversation_id, user_id) when is_binary(conversation_id) do
    with :ok <- member?(conversation_id, user_id) do
      state = sync_conversation(conversation_id)
      exact = state["exact_time"] || %{}

      if exact["state"] in ["candidate", "constrained", "agreed"] and is_binary(exact["value"]) do
        with :ok <-
               append_action(
                 conversation_id,
                 action("exact_time_lock", user_id, exact["value"], "locked")
               ) do
          {:ok, sync_conversation(conversation_id)}
        end
      else
        {:error, :nothing_to_confirm}
      end
    end
  end

  # Repair #15 (Track G) — nominate semantics. A name is nominatable when it
  # resolves through a real pipeline, in authority order:
  #   1. it is one of the candidates currently OFFERED for this plan's
  #      activity by CandidateProvider (the UI's candidate buttons), or
  #   2. it is already IN this plan's place state (candidate value, a
  #      conflict proposal, a conflict option) — i.e. it entered through
  #      chat proposal / another pipeline and this tap re-nominates it, or
  #   3. it matches a catalog entry (partial mentions included) but is not
  #      offered for the current activity → :activity_not_ready, exactly as
  #      before for a dinner place under a coffee activity.
  # Anything else is :unknown_place — an honest error. A brand-new real-world
  # venue enters via chat proposal (candidate, peer-confirmed) or the Center
  # Geoapify exact-entity pipeline, never by this button endpoint inventing
  # a resolution it did not perform.
  def nominate_place(conversation_id, user_id, name) when is_binary(conversation_id) do
    with :ok <- member?(conversation_id, user_id) do
      state = sync_conversation(conversation_id)

      offered =
        CandidateProvider.recommend(
          get_in(state, ["activity", "value"]) || "",
          get_in(state, ["participants", "value"]) || [],
          state,
          %{}
        )

      case nomination_resolution(name, state, offered) do
        {:ok, resolved} ->
          if field_state(state, "place") == "locked" do
            {:error, :place_locked}
          else
            with :ok <-
                   append_action(
                     conversation_id,
                     action("place_propose", user_id, resolved, "proposed")
                   ) do
              {:ok, sync_conversation(conversation_id)}
            end
          end

        :catalog_only ->
          if field_state(state, "place") == "locked",
            do: {:error, :place_locked},
            else: {:error, :activity_not_ready}

        :unknown ->
          {:error, :unknown_place}
      end
    end
  end

  defp nomination_resolution(name, state, offered) when is_binary(name) do
    down = name |> String.trim() |> String.downcase()

    cond do
      down == "" ->
        :unknown

      offered_name =
          Enum.find_value(offered, fn o ->
            if String.downcase(o["name"] || "") == down, do: o["name"]
          end) ->
        {:ok, offered_name}

      in_plan = in_plan_place_name(state, down) ->
        {:ok, in_plan}

      is_binary(CandidateProvider.catalog_match(name)) ->
        :catalog_only

      true ->
        :unknown
    end
  end

  defp nomination_resolution(_, _, _), do: :unknown

  # Names already carried by this plan's own place state (gyroscope: the
  # plan's state, not a global list, is the authority for what it holds).
  defp in_plan_place_name(state, down) do
    candidates =
      [get_in(state, ["place", "value"])] ++
        Enum.map(get_in(state, ["place", "proposals"]) || [], & &1["value"]) ++
        Enum.map(state["conflict_options"] || [], & &1["name"])

    Enum.find_value(candidates, fn
      value when is_binary(value) -> if String.downcase(value) == down, do: value
      _ -> nil
    end)
  end

  def confirm_place(conversation_id, user_id) when is_binary(conversation_id) do
    with :ok <- member?(conversation_id, user_id) do
      state = sync_conversation(conversation_id)
      proposed_by = get_in(state, ["place", "proposed_by_user_id"])
      value = get_in(state, ["place", "value"])

      cond do
        field_state(state, "place") != "candidate" or not is_binary(value) ->
          {:error, :nothing_to_confirm}

        proposed_by == user_id ->
          {:error, :cannot_confirm_own_proposal}

        true ->
          with :ok <-
                 append_action(conversation_id, action("place_confirm", user_id, value, "agreed")) do
            {:ok, sync_conversation(conversation_id)}
          end
      end
    end
  end

  def decline_place(conversation_id, user_id) when is_binary(conversation_id) do
    with :ok <- member?(conversation_id, user_id) do
      state = sync_conversation(conversation_id)

      if field_state(state, "place") in ["candidate", "conflicted"] do
        value = get_in(state, ["place", "value"])

        with :ok <-
               append_action(conversation_id, action("place_decline", user_id, value, "revoked")) do
          {:ok, sync_conversation(conversation_id)}
        end
      else
        {:error, :nothing_to_decline}
      end
    end
  end

  def reopen_place(conversation_id, user_id) when is_binary(conversation_id) do
    with :ok <- member?(conversation_id, user_id) do
      state = sync_conversation(conversation_id)

      if field_state(state, "place") == "locked" do
        value = get_in(state, ["place", "value"])

        with :ok <-
               append_action(conversation_id, action("place_reopen", user_id, value, "revoked")) do
          {:ok, sync_conversation(conversation_id)}
        end
      else
        {:error, :place_not_locked}
      end
    end
  end

  def propose_datetime_phrase(conversation_id, user_id, text) when is_binary(text) do
    propose_datetime_phrase(conversation_id, user_id, %{"text" => text})
  end

  def propose_datetime_phrase(conversation_id, user_id, attrs) when is_map(attrs) do
    with :ok <- member?(conversation_id, user_id) do
      state = sync_conversation(conversation_id)

      case canonical_datetime_change(state, attrs) do
        {:ok, change} ->
          proposal_id = Ecto.UUID.generate()

          stored =
            action("change_propose", user_id, change["summary"], "proposed")
            |> Map.merge(%{
              "field" => "datetime",
              "proposal_id" => proposal_id,
              "resolved_on" => change["resolved_on"],
              "local_time" => change["local_time"],
              "timezone" => change["timezone"] || DateTimeChange.timezone(),
              "date" => change["date"],
              "exact_time" => change["exact_time"],
              "time_window" => change["time_window"],
              "base_plan_version" => state["plan_version"] || 0
            })

          with :ok <- append_action(conversation_id, stored) do
            state = sync_conversation(conversation_id)
            maybe_record_chat_proposal(conversation_id, state)
            {:ok, state}
          end

        {:clarify, prompt} ->
          {:error, {:clarify, prompt}}

        {:error, reason} ->
          {:error, reason}
      end
    end
  end

  defp canonical_datetime_change(_state, %{"date" => date, "time" => time} = attrs)
       when is_binary(date) and is_binary(time) and date != "" and time != "" do
    DateTimeChange.from_controls(attrs)
  end

  defp canonical_datetime_change(state, %{"text" => text}) when is_binary(text) do
    context = %{
      "exact_time" => get_in(state, ["exact_time", "value"]),
      "date" => get_in(state, ["date", "value"]),
      "reference_on" => "2026-09-27"
    }

    case DateTimeChange.interpret(text, context, scoped: true) do
      {:change, change} -> {:ok, change}
      {:clarify, prompt} -> {:clarify, prompt}
      :keep -> {:error, :nothing_to_confirm}
      :none -> {:clarify, "Say a day, a time, or both."}
    end
  end

  defp canonical_datetime_change(_state, _attrs), do: {:clarify, "Say a day, a time, or both."}

  def propose_committed_change(conversation_id, _user_id, field, value)
      when not is_binary(field) or not is_binary(value) do
    if is_binary(conversation_id), do: {:error, :not_committed}, else: {:error, :not_a_member}
  end

  def propose_committed_change(conversation_id, user_id, field, value)
      when is_binary(conversation_id) and is_binary(field) and is_binary(value) do
    with :ok <- member?(conversation_id, user_id) do
      state = sync_conversation(conversation_id)

      if state["commitment"] in ["aligned", "execution_ready"] and
           field in ["exact_time", "activity", "place"] do
        with :ok <-
               append_action(
                 conversation_id,
                 action("change_propose", user_id, value, "proposed") |> Map.put("field", field)
               ) do
          state = sync_conversation(conversation_id)
          maybe_record_chat_proposal(conversation_id, state)
          # Repair #18 (unification): a committed time change proposed
          # through the fold ALSO exists as a PlanRevision - the one
          # pending-change record every surface reads. The fold's
          # change_proposal is its projection, not a second system.
          mirror_fold_proposal(conversation_id, user_id, field, value)
          {:ok, state}
        end
      else
        {:error, :not_committed}
      end
    end
  end

  # Create the System A record for a fold time proposal when a real
  # approver exists. Failures are non-fatal to the fold path: the fold
  # proposal remains, and the accept mirror settles revisions anyway.
  defp mirror_fold_proposal(conversation_id, user_id, field, value)
       when field in ["exact_time", "datetime"] do
    members = Messages.member_user_ids(conversation_id)

    with %SharedPlan{} = plan <- active_plan_for_conversation(conversation_id),
         true <- length(members) > 1,
         :ok <- ensure_no_pending_revision(plan.id, value) do
      _ =
        OpalCore.SocialFlow.propose_revision(%{
          plan_id: plan.id,
          proposed_by_user_id: user_id,
          changes: %{"time_label" => value},
          trace_id: "fold-proposal-mirror"
        })

      :ok
    else
      _ -> :ok
    end
  rescue
    _ -> :ok
  end

  defp mirror_fold_proposal(_, _, _, _), do: :ok

  defp ensure_no_pending_revision(plan_id, value) do
    pending =
      from(r in PlanRevision,
        where: r.plan_id == ^plan_id and r.status == "proposed",
        select: r.proposed_changes
      )
      |> Repo.all()

    if Enum.any?(pending, &((&1 || %{})["time_label"] == value)),
      do: {:error, :already_pending},
      else: :ok
  end

  # Settle the System A record after a fold accept: the acceptance is
  # recorded through PlanRevision + PlanTransition on the plan row
  # (SocialFlow.record_fold_change_acceptance/1), with the plan's
  # post-sync canonical label as the accepted value.
  defp mirror_fold_accept(conversation_id, user_id, proposal) do
    if proposal["field"] in ["exact_time", "datetime"] do
      value =
        case active_plan_for_conversation(conversation_id) do
          %SharedPlan{time_label: label} when is_binary(label) and label != "" -> label
          _ -> proposal["value"]
        end

      _ =
        OpalCore.SocialFlow.record_fold_change_acceptance(%{
          conversation_id: conversation_id,
          user_id: user_id,
          value: value,
          trace_id: "fold-accept-mirror"
        })

      :ok
    else
      :ok
    end
  rescue
    _ -> :ok
  end

  def accept_committed_change(conversation_id, user_id, proposal_id \\ nil)
      when is_binary(conversation_id) do
    with :ok <- member?(conversation_id, user_id) do
      state = sync_conversation(conversation_id)
      proposal = state["change_proposal"]

      cond do
        not is_map(proposal) ->
          {:error, :nothing_to_confirm}

        is_binary(proposal_id) and proposal["proposal_id"] != proposal_id ->
          {:error, :stale_proposal}

        proposal["status"] in ["stale", "superseded"] ->
          {:error, :stale_proposal}

        is_integer(proposal["base_plan_version"]) and
            proposal["base_plan_version"] != (state["plan_version"] || 0) ->
          {:error, :stale_proposal}

        proposal["proposed_by_user_id"] == user_id ->
          {:error, :cannot_confirm_own_proposal}

        true ->
          with :ok <-
                 append_action(
                   conversation_id,
                   action("change_accept", user_id, proposal["value"], "agreed")
                   |> Map.merge(%{
                     "field" => proposal["field"],
                     "proposal_id" => proposal["proposal_id"]
                   })
                 ) do
            state = sync_conversation(conversation_id)

            OpalCore.Calls.Outcomes.record_acceptance(
              conversation_id,
              proposal
              |> Map.put("accepted_by_user_id", user_id)
              |> Map.put("accepted_plan_version", state["plan_version"])
            )

            # Repair #18 (unification): the fold accept lands on the
            # plan row through the revision authority, atomically.
            mirror_fold_accept(conversation_id, user_id, proposal)

            deliver_alignment(conversation_id, state)
            {:ok, state}
          end
      end
    end
  end

  def keep_committed_plan(conversation_id, user_id) when is_binary(conversation_id) do
    with :ok <- member?(conversation_id, user_id) do
      state = sync_conversation(conversation_id)
      proposal = state["change_proposal"]

      if is_map(proposal) do
        value = proposal["current"]

        with :ok <-
               append_action(conversation_id, action("change_keep", user_id, value, "locked")) do
          OpalCore.Calls.Outcomes.record_keep(conversation_id, proposal, user_id)
          # Repair #18 (unification): keeping the current plan settles
          # the mirrored PlanRevision too - reject it when this user is
          # a required approver, so no pending record outlives the keep.
          settle_revision_on_keep(conversation_id, user_id)
          {:ok, sync_conversation(conversation_id)}
        end
      else
        {:error, :nothing_to_confirm}
      end
    end
  end

  defp settle_revision_on_keep(conversation_id, user_id) do
    with %SharedPlan{} = plan <- active_plan_for_conversation(conversation_id),
         %PlanRevision{} = revision <-
           from(r in PlanRevision,
             where: r.plan_id == ^plan.id and r.status == "proposed",
             order_by: [desc: r.inserted_at],
             limit: 1
           )
           |> Repo.one(),
         true <- user_id in (revision.required_approvals || []) do
      _ =
        OpalCore.SocialFlow.respond_to_revision(%{
          revision_id: revision.id,
          user_id: user_id,
          decision: "reject",
          trace_id: "fold-keep-mirror"
        })

      :ok
    else
      _ -> :ok
    end
  rescue
    _ -> :ok
  end

  @doc """
  Records that this person authorizes a reservation request.

  Agreement is not execution. This does not contact a restaurant.
  """
  def authorize_reservation(conversation_id, user_id) when is_binary(conversation_id) do
    with :ok <- member?(conversation_id, user_id) do
      state = sync_conversation(conversation_id)

      if field_state(state, "place") == "locked" do
        value = get_in(state, ["place", "value"])

        with :ok <-
               append_action(
                 conversation_id,
                 action("reservation_authorize", user_id, value, "proposed")
               ) do
          {:ok, sync_conversation(conversation_id)}
        end
      else
        {:error, :place_not_locked}
      end
    end
  end

  def plan_material?(state) do
    ["date", "time_window", "exact_time", "place"]
    |> Enum.any?(fn key -> get_in(state, [key, "state"]) not in [nil, "unknown"] end)
  end

  defp maybe_record_chat_proposal(conversation_id, state) when is_map(state) do
    case state["change_proposal"] do
      proposal when is_map(proposal) ->
        OpalCore.Calls.Outcomes.record_proposal_state(conversation_id, proposal, %{
          "source_type" => proposal["source_type"] || "chat",
          "plan_version" => state["plan_version"],
          "plan_id" => state["lineage_id"]
        })

      _ ->
        :skipped
    end
  end

  defp member?(conversation_id, user_id) do
    if user_id in Messages.member_user_ids(conversation_id),
      do: :ok,
      else: {:error, :not_a_member}
  end

  defp apply_message(state, message) do
    body = message_body(message)
    id = message_id(message)
    actor = message_actor(message)
    text = normalize(body)

    cond do
      text == "" or trivial?(text) or SeedFixtureLeak.seed_fixture_body?(body) ->
        state

      true ->
        case intent_gate(state, text, body, id, actor) do
          :current ->
            # Only current-plan-path messages move the thread's
            # working activity keyword: a sibling-plan creation or
            # an ASK must never rename what the CURRENT plan is.
            state
            |> fold_current_plan_message(text, body, id, actor)
            |> note_activity_keyword(text)

          {:handled, gated_state} ->
            gated_state
        end
    end
  end

  # W4-01: the thread's working activity keyword - the most recent
  # known activity noun any earlier message named ("dinner" in
  # "Let's do dinner at Juniper and Ivy..."). The fold's activity
  # FIELD only locks for exact-phrase intents, so a plan formed from
  # ordinary sentences often carries no activity value; the keyword
  # is the gate's memory of what the current plan IS, used only for
  # matching (never rendered as the plan's activity). Updated AFTER
  # the gate reads it, so a message can never match itself.
  @activity_keywords ~w(dinner lunch brunch breakfast coffee drinks church
                        soccer movie concert meeting hike gym birthday)

  defp note_activity_keyword(state, text) do
    keyword =
      Enum.find(@activity_keywords, fn word ->
        Regex.match?(~r/\b#{word}\b/, text)
      end) ||
        if Regex.match?(~r/\bbible study\b/, text), do: "bible study"

    if keyword do
      Map.put(state, "activity_keyword", keyword)
    else
      state
    end
  end

  # The current plan's activity as the gate knows it: the folded
  # activity value when one locked, else the thread's working
  # activity keyword.
  defp current_activity(state) do
    case get_in(state, ["activity", "value"]) do
      value when is_binary(value) and value != "" -> value
      _ -> state["activity_keyword"]
    end
  end

  # The pre-W4-01 fold pipeline, unchanged: every step interprets
  # the message as being about the thread's current plan.
  defp fold_current_plan_message(state, text, body, id, actor) do
    state
    |> note_activity(text, id)
    |> note_date(text, id)
    |> accept_date(text, id)
    |> note_window(text, id)
    |> note_exact(text, id)
    |> retarget_time(text, id, actor)
    |> note_place(text, body, id, actor)
    |> accept_place(text, id, actor)
    |> note_datetime_change(text, id, actor)
    |> note_activity_intent(text, id, actor)
  end

  # ==================================================================
  # Repair #18 (W4-01) - INTENT DISAMBIGUATION GATE
  #
  # The founder's Walk #4 defect: in a thread with an existing 8 PM
  # dinner plan, "Schedule 7 am church at Awaken" - a request to
  # create a NEW plan - was folded into a change_proposal on the
  # dinner plan ("Suggested 7:00 AM instead"). A new-plan request
  # must CREATE the new plan or ASK; it must never silently become
  # a revision candidate on the current plan.
  #
  # The gate runs per message BEFORE the current-plan pipeline, in
  # this order (first match wins):
  #
  #  1. ASK RESOLUTION: while an intent_ask is outstanding, a reply
  #     naming one of its candidates resolves it ("new" -> the stored
  #     signal becomes a new-plan creation; a change verb or the
  #     current plan's name -> the stored change applies to the
  #     current plan through the ordinary revision gate). A bare
  #     "yes" never resolves an ASK. Unrelated replies leave the
  #     ASK standing.
  #  2. NO CURRENT PLAN: nothing to misroute into - the message
  #     takes the ordinary formation path.
  #  3. ANCHORED CHANGE: a change verb (change / move / switch /
  #     shift / reschedule / make it) anchored to the current plan
  #     (its activity, its place, "it", "the plan") is a revision
  #     intent - ordinary path, Division A behavior unchanged.
  #  4. SCHEDULING VERB (schedule / add / book / create / set up, at
  #     the head of the message or after "let's" / "can we"): the
  #     message is a creation request.
  #       - Its activity AND venue (whichever it names) both differ
  #         from the current plan's: a NEW PLAN signal. The fold
  #         records it in "new_plan_signals" and touches NOTHING on
  #         the current plan; sync_conversation materializes it as
  #         a separate SharedPlan (materialize_new_plans/2).
  #       - Its activity or venue MATCHES the current plan's, or it
  #         names neither: genuinely ambiguous - ASK with named
  #         candidates ("Start a new plan for dinner at 7:00 AM, or
  #         change Dinner to 7:00 AM?") and write nothing.
  #  5. BARE RETARGET ("make it 7 instead", "move it to 7") with
  #     SIBLING plans in the thread: "it" has more than one lawful
  #     referent - ASK naming every candidate plan, write nothing.
  #     With no siblings the retarget anchors to the current plan
  #     (rule 3 / ordinary path), exactly as before.
  #  6. Anything else: ordinary current-plan path.
  #
  # Invariants: the gate never creates a change_proposal for a
  # rule-4/5 message; an ASK writes nothing (no proposal, no plan,
  # no field change); Division A revision behavior on the ordinary
  # path is untouched.
  # ==================================================================

  defp intent_gate(state, text, body, id, actor) do
    ask = state["intent_ask"]

    cond do
      is_map(ask) and intent_ask_resolution(state, ask, text) == :new ->
        {:handled, resolve_ask_as_new_plan(state, ask)}

      is_map(ask) and intent_ask_resolution(state, ask, text) == :change ->
        {:handled, resolve_ask_as_change(state, ask, id, actor)}

      not current_plan_material?(state) ->
        :current

      # Rule 5 before rule 3: a bare retarget ("make it 7") is
      # "anchored" by the word "it" itself, so the anchored-change
      # rule would always swallow it - but with sibling plans "it"
      # has more than one lawful referent and must ASK first.
      bare_retarget?(text) and sibling_plans_present?(state) ->
        {:handled, put_retarget_ask(state, text, actor)}

      anchored_change?(state, text) ->
        :current

      scheduling_verb?(text) ->
        {:handled, apply_scheduling_intent(state, text, body, id, actor)}

      true ->
        :current
    end
  end

  defp sibling_plans_present?(state) do
    is_list(state["sibling_plans"]) and state["sibling_plans"] != []
  end

  # Same materiality test sync uses to decide a plan row exists:
  # any of date / time_window / exact_time / place is known.
  defp current_plan_material?(state) do
    Enum.any?(["date", "time_window", "exact_time", "place"], fn key ->
      value = get_in(state, [key, "value"])
      is_binary(value) and value != ""
    end)
  end

  defp anchored_change?(state, text) do
    change_language? =
      Regex.match?(~r/\b(?:change|move|switch|shift|reschedule)\b/, text) or
        Regex.match?(~r/\bmake it\b/, text)

    anchored? =
      mentions_current_plan?(state, text) or
        Regex.match?(~r/\bit\b|\bthe plan\b/, text)

    change_language? and anchored?
  end

  defp mentions_current_plan?(state, text) do
    activity_mentioned? =
      case current_activity(state) do
        value when is_binary(value) and value != "" ->
          String.contains?(text, String.downcase(value))

        _ ->
          false
      end

    place_mentioned? =
      case get_in(state, ["place", "value"]) do
        value when is_binary(value) and value != "" ->
          String.contains?(text, String.downcase(value))

        _ ->
          false
      end

    activity_mentioned? or place_mentioned?
  end

  defp scheduling_verb?(text) do
    Regex.match?(~r/\A(?:please\s+)?(?:schedule|add|book|create|set up)\b/, text) or
      Regex.match?(~r/\b(?:let'?s|lets)\s+(?:schedule|add|book|plan|create)\b/, text) or
      Regex.match?(~r/\bcan we\s+(?:schedule|add|book|create)\b/, text)
  end

  defp bare_retarget?(text) do
    Regex.match?(~r/\b(?:make|move|change|shift)\s+it\s+(?:to\s+)?\d/, text) or
      (Regex.match?(~r/\binstead\b/, text) and Regex.match?(~r/\d/, text))
  end

  # -- Rule 4: scheduling intents ------------------------------------

  defp apply_scheduling_intent(state, text, body, id, actor) do
    signal = extract_plan_signal(state, text, body, id, actor)

    cond do
      signal["activity_matches_current"] or signal["venue_matches_current"] ->
        put_new_or_change_ask(state, signal)

      is_nil(signal["activity"]) and is_nil(signal["place"]) ->
        put_new_or_change_ask(state, signal)

      true ->
        state
        |> clear_intent_ask()
        |> Map.update("new_plan_signals", [signal], fn signals -> signals ++ [signal] end)
    end
  end

  # Parse a scheduling message into a plan signal: activity, venue,
  # date/time (through the one DateTimeChange reading), and whether
  # either named thing matches the current plan.
  defp extract_plan_signal(state, text, body, id, actor) do
    context = %{
      "exact_time" => get_in(state, ["exact_time", "value"]),
      "date" => get_in(state, ["date", "value"]),
      "reference_on" => "2026-09-27"
    }

    change =
      case DateTimeChange.interpret(text, context, scoped: false) do
        {:change, change} -> change
        _ -> nil
      end

    activity =
      case ActivityIntent.compile(text) do
        %{"normalized_label" => label} -> label
        _ -> freeform_activity(text)
      end

    venue = extract_venue(text)
    date_label = change && get_in(change, ["date", "value"])
    time_value = change && get_in(change, ["exact_time", "value"])

    time_label =
      [date_label, time_value]
      |> Enum.filter(&(is_binary(&1) and &1 != ""))
      |> Enum.join(" ")
      |> case do
        "" -> nil
        label -> label
      end

    title =
      cond do
        is_binary(activity) and is_binary(venue) -> "#{activity} at #{venue}"
        is_binary(activity) -> activity
        is_binary(venue) -> venue
        true -> nil
      end

    %{
      "message_id" => id,
      "actor_user_id" => actor,
      "activity" => activity,
      "place" => venue,
      "date_label" => date_label,
      "time_value" => time_value,
      "time_label" => time_label,
      "title" => title,
      "activity_matches_current" =>
        signal_matches?(activity, current_activity(state)),
      "venue_matches_current" => signal_matches?(venue, get_in(state, ["place", "value"])),
      "change" => change,
      "raw_text" => body
    }
  end

  defp signal_matches?(candidate, current)
       when is_binary(candidate) and is_binary(current) do
    a = String.downcase(candidate)
    b = String.downcase(current)
    a == b or String.contains?(a, b) or String.contains?(b, a)
  end

  defp signal_matches?(_, _), do: false

  # Freeform activity: the words of the scheduling phrase once the
  # verb, the venue tail, the clock and the day are removed
  # ("add soccer saturday 10 am at the park" -> "Soccer").
  defp freeform_activity(text) do
    phrase =
      text
      |> String.replace(
        ~r/\A\s*(?:please\s+)?(?:let'?s|lets|can we)?\s*(?:schedule|add|book|create|set up)\s+/,
        ""
      )
      |> String.replace(~r/\bat\s+.+$/, "")
      |> String.replace(~r/\b\d{1,2}(?::\d{2})?\s*(?:am|pm)?\b/, " ")
      |> String.replace(
        ~r/\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|today|on|for|a|an|the)\b/,
        " "
      )
      |> String.replace(~r/\s+/, " ")
      |> String.trim()

    case phrase do
      "" -> nil
      phrase -> titleize_words(phrase)
    end
  end

  # Venue: the tail after the last " at ", unless the tail is a
  # clock ("dinner at 7 am" names a time, not a place).
  defp extract_venue(text) do
    case Regex.run(~r/\bat\s+(.+)$/, text) do
      [_, tail] ->
        tail =
          tail
          |> String.replace(
            ~r/\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|today)\b.*$/,
            ""
          )
          |> String.trim()

        cond do
          tail == "" -> nil
          Regex.match?(~r/\A\d/, tail) -> nil
          Regex.match?(~r/\b(?:am|pm)\b/, tail) and not Regex.match?(~r/[a-z]{3,}/, String.replace(tail, ~r/\b(?:am|pm)\b/, "")) -> nil
          true -> titleize_words(tail)
        end

      _ ->
        nil
    end
  end

  defp titleize_words(text) do
    text
    |> String.split(~r/\s+/, trim: true)
    |> Enum.map_join(" ", &String.capitalize/1)
  end

  # -- ASKs ------------------------------------------------------------

  defp put_new_or_change_ask(state, signal) do
    current_name = current_plan_name(state)
    current_time = get_in(state, ["exact_time", "value"])
    new_desc = signal_description(signal)

    prompt =
      if is_binary(signal["time_value"]) do
        "Start a new plan for #{new_desc}, or change #{current_name} to #{signal["time_value"]}?"
      else
        "Start a new plan for #{new_desc}, or change #{current_name}?"
      end

    ask = %{
      "kind" => "new_or_change",
      "prompt" => prompt,
      "signal" => signal,
      "change" => signal["change"],
      "candidates" => [
        %{"kind" => "new_plan", "label" => "New plan: #{new_desc}"},
        %{
          "kind" => "change_current",
          "label" => "Change #{current_name}",
          "current_time" => current_time
        }
      ]
    }

    state
    |> Map.put("intent_ask", ask)
    |> Map.put("clarify", prompt)
  end

  defp put_retarget_ask(state, text, actor) do
    context = %{
      "exact_time" => get_in(state, ["exact_time", "value"]),
      "date" => get_in(state, ["date", "value"]),
      "reference_on" => "2026-09-27"
    }

    time_value =
      case DateTimeChange.interpret(text, context, scoped: false) do
        {:change, change} -> get_in(change, ["exact_time", "value"])
        _ -> nil
      end || retarget_clock_label(text)

    current_name = current_plan_name(state)
    current_time = get_in(state, ["exact_time", "value"])

    candidates =
      [%{"name" => current_name, "time_label" => current_time}] ++
        Enum.map(state["sibling_plans"] || [], fn sibling ->
          %{"name" => sibling["title"], "time_label" => sibling["time_label"]}
        end)

    named =
      Enum.map_join(candidates, ", or ", fn candidate ->
        case candidate["time_label"] do
          label when is_binary(label) and label != "" -> "#{candidate["name"]} (#{label})"
          _ -> candidate["name"]
        end
      end)

    prompt =
      if is_binary(time_value) do
        "Change #{named} to #{time_value}? Which one did you mean?"
      else
        "Change #{named}? Which one did you mean?"
      end

    ask = %{
      "kind" => "retarget",
      "prompt" => prompt,
      "time_value" => time_value,
      "proposed_by_user_id" => actor,
      "candidates" =>
        Enum.map(candidates, fn candidate ->
          %{"kind" => "plan", "label" => candidate["name"], "time_label" => candidate["time_label"]}
        end)
    }

    state
    |> Map.put("intent_ask", ask)
    |> Map.put("clarify", prompt)
  end

  defp retarget_clock_label(text) do
    case Regex.run(~r/\b(\d{1,2})(?::(\d{2}))?\b/, text) do
      [_, hour, minutes] ->
        "#{hour}:#{if(minutes in [nil, ""], do: "00", else: minutes)} PM"

      [_, hour] ->
        "#{hour}:00 PM"

      _ ->
        nil
    end
  end

  defp current_plan_name(state) do
    activity = current_activity(state)
    place = get_in(state, ["place", "value"])

    cond do
      is_binary(activity) and activity != "" -> titleize_words(String.downcase(activity))
      is_binary(place) and place != "" -> place
      true -> "the current plan"
    end
  end

  defp signal_description(signal) do
    parts =
      [
        signal["activity"] && String.downcase(signal["activity"]),
        signal["place"] && "at #{signal["place"]}",
        signal["date_label"],
        signal["time_value"] && "at #{signal["time_value"]}"
      ]
      |> Enum.filter(&(is_binary(&1) and &1 != ""))

    case parts do
      [] -> "that"
      parts -> Enum.join(parts, " ")
    end
  end

  # -- ASK resolution ----------------------------------------------------

  # A reply resolves an outstanding ASK only by NAMING a candidate:
  # "new" for the new-plan candidate, a change verb or the current
  # plan's own name for the change candidate. A bare yes/no, or an
  # unrelated message, resolves nothing (the ASK stands) - a bare
  # yes must never revive an unrelated earlier object.
  defp intent_ask_resolution(state, %{"kind" => "new_or_change"}, text) do
    cond do
      Regex.match?(~r/\bnew\b/, text) -> :new
      Regex.match?(~r/\b(?:change|move|switch|shift)\b/, text) -> :change
      mentions_current_plan?(state, text) -> :change
      true -> nil
    end
  end

  defp intent_ask_resolution(state, %{"kind" => "retarget"}, text) do
    cond do
      # Naming the thread's own (fold) plan resolves to it. Naming a
      # sibling does NOT resolve here: the fold does not own the
      # sibling's schedule (its changes run through PlanRevision),
      # so the ASK stands until the fold plan is named or a clear
      # new instruction arrives - named limitation, W4-01 report.
      mentions_current_plan?(state, text) -> :change
      true -> nil
    end
  end

  defp intent_ask_resolution(_, _, _), do: nil

  defp resolve_ask_as_new_plan(state, %{"signal" => signal}) do
    state
    |> clear_intent_ask()
    |> Map.update("new_plan_signals", [signal], fn signals -> signals ++ [signal] end)
  end

  defp resolve_ask_as_new_plan(state, _), do: clear_intent_ask(state)

  defp resolve_ask_as_change(state, %{"kind" => "new_or_change"} = ask, id, actor) do
    state = clear_intent_ask(state)

    case ask["change"] do
      change when is_map(change) ->
        apply_datetime_change(state, change, id, actor)

      _ ->
        case ask["signal"]["time_value"] do
          value when is_binary(value) ->
            if value == get_in(state, ["exact_time", "value"]) do
              state
            else
              put_change_proposal(state, "exact_time", value, actor)
            end

          _ ->
            state
        end
    end
  end

  defp resolve_ask_as_change(state, %{"kind" => "retarget"} = ask, _id, actor) do
    state = clear_intent_ask(state)
    value = ask["time_value"]

    if is_binary(value) and value != get_in(state, ["exact_time", "value"]) do
      put_change_proposal(state, "exact_time", value, actor)
    else
      state
    end
  end

  defp resolve_ask_as_change(state, _, _, _), do: clear_intent_ask(state)

  # An ASK is superseded by any explicit new state (a proposal, a
  # fresh new-plan signal, its own resolution). Clearing also drops
  # the clarify copy when the clarify IS this ask's prompt, so a
  # resolved ask never lingers on the thread as a stale question.
  defp clear_intent_ask(state) do
    ask = state["intent_ask"]

    state
    |> Map.delete("intent_ask")
    |> then(fn next ->
      if is_map(ask) and next["clarify"] == ask["prompt"] do
        Map.delete(next, "clarify")
      else
        next
      end
    end)
  end

  defp note_datetime_change(state, text, id, actor) do
    context = %{
      "exact_time" => get_in(state, ["exact_time", "value"]),
      "date" => get_in(state, ["date", "value"]),
      "reference_on" => "2026-09-27"
    }

    if confirmation_replay?(state, text) do
      # Repair #18 (Division A): a confirmer's own "confirm 8 PM" is a
      # confirmation OF the pending proposal, not a fresh proposal by
      # the confirmer. Replaying it as a datetime change resurrected a
      # pending change_proposal after the revision was accepted (the
      # fold replays every message on every sync).
      #
      # Repair #18 residuals (R-2): skipping interpretation is only
      # half of the settlement - the confirmation must APPLY the
      # pending proposal inside the fold itself. The human thread's
      # confirm travels as this chat message; the System A revision
      # accept (when the intelligence executor fires) mirrors the same
      # settlement, but when the executor cannot fire (an ambiguous
      # schedule target elsewhere in the account), nothing else ever
      # applied the change, and every surface kept reading the old
      # time. A confirmation from anyone but the proposer applies the
      # proposal exactly the way a change_accept action does; the
      # proposer's own "confirm" settles nothing (it still needs the
      # other party).
      proposal = state["change_proposal"]

      if is_map(proposal) and is_binary(actor) and actor != proposal["proposed_by_user_id"] do
        state
        |> apply_accepted_change(proposal, actor)
        |> Map.delete("change_proposal")
        |> Map.update("plan_version", 1, &(&1 + 1))
        |> mark_fold_settlement(actor)
      else
        state
      end
    else
      note_datetime_change_interpreted(state, text, id, actor, context)
    end
  end

  # Repair #18 residuals (R-2b): stamp a message-driven acceptance so
  # sync_conversation can land it in the revision chain after the
  # fold (see settle_fold_acceptance/2). Only chat confirmations mark
  # this - explicit change_accept actions keep their existing mirror
  # path (accept_committed_change), so no acceptance is recorded
  # twice.
  defp mark_fold_settlement(state, actor) do
    Map.put(state, "settled_change", %{
      "clock" =>
        OpalCore.SocialFlow.PlanIdentity.parse_clock(get_in(state, ["exact_time", "value"]) || ""),
      "actor_user_id" => actor
    })
  end

  defp confirmation_replay?(state, text) do
    proposal = state["change_proposal"]

    is_map(proposal) and
      Regex.match?(~r/\A\s*(confirm|confirmed|yes|yeah|yep|ok|okay|sure)\b/, text) and
      confirmation_clock_matches?(proposal, text)
  end

  defp confirmation_clock_matches?(proposal, text) do
    text_clock = OpalCore.SocialFlow.PlanIdentity.parse_clock(text)

    cond do
      is_nil(text_clock) ->
        true

      true ->
        proposal_clock =
          OpalCore.SocialFlow.PlanIdentity.parse_clock(proposal["value"] || "") ||
            OpalCore.SocialFlow.PlanIdentity.parse_clock(
              get_in(proposal, ["exact_time", "value"]) || ""
            )

        is_nil(proposal_clock) or proposal_clock == text_clock
    end
  end

  defp note_datetime_change_interpreted(state, text, id, actor, context) do
    case DateTimeChange.interpret(text, context, scoped: false) do
      :none ->
        state

      :keep ->
        Map.delete(state, "change_proposal")

      {:clarify, prompt} ->
        if committed_plan?(state), do: Map.put(state, "clarify", prompt), else: state

      {:change, change} ->
        cond do
          # Repair #18 residuals (R-2): a second party restating the
          # pending proposal's own time ("8 PM works for me") is
          # seconding it - that settles the proposal the same way an
          # explicit confirmation does, instead of re-proposing it.
          seconding_pending_proposal?(state, change, actor) ->
            proposal = state["change_proposal"]

            state
            |> apply_accepted_change(proposal, actor)
            |> Map.delete("change_proposal")
            |> Map.update("plan_version", 1, &(&1 + 1))
            |> mark_fold_settlement(actor)

          true ->
            apply_datetime_change(state, change, id, actor)
        end
    end
  end

  defp seconding_pending_proposal?(state, change, actor) do
    proposal = state["change_proposal"]

    is_map(proposal) and is_binary(actor) and actor != proposal["proposed_by_user_id"] and
      same_clock?(
        proposal_clock(proposal),
        OpalCore.SocialFlow.PlanIdentity.parse_clock(
          get_in(change, ["exact_time", "value"]) || ""
        )
      )
  end

  defp proposal_clock(proposal) do
    OpalCore.SocialFlow.PlanIdentity.parse_clock(proposal["value"] || "") ||
      OpalCore.SocialFlow.PlanIdentity.parse_clock(
        get_in(proposal, ["exact_time", "value"]) || ""
      )
  end

  defp same_clock?(a, b), do: not is_nil(a) and not is_nil(b) and a == b

  defp apply_datetime_change(state, change, id, actor) do
    cond do
      # Repair #18 residuals (R-2a): moving the plan ROW's committed
      # time is a REVISION, not formation. The old gate keyed only on
      # committed_plan?/1 (exact_time locked AND place locked), so in
      # the common shape - time agreed in plain language, place still
      # a candidate - a spoken "let's change dinner to 8 PM" silently
      # overwrote the plan row's canonical time_label through
      # upsert_plan before anyone confirmed. Now: a change targeting
      # the row's current clock (seeded by sync_locked - see
      # existing_time_change?/3) lands as a change_proposal, pending
      # living there only, until the other party confirms.
      # First-time setting, same-time restatement, solo threads,
      # formation refinement against no row, and a delegated
      # datetime holder acting inside their rights keep the direct
      # path.
      existing_time_change?(state, change, actor) ->
        put_change_proposal(state, datetime_proposal(state, change, actor))

      not committed_plan?(state) or
          (not DateTimeChange.confirmation_required?(state) and
             actor == DateTimeChange.holder_id(state)) ->
        state
        |> put_parsed_date(change, id)
        |> put_parsed_time(change, id)
        |> put_parsed_window(change, id)

      true ->
        put_change_proposal(state, datetime_proposal(state, change, actor))
    end
  end

  # True when `change` would move an exact_time the fold already
  # holds (to a different clock) in a conversation with more than one
  # participant, and the actor does not hold delegated datetime
  # rights that make the change theirs alone to make.
  # True when `change` would move the plan ROW's committed time.
  # The fold is pure formation logic: refining a candidate time while
  # a plan is still being negotiated is formation, and the fold's own
  # semantics encode that. A revision exists only against a schedule
  # a plan row already carries - sync_locked seeds the row's current
  # clock into the fold as "plan_row_clock", and a change is gated
  # when it targets exactly that clock (the fold's current exact_time
  # IS the row's time, restated by the forming messages) with a
  # different one, in a multi-party thread, by an actor without
  # delegated datetime rights. Pure folds (no row) never gate.
  defp existing_time_change?(state, change, actor) do
    current = get_in(state, ["exact_time", "value"])

    new_clock =
      OpalCore.SocialFlow.PlanIdentity.parse_clock(get_in(change, ["exact_time", "value"]) || "")

    current_clock = OpalCore.SocialFlow.PlanIdentity.parse_clock(current || "")
    row_clock = state["plan_row_clock"]

    cond do
      not is_binary(row_clock) ->
        false

      not is_binary(current) or current == "" ->
        false

      is_nil(new_clock) or is_nil(current_clock) ->
        false

      current_clock != row_clock ->
        false

      new_clock == current_clock ->
        false

      solo_thread?(state) ->
        false

      actor == DateTimeChange.holder_id(state) and
          not DateTimeChange.confirmation_required?(state) ->
        false

      true ->
        true
    end
  end

  defp solo_thread?(state) do
    case get_in(state, ["participants", "value"]) do
      participants when is_list(participants) -> length(participants) <= 1
      _ -> false
    end
  end

  defp committed_plan?(state) do
    field_state(state, "exact_time") == "locked" and field_state(state, "place") == "locked"
  end

  defp datetime_proposal(state, change, actor) do
    %{
      "field" => "datetime",
      "value" => change["summary"],
      "current" => get_in(state, ["exact_time", "value"]),
      "current_date" => get_in(state, ["date", "value"]),
      "date" => change["date"],
      "exact_time" => change["exact_time"],
      "time_window" => change["time_window"],
      "date_constraint" => change["date_constraint"],
      "proposed_by_user_id" => actor,
      "truth" => "proposed",
      "explicit" => true,
      "approximate" => change["approximate"],
      # F12-58 — every change proposal dies on its own if nobody answers.
      "expires_at" => proposal_expires_at()
    }
  end

  defp put_parsed_date(state, %{"date" => %{"value" => value} = date}, id)
       when is_binary(value) do
    put_field(state, "date", "candidate", value, id, %{
      "resolved_on" => date["resolved_on"],
      "timezone" => date["timezone"] || DateTimeChange.timezone(),
      "explicit" => true
    })
  end

  defp put_parsed_date(state, _, _), do: state

  defp put_parsed_time(state, %{"exact_time" => %{"state" => "unknown"}}, _id),
    do: clear_exact(state)

  defp put_parsed_time(state, %{"exact_time" => %{"value" => value, "state" => field_state}}, id)
       when is_binary(value) do
    approximate = field_state == "approximate"
    lock = not approximate and field_state(state, "place") == "locked"

    put_field(state, "exact_time", if(lock, do: "locked", else: "candidate"), value, id, %{
      "needs_confirm" => not lock,
      "confidence" => if(approximate, do: "approximate", else: "explicit"),
      "explicit" => not approximate
    })
  end

  defp put_parsed_time(state, _, _), do: state

  defp put_parsed_window(state, %{"time_window" => %{"value" => value} = window}, id)
       when is_binary(value) do
    put_field(state, "time_window", "constrained", value, id, %{
      "start" => window["start"],
      "end" => window["end"],
      "explicit" => true
    })
  end

  defp put_parsed_window(state, _, _), do: state

  defp clear_exact(state) do
    put_field(state, "exact_time", "unknown", nil, nil, %{"explicit" => true, "truth" => nil})
  end

  defp note_activity_intent(state, text, id, actor) do
    case ActivityIntent.compile(text) do
      nil ->
        state

      intent ->
        label = intent["normalized_label"]
        current = get_in(state, ["activity", "value"])

        cond do
          current == label ->
            state

          committed_plan?(state) ->
            put_change_proposal(state, %{
              "field" => "activity",
              "value" => label,
              "current" => current,
              "proposed_by_user_id" => actor,
              "truth" => "proposed",
              "explicit" => true,
              "execution_type" => intent["execution_type"],
              "category" => intent["category"]
            })

          field_state(state, "activity") in ["unknown", "candidate"] ->
            put_field(state, "activity", "locked", label, id, %{
              "explicit" => true,
              "truth" => "user_stated",
              "category" => intent["category"],
              "subtype" => intent["subtype"],
              "scope" => intent["scope"],
              "execution_type" => intent["execution_type"],
              "raw_text" => intent["raw_text"]
            })

          true ->
            state
        end
    end
  end

  defp note_activity(state, text, id) do
    if Regex.match?(~r/\bmeet\b|\bmeetup\b/, text) and field_state(state, "activity") == "unknown" do
      put_field(state, "activity", "candidate", "meet", id)
    else
      state
    end
  end

  defp note_date(state, text, id) do
    cond do
      field_state(state, "date") == "locked" ->
        state

      Regex.match?(~r/\btomorrow\b/, text) ->
        put_field(state, "date", "candidate", "tomorrow", id)

      true ->
        state
    end
  end

  defp accept_date(state, text, id) do
    if field_state(state, "date") == "candidate" and
         Regex.match?(~r/\b(yes|yeah|works|sure|ok)\b/, text) do
      put_field(state, "date", "locked", "tomorrow", id)
    else
      state
    end
  end

  defp note_window(state, text, id) do
    cond do
      field_state(state, "exact_time") == "locked" ->
        state

      Regex.match?(~r/\bafter\s+6(?:\s*pm)?/, text) ->
        put_field(state, "time_window", "constrained", "after 6 PM", id)

      true ->
        state
    end
  end

  defp note_exact(state, text, id) do
    cond do
      field_state(state, "exact_time") == "locked" and not Regex.match?(~r/\bmake it\s+\d/, text) ->
        state

      Regex.match?(~r/\blet'?s do\s+6:30\b|\blets do\s+6:30\b/, text) ->
        propose_exact(state, "6:30 PM", id)

      Regex.match?(~r/\blet'?s do\s+6\b|\blets do\s+6\b/, text) ->
        propose_exact(state, "6:00 PM", id)

      true ->
        state
    end
  end

  defp retarget_time(state, text, id, actor) do
    case Regex.run(~r/\b(?:actually\s+)?make it\s+(\d{1,2})\b/, text) do
      [_, hour] ->
        label = "#{hour}:00 PM"
        previous = get_in(state, ["exact_time", "value"])

        # Committed plans (locked time + place) always propose — same law as
        # apply_datetime_change/4. Execution agreement is not required; a prior
        # time accept may have cleared reservation without unlocking the plan.
        # (Repair #18 residuals note: the R-2a proposal gate deliberately
        # does NOT extend here - "make it X" is the fold's formation
        # retarget and reopens the time even after a lock, per the
        # fold's established semantics; revision proposals arrive via
        # interpreted datetime changes against the plan row's time.)
        cond do
          committed_plan?(state) and previous != label ->
            put_change_proposal(state, "exact_time", label, actor || id)

          previous == label ->
            state
            |> put_field("exact_time", "candidate", label, id)
            |> put_in(["exact_time", "needs_confirm"], true)

          true ->
            state
            |> put_field("exact_time", "candidate", label, id)
            |> put_in(["exact_time", "needs_confirm"], true)
            |> clear_execution()
        end

      _ ->
        state
    end
  end

  # Repair #15 (Track G) — chat place extraction. Recognition order:
  #   1. a CandidateProvider catalog entry mentioned in the text
  #      (catalog-driven; covers every catalog activity, not just dinner);
  #   2. a generic named place after a proposal cue in the ORIGINAL body
  #      ("Let's do Harbor Table", "Actually Contramar") — the R14 generic
  #      venue-candidate grammar. Extraction only ever creates a CANDIDATE:
  #      the place locks solely through the existing confirmation mechanics
  #      (peer confirm, both-selected, convergence), never on mention alone.
  defp note_place(state, text, body, id, actor) do
    name =
      if Regex.match?(~r/\b(let'?s do|lets do|make it|actually)\b/, text) do
        CandidateProvider.catalog_match(text) || named_place_after_cue(body)
      end

    cond do
      is_nil(name) ->
        state

      field_state(state, "place") == "locked" and place_retarget?(text) ->
        state
        |> clear_place()
        |> clear_execution()
        |> propose_place(name, id, actor)

      field_state(state, "place") == "locked" ->
        state

      true ->
        propose_place(state, name, id, actor)
    end
  end

  defp accept_place(state, text, id, actor) do
    proposed_by = get_in(state, ["place", "proposed_by_user_id"])

    if field_state(state, "exact_time") == "locked" and field_state(state, "place") == "candidate" and
         is_binary(actor) and actor != proposed_by and
         Regex.match?(~r/\A(yes|yeah|yep|confirm|sure|ok|okay)[!. ]*\z/, text) do
      lock_place(state, get_in(state, ["place", "value"]), id, actor, "confirmed")
    else
      state
    end
  end

  defp apply_action(
         state,
         %{"kind" => "change_propose", "field" => "datetime", "proposal_id" => proposal_id} =
           action
       )
       when is_binary(proposal_id) do
    previous = state["change_proposal"]

    history =
      case previous do
        %{"proposal_id" => old_id} = prior when old_id != proposal_id ->
          (state["proposal_history"] || []) ++ [Map.put(prior, "status", "superseded")]

        _ ->
          state["proposal_history"] || []
      end

    proposal = %{
      "proposal_id" => proposal_id,
      "field" => "datetime",
      "status" => "pending",
      "value" => action["value"],
      "resolved_on" => action["resolved_on"],
      "local_time" => action["local_time"],
      "timezone" => action["timezone"] || DateTimeChange.timezone(),
      "date" => action["date"],
      "exact_time" => action["exact_time"],
      "time_window" => action["time_window"],
      "base_plan_version" => action["base_plan_version"],
      "current" => get_in(state, ["exact_time", "value"]),
      "current_date" => get_in(state, ["date", "value"]),
      "proposed_by_user_id" => action["actor_user_id"],
      "truth" => "proposed",
      "explicit" => true
    }

    state
    |> Map.put("proposal_history", history)
    |> put_change_proposal(proposal)
  end

  defp apply_action(
         state,
         %{"kind" => "change_propose", "field" => "datetime", "value" => value} = action
       )
       when is_binary(value) do
    context = %{
      "exact_time" => get_in(state, ["exact_time", "value"]),
      "date" => get_in(state, ["date", "value"]),
      "reference_on" => "2026-09-27"
    }

    case DateTimeChange.interpret(value, context, scoped: true) do
      {:change, change} ->
        if DateTimeChange.confirmation_required?(state) do
          put_change_proposal(state, datetime_proposal(state, change, action["actor_user_id"]))
        else
          apply_datetime_change(state, change, nil, action["actor_user_id"])
        end

      {:clarify, prompt} ->
        Map.put(state, "clarify", prompt)

      :keep ->
        Map.delete(state, "change_proposal")

      :none ->
        Map.put(state, "clarify", "Say a day, a time, or both.")
    end
  end

  defp apply_action(
         state,
         %{"kind" => "change_propose", "field" => field, "value" => value} = action
       )
       when is_binary(field) and is_binary(value) do
    put_change_proposal(state, field, value, action["actor_user_id"])
  end

  defp apply_action(state, %{"kind" => "delegate_datetime", "actor_user_id" => holder})
       when is_binary(holder) do
    Map.put(state, "decision_rights", %{
      "datetime" => %{
        "mode" => "delegated",
        "holder_user_id" => holder,
        "scope" => "this_plan",
        "explicit" => true
      }
    })
  end

  defp apply_action(state, %{"kind" => "change_keep"}) do
    Map.delete(state, "change_proposal")
  end

  defp apply_action(state, %{"kind" => "change_accept"} = action) do
    proposal = state["change_proposal"]
    actor = action["actor_user_id"]

    cond do
      not is_map(proposal) ->
        state

      proposal["status"] == "superseded" ->
        state

      is_binary(action["proposal_id"]) and action["proposal_id"] != proposal["proposal_id"] ->
        state

      is_integer(proposal["base_plan_version"]) and
          proposal["base_plan_version"] != (state["plan_version"] || 0) ->
        put_change_proposal(state, Map.put(proposal, "status", "stale"))

      proposal["proposed_by_user_id"] == actor ->
        state

      true ->
        state
        |> apply_accepted_change(proposal, actor)
        |> Map.delete("change_proposal")
        |> Map.update("plan_version", 1, &(&1 + 1))
    end
  end

  defp apply_action(state, %{"kind" => "exact_time_lock", "value" => value} = action)
       when is_binary(value) do
    previous = get_in(state, ["exact_time", "value"])

    next =
      put_field(state, "exact_time", "locked", value, nil, %{
        "explicit" => true,
        "truth" => "locked",
        "needs_confirm" => false,
        "actor_user_id" => action["actor_user_id"]
      })

    if previous in [nil, value], do: next, else: clear_execution(next)
  end

  defp apply_action(state, %{"kind" => "activity_lock", "value" => value} = action)
       when is_binary(value) do
    case ActivityIntent.compile_freeform(value) do
      nil ->
        state

      intent ->
        label = intent["normalized_label"]
        previous_state = field_state(state, "activity")
        previous_value = get_in(state, ["activity", "value"])

        next =
          put_field(state, "activity", "locked", label, nil, %{
            "explicit" => true,
            "truth" => "user_stated",
            "actor_user_id" => action["actor_user_id"],
            "category" => intent["category"],
            "subtype" => intent["subtype"],
            "scope" => intent["scope"],
            "execution_type" => intent["execution_type"],
            "raw_text" => intent["raw_text"]
          })

        if previous_state == "locked" and previous_value != label do
          next |> clear_place() |> clear_execution()
        else
          next
        end
    end
  end

  # Repair #15 (Track G) — a place_propose action is an explicit structured
  # action, not free text to re-mine: its value IS the proposed name (same
  # trust the fold gives exact_time_lock / activity_lock values). Writers
  # are nominate_place/3 (pipeline-validated), the restore script, and
  # in-plan replays. Replay therefore trusts a plausible name verbatim and
  # normalizes only when the value is a catalog mention.
  defp apply_action(state, %{"kind" => "place_propose", "value" => value} = action)
       when is_binary(value) do
    case place_name_from_value(value) do
      nil ->
        state

      name ->
        if field_state(state, "place") == "locked" do
          state
        else
          propose_place(state, name, nil, action["actor_user_id"])
        end
    end
  end

  defp apply_action(state, %{"kind" => "place_confirm", "actor_user_id" => actor})
       when is_binary(actor) do
    proposed_by = get_in(state, ["place", "proposed_by_user_id"])
    value = get_in(state, ["place", "value"])

    if field_state(state, "place") == "candidate" and is_binary(value) and actor != proposed_by do
      lock_place(state, value, nil, actor, "confirmed")
    else
      state
    end
  end

  defp apply_action(state, %{"kind" => "place_decline"}) do
    if field_state(state, "place") in ["candidate", "conflicted"],
      do: clear_place(state),
      else: state
  end

  defp apply_action(state, %{"kind" => "place_reopen"}) do
    if field_state(state, "place") == "locked" do
      state |> clear_place() |> clear_execution()
    else
      state
    end
  end

  # Repair #15 (Track G) — place_lock is the restore/lock action: its value
  # was locked once already (or synthesized from a locked stored place), so
  # replay restores it verbatim for any plausible name. A locked place must
  # stay locked because it was confirmed, not because its name is catalogued.
  defp apply_action(state, %{"kind" => "place_lock", "value" => value} = action)
       when is_binary(value) do
    case place_name_from_value(value) do
      nil -> state
      name -> lock_place(state, name, nil, action["actor_user_id"], "restored")
    end
  end

  defp apply_action(state, %{"kind" => "reservation_authorize", "actor_user_id" => actor})
       when is_binary(actor) do
    if field_state(state, "place") == "locked" do
      authorize(state, actor)
    else
      state
    end
  end

  defp apply_action(state, %{"kind" => "voice_utterance", "normalized" => text} = action)
       when is_binary(text) do
    next =
      apply_message(state, %{
        "body" => text,
        "sender_user_id" => action["actor_user_id"],
        "id" => action["source_segment_id"]
      })

    case next["change_proposal"] do
      proposal when is_map(proposal) ->
        Map.put(
          next,
          "change_proposal",
          Map.merge(proposal, %{
            "source_type" => "call_transcript",
            "source_call_id" => action["source_call_id"],
            "source_segment_id" => action["source_segment_id"],
            "speaker_user_id" => action["actor_user_id"],
            "confidence" => action["confidence"]
          })
        )

      _ ->
        next
    end
  end

  # F12-02c (gyroscope) — schedule authority projection.
  #
  # change_plan_schedule/1 and the revision-accept path append a
  # "schedule_change" explicit action carrying the accepted revision id. The
  # fold replays it chronologically like any other explicit action, so folded
  # state — and upsert_plan's label recompute — converges on the
  # revision-applied value instead of reverting to older fragments on the next
  # chat message. Later explicit schedule actions (chat locks, newer direct
  # edits) supersede by timestamp order.
  defp apply_action(
         state,
         %{"kind" => "schedule_change", "field" => "time_label", "value" => value} = action
       )
       when is_binary(value) do
    state
    |> put_field("exact_time", "locked", value, action["revision_id"], %{
      "explicit" => true,
      "truth" => "locked",
      "needs_confirm" => false,
      "schedule_change_revision_id" => action["revision_id"]
    })
    |> Map.update("plan_version", 1, &(&1 + 1))
    # Repair #18 residuals (R-2d): an accepted revision SETTLES the
    # historical proposal it recorded - permanently. Actions replay
    # chronologically, so a change_proposal present at this point
    # predates the acceptance; if it names the accepted change (same
    # clock, or no parseable clock of its own), it is retired here.
    # Without this, a re-fold after any later message re-derived the
    # already-accepted proposal from the original propose message
    # and the alignment resurrected a pending change that no longer
    # existed. A genuinely newer proposal is created by a later
    # message, after this action replays, and survives.
    |> settle_proposal_for_accepted_change(value)
  end

  defp apply_action(
         state,
         %{"kind" => "schedule_change", "field" => "date_label", "value" => value} = action
       )
       when is_binary(value) do
    state
    |> put_field("date", "locked", value, action["revision_id"], %{
      "explicit" => true,
      "truth" => "locked",
      "schedule_change_revision_id" => action["revision_id"]
    })
    |> Map.update("plan_version", 1, &(&1 + 1))
  end

  defp apply_action(state, _action), do: state

  defp settle_proposal_for_accepted_change(state, accepted_value) do
    proposal = state["change_proposal"]
    accepted_clock = OpalCore.SocialFlow.PlanIdentity.parse_clock(accepted_value || "")

    cond do
      not is_map(proposal) ->
        state

      is_nil(accepted_clock) ->
        state

      true ->
        case proposal_clock(proposal) do
          nil -> Map.delete(state, "change_proposal")
          clock when clock == accepted_clock -> Map.delete(state, "change_proposal")
          _ -> state
        end
    end
  end

  defp propose_place(state, name, source, actor) do
    current = state["place"] || %{}
    other? = other_proposer?(current, actor)

    cond do
      current["state"] == "conflicted" ->
        converge_conflict(state, name, source, actor)

      current["state"] == "candidate" and current["value"] == name and other? ->
        lock_place(state, name, source, actor, "both_selected")

      current["state"] == "candidate" and is_binary(current["value"]) and current["value"] != name and
          other? ->
        conflict_place(state, current, name, source, actor)

      true ->
        put_field(state, "place", "candidate", name, source, %{
          "needs_confirm" => true,
          "explicit" => true,
          "truth" => "proposed",
          "proposed_by_user_id" => actor,
          "actor_user_id" => actor,
          "proposals" => [%{"actor_user_id" => actor, "value" => name, "truth" => "proposed"}]
        })
    end
  end

  defp other_proposer?(current, actor) do
    is_binary(actor) and is_binary(current["proposed_by_user_id"]) and
      actor != current["proposed_by_user_id"]
  end

  defp conflict_place(state, current, name, source, actor) do
    proposals = [
      %{
        "actor_user_id" => current["proposed_by_user_id"],
        "value" => current["value"],
        "truth" => "proposed"
      },
      %{"actor_user_id" => actor, "value" => name, "truth" => "proposed"}
    ]

    put_field(state, "place", "conflicted", nil, source, %{
      "explicit" => true,
      "truth" => "proposed",
      "needs_confirm" => false,
      "proposals" => proposals,
      "proposed_by_user_id" => nil,
      "actor_user_id" => actor
    })
  end

  defp converge_conflict(state, name, source, actor) do
    proposals = get_in(state, ["place", "proposals"]) || []
    others = Enum.reject(proposals, &(&1["actor_user_id"] == actor))
    own = Enum.find(proposals, &(&1["actor_user_id"] == actor))

    cond do
      Enum.any?(others, &(&1["value"] == name)) ->
        lock_place(state, name, source, actor, "converged")

      is_map(own) and own["value"] == name ->
        state

      is_binary(actor) ->
        updated =
          proposals
          |> Enum.reject(&(&1["actor_user_id"] == actor))
          |> Kernel.++([%{"actor_user_id" => actor, "value" => name, "truth" => "proposed"}])

        case updated |> Enum.map(& &1["value"]) |> Enum.uniq() do
          [only] ->
            lock_place(state, only, source, actor, "converged")

          _ ->
            put_field(state, "place", "conflicted", nil, source, %{
              "explicit" => true,
              "truth" => "proposed",
              "needs_confirm" => false,
              "proposals" => updated,
              "proposed_by_user_id" => nil,
              "actor_user_id" => actor
            })
        end

      true ->
        state
    end
  end

  defp lock_place(state, name, source, actor, how) do
    proposals = get_in(state, ["place", "proposals"]) || []
    origin = Enum.find(proposals, &(&1["value"] == name))

    proposed_by =
      (origin && origin["actor_user_id"]) || get_in(state, ["place", "proposed_by_user_id"]) ||
        actor

    put_field(state, "place", "locked", name, source, %{
      "explicit" => true,
      "truth" => "locked",
      "needs_confirm" => false,
      "proposed_by_user_id" => proposed_by,
      "confirmed_by_user_id" => actor,
      "lock_reason" => how,
      "actor_user_id" => actor,
      "proposals" => proposals
    })
  end

  defp clear_place(state) do
    put_field(state, "place", "unknown", nil, nil, %{"explicit" => true, "truth" => nil})
  end

  defp clear_execution(state) do
    put_field(state, "execution", "unknown", nil, nil, %{
      "explicit" => true,
      "truth" => nil,
      "executed" => false,
      "authorized_by" => []
    })
  end

  defp authorize(state, actor) do
    current = state["execution"] || %{}
    authorized = Enum.uniq(List.wrap(current["authorized_by"]) ++ [actor])
    members = get_in(state, ["participants", "value"]) || []
    complete? = members != [] and Enum.all?(members, &(&1 in authorized))

    put_field(
      state,
      "execution",
      if(complete?, do: "agreed", else: "candidate"),
      "reservation_not_sent",
      nil,
      %{
        "explicit" => true,
        "truth" => if(complete?, do: "agreed", else: "proposed"),
        "authorized_by" => authorized,
        "needs_confirm" => not complete?,
        "executed" => false
      }
    )
  end

  defp present(state) do
    state = blank_ui(state)
    date = state["date"] || %{}
    exact = state["exact_time"] || %{}
    place = state["place"] || %{}
    activity = get_in(state, ["activity", "value"])
    date_label = if date["value"] == "tomorrow", do: "tomorrow", else: date["value"]

    done =
      cond do
        not is_binary(exact["value"]) ->
          nil

        is_binary(date_label) ->
          "#{String.capitalize(date_label)} at #{exact["value"]} is set ✓"

        true ->
          "#{exact["value"]} is set ✓"
      end

    cond do
      exact["state"] == "candidate" and exact["needs_confirm"] == true and
          is_binary(exact["value"]) ->
        when_label =
          [date_label, "at", exact["value"]] |> Enum.reject(&is_nil/1) |> Enum.join(" ")

        held =
          if place["state"] == "locked" and is_binary(place["value"]),
            do: "#{place["value"]} stays set",
            else: nil

        state
        |> Map.put("prompt", "Confirm #{when_label}?")
        |> Map.put("confirmable", true)
        |> Map.put("completion", held)
        |> Map.put("next", "exact_time")

      exact["state"] == "locked" and place["state"] == "conflicted" ->
        options =
          (place["proposals"] || [])
          |> Enum.map(fn proposal ->
            %{"name" => proposal["value"], "proposed_by_user_id" => proposal["actor_user_id"]}
          end)

        state
        |> Map.put("completion", done)
        |> Map.put("prompt", "You picked different places.")
        |> Map.put("next", "place")
        |> Map.put("place_conflicted", true)
        |> Map.put("conflict_options", options)

      exact["state"] == "locked" and place["state"] == "candidate" and is_binary(place["value"]) ->
        state
        |> Map.put("completion", done)
        |> Map.put("prompt", "#{place["value"]}?")
        |> Map.put("next", "place")
        |> Map.put("place_confirmable", true)
        |> Map.put("proposed_by_user_id", place["proposed_by_user_id"])

      exact["state"] == "locked" and place["state"] == "locked" and is_binary(place["value"]) ->
        place_done =
          if is_binary(date_label),
            do:
              "#{String.capitalize(date_label)} at #{exact["value"]} · #{place["value"]} is set ✓",
            else: "#{exact["value"]} · #{place["value"]} is set ✓"

        execution_state = field_state(state, "execution")

        lines =
          [date_label && String.capitalize(date_label), exact["value"], place["value"]]
          |> Enum.reject(&is_nil/1)

        {commitment, prompt, detail} =
          case execution_state do
            "agreed" ->
              {"execution_ready", "Reservation approved", "Booking hasn't been placed yet."}

            "candidate" ->
              {"aligned", "Waiting on one response.", "Reservation isn't booked."}

            _ ->
              # Plan agreement ≠ execution authorization — keep copy layers distinct.
              {"aligned", "Plan set ✓", "Reservation still needs approval before booking."}
          end

        state
        |> Map.put("completion", place_done)
        |> Map.put("plan_lines", lines)
        |> Map.put("commitment", commitment)
        |> Map.put("change_quiet", true)
        |> Map.put("prompt", prompt)
        |> Map.put("detail", detail)
        |> Map.put("next", "execution")
        |> Map.put("place_changeable", false)
        |> Map.put("reservation_authorizable", execution_state != "agreed")
        |> Map.put("proposed_by_user_id", place["proposed_by_user_id"])

      exact["state"] == "locked" and place["state"] in [nil, "unknown"] and
          CandidateProvider.recommend(
            activity || "",
            get_in(state, ["participants", "value"]) || [],
            state,
            %{}
          ) !=
            [] ->
        candidates =
          CandidateProvider.recommend(
            activity || "",
            get_in(state, ["participants", "value"]) || [],
            state,
            %{}
          )

        state
        |> Map.put("completion", done)
        |> Map.put(
          "prompt",
          "Shared catalog options. Curated list only. No live travel, availability, or trend."
        )
        |> Map.put("next", "place")
        |> Map.put("activity_changeable", field_state(state, "activity") == "locked")
        |> Map.put("candidates", candidates)

      exact["state"] == "locked" and place["state"] in [nil, "unknown"] and
          field_state(state, "activity") == "locked" ->
        execution_type = get_in(state, ["activity", "execution_type"])
        label = get_in(state, ["activity", "value"]) || "This"

        prompt =
          if execution_type in ["reservation", nil] do
            "Name a place in the chat when you both know it."
          else
            "#{label}. Search connection not available yet."
          end

        state
        |> Map.put("completion", done)
        |> Map.put("prompt", prompt)
        |> Map.put("next", "place")

      exact["state"] == "locked" and place["state"] in [nil, "unknown"] ->
        state
        |> Map.put("completion", done)
        |> Map.put("prompt", "What kind of meetup?")
        |> Map.put("next", "activity")
        |> Map.put("activity_choices", [
          "Coffee",
          "Dinner",
          "Drinks",
          "Something active",
          "Somewhere quiet"
        ])

      true ->
        state
    end
    |> maybe_mark_activity_changeable()
    |> expire_stale_change_proposal()
    |> surface_change_proposal()
    |> apply_temporal_gates()
  end

  # Temporal lifecycle gates: past plans cannot authorize future reservation CTAs.
  defp apply_temporal_gates(state) when is_map(state) do
    arb = PlanStateArbitration.evaluate(state)
    past? = arb["temporal_state"] == "past"
    actionable? = arb["future_execution_actionable"] == true

    state
    |> Map.put("temporal_state", arb["temporal_state"])
    |> Map.put("canonical_start_at", arb["canonical_start_at"])
    |> Map.put("next_together_eligible", arb["next_together_eligible"])
    |> Map.put("upcoming_ready", arb["upcoming_ready"])
    |> Map.put("future_execution_actionable", actionable?)
    |> Map.put("plan_alignment_state", arb["plan_alignment_state"])
    |> Map.put("dominant_hints", arb["dominant_hints"])
    |> then(fn s ->
      cond do
        past? ->
          s
          |> Map.put("reservation_authorizable", false)
          |> Map.put("detail", nil)
          |> Map.put(
            "prompt",
            cond do
              is_binary(s["completion"]) -> nil
              is_binary(s["prompt"]) -> "Plan set ✓"
              true -> s["prompt"]
            end
          )

        not actionable? ->
          Map.put(s, "reservation_authorizable", false)

        true ->
          s
      end
    end)
  end

  defp apply_temporal_gates(state), do: state

  defp surface_change_proposal(state) do
    case state["change_proposal"] do
      %{"field" => "place", "value" => "reopen"} = proposal ->
        current = get_in(state, ["place", "value"]) || "The current place"

        state
        |> Map.put("prompt", "Suggested choosing a different place.")
        |> Map.put("detail", "#{current} stays until this is accepted or kept.")
        |> Map.put("change_proposal", proposal)

      %{"value" => value} = proposal when is_binary(value) ->
        state
        |> Map.put("prompt", "Suggested #{value} instead.")
        |> Map.put("detail", "The current plan stays until this is accepted or kept.")
        |> Map.put("change_proposal", proposal)

      _ ->
        if is_binary(state["clarify"]) do
          Map.put(state, "prompt", state["clarify"])
        else
          state
        end
    end
  end

  defp put_change_proposal(state, proposal) when is_map(proposal) do
    # F12-58 — proposals created without an expiry still die on their own.
    proposal =
      if is_binary(proposal["expires_at"]) do
        proposal
      else
        Map.put(proposal, "expires_at", proposal_expires_at())
      end

    # W4-01: an explicit proposal supersedes an outstanding intent ASK.
    state
    |> clear_intent_ask()
    |> Map.put("change_proposal", proposal)
  end

  defp put_change_proposal(state, field, value, actor) do
    # W4-01: an explicit proposal supersedes an outstanding intent ASK.
    state
    |> clear_intent_ask()
    |> Map.put("change_proposal", %{
      "field" => field,
      "value" => value,
      "current" => get_in(state, [field, "value"]),
      "proposed_by_user_id" => actor,
      "truth" => "proposed",
      "explicit" => true,
      "expires_at" => proposal_expires_at()
    })
  end

  # F12-58 — ISO8601 expiry stamp for a fresh change proposal.
  defp proposal_expires_at do
    DateTime.utc_now()
    |> DateTime.add(@change_proposal_ttl_seconds, :second)
    |> DateTime.truncate(:second)
    |> DateTime.to_iso8601()
  end

  # F12-58 — sweep: a change proposal past its expires_at is retired to
  # proposal_history with status "expired" and removed from the live slot, so
  # no surface can sit at "Waiting on one response." forever. Runs at fold
  # presentation time — the invariant layer, not per-surface.
  @doc """
  Retire a past-due `change_proposal` to `proposal_history` (status "expired").
  Public for regression testing; called from the fold's present pipeline.
  """
  def expire_stale_change_proposal(state) when is_map(state) do
    case state["change_proposal"] do
      %{"expires_at" => expires_at} = proposal when is_binary(expires_at) ->
        case DateTime.from_iso8601(expires_at) do
          {:ok, expiry, _} ->
            if DateTime.compare(expiry, DateTime.utc_now()) == :lt do
              history = state["proposal_history"] || []

              state
              |> Map.put(
                "proposal_history",
                history ++ [Map.put(proposal, "status", "expired")]
              )
              |> Map.delete("change_proposal")
            else
              state
            end

          _ ->
            state
        end

      _ ->
        state
    end
  end

  def expire_stale_change_proposal(state), do: state

  defp apply_accepted_change(state, %{"field" => "datetime"} = proposal, _accepter) do
    state
    |> put_parsed_date(proposal, nil)
    |> put_parsed_time(proposal, nil)
    |> put_parsed_window(proposal, nil)
    |> clear_execution()
  end

  defp apply_accepted_change(state, %{"field" => "exact_time", "value" => value}, _accepter)
       when is_binary(value) do
    state
    |> put_field("exact_time", "locked", value, nil, %{
      "explicit" => true,
      "truth" => "locked",
      "needs_confirm" => false
    })
    |> clear_execution()
  end

  defp apply_accepted_change(
         state,
         %{"field" => "activity", "value" => value} = proposal,
         _accepter
       )
       when is_binary(value) do
    state
    |> apply_action(%{
      "kind" => "activity_lock",
      "value" => value,
      "actor_user_id" => proposal["proposed_by_user_id"]
    })
    |> clear_execution()
  end

  defp apply_accepted_change(state, %{"field" => "place", "value" => "reopen"}, _accepter) do
    state |> clear_place() |> clear_execution()
  end

  defp apply_accepted_change(
         state,
         %{"field" => "place", "value" => value, "proposed_by_user_id" => proposer},
         accepter
       )
       when is_binary(value) do
    name = CandidateProvider.catalog_match(value) || value

    state
    |> clear_place()
    |> clear_execution()
    |> propose_place(name, nil, proposer)
    |> lock_place(name, nil, accepter, "change_accepted")
  end

  defp apply_accepted_change(state, _proposal, _accepter), do: state

  defp maybe_mark_activity_changeable(state) do
    if field_state(state, "activity") == "locked" do
      Map.put(state, "activity_changeable", true)
    else
      state
    end
  end

  defp blank_ui(state) do
    Map.merge(state, %{
      "prompt" => nil,
      "completion" => nil,
      "next" => nil,
      "confirmable" => false,
      "activity_choices" => nil,
      "candidates" => nil,
      "place_confirmable" => false,
      "place_conflicted" => false,
      "conflict_options" => nil,
      "place_changeable" => false,
      "activity_changeable" => false,
      "reservation_authorizable" => false,
      "change_quiet" => false,
      "plan_lines" => nil,
      "detail" => nil,
      "commitment" => nil,
      "proposed_by_user_id" => get_in(state, ["place", "proposed_by_user_id"])
    })
  end

  defp actions_from_plan(nil), do: []

  defp actions_from_plan(%SharedPlan{} = plan) do
    alignment = plan.alignment || %{}
    stored = Map.get(alignment, "explicit_actions") || []

    if stored == [] do
      synthesize_locked_actions(alignment, plan)
    else
      stored
    end
  end

  defp synthesize_locked_actions(alignment, plan) do
    at = plan.updated_at || plan.inserted_at
    iso = if match?(%DateTime{}, at), do: DateTime.to_iso8601(at), else: nil
    actor = plan.created_by_user_id

    []
    |> maybe_synth_lock(alignment, "exact_time", "exact_time_lock", iso, actor)
    |> maybe_synth_activity(alignment, iso, actor)
    |> maybe_synth_place(alignment, iso, actor)
  end

  defp maybe_synth_lock(actions, alignment, field, kind, iso, actor) do
    current = alignment[field] || %{}

    if current["state"] == "locked" and is_binary(current["value"]) do
      actions ++ [synth_action(kind, actor, current["value"], "locked", iso)]
    else
      actions
    end
  end

  defp maybe_synth_activity(actions, alignment, iso, actor) do
    current = alignment["activity"] || %{}
    value = current["value"]

    if current["state"] == "locked" and is_binary(value) and String.downcase(value) in @activities do
      actions ++
        [synth_action("activity_lock", actor, String.downcase(value), "user_stated", iso)]
    else
      actions
    end
  end

  # Repair #15 (Track G) — restore synthesis trusts the stored state: a
  # place that was locked when stored is re-locked on replay whatever its
  # name. Previously a locked non-catalog place (e.g. a coffee candidate or
  # a Center-resolved venue) silently lost its place on resync.
  defp maybe_synth_place(actions, alignment, iso, actor) do
    current = alignment["place"] || %{}

    if current["state"] == "locked" and is_binary(current["value"]) and
         String.trim(current["value"]) != "" do
      actions ++ [synth_action("place_lock", actor, current["value"], "locked", iso)]
    else
      actions
    end
  end

  defp synth_action(kind, actor, value, truth, iso) do
    %{
      "kind" => kind,
      "actor_user_id" => actor,
      "value" => value,
      "truth" => truth,
      "explicit" => true,
      "schema_version" => @schema_version,
      "at" => iso
    }
  end

  defp append_action(conversation_id, action_map) do
    Repo.transaction(fn ->
      case lock_plan(conversation_id) do
        nil ->
          Repo.rollback(:no_plan)

        %SharedPlan{} = plan ->
          alignment = plan.alignment || %{}
          actions = Map.get(alignment, "explicit_actions") || []

          if duplicate_action?(List.last(actions), action_map) do
            :ok
          else
            updated = Map.put(alignment, "explicit_actions", actions ++ [action_map])

            case plan |> SharedPlan.changeset(%{alignment: updated}) |> Repo.update() do
              {:ok, saved} ->
                case record_alignment_event(saved, action_map) do
                  :ok -> :ok
                  {:error, reason} -> Repo.rollback(reason)
                end

              {:error, _} ->
                Repo.rollback(:persist_failed)
            end
          end
      end
    end)
    |> case do
      {:ok, :ok} -> :ok
      {:error, reason} -> {:error, reason}
    end
  end

  defp duplicate_action?(
         %{"kind" => kind, "actor_user_id" => actor, "value" => value},
         %{"kind" => kind, "actor_user_id" => actor, "value" => value}
       ),
       do: true

  defp duplicate_action?(_, _), do: false

  defp record_alignment_event(%SharedPlan{} = plan, action_map) do
    case alignment_event_type(plan, action_map) do
      nil ->
        :ok

      event_type ->
        case Publisher.record(%{
               event_type: event_type,
               aggregate_type: "shared_plan",
               aggregate_id: plan.id,
               partition_key: plan.conversation_id,
               actor_user_id: action_map["actor_user_id"],
               conversation_id: plan.conversation_id,
               plan_id: plan.id,
               source_type: "alignment_action",
               source_id: action_map["kind"],
               privacy_class: "shared_authorized",
               privacy_scope: "shared",
               consent_scope: "participants",
               relationship_scope: plan.conversation_id,
               purpose: "alignment",
               payload: %{
                 "conversation_id" => plan.conversation_id,
                 "plan_id" => plan.id,
                 "actor_user_id" => action_map["actor_user_id"],
                 "kind" => action_map["kind"],
                 "value" => action_map["value"]
               }
             }) do
          {:ok, _} -> :ok
          {:error, reason} -> {:error, reason}
        end
    end
  end

  defp alignment_event_type(plan, %{"kind" => "activity_lock", "value" => value} = action) do
    previous = get_in(plan.alignment || %{}, ["activity", "value"])
    previous_state = get_in(plan.alignment || %{}, ["activity", "state"])
    normalized = value |> to_string() |> String.downcase()

    if previous_state == "locked" and is_binary(previous) and
         String.downcase(previous) != normalized and
         action["actor_user_id"] do
      "alignment.activity_changed"
    else
      "alignment.activity_selected"
    end
  end

  defp alignment_event_type(plan, %{
         "kind" => "place_propose",
         "value" => value,
         "actor_user_id" => actor
       }) do
    place = get_in(plan.alignment || %{}, ["place"]) || %{}

    if place["state"] in ["candidate", "conflicted"] and place["value"] not in [nil, value] and
         place["proposed_by_user_id"] not in [nil, actor] do
      "alignment.place_conflicted"
    else
      "alignment.place_nominated"
    end
  end

  defp alignment_event_type(_plan, %{"kind" => "place_confirm"}), do: "alignment.place_confirmed"
  defp alignment_event_type(_plan, %{"kind" => "place_reopen"}), do: "alignment.place_changed"
  defp alignment_event_type(_plan, %{"kind" => "place_decline"}), do: "alignment.place_changed"

  defp alignment_event_type(_plan, %{"kind" => "reservation_authorize"}),
    do: "execution.reservation_authorized"

  defp alignment_event_type(_plan, %{"kind" => "exact_time_lock"}), do: "alignment.time_locked"
  defp alignment_event_type(_plan, %{"kind" => "change_propose"}), do: "alignment.change_proposed"
  defp alignment_event_type(_plan, %{"kind" => "change_accept"}), do: "alignment.change_accepted"
  defp alignment_event_type(_plan, %{"kind" => "change_keep"}), do: "alignment.change_rejected"
  defp alignment_event_type(_plan, _action), do: nil

  defp action(kind, actor, value, truth) do
    %{
      "kind" => kind,
      "actor_user_id" => actor,
      "value" => value,
      "truth" => truth,
      "explicit" => true,
      "schema_version" => @schema_version,
      "at" => DateTime.utc_now() |> DateTime.truncate(:microsecond) |> DateTime.to_iso8601()
    }
  end

  # One open lineage per conversation. A later unrelated intent needs a new
  # SharedPlan row. This fold must not be reused as a second plan.
  defp lineage_id(conversation_id) do
    case active_plan_for_conversation(conversation_id) do
      %SharedPlan{id: id} -> id
      _ -> conversation_id
    end
  end

  defp upsert_plan(conversation_id, state, member_ids, initiator_id \\ nil)
       when is_list(member_ids) do
    # Repair #18: the creator is the deterministic initiator when the
    # caller can name one (earliest speaking member); the member-list
    # head is only the fallback when no member has spoken yet.
    user_id = initiator_id || List.first(member_ids)
    exact = state["exact_time"] || %{}
    date = state["date"] || %{}
    status = if exact["state"] == "locked", do: "agreed", else: "tentative"

    folded_time_label =
      [date["value"], exact["value"] || get_in(state, ["time_window", "value"])]
      |> Enum.reject(&is_nil/1)
      |> Enum.join(" ")

    folded_time_label = if folded_time_label == "", do: nil, else: folded_time_label

    attrs = %{
      conversation_id: conversation_id,
      status: status,
      timezone: "America/Los_Angeles",
      time_label: folded_time_label,
      created_by_user_id: user_id,
      alignment: Map.put(state, "lineage_id", lineage_id(conversation_id))
    }

    # B1 (A8, fold-born virtual - built LAST per the design's risk
    # order): the fold can birth a virtual plan when its state carries
    # the place type explicitly or locks the Online place marker. The
    # row column and the alignment mirror are stamped together here,
    # through the one stamp helper.
    fold_plan_type =
      cond do
        state["plan_type"] in ["virtual", "in_person"] -> state["plan_type"]
        get_in(state, ["place", "value"]) == "Online" -> "virtual"
        true -> nil
      end

    attrs =
      if fold_plan_type == "virtual" do
        link = OpalCore.SocialFlow.MeetingLinks.sanitize(state["meeting_link"])

        attrs
        |> Map.put(:plan_type, "virtual")
        |> Map.put(:meeting_link, link)
        |> Map.put(:location, "Online")
        |> Map.update(:alignment, %{}, fn alignment ->
          OpalCore.SocialFlow.stamp_place_mirror(alignment, %{
            "plan_type" => "virtual",
            "meeting_link" => link,
            "meeting_provider" => state["meeting_provider"]
          })
        end)
      else
        attrs
      end

    case active_plan_for_conversation(conversation_id) do
      nil when is_binary(user_id) ->
        # Insert: the fold owns the new row.
        # Gyroscope (R13): the fold births via the gate — a locked fold
        # births agreed, an unlocked fold births tentative.
        # Repair #18: no bare "Meetup" placeholder - the title is a
        # descriptive fallback from the folded place/activity/people,
        # the row carries real PlanParticipant rows (initiator is lead),
        # and the dedupe identity is stamped at birth like every other
        # creation path.
        create_action = if status == "agreed", do: :create_agreed, else: :create

        attrs =
          attrs
          |> Map.put(:title, fold_plan_title(state, user_id))
          |> Map.update(:alignment, state, fn alignment ->
            components =
              OpalCore.SocialFlow.PlanIdentity.components(
                user_id,
                member_ids,
                %{
                  "title" => fold_plan_title(state, user_id),
                  "location" => get_in(state, ["place", "value"]),
                  "time_label" => folded_time_label
                }
              )

            Map.put(
              alignment,
              "dedupe",
              Map.put(components, "key", OpalCore.SocialFlow.PlanIdentity.dedupe_key(components))
            )
          end)

        case %SharedPlan{}
             |> SharedPlan.changeset(attrs)
             |> PlanTransition.guard_changeset(:plan, create_action)
             |> Repo.insert() do
          {:ok, plan} = ok ->
            # Repair #18 (Division A): a fold-born plan gets participant
            # ROWS for every conversation member - before this, the fold
            # wrote only the alignment JSON participant list, so the one
            # counter had nothing to count for fold-born plans (walk DB:
            # the Saturday Crew plan had 0 participant rows).
            _ = ensure_fold_participants(plan, member_ids, user_id)
            ok

          other ->
            other
        end

      %SharedPlan{} = plan ->
        prev_version = get_in(plan.alignment || %{}, ["plan_version"]) || 0
        new_version = state["plan_version"] || 0

        # F12-02c (gyroscope): the update branch must never clobber
        # row-owned authority. The title belongs to the plan-creation path
        # (stamping "Meetup" here renamed real plans on every sync); the
        # schedule belongs to the revision chain (see schedule_authority_label).
        update_attrs =
          attrs
          |> Map.put(:time_label, schedule_authority_label(plan, state, folded_time_label))
          # B1: place type is row-owned authority too (the conversion
          # writer owns it). A fold sync must never revert a
          # conversion: when the fold state carries no explicit
          # place_type_change action for a DIFFERENT type, the row's
          # type wins and the mirror is re-stamped from the row.
          |> then(fn update_attrs ->
            explicit_convert? =
              Enum.any?(state["explicit_actions"] || [], fn a ->
                is_map(a) and a["kind"] == "place_type_change" and
                  a["value"] == state["plan_type"]
              end)

            if fold_plan_type in ["virtual", "in_person"] and
                 (fold_plan_type == plan.plan_type or explicit_convert?) do
              link =
                OpalCore.SocialFlow.MeetingLinks.sanitize(
                  state["meeting_link"] || plan.meeting_link
                )

              update_attrs
              |> Map.put(:plan_type, fold_plan_type)
              |> Map.put(:meeting_link, link)
              |> Map.update(:alignment, %{}, fn alignment ->
                OpalCore.SocialFlow.stamp_place_mirror(alignment, %{
                  "plan_type" => fold_plan_type,
                  "meeting_link" => link,
                  "meeting_provider" => state["meeting_provider"] || plan.meeting_provider
                })
              end)
            else
              update_attrs
              |> Map.delete(:plan_type)
              |> Map.delete(:meeting_link)
              |> Map.delete(:location)
              |> Map.update(:alignment, %{}, fn alignment ->
                alignment
                |> Map.put("plan_type", plan.plan_type)
                |> then(fn a ->
                  if plan.plan_type == "virtual" do
                    link = OpalCore.SocialFlow.MeetingLinks.sanitize(plan.meeting_link)

                    a
                    |> then(fn a2 ->
                      if link, do: Map.put(a2, "meeting_link", link), else: Map.delete(a2, "meeting_link")
                    end)
                    |> then(fn a2 ->
                      if plan.meeting_provider,
                        do: Map.put(a2, "meeting_provider", plan.meeting_provider),
                        else: a2
                    end)
                  else
                    a
                    |> Map.delete("meeting_link")
                    |> Map.delete("meeting_provider")
                  end
                end)
              end)
            end
          end)

        case plan |> SharedPlan.changeset(update_attrs) |> Repo.update() do
          {:ok, updated} = ok ->
            maybe_invalidate_stale_tft(updated.id, prev_version, new_version)
            # Repair #18: members who joined the conversation after the
            # plan was born get a row too; existing rows are never touched
            # (their response state is row-owned authority, like the title).
            _ = ensure_fold_participants(updated, member_ids, user_id)
            ok

          other ->
            other
        end

      _ ->
        {:error, :no_owner}
    end
  end

  # Repair #18 (Division A): participant materialization for fold-born
  # plans. Same door semantics as create_tentative_plan_from_conversation:
  # the creating member (first member, the fold's created_by) is the lead
  # and accepted; every other member starts pending in the canonical
  # vocabulary. Existing rows win - a sync never rewrites an RSVP.
  defp ensure_fold_participants(%SharedPlan{} = plan, member_ids, creator_user_id)
       when is_list(member_ids) do
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    for uid <- Enum.uniq(member_ids), is_binary(uid) do
      case Repo.get_by(PlanParticipant, plan_id: plan.id, user_id: uid) do
        %PlanParticipant{} ->
          :ok

        nil ->
          lead? = uid == creator_user_id

          %PlanParticipant{}
          |> PlanParticipant.changeset(%{
            plan_id: plan.id,
            user_id: uid,
            role: if(lead?, do: "lead", else: "participant"),
            response_state: if(lead?, do: "accepted", else: "pending"),
            responded_at: if(lead?, do: now, else: nil),
            authority_source: "alignment_fold"
          })
          |> Repo.insert()
      end
    end

    :ok
  end

  defp ensure_fold_participants(_, _, _), do: :ok

  # Descriptive fallback title for a fold-born plan: the folded place
  # when known, else the activity, else the other people's names -
  # never a bare placeholder and never a schedule fragment.
  defp fold_plan_title(state, owner_id) do
    place = get_in(state, ["place", "value"])
    activity = get_in(state, ["activity", "value"])

    others =
      (get_in(state, ["participants", "value"]) || [])
      |> Enum.filter(&(is_binary(&1) and &1 != owner_id))
      |> Enum.map(fn uid ->
        case Repo.get(OpalCore.Accounts.User, uid) do
          %OpalCore.Accounts.User{display_name: name} when is_binary(name) and name != "" ->
            name

          %OpalCore.Accounts.User{handle: handle} when is_binary(handle) and handle != "" ->
            handle

          _ ->
            nil
        end
      end)
      |> Enum.reject(&is_nil/1)

    cond do
      is_binary(place) and String.trim(place) != "" ->
        String.trim(place)

      is_binary(activity) and activity not in ["", "unknown"] ->
        OpalCore.SocialFlow.PlanIdentity.human_title(%{what: activity, who: others})

      true ->
        OpalCore.SocialFlow.PlanIdentity.human_title(%{who: others})
    end
  end

  # F12-02c — the revision chain is the schedule authority. A "schedule_change"
  # explicit action (appended by change_plan_schedule/1 and the revision-accept
  # path) carries the verbatim accepted value. When it is the newest
  # schedule-bearing explicit action, the fold keeps it verbatim instead of
  # recomputing the label from older fragments — a lead's direct edit is never
  # paraphrased or reverted. A newer chat-driven exact_time_lock (or a newer
  # schedule_change) supersedes by timestamp order.
  defp schedule_authority_label(%SharedPlan{}, state, folded_label) do
    actions = state["explicit_actions"] || []

    sched_changes =
      Enum.filter(actions, &(&1["kind"] == "schedule_change" and is_binary(&1["value"])))

    case List.last(sched_changes) do
      nil ->
        folded_label

      %{"value" => value, "at" => at} = latest ->
        if superseded_by_newer_schedule_action?(actions, latest, at) do
          folded_label
        else
          value
        end
    end
  end

  defp schedule_authority_label(_, _, folded_label), do: folded_label

  defp superseded_by_newer_schedule_action?(actions, latest, at) when is_binary(at) do
    Enum.any?(actions, fn a ->
      a != latest and a["kind"] in ["exact_time_lock", "schedule_change"] and
        is_binary(a["at"]) and a["at"] > at
    end)
  end

  defp superseded_by_newer_schedule_action?(_, _, _), do: false

  # STALE_BACKGROUND_JOB_MUTATES_CURRENT_STATE = 0 — supersede loops bound to the
  # prior plan_version so Oban TFT ticks cannot act on outdated temporal state.
  defp maybe_invalidate_stale_tft(plan_id, prev_version, new_version)
       when is_binary(plan_id) and is_integer(prev_version) and is_integer(new_version) and
              new_version > prev_version do
    _ =
      TemporalFollowThrough.invalidate_plan_version(
        plan_id,
        to_string(prev_version),
        "rescheduled"
      )

    :ok
  end

  defp maybe_invalidate_stale_tft(_, _, _), do: :ok

  defp propose_exact(state, value, id) do
    window = get_in(state, ["time_window", "value"])
    inside? = window == "after 6 PM" and value != "6:00 PM"

    state
    |> put_field("exact_time", if(inside?, do: "locked", else: "candidate"), value, id)
    |> put_in(["exact_time", "needs_confirm"], not inside?)
  end

  defp field(field_state, value, source) do
    %{
      "state" => field_state,
      "value" => value,
      "source_message_id" => source,
      "needs_confirm" => false,
      "explicit" => field_state == "locked",
      "truth" => truth_for(field_state),
      "schema_version" => @schema_version
    }
  end

  defp put_field(state, key, field_state, value, source, extras \\ %{}) do
    Map.put(
      state,
      key,
      Map.merge(
        %{
          "state" => field_state,
          "value" => value,
          "source_message_id" => source,
          "needs_confirm" => false,
          "explicit" => true,
          "truth" => truth_for(field_state),
          "schema_version" => @schema_version
        },
        extras
      )
    )
  end

  defp truth_for("locked"), do: "locked"
  defp truth_for("candidate"), do: "proposed"
  defp truth_for("constrained"), do: "user_stated"
  defp truth_for("agreed"), do: "agreed"
  defp truth_for(_), do: nil

  # Repair #15 (Track G) — place-name resolution for STRUCTURED values
  # (explicit action values, stored locked values). A catalog mention
  # normalizes to the catalog spelling (preserving the old partial-mention
  # behavior: "juniper" → "Juniper & Ivy"); any other plausible name is
  # taken verbatim — the value's authority is the explicit action / stored
  # locked state that carries it, not a name list. Implausible values
  # (blank, purely numeric/time-like, a bare activity or generic word)
  # resolve to nil so replay ignores them, as it ignored unknown names.
  defp place_name_from_value(value) when is_binary(value) do
    CandidateProvider.catalog_match(value) ||
      if(plausible_place_name?(String.trim(value)), do: String.trim(value))
  end

  defp place_name_from_value(_), do: nil

  @place_stoplist ~w(dinner lunch brunch breakfast coffee drinks drink drinks
                     food restaurant restaurants place places somewhere
                     something anywhere it that this there here tonight
                     tomorrow today reopen unknown)

  defp plausible_place_name?(name) when is_binary(name) do
    down = String.downcase(name)

    name != "" and String.length(name) <= 80 and Regex.match?(~r/[a-z]/, down) and
      down not in @place_stoplist and
      not Regex.match?(~r/\A\d{1,2}(:\d{2})?\s*(am|pm)?\z/, down)
  end

  defp plausible_place_name?(_), do: false

  # Repair #15 (Track G) — generic named-place extraction from chat, the
  # R14 extractor grammar applied to the alignment fold: a capitalized
  # phrase immediately after a proposal cue ("let's do / lets do / make
  # it / actually"). The fold's normalized text is downcased, so this runs
  # on the original body. Candidates are cleaned of trailing day/month
  # words and rejected when they are an activity, a generic word, a time,
  # or a single name followed by a speech verb ("Actually Maya said…"
  # names a person, not a place).
  @place_cue_re ~r/\b(?:let's do|lets do|make it|actually)\b[,\s]+/i
  @place_phrase_re ~r/\A([A-Z][\w&'\-]*(?:\s+(?:[A-Z][\w&'\-]*|&)){0,4})/
  @place_trailing_words ~w(saturday sunday monday tuesday wednesday thursday
                           friday january february march april may june july
                           august september october november december today
                           tomorrow tonight morning afternoon evening weekend)
  @speech_verbs ~w(said says asked asks wants needs told tells)

  defp named_place_after_cue(body) when is_binary(body) do
    case Regex.split(@place_cue_re, body, parts: 2) do
      [_before, rest] ->
        case Regex.run(@place_phrase_re, String.trim(rest)) do
          [_, phrase] -> clean_chat_place_candidate(phrase, rest)
          _ -> nil
        end

      _ ->
        nil
    end
  end

  defp named_place_after_cue(_), do: nil

  defp clean_chat_place_candidate(phrase, rest) do
    tokens =
      phrase
      |> String.split(~r/\s+/, trim: true)
      |> Enum.reverse()
      |> Enum.drop_while(&(String.downcase(&1) in @place_trailing_words))
      |> Enum.reverse()

    name = Enum.join(tokens, " ")

    following =
      rest |> String.trim() |> String.split(~r/\s+/, trim: true) |> Enum.at(length(tokens))

    cond do
      tokens == [] ->
        nil

      not plausible_place_name?(name) ->
        nil

      length(tokens) == 1 and is_binary(following) and String.downcase(following) in @speech_verbs ->
        nil

      true ->
        name
    end
  end

  defp place_retarget?(text) do
    Regex.match?(~r/\b(actually|instead|change to|switch to)\b/, text)
  end

  defp event_at(%{inserted_at: %DateTime{} = dt}, _index), do: DateTime.to_unix(dt, :microsecond)

  defp event_at(%{"at" => at}, _index) when is_binary(at) do
    case DateTime.from_iso8601(at) do
      {:ok, dt, _} -> DateTime.to_unix(dt, :microsecond)
      _ -> 0
    end
  end

  defp event_at(%{"seq" => seq}, _index) when is_integer(seq), do: seq
  defp event_at(%{seq: seq}, _index) when is_integer(seq), do: seq
  defp event_at(_, index), do: index

  defp field_state(state, key), do: get_in(state, [key, "state"]) || "unknown"

  defp message_body(%{body: body}), do: body || ""
  defp message_body(%{"body" => body}), do: body || ""
  defp message_body(_), do: ""

  defp message_id(%{id: id}), do: id
  defp message_id(%{"id" => id}), do: id
  defp message_id(_), do: nil

  defp message_actor(%{sender_user_id: id}), do: id
  defp message_actor(%{"sender_user_id" => id}), do: id
  defp message_actor(_), do: nil

  defp normalize(body), do: body |> String.downcase() |> String.trim()

  defp trivial?(text) do
    Regex.match?(~r/\A(hey|hi|hello|thanks|thank you|ok|okay)[!. ]*\z/, text)
  end
end
