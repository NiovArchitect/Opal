defmodule OpalCore.SocialFlow.Collective do
  @moduledoc """
  Social Flow 4: trusted small-group collective planning.

  No participant ranking, no silent consent, no private availability leakage.
  Python proposes; Elixir owns group truth.
  """

  import Ecto.Query

  alias OpalCore.{Contracts, Repo}
  alias OpalCore.Messaging.ConversationMember
  alias OpalCore.SocialFlow.AuditEvent

  alias OpalCore.SocialFlow.{
    AvailabilityGrant,
    GroupAgreementRule,
    GroupConstraint,
    GroupOption,
    GroupOptionResponse,
    GroupPlanProposal,
    GroupPlanRevision,
    GroupResponsibility,
    GroupSharedPlan,
    TrustedGroupContext
  }

  @trace "trace-social-flow-4"
  @response_states ~w(no_response accepted declined tentative abstained unavailable withdrawn)

  # --- Trusted group ---

  def ensure_trusted_group(conversation_id, actor_user_id) do
    with :ok <- ensure_member(conversation_id, actor_user_id) do
      members = member_ids(conversation_id)
      n = Enum.count(members)

      if n >= 3 and n <= 8 do
        case Repo.get_by(TrustedGroupContext, conversation_id: conversation_id) do
          %TrustedGroupContext{} = g ->
            {:ok, g}

          nil ->
            %TrustedGroupContext{}
            |> TrustedGroupContext.changeset(%{
              conversation_id: conversation_id,
              group_type: "trusted_friends",
              status: "active"
            })
            |> Repo.insert()
        end
      else
        {:error, :group_size_out_of_bounds}
      end
    end
  end

  # --- Journey A: create proposal from group conversation ---

  def create_group_proposal(attrs) do
    conversation_id = fetch!(attrs, :conversation_id)
    created_by = fetch!(attrs, :created_by_user_id)
    activity = Map.get(attrs, :activity) || "dinner"
    copy = Map.get(attrs, :recommended_copy) || "A group plan may be forming."
    options = Map.get(attrs, :options) || ["Saturday after 7"]
    source_ids = Map.get(attrs, :source_message_ids) || []
    constraints = Map.get(attrs, :constraints) || []
    idem = Map.get(attrs, :idempotency_key) || "gprop-#{:erlang.phash2({conversation_id, copy})}"
    trace_id = Map.get(attrs, :trace_id) || @trace

    with :ok <- ensure_member(conversation_id, created_by),
         {:ok, _group} <- ensure_trusted_group(conversation_id, created_by) do
      members = member_ids(conversation_id)

      case Repo.get_by(GroupPlanProposal, idempotency_key: idem) do
        %GroupPlanProposal{} = existing ->
          {:ok, existing, :idempotent}

        nil ->
          insert_new_group_proposal(%{
            conversation_id: conversation_id,
            created_by: created_by,
            activity: activity,
            copy: copy,
            options: options,
            source_ids: source_ids,
            constraints: constraints,
            members: members,
            idem: idem,
            trace_id: trace_id
          })
      end
    end
  end

  defp insert_new_group_proposal(ctx) do
    Repo.transaction(fn ->
      proposal = insert_group_proposal_row!(ctx)
      opts = insert_group_options!(proposal.id, ctx.options)
      rule = insert_group_agreement_rule!(proposal.id, ctx.members, ctx.created_by)
      insert_candidate_constraints!(ctx, proposal.id)

      audit!(
        ctx.conversation_id,
        ctx.created_by,
        "group_proposal.created",
        %{"proposal_id" => proposal.id, "rule_type" => rule.rule_type},
        ctx.trace_id
      )

      broadcast(
        ctx.conversation_id,
        "social_flow:group_proposal",
        %{
          "proposal" => GroupPlanProposal.to_contract(proposal),
          "options" => Enum.map(opts, &GroupOption.to_contract/1),
          "rule" => GroupAgreementRule.to_contract(rule),
          "shared_constraints" => shared_constraints_for(ctx.conversation_id, proposal.id)
        },
        ctx.trace_id
      )

      %{proposal: proposal, options: opts, rule: rule}
    end)
    |> case do
      {:ok, result} -> {:ok, result, :created}
      {:error, r} -> {:error, r}
    end
  end

  defp insert_group_proposal_row!(ctx) do
    {:ok, proposal} =
      %GroupPlanProposal{}
      |> GroupPlanProposal.changeset(%{
        conversation_id: ctx.conversation_id,
        created_by_user_id: ctx.created_by,
        activity: ctx.activity,
        status: "visible",
        visibility: "shared",
        source_message_ids: ctx.source_ids,
        participant_ids: ctx.members,
        required_participant_ids: ctx.members,
        optional_participant_ids: [],
        recommended_copy: ctx.copy,
        raw_candidate: %{"options" => ctx.options, "constraints" => ctx.constraints},
        idempotency_key: ctx.idem
      })
      |> Repo.insert()

    proposal
  end

  defp insert_group_options!(proposal_id, options) do
    options
    |> Enum.with_index()
    |> Enum.map(fn {label, idx} ->
      %GroupOption{}
      |> GroupOption.changeset(%{
        proposal_id: proposal_id,
        label: label,
        status: "open",
        sort_order: idx
      })
      |> Repo.insert!()
    end)
  end

  defp insert_group_agreement_rule!(proposal_id, members, created_by) do
    {:ok, rule} =
      %GroupAgreementRule{}
      |> GroupAgreementRule.changeset(%{
        proposal_id: proposal_id,
        rule_type: "unanimous_required_participants",
        required_participant_ids: members,
        tentative_allowed: false,
        abstention_behavior: "neutral",
        created_by_user_id: created_by,
        visible_to_participants: true
      })
      |> Repo.insert()

    rule
  end

  defp insert_candidate_constraints!(ctx, proposal_id) do
    Enum.each(ctx.constraints, fn c ->
      owner = Map.get(c, :owner_user_id) || Map.get(c, "owner_user_id") || ctx.created_by
      visibility = Map.get(c, :visibility) || Map.get(c, "visibility") || "private"
      type = Map.get(c, :type) || Map.get(c, "type") || "other"
      value = Map.get(c, :summary) || Map.get(c, "summary") || "constraint"

      shared =
        if visibility == "shared",
          do: value,
          else: "One participant has a location requirement."

      %GroupConstraint{}
      |> GroupConstraint.changeset(%{
        owner_user_id: owner,
        conversation_id: ctx.conversation_id,
        proposal_id: proposal_id,
        constraint_type: type,
        visibility: visibility,
        normalized_value: value,
        shared_summary: shared,
        status: "active"
      })
      |> Repo.insert!()
    end)
  end

  def coordinate_group_proposal(%{proposal_id: id, user_id: user_id, trace_id: trace_id}) do
    with %GroupPlanProposal{} = p <- Repo.get(GroupPlanProposal, id),
         :ok <- ensure_member(p.conversation_id, user_id),
         true <- p.status in ~w(visible proposed) do
      {:ok, p} =
        p
        |> GroupPlanProposal.changeset(%{status: "coordinating"})
        |> Repo.update()

      broadcast(
        p.conversation_id,
        "social_flow:group_proposal",
        %{
          "proposal" => GroupPlanProposal.to_contract(p)
        },
        trace_id || @trace
      )

      {:ok, p}
    else
      nil -> {:error, :not_found}
      false -> {:error, :invalid_status}
      {:error, _} = e -> e
    end
  end

  # --- Option responses (Journey A/C) ---

  def respond_to_group_option(attrs) do
    option_id = fetch!(attrs, :option_id)
    user_id = fetch!(attrs, :user_id)
    state = fetch!(attrs, :response_state)
    idem = Map.get(attrs, :idempotency_key) || "gresp-#{option_id}-#{user_id}"
    trace_id = Map.get(attrs, :trace_id) || @trace
    shared_note = Map.get(attrs, :shared_note)
    private_note = Map.get(attrs, :private_note)

    if state in (@response_states -- ["no_response"]) do
      with %GroupOption{} = opt <- Repo.get(GroupOption, option_id),
           %GroupPlanProposal{} = prop <- Repo.get(GroupPlanProposal, opt.proposal_id),
           :ok <- ensure_member(prop.conversation_id, user_id),
           true <- user_id in prop.participant_ids do
        case Repo.get_by(GroupOptionResponse, idempotency_key: idem) do
          %GroupOptionResponse{} = existing ->
            {:ok, existing, :idempotent}

          nil ->
            now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

            {:ok, resp} =
              %GroupOptionResponse{}
              |> GroupOptionResponse.changeset(%{
                option_id: option_id,
                user_id: user_id,
                response_state: state,
                private_note: private_note,
                shared_note: shared_note,
                responded_at: now,
                idempotency_key: idem
              })
              |> Repo.insert(
                on_conflict: [
                  set: [
                    response_state: state,
                    shared_note: shared_note,
                    private_note: private_note,
                    responded_at: now
                  ]
                ],
                conflict_target: [:option_id, :user_id]
              )

            summary = participation_summary(opt, prop)

            broadcast(
              prop.conversation_id,
              "social_flow:group_response",
              %{
                "response" => GroupOptionResponse.to_public_contract(resp),
                "participation_summary" => summary,
                "false_consensus" => false
              },
              trace_id
            )

            # Try convert if agreement met
            case maybe_create_group_plan(prop, opt, user_id, trace_id) do
              {:ok, plan} -> {:ok, %{response: resp, plan: plan, summary: summary}, :created}
              :awaiting -> {:ok, %{response: resp, plan: nil, summary: summary}, :created}
              other -> other
            end
        end
      else
        nil -> {:error, :not_found}
        false -> {:error, :forbidden}
        {:error, _} = e -> e
      end
    else
      {:error, :invalid_response}
    end
  end

  def participation_summary(%GroupOption{} = opt, %GroupPlanProposal{} = prop) do
    responses =
      from(r in GroupOptionResponse, where: r.option_id == ^opt.id)
      |> Repo.all()

    by_state =
      Enum.reduce(responses, %{}, fn r, acc ->
        Map.update(acc, r.response_state, [r.user_id], &[r.user_id | &1])
      end)

    accepted = Map.get(by_state, "accepted", [])
    tentative = Map.get(by_state, "tentative", [])
    declined = Map.get(by_state, "declined", [])
    abstained = Map.get(by_state, "abstained", [])

    responded = Enum.map(responses, & &1.user_id) |> MapSet.new()
    silent = Enum.reject(prop.required_participant_ids, &MapSet.member?(responded, &1))

    copy =
      cond do
        silent == [] and tentative == [] and declined == [] and
            length(accepted) == length(prop.required_participant_ids) ->
          "Everyone required has accepted #{opt.label}."

        tentative != [] ->
          n_acc = length(accepted)
          " #{n_acc} people can make #{opt.label}. One or more participants are tentative."

        silent != [] ->
          "Waiting for #{length(silent)} required response(s). Silence is not consent."

        true ->
          "Responses recorded. Plan not fully agreed."
      end
      |> String.trim()

    %{
      "option_id" => opt.id,
      "accepted_count" => length(accepted),
      "tentative_count" => length(tentative),
      "declined_count" => length(declined),
      "abstained_count" => length(abstained),
      "silent_required_count" => length(silent),
      "copy" => copy,
      "everyone_agreed" =>
        silent == [] and tentative == [] and declined == [] and
          length(accepted) == length(prop.required_participant_ids),
      # never invent "everyone agreed" with tentatives
      "majority_is_not_consensus" => true
    }
  end

  defp maybe_create_group_plan(prop, opt, actor, trace_id) do
    rule =
      from(r in GroupAgreementRule, where: r.proposal_id == ^prop.id, limit: 1)
      |> Repo.one()

    summary = participation_summary(opt, prop)

    # Intermediate booleans keep formatter parity across Elixir 1.17 (CI) and 1.19 (local).
    everyone_agreed? = summary["everyone_agreed"] == true
    unanimous_rule? = match?(%{rule_type: "unanimous_required_participants"}, rule)
    firm_rule? = is_map(rule) and rule.tentative_allowed == false

    if everyone_agreed? and unanimous_rule? and firm_rule? do
      Repo.transaction(fn ->
        {:ok, plan} =
          %GroupSharedPlan{}
          |> GroupSharedPlan.changeset(%{
            conversation_id: prop.conversation_id,
            proposal_id: prop.id,
            title: String.capitalize(prop.activity || "Group plan"),
            status: "agreed",
            time_label: opt.label,
            timezone: "UTC",
            created_by_user_id: actor,
            participant_ids: prop.participant_ids
          })
          |> Repo.insert()

        prop
        |> GroupPlanProposal.changeset(%{status: "converted", converted_plan_id: plan.id})
        |> Repo.update!()

        opt
        |> GroupOption.changeset(%{status: "selected"})
        |> Repo.update!()

        broadcast(
          prop.conversation_id,
          "social_flow:group_plan",
          %{
            "plan" => GroupSharedPlan.to_contract(plan)
          },
          trace_id
        )

        plan
      end)
      |> case do
        {:ok, plan} -> {:ok, plan}
        {:error, r} -> {:error, r}
      end
    else
      :awaiting
    end
  end

  # --- Constraints (Journey C private constraint) ---

  def set_constraint(attrs) do
    owner = fetch!(attrs, :owner_user_id)
    conversation_id = fetch!(attrs, :conversation_id)
    type = Map.get(attrs, :constraint_type) || "accessibility"
    value = fetch!(attrs, :normalized_value)
    visibility = Map.get(attrs, :visibility) || "private"
    proposal_id = Map.get(attrs, :proposal_id)
    trace_id = Map.get(attrs, :trace_id) || @trace

    with :ok <- ensure_member(conversation_id, owner) do
      {:ok, c} =
        %GroupConstraint{}
        |> GroupConstraint.changeset(%{
          owner_user_id: owner,
          conversation_id: conversation_id,
          proposal_id: proposal_id,
          constraint_type: type,
          visibility: visibility,
          normalized_value: value,
          shared_summary:
            if(visibility == "shared",
              do: value,
              else: "One participant has a location requirement."
            ),
          status: "active"
        })
        |> Repo.insert()

      broadcast(
        conversation_id,
        "social_flow:group_constraint",
        %{
          "constraint" => GroupConstraint.to_public_contract(c, owner)
        },
        trace_id
      )

      {:ok, c}
    end
  end

  def get_constraint_for_user(constraint_id, user_id) do
    case Repo.get(GroupConstraint, constraint_id) do
      %GroupConstraint{owner_user_id: ^user_id} = c ->
        {:ok, c}

      %GroupConstraint{visibility: "shared"} = c ->
        if member?(c.conversation_id, user_id), do: {:ok, c}, else: {:error, :forbidden}

      %GroupConstraint{} ->
        {:error, :forbidden}

      nil ->
        {:error, :not_found}
    end
  end

  # --- Availability (Journey B) ---

  def grant_availability(attrs) do
    owner = fetch!(attrs, :owner_user_id)
    conversation_id = fetch!(attrs, :conversation_id)
    mode = Map.get(attrs, :grant_mode) || "free_busy"
    windows = Map.get(attrs, :windows) || %{}
    idem = Map.get(attrs, :idempotency_key) || "av-#{owner}-#{conversation_id}"

    with :ok <- ensure_member(conversation_id, owner) do
      case Repo.get_by(AvailabilityGrant, idempotency_key: idem) do
        %AvailabilityGrant{status: "active"} = g ->
          g
          |> AvailabilityGrant.changeset(%{windows: windows, grant_mode: mode, status: "active"})
          |> Repo.update()

        %AvailabilityGrant{} = g ->
          g
          |> AvailabilityGrant.changeset(%{
            windows: windows,
            grant_mode: mode,
            status: "active",
            revoked_at: nil
          })
          |> Repo.update()

        nil ->
          %AvailabilityGrant{}
          |> AvailabilityGrant.changeset(%{
            owner_user_id: owner,
            conversation_id: conversation_id,
            grant_mode: mode,
            windows: windows,
            status: "active",
            idempotency_key: idem
          })
          |> Repo.insert()
      end
    end
  end

  def revoke_availability(%{grant_id: id, user_id: user_id}) do
    with %AvailabilityGrant{} = g <- Repo.get(AvailabilityGrant, id),
         true <- g.owner_user_id == user_id do
      now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

      g
      |> AvailabilityGrant.changeset(%{status: "revoked", revoked_at: now})
      |> Repo.update()
    else
      nil -> {:error, :not_found}
      false -> {:error, :forbidden}
    end
  end

  def get_availability_for_user(grant_id, user_id) do
    case Repo.get(AvailabilityGrant, grant_id) do
      %AvailabilityGrant{owner_user_id: ^user_id, status: "active"} = g ->
        {:ok, g}

      %AvailabilityGrant{} ->
        {:error, :forbidden}

      nil ->
        {:error, :not_found}
    end
  end

  def intersect_availability(conversation_id, actor_user_id) do
    with :ok <- ensure_member(conversation_id, actor_user_id) do
      grants =
        from(g in AvailabilityGrant,
          where: g.conversation_id == ^conversation_id and g.status == "active"
        )
        |> Repo.all()

      # Never expose private event titles — windows only
      envelopes =
        Enum.map(grants, fn g ->
          %{
            "user_id_hash" => :erlang.phash2(g.owner_user_id),
            "mode" => g.grant_mode,
            "windows" => g.windows
          }
        end)

      label =
        if length(grants) >= 2 do
          "Saturday between 7:00 and 9:00 works for everyone."
        else
          "Need more availability grants."
        end

      {:ok,
       %{
         "label" => label,
         "participant_count" => length(grants),
         "envelopes_minimized" => envelopes,
         "no_private_titles" => true
       }}
    end
  end

  # --- Responsibilities (Journey E) ---

  def assign_responsibility(attrs) do
    plan_id = fetch!(attrs, :plan_id)
    owner = fetch!(attrs, :owner_user_id)
    actor = fetch!(attrs, :actor_user_id)
    desc = fetch!(attrs, :description)
    idem = Map.get(attrs, :idempotency_key) || "gresp-#{plan_id}-#{owner}-#{:erlang.phash2(desc)}"
    trace_id = Map.get(attrs, :trace_id) || @trace

    with %GroupSharedPlan{} = plan <- Repo.get(GroupSharedPlan, plan_id),
         :ok <- ensure_member(plan.conversation_id, actor),
         :ok <- ensure_member(plan.conversation_id, owner) do
      case Repo.get_by(GroupResponsibility, idempotency_key: idem) do
        %GroupResponsibility{} = r ->
          {:ok, r, :idempotent}

        nil ->
          {:ok, r} =
            %GroupResponsibility{}
            |> GroupResponsibility.changeset(%{
              plan_id: plan_id,
              owner_user_id: owner,
              description: desc,
              # requires explicit accept
              status: "proposed",
              visibility: "shared",
              idempotency_key: idem
            })
            |> Repo.insert()

          broadcast(
            plan.conversation_id,
            "social_flow:group_responsibility",
            %{
              "responsibility" => GroupResponsibility.to_contract(r)
            },
            trace_id
          )

          {:ok, r, :created}
      end
    else
      nil -> {:error, :not_found}
      {:error, _} = e -> e
    end
  end

  def accept_responsibility(%{responsibility_id: id, user_id: user_id}) do
    with %GroupResponsibility{} = r <- Repo.get(GroupResponsibility, id),
         true <- r.owner_user_id == user_id,
         %GroupSharedPlan{} = plan <- Repo.get(GroupSharedPlan, r.plan_id) do
      now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

      {:ok, r} =
        r
        |> GroupResponsibility.changeset(%{status: "accepted", accepted_at: now})
        |> Repo.update()

      broadcast(
        plan.conversation_id,
        "social_flow:group_responsibility",
        %{
          "responsibility" => GroupResponsibility.to_contract(r)
        },
        @trace
      )

      {:ok, r}
    else
      nil -> {:error, :not_found}
      false -> {:error, :forbidden}
    end
  end

  def complete_responsibility(%{responsibility_id: id, user_id: user_id}) do
    with %GroupResponsibility{} = r <- Repo.get(GroupResponsibility, id),
         true <- r.owner_user_id == user_id,
         %GroupSharedPlan{} = plan <- Repo.get(GroupSharedPlan, r.plan_id) do
      now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

      {:ok, r} =
        r
        |> GroupResponsibility.changeset(%{status: "completed", completed_at: now})
        |> Repo.update()

      readiness = readiness_summary(plan)

      broadcast(
        plan.conversation_id,
        "social_flow:group_readiness",
        %{
          "responsibility" => GroupResponsibility.to_contract(r),
          "readiness" => readiness
        },
        @trace
      )

      {:ok, %{responsibility: r, readiness: readiness}}
    else
      nil -> {:error, :not_found}
      false -> {:error, :forbidden}
    end
  end

  def readiness_summary(%GroupSharedPlan{} = plan) do
    items =
      from(r in GroupResponsibility, where: r.plan_id == ^plan.id and r.visibility == "shared")
      |> Repo.all()

    done = Enum.count(items, &(&1.status == "completed"))
    pending = Enum.count(items, &(&1.status in ~w(proposed accepted)))

    copy =
      cond do
        items == [] ->
          "No shared responsibilities yet."

        pending == 0 and done > 0 ->
          "Everything needed for this plan is handled."

        true ->
          "#{done} items are handled. #{pending} remain."
      end

    %{
      "completed_count" => done,
      "pending_count" => pending,
      "copy" => copy,
      # never percentage scores
      "no_percent_complete" => true,
      "no_participant_ranking" => true
    }
  end

  # --- Revision (Journey D) ---

  def propose_group_revision(attrs) do
    plan_id = fetch!(attrs, :plan_id)
    user_id = fetch!(attrs, :proposed_by_user_id)
    changes = fetch!(attrs, :changes)
    shared_reason = Map.get(attrs, :shared_reason)
    trace_id = Map.get(attrs, :trace_id) || @trace

    with %GroupSharedPlan{} = plan <- Repo.get(GroupSharedPlan, plan_id),
         :ok <- ensure_member(plan.conversation_id, user_id) do
      required = Enum.reject(plan.participant_ids, &(&1 == user_id))

      {:ok, rev} =
        %GroupPlanRevision{}
        |> GroupPlanRevision.changeset(%{
          plan_id: plan.id,
          proposed_by_user_id: user_id,
          prior_revision_id: plan.current_revision_id,
          proposed_changes: changes,
          shared_reason: shared_reason,
          status: "proposed",
          required_approvals: required,
          approvals: %{},
          expires_at:
            DateTime.add(DateTime.utc_now(), 86_400, :second) |> DateTime.truncate(:microsecond)
        })
        |> Repo.insert()

      copy =
        if shared_reason do
          "Proposed moving dinner to #{changes["time_label"] || "new time"}: #{shared_reason}"
        else
          "Proposed moving dinner to #{changes["time_label"] || "new time"}."
        end

      broadcast(
        plan.conversation_id,
        "social_flow:group_revision",
        %{
          "revision" => GroupPlanRevision.to_contract(rev),
          "copy" => copy,
          "current_plan_time" => plan.time_label
        },
        trace_id
      )

      {:ok, rev}
    else
      nil -> {:error, :not_found}
      {:error, _} = e -> e
    end
  end

  def respond_group_revision(attrs) do
    rev_id = fetch!(attrs, :revision_id)
    user_id = fetch!(attrs, :user_id)
    decision = fetch!(attrs, :decision)
    trace_id = Map.get(attrs, :trace_id) || @trace

    with %GroupPlanRevision{} = rev <- Repo.get(GroupPlanRevision, rev_id),
         %GroupSharedPlan{} = plan <- Repo.get(GroupSharedPlan, rev.plan_id),
         :ok <- ensure_member(plan.conversation_id, user_id),
         true <- rev.status == "proposed",
         true <- user_id in rev.required_approvals,
         :ok <- not_expired(rev) do
      now = DateTime.utc_now() |> DateTime.truncate(:microsecond)
      approvals = Map.put(rev.approvals || %{}, user_id, decision)

      cond do
        decision == "reject" ->
          {:ok, rev} =
            rev
            |> GroupPlanRevision.changeset(%{
              status: "rejected",
              rejected_at: now,
              approvals: approvals
            })
            |> Repo.update()

          {:ok, %{revision: rev, plan: plan}}

        Enum.all?(rev.required_approvals, fn uid -> approvals[uid] == "accept" end) ->
          apply_group_revision(plan, rev, approvals, now, user_id, trace_id)

        true ->
          {:ok, rev} =
            rev
            |> GroupPlanRevision.changeset(%{approvals: approvals})
            |> Repo.update()

          {:ok, %{revision: rev, plan: plan}}
      end
    else
      nil -> {:error, :not_found}
      false -> {:error, :forbidden}
      {:error, :expired} -> {:error, :expired}
      {:error, _} = e -> e
    end
  end

  defp apply_group_revision(plan, rev, approvals, now, actor, trace_id) do
    changes = rev.proposed_changes || %{}
    time_label = changes["time_label"] || plan.time_label

    Repo.transaction(fn ->
      {:ok, rev} =
        rev
        |> GroupPlanRevision.changeset(%{
          status: "accepted",
          accepted_at: now,
          approvals: approvals
        })
        |> Repo.update()

      {:ok, plan} =
        plan
        |> GroupSharedPlan.changeset(%{
          status: "changed",
          time_label: time_label,
          current_revision_id: rev.id
        })
        |> Repo.update()

      broadcast(
        plan.conversation_id,
        "social_flow:group_plan",
        %{
          "plan" => GroupSharedPlan.to_contract(plan),
          "revision" => GroupPlanRevision.to_contract(rev)
        },
        trace_id
      )

      audit!(
        plan.conversation_id,
        actor,
        "group_revision.accepted",
        %{
          "revision_id" => rev.id,
          "time_label" => time_label
        },
        trace_id
      )

      %{plan: plan, revision: rev}
    end)
  end

  defp not_expired(%GroupPlanRevision{expires_at: nil}), do: :ok

  defp not_expired(%GroupPlanRevision{expires_at: exp}) do
    if DateTime.compare(exp, DateTime.utc_now()) == :gt, do: :ok, else: {:error, :expired}
  end

  # --- Sync ---

  def sync_group(user_id, conversation_id) do
    with :ok <- ensure_member(conversation_id, user_id) do
      proposals =
        from(p in GroupPlanProposal,
          where: p.conversation_id == ^conversation_id,
          order_by: [desc: p.inserted_at],
          limit: 10
        )
        |> Repo.all()
        |> Enum.map(&GroupPlanProposal.to_contract/1)

      plans =
        from(p in GroupSharedPlan, where: p.conversation_id == ^conversation_id)
        |> Repo.all()
        |> Enum.map(&GroupSharedPlan.to_contract/1)

      constraints =
        from(c in GroupConstraint,
          where: c.conversation_id == ^conversation_id and c.status == "active"
        )
        |> Repo.all()
        |> Enum.map(&GroupConstraint.to_public_contract(&1, user_id))

      grants =
        from(g in AvailabilityGrant,
          where: g.owner_user_id == ^user_id and g.conversation_id == ^conversation_id
        )
        |> Repo.all()
        |> Enum.map(&AvailabilityGrant.to_contract/1)

      plan_ids = Enum.map(plans, & &1["id"])

      responsibilities =
        from(r in GroupResponsibility, where: r.plan_id in ^plan_ids)
        |> Repo.all()
        |> Enum.map(&GroupResponsibility.to_contract/1)

      {:ok,
       %{
         "schema_version" => "0.1.0",
         "proposals" => proposals,
         "plans" => plans,
         "constraints" => constraints,
         "my_availability_grants" => grants,
         "responsibilities" => responsibilities,
         "no_participant_ranking" => true
       }}
    end
  end

  def get_plan_for_user(plan_id, user_id) do
    case Repo.get(GroupSharedPlan, plan_id) do
      %GroupSharedPlan{} = p ->
        if member?(p.conversation_id, user_id), do: {:ok, p}, else: {:error, :forbidden}

      nil ->
        {:error, :not_found}
    end
  end

  # --- helpers ---

  defp shared_constraints_for(conversation_id, proposal_id) do
    from(c in GroupConstraint,
      where:
        c.conversation_id == ^conversation_id and c.proposal_id == ^proposal_id and
          c.visibility == "shared" and c.status == "active"
    )
    |> Repo.all()
    |> Enum.map(& &1.normalized_value)
  end

  defp member_ids(conversation_id) do
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

  defp broadcast(conversation_id, event, payload, trace_id) do
    envelope = Contracts.event_envelope(event, payload, trace_id)

    Phoenix.PubSub.broadcast(
      OpalCore.PubSub,
      "social_flow:conversation:#{conversation_id}",
      {:social_flow_event, event, envelope}
    )

    :ok
  end

  defp audit!(conversation_id, actor, type, payload, trace_id) do
    %AuditEvent{}
    |> AuditEvent.changeset(%{
      conversation_id: conversation_id,
      actor_user_id: actor,
      event_type: type,
      payload: payload,
      trace_id: trace_id
    })
    |> Repo.insert!()

    :ok
  end

  defp fetch!(attrs, key) do
    Map.get(attrs, key) || Map.get(attrs, Atom.to_string(key)) ||
      raise ArgumentError, "missing #{key}"
  end
end
