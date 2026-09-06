defmodule OpalCore.DecisionIntelligence.Recomposer do
  @moduledoc """
  Apply world/provider events to active decisions via materiality + same DI ladder.

  EVENT ≠ CONSEQUENCE. Silence when no material user consequence.
  """

  import Ecto.Query

  alias Ecto.Multi
  alias OpalCore.DecisionIntelligence.DecisionContext
  alias OpalCore.DecisionIntelligence.DecisionResult
  alias OpalCore.DecisionIntelligence.DependencyIndex
  alias OpalCore.DecisionIntelligence.HighConfidence
  alias OpalCore.DecisionIntelligence.LowConfidence
  alias OpalCore.DecisionIntelligence.Materiality
  alias OpalCore.Events.DomainEvent
  alias OpalCore.Events.EventOutbox
  alias OpalCore.Events.Publisher
  alias OpalCore.Repo

  @doc """
  Pipeline: find decisions → materiality → recompute or silence.

  attrs keys (string or atom):
  - event_id, event_type, entity_id / provider_place_id, decision_id (optional)
  - entity_type (default provider_place)
  - actor_user_id (optional; defaults to initiator)
  """
  def apply_world_event(attrs) when is_map(attrs) do
    a = stringify(attrs)
    entity_type = a["entity_type"] || default_entity_type(a)
    entity_id = a["entity_id"] || a["provider_place_id"] || a["place_id"]

    bundles =
      cond do
        is_binary(a["decision_id"]) ->
          load_bundle(a["decision_id"])

        is_binary(entity_id) ->
          DependencyIndex.find_active_bundles(entity_type, entity_id)

        true ->
          []
      end

    if bundles == [] do
      {:ok,
       %{
         "action" => "silence",
         "materiality" => "NO_EFFECT",
         "reason" => "no_dependent_decisions",
         "results" => []
       }}
    else
      results = Enum.map(bundles, &recompose_bundle(&1, a))

      action =
        cond do
          Enum.any?(results, &(&1["action"] in ~w(recomputed user_confirmation_required))) ->
            "recomputed"

          Enum.any?(results, &(&1["action"] == "evidence_refresh")) ->
            "evidence_refresh"

          true ->
            "silence"
        end

      {:ok, %{"action" => action, "results" => results}}
    end
  end

  def apply_world_event(_), do: {:error, :invalid}

  defp recompose_bundle(%{context: ctx, result: result}, event) do
    mat = Materiality.evaluate(event, %{context: ctx, result: result})

    cond do
      mat["silence?"] ->
        %{
          "decision_id" => ctx.id,
          "action" => "silence",
          "materiality" => mat["class"],
          "reason" => mat["reason"]
        }

      mat["user_confirm?"] ->
        _ = maybe_emit_recomputed(ctx, result, event, mat, "USER_CONFIRMATION_REQUIRED", result)

        %{
          "decision_id" => ctx.id,
          "action" => "user_confirmation_required",
          "materiality" => mat["class"],
          "commitment" => "USER_CONFIRMATION_REQUIRED",
          "reason" => mat["reason"]
        }

      mat["class"] == "URGENT_INVALIDATION" ->
        actor = event["actor_user_id"] || ctx.initiator_user_id
        ctx2 = apply_evidence_delta(ctx, event)

        persist_failure(
          ctx2,
          result,
          %{
            "reason_codes" => ["candidate_unavailable", "urgent_invalidation"],
            "policy_version" => mat["policy_version"]
          },
          event,
          mat,
          actor
        )

      mat["recompute?"] or mat["class"] == "DETERMINISTIC_RESULT_UPDATE" ->
        do_recompute(ctx, result, event, mat)

      true ->
        %{
          "decision_id" => ctx.id,
          "action" => "silence",
          "materiality" => mat["class"],
          "reason" => mat["reason"]
        }
    end
  end

  defp do_recompute(%DecisionContext{} = ctx, %DecisionResult{} = old, event, mat) do
    actor = event["actor_user_id"] || ctx.initiator_user_id
    ctx2 = apply_evidence_delta(ctx, event)

    ladder =
      case LowConfidence.evaluate(ctx2) do
        {:high, assessment} -> {:high, assessment}
        {:medium, assessment} -> {:medium, assessment}
        {:low, assessment} -> {:low, assessment}
        {:no_valid_candidate, assessment} -> {:failure, assessment}
        {:not_low, _assessment} ->
          case HighConfidence.evaluate(ctx2) do
            {:high, a} -> {:high, a}
            {:not_high, a} -> {:failure, a}
          end
      end

    case ladder do
      {:high, assessment} ->
        if Materiality.same_answer_silence?(old, %{
             "mode" => "high",
             "answer_entity_id" => assessment["selected_candidate_id"],
             "actions" => old.actions
           }) and mat["class"] != "URGENT_INVALIDATION" do
          %{
            "decision_id" => ctx.id,
            "action" => "silence",
            "materiality" => mat["class"],
            "reason" => "same_answer_after_recompute"
          }
        else
          persist_supersession(ctx2, old, assessment, event, mat, actor, "HIGH")
        end

      {:medium, assessment} ->
        %{
          "decision_id" => ctx.id,
          "action" => "recomputed",
          "materiality" => mat["class"],
          "outcome" => "MEDIUM",
          "assessment" => Map.take(assessment, ["reason_codes", "policy_version"])
        }
        |> tap_emit(ctx2, old, event, mat, "MEDIUM")

      {:low, _assessment} ->
        %{
          "decision_id" => ctx.id,
          "action" => "recomputed",
          "materiality" => mat["class"],
          "outcome" => "LOW"
        }
        |> tap_emit(ctx2, old, event, mat, "LOW")

      {:failure, assessment} ->
        persist_failure(ctx2, old, assessment, event, mat, actor)
    end
  end

  defp persist_supersession(ctx, old, assessment, event, mat, actor, outcome) do
    cand = assessment["selected_candidate"]
    next_rev = (old.result_revision || 1) + 1
    source = assessment["candidate_source"] || old.candidate_source

    cs =
      DecisionResult.create_changeset(%{
        decision_id: ctx.id,
        based_on_context_revision: ctx.revision,
        result_revision: next_rev,
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
          "recomputed" => true,
          "materiality" => mat["class"],
          "prior_result_id" => old.id
        },
        explanation_shareable: %{
          "summary" => "#{cand["name"]} · #{cand["area_label"] || "nearby"}",
          "provisional" => true,
          "hue" => "violet"
        },
        actions: [
          %{"id" => "go_with_this", "label" => "Go with this", "means" => "accept_into_same_graph"}
        ],
        candidate_source: source,
        policy_version: assessment["policy_version"],
        status: "provisional",
        correlation_id: ctx.correlation_id,
        graph_id: ctx.graph_id
      })

    multi =
      Multi.new()
      |> Multi.update(:old, DecisionResult.supersede_changeset(old))
      |> Multi.insert(:result, cs)
      |> Multi.run(:deps, fn _repo, %{result: result} ->
        DependencyIndex.upsert_for_result(ctx, result)
      end)
      |> Multi.run(:outbox, fn repo, %{result: result} ->
        insert_recomputed(repo, ctx, result, event, mat, outcome, actor)
      end)

    case Repo.transaction(multi) do
      {:ok, %{result: result, outbox: row}} ->
        _ = Publisher.schedule_publish(row.id)

        %{
          "decision_id" => ctx.id,
          "action" => "recomputed",
          "materiality" => mat["class"],
          "outcome" => outcome,
          "result_id" => result.id,
          "prior_result_id" => old.id,
          "answer_entity_id" => result.answer_entity_id
        }

      {:error, step, reason, _} ->
        %{
          "decision_id" => ctx.id,
          "action" => "error",
          "materiality" => mat["class"],
          "error" => inspect({step, reason})
        }
    end
  end

  defp persist_failure(ctx, old, assessment, event, mat, actor) do
    next_rev = (old.result_revision || 1) + 1

    # Mark old superseded; do not invent a fake place answer
    multi =
      Multi.new()
      |> Multi.update(
        :old,
        old
        |> DecisionResult.supersede_changeset()
        |> Ecto.Changeset.put_change(:provider_state, "unavailable")
        |> Ecto.Changeset.put_change(:truth_state, "invalidated")
      )
      |> Multi.run(:outbox, fn repo, %{old: superseded} ->
        insert_recomputed(repo, ctx, superseded, event, mat, "FAILURE", actor, %{
          "reason_codes" => assessment["reason_codes"] || ["candidate_unavailable"],
          "result_revision" => next_rev
        })
      end)

    case Repo.transaction(multi) do
      {:ok, %{old: superseded, outbox: row}} ->
        _ = Publisher.schedule_publish(row.id)

        %{
          "decision_id" => ctx.id,
          "action" => "recomputed",
          "materiality" => mat["class"],
          "outcome" => "FAILURE",
          "prior_result_id" => superseded.id,
          "reason_codes" => assessment["reason_codes"]
        }

      {:error, step, reason, _} ->
        %{
          "decision_id" => ctx.id,
          "action" => "error",
          "error" => inspect({step, reason})
        }
    end
  end

  defp tap_emit(payload, ctx, old, event, mat, outcome) do
    _ = maybe_emit_recomputed(ctx, old, event, mat, outcome, old)
    payload
  end

  defp maybe_emit_recomputed(ctx, result, event, mat, outcome, _ref) do
    case insert_recomputed(Repo, ctx, result, event, mat, outcome, ctx.initiator_user_id) do
      {:ok, row} ->
        _ = Publisher.schedule_publish(row.id)
        {:ok, row}

      err ->
        err
    end
  end

  defp apply_evidence_delta(%DecisionContext{} = ctx, event) do
    # In-memory provider_context delta for ladder; durable write optional
    pc =
      Map.merge(ctx.provider_context || %{}, %{
        "last_world_event" => event["event_type"],
        "last_entity_id" => event["entity_id"] || event["provider_place_id"],
        "provider_state" => event["provider_state"] || "unknown"
      })

    # Simulate selected place gone for unavailable events
    eid = event["entity_id"] || event["provider_place_id"]

    pc =
      if event["event_type"] in ~w(provider.unavailable provider_unavailable provider.place_closed) and
           is_binary(eid) do
        Map.put(pc, "excluded_place_ids", Enum.uniq([eid | List.wrap(pc["excluded_place_ids"])]))
      else
        pc
      end

    %{ctx | provider_context: pc}
  end

  defp insert_recomputed(repo, ctx, result, event, mat, outcome, actor, extra \\ %{}) do
    payload =
      Map.merge(
        %{
          "decision_id" => ctx.id,
          "revision" => ctx.revision,
          "decision_result_id" => result.id,
          "based_on_context_revision" => result.based_on_context_revision,
          "materiality" => mat["class"],
          "outcome" => outcome,
          "causation_event_id" => event["event_id"],
          "causation_event_type" => event["event_type"],
          "answer_entity_id" => result.answer_entity_id,
          "truth_state" => result.truth_state,
          "actor_id" => actor
        },
        extra
      )

    with {:ok, envelope} <-
           DomainEvent.build(%{
             event_type: "decision.recomputed",
             partition_key: ctx.id,
             aggregate_type: "decision_context",
             aggregate_id: ctx.id,
             correlation_id: ctx.correlation_id,
             causation_id: event["event_id"],
             privacy_class: "shared_authorized",
             purpose: "decision_recomposition",
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

  defp load_bundle(decision_id) do
    case Repo.get(DecisionContext, decision_id) do
      %DecisionContext{status: "active"} = ctx ->
        result =
          from(r in DecisionResult,
            where: r.decision_id == ^decision_id,
            where: r.status not in ^~w(superseded settled invalidated),
            order_by: [desc: r.result_revision, desc: r.inserted_at],
            limit: 1
          )
          |> Repo.one()

        if result, do: [%{context: ctx, result: result}], else: []

      _ ->
        []
    end
  end

  defp default_entity_type(a) do
    cond do
      a["participant_id"] -> "participant"
      a["graph_id"] && is_nil(a["provider_place_id"]) && is_nil(a["entity_id"]) -> "graph"
      true -> "provider_place"
    end
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
