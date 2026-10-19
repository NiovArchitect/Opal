defmodule OpalCore.Intelligence.Executor do
  @moduledoc """
  Execute a Reasoner decision. Idempotent. Always logged with decision_id.

  - respond.thread → Messages.accept_message as Opal system filament (best-effort)
  - plan.* → best-effort SharedPlan / alignment hooks when conversation present
  - notify.push → DeliverPushWorker.enqueue (or log push queued)
  - escalate.user / silent / suggest.alternative → recorded, no autonomous side effect
  """

  require Logger

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Intelligence.{ActionLog, Decision}
  alias OpalCore.Messages
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.{JourneyAuthority, PlanParticipant, SharedPlan}

  @opal_sender_env "OPAL_INTELLIGENCE_SENDER_USER_ID"

  # Repair #11 — cancel phrasing disambiguation. Withdrawal is first-person
  # ("I can't make it"); proposals address the group ("we should cancel");
  # organizer cancel names the whole plan ("cancel the whole plan").
  @withdrawal_re ~r/\bi\s+(can'?t|cannot|won'?t\s+be\s+able\s+to)\s+(make\s+it|come|be\s+there)\b|\bi\s+need\s+to\s+drop\s+out\b|\bi'?m\s+out\b|\bsitting\s+(this\s+one\s+)?out\b|\brain\s+check\b/i
  @proposal_cancel_re ~r/\bwe\s+should\s+cancel\b|\blet'?s\s+cancel\b|\bshould\s+we\s+cancel\b/i
  @whole_plan_cancel_re ~r/\bcancel\s+the\s+whole\s+plan\b|\bcancel\s+everything\b|\bkill\s+the\s+plan\b|\bscratch\s+the\s+plan\b|\bcancel\s+the\s+plan\s+(entirely|for\s+everyone)\b/i
  @reject_re ~r/^\s*no\b|\bnot\s+(this\s+one|now)\b|\bdon'?t\s+(confirm|lock\s+it\s+in)\b|\breject\b/i

  def execute(%Decision{} = decision) do
    key = "decision:#{decision.id}"

    case Repo.get_by(ActionLog, idempotency_key: key) do
      %ActionLog{status: "ok"} = existing ->
        {:ok, existing}

      %ActionLog{} = existing ->
        run_with_retry(decision, existing)

      nil ->
        {:ok, log} =
          %ActionLog{}
          |> ActionLog.changeset(%{
            decision_id: decision.id,
            status: "pending",
            attempts: 0,
            idempotency_key: key
          })
          |> Repo.insert()

        run_with_retry(decision, log)
    end
  end

  def execute(_), do: {:error, :invalid_decision}

  defp run_with_retry(decision, log) do
    case do_execute(decision) do
      {:ok, result} ->
        update_log(log, "ok", result, log.attempts + 1)

      {:error, reason} ->
        if log.attempts < 1 do
          bumped = update_log!(log, "pending", %{"error" => inspect(reason)}, log.attempts + 1)

          case do_execute(decision) do
            {:ok, result} ->
              update_log(bumped, "ok", result, bumped.attempts + 1)

            {:error, reason2} ->
              Logger.error(
                "intelligence.executor.failed decision=#{decision.id} reason=#{inspect(reason2)}"
              )

              update_log(bumped, "failed", %{"error" => inspect(reason2)}, bumped.attempts + 1)
          end
        else
          Logger.error(
            "intelligence.executor.failed decision=#{decision.id} reason=#{inspect(reason)}"
          )

          update_log(log, "failed", %{"error" => inspect(reason)}, log.attempts + 1)
        end
    end
  end

  defp do_execute(%Decision{action: "silent"}), do: {:ok, %{"skipped" => true}}

  defp do_execute(%Decision{action: "escalate.user"} = d) do
    {:ok, %{"escalated" => true, "suggestion" => d.payload["suggestion"] || d.payload["message"]}}
  end

  defp do_execute(%Decision{action: "suggest.alternative"} = d) do
    {:ok, %{"suggestion_card" => d.payload["message"] || "Want an alternative?"}}
  end

  defp do_execute(%Decision{action: "notify.push"} = d) do
    user_id = d.payload["user_id"] || d.context_snapshot["notify_user_id"]
    title = d.payload["title"] || "Opal"
    body = d.payload["body"] || d.payload["message"] || "Update"

    if is_binary(user_id) do
      # Phase 4 — Opal suggestion → normal tier
      # HA-07 (Repair #18 hunt-fix, SP-9 failures surface): every
      # enqueue outcome is reported as what it actually is. The old
      # catch-all mapped ANY result — including {:error, _} from a
      # failed Oban insert — to {:ok, %{"push" => "queued"}}, so the
      # execution record claimed a push that was never enqueued, and
      # mute/in-app suppressions were mislabeled "queued" too.
      case OpalCore.Push.NotificationIntelligence.enqueue(
             user_id,
             title,
             body,
             %{"decision_id" => d.id, "kind" => "opal.suggestion", "tier" => "normal"},
             tier: :normal
           ) do
        {:ok, %Oban.Job{}} -> {:ok, %{"push" => "queued"}}
        {:ok, :suppressed_mute} -> {:ok, %{"push" => "suppressed_mute"}}
        {:ok, :in_app_only} -> {:ok, %{"push" => "in_app_only"}}
        {:ok, :digested} -> {:ok, %{"push" => "digested"}}
        {:ok, :held_quiet_hours} -> {:ok, %{"push" => "held_quiet_hours"}}
        {:ok, other} -> {:ok, %{"push" => "accepted", "detail" => inspect(other)}}
        {:error, reason} -> {:error, {:push_enqueue_failed, reason}}
      end
    else
      Logger.info("intelligence.push_queued decision=#{d.id} (no user_id)")
      {:ok, %{"push" => "queued_log_only"}}
    end
  end

  defp do_execute(%Decision{action: action} = d)
       when action in ["respond.thread", "plan.update", "plan.create"] do
    conversation_id = d.context_snapshot["conversation_id"]
    message = d.payload["message"]

    cond do
      action == "respond.thread" and is_binary(conversation_id) and is_binary(message) and
          message != "" ->
        post_opal_message(conversation_id, message, d.id)

      true ->
        {:ok,
         %{
           "recorded" => true,
           "action" => action,
           "plan_update" => d.payload["plan_update"],
           "note" => "Plan module hook recorded; thread message optional"
         }}
    end
  end

  # Repair #11 — NL confirm routes through the revision authority.
  # The old free-floating "Locked in!" post is removed: never claim a
  # confirmation the state machine did not record.
  defp do_execute(%Decision{action: "plan.confirm"} = d) do
    conversation_id = d.context_snapshot["conversation_id"]
    user_id = d.context_snapshot["account_id"]
    body = d.payload["body"] || ""
    decision = if reject_phrasing?(body), do: "reject", else: "accept"
    base = %{"action" => "plan.confirm", "decision" => decision}

    if not is_binary(conversation_id) or not is_binary(user_id) do
      {:ok, Map.put(base, "note", "missing conversation/user context; no state changed")}
    else
      case OpalCore.SocialFlow.confirm_pending_revision(%{
             conversation_id: conversation_id,
             user_id: user_id,
             decision: decision,
             trace_id: d.id
           }) do
        {:ok, _result} ->
          msg =
            if decision == "reject" do
              "Noted. I won't lock that in."
            else
              # Repair #17 (W4-1) — state the applied truth from the plan
              # row itself (the confirm just mutated it through the revision
              # authority), never a bare claim detached from state.
              case active_plan(conversation_id) do
                %SharedPlan{time_label: label, title: title}
                when is_binary(label) and label != "" ->
                  "Confirmed — #{title || "the plan"} is now at #{label}."

                _ ->
                  "Confirmed."
              end
            end

          notify(conversation_id, d.id, msg, Map.put(base, "confirmed", true))

        {:error, :no_pending_revision} ->
          # Repair #18 residuals (R-2): System A holds no proposed
          # revision, but the pending change may live in the alignment
          # fold (a chat proposal this executor never converted - its
          # own propose turn can be blocked by an ambiguous schedule
          # target elsewhere in the account), or the fold may already
          # have applied this very confirmation on replay with no
          # System A record behind it. Settle through the fold's own
          # authorities before telling the user nothing is pending:
          # accept_committed_change applies a still-pending fold
          # proposal (and mirrors it into the revision chain);
          # settle_fold_confirmed_change reports whether the revision
          # chain already records an acceptance the fold applied.
          case fold_confirm_fallback(conversation_id, user_id, decision, body) do
            :settled ->
              msg =
                case active_plan(conversation_id) do
                  %SharedPlan{time_label: label, title: title}
                  when is_binary(label) and label != "" ->
                    if decision == "reject" do
                      "Noted. I won't lock that in."
                    else
                      "Confirmed — #{title || "the plan"} is now at #{label}."
                    end

                  _ ->
                    if decision == "reject",
                      do: "Noted. I won't lock that in.",
                      else: "Confirmed."
                end

              notify(conversation_id, d.id, msg, Map.put(base, "confirmed", true))

            :nothing ->
              notify(conversation_id, d.id, "There's nothing pending to confirm.", base)
          end

        {:error, reason} ->
          notify(
            conversation_id,
            d.id,
            "I couldn't confirm that just now (#{human_reason(reason)}). Nothing was changed.",
            Map.put(base, "error", inspect(reason))
          )
      end
    end
  end

  # Repair #11 — NL cancel routes through real authorities, disambiguated:
  # first-person withdrawal → JourneyAuthority.cant_make_it (self only);
  # group proposal → SocialFlow.propose_cancel_revision;
  # organizer "cancel the whole plan" → SocialFlow.cancel_plan.
  # The old free-floating "Got it — I'll release this one." post is removed.
  defp do_execute(%Decision{action: "plan.cancel"} = d) do
    conversation_id = d.context_snapshot["conversation_id"]
    user_id = d.context_snapshot["account_id"]
    body = d.payload["body"] || ""
    base = %{"action" => "plan.cancel"}

    cond do
      not is_binary(conversation_id) or not is_binary(user_id) ->
        {:ok, Map.put(base, "note", "missing conversation/user context; no state changed")}

      true ->
        case active_plan(conversation_id) do
          nil ->
            notify(
              conversation_id,
              d.id,
              "There's no active plan in this conversation to cancel.",
              Map.put(base, "no_active_plan", true)
            )

          plan ->
            route_plan_cancel(d, plan, user_id, body, conversation_id, base)
        end
    end
  end

  # Repair #12 (F12-02) — NL time/date changes route through the SocialFlow
  # schedule authority (lead/organizer-only direct edit of the SAME plan row),
  # never a free-floating thread claim.
  #
  # Contract (defined NL-side; R1 owns the SocialFlow handler):
  #   SocialFlow.change_plan_time(%{plan_id:, user_id:, new_time_label:, trace_id:})
  #     → {:ok, %{plan: plan}} | {:error, reason}
  #   SocialFlow.change_plan_date(%{plan_id:, user_id:, new_date_label:, trace_id:})
  #     → {:ok, %{plan: plan}} | {:error, reason}
  # Reasons: :invalid_label | :not_found | :not_authorized | :invalid_status.
  defp do_execute(%Decision{action: "plan.change_time"} = d) do
    execute_schedule_change(d, "time", d.payload["new_time"], fn args ->
      OpalCore.SocialFlow.change_plan_time(%{
        plan_id: args.plan_id,
        user_id: args.user_id,
        new_time_label: args.new_value,
        trace_id: args.trace_id
      })
    end)
  end

  defp do_execute(%Decision{action: "plan.change_date"} = d) do
    execute_schedule_change(d, "date", d.payload["new_date"], fn args ->
      OpalCore.SocialFlow.change_plan_date(%{
        plan_id: args.plan_id,
        user_id: args.user_id,
        new_date_label: args.new_value,
        trace_id: args.trace_id
      })
    end)
  end

  defp execute_schedule_change(d, kind, new_value, change_fn)
       when kind in ["time", "date"] and is_function(change_fn, 1) do
    conversation_id = d.context_snapshot["conversation_id"]
    user_id = d.context_snapshot["account_id"]
    base = %{"action" => d.action, "kind" => "schedule_change", "field" => kind}

    cond do
      not is_binary(conversation_id) or not is_binary(user_id) ->
        {:ok, Map.put(base, "note", "missing conversation/user context; no state changed")}

      not is_binary(new_value) or String.trim(new_value) == "" ->
        {:ok, Map.put(base, "note", "no new #{kind} extracted; no state changed")}

      true ->
        case schedule_target(d, conversation_id, user_id) do
          {:ambiguous, candidates} ->
            # Repair #18 (Division A, F18-03): with 2+ live candidates
            # the change asks which one - explicitly, with the list -
            # and writes nothing.
            names =
              Enum.map_join(candidates, ", ", fn c ->
                "#{c["title"]} (#{c["time_label"] || "no time set"})"
              end)

            notify(
              conversation_id,
              d.id,
              "Which plan did you mean: #{names}? Nothing was changed yet.",
              Map.merge(base, %{
                "ambiguous" => true,
                "candidates" => candidates,
                "no_state_change" => true
              })
            )

          {:ok, plan} ->
            run_schedule_change_on_plan(
              d,
              kind,
              new_value,
              change_fn,
              plan,
              conversation_id,
              user_id,
              base
            )

          :no_plan ->
            notify(
              conversation_id,
              d.id,
              "There's no active plan in this conversation to change.",
              Map.put(base, "no_active_plan", true)
            )
        end
    end
  end

  defp do_execute(%Decision{action: action}), do: {:error, {:unknown_action, action}}

  # The fold-side settlement for a plan.confirm with no proposed
  # PlanRevision (Repair #18 residuals R-2). :settled when a pending
  # fold change was applied/kept, or when the revision chain already
  # records the fold acceptance the sync path settled (the settle
  # check never writes - a confirm with nothing behind it must stay
  # an honest "nothing pending"); :nothing when no surface holds
  # anything for this confirmation to settle.
  defp fold_confirm_fallback(conversation_id, user_id, "accept", body) do
    alias OpalCore.SocialFlow.ConversationAlignment

    # A confirmation settles a change to a plan that EXISTS. With no
    # plan row there is nothing to confirm - and the fold entry points
    # below must not be called at all: their opening sync materializes
    # a plan from forming fold state, so a bare "I'm in" on a planless
    # thread (e.g. a seeded attendance thread whose plan the seed
    # itself is about to write) would birth a fold plan with default
    # pending participants and shadow the real one.
    if is_nil(ConversationAlignment.active_plan_for_conversation(conversation_id)) do
      :nothing
    else
      fold_confirm_accept(conversation_id, user_id, body)
    end
  end

  defp fold_confirm_fallback(conversation_id, user_id, "reject", _body) do
    alias OpalCore.SocialFlow.ConversationAlignment

    # Same no-plan gate as the accept branch: keep_committed_plan's
    # opening sync would materialize a plan on a planless thread.
    if is_nil(ConversationAlignment.active_plan_for_conversation(conversation_id)) do
      :nothing
    else
      case ConversationAlignment.keep_committed_plan(conversation_id, user_id) do
        {:ok, _state} -> :settled
        _ -> :nothing
      end
    end
  end

  defp fold_confirm_fallback(_, _, _, _), do: :nothing

  defp fold_confirm_accept(conversation_id, user_id, body) do
    alias OpalCore.SocialFlow.ConversationAlignment

    case ConversationAlignment.accept_committed_change(conversation_id, user_id) do
      {:ok, _state} ->
        :settled

      _ ->
        clock_hint = OpalCore.SocialFlow.PlanIdentity.parse_clock(body || "")

        case OpalCore.SocialFlow.settle_fold_confirmed_change(
               conversation_id,
               user_id,
               clock_hint
             ) do
          :already_settled -> :settled
          _ -> :nothing
        end
    end
  end

  # Repair #18: resolve the schedule-change target. The utterance's own
  # reference (payload plan_ref, else the body) is scored against the
  # user's active plans via SocialFlow.resolve_plan_candidates/2 - the
  # Center resolver's discipline. A tie at the top is ambiguous; a
  # unique named plan wins over the thread's newest plan; no reference
  # (or a reference matching only the thread plan) keeps the legacy
  # thread-context target.
  defp schedule_target(d, conversation_id, user_id) do
    active = active_plan(conversation_id)
    ref = d.payload["plan_ref"] || d.payload["body"] || ""
    words = OpalCore.SocialFlow.plan_ref_words(to_string(ref))

    candidates =
      if words == [], do: [], else: OpalCore.SocialFlow.resolve_plan_candidates(user_id, words)

    case candidates do
      [] ->
        if active, do: {:ok, active}, else: :no_plan

      [%{"score" => top} | _] = all ->
        tied = Enum.filter(all, &(&1["score"] == top))

        cond do
          length(tied) > 1 ->
            {:ambiguous, Enum.take(tied, 5)}

          active && hd(tied)["plan_id"] == active.id ->
            {:ok, active}

          true ->
            case OpalCore.Repo.get(OpalCore.SocialFlow.SharedPlan, hd(tied)["plan_id"]) do
              %OpalCore.SocialFlow.SharedPlan{} = plan -> {:ok, plan}
              nil -> if active, do: {:ok, active}, else: :no_plan
            end
        end
    end
  end

  defp run_schedule_change_on_plan(
         d,
         kind,
         new_value,
         change_fn,
         plan,
         conversation_id,
         user_id,
         base
       ) do
    case change_fn.(%{
           plan_id: plan.id,
           user_id: user_id,
           new_value: new_value,
           trace_id: d.id
         }) do
      {:ok, %{plan: _updated}} ->
        notify(
          conversation_id,
          d.id,
          "Done — moved to #{new_value}.",
          Map.merge(base, %{"plan_id" => plan.id, "changed" => true, "new_value" => new_value})
        )

      {:error, :not_authorized} when kind == "time" ->
        propose_time_revision(d, plan, user_id, new_value, conversation_id, base)

      {:error, reason} ->
        notify(
          conversation_id,
          d.id,
          "I couldn't change the #{kind} (#{human_reason(reason)}). Nothing was changed.",
          Map.merge(base, %{"plan_id" => plan.id, "error" => inspect(reason)})
        )
    end
  end

  # Repair #17 (W4-1) — non-lead time change → revision proposal + truthful
  # proposing copy. Never claims the change is done; the current time stays
  # in force until a required approver confirms.
  defp propose_time_revision(d, plan, user_id, new_value, conversation_id, base) do
    case OpalCore.SocialFlow.propose_revision(%{
           plan_id: plan.id,
           proposed_by_user_id: user_id,
           changes: %{"time_label" => new_value},
           trace_id: d.id
         }) do
      {:ok, %{revision: revision}} ->
        current = plan.time_label || "the current time"

        notify(
          conversation_id,
          d.id,
          "Proposing #{new_value} — I've sent that change to the other person on this plan. " <>
            "It stays at #{current} until they confirm.",
          Map.merge(base, %{
            "plan_id" => plan.id,
            "proposed" => true,
            "revision_id" => revision.id,
            "new_value" => new_value
          })
        )

      {:error, reason} ->
        notify(
          conversation_id,
          d.id,
          "I couldn't propose that change (#{human_reason(reason)}). Nothing was changed.",
          Map.merge(base, %{"plan_id" => plan.id, "error" => inspect(reason)})
        )
    end
  end

  # Repair #11 — cancel disambiguation against the conversation's active plan.
  defp route_plan_cancel(d, plan, user_id, body, conversation_id, base) do
    speaker = display_name(user_id)
    title = plan.title || "the plan"

    cond do
      withdrawal_phrasing?(body) and not whole_plan_phrasing?(body) ->
        case JourneyAuthority.cant_make_it(plan.id, user_id, %{}) do
          {:ok, _} ->
            notify(
              conversation_id,
              d.id,
              "#{speaker} can't make it. Noted for \"#{title}\". The plan itself is unchanged.",
              Map.merge(base, %{"kind" => "withdrawal", "plan_id" => plan.id})
            )

          {:error, reason} ->
            notify(
              conversation_id,
              d.id,
              "I couldn't record that just now (#{human_reason(reason)}). Nothing was changed.",
              Map.merge(base, %{"kind" => "withdrawal", "error" => inspect(reason)})
            )
        end

      proposal_phrasing?(body) or (whole_plan_phrasing?(body) and not organizer?(plan, user_id)) ->
        lead_in =
          if whole_plan_phrasing?(body),
            do: "Only the organizer can cancel the whole plan outright. ",
            else: ""

        case OpalCore.SocialFlow.propose_cancel_revision(%{
               plan_id: plan.id,
               user_id: user_id,
               trace_id: d.id
             }) do
          {:ok, _} ->
            notify(
              conversation_id,
              d.id,
              "#{lead_in}I've proposed cancelling \"#{title}\". The group needs to weigh in before anything changes.",
              Map.merge(base, %{"kind" => "propose_cancel", "plan_id" => plan.id})
            )

          {:error, reason} ->
            notify(
              conversation_id,
              d.id,
              "I couldn't propose that cancellation (#{human_reason(reason)}). Nothing was changed.",
              Map.merge(base, %{"kind" => "propose_cancel", "error" => inspect(reason)})
            )
        end

      whole_plan_phrasing?(body) ->
        # Speaker is the organizer (non-organizers took the proposal branch above).
        case OpalCore.SocialFlow.cancel_plan(%{
               plan_id: plan.id,
               user_id: user_id,
               trace_id: d.id
             }) do
          {:ok, %{notify_user_ids: ids}} ->
            others =
              ids
              |> List.wrap()
              |> Enum.reject(&(&1 == user_id))
              |> Enum.map(&display_name/1)
              |> Enum.reject(&(&1 == "" or &1 == "You"))

            notified =
              case others do
                [] -> "Everyone involved has been notified."
                [_one] -> "The other participant was notified."
                many -> "#{length(many)} other participants were notified."
              end

            notify(
              conversation_id,
              d.id,
              "Plan cancelled by #{speaker}. #{notified}",
              Map.merge(base, %{"kind" => "organizer_cancel", "plan_id" => plan.id})
            )

          {:ok, _} ->
            notify(
              conversation_id,
              d.id,
              "Plan cancelled by #{speaker}.",
              Map.merge(base, %{"kind" => "organizer_cancel", "plan_id" => plan.id})
            )

          {:error, reason} ->
            notify(
              conversation_id,
              d.id,
              "I couldn't cancel the plan (#{human_reason(reason)}). Nothing was changed.",
              Map.merge(base, %{"kind" => "organizer_cancel", "error" => inspect(reason)})
            )
        end

      true ->
        # Bare "cancel" — ambiguous scope. Ask one question; change nothing.
        notify(
          conversation_id,
          d.id,
          "Just to be clear: do you want to cancel just for yourself, or cancel the whole plan for everyone?",
          Map.merge(base, %{"kind" => "clarify", "no_state_change" => true})
        )
    end
  end

  # The conversation's active plan (mirrors SocialFlow.latest_plan/1, which is private).
  # Repair #17 (W4-1) — ordering must match SocialFlow.latest_plan/1 exactly
  # (updated_at desc, inserted_at desc, via ConversationAlignment). The old
  # inserted_at-only ordering diverged whenever a conversation held more than
  # one active plan: a change/confirm executed here could land on a different
  # plan row than the one confirm_pending_revision/1 and the sync surfaces
  # resolve — a change proposed on plan A and a confirm consumed on plan B.
  defp active_plan(conversation_id) when is_binary(conversation_id) do
    OpalCore.SocialFlow.ConversationAlignment.active_plan_for_conversation(conversation_id)
  end

  defp active_plan(_), do: nil

  # Organizer = lead/co_lead participant, falling back to the plan creator
  # (chat-created plans may predate role assignment).
  defp organizer?(%SharedPlan{} = plan, user_id) when is_binary(user_id) do
    role =
      from(pp in PlanParticipant,
        where: pp.plan_id == ^plan.id and pp.user_id == ^user_id,
        select: pp.role,
        limit: 1
      )
      |> Repo.one()

    role in ["lead", "co_lead"] or plan.created_by_user_id == user_id
  end

  defp organizer?(_, _), do: false

  defp display_name(user_id) when is_binary(user_id) do
    case Repo.get(User, user_id) do
      %User{display_name: name} when is_binary(name) and name != "" -> name
      _ -> "You"
    end
  end

  defp display_name(_), do: "You"

  defp withdrawal_phrasing?(body) when is_binary(body), do: Regex.match?(@withdrawal_re, body)
  defp withdrawal_phrasing?(_), do: false

  defp proposal_phrasing?(body) when is_binary(body), do: Regex.match?(@proposal_cancel_re, body)
  defp proposal_phrasing?(_), do: false

  defp whole_plan_phrasing?(body) when is_binary(body),
    do: Regex.match?(@whole_plan_cancel_re, body)

  defp whole_plan_phrasing?(_), do: false

  defp reject_phrasing?(body) when is_binary(body), do: Regex.match?(@reject_re, body)
  defp reject_phrasing?(_), do: false

  defp human_reason(:not_authorized), do: "you don't have the authority for that"
  defp human_reason(:not_found), do: "I couldn't find it"
  defp human_reason(:no_pending_revision), do: "there's nothing pending"
  defp human_reason(:already_decided), do: "it was already decided"
  defp human_reason(other), do: inspect(other)

  @doc """
  Resolve the dedicated Opal/bot sender id from OPAL_INTELLIGENCE_SENDER_USER_ID.

  No default in code: unset/empty → {:error, :opal_sender_not_configured} and the
  intelligence layer logs instead of posting. Never impersonates a human.
  """
  def resolve_opal_sender_id do
    case System.get_env(@opal_sender_env) do
      id when is_binary(id) and id != "" -> {:ok, id}
      _ -> {:error, :opal_sender_not_configured}
    end
  end

  @doc """
  Guard: the intelligence layer may only post as the configured Opal sender id.
  Any other sender id → {:error, :unsafe_sender}. Never render LLM text as a human.
  """
  def ensure_safe_sender(sender_id) when is_binary(sender_id) do
    # Fail closed: an unconfigured sender env is indistinguishable from a
    # wrong sender id — both refuse with :unsafe_sender. Callers only handle
    # one refusal shape; the :opal_sender_not_configured detail stays inside
    # resolve_opal_sender_id/0.
    case resolve_opal_sender_id() do
      {:ok, bot_id} when sender_id == bot_id -> :ok
      _ -> {:error, :unsafe_sender}
    end
  end

  def ensure_safe_sender(_), do: {:error, :unsafe_sender}

  # Post one durable Opal notification. A failed post never rewrites a
  # successful state change into a failure — it is reported honestly.
  defp notify(conversation_id, decision_id, body, meta) when is_binary(body) do
    case post_opal_message(conversation_id, body, decision_id) do
      {:ok, posted} ->
        {:ok, Map.merge(meta, posted)}

      {:error, reason} ->
        Logger.warning(
          "intelligence.notify_failed decision=#{decision_id} reason=#{inspect(reason)}"
        )

        {:ok,
         Map.merge(meta, %{
           "notification" => "failed",
           "notification_error" => inspect(reason)
         })}
    end
  end

  defp post_opal_message(conversation_id, body, decision_id) do
    case resolve_opal_sender_id() do
      {:error, _} ->
        # No dedicated Opal sender configured — log as filament-ready payload (honest).
        Logger.info(
          "intelligence.respond_thread_queued decision=#{decision_id} conversation=#{conversation_id} body=#{String.slice(body, 0, 80)}"
        )

        {:ok,
         %{
           "queued_filament" => true,
           "body" => body,
           "conversation_id" => conversation_id,
           "note" => "Set OPAL_INTELLIGENCE_SENDER_USER_ID to post as Opal user"
         }}

      {:ok, sender_id} ->
        attrs = %{
          conversation_id: conversation_id,
          sender_user_id: sender_id,
          client_message_id: "intel-#{decision_id}",
          message_type: "text",
          body: body
        }

        case Messages.accept_message(attrs) do
          {:ok, message, _} ->
            {:ok, %{"message_id" => message.id, "delivered" => true}}

          {:error, reason} ->
            {:error, reason}
        end
    end
  end

  defp update_log(log, status, result, attempts) do
    log
    |> ActionLog.changeset(%{status: status, result: stringify(result), attempts: attempts})
    |> Repo.update()
  end

  defp update_log!(log, status, result, attempts) do
    {:ok, row} = update_log(log, status, result, attempts)
    row
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end

  defp stringify(other), do: %{"value" => inspect(other)}
end
