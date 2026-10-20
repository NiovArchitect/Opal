defmodule OpalCore.SocialFlow.NonResponseEtiquette do
  @moduledoc """
  Founder Polish Wave, Cluster I (P13) + P14 - the unanswered-request
  lifecycle, built ON the existing follow-through machinery (no parallel
  system):

  - Durable state is a `TemporalFollowThroughLoop` of kind
    `invitation_response` (registered through `TemporalFollowThrough.register/1`,
    idempotent per participant), exactly like the R16 producers
    (`FollowThroughProducers`) register `waiting_on` / `open_question` loops.
  - Notices are `AttentionSignal` rows (the existing private reveal /
    needs-you path, read back through `FollowThrough.needs_you/1`):
    `needs_answer` for the nudge, the graceful fork, and the requester
    escalation; `non_response_closure` for the closure notices.
  - Every transition writes an `AuditEvent` (the audit ledger) and the
    loop's metadata. The PRIVATE truth about how a request closed
    (recipient's own tap, Opal on their behalf, requester letting go)
    lives only in the ledger + loop metadata + the signal's private
    `source_lineage`. No contract copy and no participant row ever says
    "auto-declined for silence": on every surface the closure reads as
    a plain decline.

  ## Timing - event-driven, NO polling (architecture law)

  Production proactivity is event-driven. There is no poll loop, no
  GenServer timer, no cron sweep in this feature. When a request opens,
  ONE Oban job (`NonResponseEtiquetteWorker`) is enqueued with
  `scheduled_at` set to the next stage's due instant; each stage, when
  it fires, enqueues exactly one follow-up job for the next stage.
  Jobs are due-guarded: a stale job (stage no longer current, request
  already answered, plan terminal) is an honest no-op, so replayed or
  superseded jobs can never mutate current state. Quiet hours defer a
  stage (the stage re-enqueues one hour later in production) instead
  of disturbing the recipient.

  ## Lifecycle (stages on the loop metadata)

      awaiting --(grace ends)--> nudged --(fork due)--> forked
      forked --(fork window ends)--> auto-decline (mode permitting)
                                  \-> escalated (mode / consequential gate)
      escalated --(requester: nudge_again)--> forked (fresh fork window)
                --(requester: extend)-------> forked (extended window)
                --(requester: let_it_go)---> closed (requester-initiated)
      any open stage --(recipient: decline)---------> closed (plain decline)
                     --(recipient: ask_another_time)-> resolved (another time)
                     --(recipient answers elsewhere)-> resolved (responded)

  Intervals are constants (founder-tunable, named here as their rule
  source - the P13/P14 ruling set them; no repo constant predates them):

  - No creator window: grace (nudge) at 24h, fork at 72h, fork window 24h.
  - Creator window (P14): the window IS the timing source. Grace ends
    (nudge + limbo begins) halfway through the window, the fork fires
    exactly at window close, and the fork window is 24h.

  ## Limbo (P14)

  Past grace and still unanswered, a request is in LIMBO - a first-class
  state in this module's projection (`projection_for/3`), not a plan
  status. The sender's limbo copy reads as waiting; the recipient's
  reads as a window still kindly open. The web treatment is the cooling
  treatment (amber cooling toward muted by the remaining fraction,
  pattern channel `cooling-lines`) - never the action red, which stays
  reserved for true needs-you states.

  ## Mode gate (whose mode, and what it permits)

  Auto-decline acts ON BEHALF of the non-responder, so the
  NON-RESPONDER's proactivity mode governs (their `AssistancePreference`
  - the Soul room record, the same one `FollowThrough` reads):

  - `proactive` ("More forward") = handle-the-small-things: Opal may
    auto-decline a NON-consequential request after the fork window.
  - `balanced` ("waits for your say-so before it acts") and `minimal`
    ("Only when I ask") = check-with-me-first: Opal never auto-declines;
    the lifecycle escalates to the requester's approval queue instead.
  - Consequential requests (see `consequential?/2`) NEVER auto-decline
    in any mode; they escalate. The mode's permission for consequential
    auto-decline does not exist in the current Settings vocabulary, and
    this module does not invent it.

  ## Plan-state law

  The single `PlanTransition` gate is untouched. The one lifecycle
  outcome that changes plan state - releasing the requester's hold on a
  1:1 auto-decline / let-it-go - cancels the plan ONLY through
  `PlanTransition.guard_changeset(:plan, :cancel)`, mirroring
  `SocialFlow.cancel_plan/1`. A group plan is never cancelled by this
  lifecycle: the participant's attendance truth updates (pending ->
  declined) and the group proceeds.
  """

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Contracts
  alias OpalCore.Messaging.ConversationMember
  alias OpalCore.Relationships
  alias OpalCore.Repo

  alias OpalCore.SocialFlow.{
    AssistancePreference,
    AttentionSignal,
    AuditEvent,
    Clock,
    FollowThrough,
    PlanCommitment,
    PlanParticipant,
    PlanTransition,
    QuietHours,
    SharedPlan,
    TemporalFollowThrough,
    TemporalFollowThroughLoop
  }

  @trace "trace-non-response-etiquette"
  @kind "invitation_response"

  # --- Ruled intervals (seconds). Rule source: P13/P14 ruling, named
  # constants so the founder can retune them in one place. ---
  @grace_seconds 24 * 3600
  @fork_at_seconds 72 * 3600
  @fork_window_seconds 24 * 3600
  @extend_seconds 48 * 3600
  @quiet_defer_seconds 3600
  @consequential_start_within_seconds 48 * 3600
  @window_min_seconds 3600
  @window_max_seconds 14 * 24 * 3600

  def grace_seconds, do: @grace_seconds
  def fork_at_seconds, do: @fork_at_seconds
  def fork_window_seconds, do: @fork_window_seconds
  def kind, do: @kind

  # =====================================================================
  # Copy deck - plain, warm, shame-free. Every user-facing string this
  # feature emits is produced ONLY by the functions in this section, so
  # the copy scan (test + report grep) covers the whole surface.
  # =====================================================================

  def nudge_copy(title),
    do:
      "Just a friendly nudge about #{title}. Whenever you have a moment, a yes or a no is plenty - both are completely okay."

  def fork_copy(title),
    do:
      "Still thinking about #{title}? There is no wrong answer here. If this time does not work, you can say so with one tap, or ask if another time could work instead."

  def fork_actions,
    do: [
      %{"id" => "decline", "label" => "I cannot make it"},
      %{"id" => "ask_another_time", "label" => "Could another time work?"}
    ]

  def nudge_actions, do: fork_actions()

  def recipient_closure_copy(title),
    do:
      "The invitation to #{title} is closed. Thank you for considering it - you are welcome to start a fresh plan any time."

  def requester_closure_copy(recipient_name, title),
    do:
      "#{recipient_name} is not able to make it to #{title}, so this plan is closed and your time is free again. You can start a new plan whenever you like."

  def group_closure_copy(recipient_name, title),
    do:
      "#{recipient_name} is not able to make it to #{title}. The plan can go ahead with everyone else - nothing is on hold."

  def another_time_copy(recipient_name, title),
    do:
      "#{recipient_name} asked if another time could work for #{title}. The ball is in your court - pick a new time whenever you like."

  def escalation_copy(title),
    do:
      "Still waiting to hear back about #{title}. People get busy - you can nudge once more, give a little more time, or let this one go."

  def escalation_actions,
    do: [
      %{"id" => "nudge_again", "label" => "Nudge once more"},
      %{"id" => "extend", "label" => "Give more time"},
      %{"id" => "let_it_go", "label" => "Let it go"}
    ]

  def limbo_sender_copy(title),
    do: "Waiting to hear back about #{title}. We will share the answer as soon as it arrives."

  def limbo_recipient_copy(title),
    do:
      "Your answer window for #{title} is still open. A yes or a no is plenty - either answer is a kind one."

  def window_unavailable_circle_copy,
    do: "Response windows are only for people in your circles."

  def window_unavailable_mode_copy(recipient_name),
    do:
      "This plan already has commitments, and #{recipient_name} prefers to be asked first - a set window is not available here. You can still send the invitation without one."

  @doc "Every copy string this feature can emit, for the shame-scan pin."
  def all_copy do
    [
      nudge_copy("Dinner"),
      fork_copy("Dinner"),
      recipient_closure_copy("Dinner"),
      requester_closure_copy("Sam", "Dinner"),
      group_closure_copy("Sam", "Dinner"),
      another_time_copy("Sam", "Dinner"),
      escalation_copy("Dinner"),
      limbo_sender_copy("Dinner"),
      limbo_recipient_copy("Dinner"),
      window_unavailable_circle_copy(),
      window_unavailable_mode_copy("Sam")
    ] ++
      Enum.map(fork_actions() ++ escalation_actions(), & &1["label"])
  end

  # =====================================================================
  # Mode + consequence - the gate inputs
  # =====================================================================

  @doc """
  The proactivity mode family for a user, from their real
  AssistancePreference (Soul room record). `proactive` is the
  handle-the-small-things family; `balanced` / `minimal` (and a missing
  preference, which defaults to balanced) are check-with-me-first.
  """
  def mode_for(user_id) when is_binary(user_id) do
    case Repo.get_by(AssistancePreference, user_id: user_id) do
      %AssistancePreference{assistance_level: "proactive"} -> :handle_small_things
      %AssistancePreference{} -> :check_with_me_first
      nil -> :check_with_me_first
    end
  end

  def mode_for(_), do: :check_with_me_first

  @doc """
  Consequential, defined truthfully from the plan's own data (never
  guessed): the plan is already agreed or changed (a commitment, not
  just an invitation), OR a live commitment row exists for it (someone
  has promised work or money), OR it starts within 48 hours.
  """
  def consequential?(%SharedPlan{} = plan, now \\ Clock.utc_now()) do
    cond do
      plan.status in ["agreed", "changed"] ->
        true

      match?(%DateTime{}, plan.start_at) and
          DateTime.compare(
            plan.start_at,
            DateTime.add(now, @consequential_start_within_seconds, :second)
          ) != :gt ->
        true

      true ->
        from(c in PlanCommitment,
          where: c.plan_id == ^plan.id and c.status in ["proposed", "confirmed"]
        )
        |> Repo.exists?()
    end
  end

  # =====================================================================
  # P14 - response window (creator opt-in, relationship-gated)
  # =====================================================================

  @doc """
  True when `recipient_id` is within the creator's circles, from real
  relationship evidence only: a typed relationship row
  (`Relationships.get_type/2`, the creator's own label) OR co-membership
  in the plan's conversation. No evidence = not in circle - honestly.
  """
  def in_creator_circle?(creator_id, recipient_id, %SharedPlan{} = plan) do
    cond do
      not is_nil(Relationships.get_type(creator_id, recipient_id)) ->
        true

      is_binary(plan.conversation_id) ->
        members =
          from(m in ConversationMember,
            where: m.conversation_id == ^plan.conversation_id,
            select: m.user_id
          )
          |> Repo.all()

        creator_id in members and recipient_id in members

      true ->
        false
    end
  end

  @doc """
  Set a creator-opt-in response window on a pending invitation.
  The window is data on the request (the PlanParticipant row) and
  becomes the lifecycle's timing source. Refusals are honest:

  - `:not_creator` - only the plan's creator may set a window.
  - `:not_pending` - the recipient has already answered.
  - `:outside_creator_circle` - P14 relationship gate (pinned).
  - `:window_unavailable_consequential_mode` - P14 ethics: a
    consequential plan + a check-with-me-first recipient mode means no
    countdown; the UI declares this state from `window_projection/3`.
  - `:invalid_window` - outside the dosed bounds (1 hour to 14 days).
  """
  def set_response_window(
        %{
          plan_id: plan_id,
          creator_id: creator_id,
          recipient_id: recipient_id,
          window_seconds: window_seconds
        },
        opts \\ []
      ) do
    now = Keyword.get(opts, :now) || Clock.utc_now()

    with %SharedPlan{} = plan <- Repo.get(SharedPlan, plan_id),
         %PlanParticipant{} = participant <-
           Repo.get_by(PlanParticipant, plan_id: plan_id, user_id: recipient_id),
         true <- plan.created_by_user_id == creator_id,
         true <- PlanParticipant.pending_state?(participant.response_state),
         true <-
           is_integer(window_seconds) and window_seconds >= @window_min_seconds and
             window_seconds <= @window_max_seconds do
      cond do
        not in_creator_circle?(creator_id, recipient_id, plan) ->
          {:error, :outside_creator_circle}

        consequential?(plan, now) and mode_for(recipient_id) == :check_with_me_first ->
          {:error, :window_unavailable_consequential_mode}

        true ->
          closes_at = DateTime.add(now, window_seconds, :second)

          {:ok, participant} =
            participant
            |> PlanParticipant.changeset(%{
              response_window_seconds: window_seconds,
              response_window_closes_at: closes_at
            })
            |> Repo.update()

          # If the lifecycle is already open, the window becomes its
          # timing source from here on (stage dues are computed from
          # the loop metadata at each advance, never cached in jobs).
          case open_loop_for(participant.id) do
            %TemporalFollowThroughLoop{} = loop ->
              update_loop_metadata(loop, %{
                "window_closes_at" => DateTime.to_iso8601(closes_at),
                "window_seconds" => window_seconds
              })

            nil ->
              :ok
          end

          audit!(plan, creator_id, "non_response.window_set", %{
            "participant_id" => participant.id,
            "recipient_user_id" => recipient_id,
            "window_seconds" => window_seconds,
            "window_closes_at" => DateTime.to_iso8601(closes_at)
          })

          {:ok, participant}
      end
    else
      nil -> {:error, :not_found}
      false -> {:error, refusal_for(plan_id, creator_id, recipient_id, window_seconds)}
      {:error, _} = err -> err
    end
  end

  defp refusal_for(_plan_id, _creator_id, _recipient_id, window_seconds)
       when not is_integer(window_seconds) or window_seconds < @window_min_seconds or
              window_seconds > @window_max_seconds,
       do: :invalid_window

  defp refusal_for(plan_id, creator_id, recipient_id, _window_seconds) do
    plan = Repo.get(SharedPlan, plan_id)
    participant = Repo.get_by(PlanParticipant, plan_id: plan_id, user_id: recipient_id)

    cond do
      is_nil(plan) or is_nil(participant) -> :not_found
      plan.created_by_user_id != creator_id -> :not_creator
      true -> :not_pending
    end
  end

  # =====================================================================
  # Open the lifecycle (called when a request/invitation is created)
  # =====================================================================

  @doc """
  Open the non-response lifecycle for one pending participant of a plan.
  Registers the durable TFT loop (idempotent) and enqueues the single
  stage job for the grace deadline. `opts[:now]` pins the request
  instant (tests / staging an aged request); `opts[:requested_at]`
  backdates the request instant for staging - the same public path the
  frame instructions use.
  """
  def open_request(
        %{plan_id: plan_id, requester_id: requester_id, recipient_id: recipient_id},
        opts \\ []
      ) do
    now = Keyword.get(opts, :now) || Clock.utc_now()
    requested_at = Keyword.get(opts, :requested_at) || now

    with %SharedPlan{} = plan <- Repo.get(SharedPlan, plan_id),
         %PlanParticipant{} = participant <-
           Repo.get_by(PlanParticipant, plan_id: plan_id, user_id: recipient_id),
         true <- PlanParticipant.pending_state?(participant.response_state),
         true <- requester_id != recipient_id do
      participant_ids = participant_user_ids(plan)
      group? = length(participant_ids) > 2

      metadata = %{
        "stage" => "awaiting",
        "requester_user_id" => requester_id,
        "recipient_user_id" => recipient_id,
        "participant_id" => participant.id,
        "requested_at" => DateTime.to_iso8601(requested_at),
        "group" => group?,
        "window_closes_at" =>
          participant.response_window_closes_at &&
            DateTime.to_iso8601(participant.response_window_closes_at),
        "window_seconds" => participant.response_window_seconds
      }

      case TemporalFollowThrough.register(%{
             "kind" => @kind,
             "source_id" => participant.id,
             "conversation_id" => plan.conversation_id,
             "plan_id" => plan.id,
             "owner_user_id" => requester_id,
             "responsibility_user_id" => recipient_id,
             "participant_ids" => participant_ids,
             "timezone" => plan.timezone || "America/Los_Angeles",
             "plan_start_at" => plan.start_at,
             "metadata" => metadata,
             "idempotency_key" => "invitation-response:participant:#{participant.id}"
           }) do
        {:ok, loop, origin} ->
          if origin == :created do
            audit!(plan, requester_id, "non_response.request_opened", %{
              "participant_id" => participant.id,
              "recipient_user_id" => recipient_id,
              "group" => group?,
              "window_set" => not is_nil(participant.response_window_closes_at)
            })

            schedule_stage(loop, "awaiting", nudge_due(loop))
          end

          {:ok, loop, origin}

        {:error, _} = err ->
          err
      end
    else
      nil -> {:error, :not_found}
      false -> {:error, :not_pending}
      {:error, _} = err -> err
    end
  end

  # =====================================================================
  # Stage machine - invoked ONLY by the scheduled stage job (or tests
  # driving the same entry the job drives). Due-guarded; never polls.
  # =====================================================================

  @doc """
  Advance one lifecycle loop if its current stage is due at `now`.
  Returns `{:ok, outcome}` with outcome one of `:nudged`, `:forked`,
  `:auto_declined`, `:escalated`, `:resolved_responded`,
  `:resolved_plan_terminal`, `:deferred_quiet_hours`, `:not_due`,
  `:stale_job` (the job's stage no longer matches), or
  `{:error, :not_found}`.
  """
  def advance(loop_id, opts \\ []) when is_binary(loop_id) do
    now = Keyword.get(opts, :now) || Clock.utc_now()
    job_stage = Keyword.get(opts, :stage)

    case Repo.get(TemporalFollowThroughLoop, loop_id) do
      %TemporalFollowThroughLoop{kind: @kind, status: "open"} = loop ->
        stage = loop.metadata["stage"] || "awaiting"

        if is_binary(job_stage) and job_stage != stage do
          {:ok, :stale_job}
        else
          advance_stage(loop, stage, now)
        end

      %TemporalFollowThroughLoop{} ->
        {:ok, :stale_job}

      nil ->
        {:error, :not_found}
    end
  end

  defp advance_stage(loop, stage, now) do
    plan = Repo.get(SharedPlan, loop.plan_id)
    participant = Repo.get(PlanParticipant, loop.metadata["participant_id"])

    cond do
      is_nil(plan) or is_nil(participant) ->
        {:error, :not_found}

      not PlanParticipant.pending_state?(participant.response_state) ->
        resolve_loop(loop, "responded", now)

        audit!(plan, participant.user_id, "non_response.resolved_by_response", %{
          "participant_id" => participant.id,
          "response_state" => participant.response_state
        })

        {:ok, :resolved_responded}

      plan.status in ["cancelled", "completed", "expired"] ->
        {:ok, _} = TemporalFollowThrough.complete(loop, %{"note" => "plan_terminal"})

        audit!(plan, loop.owner_user_id, "non_response.resolved_plan_terminal", %{
          "participant_id" => participant.id,
          "plan_status" => plan.status
        })

        {:ok, :resolved_plan_terminal}

      stage == "awaiting" ->
        if due?(nudge_due(loop), now) do
          maybe_deliver(loop, plan, participant, now, :nudge)
        else
          {:ok, :not_due}
        end

      stage == "nudged" ->
        if due?(fork_due(loop), now) do
          maybe_deliver(loop, plan, participant, now, :fork)
        else
          {:ok, :not_due}
        end

      stage == "forked" ->
        if due?(close_due(loop), now) do
          close_after_fork(loop, plan, participant, now)
        else
          {:ok, :not_due}
        end

      true ->
        # escalated: the requester owns the next move; no timer fires.
        {:ok, :not_due}
    end
  end

  # QUIET law: a stage that would disturb the recipient during their
  # quiet hours defers instead (prod: re-enqueued one hour later).
  defp maybe_deliver(loop, plan, participant, now, which) do
    recipient_id = participant.user_id

    if QuietHours.quiet_now?(recipient_id, now) do
      audit!(plan, recipient_id, "non_response.deferred_quiet_hours", %{
        "participant_id" => participant.id,
        "stage" => loop.metadata["stage"],
        "would_deliver" => Atom.to_string(which)
      })

      schedule_stage(
        loop,
        loop.metadata["stage"],
        DateTime.add(now, @quiet_defer_seconds, :second)
      )

      {:ok, :deferred_quiet_hours}
    else
      case which do
        :nudge ->
          {:ok, _signal} =
            emit_signal(%{
              owner_id: recipient_id,
              plan: plan,
              type: "needs_answer",
              copy: nudge_copy(plan.title),
              actions: nudge_actions(),
              idem: "non-response-nudge:#{participant.id}",
              lineage: %{"origin" => "non_response_nudge", "loop_id" => loop.id}
            })

          loop =
            update_loop_metadata(loop, %{
              "stage" => "nudged",
              "nudged_at" => DateTime.to_iso8601(now)
            })

          audit!(plan, recipient_id, "non_response.nudged", %{"participant_id" => participant.id})
          schedule_stage(loop, "nudged", fork_due(loop))
          {:ok, :nudged}

        :fork ->
          {:ok, _signal} =
            emit_signal(%{
              owner_id: recipient_id,
              plan: plan,
              type: "needs_answer",
              copy: fork_copy(plan.title),
              actions: fork_actions(),
              idem: "non-response-fork:#{participant.id}",
              lineage: %{"origin" => "non_response_fork", "loop_id" => loop.id}
            })

          loop =
            update_loop_metadata(loop, %{
              "stage" => "forked",
              "forked_at" => DateTime.to_iso8601(now),
              "close_due_at" =>
                DateTime.to_iso8601(DateTime.add(now, @fork_window_seconds, :second))
            })

          audit!(plan, recipient_id, "non_response.fork_presented", %{
            "participant_id" => participant.id
          })

          schedule_stage(loop, "forked", close_due(loop))
          {:ok, :forked}
      end
    end
  end

  # Silence past the fork window: the mode + consequence gate decides
  # between Opal declining on the recipient's behalf and escalating to
  # the requester's own approval queue. Never both, never neither.
  defp close_after_fork(loop, plan, participant, now) do
    recipient_id = participant.user_id
    mode = mode_for(recipient_id)

    if mode == :handle_small_things and not consequential?(plan, now) do
      decline_and_close(loop, plan, participant, %{
        now: now,
        source: "auto_decline_on_behalf",
        actor_id: recipient_id
      })
    else
      {:ok, _signal} =
        emit_signal(%{
          owner_id: loop.owner_user_id,
          plan: plan,
          type: "needs_answer",
          copy: escalation_copy(plan.title),
          actions: escalation_actions(),
          idem: "non-response-escalation:#{participant.id}:#{System.unique_integer([:positive])}",
          lineage: %{
            "origin" => "non_response_escalation",
            "loop_id" => loop.id,
            "mode" => Atom.to_string(mode),
            "consequential" => consequential?(plan, now)
          }
        })

      update_loop_metadata(loop, %{
        "stage" => "escalated",
        "escalated_at" => DateTime.to_iso8601(now)
      })

      audit!(plan, loop.owner_user_id, "non_response.escalated_to_requester", %{
        "participant_id" => participant.id,
        "mode" => Atom.to_string(mode),
        "consequential" => consequential?(plan, now)
      })

      {:ok, :escalated}
    end
  end

  # =====================================================================
  # Human answers - the fork choices and the escalation choices.
  # Decline is available at ANY stage, instantly (P14 ethics pin).
  # =====================================================================

  @doc """
  The recipient answers through the fork: `"decline"` (any open stage,
  one tap, no penalty theater) or `"ask_another_time"` (grace/fork
  stages). Returns the updated loop outcome.
  """
  def respond_as_recipient(%{plan_id: plan_id, user_id: user_id, action: action}, opts \\ [])
      when action in ["decline", "ask_another_time"] do
    now = Keyword.get(opts, :now) || Clock.utc_now()

    with %SharedPlan{} = plan <- Repo.get(SharedPlan, plan_id),
         %PlanParticipant{} = participant <-
           Repo.get_by(PlanParticipant, plan_id: plan_id, user_id: user_id),
         %TemporalFollowThroughLoop{} = loop <- open_loop_for(participant.id),
         true <- loop.metadata["recipient_user_id"] == user_id do
      case action do
        "decline" ->
          decline_and_close(loop, plan, participant, %{
            now: now,
            source: "recipient_decline",
            actor_id: user_id,
            release_hold: false
          })

        "ask_another_time" ->
          {:ok, _signal} =
            emit_signal(%{
              owner_id: loop.owner_user_id,
              plan: plan,
              type: "needs_answer",
              copy: another_time_copy(display_name(user_id), plan.title),
              actions: [],
              idem: "non-response-another-time:#{participant.id}",
              lineage: %{"origin" => "non_response_another_time", "loop_id" => loop.id}
            })

          resolve_loop(loop, "another_time", now)

          audit!(plan, user_id, "non_response.another_time_requested", %{
            "participant_id" => participant.id
          })

          {:ok, :another_time}
      end
    else
      nil -> {:error, :not_found}
      false -> {:error, :forbidden}
      {:error, _} = err -> err
    end
  end

  @doc """
  The requester answers their escalation: `"nudge_again"` (a fresh fork
  to the recipient), `"extend"` (a longer silence window, no new
  disturbance), or `"let_it_go"` (requester-initiated closure with the
  same hold release as an auto-decline).
  """
  def respond_as_requester(%{plan_id: plan_id, user_id: user_id, action: action}, opts \\ [])
      when action in ["nudge_again", "extend", "let_it_go"] do
    now = Keyword.get(opts, :now) || Clock.utc_now()

    with %SharedPlan{} = plan <- Repo.get(SharedPlan, plan_id),
         %TemporalFollowThroughLoop{} = loop <- open_loop_for_plan_recipient(plan_id),
         true <- loop.owner_user_id == user_id,
         true <- loop.metadata["stage"] == "escalated",
         %PlanParticipant{} = participant <-
           Repo.get(PlanParticipant, loop.metadata["participant_id"]) do
      case action do
        "nudge_again" ->
          {:ok, _signal} =
            emit_signal(%{
              owner_id: participant.user_id,
              plan: plan,
              type: "needs_answer",
              copy: fork_copy(plan.title),
              actions: fork_actions(),
              idem:
                "non-response-fork-again:#{participant.id}:#{System.unique_integer([:positive])}",
              lineage: %{"origin" => "non_response_fork", "loop_id" => loop.id}
            })

          loop =
            update_loop_metadata(loop, %{
              "stage" => "forked",
              "forked_at" => DateTime.to_iso8601(now),
              "close_due_at" =>
                DateTime.to_iso8601(DateTime.add(now, @fork_window_seconds, :second))
            })

          audit!(plan, user_id, "non_response.requester_nudged_again", %{
            "participant_id" => participant.id
          })

          schedule_stage(loop, "forked", close_due(loop))
          {:ok, :nudged_again}

        "extend" ->
          loop =
            update_loop_metadata(loop, %{
              "stage" => "forked",
              "close_due_at" => DateTime.to_iso8601(DateTime.add(now, @extend_seconds, :second)),
              "extended_at" => DateTime.to_iso8601(now)
            })

          audit!(plan, user_id, "non_response.requester_extended", %{
            "participant_id" => participant.id
          })

          schedule_stage(loop, "forked", close_due(loop))
          {:ok, :extended}

        "let_it_go" ->
          decline_and_close(loop, plan, participant, %{
            now: now,
            source: "requester_let_go",
            actor_id: user_id
          })
      end
    else
      nil -> {:error, :not_found}
      false -> {:error, :not_escalated}
      {:error, _} = err -> err
    end
  end

  # =====================================================================
  # The decline + closure core (shared by auto-decline, recipient
  # decline, and requester let-it-go). The participant row records a
  # PLAIN decline; the private source travels only in the ledger, the
  # loop metadata, and private signal lineage.
  # =====================================================================

  defp decline_and_close(
         loop,
         plan,
         participant,
         %{now: now, source: source, actor_id: actor_id} = ctx
       ) do
    release_hold? =
      Map.get(ctx, :release_hold, source in ["auto_decline_on_behalf", "requester_let_go"])

    group? = loop.metadata["group"] == true
    recipient_name = display_name(participant.user_id)

    result =
      Repo.transaction(fn ->
        {:ok, participant} =
          participant
          |> PlanParticipant.changeset(%{response_state: "declined", responded_at: now})
          |> Repo.update()

        hold_released =
          if release_hold? and not group? do
            cancel_plan_through_gate(plan, now)
          else
            false
          end

        {:ok, _} =
          emit_signal(%{
            owner_id: participant.user_id,
            plan: plan,
            type: "non_response_closure",
            copy: recipient_closure_copy(plan.title),
            actions: [],
            idem: "non-response-closure-recipient:#{participant.id}:#{source}",
            lineage: %{
              "origin" => "non_response_closure",
              "source" => source,
              "loop_id" => loop.id
            }
          })

        closure_copy =
          if group?,
            do: group_closure_copy(recipient_name, plan.title),
            else: requester_closure_copy(recipient_name, plan.title)

        {:ok, _} =
          emit_signal(%{
            owner_id: loop.owner_user_id,
            plan: plan,
            type: "non_response_closure",
            copy: closure_copy,
            actions: [],
            idem: "non-response-closure-requester:#{participant.id}:#{source}",
            lineage: %{
              "origin" => "non_response_closure",
              "source" => source,
              "loop_id" => loop.id
            }
          })

        if group? do
          for other_id <- participant_user_ids(plan),
              other_id not in [participant.user_id, loop.owner_user_id] do
            emit_signal(%{
              owner_id: other_id,
              plan: plan,
              type: "non_response_closure",
              copy: group_closure_copy(recipient_name, plan.title),
              actions: [],
              idem: "non-response-closure-group:#{participant.id}:#{other_id}:#{source}",
              lineage: %{
                "origin" => "non_response_closure",
                "source" => source,
                "loop_id" => loop.id
              }
            })
          end
        end

        audit!(plan, actor_id, "non_response.closed", %{
          "participant_id" => participant.id,
          "recipient_user_id" => participant.user_id,
          "source" => source,
          "group" => group?,
          "hold_released" => hold_released
        })

        %{participant: participant, hold_released: hold_released}
      end)

    case result do
      {:ok, %{hold_released: hold_released}} ->
        resolve_loop(loop, outcome_for(source), now)
        {:ok, :closed, %{hold_released: hold_released, source: source}}

      {:error, reason} ->
        {:error, reason}
    end
  end

  defp outcome_for("auto_decline_on_behalf"), do: "auto_declined"
  defp outcome_for("recipient_decline"), do: "declined_by_recipient"
  defp outcome_for("requester_let_go"), do: "let_go_by_requester"
  defp outcome_for(_), do: "closed"

  # The ONLY plan-state change in this feature, and it goes through the
  # single gate exactly like SocialFlow.cancel_plan/1 does. A gate
  # refusal (terminal / changed plan) is honest: no cancel, no crash.
  defp cancel_plan_through_gate(%SharedPlan{} = plan, now) do
    plan
    |> SharedPlan.changeset(%{status: "cancelled", cancelled_at: now})
    |> PlanTransition.guard_changeset(:plan, :cancel)
    |> Repo.update()
    |> case do
      {:ok, _updated} -> true
      {:error, _changeset} -> false
    end
  end

  # =====================================================================
  # Projections - one explicit output per viewer (Elixir owns truth;
  # surfaces render these and never re-derive limbo/window state).
  # =====================================================================

  @doc """
  The etiquette projection for one viewer of one plan's pending request:
  stage, limbo state + remaining window fraction + the viewer's own
  limbo copy, window truth (set / available / honest unavailable
  reason), and whether decline is available (always, for the recipient).
  """
  def projection_for(plan_id, viewer_id, opts \\ []) do
    now = Keyword.get(opts, :now) || Clock.utc_now()

    with %SharedPlan{} = plan <- Repo.get(SharedPlan, plan_id),
         %TemporalFollowThroughLoop{} = loop <- open_loop_for_viewer(plan_id, viewer_id) do
      recipient_id = loop.metadata["recipient_user_id"]
      requester_id = loop.metadata["requester_user_id"]
      stage = loop.metadata["stage"] || "awaiting"
      participant = Repo.get(PlanParticipant, loop.metadata["participant_id"])

      role =
        cond do
          viewer_id == recipient_id -> "recipient"
          viewer_id == requester_id -> "requester"
          true -> "group_member"
        end

      limbo? = stage in ["nudged", "forked", "escalated"]
      fraction = if limbo?, do: window_fraction_remaining(loop, now), else: nil

      %{
        "schema_version" => "0.1.0",
        "plan_id" => plan.id,
        "plan_title" => plan.title,
        "viewer_role" => role,
        "stage" => stage,
        "limbo" =>
          if limbo? do
            %{
              "state" => "limbo",
              "treatment" => "cooling",
              "pattern_channel" => "cooling-lines",
              "window_fraction_remaining" => fraction,
              "copy" =>
                if(role == "recipient",
                  do: limbo_recipient_copy(plan.title),
                  else: limbo_sender_copy(plan.title)
                )
            }
          end,
        "window" => window_projection(plan, participant, requester_id, recipient_id),
        "decline_available" => role == "recipient",
        "fork_available" => role == "recipient" and stage in ["nudged", "forked"],
        "generated_at" => DateTime.to_iso8601(now)
      }
    else
      nil -> nil
      _ -> nil
    end
  end

  @doc "Window truth for one participant row (used by the projection + UI state)."
  def window_projection(
        %SharedPlan{} = plan,
        %PlanParticipant{} = participant,
        creator_id,
        recipient_id
      ) do
    cond do
      not is_nil(participant.response_window_closes_at) ->
        %{
          "set" => true,
          "closes_at" => DateTime.to_iso8601(participant.response_window_closes_at),
          "seconds" => participant.response_window_seconds,
          "available" => true,
          "unavailable_reason" => nil
        }

      not in_creator_circle?(creator_id, recipient_id, plan) ->
        %{
          "set" => false,
          "closes_at" => nil,
          "seconds" => nil,
          "available" => false,
          "unavailable_reason" => window_unavailable_circle_copy()
        }

      consequential?(plan) and mode_for(recipient_id) == :check_with_me_first ->
        %{
          "set" => false,
          "closes_at" => nil,
          "seconds" => nil,
          "available" => false,
          "unavailable_reason" => window_unavailable_mode_copy(display_name(recipient_id))
        }

      true ->
        %{
          "set" => false,
          "closes_at" => nil,
          "seconds" => nil,
          "available" => true,
          "unavailable_reason" => nil
        }
    end
  end

  def window_projection(_, _, _, _) do
    %{
      "set" => false,
      "closes_at" => nil,
      "seconds" => nil,
      "available" => false,
      "unavailable_reason" => nil
    }
  end

  # Fraction of the burn-down still remaining at `now`: with a creator
  # window, requested_at -> window close; without one, requested_at ->
  # fork deadline. Clamped to [0.0, 1.0]; the cooling treatment cools
  # as this falls.
  defp window_fraction_remaining(loop, now) do
    start = parse_dt(loop.metadata["requested_at"])
    deadline = fork_due(loop)

    cond do
      is_nil(start) or is_nil(deadline) ->
        nil

      DateTime.compare(now, start) == :lt ->
        1.0

      DateTime.compare(now, deadline) != :lt ->
        0.0

      true ->
        total = DateTime.diff(deadline, start, :second)
        remaining = DateTime.diff(deadline, now, :second)
        if total > 0, do: Float.round(remaining / total, 4), else: 0.0
    end
  end

  # =====================================================================
  # Stage due computation - from loop metadata (the window is data)
  # =====================================================================

  defp requested_at(loop), do: parse_dt(loop.metadata["requested_at"])

  defp nudge_due(loop) do
    case parse_dt(loop.metadata["window_closes_at"]) do
      %DateTime{} = closes ->
        start = requested_at(loop)
        total = if start, do: DateTime.diff(closes, start, :second), else: @grace_seconds
        DateTime.add(start || closes, div(max(total, 0), 2), :second)

      nil ->
        DateTime.add(requested_at(loop) || Clock.utc_now(), @grace_seconds, :second)
    end
  end

  defp fork_due(loop) do
    case parse_dt(loop.metadata["window_closes_at"]) do
      %DateTime{} = closes -> closes
      nil -> DateTime.add(requested_at(loop) || Clock.utc_now(), @fork_at_seconds, :second)
    end
  end

  defp close_due(loop) do
    case parse_dt(loop.metadata["close_due_at"]) do
      %DateTime{} = due -> due
      nil -> DateTime.add(fork_due(loop), @fork_window_seconds, :second)
    end
  end

  defp due?(nil, _now), do: false
  defp due?(%DateTime{} = due, %DateTime{} = now), do: DateTime.compare(now, due) != :lt

  # =====================================================================
  # Internals - signals, loops, ledger, scheduling
  # =====================================================================

  defp emit_signal(%{
         owner_id: owner_id,
         plan: plan,
         type: type,
         copy: copy,
         actions: actions,
         idem: idem,
         lineage: lineage
       }) do
    now = Clock.utc_now()

    %AttentionSignal{}
    |> AttentionSignal.changeset(%{
      owner_user_id: owner_id,
      conversation_id: plan.conversation_id,
      plan_id: plan.id,
      signal_type: type,
      privacy_class: "private",
      status: "visible",
      copy: copy,
      actions: %{"items" => actions},
      surfaced_at: now,
      eligible_at: now,
      due_at: now,
      idempotency_key: idem,
      source_lineage: lineage
    })
    |> Repo.insert()
    |> case do
      {:ok, signal} ->
        broadcast_private(plan, owner_id, signal)
        {:ok, signal}

      {:error, _} = err ->
        err
    end
  end

  defp broadcast_private(plan, owner_id, signal) do
    if is_binary(plan.conversation_id) do
      envelope =
        Contracts.event_envelope(
          "social_flow:attention",
          %{
            "attention_signal" => AttentionSignal.to_contract(signal),
            "audience_user_id" => owner_id
          },
          @trace
        )

      Phoenix.PubSub.broadcast(
        OpalCore.PubSub,
        "social_flow:conversation:#{plan.conversation_id}",
        {:social_flow_event, "social_flow:attention", envelope}
      )
    end

    :ok
  end

  defp open_loop_for(participant_id) do
    Repo.get_by(TemporalFollowThroughLoop,
      kind: @kind,
      idempotency_key: "invitation-response:participant:#{participant_id}"
    )
    |> case do
      %TemporalFollowThroughLoop{status: "open"} = loop -> loop
      _ -> nil
    end
  end

  defp open_loops_for_plan(plan_id) do
    from(l in TemporalFollowThroughLoop,
      where: l.kind == @kind and l.plan_id == ^plan_id and l.status == "open",
      order_by: [asc: l.inserted_at]
    )
    |> Repo.all()
  end

  # A plan can carry several pending recipients (group requests), each
  # with its own loop. The projection must judge the loop that belongs
  # to THIS viewer - never the first loop that happens to exist - or a
  # second recipient would be mis-roled as a bystander on their own
  # invitation. (Finisher repair: the WIP took the first loop only.)
  defp open_loop_for_viewer(plan_id, viewer_id) do
    loops = open_loops_for_plan(plan_id)

    Enum.find(loops, &(&1.metadata["recipient_user_id"] == viewer_id)) ||
      Enum.find(loops, &(&1.metadata["requester_user_id"] == viewer_id)) ||
      List.first(loops)
  end

  # The requester's escalation answer must land on the loop that is
  # actually escalated, not the first open loop for the plan.
  # (Finisher repair: same first-loop defect as the projection.)
  defp open_loop_for_plan_recipient(plan_id) do
    loops = open_loops_for_plan(plan_id)

    Enum.find(loops, &(&1.metadata["stage"] == "escalated")) || List.first(loops)
  end

  defp update_loop_metadata(%TemporalFollowThroughLoop{} = loop, changes) do
    {:ok, updated} =
      loop
      |> TemporalFollowThroughLoop.changeset(%{
        metadata: Map.merge(loop.metadata || %{}, changes),
        last_evaluated_at: Clock.utc_now()
      })
      |> Repo.update()

    updated
  end

  defp resolve_loop(loop, outcome, now) do
    {:ok, _} =
      loop
      |> TemporalFollowThroughLoop.changeset(%{
        status: "completed",
        maturity: "resolved",
        last_evaluated_at: now,
        metadata:
          Map.merge(loop.metadata || %{}, %{
            "stage" => "closed",
            "outcome" => outcome,
            "closed_at" => DateTime.to_iso8601(now)
          })
      })
      |> Repo.update()

    :ok
  end

  defp audit!(plan, actor_id, event_type, payload) do
    %AuditEvent{}
    |> AuditEvent.changeset(%{
      conversation_id: plan.conversation_id,
      plan_id: plan.id,
      actor_user_id: actor_id,
      event_type: event_type,
      payload: payload,
      trace_id: @trace
    })
    |> Repo.insert!()

    :ok
  end

  # Event-driven scheduling: ONE Oban job per stage, enqueued at the
  # transition that creates the deadline, `scheduled_at` = the due
  # instant. Test env follows the Reminders pattern (Oban testing is
  # :inline and would fire immediately regardless of scheduled_at), so
  # tests drive advance/2 - the exact entry the worker calls - with
  # pinned clocks instead of real sleeps.
  defp schedule_stage(loop, stage, %DateTime{} = at) do
    if Mix.env() == :test do
      {:ok, :test_skip_schedule}
    else
      %{loop_id: loop.id, stage: stage}
      |> OpalCore.SocialFlow.NonResponseEtiquetteWorker.new(scheduled_at: at)
      |> Oban.insert()
    end
  rescue
    e -> {:error, Exception.message(e)}
  end

  defp participant_user_ids(%SharedPlan{} = plan) do
    ids =
      from(p in PlanParticipant, where: p.plan_id == ^plan.id, select: p.user_id)
      |> Repo.all()
      |> Enum.filter(&is_binary/1)

    ids =
      if ids == [] and is_binary(plan.conversation_id) do
        from(m in ConversationMember,
          where: m.conversation_id == ^plan.conversation_id,
          select: m.user_id
        )
        |> Repo.all()
        |> Enum.filter(&is_binary/1)
      else
        ids
      end

    Enum.uniq([plan.created_by_user_id | ids] -- [nil])
  end

  defp display_name(user_id) do
    case Repo.get(User, user_id) do
      %User{display_name: name} when is_binary(name) and name != "" -> name
      _ -> "Your guest"
    end
  end

  defp parse_dt(nil), do: nil

  defp parse_dt(%DateTime{} = dt), do: dt

  defp parse_dt(iso) when is_binary(iso) do
    case DateTime.from_iso8601(iso) do
      {:ok, dt, _} -> DateTime.truncate(dt, :microsecond)
      _ -> nil
    end
  end

  defp parse_dt(_), do: nil

  # Needs-you read path re-export for callers/tests: the lifecycle's
  # notices are ordinary private AttentionSignals.
  defdelegate needs_you(user_id), to: FollowThrough
end
