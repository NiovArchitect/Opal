defmodule OpalCore.SocialFlow.FollowThrough do
  @moduledoc """
  Social Flow 2: follow-through, relevance eligibility, completion, memory, Needs you.

  Non-manipulative: calm completion only; no scores, streaks, or guilt.
  Elixir owns emission authority. Python may rank only after eligibility.
  """

  import Ecto.Query

  alias OpalCore.{Contracts, Repo}
  alias OpalCore.Messaging.ConversationMember

  alias OpalCore.SocialFlow.{
    AssistancePreference,
    AttentionSignal,
    AuditEvent,
    CompletionEvent,
    FeedbackEvent,
    MemoryCandidate,
    PlanCommitment,
    PlanReminder,
    RelationshipMemory,
    ShadowEvaluation,
    SharedPlan,
    Signal
  }

  @max_needs_you 3
  @trace "trace-social-flow-2"

  # --- Preferences ---

  def get_or_create_preferences(user_id) do
    case Repo.get_by(AssistancePreference, user_id: user_id) do
      %AssistancePreference{} = p ->
        {:ok, p}

      nil ->
        %AssistancePreference{}
        |> AssistancePreference.changeset(%{user_id: user_id})
        |> Repo.insert()
    end
  end

  def update_preferences(user_id, attrs) do
    with {:ok, pref} <- get_or_create_preferences(user_id) do
      pref
      |> AssistancePreference.changeset(Map.put(attrs, :user_id, user_id))
      |> Repo.update()
    end
  end

  # --- Relationship rhythm (computed projection, not a score) ---

  def attention_snapshot(owner_user_id, conversation_id) do
    with :ok <- ensure_member(conversation_id, owner_user_id) do
      plans =
        from(p in SharedPlan,
          where:
            p.conversation_id == ^conversation_id and
              p.status in ^["agreed", "changed", "tentative"]
        )
        |> Repo.all()

      plan_ids = Enum.map(plans, & &1.id)

      open_commitments =
        from(c in PlanCommitment,
          where:
            c.plan_id in ^plan_ids and c.owner_user_id == ^owner_user_id and
              c.status in ^["proposed", "confirmed"]
        )
        |> Repo.aggregate(:count)

      due_reminders =
        from(r in PlanReminder,
          where:
            r.owner_user_id == ^owner_user_id and r.visibility == "private" and
              r.status in ^["scheduled", "active"]
        )
        |> Repo.aggregate(:count)

      needs = needs_you(owner_user_id)

      {:ok,
       %{
         "schema_version" => "0.1.0",
         "owner_user_id" => owner_user_id,
         "conversation_id" => conversation_id,
         "generated_at" => DateTime.utc_now() |> DateTime.to_iso8601(),
         "open_plan_count" => length(plans),
         "open_commitment_count" => open_commitments,
         "due_reminder_count" => due_reminders,
         "upcoming_plan_count" => length(plans),
         "candidate_signals" => Enum.take(needs, @max_needs_you),
         "note" => "Operational attention only — not a relationship score"
       }}
    end
  end

  # --- Needs you (max 3, private) ---

  def needs_you(owner_user_id) do
    from(s in AttentionSignal,
      where:
        s.owner_user_id == ^owner_user_id and s.privacy_class == "private" and
          s.status in ^["visible", "eligible", "scheduled"] and s.shadow_only == false,
      order_by: [asc: s.due_at, desc: s.inserted_at],
      limit: ^@max_needs_you
    )
    |> Repo.all()
    |> Enum.map(&AttentionSignal.to_contract/1)
  end

  def needs_you_empty_copy, do: "Nothing needs you right now."

  # --- Evaluate follow-through candidate (deterministic eligibility) ---

  def evaluate_follow_through(attrs) do
    owner_id = fetch!(attrs, :owner_user_id)
    commitment_id = fetch!(attrs, :commitment_id)
    now = Map.get(attrs, :now) || DateTime.utc_now() |> DateTime.truncate(:microsecond)
    force_due = Map.get(attrs, :force_due, false)
    shadow = Map.get(attrs, :shadow, false)
    trace_id = Map.get(attrs, :trace_id) || @trace

    with %PlanCommitment{} = commitment <- Repo.get(PlanCommitment, commitment_id),
         true <- commitment.owner_user_id == owner_id,
         %SharedPlan{} = plan <- Repo.get(SharedPlan, commitment.plan_id),
         :ok <- ensure_member(plan.conversation_id, owner_id),
         {:ok, pref} <- get_or_create_preferences(owner_id) do
      idem =
        Map.get(attrs, :idempotency_key) ||
          "ft-#{commitment.id}-#{DateTime.to_unix(now)}"

      case Repo.get_by(AttentionSignal, idempotency_key: idem) do
        %AttentionSignal{} = existing ->
          {:ok, existing, :idempotent}

        nil ->
          reason = eligibility_reason(commitment, plan, pref, now, force_due, owner_id)

          if reason do
            record_shadow(
              owner_id,
              commitment.id,
              false,
              reason,
              false,
              shadow || pref.shadow_mode
            )

            {:ok,
             suppress_signal(
               commitment,
               plan,
               pref,
               reason,
               idem,
               now,
               shadow || pref.shadow_mode
             ), :suppressed}
          else
            score = if force_due, do: 0.85, else: 0.62
            copy = due_copy(commitment, force_due)
            emit? = not (shadow or pref.shadow_mode)

            status = if emit?, do: "visible", else: "suppressed"
            suppression = if emit?, do: nil, else: "shadow_mode"

            {:ok, signal} =
              %AttentionSignal{}
              |> AttentionSignal.changeset(%{
                owner_user_id: owner_id,
                conversation_id: plan.conversation_id,
                plan_id: plan.id,
                commitment_id: commitment.id,
                signal_type: "follow_through",
                privacy_class: "private",
                status: status,
                copy: copy,
                actions: %{
                  "items" => [
                    %{"id" => "mark_complete", "label" => "Mark complete"},
                    %{"id" => "remind_later", "label" => "Remind me later"},
                    %{"id" => "change_reminder", "label" => "Change reminder"},
                    %{"id" => "not_needed", "label" => "Not needed"}
                  ]
                },
                due_at: now,
                eligible_at: now,
                surfaced_at: if(emit?, do: now, else: nil),
                suppression_reason: suppression,
                internal_score: score,
                shadow_only: shadow or pref.shadow_mode,
                idempotency_key: idem,
                source_lineage: %{"origin" => "follow_through_eval"}
              })
              |> Repo.insert()

            record_shadow(
              owner_id,
              commitment.id,
              true,
              suppression,
              emit?,
              shadow or pref.shadow_mode
            )

            if emit? do
              broadcast_private(
                plan.conversation_id,
                owner_id,
                "social_flow:attention",
                %{
                  "attention_signal" => AttentionSignal.to_contract(signal)
                },
                trace_id
              )

              audit!(
                plan.conversation_id,
                plan.id,
                owner_id,
                "attention.surfaced",
                %{
                  "attention_signal_id" => signal.id
                },
                trace_id
              )
            end

            {:ok, signal, if(emit?, do: :surfaced, else: :shadow)}
          end
      end
    else
      nil -> {:error, :not_found}
      false -> {:error, :forbidden}
      {:error, _} = err -> err
    end
  end

  defp eligibility_reason(commitment, plan, pref, now, force_due, owner_id) do
    cond do
      commitment.status in ~w(completed cancelled) ->
        "already_complete"

      plan.status in ~w(cancelled completed) ->
        "plan_cancelled"

      quiet_hours?(pref, now) ->
        "quiet_hours"

      frequency_capped?(owner_id, pref, now) ->
        "frequency_cap"

      recently_dismissed?(commitment.id) ->
        "dismissed"

      not force_due and too_early?(commitment, now) ->
        "not_due"

      true ->
        nil
    end
  end

  defp suppress_signal(commitment, plan, pref, reason, idem, now, shadow) do
    {:ok, signal} =
      %AttentionSignal{}
      |> AttentionSignal.changeset(%{
        owner_user_id: commitment.owner_user_id,
        conversation_id: plan.conversation_id,
        plan_id: plan.id,
        commitment_id: commitment.id,
        signal_type: "follow_through",
        privacy_class: "private",
        status: "suppressed",
        copy: "Suppressed: #{reason}",
        actions: %{"items" => []},
        suppression_reason: reason,
        shadow_only: shadow or pref.shadow_mode,
        idempotency_key: idem,
        eligible_at: now,
        source_lineage: %{"origin" => "counterfactual_suppression"}
      })
      |> Repo.insert()

    signal
  end

  defp due_copy(commitment, force_due) do
    if force_due do
      "Reservation still needs attention."
    else
      "You planned to #{String.downcase(commitment.description)}. Do you still want a reminder?"
    end
  end

  defp quiet_hours?(%AssistancePreference{} = pref, %DateTime{} = now) do
    # UTC HH:MM comparison for deterministic tests
    {sh, sm} = parse_hm(pref.quiet_hours_start)
    {eh, em} = parse_hm(pref.quiet_hours_end)
    minutes = now.hour * 60 + now.minute
    start_m = sh * 60 + sm
    end_m = eh * 60 + em

    if start_m <= end_m do
      minutes >= start_m and minutes < end_m
    else
      # wraps midnight
      minutes >= start_m or minutes < end_m
    end
  end

  defp parse_hm(str) do
    case String.split(str || "22:00", ":") do
      [h, m] -> {String.to_integer(h), String.to_integer(m)}
      _ -> {22, 0}
    end
  end

  defp frequency_capped?(owner_id, pref, now) do
    start_of_day = %{now | hour: 0, minute: 0, second: 0, microsecond: {0, 6}}

    count =
      from(s in AttentionSignal,
        where:
          s.owner_user_id == ^owner_id and s.status == "visible" and
            s.surfaced_at >= ^start_of_day and s.shadow_only == false
      )
      |> Repo.aggregate(:count)

    count >= pref.max_proactive_signals_per_day
  end

  defp recently_dismissed?(commitment_id) do
    from(s in AttentionSignal,
      where:
        s.commitment_id == ^commitment_id and s.status == "dismissed" and
          not is_nil(s.dismissed_at),
      limit: 1
    )
    |> Repo.exists?()
  end

  defp too_early?(%PlanCommitment{} = c, now) do
    # Without explicit due, treat as not due unless due_at near
    case c.due_at do
      nil -> true
      %DateTime{} = due -> DateTime.compare(due, DateTime.add(now, 48 * 3600, :second)) == :gt
    end
  end

  defp record_shadow(owner_id, candidate_id, eligible, reason, would_surface, shadow?) do
    if shadow? do
      %ShadowEvaluation{}
      |> ShadowEvaluation.changeset(%{
        owner_user_id: owner_id,
        candidate_id: to_string(candidate_id),
        eligible: eligible,
        suppression_reason: reason,
        would_surface: would_surface,
        metadata: %{"privacy_minimized" => true},
        evaluated_at: DateTime.utc_now() |> DateTime.truncate(:microsecond)
      })
      |> Repo.insert()
    end

    :ok
  end

  # --- Act on attention signal ---

  def act_on_signal(%{
        signal_id: signal_id,
        user_id: user_id,
        action: action,
        trace_id: trace_id
      }) do
    with %AttentionSignal{} = signal <- Repo.get(AttentionSignal, signal_id),
         true <- signal.owner_user_id == user_id,
         true <- signal.status in ~w(visible eligible scheduled) do
      case action do
        "mark_complete" ->
          complete_commitment(%{
            commitment_id: signal.commitment_id,
            user_id: user_id,
            share: false,
            idempotency_key: "complete-#{signal.id}",
            attention_signal_id: signal.id,
            trace_id: trace_id || @trace
          })

        "not_needed" ->
          dismiss_signal(signal, user_id, "not_needed", trace_id)

        "remind_later" ->
          snooze_signal(signal, user_id, 3600 * 4, trace_id)

        _ ->
          {:error, :unknown_action}
      end
    else
      nil -> {:error, :not_found}
      false -> {:error, :forbidden}
    end
  end

  defp dismiss_signal(signal, user_id, reason, _trace_id) do
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    {:ok, signal} =
      signal
      |> AttentionSignal.changeset(%{
        status: "dismissed",
        dismissed_at: now,
        acted_at: now,
        suppression_reason: reason
      })
      |> Repo.update()

    %FeedbackEvent{}
    |> FeedbackEvent.changeset(%{
      user_id: user_id,
      attention_signal_id: signal.id,
      feedback_type: "dismiss",
      payload: %{"reason" => reason}
    })
    |> Repo.insert!()

    {:ok, signal}
  end

  defp snooze_signal(signal, user_id, seconds, _trace_id) do
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)
    until = DateTime.add(now, seconds, :second)

    {:ok, signal} =
      signal
      |> AttentionSignal.changeset(%{
        status: "snoozed",
        snoozed_until: until,
        acted_at: now
      })
      |> Repo.update()

    %FeedbackEvent{}
    |> FeedbackEvent.changeset(%{
      user_id: user_id,
      attention_signal_id: signal.id,
      feedback_type: "too_soon",
      payload: %{"snoozed_until" => DateTime.to_iso8601(until)}
    })
    |> Repo.insert!()

    {:ok, signal}
  end

  # --- Completion (private vs shared) ---

  def complete_commitment(attrs) do
    commitment_id = fetch!(attrs, :commitment_id)
    user_id = fetch!(attrs, :user_id)
    share = Map.get(attrs, :share, false)
    shared_message = Map.get(attrs, :shared_message)
    idem = fetch!(attrs, :idempotency_key)
    trace_id = Map.get(attrs, :trace_id) || @trace
    signal_id = Map.get(attrs, :attention_signal_id)

    case Repo.get_by(CompletionEvent, idempotency_key: idem) do
      %CompletionEvent{} = existing ->
        {:ok, existing, :idempotent}

      nil ->
        with %PlanCommitment{} = c <- Repo.get(PlanCommitment, commitment_id),
             true <- c.owner_user_id == user_id,
             %SharedPlan{} = plan <- Repo.get(SharedPlan, c.plan_id),
             :ok <- ensure_member(plan.conversation_id, user_id) do
          persist_completion(c, plan, user_id, share, shared_message, idem, signal_id, trace_id)
        else
          nil -> {:error, :not_found}
          false -> {:error, :forbidden}
          {:error, _} = err -> err
        end
    end
  end

  defp persist_completion(c, plan, user_id, share, shared_message, idem, signal_id, trace_id) do
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    Repo.transaction(fn ->
      {:ok, c} =
        c
        |> PlanCommitment.changeset(%{status: "completed", completed_at: now})
        |> Repo.update()

      from(r in PlanReminder,
        where:
          r.commitment_id == ^c.id and r.owner_user_id == ^user_id and
            r.status in ^["active", "scheduled"]
      )
      |> Repo.update_all(set: [status: "completed", completed_at: now, updated_at: now])

      complete_attention_signal(signal_id, now)

      from(s in AttentionSignal,
        where:
          s.commitment_id == ^c.id and s.owner_user_id == ^user_id and
            s.status in ^["visible", "eligible", "scheduled"]
      )
      |> Repo.update_all(
        set: [status: "completed", completed_at: now, acted_at: now, updated_at: now]
      )

      grat = "Reservation handled."
      visibility = if share, do: "shared", else: "private"

      {:ok, event} =
        %CompletionEvent{}
        |> CompletionEvent.changeset(%{
          owner_user_id: user_id,
          conversation_id: plan.conversation_id,
          plan_id: plan.id,
          commitment_id: c.id,
          completion_kind: "commitment_complete",
          visibility: visibility,
          gratification_copy: grat,
          shared_message: if(share, do: shared_message || "Reservation is booked.", else: nil),
          source: "user_action",
          idempotency_key: idem,
          completed_at: now
        })
        |> Repo.insert()

      {:ok, ack} =
        %AttentionSignal{}
        |> AttentionSignal.changeset(%{
          owner_user_id: user_id,
          conversation_id: plan.conversation_id,
          plan_id: plan.id,
          commitment_id: c.id,
          signal_type: "completion_ack",
          privacy_class: "private",
          status: "visible",
          copy: grat,
          actions: %{"items" => []},
          surfaced_at: now,
          completed_at: now,
          idempotency_key: "ack-#{idem}",
          source_lineage: %{"origin" => "completion"}
        })
        |> Repo.insert()

      audit!(
        plan.conversation_id,
        plan.id,
        user_id,
        "commitment.completed",
        %{
          "commitment_id" => c.id,
          "visibility" => visibility
        },
        trace_id
      )

      broadcast_private(
        plan.conversation_id,
        user_id,
        "social_flow:completion",
        %{
          "completion" => CompletionEvent.to_contract(event),
          "attention_signal" => AttentionSignal.to_contract(ack),
          "commitment" => PlanCommitment.to_contract(c)
        },
        trace_id
      )

      maybe_share_completion(share, plan, c, event, trace_id)
      %{completion: event, commitment: c, gratification: ack}
    end)
    |> case do
      {:ok, result} -> {:ok, result, :created}
      {:error, reason} -> {:error, reason}
    end
  end

  defp complete_attention_signal(nil, _now), do: :ok

  defp complete_attention_signal(signal_id, now) do
    case Repo.get(AttentionSignal, signal_id) do
      %AttentionSignal{} = s ->
        s
        |> AttentionSignal.changeset(%{status: "completed", completed_at: now, acted_at: now})
        |> Repo.update!()

      _ ->
        :ok
    end
  end

  defp maybe_share_completion(false, _plan, _c, _event, _trace_id), do: :ok

  defp maybe_share_completion(true, plan, c, event, trace_id) do
    shared_sig =
      %Signal{}
      |> Signal.changeset(%{
        conversation_id: plan.conversation_id,
        plan_id: plan.id,
        commitment_id: c.id,
        kind: "agreement",
        status: "visible",
        copy: event.shared_message || "Reservation is booked.",
        visibility: "shared",
        actions: %{"items" => []}
      })
      |> Repo.insert!()

    broadcast_shared(
      plan.conversation_id,
      "social_flow:shared_completion",
      %{
        "completion" => CompletionEvent.to_contract(event),
        "signal" => Signal.to_contract(shared_sig)
      },
      trace_id
    )
  end

  # --- Memory candidates ---

  def create_memory_candidate(attrs) do
    owner_id = fetch!(attrs, :owner_user_id)
    conversation_id = fetch!(attrs, :conversation_id)
    summary = fetch!(attrs, :candidate_summary)
    candidate_type = Map.get(attrs, :candidate_type) || "gift_preference"
    counterpart = Map.get(attrs, :counterpart_user_id)
    source_ids = Map.get(attrs, :source_message_ids) || []
    confidence = Map.get(attrs, :confidence) || 0.7
    uncertainty = Map.get(attrs, :uncertainty) || []
    purpose = Map.get(attrs, :proposed_purpose) || "private personal follow-through"
    trace_id = Map.get(attrs, :trace_id) || @trace

    with :ok <- ensure_member(conversation_id, owner_id) do
      {:ok, cand} =
        %MemoryCandidate{}
        |> MemoryCandidate.changeset(%{
          owner_user_id: owner_id,
          conversation_id: conversation_id,
          counterpart_user_id: counterpart,
          source_message_ids: source_ids,
          candidate_type: candidate_type,
          candidate_summary: summary,
          confidence: confidence,
          uncertainty: uncertainty,
          proposed_purpose: purpose,
          status: "visible"
        })
        |> Repo.insert()

      {:ok, signal} =
        %AttentionSignal{}
        |> AttentionSignal.changeset(%{
          owner_user_id: owner_id,
          conversation_id: conversation_id,
          memory_id: cand.id,
          signal_type: "memory_review",
          privacy_class: "private",
          status: "visible",
          copy: summary,
          actions: %{
            "items" => [
              %{"id" => "approve_memory", "label" => "Keep this reminder"},
              %{"id" => "reject_memory", "label" => "Not relevant anymore"}
            ]
          },
          surfaced_at: DateTime.utc_now() |> DateTime.truncate(:microsecond),
          idempotency_key: "memcand-#{cand.id}",
          source_lineage: %{"origin" => "memory_candidate"}
        })
        |> Repo.insert()

      broadcast_private(
        conversation_id,
        owner_id,
        "social_flow:memory_candidate",
        %{
          "memory_candidate" => MemoryCandidate.to_contract(cand),
          "attention_signal" => AttentionSignal.to_contract(signal)
        },
        trace_id
      )

      {:ok, %{candidate: cand, signal: signal}}
    end
  end

  def approve_memory_candidate(%{candidate_id: id, user_id: user_id, trace_id: trace_id}) do
    with %MemoryCandidate{} = cand <- Repo.get(MemoryCandidate, id),
         true <- cand.owner_user_id == user_id,
         true <- cand.status in ~w(proposed visible) do
      now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

      Repo.transaction(fn ->
        {:ok, cand} =
          cand
          |> MemoryCandidate.changeset(%{status: "approved", approved_at: now})
          |> Repo.update()

        review =
          DateTime.add(now, 30 * 24 * 3600, :second)

        {:ok, mem} =
          %RelationshipMemory{}
          |> RelationshipMemory.changeset(%{
            owner_user_id: user_id,
            conversation_id: cand.conversation_id,
            counterpart_user_id: cand.counterpart_user_id,
            source_candidate_id: cand.id,
            summary: cand.candidate_summary,
            purpose: cand.proposed_purpose || "private follow-through",
            visibility: "private",
            review_at: review,
            deletion_state: "active"
          })
          |> Repo.insert()

        audit!(
          cand.conversation_id,
          nil,
          user_id,
          "memory.approved",
          %{
            "memory_id" => mem.id
          },
          trace_id || @trace
        )

        %{memory: mem, candidate: cand}
      end)
    else
      nil -> {:error, :not_found}
      false -> {:error, :forbidden}
    end
  end

  def reject_memory_candidate(%{candidate_id: id, user_id: user_id}) do
    with %MemoryCandidate{} = cand <- Repo.get(MemoryCandidate, id),
         true <- cand.owner_user_id == user_id do
      now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

      cand
      |> MemoryCandidate.changeset(%{status: "rejected", rejected_at: now})
      |> Repo.update()
    else
      nil -> {:error, :not_found}
      false -> {:error, :forbidden}
    end
  end

  def handle_memory(%{memory_id: id, user_id: user_id, action: action})
      when action in ~w(handled forget) do
    with %RelationshipMemory{} = mem <- Repo.get(RelationshipMemory, id),
         true <- mem.owner_user_id == user_id,
         true <- mem.deletion_state == "active" do
      now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

      state = if action == "handled", do: "handled", else: "forgotten"

      attrs =
        if action == "handled" do
          %{deletion_state: state, handled_at: now}
        else
          %{deletion_state: state, forgotten_at: now}
        end

      {:ok, mem} = mem |> RelationshipMemory.changeset(attrs) |> Repo.update()

      grat =
        if action == "handled",
          do: "You closed the loop.",
          else: "Forgotten. It will not surface again."

      {:ok, event} =
        %CompletionEvent{}
        |> CompletionEvent.changeset(%{
          owner_user_id: user_id,
          conversation_id: mem.conversation_id,
          memory_id: mem.id,
          completion_kind: "memory_#{action}",
          visibility: "private",
          gratification_copy: grat,
          source: "user_action",
          idempotency_key: "mem-#{action}-#{mem.id}",
          completed_at: now
        })
        |> Repo.insert()

      {:ok, %{memory: mem, completion: event, gratification_copy: grat}}
    else
      nil -> {:error, :not_found}
      false -> {:error, :forbidden}
    end
  end

  def get_memory_for_user(memory_id, user_id) do
    case Repo.get(RelationshipMemory, memory_id) do
      %RelationshipMemory{owner_user_id: ^user_id, deletion_state: "active"} = m ->
        {:ok, m}

      %RelationshipMemory{} ->
        {:error, :forbidden}

      nil ->
        {:error, :not_found}
    end
  end

  def list_memories(owner_user_id) do
    from(m in RelationshipMemory,
      where: m.owner_user_id == ^owner_user_id and m.deletion_state == "active"
    )
    |> Repo.all()
    |> Enum.map(&RelationshipMemory.to_contract/1)
  end

  def sync_follow_through(user_id, conversation_id) do
    with :ok <- ensure_member(conversation_id, user_id) do
      needs = needs_you(user_id)

      completions =
        from(c in CompletionEvent,
          where: c.owner_user_id == ^user_id and c.conversation_id == ^conversation_id,
          order_by: [desc: c.completed_at],
          limit: 20
        )
        |> Repo.all()
        |> Enum.map(&CompletionEvent.to_contract/1)

      memories =
        from(m in RelationshipMemory,
          where:
            m.owner_user_id == ^user_id and m.conversation_id == ^conversation_id and
              m.deletion_state == "active"
        )
        |> Repo.all()
        |> Enum.map(&RelationshipMemory.to_contract/1)

      candidates =
        from(c in MemoryCandidate,
          where:
            c.owner_user_id == ^user_id and c.conversation_id == ^conversation_id and
              c.status in ^["proposed", "visible"]
        )
        |> Repo.all()
        |> Enum.map(&MemoryCandidate.to_contract/1)

      empty? = needs == []

      {:ok,
       %{
         "schema_version" => "0.1.0",
         "needs_you" => needs,
         "needs_you_empty_copy" => if(empty?, do: needs_you_empty_copy(), else: nil),
         "completions" => completions,
         "memories" => memories,
         "memory_candidates" => candidates
       }}
    end
  end

  # --- helpers ---

  defp broadcast_private(conversation_id, owner_id, event, payload, trace_id) do
    envelope =
      Contracts.event_envelope(
        event,
        Map.put(payload, "audience_user_id", owner_id),
        trace_id
      )

    Phoenix.PubSub.broadcast(
      OpalCore.PubSub,
      "social_flow:conversation:#{conversation_id}",
      {:social_flow_event, event, envelope}
    )

    :ok
  end

  defp broadcast_shared(conversation_id, event, payload, trace_id) do
    envelope = Contracts.event_envelope(event, payload, trace_id)

    Phoenix.PubSub.broadcast(
      OpalCore.PubSub,
      "social_flow:conversation:#{conversation_id}",
      {:social_flow_event, event, envelope}
    )

    :ok
  end

  defp audit!(conversation_id, plan_id, actor, event_type, payload, trace_id) do
    %AuditEvent{}
    |> AuditEvent.changeset(%{
      conversation_id: conversation_id,
      plan_id: plan_id,
      actor_user_id: actor,
      event_type: event_type,
      payload: payload,
      trace_id: trace_id
    })
    |> Repo.insert!()

    :ok
  end

  defp ensure_member(conversation_id, user_id) do
    exists? =
      from(cm in ConversationMember,
        where: cm.conversation_id == ^conversation_id and cm.user_id == ^user_id
      )
      |> Repo.exists?()

    if exists?, do: :ok, else: {:error, :not_a_member}
  end

  defp fetch!(attrs, key) do
    Map.get(attrs, key) || Map.get(attrs, Atom.to_string(key)) ||
      raise ArgumentError, "missing #{key}"
  end
end
