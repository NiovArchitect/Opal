defmodule OpalCore.DecisionIntelligence do
  @moduledoc """
  P4 Decision Intelligence domain — DecisionContext lifecycle.

  Elixir owns truth. Postgres holds current state. Outbox binds events.
  Kafka transports durable events when enabled. No scoring/UI in P4.1.
  """

  import Ecto.Query

  alias Ecto.Multi
  alias OpalCore.DecisionIntelligence.DecisionContext
  alias OpalCore.DecisionIntelligence.DecisionEvidence
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
