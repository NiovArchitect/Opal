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
    PlanAgreementTasteBridge,
    PlanCommitment,
    PlanOption,
    PlanOptionResponse,
    PlanParticipant,
    PlanReminder,
    PlanRevision,
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
        result_type == "no_plan" or is_nil(candidate) ->
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

      {proposal, signal, options}
    end)
    |> case do
      {:ok, {proposal, signal, options}} ->
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
            copy: candidate["recommended_signal_copy"] || "You offered to make the reservation.",
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
    with %Proposal{} = proposal <- Repo.get(Proposal, proposal_id),
         :ok <- ensure_member(proposal.conversation_id, user_id),
         true <- proposal.status in ~w(proposed visible) do
      {:ok, proposal} =
        proposal
        |> Proposal.changeset(%{status: "approved_for_coordination"})
        |> Repo.update()

      options =
        from(o in PlanOption, where: o.proposal_id == ^proposal.id, order_by: [asc: o.sort_order])
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
        trace_id || @trace_default
      )

      broadcast(
        proposal.conversation_id,
        "social_flow:proposal_updated",
        %{
          "proposal" => Proposal.to_contract(proposal),
          "options" => Enum.map(options, &PlanOption.to_contract/1),
          "signal" => Signal.to_contract(signal)
        },
        trace_id || @trace_default
      )

      {:ok, %{proposal: proposal, options: options, signal: signal}}
    else
      nil -> {:error, :not_found}
      false -> {:error, :invalid_status}
      {:error, _} = err -> err
    end
  end

  def dismiss_proposal(%{proposal_id: proposal_id, user_id: user_id, trace_id: trace_id}) do
    with %Proposal{} = proposal <- Repo.get(Proposal, proposal_id),
         :ok <- ensure_member(proposal.conversation_id, user_id) do
      now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

      {:ok, proposal} =
        proposal
        |> Proposal.changeset(%{status: "dismissed", dismissed_at: now})
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
        trace_id || @trace_default
      )

      broadcast(
        proposal.conversation_id,
        "social_flow:proposal_updated",
        %{
          "proposal" => Proposal.to_contract(proposal)
        },
        trace_id || @trace_default
      )

      {:ok, proposal}
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
    with %PlanOption{} = option <- Repo.get(PlanOption, option_id) |> Repo.preload(:proposal),
         %Proposal{} = proposal <- option.proposal || Repo.get(Proposal, option.proposal_id),
         :ok <- ensure_member(proposal.conversation_id, user_id),
         true <- proposal.status in ~w(approved_for_coordination visible proposed) do
      now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

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
        maybe_create_shared_plan_from_option(
          proposal,
          option,
          user_id,
          trace_id || @trace_default
        )
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
          trace_id || @trace_default
        )

        {:ok, :recorded}
      end
    else
      nil -> {:error, :not_found}
      false -> {:error, :invalid_status}
      {:error, _} = err -> err
    end
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
      create_shared_plan(%{
        proposal: proposal,
        option: option,
        created_by_user_id: user_id,
        member_ids: member_ids,
        trace_id: trace_id
      })
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

    Repo.transaction(fn ->
      {:ok, plan} =
        %SharedPlan{}
        |> SharedPlan.changeset(%{
          conversation_id: proposal.conversation_id,
          title: String.capitalize("#{title}"),
          status: "agreed",
          time_label: time_label,
          timezone: "UTC",
          created_from_proposal_id: proposal.id,
          created_by_user_id: created_by
        })
        |> Repo.insert()

      for uid <- member_ids do
        %PlanParticipant{}
        |> PlanParticipant.changeset(%{
          plan_id: plan.id,
          user_id: uid,
          role: "participant",
          response_state: "accepted",
          responded_at: now,
          authority_source: "user_action"
        })
        |> Repo.insert!()
      end

      proposal
      |> Proposal.changeset(%{status: "converted", converted_at: now})
      |> Repo.update!()

      option
      |> PlanOption.changeset(%{status: "selected", plan_id: plan.id})
      |> Repo.update!()

      signal =
        insert_signal!(%{
          conversation_id: proposal.conversation_id,
          proposal_id: proposal.id,
          plan_id: plan.id,
          kind: "agreement",
          status: "visible",
          copy: "#{time_label} works for both of you.",
          visibility: "shared",
          actions: %{"items" => []}
        })

      audit!(
        proposal.conversation_id,
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

      broadcast(
        proposal.conversation_id,
        "social_flow:plan",
        %{
          "plan" => SharedPlan.to_contract(plan),
          "signal" => Signal.to_contract(signal)
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
             conversation_id: proposal.conversation_id,
             plan_id: plan.id,
             payload: %{"plan_id" => plan.id, "status" => "agreed"}
           }) do
        {:ok, _} -> :ok
        {:error, reason} -> Repo.rollback(reason)
      end

      %{plan: plan, signal: signal}
    end)
  end

  def confirm_commitment(%{commitment_id: id, user_id: user_id, trace_id: trace_id}) do
    with %PlanCommitment{} = c <- Repo.get(PlanCommitment, id),
         true <- c.owner_user_id == user_id,
         %SharedPlan{} = plan <- Repo.get(SharedPlan, c.plan_id),
         :ok <- ensure_member(plan.conversation_id, user_id) do
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
        trace_id || @trace_default
      )

      # Shared visibility of commitment existence is still private for SF-1 private commitments
      broadcast(
        plan.conversation_id,
        "social_flow:commitment",
        %{
          "commitment" => PlanCommitment.to_contract(c)
        },
        trace_id || @trace_default
      )

      {:ok, c}
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

      # Broadcast filtered: event includes audience; clients/sync strip for non-owners
      broadcast(
        plan.conversation_id,
        "social_flow:reminder",
        %{
          "reminder" => PlanReminder.to_contract(reminder),
          "signal" => Signal.to_contract(signal),
          "audience_user_id" => user_id
        },
        trace_id
      )

      {:ok, %{reminder: reminder, signal: signal}}
    else
      nil -> {:error, :not_found}
      {:error, _} = err -> err
    end
  end

  def propose_revision(attrs) do
    plan_id = fetch!(attrs, :plan_id)
    user_id = fetch!(attrs, :proposed_by_user_id)
    changes = fetch!(attrs, :changes) |> stringify_keys()
    trace_id = Map.get(attrs, :trace_id) || @trace_default

    with %SharedPlan{} = plan <- Repo.get(SharedPlan, plan_id),
         :ok <- ensure_member(plan.conversation_id, user_id) do
      members = member_user_ids(plan.conversation_id)
      required = Enum.reject(members, &(&1 == user_id))

      {:ok, revision} =
        %PlanRevision{}
        |> PlanRevision.changeset(%{
          plan_id: plan.id,
          proposed_by_user_id: user_id,
          prior_revision_id: plan.current_revision_id,
          proposed_changes: changes,
          status: "proposed",
          required_approvals: required,
          approvals: %{}
        })
        |> Repo.insert()

      label = changes["time_label"] || "new time"

      signal =
        insert_signal!(%{
          conversation_id: plan.conversation_id,
          plan_id: plan.id,
          revision_id: revision.id,
          kind: "revision",
          status: "visible",
          copy: "Proposed changing dinner to #{label}.",
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
        user_id,
        "revision.proposed",
        %{
          "revision_id" => revision.id,
          "changes" => changes
        },
        trace_id
      )

      broadcast(
        plan.conversation_id,
        "social_flow:revision",
        %{
          "revision" => PlanRevision.to_contract(revision),
          "signal" => Signal.to_contract(signal)
        },
        trace_id
      )

      {:ok, %{revision: revision, signal: signal}}
    else
      nil -> {:error, :not_found}
      {:error, _} = err -> err
    end
  end

  def respond_to_revision(%{
        revision_id: revision_id,
        user_id: user_id,
        decision: decision,
        trace_id: trace_id
      })
      when decision in ~w(accept reject) do
    with %PlanRevision{} = rev <- Repo.get(PlanRevision, revision_id),
         %SharedPlan{} = plan <- Repo.get(SharedPlan, rev.plan_id),
         :ok <- ensure_member(plan.conversation_id, user_id),
         true <- rev.status == "proposed",
         true <- user_id in (rev.required_approvals || []) do
      now = DateTime.utc_now() |> DateTime.truncate(:microsecond)
      approvals = Map.put(rev.approvals || %{}, user_id, decision)

      cond do
        decision == "reject" ->
          {:ok, rev} =
            rev
            |> PlanRevision.changeset(%{
              status: "rejected",
              rejected_at: now,
              approvals: approvals
            })
            |> Repo.update()

          audit!(
            plan.conversation_id,
            plan.id,
            user_id,
            "revision.rejected",
            %{
              "revision_id" => rev.id
            },
            trace_id || @trace_default
          )

          broadcast(
            plan.conversation_id,
            "social_flow:revision",
            %{
              "revision" => PlanRevision.to_contract(rev)
            },
            trace_id || @trace_default
          )

          {:ok, rev}

        Enum.all?(rev.required_approvals || [], fn uid -> approvals[uid] == "accept" end) ->
          apply_revision(plan, rev, approvals, now, user_id, trace_id || @trace_default)

        true ->
          {:ok, rev} =
            rev
            |> PlanRevision.changeset(%{approvals: approvals})
            |> Repo.update()

          {:ok, rev}
      end
    else
      nil -> {:error, :not_found}
      false -> {:error, :forbidden}
      {:error, _} = err -> err
    end
  end

  defp apply_revision(plan, rev, approvals, now, actor, trace_id) do
    changes = rev.proposed_changes || %{}
    time_label = changes["time_label"] || plan.time_label

    Repo.transaction(fn ->
      {:ok, rev} =
        rev
        |> PlanRevision.changeset(%{
          status: "accepted",
          accepted_at: now,
          approvals: approvals
        })
        |> Repo.update()

      {:ok, plan} =
        plan
        |> SharedPlan.changeset(%{
          status: "changed",
          time_label: time_label,
          current_revision_id: rev.id
        })
        |> Repo.update()

      signal =
        insert_signal!(%{
          conversation_id: plan.conversation_id,
          plan_id: plan.id,
          revision_id: rev.id,
          kind: "agreement",
          status: "visible",
          copy: "Dinner moved to #{time_label}.",
          visibility: "shared",
          actions: %{"items" => []}
        })

      audit!(
        plan.conversation_id,
        plan.id,
        actor,
        "revision.accepted",
        %{
          "revision_id" => rev.id,
          "time_label" => time_label
        },
        trace_id
      )

      broadcast(
        plan.conversation_id,
        "social_flow:plan",
        %{
          "plan" => SharedPlan.to_contract(plan),
          "revision" => PlanRevision.to_contract(rev),
          "signal" => Signal.to_contract(signal)
        },
        trace_id
      )

      # Supersede prior calendar versions and project new active commitments
      _ = OpalCore.SocialFlow.OpalCalendar.project_from_shared_plan(plan, plan_version: 2)

      %{plan: plan, revision: rev, signal: signal}
    end)
  end

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
        |> Enum.map(&SharedPlan.to_contract/1)

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

  def get_plan_for_user(plan_id, user_id) do
    case Repo.get(SharedPlan, plan_id) do
      %SharedPlan{} = plan ->
        if member?(plan.conversation_id, user_id), do: {:ok, plan}, else: {:error, :forbidden}

      nil ->
        {:error, :not_found}
    end
  end

  # --- helpers ---

  defp supersede_open_proposals!(conversation_id) do
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    from(p in Proposal,
      where: p.conversation_id == ^conversation_id and p.status in ^["proposed", "visible"]
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

  defp latest_plan(conversation_id) do
    from(p in SharedPlan,
      where:
        p.conversation_id == ^conversation_id and p.status in ^["agreed", "changed", "tentative"],
      order_by: [desc: p.inserted_at],
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
        location = present_string(params["location"] || params["place"] || title)
        time_label = present_string(params["time_label"])
        area = present_string(params["area"] || params["area_label"])

        if is_nil(title) do
          {:error, :invalid_title}
        else
          alignment =
            %{}
            |> put_alignment("area", area)

          plan_attrs = %{
            "conversation_id" => conversation_id,
            "title" => title,
            "location" => location || title,
            "time_label" => time_label,
            "timezone" => present_string(params["timezone"]) || "UTC",
            "status" => "tentative",
            "created_by_user_id" => user_id,
            "source" => "conversation",
            "alignment" => alignment
          }

          Repo.transaction(fn ->
            plan =
              case %SharedPlan{}
                   |> SharedPlan.changeset(plan_attrs)
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
                     "source" => "conversation"
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

  def create_tentative_plan_from_conversation(_, _, _), do: {:error, :invalid}

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
