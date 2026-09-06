defmodule OpalCore.DecisionIntelligence.Materiality do
  @moduledoc """
  Deterministic first-pass event materiality for P4.5 recomposition.

  Classes: NO_EFFECT · EVIDENCE_REFRESH_ONLY · DETERMINISTIC_RESULT_UPDATE ·
  RECOMPUTE_REQUIRED · USER_ACTION_REQUIRED · URGENT_INVALIDATION
  """

  alias OpalCore.DecisionIntelligence.DecisionResult

  @policy_version "p4.5.materiality.v1"
  @classes ~w(
    NO_EFFECT
    EVIDENCE_REFRESH_ONLY
    DETERMINISTIC_RESULT_UPDATE
    RECOMPUTE_REQUIRED
    USER_ACTION_REQUIRED
    URGENT_INVALIDATION
  )

  @travel_hysteresis_minutes 5
  @anti_flap_window_seconds 30

  def policy_version, do: @policy_version
  def classes, do: @classes

  @doc """
  Evaluate whether `event` materially affects an active decision result/context bundle.

  `decision` may be a DecisionResult, a map with result fields, or
  `%{result: DecisionResult.t(), context: map()}`.
  """
  def evaluate(event, decision) when is_map(event) do
    e = stringify(event)
    bundle = normalize_decision(decision)
    result = bundle.result

    cond do
      is_nil(result) and is_nil(bundle.decision_id) ->
        class("NO_EFFECT", e, "no_active_decision")

      not entity_tied?(e, bundle) and not predicate_hit?(e, bundle) ->
        class("NO_EFFECT", e, "not_in_dependency")

      evidence_only?(e) ->
        class("EVIDENCE_REFRESH_ONLY", e, "freshness_or_provenance")

      urgent_provider_failure?(e, bundle) ->
        if commitment_blocks_auto_adapt?(result) do
          class("USER_ACTION_REQUIRED", e, "accepted_provider_disruption")
        else
          class("URGENT_INVALIDATION", e, "selected_place_unavailable")
        end

      recompute_trigger?(e, bundle) ->
        if commitment_blocks_auto_adapt?(result) and place_identity_threat?(e, bundle) do
          class("USER_ACTION_REQUIRED", e, "commitment_inertia")
        else
          class("RECOMPUTE_REQUIRED", e, "premise_or_feasibility_change")
        end

      deterministic_metadata?(e) ->
        class("DETERMINISTIC_RESULT_UPDATE", e, "provider_metadata")

      true ->
        class("NO_EFFECT", e, "below_threshold")
    end
  end

  def evaluate(_, _), do: class("NO_EFFECT", %{}, "invalid_event")

  @doc "True when accepted / reserved commitments must not auto-swap place."
  def commitment_blocks_auto_adapt?(%DecisionResult{} = r) do
    r.status in ~w(accepted) or r.truth_state in ~w(accepted ready reserved confirmed)
  end

  def commitment_blocks_auto_adapt?(%{"status" => status, "truth_state" => truth}) do
    status in ~w(accepted) or truth in ~w(accepted ready reserved confirmed)
  end

  def commitment_blocks_auto_adapt?(%{status: status, truth_state: truth}) do
    status in ~w(accepted) or truth in ~w(accepted ready reserved confirmed)
  end

  def commitment_blocks_auto_adapt?(_), do: false

  @doc "Travel ETA hysteresis — ignore sub-threshold deltas."
  def travel_delta_material?(old_minutes, new_minutes)
      when is_number(old_minutes) and is_number(new_minutes) do
    delta = abs(new_minutes - old_minutes)
    pct = if old_minutes > 0, do: delta / old_minutes, else: 1.0
    delta >= @travel_hysteresis_minutes or pct >= 0.15
  end

  def travel_delta_material?(_, _), do: true

  @doc "Anti-flap: score-only churn without identity/mode change → silence."
  def same_answer_silence?(before, after_result) do
    b = normalize_answer(before)
    a = normalize_answer(after_result)

    b.mode == a.mode and b.entity_id == a.entity_id and b.actions == a.actions
  end

  def anti_flap_window_seconds, do: @anti_flap_window_seconds

  defp class(name, event, reason) do
    %{
      "class" => name,
      "reason" => reason,
      "event_type" => event["event_type"],
      "policy_version" => @policy_version,
      "silence?" => name in ~w(NO_EFFECT EVIDENCE_REFRESH_ONLY),
      "recompute?" => name in ~w(RECOMPUTE_REQUIRED URGENT_INVALIDATION),
      "user_confirm?" => name in ~w(USER_ACTION_REQUIRED)
    }
  end

  defp normalize_decision(%DecisionResult{} = r) do
    %{
      result: r,
      decision_id: r.decision_id,
      answer_entity_id: r.answer_entity_id,
      invalidation_conditions: r.invalidation_conditions || [],
      graph_id: r.graph_id,
      participant_ids: []
    }
  end

  defp normalize_decision(%{result: %DecisionResult{} = r} = bundle) do
    ctx = Map.get(bundle, :context) || Map.get(bundle, "context")

    %{
      result: r,
      decision_id: r.decision_id,
      answer_entity_id: r.answer_entity_id,
      invalidation_conditions: r.invalidation_conditions || [],
      graph_id: r.graph_id || (ctx && Map.get(ctx, :graph_id)),
      participant_ids: (ctx && Map.get(ctx, :participant_ids)) || []
    }
  end

  defp normalize_decision(map) when is_map(map) do
    m = stringify(map)

    %{
      result: m,
      decision_id: m["decision_id"],
      answer_entity_id: m["answer_entity_id"] || m["selected_candidate_id"],
      invalidation_conditions: List.wrap(m["invalidation_conditions"]),
      graph_id: m["graph_id"],
      participant_ids: List.wrap(m["participant_ids"])
    }
  end

  defp normalize_decision(_), do: %{result: nil, decision_id: nil, answer_entity_id: nil, invalidation_conditions: [], graph_id: nil, participant_ids: []}

  defp entity_tied?(e, bundle) do
    eid = e["entity_id"] || e["provider_place_id"] || e["place_id"]
    pid = e["participant_id"]
    gid = e["graph_id"]

    cond do
      is_binary(eid) and eid != "" and eid == bundle.answer_entity_id -> true
      is_binary(eid) and eid in List.wrap(e["dependent_entity_ids"]) -> true
      is_binary(pid) and pid in bundle.participant_ids -> true
      is_binary(gid) and gid != "" and gid == bundle.graph_id -> true
      e["decision_id"] == bundle.decision_id and is_binary(bundle.decision_id) -> true
      true -> false
    end
  end

  defp predicate_hit?(e, bundle) do
    typ = predicate_type(e)

    Enum.any?(bundle.invalidation_conditions, fn cond ->
      c = stringify(cond)
      c["type"] == typ
    end)
  end

  defp predicate_type(e) do
    case e["event_type"] do
      "provider." <> _ -> "provider_availability"
      "availability." <> _ -> "participant_availability"
      "location." <> _ -> "location_radius"
      "graph." <> _ -> "graph_revision"
      "journey." <> _ -> "journey_revision"
      "weather." <> _ -> "weather_dependency"
      other when is_binary(other) -> e["invalidation_type"] || other
      _ -> e["invalidation_type"]
    end
  end

  defp evidence_only?(e) do
    e["event_type"] in ~w(evidence.refreshed world_fact.observed provider.metadata_refreshed) or
      e["materiality_hint"] == "EVIDENCE_REFRESH_ONLY"
  end

  defp urgent_provider_failure?(e, bundle) do
    eid = e["entity_id"] || e["provider_place_id"]
    fail? =
      e["event_type"] in ~w(
        provider.unavailable
        provider.reservation_failed
        provider.place_closed
        provider_unavailable
      ) or e["provider_state"] in ~w(unavailable closed failed)

    fail? and is_binary(eid) and eid == bundle.answer_entity_id
  end

  defp recompute_trigger?(e, _bundle) do
    e["event_type"] in ~w(
      provider.unavailable
      provider.reservation_failed
      provider.place_closed
      provider_unavailable
      provider.availability_changed
      availability.changed
      location.context_changed
      graph.context_changed
      journey.leave_time_changed
      participant.membership_changed
    ) or e["materiality_hint"] == "RECOMPUTE_REQUIRED" or
      e["force_recompute"] == true
  end

  defp place_identity_threat?(e, bundle) do
    eid = e["entity_id"] || e["provider_place_id"]
    is_binary(eid) and eid == bundle.answer_entity_id
  end

  defp deterministic_metadata?(e) do
    e["event_type"] in ~w(provider.hours_updated provider.rating_updated) or
      e["materiality_hint"] == "DETERMINISTIC_RESULT_UPDATE"
  end

  defp normalize_answer(%DecisionResult{} = r) do
    %{mode: r.mode, entity_id: r.answer_entity_id, actions: r.actions}
  end

  defp normalize_answer(map) when is_map(map) do
    m = stringify(map)
    %{mode: m["mode"], entity_id: m["answer_entity_id"], actions: m["actions"]}
  end

  defp normalize_answer(_), do: %{mode: nil, entity_id: nil, actions: nil}

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
