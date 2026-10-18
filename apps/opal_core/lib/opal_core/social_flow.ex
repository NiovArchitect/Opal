defmodule OpalCore.SocialFlow do
  @moduledoc """
  Authoritative Social Flow lifecycle for Slice SF-1 (adult two-user).

  Python proposes candidates only. Elixir owns plan/commitment/reminder/revision truth.
  """

  import Ecto.Query

  alias OpalCore.{Contracts, Repo}
  alias OpalCore.Events.Publisher
  alias OpalCore.Messaging.ConversationMember

  alias OpalCore.SocialFlow.{
    AuditEvent,
    FollowThroughProducers,
    JourneyAuthority,
    PlanAgreementTasteBridge,
    PlanCommitment,
    PlanOption,
    PlanOptionResponse,
    PlanParticipant,
    PlanIdentity,
    PlanRecentChanges,
    PlanReminder,
    PlanRevision,
    PlanProjection,
    PlanTransition,
    Proposal,
    SharedPlan,
    Signal
  }

  @trace_default "trace-social-flow-1"

  # --- AI result → proposal (never creates shared plan) ---

  def create_proposal_from_ai_result(attrs) when is_map(attrs) do
    conversation_id = fetch!(attrs, :conversation_id)
    requester_user_id = fetch!(attrs, :requester_user_id)
    output = fetch!(attrs, :output) |> stringify_keys()
    ai_job_id = Map.get(attrs, :ai_job_id) || Map.get(attrs, "ai_job_id")
    consent_proof_id = Map.get(attrs, :consent_proof_id) || Map.get(attrs, "consent_proof_id")

    source_message_ids =
      Map.get(attrs, :source_message_ids) || Map.get(attrs, "source_message_ids") || []

    trace_id = Map.get(attrs, :trace_id) || Map.get(attrs, "trace_id") || @trace_default

    with :ok <- ensure_member(conversation_id, requester_user_id) do
      result_type = output["result_type"] || "no_plan"
      candidate = output["candidate"]

      cond do
        result_type == "no_plan" ->
          {:ok, :no_proposal}

        # Repair #11 (two-user harness): revision_confirmation carries its
        # decision in output["decision"] and needs no candidate object. It must
        # be evaluated before the is_nil(candidate) guard, or NL "I confirm"
        # is unreachable whenever the classifier omits a candidate.
        result_type == "revision_confirmation" ->
          decision =
            case (candidate || %{})["decision"] || output["decision"] do
              d when d in ["accept", "reject"] -> d
              _ -> "accept"
            end

          confirm_pending_revision(%{
            conversation_id: conversation_id,
            user_id: requester_user_id,
            decision: decision,
            trace_id: trace_id
          })

        is_nil(candidate) ->
          {:ok, :no_proposal}

        result_type == "commitment_candidate" ->
          handle_commitment_candidate(
            conversation_id,
            requester_user_id,
            candidate,
            source_message_ids,
            trace_id
          )

        result_type == "revision_candidate" ->
          handle_revision_candidate(conversation_id, requester_user_id, candidate, trace_id)

        result_type == "plan_candidate" ->
          insert_plan_proposal(%{
            conversation_id: conversation_id,
            requester_user_id: requester_user_id,
            candidate: candidate,
            uncertainty: output["uncertainty"] || [],
            evidence: output["evidence"] || [],
            ai_job_id: ai_job_id,
            consent_proof_id: consent_proof_id,
            source_message_ids: source_message_ids,
            trace_id: trace_id
          })

        true ->
          {:ok, :no_proposal}
      end
    end
  end

  defp insert_plan_proposal(ctx) do
    candidate = ctx.candidate

    copy =
      candidate["recommended_signal_copy"] ||
        "#{candidate["activity"] || "This"} may be a plan."

    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)
    expires = DateTime.add(now, 7 * 24 * 3600, :second)

    Repo.transaction(fn ->
      supersede_open_proposals!(ctx.conversation_id)

      {:ok, proposal} =
        %Proposal{}
        |> Proposal.changeset(%{
          conversation_id: ctx.conversation_id,
          created_by_user_id: ctx.requester_user_id,
          ai_job_id: ctx.ai_job_id,
          source_message_ids: ctx.source_message_ids,
          capability: "social_flow_plan_extract",
          status: "visible",
          activity_label: candidate["activity"],
          time_candidates: %{
            "items" => candidate["normalized_time_candidates"] || []
          },
          location_candidate: candidate["location_expression"],
          participant_candidates: candidate["participant_mentions"] || [],
          confidence: candidate["confidence"],
          uncertainty: ctx.uncertainty,
          recommended_signal_copy: copy,
          raw_candidate: candidate,
          consent_proof_id: ctx.consent_proof_id,
          visibility: "shared",
          expires_at: expires
        })
        # Gyroscope (R13): proposal creation passes the transition gate.
        |> PlanTransition.guard_changeset(:proposal, :create)
        |> Repo.insert()

      options =
        (candidate["normalized_time_candidates"] || [])
        |> Enum.with_index()
        |> Enum.map(fn {item, idx} ->
          %PlanOption{}
          |> PlanOption.changeset(%{
            proposal_id: proposal.id,
            label: item["label"] || "Option #{idx + 1}",
            status: "open",
            sort_order: idx
          })
          |> Repo.insert!()
        end)

      signal =
        insert_signal!(%{
          conversation_id: ctx.conversation_id,
          proposal_id: proposal.id,
          kind: "possible_plan",
          status: "visible",
          copy: copy,
          visibility: "shared",
          actions: %{
            "items" => [
              %{"id" => "coordinate", "label" => "Coordinate this"},
              %{"id" => "not_a_plan", "label" => "Not a plan"},
              %{"id" => "dismiss", "label" => "Dismiss"}
            ]
          }
        })

      audit!(
        ctx.conversation_id,
        nil,
        ctx.requester_user_id,
        "proposal.created",
        %{
          "proposal_id" => proposal.id
        },
        ctx.trace_id
      )

      {proposal, signal, options}
    end)
    |> case do
      {:ok, {proposal, signal, options}} ->
        # Repair #11: broadcast only after the transaction commits, so a
        # rollback can never leave a ghost proposal signal on the wire.
        broadcast(
          ctx.conversation_id,
          "social_flow:signal",
          %{
            "signal" => Signal.to_contract(signal),
            "proposal" => Proposal.to_contract(proposal),
            "options" => Enum.map(options, &PlanOption.to_contract/1)
          },
          ctx.trace_id
        )

        {:ok, %{proposal: proposal, signal: signal, options: options}}

      {:error, reason} ->
        {:error, reason}
    end
  end

  defp handle_commitment_candidate(
         conversation_id,
         user_id,
         candidate,
         source_message_ids,
         trace_id
       ) do
    plan = latest_plan(conversation_id)

    if is_nil(plan) do
      {:ok, :no_plan_for_commitment}
    else
      with :ok <- ensure_plan_participant(plan, user_id) do
        desc =
          get_in(candidate, ["possible_commitments", Access.at(0), "description"]) ||
            "Commitment"

        # Repair #11: writes in one transaction, broadcast only after commit.
        case Repo.transaction(fn ->
               {:ok, commitment} =
                 %PlanCommitment{}
                 |> PlanCommitment.changeset(%{
                   plan_id: plan.id,
                   owner_user_id: user_id,
                   description: desc,
                   visibility: "private",
                   status: "proposed",
                   source_message_ids: source_message_ids
                 })
                 |> Repo.insert()

               signal =
                 insert_signal!(%{
                   conversation_id: conversation_id,
                   plan_id: plan.id,
                   commitment_id: commitment.id,
                   kind: "commitment",
                   status: "visible",
                   copy:
                     candidate["recommended_signal_copy"] ||
                       "You offered to make the reservation.",
                   visibility: "private",
                   audience_user_id: user_id,
                   actions: %{
                     "items" => [
                       %{"id" => "confirm_commitment", "label" => "Add as my commitment"},
                       %{"id" => "not_a_commitment", "label" => "Not a commitment"}
                     ]
                   }
                 })

               audit!(
                 conversation_id,
                 plan.id,
                 user_id,
                 "commitment.proposed",
                 %{
                   "commitment_id" => commitment.id
                 },
                 trace_id
               )

               {commitment, signal}
             end) do
          {:ok, {commitment, signal}} ->
            # Private signal: only push to audience via user topic + conversation (filtered on read)
            broadcast(
              conversation_id,
              "social_flow:signal",
              %{
                "signal" => Signal.to_contract(signal),
                "commitment" => PlanCommitment.to_contract(commitment)
              },
              trace_id
            )

            {:ok, %{commitment: commitment, signal: signal}}

          {:error, reason} ->
            {:error, reason}
        end
      end
    end
  end

  defp handle_revision_candidate(conversation_id, user_id, candidate, trace_id) do
    plan = latest_plan(conversation_id)

    if is_nil(plan) do
      {:ok, :no_plan_for_revision}
    else
      propose_revision(%{
        plan_id: plan.id,
        proposed_by_user_id: user_id,
        changes: %{
          "time_label" =>
            get_in(candidate, ["revision_hint", "proposed_label"]) ||
              get_in(candidate, ["normalized_time_candidates", Access.at(0), "label"]) ||
              "updated time"
        },
        trace_id: trace_id
      })
    end
  end

  # --- User actions ---

  def approve_coordination(%{
        proposal_id: proposal_id,
        user_id: user_id,
        trace_id: trace_id
      }) do
    trace = trace_id || @trace_default

    # Repair #11: state change + signal/audit inserts in one transaction,
    # proposal row locked FOR UPDATE, lazy expiry enforced, broadcast after commit.
    with_expired_persisted(proposal_id, fn ->
      case Repo.transaction(fn ->
             proposal =
               from(p in Proposal, where: p.id == ^proposal_id, lock: "FOR UPDATE")
               |> Repo.one()

             with %Proposal{} = proposal <- proposal,
                  :ok <- ensure_member(proposal.conversation_id, user_id),
                  :ok <- ensure_not_expired_tx(proposal),
                  true <- proposal.status in ~w(proposed visible) do
               {:ok, proposal} =
                 proposal
                 |> Proposal.changeset(%{status: "approved_for_coordination"})
                 # Gyroscope (R13): the gate owns the target; an approved
                 # proposal can never be re-approved or approved from terminal.
                 |> PlanTransition.guard_changeset(:proposal, :approve)
                 |> Repo.update()

               options =
                 from(o in PlanOption,
                   where: o.proposal_id == ^proposal.id,
                   order_by: [asc: o.sort_order]
                 )
                 |> Repo.all()

               # Ensure default options if AI sent none
               options =
                 if options == [] do
                   [
                     %PlanOption{}
                     |> PlanOption.changeset(%{
                       proposal_id: proposal.id,
                       label: "Thursday at 7:00 PM",
                       status: "open",
                       sort_order: 0
                     })
                     |> Repo.insert!()
                   ]
                 else
                   options
                 end

               signal =
                 insert_signal!(%{
                   conversation_id: proposal.conversation_id,
                   proposal_id: proposal.id,
                   kind: "missing_detail",
                   status: "visible",
                   copy: "What time works?",
                   visibility: "shared",
                   actions: %{
                     "items" =>
                       Enum.map(options, fn o ->
                         %{"id" => "accept_option:#{o.id}", "label" => o.label}
                       end)
                   }
                 })

               audit!(
                 proposal.conversation_id,
                 nil,
                 user_id,
                 "proposal.approved_for_coordination",
                 %{
                   "proposal_id" => proposal.id
                 },
                 trace
               )

               {proposal, options, signal}
             else
               nil -> Repo.rollback(:not_found)
               false -> Repo.rollback(:invalid_status)
               {:error, reason} -> Repo.rollback(reason)
             end
           end) do
        {:ok, {proposal, options, signal}} ->
          broadcast(
            proposal.conversation_id,
            "social_flow:proposal_updated",
            %{
              "proposal" => Proposal.to_contract(proposal),
              "options" => Enum.map(options, &PlanOption.to_contract/1),
              "signal" => Signal.to_contract(signal)
            },
            trace
          )

          {:ok, %{proposal: proposal, options: options, signal: signal}}

        {:error, reason} ->
          {:error, reason}
      end
    end)
  end

  def dismiss_proposal(%{proposal_id: proposal_id, user_id: user_id, trace_id: trace_id}) do
    trace = trace_id || @trace_default

    with %Proposal{} = proposal <- Repo.get(Proposal, proposal_id),
         :ok <- ensure_member(proposal.conversation_id, user_id) do
      # Repair #11: writes in one transaction, broadcast only after commit.
      case Repo.transaction(fn ->
             now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

             {:ok, proposal} =
               proposal
               |> Proposal.changeset(%{status: "dismissed", dismissed_at: now})
               # Gyroscope (R13): dismissing a converted/expired proposal is
               # illegal — the gate refuses, the row keeps its terminal state.
               |> PlanTransition.guard_changeset(:proposal, :dismiss)
               |> Repo.update()

             from(s in Signal, where: s.proposal_id == ^proposal.id and s.status == "visible")
             |> Repo.update_all(set: [status: "dismissed", updated_at: now])

             audit!(
               proposal.conversation_id,
               nil,
               user_id,
               "proposal.dismissed",
               %{
                 "proposal_id" => proposal.id
               },
               trace
             )

             proposal
           end) do
        {:ok, proposal} ->
          broadcast(
            proposal.conversation_id,
            "social_flow:proposal_updated",
            %{
              "proposal" => Proposal.to_contract(proposal)
            },
            trace
          )

          {:ok, proposal}

        {:error, reason} ->
          {:error, reason}
      end
    else
      nil -> {:error, :not_found}
      {:error, _} = err -> err
    end
  end

  def respond_to_option(%{
        option_id: option_id,
        user_id: user_id,
        response: response,
        trace_id: trace_id
      })
      when response in ~w(accept decline tentative) do
    trace = trace_id || @trace_default
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    # Proposal id up front so the lazy-expiry mark can persist after a rollback.
    proposal_id =
      case Repo.get(PlanOption, option_id) do
        %PlanOption{proposal_id: pid} -> pid
        nil -> nil
      end

    # Repair #11: idempotent retry after conversion. A repeat accept on an
    # already-converted proposal resumes the winner's plan instead of
    # erroring — the conversion guard below only fires for live races.
    case proposal_id && Repo.get(Proposal, proposal_id) do
      %Proposal{status: "converted"} = converted ->
        with :ok <- ensure_member(converted.conversation_id, user_id) do
          recover_raced_plan(converted)
        end

      _ ->
        do_respond_to_option(option_id, proposal_id, user_id, response, trace, now)
    end
  end

  defp do_respond_to_option(option_id, proposal_id, user_id, response, trace, now) do
    # Repair #11: response insert + expiry check inside one transaction with the
    # proposal row locked FOR UPDATE. The plan-creation fan-out below runs only
    # after this transaction commits.
    with_expired_persisted(proposal_id, fn ->
      case Repo.transaction(fn ->
             option =
               from(o in PlanOption, where: o.id == ^option_id, lock: "FOR UPDATE")
               |> Repo.one()

             proposal =
               case option do
                 %PlanOption{} = o ->
                   from(p in Proposal, where: p.id == ^o.proposal_id, lock: "FOR UPDATE")
                   |> Repo.one()

                 nil ->
                   nil
               end

             with %PlanOption{} = option <- option,
                  %Proposal{} = proposal <- proposal,
                  :ok <- ensure_member(proposal.conversation_id, user_id),
                  :ok <- ensure_not_expired_tx(proposal),
                  true <- proposal.status in ~w(approved_for_coordination visible proposed) do
               {:ok, _} =
                 %PlanOptionResponse{}
                 |> PlanOptionResponse.changeset(%{
                   option_id: option.id,
                   user_id: user_id,
                   response: response,
                   responded_at: now
                 })
                 |> Repo.insert(
                   on_conflict: [set: [response: response, responded_at: now]],
                   conflict_target: [:option_id, :user_id]
                 )

               if response == "accept" do
                 {:accept, proposal, option}
               else
                 audit!(
                   proposal.conversation_id,
                   nil,
                   user_id,
                   "option.responded",
                   %{
                     "option_id" => option.id,
                     "response" => response
                   },
                   trace
                 )

                 {:recorded, proposal, option}
               end
             else
               nil -> Repo.rollback(:not_found)
               false -> Repo.rollback(:invalid_status)
               {:error, reason} -> Repo.rollback(reason)
             end
           end) do
        {:ok, {:accept, proposal, option}} ->
          maybe_create_shared_plan_from_option(proposal, option, user_id, trace)

        {:ok, {:recorded, _proposal, _option}} ->
          {:ok, :recorded}

        {:error, reason} ->
          {:error, reason}
      end
    end)
  end

  defp maybe_create_shared_plan_from_option(proposal, option, user_id, trace_id) do
    member_ids = member_user_ids(proposal.conversation_id)

    accepts =
      from(r in PlanOptionResponse,
        where: r.option_id == ^option.id and r.response == "accept",
        select: r.user_id
      )
      |> Repo.all()
      |> MapSet.new()

    # Both members must accept the same option for SF-1 agreement
    if Enum.all?(member_ids, &MapSet.member?(accepts, &1)) do
      case create_shared_plan(%{
             proposal: proposal,
             option: option,
             created_by_user_id: user_id,
             member_ids: member_ids,
             trace_id: trace_id
           }) do
        {:ok, _} = ok ->
          ok

        # Lost a conversion race: the winner's transaction already committed
        # the plan. Resume the existing plan instead of erroring (C-reinforce:
        # idempotent opportunity taps).
        {:error, :already_converting} ->
          recover_raced_plan(proposal)

        {:error, _} = err ->
          err
      end
    else
      broadcast(
        proposal.conversation_id,
        "social_flow:option_response",
        %{
          "option" => PlanOption.to_contract(option),
          "accepted_by" => MapSet.to_list(accepts),
          "awaiting" => Enum.reject(member_ids, &MapSet.member?(accepts, &1))
        },
        trace_id
      )

      {:ok, :awaiting_others}
    end
  end

  defp recover_raced_plan(%Proposal{} = proposal) do
    case Repo.get_by(SharedPlan, created_from_proposal_id: proposal.id) do
      %SharedPlan{} = plan ->
        signal =
          from(s in Signal,
            where: s.plan_id == ^plan.id and s.kind == "agreement",
            order_by: [desc: s.inserted_at],
            limit: 1
          )
          |> Repo.one()

        # The winner always writes the agreement signal in the same
        # transaction; a missing signal means something else went wrong —
        # report honestly rather than crashing the caller's to_contract.
        if is_nil(signal) do
          {:error, :already_converting}
        else
          {:ok, %{plan: plan, signal: signal}}
        end

      nil ->
        {:error, :already_converting}
    end
  end

  defp create_shared_plan(%{
         proposal: proposal,
         option: option,
         created_by_user_id: created_by,
         member_ids: member_ids,
         trace_id: trace_id
       }) do
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)
    title = proposal.activity_label || "Plan"
    time_label = option.label

    # Repair #11 task 6: the proposal row is locked FOR UPDATE and the
    # conversion proceeds only while its status is still
    # "approved_for_coordination" — one proposal can birth exactly one plan.
    # Task 5: the PubSub broadcast fires only after the transaction commits;
    # a rollback can never unsend it. Audit + outbox record stay inside.
    case Repo.transaction(fn ->
           locked_proposal =
             from(p in Proposal, where: p.id == ^proposal.id, lock: "FOR UPDATE")
             |> Repo.one()

           if is_nil(locked_proposal) or
                locked_proposal.status != "approved_for_coordination" do
             Repo.rollback(:already_converting)
           end

           {:ok, plan} =
             %SharedPlan{}
             |> SharedPlan.changeset(%{
               conversation_id: locked_proposal.conversation_id,
               title: String.capitalize("#{title}"),
               status: "agreed",
               time_label: time_label,
               timezone: "UTC",
               created_from_proposal_id: locked_proposal.id,
               created_by_user_id: created_by
             })
             # Gyroscope (R13): conversion births the plan agreed, via the gate.
             |> PlanTransition.guard_changeset(:plan, :create_agreed)
             |> Repo.insert()

           # B1 — single lead/organizer authority on the chat path: the creator
           # is the lead, matching JourneyAuthority's "lead"/"co_lead" vocabulary.
           for uid <- member_ids do
             %PlanParticipant{}
             |> PlanParticipant.changeset(%{
               plan_id: plan.id,
               user_id: uid,
               role: if(uid == created_by, do: "lead", else: "participant"),
               response_state: "accepted",
               responded_at: now,
               authority_source: "user_action"
             })
             |> Repo.insert!()
           end

           locked_proposal
           |> Proposal.changeset(%{status: "converted", converted_at: now})
           # Gyroscope (R13): conversion is terminal; a double-convert of a
           # converted proposal is refused by the gate, not by lock timing.
           |> PlanTransition.guard_changeset(:proposal, :convert)
           |> Repo.update!()

           option
           |> PlanOption.changeset(%{status: "selected", plan_id: plan.id})
           |> Repo.update!()

           signal =
             insert_signal!(%{
               conversation_id: locked_proposal.conversation_id,
               proposal_id: locked_proposal.id,
               plan_id: plan.id,
               kind: "agreement",
               status: "visible",
               copy: "#{time_label} works for both of you.",
               visibility: "shared",
               actions: %{"items" => []}
             })

           audit!(
             locked_proposal.conversation_id,
             plan.id,
             created_by,
             "plan.agreed",
             %{
               "plan_id" => plan.id,
               "option_id" => option.id,
               "time_label" => time_label
             },
             trace_id
           )

           # Native Opal Calendar: project Set into durable commitments (no external calendar required)
           _ = OpalCore.SocialFlow.OpalCalendar.project_from_shared_plan(plan)

           # Phase 5A — lawful taste candidates via MemoryIntelligence.consider/1
           _ = PlanAgreementTasteBridge.after_agreed(plan)

           case Publisher.record(%{
                  event_type: "plan.agreed",
                  event_id: "plan_agreed:#{plan.id}",
                  aggregate_type: "shared_plan",
                  aggregate_id: plan.id,
                  partition_key: created_by,
                  privacy_class: "shared_authorized",
                  purpose: "plan_agree",
                  actor_user_id: created_by,
                  conversation_id: locked_proposal.conversation_id,
                  plan_id: plan.id,
                  payload: %{"plan_id" => plan.id, "status" => "agreed"}
                }) do
             {:ok, _} -> :ok
             {:error, reason} -> Repo.rollback(reason)
           end

           {plan, signal}
         end) do
      {:ok, {plan, signal}} ->
        broadcast(
          proposal.conversation_id,
          "social_flow:plan",
          %{
            "plan" => plan_payload(plan),
            "signal" => Signal.to_contract(signal)
          },
          trace_id
        )

        {:ok, %{plan: plan, signal: signal}}

      {:error, reason} ->
        {:error, reason}
    end
  end

  def confirm_commitment(%{commitment_id: id, user_id: user_id, trace_id: trace_id}) do
    trace = trace_id || @trace_default

    with %PlanCommitment{} = c <- Repo.get(PlanCommitment, id),
         true <- c.owner_user_id == user_id,
         %SharedPlan{} = plan <- Repo.get(SharedPlan, c.plan_id),
         :ok <- ensure_member(plan.conversation_id, user_id) do
      # Repair #11: writes in one transaction, broadcast only after commit.
      case Repo.transaction(fn ->
             now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

             {:ok, c} =
               c
               |> PlanCommitment.changeset(%{status: "confirmed", confirmed_at: now})
               |> Repo.update()

             audit!(
               plan.conversation_id,
               plan.id,
               user_id,
               "commitment.confirmed",
               %{
                 "commitment_id" => c.id
               },
               trace
             )

             {plan, c}
           end) do
        {:ok, {plan, c}} ->
          # Shared visibility of commitment existence is still private for SF-1 private commitments
          broadcast_plan(
            plan,
            "social_flow:commitment",
            %{
              "commitment" => PlanCommitment.to_contract(c)
            },
            trace
          )

          # Repair #16 (W4, P4) — the confirm tap IS an explicit structured
          # commitment: register the waiting_on follow-through loop now
          # (post-commit; see FollowThroughProducers for the deadline law).
          _ = FollowThroughProducers.register_waiting_on_commitment(c, plan)

          {:ok, c}

        {:error, reason} ->
          {:error, reason}
      end
    else
      nil -> {:error, :not_found}
      false -> {:error, :forbidden}
      {:error, _} = err -> err
    end
  end

  def create_private_reminder(attrs) do
    plan_id = fetch!(attrs, :plan_id)
    user_id = fetch!(attrs, :user_id)
    summary = fetch!(attrs, :content_summary)
    commitment_id = Map.get(attrs, :commitment_id) || Map.get(attrs, "commitment_id")
    trace_id = Map.get(attrs, :trace_id) || Map.get(attrs, "trace_id") || @trace_default

    with %SharedPlan{} = plan <- Repo.get(SharedPlan, plan_id),
         :ok <- ensure_member(plan.conversation_id, user_id) do
      # Repair #11: writes in one transaction, broadcast only after commit.
      case Repo.transaction(fn ->
             {:ok, reminder} =
               %PlanReminder{}
               |> PlanReminder.changeset(%{
                 plan_id: plan.id,
                 commitment_id: commitment_id,
                 owner_user_id: user_id,
                 visibility: "private",
                 status: "active",
                 delivery_policy: "in_app",
                 content_summary: summary,
                 source_lineage: %{"origin" => "user_private_prep"}
               })
               |> Repo.insert()

             signal =
               insert_signal!(%{
                 conversation_id: plan.conversation_id,
                 plan_id: plan.id,
                 reminder_id: reminder.id,
                 kind: "private_reminder",
                 status: "visible",
                 copy: "Private — only you can see this. #{summary}",
                 visibility: "private",
                 audience_user_id: user_id,
                 actions: %{"items" => [%{"id" => "dismiss_reminder", "label" => "Dismiss"}]}
               })

             audit!(
               plan.conversation_id,
               plan.id,
               user_id,
               "reminder.private_created",
               %{
                 "reminder_id" => reminder.id
               },
               trace_id
             )

             {plan, reminder, signal}
           end) do
        {:ok, {plan, reminder, signal}} ->
          # Broadcast filtered: event includes audience; clients/sync strip for non-owners
          broadcast_plan(
            plan,
            "social_flow:reminder",
            %{
              "reminder" => PlanReminder.to_contract(reminder),
              "signal" => Signal.to_contract(signal),
              "audience_user_id" => user_id
            },
            trace_id
          )

          {:ok, %{reminder: reminder, signal: signal}}

        {:error, reason} ->
          {:error, reason}
      end
    else
      nil -> {:error, :not_found}
      {:error, _} = err -> err
    end
  end

  # Repair #13 (F13-01) — a proposal against a terminal plan is refused.
  # Creating a "proposed" revision on a cancelled/completed plan would be a
  # fake success: it can never be applied (respond_to_revision refuses
  # terminal plans, F12-62), so it would linger as a dead live proposal.
  # Terminal set matches respond_to_revision's F12-62 guard.
  def propose_revision(attrs) do
    plan_id = fetch!(attrs, :plan_id)
    user_id = fetch!(attrs, :proposed_by_user_id)
    changes = fetch!(attrs, :changes) |> stringify_keys()
    trace_id = Map.get(attrs, :trace_id) || @trace_default

    with %SharedPlan{} = plan <- Repo.get(SharedPlan, plan_id),
         :ok <- ensure_member(plan.conversation_id, user_id),
         # Gyroscope (R13): a revision on a terminal plan could never be
         # accepted (F12-62) — refusing it at birth keeps the lifecycle honest.
         false <- PlanTransition.terminal?(:plan, plan.status) do
      members = member_user_ids(plan.conversation_id)
      required = Enum.reject(members, &(&1 == user_id))
      label = changes["time_label"] || "new time"

      case insert_revision_tx(
             plan,
             user_id,
             changes,
             required,
             trace_id,
             "Proposed changing dinner to #{label}."
           ) do
        {:ok, {revision, signal}} ->
          # Broadcast only after commit.
          broadcast_plan(
            plan,
            "social_flow:revision",
            %{
              "revision" => PlanRevision.to_contract(revision),
              "signal" => Signal.to_contract(signal)
            },
            trace_id
          )

          # Repair #16 (W4, P4) — a proposed revision names the people who
          # owe an answer (required_approvals): register their explicit
          # open_question loops now (post-commit).
          _ = FollowThroughProducers.register_open_questions(revision, plan)

          {:ok, %{revision: revision, signal: signal}}

        {:error, reason} ->
          {:error, reason}
      end
    else
      nil -> {:error, :not_found}
      # Gyroscope (R13): propose on a terminal plan is refused at birth.
      true -> {:error, :invalid_status}
      {:error, _} = err -> err
    end
  end

  # Shared propose → signal → audit write path, always inside one transaction.
  # Broadcast stays with the caller, after commit (repair #11 task 5).
  defp insert_revision_tx(%SharedPlan{} = plan, proposer_id, changes, required, trace_id, copy) do
    Repo.transaction(fn ->
      {:ok, revision} =
        %PlanRevision{}
        |> PlanRevision.changeset(%{
          plan_id: plan.id,
          proposed_by_user_id: proposer_id,
          prior_revision_id: plan.current_revision_id,
          proposed_changes: changes,
          status: "proposed",
          required_approvals: required,
          approvals: %{}
        })
        # Gyroscope (R13): a proposal is born proposed, via the gate.
        |> PlanTransition.guard_changeset(:revision, :propose)
        |> Repo.insert()

      signal =
        insert_signal!(%{
          conversation_id: plan.conversation_id,
          plan_id: plan.id,
          revision_id: revision.id,
          kind: "revision",
          status: "visible",
          copy: copy,
          visibility: "shared",
          actions: %{
            "items" => [
              %{"id" => "accept_revision", "label" => "Accept change"},
              %{"id" => "keep_current", "label" => "Keep current"},
              %{"id" => "suggest_other", "label" => "Suggest another time"}
            ]
          }
        })

      audit!(
        plan.conversation_id,
        plan.id,
        proposer_id,
        "revision.proposed",
        %{
          "revision_id" => revision.id,
          "changes" => changes
        },
        trace_id
      )

      {revision, signal}
    end)
  end

  @doc """
  Propose cancelling a shared plan as a revision with
  proposed_changes %{"kind" => "cancel"} (no schema migration).

  Follows the normal propose → approve → apply lifecycle; when the revision is
  accepted, apply_locked_revision/6 flips the plan row to "cancelled".

  required_approvals choice (documented): the plan's lead/organizer when the
  plan has one — cancellation dissolves other members' commitments, so the
  lead must sign off — otherwise all current conversation members.
  """
  def propose_cancel_revision(%{plan_id: plan_id, user_id: user_id, trace_id: trace_id}) do
    trace = trace_id || @trace_default

    with %SharedPlan{} = plan <- Repo.get(SharedPlan, plan_id),
         :ok <- ensure_plan_access(plan, user_id),
         # Gyroscope (R13): terminal is terminal — proposing a cancel on a
         # completed plan is as incoherent as on a cancelled one.
         false <- PlanTransition.terminal?(:plan, plan.status) do
      required = cancel_required_approvals(plan, user_id)

      case insert_revision_tx(
             plan,
             user_id,
             %{"kind" => "cancel"},
             required,
             trace,
             "Proposed cancelling #{plan.title}."
           ) do
        {:ok, {revision, signal}} ->
          broadcast_plan(
            plan,
            "social_flow:revision",
            %{
              "revision" => PlanRevision.to_contract(revision),
              "signal" => Signal.to_contract(signal)
            },
            trace
          )

          # Repair #16 (W4, P4) — a cancel proposal also names required
          # approvers who owe an answer: same explicit open_question loops.
          _ = FollowThroughProducers.register_open_questions(revision, plan)

          {:ok, %{revision: revision, signal: signal}}

        {:error, reason} ->
          {:error, reason}
      end
    else
      nil -> {:error, :not_found}
      false -> {:error, :invalid_status}
      # Gyroscope (R13): terminal plan — cancel-revision refused at birth.
      true -> {:error, :invalid_status}
      {:error, _} = err -> err
    end
  end

  defp cancel_required_approvals(%SharedPlan{} = plan, proposer_id) do
    case lead_user_ids(plan.id) -- [proposer_id] do
      [] ->
        if is_binary(plan.conversation_id) do
          member_user_ids(plan.conversation_id) -- [proposer_id]
        else
          []
        end

      leads ->
        leads
    end
  end

  # F12-61 — nil/non-binary revision_id is honest {:error, :invalid}, never a crash.
  def respond_to_revision(%{revision_id: revision_id}) when not is_binary(revision_id),
    do: {:error, :invalid}

  def respond_to_revision(%{
        revision_id: revision_id,
        user_id: user_id,
        decision: decision,
        trace_id: trace_id
      })
      when decision in ~w(accept reject) do
    trace = trace_id || @trace_default
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    # Repair #11 task 4: the revision row is locked FOR UPDATE inside the
    # transaction BEFORE the approvals check, and the plan row is locked too
    # because the apply path mutates it. The approvals check and the apply
    # happen on the locked rows, so two concurrent responses serialize.
    # Task 5: broadcast only after the transaction commits.
    case Repo.transaction(fn ->
           revision =
             from(r in PlanRevision, where: r.id == ^revision_id, lock: "FOR UPDATE")
             |> Repo.one()

           plan =
             case revision do
               %PlanRevision{} = rev ->
                 from(p in SharedPlan, where: p.id == ^rev.plan_id, lock: "FOR UPDATE")
                 |> Repo.one()

               nil ->
                 nil
             end

           with %PlanRevision{} = revision <- revision,
                %SharedPlan{} = plan <- plan,
                :ok <- ensure_member(plan.conversation_id, user_id),
                true <- revision.status == "proposed",
                # F12-62 — a cancelled/completed plan is terminal: a stale
                # proposal can never resurrect it into "changed".
                true <- plan.status not in ~w(cancelled completed),
                true <- user_id in (revision.required_approvals || []) do
             approvals = Map.put(revision.approvals || %{}, user_id, decision)

             cond do
               decision == "reject" ->
                 {:ok, revision} =
                   revision
                   |> PlanRevision.changeset(%{
                     status: "rejected",
                     rejected_at: now,
                     approvals: approvals
                   })
                   # Gyroscope (R13): reject is only legal from proposed.
                   |> PlanTransition.guard_changeset(:revision, :reject)
                   |> Repo.update()

                 audit!(
                   plan.conversation_id,
                   plan.id,
                   user_id,
                   "revision.rejected",
                   %{
                     "revision_id" => revision.id
                   },
                   trace
                 )

                 {:broadcast_revision, revision, plan}

               Enum.all?(revision.required_approvals || [], fn uid ->
                 approvals[uid] == "accept"
               end) ->
                 {plan, revision, signal} =
                   apply_locked_revision(plan, revision, approvals, now, user_id, trace)

                 {:broadcast_plan, plan, revision, signal}

               true ->
                 {:ok, revision} =
                   revision
                   |> PlanRevision.changeset(%{approvals: approvals})
                   |> Repo.update()

                 {:silent, revision}
             end
           else
             nil -> Repo.rollback(:not_found)
             false -> Repo.rollback(:forbidden)
             {:error, reason} -> Repo.rollback(reason)
           end
         end) do
      {:ok, {:broadcast_revision, revision, plan}} ->
        broadcast_plan(
          plan,
          "social_flow:revision",
          %{
            "revision" => PlanRevision.to_contract(revision)
          },
          trace
        )

        # Repair #16 (W4, P4) — rejected: the question is settled, so every
        # approver's open_question loop completes. No plan mutation
        # happened, so NO recent-change entry is recorded (P3 truth law).
        _ = FollowThroughProducers.complete_open_questions(revision.id)

        {:ok, revision}

      {:ok, {:broadcast_plan, plan, revision, signal}} ->
        broadcast_plan(
          plan,
          "social_flow:plan",
          %{
            "plan" => plan_payload(plan),
            "revision" => PlanRevision.to_contract(revision),
            "signal" => Signal.to_contract(signal)
          },
          trace
        )

        # Repair #16 (W4) — the revision was accepted AND applied
        # (post-commit): P3 records the material change for the plan's
        # people; P4 completes the now-answered open_question loops.
        _ = record_recent_change_for_revision(plan, revision)
        _ = FollowThroughProducers.complete_open_questions(revision.id)

        {:ok, %{plan: plan, revision: revision, signal: signal}}

      {:ok, {:silent, revision}} ->
        # Repair #16 (W4, P4) — a partial approval answers only THIS
        # approver's question; the others still owe an answer. The plan
        # has not mutated yet, so no recent-change entry (P3 truth law).
        _ = FollowThroughProducers.complete_open_questions(revision.id, user_id)

        {:ok, revision}

      {:error, reason} ->
        {:error, reason}
    end
  end

  # Repair #16 (W4, P3) — recent-change copy for an accepted revision is
  # built from the revision's own kind and the post-apply plan row: a
  # cancel revision records a cancellation, anything else records the
  # schedule change at the plan's now-current time_label. The revision id
  # is the idempotency event key (one entry per owner per mutation).
  defp record_recent_change_for_revision(%SharedPlan{} = plan, %PlanRevision{} = revision) do
    changes = revision.proposed_changes || %{}

    if changes["kind"] == "cancel" do
      PlanRecentChanges.record_cancelled(plan, "rev-#{revision.id}")
    else
      PlanRecentChanges.record_schedule_changed(
        plan,
        "rev-#{revision.id}",
        "time_label",
        plan.time_label
      )
    end
  rescue
    _ -> :ok
  end

  # Applies an accepted revision to the already-locked plan + revision rows.
  # Runs inside the caller's transaction; broadcast stays with the caller.
  # A revision with proposed_changes["kind"] == "cancel" flips the plan to
  # "cancelled" instead of editing its time (repair #11 task 8, no migration).
  defp apply_locked_revision(
         %SharedPlan{} = plan,
         %PlanRevision{} = rev,
         approvals,
         now,
         actor,
         trace
       ) do
    # Repair #13 (F13-02) — accepting a revision retires every other live
    # proposal for the same plan to "superseded" inside this transaction.
    # Without this, an older "proposed" revision could be accepted afterwards
    # and silently regress the plan (e.g. 9:00 PM back to 8:00 PM). The
    # "superseded" status already exists in the schema; respond_to_revision
    # only decides revisions with status == "proposed", so a later accept of
    # a superseded revision is refused (:forbidden), never applied. Sibling
    # signals are retired too, so no dead "Accept change" button lingers.
    superseded_ids =
      from(r in PlanRevision,
        where: r.plan_id == ^plan.id and r.id != ^rev.id and r.status == "proposed",
        select: r.id
      )
      |> Repo.all()

    if superseded_ids != [] do
      from(r in PlanRevision, where: r.id in ^superseded_ids)
      |> Repo.update_all(set: [status: "superseded", updated_at: now])

      from(s in Signal,
        where: s.revision_id in ^superseded_ids and s.status == "visible"
      )
      |> Repo.update_all(set: [status: "superseded", updated_at: now])
    end

    changes = rev.proposed_changes || %{}

    # Gyroscope (R13): the gate decides the plan's target status from the
    # revision kind. Terminal plans (cancelled/completed) have no legal
    # outbound move, so a stale accept can never resurrect them — F12-62
    # generalized from one guard into the table.
    plan_action = if changes["kind"] == "cancel", do: :cancel, else: :change

    {plan_attrs, signal_copy} =
      if changes["kind"] == "cancel" do
        {%{status: "cancelled", cancelled_at: now, current_revision_id: rev.id},
         "#{plan.title} was cancelled."}
      else
        # Repair #18 residuals (R-2b): a revision can carry a raw
        # fragment ("8 PM") from natural-language extraction. The
        # accept writes the canonical label, like every schedule
        # write (see canonical_time_label/2).
        time_label =
          canonical_time_label(
            plan,
            changes["time_label"] || changes["new_value"] || plan.time_label
          )

        # F12-02c (gyroscope) — project the accepted change into the fold's
        # explicit action log, same as change_plan_schedule/1, so the next
        # sync_conversation keeps the accepted schedule verbatim.
        # Repair #18: the same transaction also syncs the STORED
        # exact_time, the resolved start_at and the plan_set_event
        # summary (sync_stored_schedule/5), so read-back on the stored
        # projections equals the plan row immediately - no later sync
        # is required for the truth to move.
        alignment =
          (plan.alignment || %{})
          |> append_explicit_action(%{
            "kind" => "schedule_change",
            "actor_user_id" => actor,
            "field" => "time_label",
            "value" => time_label,
            "truth" => "locked",
            "explicit" => true,
            "schema_version" => OpalCore.SocialFlow.ConversationAlignment.schema_version(),
            "revision_id" => rev.id,
            "at" => DateTime.to_iso8601(now)
          })
          |> sync_stored_schedule(plan, time_label, rev.id, now)

        {%{
           status: "changed",
           time_label: time_label,
           start_at: resolved_start_at(plan, time_label, changes),
           current_revision_id: rev.id,
           alignment: alignment
         }, "Dinner moved to #{time_label}."}
      end

    {:ok, rev} =
      rev
      |> PlanRevision.changeset(%{
        status: "accepted",
        accepted_at: now,
        approvals: approvals
      })
      # Gyroscope (R13): accept is only legal from proposed — a revision that
      # is already accepted/rejected can never be accepted again.
      |> PlanTransition.guard_changeset(:revision, :accept)
      |> Repo.update()

    {:ok, plan} =
      plan
      |> SharedPlan.changeset(plan_attrs)
      |> PlanTransition.guard_changeset(:plan, plan_action)
      |> Repo.update()

    signal =
      insert_signal!(%{
        conversation_id: plan.conversation_id,
        plan_id: plan.id,
        revision_id: rev.id,
        kind: "agreement",
        status: "visible",
        copy: signal_copy,
        visibility: "shared",
        actions: %{"items" => []}
      })

    audit!(
      plan.conversation_id,
      plan.id,
      actor,
      "revision.accepted",
      %{
        "revision_id" => rev.id
      },
      trace
    )

    # Supersede prior calendar versions and project new active commitments —
    # never for a cancelled plan.
    unless plan.status == "cancelled" do
      _ = OpalCore.SocialFlow.OpalCalendar.project_from_shared_plan(plan, plan_version: 2)
    end

    {plan, rev, signal}
  end

  @doc """
  Confirm (accept/reject) the conversation's pending plan revision — the
  server-side target of chat text like "I confirm" (AI result type
  "revision_confirmation") and of the mobile "Accept change" button.

  Plan resolution: the latest active plan for the conversation via latest_plan/1
  — the same ordering sync_for_user/2 renders first, so this acts on the plan
  the client is showing. Delegates to respond_to_revision/1 for the locked
  apply; never a free-floating reply.
  """
  def confirm_pending_revision(%{
        conversation_id: conversation_id,
        user_id: user_id,
        decision: decision,
        trace_id: trace_id
      })
      when decision in ~w(accept reject) do
    with :ok <- ensure_member(conversation_id, user_id),
         %SharedPlan{} = plan <-
           latest_plan(conversation_id) || {:error, :no_pending_revision},
         %PlanRevision{} = revision <-
           latest_proposed_revision(plan.id) || {:error, :no_pending_revision} do
      approvals = revision.approvals || %{}

      cond do
        Map.has_key?(approvals, user_id) ->
          {:error, :already_decided}

        user_id not in (revision.required_approvals || []) ->
          {:error, :not_authorized}

        true ->
          case respond_to_revision(%{
                 revision_id: revision.id,
                 user_id: user_id,
                 decision: decision,
                 trace_id: trace_id
               }) do
            {:ok, %{revision: applied}} ->
              {:ok, %{revision_id: applied.id, status: applied.status}}

            {:ok, %PlanRevision{} = applied} ->
              {:ok, %{revision_id: applied.id, status: applied.status}}

            {:error, _} = err ->
              err
          end
      end
    else
      {:error, _} = err -> err
    end
  end

  def confirm_pending_revision(_), do: {:error, :invalid}

  @doc """
  Repair #18 (Division A, F18-02 unification) - ONE change system.

  The web's alignment-fold accept path (System B) used to move only
  fold-local state: the plan row, its stored alignment and every
  PlanRevision stayed untouched, so the two systems diverged and a
  later read-back resurrected the old time. This entry is how a fold
  acceptance lands on the surviving authority (System A): it records a
  born-accepted PlanRevision through PlanTransition (:accept_direct,
  the same gate a lead's direct edit uses), supersedes any still-open
  PlanRevision proposals for the plan (they described the same change;
  the fold's accept settles them), and updates the plan row's canonical
  fields - time_label, resolved start_at, stored alignment exact_time
  and the regenerated plan_set_event - in one transaction. The fold's
  change_proposal is thereafter a PROJECTION of this record
  (surface_pending_revision overlays it), not a second writer.

  Only time changes route here; place/activity fold accepts keep their
  fold semantics and are noted as an open boundary in the handoff.
  """
  def record_fold_change_acceptance(attrs) when is_map(attrs) do
    conversation_id = Map.get(attrs, :conversation_id) || Map.get(attrs, "conversation_id")
    user_id = Map.get(attrs, :user_id) || Map.get(attrs, "user_id")
    value = Map.get(attrs, :value) || Map.get(attrs, "value")
    trace = Map.get(attrs, :trace_id) || Map.get(attrs, "trace_id") || @trace_default

    cond do
      not is_binary(conversation_id) or not is_binary(user_id) or
        not is_binary(value) or String.trim(value) == "" ->
        {:error, :invalid}

      true ->
        now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

        Repo.transaction(fn ->
          plan =
            from(p in SharedPlan,
              where:
                p.conversation_id == ^conversation_id and
                  p.status in ^~w(tentative agreed changed),
              order_by: [desc: p.updated_at, desc: p.inserted_at],
              limit: 1,
              lock: "FOR UPDATE"
            )
            |> Repo.one()

          with %SharedPlan{} = plan <- plan do
            # Repair #18 residuals (R-2b): the fold's post-sync value
            # can be the raw spoken fragment ("8 PM"). The mirror must
            # write the canonical label - the same resolution
            # apply_locked_revision/5 and change_plan_schedule/1 use -
            # never the fragment, or every listing reads the fragment
            # back forever (schedule_authority_label keeps the action
            # value verbatim on later fold upserts).
            value = canonical_time_label(plan, value)

            # Settle any open System A proposals for this plan: the fold
            # accept IS their resolution (never leave a second pending
            # representation of the same change behind).
            superseded_ids =
              from(r in PlanRevision,
                where: r.plan_id == ^plan.id and r.status == "proposed",
                select: r.id
              )
              |> Repo.all()

            if superseded_ids != [] do
              from(r in PlanRevision, where: r.id in ^superseded_ids)
              |> Repo.update_all(set: [status: "superseded", updated_at: now])

              from(s in Signal, where: s.revision_id in ^superseded_ids and s.status == "visible")
              |> Repo.update_all(set: [status: "superseded", updated_at: now])
            end

            {:ok, revision} =
              %PlanRevision{}
              |> PlanRevision.changeset(%{
                plan_id: plan.id,
                proposed_by_user_id: user_id,
                prior_revision_id: plan.current_revision_id,
                proposed_changes: %{
                  "kind" => "schedule_change",
                  "field" => "time_label",
                  "time_label" => value,
                  "new_value" => value,
                  "source" => "alignment_fold"
                },
                status: "accepted",
                accepted_at: now,
                required_approvals: [user_id],
                approvals: %{user_id => "accept"}
              })
              |> PlanTransition.guard_changeset(:revision, :accept_direct)
              |> Repo.insert()

            alignment =
              (plan.alignment || %{})
              |> append_explicit_action(%{
                "kind" => "schedule_change",
                "actor_user_id" => user_id,
                "field" => "time_label",
                "value" => value,
                "truth" => "locked",
                "explicit" => true,
                "schema_version" => OpalCore.SocialFlow.ConversationAlignment.schema_version(),
                "revision_id" => revision.id,
                "at" => DateTime.to_iso8601(now)
              })
              |> sync_stored_schedule(plan, value, revision.id, now)

            {:ok, plan} =
              plan
              |> SharedPlan.changeset(%{
                status: PlanTransition.target_for(:plan, plan.status, :change) || plan.status,
                time_label: value,
                start_at: resolved_start_at(plan, value, %{}),
                current_revision_id: revision.id,
                alignment: alignment
              })
              |> PlanTransition.guard_changeset(:plan, :change)
              |> Repo.update()

            audit!(
              plan.conversation_id,
              plan.id,
              user_id,
              "revision.accepted",
              %{"revision_id" => revision.id},
              trace
            )

            _ = OpalCore.SocialFlow.OpalCalendar.project_from_shared_plan(plan, plan_version: 2)

            %{plan: plan, revision: revision}
          else
            nil -> Repo.rollback(:no_active_plan)
          end
        end)
    end
  end

  def record_fold_change_acceptance(_), do: {:error, :invalid}

  @doc """
  Repair #18 residuals (R-2) - settle a chat confirmation the fold
  already applied but the revision chain never recorded.

  The human thread's confirmation is a chat message. The fold applies
  it on replay (ConversationAlignment's confirmation settlement), so
  the plan row already reads the new time - but when the intelligence
  executor's own confirm finds no proposed PlanRevision (its propose
  turn was blocked, e.g. by an ambiguous schedule target), System A
  has no record of the acceptance and the two systems diverge again
  on the next read. This entry answers whether that gap exists -
  CHECK ONLY, it never writes. Recording a fold acceptance is the
  sync path's job (ConversationAlignment.settle_fold_acceptance/2
  records the fold's own settled_change marker through
  record_fold_change_acceptance/1), and every chat turn syncs before
  the executor runs, so by the time a confirm reaches here the
  marker-driven record either exists or no fold acceptance ever
  happened. A writing settle here could not tell those apart: it
  happily "settled" a plan's own untouched clock, so a bare
  "I confirm" with nothing pending fabricated a confirmation and a
  revision row (Repair #13 sinister law: fake confirmations are
  refused honestly). Returns :already_settled when the chain
  already records the plan's current (confirmed) clock, and
  :nothing otherwise - no record, nothing to settle.
  """
  def settle_fold_confirmed_change(conversation_id, user_id, clock_hint \\ nil)
      when is_binary(conversation_id) and is_binary(user_id) do
    plan = latest_plan(conversation_id)
    plan_clock = plan && PlanIdentity.parse_clock(plan.time_label || "")

    cond do
      not match?(%SharedPlan{}, plan) ->
        :nothing

      not is_nil(clock_hint) and plan_clock != clock_hint ->
        :nothing

      is_nil(plan_clock) ->
        :nothing

      accepted_revision_records?(plan) ->
        :already_settled

      true ->
        :nothing
    end
  end

  defp accepted_revision_records?(%SharedPlan{current_revision_id: revision_id} = plan)
       when is_binary(revision_id) do
    case Repo.get(PlanRevision, revision_id) do
      %PlanRevision{status: "accepted"} = rev ->
        changes = rev.proposed_changes || %{}

        PlanIdentity.parse_clock(changes["time_label"] || changes["new_value"] || "") ==
          PlanIdentity.parse_clock(plan.time_label || "")

      _ ->
        false
    end
  end

  defp accepted_revision_records?(_), do: false

  @doc """
  Lead/organizer-only immediate cancellation of a shared plan.

  Authority: PlanParticipant role in ["lead", "co_lead"]; for chat-created
  plans with no lead row, falls back to created_by_user_id (documented,
  mirrors JourneyAuthority.require_lead/2). Sets status "cancelled" inside a
  transaction and broadcasts after commit. Never posts chat messages — returns
  notify_user_ids so the caller (routing agent) can do durable notification.
  """
  # F12-61 — nil/non-binary plan_id must be an honest {:error, :invalid},
  # never an Ecto ArgumentError from `p.id == ^nil` inside the transaction.
  def cancel_plan(%{plan_id: plan_id}) when not is_binary(plan_id), do: {:error, :invalid}

  def cancel_plan(%{plan_id: plan_id, user_id: user_id, trace_id: trace_id}) do
    trace = trace_id || @trace_default

    case Repo.transaction(fn ->
           plan =
             from(p in SharedPlan, where: p.id == ^plan_id, lock: "FOR UPDATE")
             |> Repo.one()

           with %SharedPlan{} = plan <- plan,
                :ok <- ensure_plan_access(plan, user_id) do
             cond do
               not plan_lead?(plan, user_id) ->
                 Repo.rollback(:not_authorized)

               plan.status == "cancelled" ->
                 Repo.rollback(:already_cancelled)

               true ->
                 now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

                 {:ok, plan} =
                   plan
                   |> SharedPlan.changeset(%{status: "cancelled", cancelled_at: now})
                   # Gyroscope (R13): cancel is refused on terminal plans by
                   # the gate, not just by the :already_cancelled check above.
                   |> PlanTransition.guard_changeset(:plan, :cancel)
                   |> Repo.update()

                 audit!(
                   plan.conversation_id,
                   plan.id,
                   user_id,
                   "plan.cancelled",
                   %{"plan_id" => plan.id},
                   trace
                 )

                 case Publisher.record(%{
                        event_type: "plan.cancelled",
                        event_id: "plan_cancelled:#{plan.id}",
                        aggregate_type: "shared_plan",
                        aggregate_id: plan.id,
                        partition_key: user_id,
                        privacy_class: "shared_authorized",
                        purpose: "plan_cancel",
                        actor_user_id: user_id,
                        conversation_id: plan.conversation_id,
                        plan_id: plan.id,
                        payload: %{"plan_id" => plan.id, "status" => "cancelled"}
                      }) do
                   {:ok, _} -> :ok
                   {:error, reason} -> Repo.rollback(reason)
                 end

                 {plan, cancel_notify_user_ids(plan)}
             end
           else
             nil -> Repo.rollback(:not_found)
             {:error, reason} -> Repo.rollback(reason)
           end
         end) do
      {:ok, {plan, notify_user_ids}} ->
        # broadcast_plan/4 fans out on the conversation topic for chat plans
        # and the owner user topic for conversation-less Center plans.
        broadcast_plan(
          plan,
          "social_flow:plan",
          %{"plan" => plan_payload(plan), "cancelled" => true},
          trace
        )

        # Repair #16 (W4, P3) — a direct cancel is a material mutation:
        # record it for the plan's people (post-commit). A cancel is
        # terminal, so the literal event key can only ever fire once.
        _ = PlanRecentChanges.record_cancelled(plan, "cancel")

        {:ok, %{plan: plan, notify_user_ids: notify_user_ids}}

      {:error, reason} ->
        {:error, reason}
    end
  end

  # F12-61 — catch-all after the main clause: non-map / shape-wrong input.
  def cancel_plan(_), do: {:error, :invalid}

  defp cancel_notify_user_ids(%SharedPlan{} = plan) do
    participant_ids =
      from(pp in PlanParticipant, where: pp.plan_id == ^plan.id, select: pp.user_id)
      |> Repo.all()

    ids =
      if participant_ids == [] and is_binary(plan.conversation_id) do
        member_user_ids(plan.conversation_id)
      else
        participant_ids
      end

    Enum.uniq(ids)
  end

  @doc """
  Lead/organizer-only direct time edit. Patches the SAME plan row (no new
  plan, no revision-proposal round-trip). Non-lead callers get :not_authorized;
  the routing agent offers them propose_revision/1 as the change-request path.
  """
  # F12-61 — nil/non-binary plan_id is honest {:error, :invalid}, never a crash.
  def change_plan_time(%{plan_id: plan_id}) when not is_binary(plan_id), do: {:error, :invalid}

  def change_plan_time(%{
        plan_id: plan_id,
        user_id: user_id,
        new_time_label: label,
        trace_id: trace_id
      }) do
    change_plan_schedule(%{
      plan_id: plan_id,
      user_id: user_id,
      field: "time_label",
      new_value: label,
      trace_id: trace_id
    })
  end

  @doc """
  Lead/organizer-only direct date edit. Same contract as change_plan_time/1.
  """
  # F12-61 — nil/non-binary plan_id is honest {:error, :invalid}, never a crash.
  def change_plan_date(%{plan_id: plan_id}) when not is_binary(plan_id), do: {:error, :invalid}

  def change_plan_date(%{
        plan_id: plan_id,
        user_id: user_id,
        new_date_label: label,
        trace_id: trace_id
      }) do
    change_plan_schedule(%{
      plan_id: plan_id,
      user_id: user_id,
      field: "date_label",
      new_value: label,
      trace_id: trace_id
    })
  end

  @doc """
  F12-02 — the `plan.change_time` intent execution contract (peer chat + Center).

  The extractor/reasoner layer owns classifying utterance text into the
  `plan.change_time` intent (R2 wiring — see the F12-02 note in this module's
  docs); this is the handler it calls:

      SocialFlow.apply_nl_schedule_change(%{
        conversation_id: conversation_id | nil,
        user_id: user_id,
        text: raw_text,
        trace_id: trace_id
      })

  Resolution uses the same owner-scoped "current plan" query as
  confirm_pending_revision/1 (one ordering, no per-surface shadow). Then:

  - lead/organizer → change_plan_time/1 direct edit (FOR UPDATE lock,
    revision row, audit, broadcast, calendar projection)
  - non-lead participant → propose_revision/1 (approval flow; never a silent
    direct edit)
  - no interpretable time → {:error, :no_time_found} (honest, no mutation)
  - no active plan → {:error, :no_active_plan}

  Time interpretation reuses DateTimeChange.interpret/3 — the same parser the
  alignment fold uses — so NL phrasings behave identically in chat and fold.
  """
  def apply_nl_schedule_change(attrs) when is_map(attrs) do
    user_id = Map.get(attrs, :user_id) || Map.get(attrs, "user_id")
    text = Map.get(attrs, :text) || Map.get(attrs, "text")
    conversation_id = Map.get(attrs, :conversation_id) || Map.get(attrs, "conversation_id")
    trace_id = Map.get(attrs, :trace_id) || Map.get(attrs, "trace_id") || @trace_default

    cond do
      not is_binary(user_id) or user_id == "" -> {:error, :invalid}
      not is_binary(text) or String.trim(text) == "" -> {:error, :invalid}
      true -> do_apply_nl_schedule_change(conversation_id, user_id, text, trace_id)
    end
  end

  def apply_nl_schedule_change(_), do: {:error, :invalid}

  defp do_apply_nl_schedule_change(conversation_id, user_id, text, trace_id)
       when is_binary(conversation_id) do
    with :ok <- ensure_member(conversation_id, user_id),
         {:ok, label} <- nl_schedule_label(text) do
      case resolve_nl_target(user_id, conversation_id, text) do
        {:ok, %SharedPlan{} = plan} ->
          apply_schedule_to_plan(plan, user_id, label, trace_id)

        {:ambiguous, candidates} ->
          {:error, :ambiguous,
           %{
             candidates: candidates,
             prompt:
               "Which plan did you mean: " <>
                 Enum.map_join(candidates, ", ", & &1["title"]) <> "?"
           }}

        :none ->
          {:error, :no_active_plan}
      end
    else
      {:error, _} = err -> err
    end
  end

  defp do_apply_nl_schedule_change(_conversation_id, user_id, text, trace_id) do
    # Repair #18: a conversation-less (Center) change can still resolve
    # when the utterance names a unique plan; ambiguity asks, and no
    # match keeps the honest :no_active_plan.
    with {:ok, label} <- nl_schedule_label(text) do
      case resolve_nl_target(user_id, nil, text) do
        {:ok, %SharedPlan{} = plan} -> apply_schedule_to_plan(plan, user_id, label, trace_id)
        {:ambiguous, candidates} -> {:error, :ambiguous, %{candidates: candidates}}
        :none -> {:error, :no_active_plan}
      end
    end
  end

  defp apply_schedule_to_plan(%SharedPlan{} = plan, user_id, label, trace_id) do
    if plan_lead?(plan, user_id) do
      change_plan_time(%{
        plan_id: plan.id,
        user_id: user_id,
        new_time_label: label,
        trace_id: trace_id
      })
    else
      propose_revision(%{
        plan_id: plan.id,
        proposed_by_user_id: user_id,
        changes: %{"time_label" => label},
        trace_id: trace_id
      })
    end
  end

  # Target resolution with the Center resolver's discipline
  # (resolve_plan_ref_to_id): the utterance's plan reference is scored
  # against the user's active plans (title, location, participants,
  # stored activity/who label). A unique best match wins even outside
  # the current thread; a tie asks - it never silently picks; no match
  # falls back to the thread's active plan (context is a prior, not an
  # override when the utterance names a different plan).
  defp resolve_nl_target(user_id, conversation_id, text) do
    words = plan_ref_words(text)
    candidates = if words == [], do: [], else: resolve_plan_candidates(user_id, words)

    case candidates do
      [] ->
        fallback_nl_target(conversation_id)

      [%{"plan_id" => plan_id, "score" => top} | rest] ->
        tied = Enum.filter(rest, &(&1["score"] == top))

        if tied == [] do
          case Repo.get(SharedPlan, plan_id) do
            %SharedPlan{} = plan -> {:ok, plan}
            nil -> fallback_nl_target(conversation_id)
          end
        else
          {:ambiguous, Enum.take([hd(candidates) | tied], 5)}
        end
    end
  end

  defp fallback_nl_target(conversation_id) when is_binary(conversation_id) do
    case OpalCore.SocialFlow.ConversationAlignment.active_plan_for_conversation(conversation_id) do
      %SharedPlan{} = plan -> {:ok, plan}
      nil -> :none
    end
  end

  defp fallback_nl_target(_), do: :none

  @nl_ref_stopwords ~w(change move switch push shift lets let's let the time for to at please it this that plan plans my a an do does can we i and with)
  @nl_ref_schedule_words ~w(monday tuesday wednesday thursday friday saturday sunday today tonight tomorrow morning afternoon evening night noon midnight am pm)

  @doc "Content words of a change utterance that can name a plan (verbs, schedule and clock tokens removed)."
  def plan_ref_words(text) when is_binary(text) do
    text
    |> String.downcase()
    |> String.replace(~r/\d{1,2}(:\d{2})?\s*(am|pm)?\b/, " ")
    |> String.split(~r/[^a-z0-9'&]+/, trim: true)
    |> Enum.reject(&(&1 in @nl_ref_stopwords or &1 in @nl_ref_schedule_words))
    |> Enum.uniq()
  end

  def plan_ref_words(_), do: []

  @doc """
  F18-03 disambiguation: the user's active plans scored against a plan
  reference (string or word list), best first. Each candidate carries
  plan_id, title, time_label, location and conversation_id so a caller
  can ask "which one" with an explicit list.
  """
  def resolve_plan_candidates(user_id, ref) when is_binary(user_id) do
    words =
      cond do
        is_binary(ref) -> plan_ref_words("change " <> ref <> " to")
        is_list(ref) -> ref |> Enum.filter(&is_binary/1) |> Enum.map(&String.downcase/1)
        true -> []
      end

    if words == [] do
      []
    else
      user_id
      |> user_active_plans()
      |> Enum.map(fn plan -> {plan, plan_ref_score(plan, words)} end)
      |> Enum.filter(fn {_plan, score} -> score > 0 end)
      |> Enum.sort_by(fn {_plan, score} -> score end, :desc)
      |> Enum.map(fn {plan, score} ->
        %{
          "plan_id" => plan.id,
          "title" => plan.title,
          "time_label" => plan.time_label,
          "location" => plan.location,
          "conversation_id" => plan.conversation_id,
          "score" => score
        }
      end)
    end
  end

  def resolve_plan_candidates(_, _), do: []

  defp plan_ref_score(%SharedPlan{} = plan, words) do
    participant_names =
      plan
      |> plan_participant_ids()
      |> Enum.map(fn uid ->
        case Repo.get(OpalCore.Accounts.User, uid) do
          %OpalCore.Accounts.User{display_name: name} -> String.downcase(name || "")
          _ -> ""
        end
      end)

    haystack =
      String.downcase(
        Enum.join(
          [
            plan.title || "",
            plan.location || "",
            get_in(plan.alignment || %{}, ["activity", "value"]) || "",
            get_in(plan.alignment || %{}, ["who_label"]) || "",
            get_in(plan.alignment || %{}, ["subject_who"]) || ""
          ] ++ participant_names,
          " "
        )
      )

    Enum.count(words, &String.contains?(haystack, &1))
  end

  # Interpret a change-time utterance with the fold's own temporal parser.
  # Returns {:ok, label} or {:error, :no_time_found} — never invents a time.
  defp nl_schedule_label(text) do
    case OpalCore.SocialFlow.DateTimeChange.interpret(text, %{}, scoped: true) do
      {:change, %{"summary" => summary}} when is_binary(summary) ->
        cond do
          # Repair #13 (W1-01) - the open-chat NL path never invents AM/PM
          # (extends the pinned R2 bare-hour law). DateTimeChange defaults a
          # missing meridiem to PM, so "Saturday after 10" became
          # "after 10 PM", "around 8" became "about 8:00 PM", and "make it 8"
          # became "8:00 PM" - a mutated plan with an invented half-day. When
          # the utterance carries no meridiem signal of its own but the
          # interpretation pins AM/PM, refuse honestly instead of mutating.
          invented_meridiem?(text, summary) ->
            {:error, :no_time_found}

          :ok == validate_schedule_label(summary) ->
            {:ok, summary}

          true ->
            {:error, :no_time_found}
        end

      _ ->
        {:error, :no_time_found}
    end
  end

  # The open-chat NL path refuses when the interpretation pins a meridiem the
  # user never uttered. The signal reader mirrors DateTimeChange's own
  # meridiem/2 (substring "am"/"pm" on normalized text, plus a.m./p.m.
  # collapsing) so the guard agrees with the parser about what counts as
  # said: "8pm" and "8 pm" both read as PM to the parser, and both count
  # here. noon/midnight pin a half-day outright.
  @nl_pinned_meridiem_re ~r/\b(AM|PM)\b/

  defp user_meridiem_signal?(text) when is_binary(text) do
    down =
      text
      |> String.downcase()
      |> String.replace(~r/\bp\s*\.?\s*m\b/, "pm")
      |> String.replace(~r/\ba\s*\.?\s*m\b/, "am")

    String.contains?(down, "am") or String.contains?(down, "pm") or
      Regex.match?(~r/\b(noon|midnight)\b/, down)
  end

  defp user_meridiem_signal?(_), do: false

  defp invented_meridiem?(text, summary)
       when is_binary(text) and is_binary(summary) do
    not user_meridiem_signal?(text) and Regex.match?(@nl_pinned_meridiem_re, summary)
  end

  defp invented_meridiem?(_, _), do: false

  @doc """
  F12-06/F12-07 — owner-scoped plan listing (backs GET /api/v1/product/opal/plans).

  Returns the user's SharedPlans — including conversation-less Center plans
  (source "center") that every conversation-scoped read path excludes — newest
  first. Ownership = created_by_user_id OR a PlanParticipant row for the user.
  Cancelled plans are excluded by default; pass `status: :all` for history.

  This is the one owner-scoped plan query feeding the Graphs/Timeline
  projections (gyroscope: no per-surface shadow state).
  """
  def list_plans_for_user(user_id, opts \\ []) when is_binary(user_id) do
    # Repair #18 (Division A): lazy stale-tentative expiry on the read
    # path (proposal pattern) - no sweeper needed for correctness.
    _ = expire_stale_tentative_plans(user_id)

    participant_plan_ids =
      from(pp in PlanParticipant, where: pp.user_id == ^user_id, select: pp.plan_id)
      |> Repo.all()

    q =
      from(p in SharedPlan,
        where: p.created_by_user_id == ^user_id or p.id in ^participant_plan_ids,
        order_by: [desc: p.updated_at, desc: p.inserted_at],
        limit: 100
      )

    q =
      if Keyword.get(opts, :status) == :all do
        q
      else
        from(p in q, where: p.status not in ^["cancelled", "expired"])
      end

    plans = Repo.all(q)

    # Repair #18: the Center/Graphs list is viewer-scoped - each listed
    # plan also carries the viewer's own canonical state (viewer_state)
    # from the same one counter, when the plan has participant rows.
    {:ok,
     Enum.map(plans, fn plan ->
       payload = plan_payload(plan)

       case JourneyAuthority.attendance_contract(plan.id, user_id) do
         %{"viewer_state" => viewer_state} -> Map.put(payload, "viewer_state", viewer_state)
         _ -> payload
       end
     end)}
  end

  def list_plans_for_user(_, _), do: {:error, :invalid}

  @doc """
  F12-05/F12-07 — explicit share-to-chat authority path.

  Projects an owner-private Center plan into a human conversation the user
  explicitly chooses. Lead-only (the plan's lead or creator). Writes a durable
  plan-announcement Signal on the conversation (never a fake human message),
  audits, projects to the native calendar (idempotent per plan version), and
  broadcasts on the conversation topic.

  The plan itself stays owner-scoped (conversation_id untouched) — sharing is
  a projection, not a move. This is the lawful replacement for the old
  maybe_project_peer_chat stub and respects OpalPlanConfirm's boundary:
  nothing auto-opens a human conversation; the user picks the destination.
  """
  def share_plan_to_conversation(
        %{
          plan_id: plan_id,
          user_id: user_id,
          conversation_id: conversation_id
        } = attrs
      )
      when is_binary(plan_id) and is_binary(user_id) and is_binary(conversation_id) do
    trace_id = Map.get(attrs, :trace_id) || Map.get(attrs, "trace_id") || @trace_default

    with %SharedPlan{} = plan <- Repo.get(SharedPlan, plan_id) || {:error, :not_found},
         :ok <- ensure_plan_access(plan, user_id),
         :ok <- ensure_member(conversation_id, user_id) do
      cond do
        not plan_lead?(plan, user_id) ->
          {:error, :not_authorized}

        plan.status == "cancelled" ->
          {:error, :invalid_status}

        true ->
          case Repo.transaction(fn ->
                 signal =
                   insert_signal!(%{
                     conversation_id: conversation_id,
                     plan_id: plan.id,
                     kind: "plan_shared",
                     status: "visible",
                     copy: share_announcement_copy(plan),
                     visibility: "shared",
                     actions: %{"items" => []}
                   })

                 audit!(
                   conversation_id,
                   plan.id,
                   user_id,
                   "plan.shared_to_conversation",
                   %{"plan_id" => plan.id, "conversation_id" => conversation_id},
                   trace_id
                 )

                 _ = OpalCore.SocialFlow.OpalCalendar.project_from_shared_plan(plan)

                 signal
               end) do
            {:ok, signal} ->
              broadcast(
                conversation_id,
                "social_flow:plan",
                %{
                  "plan" => plan_payload(plan),
                  "signal" => Signal.to_contract(signal),
                  "shared" => true
                },
                trace_id
              )

              {:ok, %{plan: plan, signal: signal}}

            {:error, reason} ->
              {:error, reason}
          end
      end
    else
      nil -> {:error, :not_found}
      {:error, _} = err -> err
    end
  end

  def share_plan_to_conversation(_), do: {:error, :invalid}

  defp share_announcement_copy(%SharedPlan{} = plan) do
    when_bit = plan.time_label || "time to be set"
    "Shared a plan: #{plan.title || "Plans"} · #{when_bit}"
  end

  # Version marker choice (documented): a PlanRevision row with
  # proposed_changes["kind"] == "schedule_change", status "accepted", and
  # approvals %{lead => "accept"}, linked via plan.current_revision_id — the
  # revision chain is the version log (no migration). Time patches
  # plan.time_label; date has no dedicated column (no migration in repair #11),
  # so the date label lives in alignment display metadata plus the revision
  # history. Transaction + broadcast-after-commit, payload carries the change.
  #
  # F12-02c (gyroscope): the same transaction also appends a "schedule_change"
  # explicit action to the alignment fold's action log. Without it, the next
  # sync_conversation recomputes time_label from fold state that is blind to
  # PlanRevision rows and reverts the lead's edit. The revision chain stays
  # the schedule authority; the action is its fold-visible projection.
  #
  # F12-05d: every schedule write projects to the native Opal calendar, so
  # direct edits land on the calendar too — not just proposal agreements.
  defp change_plan_schedule(%{
         plan_id: plan_id,
         user_id: user_id,
         field: field,
         new_value: value,
         trace_id: trace_id
       })
       when field in ~w(time_label date_label) do
    trace = trace_id || @trace_default

    case Repo.transaction(fn ->
           plan =
             from(p in SharedPlan, where: p.id == ^plan_id, lock: "FOR UPDATE")
             |> Repo.one()

           with %SharedPlan{} = plan <- plan,
                :ok <- ensure_plan_access(plan, user_id),
                :ok <- validate_schedule_label(value) do
             # Verbatim authority: this is the schedule-write entry
             # whose callers compose the label (lead direct edits,
             # the Center's clock corrections) and whose contract is
             # the round-trip - the stored label and the broadcast
             # new_value read back exactly what the caller composed
             # (Repair #11/#12 law). Canonical resolution of raw
             # fragments lives on the revision-accept paths
             # (apply_locked_revision, record_fold_change_acceptance),
             # never here.

             cond do
               not plan_lead?(plan, user_id) ->
                 Repo.rollback(:not_authorized)

               # Gyroscope (R13): terminal is terminal — a completed plan's
               # schedule is history, not something to edit.
               PlanTransition.terminal?(:plan, plan.status) ->
                 Repo.rollback(:invalid_status)

               true ->
                 now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

                 # F12-02c — the revision chain is the sole schedule authority.
                 # The date_label lives in the alignment map; merge it first so
                 # the explicit action below doesn't clobber it.
                 base_alignment =
                   case field do
                     "date_label" -> Map.put(plan.alignment || %{}, "date_label", value)
                     _ -> plan.alignment || %{}
                   end

                 plan_attrs =
                   case field do
                     "time_label" -> %{time_label: value}
                     "date_label" -> %{}
                   end

                 {:ok, revision} =
                   %PlanRevision{}
                   |> PlanRevision.changeset(%{
                     plan_id: plan.id,
                     proposed_by_user_id: user_id,
                     prior_revision_id: plan.current_revision_id,
                     proposed_changes: %{
                       "kind" => "schedule_change",
                       "field" => field,
                       "new_value" => value
                     },
                     status: "accepted",
                     accepted_at: now,
                     required_approvals: [user_id],
                     approvals: %{user_id => "accept"}
                   })
                   # Gyroscope (R13): a lead's direct edit is born accepted —
                   # the gate records that creation path, never "proposed".
                   |> PlanTransition.guard_changeset(:revision, :accept_direct)
                   |> Repo.insert()

                 alignment =
                   append_explicit_action(base_alignment, %{
                     "kind" => "schedule_change",
                     "actor_user_id" => user_id,
                     "field" => field,
                     "value" => value,
                     "truth" => "locked",
                     "explicit" => true,
                     "schema_version" =>
                       OpalCore.SocialFlow.ConversationAlignment.schema_version(),
                     "revision_id" => revision.id,
                     "at" => DateTime.to_iso8601(now)
                   })

                 # Repair #18: a lead's direct edit is an accepted change
                 # too - stored projections move in the same write.
                 {alignment, plan_attrs} =
                   if field == "time_label" do
                     {sync_stored_schedule(alignment, plan, value, revision.id, now),
                      Map.put(plan_attrs, :start_at, resolved_start_at(plan, value, %{}))}
                   else
                     {alignment, plan_attrs}
                   end

                 {:ok, plan} =
                   plan
                   |> SharedPlan.changeset(
                     Map.merge(plan_attrs, %{
                       current_revision_id: revision.id,
                       alignment: alignment
                     })
                   )
                   |> Repo.update()

                 audit!(
                   plan.conversation_id,
                   plan.id,
                   user_id,
                   "plan.schedule_changed",
                   %{
                     "field" => field,
                     "new_value" => value,
                     "revision_id" => revision.id
                   },
                   trace
                 )

                 # Supersede prior calendar versions and project the new
                 # schedule — same discipline as the revision-accept path.
                 _ =
                   OpalCore.SocialFlow.OpalCalendar.project_from_shared_plan(plan,
                     plan_version: 2
                   )

                 {plan, revision}
             end
           else
             nil -> Repo.rollback(:not_found)
             {:error, reason} -> Repo.rollback(reason)
           end
         end) do
      {:ok, {plan, revision}} ->
        broadcast_plan(
          plan,
          "social_flow:plan",
          %{
            "plan" => plan_payload(plan),
            "schedule_change" => %{
              "field" => field,
              "new_value" => value,
              "revision_id" => revision.id
            }
          },
          trace
        )

        # F12-08 — the alignment strip / plan projections derive from the
        # alignment snapshot, so a direct schedule edit must also publish
        # the snapshot refresh the frontend needs. R3 consumes this event;
        # the payload carries everything to re-render without a refetch.
        broadcast_plan(
          plan,
          "social_flow:alignment_updated",
          %{
            "plan_id" => plan.id,
            "conversation_id" => plan.conversation_id,
            "time_label" => plan.time_label,
            "date_label" => get_in(plan.alignment || %{}, ["date_label"]),
            "status" => plan.status,
            "revision_id" => revision.id,
            "source" => "schedule_change",
            "lead_user_id" => lead_user_id(plan),
            "organizer_name" => organizer_name(plan)
          },
          trace
        )

        # Repair #16 (W4, P3) — a lead's direct schedule edit is a
        # material mutation: record it for the plan's people
        # (post-commit), keyed by the revision row the edit created.
        _ =
          PlanRecentChanges.record_schedule_changed(
            plan,
            "rev-#{revision.id}",
            field,
            value
          )

        {:ok, %{plan: plan}}

      {:error, reason} ->
        {:error, reason}
    end
  end

  # F12-54 — a schedule label is user-visible on every surface; garbage
  # accepted here persists verbatim into time_label and renders in UI.
  # A label must carry at least a time signal (digit, meridiem, day/month
  # name, or relative-time word); content-free tokens like "asdf" are
  # rejected, never normalized into a fake schedule.
  @schedule_label_time_re ~r/\b(am|pm|a\.m\.|p\.m\.|noon|midnight|morning|afternoon|evening|night|today|tonight|tomorrow|weekend|tbd|tba|flexible|later|soon|window|sometime)\b/i
  @schedule_label_day_re ~r/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\b/i

  defp validate_schedule_label(value) when is_binary(value) do
    trimmed = String.trim(value)

    cond do
      trimmed == "" ->
        {:error, :invalid_label}

      String.length(trimmed) > 120 ->
        {:error, :invalid_label}

      Regex.match?(~r/\d/, trimmed) ->
        :ok

      Regex.match?(@schedule_label_day_re, trimmed) ->
        :ok

      Regex.match?(@schedule_label_time_re, trimmed) ->
        :ok

      true ->
        {:error, :invalid_label}
    end
  end

  defp validate_schedule_label(_), do: {:error, :invalid_label}

  # --- Visibility-aware sync ---

  def sync_for_user(conversation_id, user_id) do
    with :ok <- ensure_member(conversation_id, user_id) do
      proposals =
        from(p in Proposal,
          where: p.conversation_id == ^conversation_id and p.status not in ^["superseded"],
          order_by: [desc: p.inserted_at],
          limit: 20
        )
        |> Repo.all()
        |> Enum.map(&Proposal.to_contract/1)

      plans =
        from(p in SharedPlan,
          where: p.conversation_id == ^conversation_id,
          order_by: [desc: p.inserted_at],
          limit: 20
        )
        |> Repo.all()
        # Repair #11 (B3): carry the lead/organizer identity in sync payloads.
        |> Enum.map(&plan_payload/1)

      plan_ids = Enum.map(plans, & &1["id"])

      commitments =
        from(c in PlanCommitment,
          where:
            c.plan_id in ^plan_ids and (c.visibility == "shared" or c.owner_user_id == ^user_id)
        )
        |> Repo.all()
        |> Enum.map(&PlanCommitment.to_contract/1)

      reminders =
        from(r in PlanReminder,
          where:
            r.owner_user_id == ^user_id or
              (r.visibility == "shared" and r.plan_id in ^plan_ids)
        )
        |> Repo.all()
        |> Enum.filter(fn r ->
          r.visibility == "shared" or r.owner_user_id == user_id
        end)
        |> Enum.map(&PlanReminder.to_contract/1)

      revisions =
        from(r in PlanRevision, where: r.plan_id in ^plan_ids, order_by: [desc: r.inserted_at])
        |> Repo.all()
        |> Enum.map(&PlanRevision.to_contract/1)

      # Repair #17 (W4-1) — pending (proposed, undecided) revisions are the
      # surfaceable current truth while they are open: a surface reading this
      # payload must show the pending proposal, not present the plan's old
      # time_label as locked/current.
      pending_revisions =
        Enum.filter(revisions, fn r -> r["status"] == "proposed" end)

      signals =
        from(s in Signal,
          where:
            s.conversation_id == ^conversation_id and
              (is_nil(s.audience_user_id) or s.audience_user_id == ^user_id) and
              (s.visibility == "shared" or s.audience_user_id == ^user_id),
          order_by: [desc: s.inserted_at],
          limit: 50
        )
        |> Repo.all()
        |> Enum.map(&Signal.to_contract/1)

      proposal_ids = Enum.map(proposals, & &1["id"])

      options =
        from(o in PlanOption,
          where: o.proposal_id in ^proposal_ids,
          order_by: [asc: o.sort_order]
        )
        |> Repo.all()
        |> Enum.map(&PlanOption.to_contract/1)

      {:ok,
       %{
         "schema_version" => "0.1.0",
         "conversation_id" => conversation_id,
         "proposals" => proposals,
         "options" => options,
         "plans" => plans,
         "commitments" => commitments,
         "reminders" => reminders,
         "revisions" => revisions,
         "pending_revisions" => pending_revisions,
         "signals" => signals
       }}
    end
  end

  def get_reminder_for_user(reminder_id, user_id) do
    case Repo.get(PlanReminder, reminder_id) do
      %PlanReminder{visibility: "private", owner_user_id: ^user_id} = r ->
        {:ok, r}

      %PlanReminder{visibility: "shared"} = r ->
        plan = Repo.get(SharedPlan, r.plan_id)

        if plan && member?(plan.conversation_id, user_id) do
          {:ok, r}
        else
          {:error, :forbidden}
        end

      %PlanReminder{} ->
        {:error, :forbidden}

      nil ->
        {:error, :not_found}
    end
  end

  # Repair #13 (F13-03) — access goes through ensure_plan_access/2 so
  # conversation-less Center plans are readable by their creator/participants.
  # The old member?/2 check compared conversation_id == nil and always missed,
  # so a Center plan's own owner got :forbidden here. The public contract is
  # unchanged: {:ok, plan} | {:error, :forbidden} | {:error, :not_found}.
  def get_plan_for_user(plan_id, user_id) do
    # Repair #16 (W1): a junk (non-UUID) id is a guessed id — the contract is
    # :not_found, not a CastError crash on the read path.
    if not match?({:ok, _}, Ecto.UUID.cast(plan_id)) do
      {:error, :not_found}
    else
      do_get_plan_for_user(plan_id, user_id)
    end
  end

  defp do_get_plan_for_user(plan_id, user_id) do
    case Repo.get(SharedPlan, plan_id) do
      %SharedPlan{} = plan ->
        case ensure_plan_access(plan, user_id) do
          :ok -> {:ok, plan}
          {:error, _} -> {:error, :forbidden}
        end

      nil ->
        {:error, :not_found}
    end
  end

  # --- helpers ---

  defp supersede_open_proposals!(conversation_id) do
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    # Gyroscope (R13): the supersedeable set comes from the gate's table, not
    # a hardcoded list — the filter can never drift from the legal moves.
    from(p in Proposal,
      where:
        p.conversation_id == ^conversation_id and
          p.status in ^PlanTransition.from_statuses(:proposal, :supersede)
    )
    |> Repo.update_all(set: [status: "superseded", superseded_at: now, updated_at: now])
  end

  defp insert_signal!(attrs) do
    %Signal{}
    |> Signal.changeset(attrs)
    |> Repo.insert!()
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

  # F12-07 — a nil conversation_id used to publish to the degenerate topic
  # "social_flow:conversation:" with zero subscribers, so Center-plan
  # mutations were silent everywhere. broadcast/4 now refuses a nil topic;
  # plan events go through broadcast_plan/4, which fans conversation-less
  # plans out on an owner-scoped user topic instead.
  defp broadcast(nil, _event, _payload, _trace_id), do: :ok

  defp broadcast(conversation_id, event, payload, trace_id) do
    envelope = Contracts.event_envelope(event, payload, trace_id)

    # Dedicated topic — never share the Phoenix channel topic (Presence uses that).
    Phoenix.PubSub.broadcast(
      OpalCore.PubSub,
      "social_flow:conversation:#{conversation_id}",
      {:social_flow_event, event, envelope}
    )

    :ok
  end

  # Owner-scoped plan fanout (gyroscope): conversation plans publish on the
  # conversation topic; conversation-less Center plans publish on the owner's
  # user topic so Graphs/Timeline/Calendar subscribers still hear them.
  defp broadcast_plan(%SharedPlan{conversation_id: cid}, event, payload, trace_id)
       when is_binary(cid) and cid != "" do
    broadcast(cid, event, payload, trace_id)

    # Gyroscope (R13) — projection coherence: the SocialMemory recall cache is
    # a derived projection of plan state (R11 runner-up: 60s TTL with no
    # invalidation on plan edits). Every committed chat-track mutation lands
    # here (R11 task 5: broadcast only after commit); the journey track calls
    # invalidate_derived/2 directly. A miss recomputes from the single
    # store; no surface can serve a pre-mutation recall.
    PlanProjection.invalidate_derived(cid, member_user_ids(cid))
  end

  defp broadcast_plan(%SharedPlan{created_by_user_id: uid}, event, payload, trace_id)
       when is_binary(uid) do
    envelope = Contracts.event_envelope(event, payload, trace_id)

    Phoenix.PubSub.broadcast(
      OpalCore.PubSub,
      "social_flow:user:#{uid}",
      {:social_flow_event, event, envelope}
    )

    :ok
  end

  defp broadcast_plan(_, _, _, _), do: :ok

  # Appends one explicit action to the alignment fold's action log — the
  # fold-visible projection of a direct revision write (F12-02c). Each direct
  # edit is a deliberate act with its own revision row, so no dedupe here;
  # replay order is by the action's "at" timestamp.
  defp append_explicit_action(alignment, action) when is_map(alignment) and is_map(action) do
    actions = Map.get(alignment, "explicit_actions") || []
    Map.put(alignment, "explicit_actions", actions ++ [action])
  end

  # Repair #18 (Division A, F18-02 read-back truth) - an accepted schedule
  # change must move EVERY stored projection in the same transaction:
  # the stored alignment's exact_time field (what Messages'
  # current_plan_alignment and HomeProjection read), the plan row's
  # resolved start_at, and the plan_set_event summary (which the fold
  # otherwise freezes at the first committed value forever). Surfaces
  # reading the row after acceptance therefore all read the new time.
  defp sync_stored_schedule(alignment, %SharedPlan{} = plan, time_label, revision_id, now)
       when is_binary(time_label) do
    alignment = if is_map(alignment), do: alignment, else: %{}

    exact =
      Map.merge(alignment["exact_time"] || %{}, %{
        "state" => "locked",
        "value" => time_label,
        "needs_confirm" => false,
        "explicit" => true,
        "truth" => "locked",
        "schedule_change_revision_id" => revision_id
      })

    alignment
    |> Map.put("exact_time", exact)
    |> Map.put(
      "plan_set_event",
      regenerated_plan_set_event(plan, alignment, time_label, revision_id, now)
    )
  end

  defp regenerated_plan_set_event(%SharedPlan{} = plan, alignment, time_label, revision_id, now) do
    date = get_in(alignment || %{}, ["date", "value"]) || plan_alignment_date_label(plan)
    place = get_in(alignment || %{}, ["place", "value"]) || plan.location

    summary =
      [date, time_label, place]
      |> Enum.filter(&(is_binary(&1) and &1 != ""))
      |> Enum.uniq()
      |> Enum.join(" · ")

    %{
      "summary" => summary,
      "at" => DateTime.to_iso8601(now),
      "regenerated_from_revision_id" => revision_id
    }
  end

  defp plan_alignment_date_label(%SharedPlan{alignment: alignment}) when is_map(alignment),
    do: alignment["date_label"]

  defp plan_alignment_date_label(_), do: nil

  # Resolve the plan row's start_at for a newly accepted label: an
  # explicit start_at in the changes wins; an existing start_at keeps
  # its date and takes the new clock; otherwise the canonical start of
  # the relabeled plan (weekday/daypart + clock) is resolved once, here,
  # so every later comparison (conflict gate, NowStrip) has an instant.
  defp resolved_start_at(%SharedPlan{} = plan, time_label, changes) do
    explicit =
      case changes["start_at"] do
        value when is_binary(value) ->
          case DateTime.from_iso8601(value) do
            {:ok, dt, _} -> dt
            _ -> nil
          end

        %DateTime{} = dt ->
          dt

        _ ->
          nil
      end

    cond do
      not is_nil(explicit) ->
        explicit

      match?(%DateTime{}, plan.start_at) ->
        case PlanIdentity.parse_clock(time_label || "") do
          nil ->
            plan.start_at

          clock ->
            [hour, minute] = String.split(clock, ":")

            date = DateTime.to_date(plan.start_at)

            case DateTime.new(
                   date,
                   Time.new!(String.to_integer(hour), String.to_integer(minute), 0),
                   "Etc/UTC"
                 ) do
              {:ok, dt} -> dt
              _ -> plan.start_at
            end
        end

      true ->
        PlanIdentity.canonical_start(%{
          plan
          | time_label: time_label,
            alignment:
              Map.put(plan.alignment || %{}, "exact_time", %{
                "state" => "locked",
                "value" => time_label
              })
        }) || plan.start_at
    end
  end

  # F12-59 (gyroscope) — ONE owner-scoped ordering for "the conversation's
  # current plan". Delegates to ConversationAlignment.active_plan_for_conversation/1
  # (updated_at desc, inserted_at desc) — the same query sync_conversation and
  # messages.current_plan_alignment use — so confirm_pending_revision/1 always
  # acts on the plan the client is showing. Never order by inserted_at alone here.
  defp latest_plan(conversation_id) do
    OpalCore.SocialFlow.ConversationAlignment.active_plan_for_conversation(conversation_id)
  end

  # --- Repair #11: single lead/organizer authority (B1) ---
  #
  # Role vocabulary matches JourneyAuthority exactly: "lead"/"co_lead" hold
  # authority, everyone else is "participant". The chat path's create_shared_plan
  # now stamps the creator as "lead" (JourneyAuthority.role_for/2 does the same
  # for journey plans). plan_lead?/2 mirrors JourneyAuthority.require_lead/2's
  # fallback: with no lead participant row (plans created before repair #11),
  # the plan creator (created_by_user_id) decides.
  @lead_roles ~w(lead co_lead)

  defp plan_participant(plan_id, user_id) do
    Repo.get_by(PlanParticipant, plan_id: plan_id, user_id: user_id)
  end

  defp plan_lead?(%SharedPlan{} = plan, user_id) do
    case plan_participant(plan.id, user_id) do
      %PlanParticipant{role: role} when role in @lead_roles -> true
      %PlanParticipant{} -> false
      nil -> plan.created_by_user_id == user_id
    end
  end

  defp lead_user_ids(plan_id) do
    from(pp in PlanParticipant,
      where: pp.plan_id == ^plan_id and pp.role in ^@lead_roles,
      select: pp.user_id
    )
    |> Repo.all()
  end

  defp lead_user_id(%SharedPlan{} = plan) do
    case Repo.get_by(PlanParticipant, plan_id: plan.id, role: "lead") ||
           Repo.get_by(PlanParticipant, plan_id: plan.id, role: "co_lead") do
      %PlanParticipant{user_id: uid} -> uid
      nil -> plan.created_by_user_id
    end
  end

  # Plan contract enriched with lead identity for surfaces (B3).
  # Uses JourneyAuthority's existing "lead_user_id" projection key.
  # Repair #18 (Division A): the ONE attendance counter rides this
  # contract too (going_count / interested_count / total_count from
  # PlanParticipant rows) - merged only when rows exist, so a plan with
  # no participants carries NO count fields (absence is honest).
  # Repair #18 (Division A): every plan payload also carries its dedupe
  # key and its F18-03 conflict (or nil) - the projection IS the output
  # the conflict gate is required to surface on, including the proactive
  # case where canonical times landed without a new user action (seed,
  # fold): reading the plan shows the overlap.
  @doc """
  The ONE canonical schedule label for a plan (Repair #18 residuals
  R-2b). Untouched plans read day-aware with a normalized clock -
  "tomorrow 8:00 PM", "Thursday 7:30 PM". Change paths used to write
  whatever fragment arrived ("8 PM") verbatim into time_label, so a
  revised plan read differently from an untouched one on every
  surface. Every schedule write (revision accept, lead direct edit,
  fold-accept mirror) resolves through here:

  - the clock is normalized to "H:MM AM/PM" form;
  - the day part comes from the value itself when it names one
    (today / tomorrow / a weekday), preserved in the form it was
    written - including the "Day at Time" joiner untouched plans
    carry ("Friday at 9:00 PM"). A value naming no day stays
    day-less: an accepted revision's proposed label is the
    authoritative write, and the fold paths hand in labels that
    already carry their day, so no day is ever inherited from the
    plan's previous label here;
  - a value with no parseable clock is returned unchanged (windows
    and day-only labels are lawful labels, not fragments to invent
    a clock for).
  """
  def canonical_time_label(%SharedPlan{}, value) when is_binary(value) do
    case canonical_clock_label(value) do
      nil ->
        value

      clock ->
        case day_part(value) do
          nil ->
            clock

          day ->
            if Regex.match?(~r/\bat\s+\d/i, value) do
              day <> " at " <> clock
            else
              day <> " " <> clock
            end
        end
    end
  end

  def canonical_time_label(_, value), do: value

  defp canonical_clock_label(value) do
    case Regex.run(~r/(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i, value) do
      [_, hour, minute, meridiem] ->
        minute = if minute in [nil, ""], do: "00", else: minute
        "#{String.to_integer(hour)}:#{minute} #{String.upcase(meridiem)}"

      _ ->
        case PlanIdentity.parse_clock(value) do
          nil ->
            nil

          <<h24::binary-size(2), ":", mm::binary>> ->
            h = String.to_integer(h24)

            cond do
              h == 0 -> "12:#{mm} AM"
              h < 12 -> "#{h}:#{mm} AM"
              h == 12 -> "12:#{mm} PM"
              true -> "#{h - 12}:#{mm} PM"
            end

          _ ->
            nil
        end
    end
  end

  # The day token as written - full ("Thursday") or abbreviated
  # ("Sat") - preserved verbatim in form, because untouched plans
  # carry both and a revision must not silently restyle the day.
  @day_token_re ~r/\b(tomorrow|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tues|tue|wed|thurs|thur|thu|fri|sat|sun)\b/i

  defp day_part(text) when is_binary(text) do
    case Regex.run(@day_token_re, text) do
      [_, token] ->
        down = String.downcase(token)

        if down in ["tomorrow", "today"] do
          down
        else
          String.capitalize(token)
        end

      _ ->
        nil
    end
  end

  defp day_part(_), do: nil

  @doc """
  The ONE plan projection output: the contract every surface renders,
  on read paths AND on creation responses alike (Repair #18 residuals
  R-1: a create response built from SharedPlan.to_contract/1 alone
  silently dropped the conflict object, the attendance contract and
  the lead identity the listing carries, so the creating surface never
  saw a double-booking flag the listing would have shown).
  """
  def plan_payload(%SharedPlan{} = plan) do
    plan
    |> SharedPlan.to_contract()
    |> Map.put("lead_user_id", lead_user_id(plan))
    |> Map.put("organizer_name", organizer_name(plan))
    |> Map.merge(JourneyAuthority.attendance_contract(plan.id))
    |> Map.put("conflict", plan_conflict(plan))
  end

  # -------------------------------------------------------------------
  # Repair #18 (Division A) - dedupe identity, conflict gate, cleanup
  # -------------------------------------------------------------------

  @doc """
  Participant user ids for a plan row (PlanParticipant rows; falls back
  to the alignment participants field for fold-born rows that predate
  participant rows, then to the creator alone).
  """
  def plan_participant_ids(%SharedPlan{} = plan) do
    ids =
      from(pp in PlanParticipant, where: pp.plan_id == ^plan.id, select: pp.user_id)
      |> Repo.all()

    cond do
      ids != [] ->
        Enum.uniq(ids)

      is_list(get_in(plan.alignment || %{}, ["participants", "value"])) ->
        get_in(plan.alignment, ["participants", "value"]) |> Enum.filter(&is_binary/1)

      is_binary(plan.created_by_user_id) ->
        [plan.created_by_user_id]

      true ->
        []
    end
  end

  @doc "Dedupe components + key for a persisted plan (PlanIdentity is the one definition)."
  def plan_dedupe_components(%SharedPlan{} = plan) do
    PlanIdentity.components_for_plan(plan, plan_participant_ids(plan))
  end

  def plan_dedupe_key(%SharedPlan{} = plan),
    do: plan |> plan_dedupe_components() |> PlanIdentity.dedupe_key()

  @doc """
  F18-03 conflict gate: the first of the plan owner's OTHER active plans
  whose canonical window overlaps this plan's, as
  %{with_plan_id, title, time_label} - or nil. Plans with no resolvable
  canonical time cannot conflict (there is nothing honest to compare).
  """
  def plan_conflict(%SharedPlan{} = plan) do
    detect_conflict(plan.created_by_user_id, plan, plan.id)
  end

  def plan_conflict(_), do: nil

  @doc """
  Conflict for a candidate plan shape (create / revision-accept time):
  `plan` supplies title, time_label, start/end and alignment.
  """
  def detect_conflict(owner_id, %SharedPlan{} = candidate, exclude_plan_id)
      when is_binary(owner_id) do
    case PlanIdentity.window(candidate) do
      nil ->
        nil

      {_, _} = window ->
        owner_id
        |> user_active_plans()
        |> Enum.reject(&(&1.id == exclude_plan_id or &1.id == candidate.id))
        |> Enum.find_value(fn other ->
          case PlanIdentity.window(other) do
            nil ->
              nil

            other_window ->
              if PlanIdentity.windows_overlap?(window, other_window) do
                %{
                  "with_plan_id" => other.id,
                  "title" => other.title,
                  "time_label" => other.time_label
                }
              end
          end
        end)
    end
  end

  def detect_conflict(_, _, _), do: nil

  @doc "The user's active (tentative/agreed/changed) plans as creator or participant."
  def user_active_plans(user_id) when is_binary(user_id) do
    participant_plan_ids =
      from(pp in PlanParticipant, where: pp.user_id == ^user_id, select: pp.plan_id)
      |> Repo.all()

    from(p in SharedPlan,
      where:
        p.status in ^~w(tentative agreed changed) and
          (p.created_by_user_id == ^user_id or p.id in ^participant_plan_ids),
      order_by: [desc: p.updated_at, desc: p.inserted_at],
      limit: 100
    )
    |> Repo.all()
  end

  def user_active_plans(_), do: []

  # Find an existing non-terminal plan owned by `owner_id` whose dedupe
  # components match `components` (day may be open on either side).
  defp find_dedupe_survivor(owner_id, components, opts \\ []) do
    exclude_id = Keyword.get(opts, :exclude_id)

    owner_id
    |> user_active_plans()
    |> Enum.reject(&(&1.id == exclude_id))
    |> Enum.find(fn plan ->
      PlanIdentity.components_match?(components, plan_dedupe_components(plan))
    end)
  end

  # Alignment stamp carrying the dedupe identity computed at creation.
  defp dedupe_alignment(alignment, owner_id, participant_ids, attrs) do
    components = PlanIdentity.components(owner_id, participant_ids, attrs)

    Map.put(alignment, "dedupe", Map.put(components, "key", PlanIdentity.dedupe_key(components)))
  end

  # Merge-not-overwrite: a dedupe collision fills the survivor's EMPTY
  # slots from the new fragments and stamps the merge - it never
  # overwrites a resolved field (a conflicting fragment is a revision's
  # job, not a create's).
  defp merge_fragments_into(%SharedPlan{} = survivor, attrs) do
    updates =
      %{}
      |> maybe_fill(
        :location,
        survivor.location,
        present_string(attrs["location"] || attrs["place"])
      )
      |> maybe_fill(:time_label, survivor.time_label, present_string(attrs["time_label"]))
      |> maybe_fill_title(survivor, present_string(attrs["title"]))

    alignment =
      (survivor.alignment || %{})
      |> Map.put(
        "dedupe_merged_at",
        DateTime.utc_now() |> DateTime.truncate(:microsecond) |> DateTime.to_iso8601()
      )

    updates = Map.put(updates, :alignment, alignment)

    if map_size(updates) > 1 or updates[:alignment] != survivor.alignment do
      case survivor |> SharedPlan.changeset(updates) |> Repo.update() do
        {:ok, updated} -> updated
        _ -> survivor
      end
    else
      survivor
    end
  end

  defp maybe_fill(acc, _field, current, _new) when is_binary(current) and current != "", do: acc

  defp maybe_fill(acc, field, _current, new) when is_binary(new) and new != "",
    do: Map.put(acc, field, new)

  defp maybe_fill(acc, _field, _current, _new), do: acc

  defp maybe_fill_title(acc, %SharedPlan{title: current}, new)
       when is_binary(new) and new != "" do
    if current in [nil, "", "Meetup", "Meetup.", "Plan", "Plans"] do
      Map.put(acc, :title, new)
    else
      acc
    end
  end

  defp maybe_fill_title(acc, _, _), do: acc

  @doc """
  F18-06 one-time cleanup for already-duplicated plans (dry-run capable,
  transition-based, no deletion). Groups the user's non-terminal plans
  by dedupe identity; per group the richest row survives (agreed over
  changed over tentative, then most participants, then latest update),
  losers are cancelled through PlanTransition with merged_into stamps,
  and the survivor absorbs only empty-slot fragments from losers.

  Returns {:ok, report} with groups, survivor ids, loser ids and (for
  dry runs) would_cancel ids. Idempotent: cancelled losers leave the
  active set, so a second run finds no groups.
  """
  def cleanup_duplicate_plans(user_id, opts \\ []) when is_binary(user_id) do
    dry_run = Keyword.get(opts, :dry_run, true)
    plans = user_active_plans(user_id)

    groups =
      plans
      |> Enum.group_by(fn plan -> plan |> plan_dedupe_components() |> Map.delete("day") end)
      |> Enum.flat_map(fn {_base, members} -> cluster_by_dedupe(members) end)
      |> Enum.filter(&(length(&1) > 1))

    results =
      Enum.map(groups, fn members ->
        [survivor | losers] = sort_survivor_first(members)

        if dry_run do
          %{
            "survivor_id" => survivor.id,
            "would_cancel" => Enum.map(losers, & &1.id),
            "cancelled" => []
          }
        else
          cancelled = apply_cleanup_group(survivor, losers)

          %{
            "survivor_id" => survivor.id,
            "would_cancel" => [],
            "cancelled" => cancelled
          }
        end
      end)

    {:ok,
     %{
       "dry_run" => dry_run,
       "groups" => results,
       "group_count" => length(results),
       "would_cancel_count" => Enum.sum(Enum.map(results, &length(&1["would_cancel"]))),
       "cancelled_count" => Enum.sum(Enum.map(results, &length(&1["cancelled"])))
     }}
  end

  def cleanup_duplicate_plans(_, _), do: {:error, :invalid}

  # Cluster plans sharing owner/participants/venue into day-compatible
  # groups (equal days together; open joins the first compatible group).
  defp cluster_by_dedupe(members) do
    Enum.reduce(members, [], fn plan, clusters ->
      components = plan_dedupe_components(plan)

      case Enum.find_index(clusters, fn [head | _] ->
             PlanIdentity.components_match?(components, plan_dedupe_components(head))
           end) do
        nil -> clusters ++ [[plan]]
        idx -> List.update_at(clusters, idx, &(&1 ++ [plan]))
      end
    end)
  end

  defp sort_survivor_first(members) do
    rank = %{"agreed" => 3, "changed" => 2, "tentative" => 1}

    Enum.sort_by(
      members,
      fn plan ->
        {Map.get(rank, plan.status, 0), length(plan_participant_ids(plan)),
         plan.updated_at || plan.inserted_at}
      end,
      :desc
    )
  end

  defp apply_cleanup_group(%SharedPlan{} = survivor, losers) do
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    survivor =
      Enum.reduce(losers, survivor, fn loser, acc ->
        merge_fragments_into(acc, %{
          "location" => loser.location,
          "time_label" => loser.time_label,
          "title" => loser.title
        })
      end)

    absorbed = get_in(survivor.alignment || %{}, ["absorbed_plan_ids"]) || []

    _ =
      survivor
      |> SharedPlan.changeset(%{
        alignment:
          Map.put(
            survivor.alignment || %{},
            "absorbed_plan_ids",
            absorbed ++ Enum.map(losers, & &1.id)
          )
      })
      |> Repo.update()

    Enum.flat_map(losers, fn loser ->
      alignment =
        (loser.alignment || %{})
        |> Map.put("merged_into", survivor.id)
        |> Map.put("reconcile_reason", "duplicate_intent_cleanup")
        |> Map.put("reconciled_at", DateTime.to_iso8601(now))

      case loser
           |> SharedPlan.changeset(%{status: "cancelled", cancelled_at: now, alignment: alignment})
           |> PlanTransition.guard_changeset(:plan, :cancel)
           |> Repo.update() do
        {:ok, updated} -> [updated.id]
        _ -> []
      end
    end)
  end

  @doc """
  F18-06 stale tentative expiry (gated, lazy): a tentative plan expires
  when its canonical start plus 24h has passed, or when it has no
  canonical start and is 14+ days old with no update in 7 days. Agreed
  and changed plans never expire. Enforcement is lazy (called from the
  plan list read) so no sweeper is required for correctness; expired is
  terminal and excluded from default lists, present with status: :all.
  """
  def expire_stale_tentative_plans(user_id, now \\ nil) when is_binary(user_id) do
    now = now || DateTime.utc_now()
    now = DateTime.truncate(now, :microsecond)

    expired_ids =
      user_id
      |> user_active_plans()
      |> Enum.filter(&(&1.status == "tentative"))
      |> Enum.filter(&stale_tentative?(&1, now))
      |> Enum.flat_map(fn plan ->
        alignment =
          (plan.alignment || %{})
          |> Map.put("expired_at", DateTime.to_iso8601(now))
          |> Map.put(
            "expired_reason",
            if(PlanIdentity.canonical_start(plan), do: "start_passed", else: "startless_stale")
          )

        case plan
             |> SharedPlan.changeset(%{status: "expired", alignment: alignment})
             |> PlanTransition.guard_changeset(:plan, :expire)
             |> Repo.update() do
          {:ok, updated} -> [updated.id]
          _ -> []
        end
      end)

    {:ok, expired_ids}
  end

  def expire_stale_tentative_plans(_, _), do: {:error, :invalid}

  defp stale_tentative?(%SharedPlan{} = plan, now) do
    case PlanIdentity.canonical_start(plan) do
      %DateTime{} = start ->
        # Only plans that have existed long enough to have had their
        # chance: created at least a day ago, start a day past.
        DateTime.compare(DateTime.add(start, 24 * 3600, :second), now) == :lt and
          DateTime.compare(plan.inserted_at, DateTime.add(now, -24 * 3600, :second)) != :gt

      nil ->
        DateTime.compare(plan.inserted_at, DateTime.add(now, -14 * 24 * 3600, :second)) != :gt and
          DateTime.compare(plan.updated_at, DateTime.add(now, -7 * 24 * 3600, :second)) != :gt
    end
  end

  # Display name of the plan's lead/organizer for surfaces (B3-web).
  # Returns nil when unresolvable — surfaces must render nothing, never invent.
  defp organizer_name(%SharedPlan{} = plan) do
    case lead_user_id(plan) do
      nil ->
        nil

      uid ->
        case Repo.get(OpalCore.Accounts.User, uid) do
          %OpalCore.Accounts.User{display_name: name}
          when is_binary(name) and name != "" ->
            name

          %OpalCore.Accounts.User{handle: handle}
          when is_binary(handle) and handle != "" ->
            handle

          _ ->
            nil
        end
    end
  end

  # Lazy proposal expiry (no sweeper): enforced at interaction time inside the
  # caller's transaction. Marks the proposal "expired" and rolls back.
  defp ensure_not_expired_tx(%Proposal{expires_at: nil}), do: :ok

  defp ensure_not_expired_tx(%Proposal{} = proposal) do
    if DateTime.compare(proposal.expires_at, DateTime.utc_now()) == :lt do
      Repo.rollback(:expired)
    else
      :ok
    end
  end

  # The in-transaction expiry mark is rolled back with the transaction, so the
  # "expired" status is persisted here in its own write afterwards. Guarded to
  # pre-conversion statuses so a concurrently converted proposal is never
  # clobbered. Gyroscope (R13): the expirable set comes from the gate's table.
  defp persist_expired_mark(proposal_id) do
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    from(p in Proposal,
      where:
        p.id == ^proposal_id and
          p.status in ^PlanTransition.from_statuses(:proposal, :expire)
    )
    |> Repo.update_all(set: [status: "expired", updated_at: now])

    :ok
  end

  defp with_expired_persisted(proposal_id, fun) do
    case fun.() do
      {:error, :expired} = err ->
        persist_expired_mark(proposal_id)
        err

      other ->
        other
    end
  end

  # Plan access for both chat plans (conversation members) and center plans
  # (conversation_id nil: creator or participant).
  defp ensure_plan_access(%SharedPlan{conversation_id: nil} = plan, user_id) do
    cond do
      plan.created_by_user_id == user_id -> :ok
      not is_nil(plan_participant(plan.id, user_id)) -> :ok
      true -> {:error, :not_a_member}
    end
  end

  defp ensure_plan_access(%SharedPlan{conversation_id: conversation_id}, user_id),
    do: ensure_member(conversation_id, user_id)

  defp latest_proposed_revision(plan_id) do
    from(r in PlanRevision,
      where: r.plan_id == ^plan_id and r.status == "proposed",
      order_by: [desc: r.inserted_at],
      limit: 1
    )
    |> Repo.one()
  end

  defp ensure_plan_participant(%SharedPlan{} = plan, user_id) do
    exists? =
      from(pp in PlanParticipant, where: pp.plan_id == ^plan.id and pp.user_id == ^user_id)
      |> Repo.exists?()

    if exists? or member?(plan.conversation_id, user_id), do: :ok, else: {:error, :not_a_member}
  end

  @doc """
  Phase 11A — create a tentative SharedPlan from a conversation place option.

  - source: "conversation", conversation_id set
  - status: "tentative" (5A taste bridge fires only on later agreement)
  - participants: conversation members (creator accepted; peers pending)
  - Never invents taste attrs from place names
  """
  def create_tentative_plan_from_conversation(conversation_id, user_id, attrs)
      when is_binary(conversation_id) and is_binary(user_id) and is_map(attrs) do
    params = stringify_keys(attrs)

    with :ok <- ensure_member(conversation_id, user_id) do
      member_ids = member_user_ids(conversation_id)

      if member_ids == [] do
        {:error, :not_found}
      else
        title = present_string(params["title"] || params["option_label"] || params["place"])
        plan_type = normalize_plan_type(params["plan_type"])
        meeting_link = OpalCore.SocialFlow.MeetingLinks.sanitize(params["meeting_link"])

        location =
          if plan_type == "virtual" do
            "Online"
          else
            present_string(params["location"] || params["place"] || title)
          end

        time_label = present_string(params["time_label"])
        area = present_string(params["area"] || params["area_label"])

        if is_nil(title) do
          {:error, :invalid_title}
        else
          alignment =
            %{}
            |> put_alignment("area", area)
            |> put_alignment("plan_type", plan_type)
            |> then(fn a ->
              if meeting_link, do: Map.put(a, "meeting_link", meeting_link), else: a
            end)
            |> then(fn a ->
              if plan_type == "virtual" do
                Map.put(a, "place", %{"state" => "locked", "value" => "Online"})
              else
                a
              end
            end)

          # Repair #18 (Division A, F18-06): stamp the dedupe identity
          # and merge into a surviving twin instead of inserting a
          # sibling - a twin in THIS conversation, or a conversation-less
          # Center twin for the same intent (cross-path merge).
          alignment =
            dedupe_alignment(alignment, user_id, member_ids, %{
              "title" => title,
              "location" => location || title,
              "time_label" => time_label,
              "plan_type" => plan_type
            })

          plan_attrs = %{
            "conversation_id" => conversation_id,
            "title" => title,
            "location" => location || title,
            "time_label" => time_label,
            "timezone" => present_string(params["timezone"]) || "UTC",
            "status" => "tentative",
            "created_by_user_id" => user_id,
            "source" => "conversation",
            "alignment" => alignment,
            "plan_type" => plan_type,
            "meeting_link" => meeting_link
          }

          dedupe_survivor =
            case find_dedupe_survivor(
                   user_id,
                   PlanIdentity.components(user_id, member_ids, %{
                     "title" => title,
                     "location" => location || title,
                     "time_label" => time_label,
                     "plan_type" => plan_type
                   })
                 ) do
              %SharedPlan{} = survivor
              when survivor.conversation_id == conversation_id or
                     is_nil(survivor.conversation_id) ->
                merge_fragments_into(survivor, %{
                  "title" => title,
                  "location" => location,
                  "time_label" => time_label
                })

              _ ->
                nil
            end

          if dedupe_survivor do
            participants =
              from(pp in PlanParticipant, where: pp.plan_id == ^dedupe_survivor.id)
              |> Repo.all()

            {:ok, dedupe_survivor, participants}
          else
            Repo.transaction(fn ->
              plan =
                case %SharedPlan{}
                     |> SharedPlan.changeset(plan_attrs)
                     # Gyroscope (R13): tentative plans are born via the gate.
                     |> PlanTransition.guard_changeset(:plan, :create)
                     |> Repo.insert() do
                  {:ok, p} -> p
                  {:error, cs} -> Repo.rollback(cs)
                end

              now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

              participants =
                Enum.map(member_ids, fn uid ->
                  role = if uid == user_id, do: "lead", else: "participant"
                  state = if uid == user_id, do: "accepted", else: "pending"

                  case %PlanParticipant{}
                       |> PlanParticipant.changeset(%{
                         "plan_id" => plan.id,
                         "user_id" => uid,
                         "role" => role,
                         "response_state" => state,
                         "responded_at" => if(state == "accepted", do: now, else: nil),
                         "authority_source" => "plan_this"
                       })
                       |> Repo.insert() do
                    {:ok, row} -> row
                    {:error, cs} -> Repo.rollback(cs)
                  end
                end)

              _ = maybe_schedule_virtual_join_reminder(plan, user_id)

              case Publisher.record(%{
                     event_type: "plan.created",
                     event_id: "plan_created:#{plan.id}",
                     aggregate_type: "shared_plan",
                     aggregate_id: plan.id,
                     partition_key: user_id,
                     privacy_class: "private_authorized",
                     purpose: "plan_create",
                     actor_user_id: user_id,
                     conversation_id: conversation_id,
                     plan_id: plan.id,
                     payload: %{
                       "plan_id" => plan.id,
                       "status" => plan.status,
                       "source" => "conversation",
                       "plan_type" => plan.plan_type
                     }
                   }) do
                {:ok, _} -> :ok
                {:error, reason} -> Repo.rollback(reason)
              end

              {plan, participants}
            end)
            |> case do
              {:ok, {plan, participants}} -> {:ok, plan, participants}
              {:error, %Ecto.Changeset{} = cs} -> {:error, cs}
              {:error, reason} -> {:error, reason}
            end
          end
        end
      end
    end
  end

  def create_tentative_plan_from_conversation(_, _, _), do: {:error, :invalid}

  defp normalize_plan_type(t) when t in ["virtual", :virtual], do: "virtual"
  defp normalize_plan_type(_), do: "in_person"

  defp maybe_schedule_virtual_join_reminder(%SharedPlan{plan_type: "virtual"} = plan, user_id) do
    link = OpalCore.SocialFlow.MeetingLinks.sanitize(plan.meeting_link)
    summary = virtual_reminder_summary(plan, link)

    join_actions =
      if link do
        %{"items" => [%{"id" => "join", "label" => "Join", "url" => link}]}
      else
        %{"items" => [%{"id" => "add_link", "label" => "Add link"}]}
      end

    scheduled_for =
      case plan.start_at do
        %DateTime{} = dt -> DateTime.add(dt, -15 * 60, :second)
        _ -> DateTime.add(DateTime.utc_now(), 3600, :second) |> DateTime.truncate(:microsecond)
      end

    case %PlanReminder{}
         |> PlanReminder.changeset(%{
           plan_id: plan.id,
           owner_user_id: user_id,
           visibility: "shared",
           status: "scheduled",
           delivery_policy: "in_app",
           content_summary: summary,
           scheduled_for: scheduled_for,
           source_lineage: %{
             "origin" => "virtual_join",
             "plan_type" => "virtual",
             "meeting_link" => link,
             "actions" => join_actions
           }
         })
         |> Repo.insert() do
      {:ok, reminder} ->
        _ =
          if is_binary(plan.conversation_id) do
            insert_signal!(%{
              conversation_id: plan.conversation_id,
              plan_id: plan.id,
              reminder_id: reminder.id,
              kind: "private_reminder",
              status: "visible",
              copy: summary,
              visibility: "shared",
              audience_user_id: nil,
              actions: join_actions
            })
          end

        {:ok, reminder}

      {:error, _} = err ->
        err
    end
  end

  defp maybe_schedule_virtual_join_reminder(_, _), do: :ok

  defp virtual_reminder_summary(%SharedPlan{} = plan, link) do
    when_bit = plan.time_label || "soon"
    base = "Join #{plan.title || "your meeting"} · #{when_bit} · Online"

    if link do
      base <> " · tap Join"
    else
      base <> " · add a link when you have one"
    end
  end

  @doc """
  Paste J Phase 1 — durable solo plan from Opal Center "Go with this".

  Source `:center`, no conversation_id. Owner is lead + accepted.
  """
  def create_tentative_plan_from_center(user_id, attrs)
      when is_binary(user_id) and is_map(attrs) do
    params = stringify_keys(attrs)
    title = present_string(params["title"] || params["option_label"] || params["place"])
    # Repair #14 (D4) — honor plan_type / meeting_link exactly like the
    # conversation path. This path silently dropped both, so a virtual
    # Center confirm (OpalPlanConfirm) persisted as "in_person" with no
    # meeting link and no Online location.
    plan_type = normalize_plan_type(params["plan_type"])
    meeting_link = OpalCore.SocialFlow.MeetingLinks.sanitize(params["meeting_link"])

    location =
      if plan_type == "virtual" do
        "Online"
      else
        present_string(params["location"] || params["place"] || params["area"] || title)
      end

    time_label = present_string(params["time_label"]) || "Open window"
    area = present_string(params["area"] || params["area_label"])
    decision_id = present_string(params["decision_id"])

    # Repair #18 (Division A, F18-06): the subject of a Center plan is
    # real data, not a title fragment. Persist the resolved subject id
    # (and any explicit participant ids) as PlanParticipant rows and in
    # alignment, so the dedupe key, the NowStrip who and later merges
    # have something true to read. subject_who (display text) is kept
    # in alignment for surfaces when no id could be resolved.
    subject_who =
      case params["subject_who"] do
        [first | _] -> present_string(first)
        value -> present_string(value)
      end

    subject_ids =
      (List.wrap(params["participant_user_ids"]) ++
         List.wrap(params["subject_user_id"]) ++
         List.wrap(params["subject_user_ids"]))
      |> Enum.filter(&is_binary/1)
      |> Enum.reject(&(&1 == user_id))
      |> Enum.uniq()

    dedupe_components =
      PlanIdentity.components(user_id, subject_ids, %{
        "title" => title,
        "location" => location,
        "time_label" => time_label,
        "plan_type" => plan_type
      })

    if is_nil(title) do
      {:error, :invalid_title}
    else
      # C-reinforce — idempotent opportunity taps: a second "Go with this" for
      # the same center opportunity resumes the pending plan instead of
      # inserting a duplicate. Opportunity identity = the center decision_id
      # carried in alignment; without one there is nothing to dedupe on.
      # Repair #18: when no decision_id exists, the dedupe identity is
      # the fallback - a matching intent merges into the survivor
      # (merge-not-overwrite) instead of inserting a sibling row.
      dedupe_existing =
        if is_nil(decision_id) do
          case find_dedupe_survivor(user_id, dedupe_components) do
            %SharedPlan{} = survivor ->
              merge_fragments_into(survivor, %{
                "title" => title,
                "location" => location,
                "time_label" => time_label
              })

            nil ->
              nil
          end
        end

      case find_pending_center_plan(user_id, decision_id) || dedupe_existing do
        %SharedPlan{} = existing ->
          participants =
            from(pp in PlanParticipant, where: pp.plan_id == ^existing.id)
            |> Repo.all()

          {:ok, existing, participants}

        nil ->
          alignment =
            %{}
            |> put_alignment("area", area)
            |> put_alignment("scope", "solo")
            |> put_alignment("decision_id", decision_id)
            |> put_alignment("plan_type", plan_type)
            |> put_alignment("subject_who", subject_who)
            |> then(fn a ->
              if subject_ids != [],
                do: Map.put(a, "participant_ids", subject_ids),
                else: a
            end)
            |> dedupe_alignment(user_id, subject_ids, %{
              "title" => title,
              "location" => location,
              "time_label" => time_label,
              "plan_type" => plan_type
            })
            |> then(fn a ->
              if meeting_link, do: Map.put(a, "meeting_link", meeting_link), else: a
            end)
            |> then(fn a ->
              if plan_type == "virtual" do
                Map.put(a, "place", %{"state" => "locked", "value" => "Online"})
              else
                a
              end
            end)
            |> Map.put("center_v2", true)

          plan_attrs = %{
            "conversation_id" => nil,
            "title" => title,
            "location" => location || title,
            "time_label" => time_label,
            "timezone" => present_string(params["timezone"]) || "UTC",
            "status" => "tentative",
            "created_by_user_id" => user_id,
            "source" => "center",
            "alignment" => alignment,
            "plan_type" => plan_type,
            "meeting_link" => meeting_link
          }

          Repo.transaction(fn ->
            plan =
              case %SharedPlan{}
                   |> SharedPlan.changeset(plan_attrs)
                   # Gyroscope (R13): Center-birthed plans pass the gate too.
                   |> PlanTransition.guard_changeset(:plan, :create)
                   |> Repo.insert() do
                {:ok, p} -> p
                {:error, cs} -> Repo.rollback(cs)
              end

            now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

            participant =
              case %PlanParticipant{}
                   |> PlanParticipant.changeset(%{
                     "plan_id" => plan.id,
                     "user_id" => user_id,
                     "role" => "lead",
                     "response_state" => "accepted",
                     "responded_at" => now,
                     "authority_source" => "user_action"
                   })
                   |> Repo.insert() do
                {:ok, p} -> p
                {:error, cs} -> Repo.rollback(cs)
              end

            # Repair #18: subject participants (pending until they act).
            # Unknown ids are skipped honestly - a name that never
            # resolved to a real user stays as alignment subject_who.
            subject_participants =
              Enum.flat_map(subject_ids, fn subject_id ->
                if Repo.get(OpalCore.Accounts.User, subject_id) do
                  case %PlanParticipant{}
                       |> PlanParticipant.changeset(%{
                         "plan_id" => plan.id,
                         "user_id" => subject_id,
                         "role" => "participant",
                         "response_state" => "pending",
                         "authority_source" => "center_subject"
                       })
                       |> Repo.insert() do
                    {:ok, p} -> [p]
                    _ -> []
                  end
                else
                  []
                end
              end)

            {plan, [participant | subject_participants]}
          end)
          |> case do
            {:ok, {plan, participants}} ->
              # Repair #14 (D4) — virtual Center plans get the join reminder,
              # like conversation-created virtual plans.
              _ = maybe_schedule_virtual_join_reminder(plan, user_id)

              # F12-05d — Center creates project to the native Opal calendar,
              # like every other plan-creation path.
              _ = OpalCore.SocialFlow.OpalCalendar.project_from_shared_plan(plan)

              audit!(
                nil,
                plan.id,
                user_id,
                "plan.created",
                %{
                  "source" => "center",
                  "title" => plan.title,
                  "time_label" => plan.time_label
                },
                "trace-social-flow-center-1"
              )

              # F12-07 — Center creates were silent (broadcast(nil, …) went to
              # a degenerate topic). broadcast_plan/4 fans out on the owner's
              # user topic so Graphs/Timeline hear the new plan.
              broadcast_plan(
                plan,
                "social_flow:plan",
                %{"plan" => plan_payload(plan), "created" => true},
                "trace-social-flow-center-1"
              )

              {:ok, plan, participants}

            {:error, %Ecto.Changeset{} = cs} ->
              {:error, cs}

            {:error, reason} ->
              {:error, reason}
          end
      end
    end
  end

  def create_tentative_plan_from_center(_, _), do: {:error, :invalid}

  # Repair #16 (W1) — durable GraphCreateFlow completion.
  #
  # Before this, every non-post GraphCreateFlow completion (Graphs/Repeat/
  # plan-from-chat) landed in write-only React state (`createdGraphs` was
  # never read anywhere): the "plan" vanished on refresh, was invisible to
  # every other account, and the flow closed as if it had succeeded.
  #
  # The lawful durable home is the SAME plan authority Center uses: a
  # conversation-less SharedPlan (source "center" shape — owner is lead +
  # accepted, invitees are pending PlanParticipants), read back through
  # list_plans_for_user/2 / get_plan_for_user/2, the owner-scoped readers
  # behind the Graphs/Timeline projections (gyroscope: one plan, one state).
  # True provenance is recorded in alignment["origin"] = "graph_create"
  # plus alignment["entry"] (the entry surface).
  #
  # Field fates (draft -> plan):
  # - title -> SharedPlan.title (required; blank -> :invalid_title)
  # - location/place (host knownWhere) -> SharedPlan.location
  # - time_label (draft whenLabel) -> SharedPlan.time_label
  # - caption -> alignment["caption"] (no first-class plan column exists;
  #   exposed back on the plan contract — durable + read back, never faked)
  # - media_id -> alignment["media_id"], ONLY when the media row exists,
  #   is owned by the creator, and is not deleted (Repair #15 E8 law —
  #   another user's / ghost / junk media is :invalid_media, zero rows)
  # - audience -> alignment["audience"]. Plan visibility is participant-
  #   scoped by construction (ensure_plan_access/2), so only audiences
  #   consistent with that are lawful: "close_circle" and "private".
  #   Anything wider ("friends", "custom", junk) is rejected honestly with
  #   :unsupported_audience instead of being silently stored and ignored.
  # - join_requests_on / exact_spot_after_join -> alignment booleans,
  #   exposed back on the contract. No self-join surface exists for plans
  #   today, and plan location is only readable by participants, which is
  #   what those toggles describe; the stored values are the creator's
  #   stated preference on the durable record.
  # - participant_user_ids -> pending PlanParticipants (real user ids only;
  #   unknown/junk ids are :invalid_participant, zero rows). Display-name
  #   "who" text is kept as alignment["who_label"] for surfaces.
  # - source_plan_id (Repeat provenance) -> alignment["repeated_from_plan_id"].
  #   REPEAT_MUTATES_OLD_GRAPH = 0: the source is never written. Repeating a
  #   plan the caller cannot lawfully read is :forbidden; a missing source
  #   is :source_plan_not_found. A NEW plan is always created.
  # - idempotency_key -> alignment["graph_create_key"]. A replay / double
  #   submit with the same key returns the existing plan (deduplicated:
  #   true) instead of inserting a duplicate.
  #
  # Returns {:ok, plan, participants, deduplicated?} or {:error, reason}.
  @graph_create_audiences ~w(close_circle private)

  def create_plan_from_graph_create(user_id, attrs)
      when is_binary(user_id) and is_map(attrs) do
    params = stringify_keys(attrs)
    title = present_string(params["title"] || params["place"])
    audience = present_string(params["audience"]) || "close_circle"
    media_id = present_string(params["media_id"])
    source_plan_id = present_string(params["source_plan_id"])
    idempotency_key = present_string(params["idempotency_key"])

    with :ok <- require_graph_title(title),
         :ok <- require_graph_audience(audience),
         :ok <- require_owned_graph_media(user_id, media_id),
         :ok <- require_repeatable_source(user_id, source_plan_id),
         {:ok, participant_ids} <-
           resolve_graph_participants(user_id, params["participant_user_ids"]) do
      case find_graph_create_plan(user_id, idempotency_key) do
        %SharedPlan{} = existing ->
          participants =
            from(pp in PlanParticipant, where: pp.plan_id == ^existing.id) |> Repo.all()

          {:ok, existing, participants, true}

        nil ->
          # Repair #18 (Division A, F18-06): a fresh flow key is not a
          # fresh intent. An identical dedupe identity returns the
          # survivor as deduplicated - UNLESS this is an explicit
          # Repeat (source_plan_id) or force_new, which opt out by
          # naming themselves.
          dedupe_survivor =
            if is_nil(source_plan_id) and params["force_new"] != true do
              components =
                PlanIdentity.components(user_id, participant_ids, %{
                  "title" => title,
                  "location" =>
                    present_string(params["location"] || params["place"] || params["area"]) ||
                      title,
                  "time_label" => present_string(params["time_label"]) || "Open window"
                })

              find_dedupe_survivor(user_id, components)
            end

          case dedupe_survivor do
            %SharedPlan{} = survivor ->
              participants =
                from(pp in PlanParticipant, where: pp.plan_id == ^survivor.id) |> Repo.all()

              {:ok, survivor, participants, true}

            _ ->
              insert_graph_create_plan(user_id, params, %{
                title: title,
                audience: audience,
                media_id: media_id,
                source_plan_id: source_plan_id,
                idempotency_key: idempotency_key,
                participant_ids: participant_ids
              })
          end
      end
    end
  end

  def create_plan_from_graph_create(_, _), do: {:error, :invalid}

  defp require_graph_title(nil), do: {:error, :invalid_title}
  defp require_graph_title(_title), do: :ok

  defp require_graph_audience(audience) when audience in @graph_create_audiences, do: :ok
  defp require_graph_audience(_audience), do: {:error, :unsupported_audience}

  # Repair #15 E8 law, plan edition: only the creator's own live media may
  # be attached to a plan. Junk (non-UUID) ids are rejected, never crash.
  defp require_owned_graph_media(_user_id, nil), do: :ok

  defp require_owned_graph_media(user_id, media_id) do
    owned? =
      case Ecto.UUID.cast(media_id) do
        {:ok, uuid} ->
          from(m in OpalCore.SocialFlow.SocialMomentMedia,
            where: m.id == ^uuid and m.owner_user_id == ^user_id and is_nil(m.deleted_at),
            select: m.id
          )
          |> Repo.exists?()

        :error ->
          false
      end

    if owned?, do: :ok, else: {:error, :invalid_media}
  end

  # Repeat provenance: the source must exist and be lawfully readable by
  # the repeater (creator or participant — ensure_plan_access/2). It is
  # only ever READ here; the repeat writes a brand-new plan.
  defp require_repeatable_source(_user_id, nil), do: :ok

  defp require_repeatable_source(user_id, source_plan_id) do
    case Ecto.UUID.cast(source_plan_id) do
      {:ok, uuid} ->
        case Repo.get(SharedPlan, uuid) do
          %SharedPlan{} = source ->
            case ensure_plan_access(source, user_id) do
              :ok -> :ok
              {:error, _} -> {:error, :forbidden}
            end

          nil ->
            {:error, :source_plan_not_found}
        end

      :error ->
        {:error, :source_plan_not_found}
    end
  end

  defp resolve_graph_participants(user_id, raw) do
    entries = List.wrap(raw)

    # A non-string entry can never be a lawful participant id — reject the
    # create rather than silently dropping an invited person.
    if Enum.any?(entries, &(not is_binary(&1))) do
      {:error, :invalid_participant}
    else
      resolve_graph_participant_ids(user_id, entries)
    end
  end

  defp resolve_graph_participant_ids(user_id, entries) do
    ids =
      entries
      |> Enum.map(&String.trim/1)
      |> Enum.reject(&(&1 == "" or &1 == user_id))
      |> Enum.uniq()

    # Any non-UUID or unknown id fails the whole create honestly — a plan
    # must never silently drop an invited person.
    invalid? =
      Enum.any?(ids, fn id ->
        case Ecto.UUID.cast(id) do
          {:ok, uuid} ->
            not Repo.exists?(from(u in OpalCore.Accounts.User, where: u.id == ^uuid))

          :error ->
            true
        end
      end)

    if invalid?, do: {:error, :invalid_participant}, else: {:ok, ids}
  end

  defp find_graph_create_plan(_user_id, nil), do: nil

  defp find_graph_create_plan(user_id, key) do
    from(p in SharedPlan,
      where:
        p.created_by_user_id == ^user_id and p.status != "cancelled" and
          fragment("? ->> 'graph_create_key' = ?", p.alignment, ^key),
      order_by: [desc: p.inserted_at],
      limit: 1
    )
    |> Repo.one()
  end

  defp insert_graph_create_plan(user_id, params, ctx) do
    location =
      present_string(params["location"] || params["place"] || params["area"]) || ctx.title

    alignment =
      %{}
      |> Map.put("origin", "graph_create")
      |> Map.put("graph_create", true)
      |> Map.put("scope", if(ctx.participant_ids == [], do: "solo", else: "shared"))
      |> put_alignment("entry", present_string(params["entry"]))
      |> put_alignment("caption", present_string(params["caption"]))
      |> put_alignment("who_label", present_string(params["who_label"]))
      |> put_alignment("area", present_string(params["area"] || params["area_label"]))
      |> then(fn a ->
        if ctx.media_id, do: Map.put(a, "media_id", ctx.media_id), else: a
      end)
      |> then(fn a ->
        if ctx.source_plan_id,
          do: Map.put(a, "repeated_from_plan_id", ctx.source_plan_id),
          else: a
      end)
      |> then(fn a ->
        if ctx.idempotency_key,
          do: Map.put(a, "graph_create_key", ctx.idempotency_key),
          else: a
      end)
      |> Map.put("audience", ctx.audience)
      |> Map.put("join_requests_on", params["join_requests_on"] != false)
      |> Map.put("exact_spot_after_join", params["exact_spot_after_join"] != false)
      |> dedupe_alignment(user_id, ctx.participant_ids, %{
        "title" => ctx.title,
        "location" => location,
        "time_label" => present_string(params["time_label"]) || "Open window"
      })

    plan_attrs = %{
      "conversation_id" => nil,
      "title" => ctx.title,
      "location" => location,
      "time_label" => present_string(params["time_label"]) || "Open window",
      "timezone" => present_string(params["timezone"]) || "UTC",
      "status" => "tentative",
      "created_by_user_id" => user_id,
      "source" => "center",
      "alignment" => alignment,
      "plan_type" => "in_person",
      "meeting_link" => nil
    }

    Repo.transaction(fn ->
      plan =
        case %SharedPlan{}
             |> SharedPlan.changeset(plan_attrs)
             # Gyroscope (R13): graph-create plans pass the gate too.
             |> PlanTransition.guard_changeset(:plan, :create)
             |> Repo.insert() do
          {:ok, p} -> p
          {:error, cs} -> Repo.rollback(cs)
        end

      now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

      lead =
        case %PlanParticipant{}
             |> PlanParticipant.changeset(%{
               "plan_id" => plan.id,
               "user_id" => user_id,
               "role" => "lead",
               "response_state" => "accepted",
               "responded_at" => now,
               "authority_source" => "user_action"
             })
             |> Repo.insert() do
          {:ok, p} -> p
          {:error, cs} -> Repo.rollback(cs)
        end

      invitees =
        Enum.map(ctx.participant_ids, fn uid ->
          case %PlanParticipant{}
               |> PlanParticipant.changeset(%{
                 "plan_id" => plan.id,
                 "user_id" => uid,
                 "role" => "participant",
                 "response_state" => "pending",
                 "authority_source" => "graph_create"
               })
               |> Repo.insert() do
            {:ok, p} -> p
            {:error, cs} -> Repo.rollback(cs)
          end
        end)

      {plan, [lead | invitees]}
    end)
    |> case do
      {:ok, {plan, participants}} ->
        _ = OpalCore.SocialFlow.OpalCalendar.project_from_shared_plan(plan)

        audit!(
          nil,
          plan.id,
          user_id,
          "plan.created",
          %{
            "source" => "graph_create",
            "title" => plan.title,
            "time_label" => plan.time_label
          },
          "trace-social-flow-graph-create-1"
        )

        broadcast_plan(
          plan,
          "social_flow:plan",
          %{"plan" => plan_payload(plan), "created" => true},
          "trace-social-flow-graph-create-1"
        )

        {:ok, plan, participants, false}

      {:error, %Ecto.Changeset{} = cs} ->
        {:error, cs}

      {:error, reason} ->
        {:error, reason}
    end
  end

  defp find_pending_center_plan(_user_id, nil), do: nil

  defp find_pending_center_plan(user_id, decision_id) do
    from(p in SharedPlan,
      where:
        p.created_by_user_id == ^user_id and p.source == "center" and
          p.status == "tentative" and
          fragment("? ->> 'decision_id' = ?", p.alignment, ^decision_id),
      order_by: [desc: p.inserted_at],
      limit: 1
    )
    |> Repo.one()
  end

  defp put_alignment(map, _key, nil), do: map
  defp put_alignment(map, _key, ""), do: map
  defp put_alignment(map, key, value) when is_binary(value), do: Map.put(map, key, value)
  defp put_alignment(map, _, _), do: map

  defp present_string(nil), do: nil

  defp present_string(value) when is_binary(value) do
    case String.trim(value) do
      "" -> nil
      t -> t
    end
  end

  defp present_string(value) when is_atom(value) and not is_nil(value),
    do: present_string(Atom.to_string(value))

  defp present_string(_), do: nil

  defp member_user_ids(conversation_id) do
    from(cm in ConversationMember,
      where: cm.conversation_id == ^conversation_id,
      select: cm.user_id
    )
    |> Repo.all()
  end

  defp ensure_member(conversation_id, user_id) do
    if member?(conversation_id, user_id), do: :ok, else: {:error, :not_a_member}
  end

  defp member?(conversation_id, user_id) do
    from(cm in ConversationMember,
      where: cm.conversation_id == ^conversation_id and cm.user_id == ^user_id
    )
    |> Repo.exists?()
  end

  defp fetch!(attrs, key) do
    Map.get(attrs, key) || Map.get(attrs, Atom.to_string(key)) ||
      raise ArgumentError, "missing #{key}"
  end

  defp stringify_keys(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), stringify_keys(v)}
      {k, v} -> {k, stringify_keys(v)}
    end)
  end

  defp stringify_keys(list) when is_list(list), do: Enum.map(list, &stringify_keys/1)
  defp stringify_keys(other), do: other
end
