defmodule OpalCore.DecisionIntelligence.MaterialityTest do
  use ExUnit.Case, async: true

  alias OpalCore.DecisionIntelligence.DecisionResult
  alias OpalCore.DecisionIntelligence.Materiality

  defp result(attrs) do
    %DecisionResult{
      id: Ecto.UUID.generate(),
      decision_id: Ecto.UUID.generate(),
      answer_entity_id: attrs[:answer_entity_id] || "place_a",
      status: attrs[:status] || "provisional",
      truth_state: attrs[:truth_state] || "provisional",
      invalidation_conditions: attrs[:invalidation_conditions] || [],
      graph_id: attrs[:graph_id],
      mode: "high",
      actions: []
    }
  end

  test "NO_EFFECT when event not tied to decision" do
    r = result([])
    mat = Materiality.evaluate(%{"event_type" => "provider.unavailable", "entity_id" => "other"}, r)
    assert mat["class"] == "NO_EFFECT"
    assert mat["silence?"]
  end

  test "URGENT_INVALIDATION / RECOMPUTE when selected place unavailable" do
    r = result(answer_entity_id: "osm_node_1")

    mat =
      Materiality.evaluate(
        %{"event_type" => "provider.unavailable", "entity_id" => "osm_node_1"},
        r
      )

    assert mat["class"] == "URGENT_INVALIDATION"
    assert mat["recompute?"]
  end

  test "accepted commitment blocks auto place swap" do
    r = result(answer_entity_id: "osm_node_1", status: "accepted", truth_state: "accepted")

    mat =
      Materiality.evaluate(
        %{"event_type" => "provider.unavailable", "entity_id" => "osm_node_1"},
        r
      )

    assert mat["class"] == "USER_ACTION_REQUIRED"
    assert mat["user_confirm?"]
  end

  test "evidence refresh only" do
    r = result(answer_entity_id: "p1")

    mat =
      Materiality.evaluate(
        %{"event_type" => "evidence.refreshed", "entity_id" => "p1"},
        r
      )

    assert mat["class"] == "EVIDENCE_REFRESH_ONLY"
    assert mat["silence?"]
  end

  test "travel hysteresis" do
    refute Materiality.travel_delta_material?(20, 22)
    assert Materiality.travel_delta_material?(20, 30)
  end
end
