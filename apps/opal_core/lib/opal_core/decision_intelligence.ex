defmodule OpalCore.DecisionIntelligence do
  @moduledoc """
  P4 Decision Intelligence — DecisionContext + High-confidence DecisionResult.

  Elixir owns truth. Postgres persists. Outbox/Kafka durable events.
  Python may propose; Elixir validates. Confidence ≠ confirmation.
  """

  import Ecto.Query

  alias Ecto.Multi
  alias OpalCore.DecisionIntelligence.DecisionContext
  alias OpalCore.DecisionIntelligence.DecisionEvidence
  alias OpalCore.DecisionIntelligence.DecisionResult
  alias OpalCore.DecisionIntelligence.HighConfidence
  alias OpalCore.DecisionIntelligence.MediumConfidence
  alias OpalCore.DecisionIntelligence.MutationKey
  alias OpalCore.Events.DomainEvent
  alias OpalCore.Events.EventOutbox
  alias OpalCore.Events.Publisher
  alias OpalCore.Repo

  @correction_ops ~w(
    set_budget set_time set_vibe set_people_scope add_participant remove_participant
    set_location_constraint set_availability set_intent
  )

  @doc "Create a DecisionContext (revision 1) + optional evidence + outbox event."
  def create_context(actor_user_id, attrs) when is_binary(actor_user_id) and is_map(attrs) do
    attrs = stringify_keys(attrs)
    idem = attrs["idempotency_key"]

    if is_binary(idem) and idem != "" do
      case Repo.get_by(MutationKey, actor_user_id: actor_user_id, idempotency_key: idem) do
        %MutationKey{decision_id: id} -> get_context(id, actor_user_id)
        nil -> do_create(actor_user_id, attrs, idem)
      end
    else
      do_create(actor_user_id, attrs, nil)
    end
  end

  defp do_create(actor_user_id, attrs, idem) do
    evidence_attrs = List.wrap(attrs["evidence"] || [])
    correlation = attrs["correlation_id"]

    cs =
      DecisionContext.create_changeset(%{
        initiator_user_id: actor_user_id,
        scope_type: attrs["scope_type"] || "solo",
        scope_ids: attrs["scope_ids"] || [],
        participant_ids: attrs["participant_ids"] || [actor_user_id],
        intent: attrs["intent"] || "unspecified",
        graph_id: attrs["graph_id"],
        journey_id: attrs["journey_id"],
        time_context: attrs["time_context"] || %{},
        location_context: attrs["location_context"] || %{},
        availability_context: attrs["availability_context"] || %{},
        budget_context: attrs["budget_context"] || %{},
        preference_context: attrs["preference_context"] || %{},
        provider_context: attrs["provider_context"] || %{},
        hard_constraints: attrs["hard_constraints"] || %{},
        soft_preferences: attrs["soft_preferences"] || %{},
        unknowns: attrs["unknowns"] || [],
        conflicts: attrs["conflicts"] || [],
        invalidation_conditions: normalize_predicates(attrs["invalidation_conditions"] || []),
        correlation_id: correlation,
        privacy_default: attrs["privacy_default"] || "shared_group"
      })

    multi =
      Multi.new()
      |> Multi.insert(:context, cs)
      |> Multi.run(:evidences, fn repo, %{context: ctx} ->
        insert_evidences(repo, ctx, evidence_attrs, 1)
      end)
      |> Multi.run(:outbox, fn repo, %{context: ctx} ->
        insert_decision_event(repo, ctx, "decision.created", actor_user_id, %{
          "changed_fields" => ["*"],
          "status" => ctx.status
        })
      end)
      |> maybe_idem_multi(actor_user_id, idem, "create")

    case Repo.transaction(multi) do
      {:ok, %{context: ctx, outbox: row}} ->
        _ = Publisher.schedule_publish(row.id)
        get_context(ctx.id, actor_user_id)

      {:error, :context, %Ecto.Changeset{} = cs, _} ->
        {:error, cs}

      {:error, step, reason, _} ->
        {:error, {step, reason}}
    end
  end

  @doc "Fetch DecisionContext with privacy-filtered evidence for viewer."
  def get_context(decision_id, viewer_user_id)
      when is_binary(decision_id) and is_binary(viewer_user_id) do
    case Repo.get(DecisionContext, decision_id) do
      nil ->
        {:error, :not_found}

      %DecisionContext{} = ctx ->
        if authorized?(ctx, viewer_user_id) do
          evidences =
            from(e in DecisionEvidence,
              where: e.decision_id == ^decision_id,
              where: is_nil(e.superseded_at_revision) or e.superseded_at_revision > ^ctx.revision,
              where: e.introduced_at_revision <= ^ctx.revision,
              order_by: [asc: e.inserted_at]
            )
            |> Repo.all()
            |> Enum.map(&maybe_mark_expired/1)
            |> Enum.filter(&visible_to?(&1, viewer_user_id))

          {:ok, %{context: ctx, evidences: evidences}}
        else
          {:error, :forbidden}
        end
    end
  end

  @doc """
  Apply a semantic correction.

  Requires `expected_revision`. No-op if no semantic change.
  """
  def apply_correction(decision_id, actor_user_id, attrs)
      when is_binary(decision_id) and is_binary(actor_user_id) and is_map(attrs) do
    attrs = stringify_keys(attrs)
    op = attrs["operation"]
    expected = attrs["expected_revision"]
    idem = attrs["idempotency_key"]

    cond do
      op not in @correction_ops ->
        {:error, :invalid_operation}

      not is_integer(expected) ->
        {:error, :expected_revision_required}

      is_binary(idem) and idem != "" ->
        case Repo.get_by(MutationKey, actor_user_id: actor_user_id, idempotency_key: idem) do
          %MutationKey{decision_id: ^decision_id} -> get_context(decision_id, actor_user_id)
          %MutationKey{} -> {:error, :idempotency_conflict}
          nil -> do_correct(decision_id, actor_user_id, attrs, idem)
        end

      true ->
        do_correct(decision_id, actor_user_id, attrs, nil)
    end
  end

  defp do_correct(decision_id, actor_user_id, attrs, idem) do
    Repo.transaction(fn ->
      ctx =
        from(c in DecisionContext, where: c.id == ^decision_id)
        |> lock("FOR UPDATE")
        |> Repo.one()

      cond do
        is_nil(ctx) ->
          Repo.rollback(:not_found)

        not authorized?(ctx, actor_user_id) ->
          Repo.rollback(:forbidden)

        ctx.revision != attrs["expected_revision"] ->
          Repo.rollback(:stale_decision_revision)

        ctx.status != "active" ->
          Repo.rollback(:decision_not_active)

        true ->
          {changes, evidence_claim, dimension} = correction_delta(ctx, attrs)

          if map_size(changes) == 0 do
            # No-op: no revision, no event
            {:noop, ctx}
          else
            next = ctx.revision + 1

            case ctx |> DecisionContext.update_changeset(changes, next) |> Repo.update() do
              {:ok, updated} ->
                if evidence_claim do
                  %DecisionEvidence{}
                  |> DecisionEvidence.changeset(%{
                    decision_id: updated.id,
                    dimension: dimension,
                    claim: evidence_claim,
                    privacy_class: attrs["privacy_class"] || "private_user",
                    source_type: "correction",
                    owner_user_id: actor_user_id,
                    introduced_at_revision: next,
                    constraint_kind: attrs["constraint_kind"] || "soft",
                    observed_at: DateTime.utc_now() |> DateTime.truncate(:microsecond)
                  })
                  |> Repo.insert!()
                end

                {:ok, row} =
                  insert_decision_event(Repo, updated, "decision.revised", actor_user_id, %{
                    "changed_fields" => Enum.map(Map.keys(changes), &to_string/1),
                    "operation" => attrs["operation"]
                  })

                if is_binary(idem) do
                  %MutationKey{}
                  |> MutationKey.changeset(%{
                    actor_user_id: actor_user_id,
                    idempotency_key: idem,
                    decision_id: updated.id,
                    result_revision: next,
                    operation: attrs["operation"]
                  })
                  |> Repo.insert!()
                end

                {:ok, updated, row}

              {:error, cs} ->
                Repo.rollback(cs)
            end
          end
      end
    end)
    |> case do
      {:ok, {:noop, ctx}} ->
        get_context(ctx.id, actor_user_id)

      {:ok, {:ok, updated, row}} ->
        _ = Publisher.schedule_publish(row.id)
        get_context(updated.id, actor_user_id)

      {:error, :stale_decision_revision} ->
        {:error, :stale_decision_revision}

      {:error, other} ->
        {:error, other}
    end
  end

  @doc "Mark decision invalidated (new revision + event)."
  def invalidate(decision_id, actor_user_id, attrs \\ %{}) do
    status_transition(decision_id, actor_user_id, "invalidated", "decision.invalidated", attrs)
  end

  @doc "Mark decision settled (new revision + decision.revised with status)."
  def settle(decision_id, actor_user_id, attrs \\ %{}) do
    status_transition(decision_id, actor_user_id, "settled", "decision.revised", attrs)
  end

  @doc """
  Resolve high-confidence DecisionResult for current context revision.

  attrs may include:
  - expected_context_revision (required for safety; must match current)
  - model_selected_candidate_id / model_version (optional Python propose)
  - idempotency_key
  """
  def resolve_high(decision_id, actor_user_id, attrs \\ %{})
      when is_binary(decision_id) and is_binary(actor_user_id) do
    attrs = stringify_keys(attrs)
    expected = attrs["expected_context_revision"]
    idem = attrs["idempotency_key"]

    with {:ok, %{context: ctx}} <- get_context(decision_id, actor_user_id),
         :ok <- match_revision(ctx, expected),
         :ok <- ensure_active(ctx) do
      if is_binary(idem) and idem != "" do
        case Repo.get_by(MutationKey, actor_user_id: actor_user_id, idempotency_key: idem) do
          %MutationKey{decision_id: ^decision_id, result_revision: rev} ->
            case get_result_for_decision(decision_id, rev) do
              {:ok, result} -> {:ok, %{result: result, assessment: %{"idempotent" => true}}}
              _ -> do_resolve_high(ctx, actor_user_id, attrs, idem)
            end

          %MutationKey{} ->
            {:error, :idempotency_conflict}

          nil ->
            do_resolve_high(ctx, actor_user_id, attrs, idem)
        end
      else
        do_resolve_high(ctx, actor_user_id, attrs, nil)
      end
    end
  end

  defp do_resolve_high(%DecisionContext{} = ctx, actor_user_id, attrs, idem) do
    opts = [
      model_selected_candidate_id: attrs["model_selected_candidate_id"],
      model_version: attrs["model_version"]
    ]

    case HighConfidence.evaluate(ctx, opts) do
      {:not_high, assessment} ->
        {:ok, %{outcome: "NOT_HIGH_CONFIDENCE", assessment: assessment, result: nil}}

      {:high, assessment} ->
        cand = assessment["selected_candidate"]

        cs =
          DecisionResult.create_changeset(%{
            decision_id: ctx.id,
            based_on_context_revision: ctx.revision,
            result_revision: 1,
            mode: "high",
            scope_type: ctx.scope_type,
            answer_type: "place",
            answer_entity_type: "place",
            answer_entity_id: assessment["selected_candidate_id"],
            answer_payload: %{
              "display_name" => cand["name"],
              "area_label" => cand["area_label"],
              "price_level" => cand["price_level"],
              "quiet" => cand["quiet"],
              "categories" => cand["categories"]
            },
            truth_state: "provisional",
            confidence_class: "high",
            confidence_factors: assessment["confidence_factors"],
            provider_state: "unverified",
            invalidation_conditions: ctx.invalidation_conditions || [],
            explanation_private: %{
              "factors" => assessment["confidence_factors"],
              "policy_version" => assessment["policy_version"]
            },
            explanation_shareable: %{
              "summary" => "#{cand["name"]} · #{cand["area_label"] || "nearby"}",
              "provisional" => true,
              "hue" => "violet"
            },
            actions: [
              %{"id" => "go_with_this", "label" => "Go with this", "means" => "accept_into_same_graph"}
            ],
            candidate_source: "fixture_catalog",
            policy_version: assessment["policy_version"],
            model_version: assessment["model_version"],
            status: "provisional",
            correlation_id: ctx.correlation_id,
            graph_id: ctx.graph_id
          })

        multi =
          Multi.new()
          |> Multi.insert(:result, cs)
          |> Multi.run(:outbox, fn repo, %{result: result} ->
            insert_decision_event(repo, ctx, "decision.resolved", actor_user_id, %{
              "decision_result_id" => result.id,
              "based_on_context_revision" => result.based_on_context_revision,
              "answer_entity_id" => result.answer_entity_id,
              "confidence_class" => "high",
              "truth_state" => "provisional",
              "candidate_source" => result.candidate_source
            })
          end)
          |> then(fn m ->
            if is_binary(idem) do
              Multi.insert(m, :idem, MutationKey.changeset(%MutationKey{}, %{
                actor_user_id: actor_user_id,
                idempotency_key: idem,
                decision_id: ctx.id,
                result_revision: 1,
                operation: "resolve_high"
              }))
            else
              m
            end
          end)

        case Repo.transaction(multi) do
          {:ok, %{result: result, outbox: row}} ->
            _ = Publisher.schedule_publish(row.id)
            {:ok, %{outcome: "HIGH", result: result, assessment: assessment}}

          {:error, :result, %Ecto.Changeset{} = cs, _} ->
            # unique conflict → return existing for same revision
            case get_result_for_context_revision(ctx.id, ctx.revision) do
              {:ok, existing} -> {:ok, %{outcome: "HIGH", result: existing, assessment: assessment}}
              _ -> {:error, cs}
            end

          {:error, step, reason, _} ->
            {:error, {step, reason}}
        end
    end
  end

  @doc """
  Unified resolve: High if earned, else one Medium question if useful.
  Never forces High. Never invents a question for model weakness.
  """
  def resolve(decision_id, actor_user_id, attrs \\ %{}) do
    attrs = stringify_keys(attrs)

    with {:ok, %{context: ctx}} <- get_context(decision_id, actor_user_id),
         :ok <- match_revision(ctx, attrs["expected_context_revision"]),
         :ok <- ensure_active(ctx) do
      case MediumConfidence.evaluate(ctx) do
        {:high, _} ->
          resolve_high(decision_id, actor_user_id, attrs)

        {:medium, assessment} ->
          persist_medium_question(ctx, actor_user_id, assessment, attrs["idempotency_key"])

        {:not_medium, assessment} ->
          {:ok, %{outcome: "NOT_MEDIUM", assessment: assessment, result: nil}}
      end
    end
  end

  defp persist_medium_question(%DecisionContext{} = ctx, actor_user_id, assessment, idem) do
    q = assessment["question"]

    cs =
      DecisionResult.create_changeset(%{
        decision_id: ctx.id,
        based_on_context_revision: ctx.revision,
        result_revision: 1,
        mode: "medium",
        scope_type: ctx.scope_type,
        answer_type: "question",
        answer_entity_type: "question",
        answer_entity_id: nil,
        answer_payload: %{},
        truth_state: "provisional",
        confidence_class: "medium",
        confidence_factors: %{"gaps" => assessment["gaps"]},
        provider_state: "unverified",
        explanation_private: %{"machine_resolved" => assessment["machine_resolved"]},
        explanation_shareable: %{
          "summary" => q["prompt"],
          "provisional" => true,
          "hue" => "violet",
          "figma_authority" => "988:2"
        },
        actions: q["choices"] || [],
        candidate_source: "fixture_catalog",
        policy_version: assessment["policy_version"],
        status: "awaiting_answer",
        correlation_id: ctx.correlation_id,
        graph_id: ctx.graph_id,
        question_id: q["question_id"],
        question_dimension: q["dimension"],
        question_payload: q,
        question_status: "open",
        question_target_user_id: q["target_user_id"]
      })

    multi =
      Multi.new()
      |> Multi.insert(:result, cs)
      |> Multi.run(:outbox, fn repo, %{result: result} ->
        insert_decision_event(repo, ctx, "decision.question_asked", actor_user_id, %{
          "decision_result_id" => result.id,
          "based_on_context_revision" => result.based_on_context_revision,
          "question_id" => result.question_id,
          "question_dimension" => result.question_dimension,
          "confidence_class" => "medium"
        })
      end)
      |> then(fn m ->
        if is_binary(idem) do
          Multi.insert(
            m,
            :idem,
            MutationKey.changeset(%MutationKey{}, %{
              actor_user_id: actor_user_id,
              idempotency_key: idem,
              decision_id: ctx.id,
              result_revision: 1,
              operation: "resolve_medium"
            })
          )
        else
          m
        end
      end)

    case Repo.transaction(multi) do
      {:ok, %{result: result, outbox: row}} ->
        _ = Publisher.schedule_publish(row.id)
        {:ok, %{outcome: "MEDIUM", result: result, assessment: assessment}}

      {:error, :result, %Ecto.Changeset{} = cs, _} ->
        case get_result_for_context_revision(ctx.id, ctx.revision) do
          {:ok, existing} -> {:ok, %{outcome: "MEDIUM", result: existing, assessment: assessment}}
          _ -> {:error, cs}
        end

      {:error, step, reason, _} ->
        {:error, {step, reason}}
    end
  end

  @doc """
  Answer an open medium question: mutate same DecisionContext, settle question, re-eval High.
  """
  def answer_question(result_id, actor_user_id, attrs)
      when is_binary(result_id) and is_binary(actor_user_id) and is_map(attrs) do
    attrs = stringify_keys(attrs)
    choice_id = attrs["choice_id"]

    Repo.transaction(fn ->
      result = Repo.get(DecisionResult, result_id)

      cond do
        is_nil(result) ->
          Repo.rollback(:not_found)

        result.mode != "medium" or result.question_status != "open" ->
          Repo.rollback(:question_not_open)

        result.question_target_user_id not in [nil, actor_user_id] and
            result.question_target_user_id != actor_user_id ->
          Repo.rollback(:forbidden)

        true ->
          case get_context(result.decision_id, actor_user_id) do
            {:error, reason} ->
              Repo.rollback(reason)

            {:ok, %{context: ctx}} ->
              if result.based_on_context_revision != ctx.revision do
                {:stale, ctx}
              else
                corr =
                  MediumConfidence.map_answer_to_correction(result.question_dimension, choice_id)

                if is_nil(corr) do
                  Repo.rollback(:invalid_choice)
                else
                  next = ctx.revision + 1
                  changes = correction_attrs_from_map(corr)

                  {:ok, updated_ctx} =
                    ctx
                    |> DecisionContext.update_changeset(changes, next)
                    |> Repo.update()

                  {:ok, answered} =
                    result
                    |> DecisionResult.answer_question_changeset()
                    |> Repo.update()

                  {:ok, row} =
                    insert_decision_event(Repo, updated_ctx, "decision.question_answered", actor_user_id, %{
                      "decision_result_id" => answered.id,
                      "question_id" => answered.question_id,
                      "choice_id" => choice_id,
                      "new_context_revision" => updated_ctx.revision
                    })

                  {:answered, updated_ctx, answered, row}
                end
              end
          end
      end
    end)
    |> case do
      {:ok, {:stale, ctx}} ->
        # Commit supersession outside the failed answer path
        {:ok, %{result: superseded, outbox: row}} =
          Repo.transaction(fn ->
            r = Repo.get!(DecisionResult, result_id)

            {:ok, s} =
              r
              |> DecisionResult.supersede_question_changeset()
              |> Repo.update()

            {:ok, row} =
              insert_decision_event(Repo, ctx, "decision.question_superseded", actor_user_id, %{
                "decision_result_id" => s.id,
                "question_id" => s.question_id,
                "reason" => "stale_context_revision"
              })

            %{result: s, outbox: row}
          end)

        _ = Publisher.schedule_publish(row.id)
        {:error, :stale_question, superseded}

      {:ok, {:answered, updated_ctx, answered, row}} ->
        _ = Publisher.schedule_publish(row.id)

        case resolve_high(updated_ctx.id, actor_user_id, %{
               "expected_context_revision" => updated_ctx.revision
             }) do
          {:ok, %{outcome: "HIGH", result: high_result}} ->
            {:ok,
             %{
               outcome: "HIGH_AFTER_ANSWER",
               context: updated_ctx,
               question_result: answered,
               result: high_result
             }}

          {:ok, other} ->
            {:ok,
             %{
               outcome: "ANSWERED_NOT_YET_HIGH",
               context: updated_ctx,
               question_result: answered,
               followup: other
             }}

          {:error, reason} ->
            {:ok,
             %{
               outcome: "ANSWERED_REEVAL_ERROR",
               context: updated_ctx,
               question_result: answered,
               error: reason
             }}
        end

      {:error, reason} ->
        {:error, reason}
    end
  end

  defp correction_attrs_from_map(%{"operation" => "set_budget", "budget_max" => max}) do
    %{budget_context: %{"max" => max}}
  end

  defp correction_attrs_from_map(%{"operation" => "set_time", "time_context" => t}) do
    %{time_context: t}
  end

  defp correction_attrs_from_map(%{"operation" => "set_vibe", "vibe" => v}) do
    %{preference_context: %{"vibe" => v}}
  end

  defp correction_attrs_from_map(_), do: %{}

  @doc """
  Accept provisional high result into same Graph.

  Does not book/reserve. Does not paint Gold.
  """
  def accept_result(result_id, actor_user_id, attrs \\ %{})
      when is_binary(result_id) and is_binary(actor_user_id) do
    attrs = stringify_keys(attrs)
    graph_id = attrs["graph_id"]

    Repo.transaction(fn ->
      result = Repo.get(DecisionResult, result_id)

      cond do
        is_nil(result) ->
          Repo.rollback(:not_found)

        true ->
          case get_context(result.decision_id, actor_user_id) do
            {:error, reason} ->
              Repo.rollback(reason)

            {:ok, %{context: ctx}} ->
              if result.based_on_context_revision != ctx.revision do
                Repo.rollback(:stale_decision_result)
              else
                gid = graph_id || ctx.graph_id || Ecto.UUID.generate()

                {:ok, accepted} =
                  result
                  |> DecisionResult.accept_changeset(gid)
                  |> Repo.update()

                {:ok, row} =
                  insert_decision_event(Repo, ctx, "decision.accepted", actor_user_id, %{
                    "decision_result_id" => accepted.id,
                    "based_on_context_revision" => accepted.based_on_context_revision,
                    "graph_id" => accepted.graph_id,
                    "answer_entity_id" => accepted.answer_entity_id,
                    "truth_state" => "accepted"
                  })

                {accepted, row, ctx}
              end
          end
      end
    end)
    |> case do
      {:ok, {accepted, row, _ctx}} ->
        _ = Publisher.schedule_publish(row.id)
        {:ok, %{result: accepted, graph_id: accepted.graph_id}}

      {:error, reason} ->
        {:error, reason}
    end
  end

  def get_result(result_id, viewer_user_id) when is_binary(result_id) do
    case Repo.get(DecisionResult, result_id) do
      nil ->
        {:error, :not_found}

      %DecisionResult{} = r ->
        case get_context(r.decision_id, viewer_user_id) do
          {:ok, _} -> {:ok, r}
          err -> err
        end
    end
  end

  defp get_result_for_decision(decision_id, result_revision) do
    case Repo.get_by(DecisionResult, decision_id: decision_id, result_revision: result_revision) do
      nil -> {:error, :not_found}
      r -> {:ok, r}
    end
  end

  defp get_result_for_context_revision(decision_id, ctx_rev) do
    case Repo.one(
           from r in DecisionResult,
             where: r.decision_id == ^decision_id and r.based_on_context_revision == ^ctx_rev,
             order_by: [desc: r.result_revision],
             limit: 1
         ) do
      nil -> {:error, :not_found}
      r -> {:ok, r}
    end
  end

  defp match_revision(_ctx, nil), do: {:error, :expected_context_revision_required}

  defp match_revision(%DecisionContext{revision: rev}, expected) when is_integer(expected) do
    if rev == expected, do: :ok, else: {:error, :stale_decision_revision}
  end

  defp match_revision(_, _), do: {:error, :expected_context_revision_required}

  defp ensure_active(%DecisionContext{status: "active"}), do: :ok
  defp ensure_active(_), do: {:error, :decision_not_active}

  defp status_transition(decision_id, actor_user_id, status, event_type, attrs) do
    attrs = stringify_keys(attrs)
    expected = attrs["expected_revision"]

    Repo.transaction(fn ->
      ctx =
        from(c in DecisionContext, where: c.id == ^decision_id)
        |> lock("FOR UPDATE")
        |> Repo.one()

      cond do
        is_nil(ctx) ->
          Repo.rollback(:not_found)

        not authorized?(ctx, actor_user_id) ->
          Repo.rollback(:forbidden)

        is_integer(expected) and ctx.revision != expected ->
          Repo.rollback(:stale_decision_revision)

        ctx.status == status ->
          {:noop, ctx}

        true ->
          next = ctx.revision + 1

          {:ok, updated} =
            ctx
            |> DecisionContext.update_changeset(%{status: status}, next)
            |> Repo.update()

          {:ok, row} =
            insert_decision_event(Repo, updated, event_type, actor_user_id, %{
              "changed_fields" => ["status"],
              "status" => status
            })

          {:ok, updated, row}
      end
    end)
    |> case do
      {:ok, {:noop, ctx}} ->
        get_context(ctx.id, actor_user_id)

      {:ok, {:ok, updated, row}} ->
        _ = Publisher.schedule_publish(row.id)
        get_context(updated.id, actor_user_id)

      {:error, reason} ->
        {:error, reason}
    end
  end

  # --- helpers ---

  defp authorized?(%DecisionContext{} = ctx, user_id) do
    ctx.initiator_user_id == user_id or user_id in (ctx.participant_ids || [])
  end

  defp visible_to?(%DecisionEvidence{privacy_class: "private_user", owner_user_id: owner}, viewer_id),
    do: owner == viewer_id

  defp visible_to?(%DecisionEvidence{privacy_class: class}, _viewer_id)
       when class in ~w(inferred shared_group relationship external_verified),
       do: true

  defp visible_to?(_, _), do: false

  defp maybe_mark_expired(%DecisionEvidence{expires_at: nil} = e), do: e

  defp maybe_mark_expired(%DecisionEvidence{expires_at: exp} = e) do
    if DateTime.compare(exp, DateTime.utc_now()) == :lt do
      %{e | freshness: "stale", stale: true}
    else
      e
    end
  end

  defp correction_delta(%DecisionContext{} = ctx, %{"operation" => "set_budget"} = attrs) do
    budget = attrs["budget_context"] || %{"max" => attrs["budget_max"]}
    if ctx.budget_context == budget do
      {%{}, nil, "budget"}
    else
      {%{budget_context: budget}, budget, "budget"}
    end
  end

  defp correction_delta(%DecisionContext{} = ctx, %{"operation" => "set_time"} = attrs) do
    time = attrs["time_context"] || %{}
    if ctx.time_context == time, do: {%{}, nil, "time"}, else: {%{time_context: time}, time, "time"}
  end

  defp correction_delta(%DecisionContext{} = ctx, %{"operation" => "set_vibe"} = attrs) do
    pref =
      Map.merge(ctx.preference_context || %{}, %{
        "vibe" => attrs["vibe"] || get_in(attrs, ["preference_context", "vibe"])
      })

    if ctx.preference_context == pref do
      {%{}, nil, "vibe"}
    else
      {%{preference_context: pref}, %{"vibe" => pref["vibe"]}, "vibe"}
    end
  end

  defp correction_delta(%DecisionContext{} = ctx, %{"operation" => "set_people_scope"} = attrs) do
    changes =
      %{}
      |> maybe_put(:scope_type, attrs["scope_type"], ctx.scope_type)
      |> maybe_put(:participant_ids, attrs["participant_ids"], ctx.participant_ids)
      |> maybe_put(:scope_ids, attrs["scope_ids"], ctx.scope_ids)

    claim = Map.take(changes, [:scope_type, :participant_ids, :scope_ids])
    if map_size(changes) == 0, do: {%{}, nil, "people"}, else: {changes, claim, "people"}
  end

  defp correction_delta(%DecisionContext{} = ctx, %{"operation" => "add_participant"} = attrs) do
    pid = attrs["participant_id"]
    ids = ctx.participant_ids || []

    if pid in ids do
      {%{}, nil, "people"}
    else
      next = ids ++ [pid]
      {%{participant_ids: next}, %{"added" => pid}, "people"}
    end
  end

  defp correction_delta(%DecisionContext{} = ctx, %{"operation" => "remove_participant"} = attrs) do
    pid = attrs["participant_id"]
    ids = ctx.participant_ids || []

    if pid not in ids do
      {%{}, nil, "people"}
    else
      {%{participant_ids: List.delete(ids, pid)}, %{"removed" => pid}, "people"}
    end
  end

  defp correction_delta(%DecisionContext{} = ctx, %{"operation" => "set_location_constraint"} = attrs) do
    loc = attrs["location_context"] || %{}
    if ctx.location_context == loc, do: {%{}, nil, "location"}, else: {%{location_context: loc}, loc, "location"}
  end

  defp correction_delta(%DecisionContext{} = ctx, %{"operation" => "set_availability"} = attrs) do
    av = attrs["availability_context"] || %{}
    if ctx.availability_context == av, do: {%{}, nil, "availability"}, else: {%{availability_context: av}, av, "availability"}
  end

  defp correction_delta(%DecisionContext{} = ctx, %{"operation" => "set_intent"} = attrs) do
    intent = attrs["intent"]
    if ctx.intent == intent, do: {%{}, nil, "intent"}, else: {%{intent: intent}, %{"intent" => intent}, "intent"}
  end

  defp correction_delta(_, _), do: {%{}, nil, "unknown"}

  defp maybe_put(map, _key, nil, _current), do: map
  defp maybe_put(map, _key, value, current) when value == current, do: map
  defp maybe_put(map, key, value, _current), do: Map.put(map, key, value)

  defp insert_evidences(_repo, _ctx, [], _rev), do: {:ok, []}

  defp insert_evidences(repo, ctx, list, rev) do
    Enum.reduce_while(list, {:ok, []}, fn raw, {:ok, acc} ->
      raw = stringify_keys(raw)

      cs =
        %DecisionEvidence{}
        |> DecisionEvidence.changeset(%{
          decision_id: ctx.id,
          dimension: raw["dimension"] || "general",
          claim: raw["claim"] || %{},
          privacy_class: raw["privacy_class"] || "shared_group",
          source_type: raw["source_type"] || "user",
          source_ref: raw["source_ref"],
          confidence: raw["confidence"],
          freshness: raw["freshness"] || "fresh",
          observed_at: parse_dt(raw["observed_at"]),
          expires_at: parse_dt(raw["expires_at"]),
          constraint_kind: raw["constraint_kind"] || "soft",
          introduced_at_revision: rev,
          owner_user_id: raw["owner_user_id"] || ctx.initiator_user_id
        })

      case repo.insert(cs) do
        {:ok, e} -> {:cont, {:ok, [e | acc]}}
        {:error, cs} -> {:halt, {:error, cs}}
      end
    end)
  end

  defp insert_decision_event(repo, %DecisionContext{} = ctx, event_type, actor_id, extra) do
    payload =
      Map.merge(
        %{
          "decision_id" => ctx.id,
          "revision" => ctx.revision,
          "scope_type" => ctx.scope_type,
          "intent" => ctx.intent,
          "status" => ctx.status,
          "actor_id" => actor_id,
          "graph_id" => ctx.graph_id,
          "journey_id" => ctx.journey_id
        },
        extra
      )

    with {:ok, envelope} <-
           DomainEvent.build(%{
             event_type: event_type,
             partition_key: ctx.id,
             aggregate_type: "decision_context",
             aggregate_id: ctx.id,
             correlation_id: ctx.correlation_id,
             privacy_class: "shared_authorized",
             purpose: "decision_context_lifecycle",
             topic_family: "opal.decision.events",
             payload: payload
           }) do
      now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

      %EventOutbox{}
      |> EventOutbox.changeset(%{
        event_id: envelope["event_id"],
        event_type: envelope["event_type"],
        event_version: envelope["event_version"],
        aggregate_type: envelope["aggregate_type"],
        aggregate_id: envelope["aggregate_id"],
        partition_key: envelope["partition_key"],
        topic_family: envelope["topic_family"],
        privacy_class: envelope["privacy_class"],
        purpose: envelope["purpose"],
        correlation_id: envelope["correlation_id"],
        causation_id: envelope["causation_id"],
        envelope: envelope,
        status: "pending",
        available_at: now
      })
      |> repo.insert()
    end
  end

  defp maybe_idem_multi(multi, _actor, nil, _op), do: multi

  defp maybe_idem_multi(multi, actor, idem, op) do
    Multi.run(multi, :idem, fn repo, %{context: ctx} ->
      %MutationKey{}
      |> MutationKey.changeset(%{
        actor_user_id: actor,
        idempotency_key: idem,
        decision_id: ctx.id,
        result_revision: ctx.revision,
        operation: op
      })
      |> repo.insert()
    end)
  end

  defp normalize_predicates(list) when is_list(list) do
    Enum.map(list, fn
      %{"type" => _} = p -> Map.put_new(p, "version", 1)
      %{type: t} = p -> %{"type" => t, "version" => Map.get(p, :version, 1)}
      other -> other
    end)
  end

  defp stringify_keys(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), stringify_val(v)}
      {k, v} -> {k, stringify_val(v)}
    end)
  end

  defp stringify_val(list) when is_list(list), do: Enum.map(list, &stringify_val/1)
  defp stringify_val(map) when is_map(map), do: stringify_keys(map)
  defp stringify_val(v), do: v

  defp parse_dt(nil), do: nil
  defp parse_dt(%DateTime{} = d), do: DateTime.truncate(d, :microsecond)

  defp parse_dt(bin) when is_binary(bin) do
    case DateTime.from_iso8601(bin) do
      {:ok, dt, _} -> DateTime.truncate(dt, :microsecond)
      _ -> nil
    end
  end
end
