defmodule OpalCore.DecisionIntelligenceHighTest do
  use OpalCore.DataCase, async: true

  alias OpalCore.Accounts.User
  alias OpalCore.DecisionIntelligence
  alias OpalCore.DecisionIntelligence.DecisionResult
  alias OpalCore.Events.EventOutbox
  alias OpalCore.Repo

  setup do
    alex =
      %User{}
      |> User.changeset(%{handle: "hi-alex-#{System.unique_integer([:positive])}", display_name: "Alex"})
      |> Repo.insert!()

    %{alex: alex}
  end

  test "resolve_high persists provisional one answer with fixture provenance", %{alex: alex} do
    {:ok, %{context: ctx}} =
      DecisionIntelligence.create_context(alex.id, %{
        "intent" => "date_ideas",
        "scope_type" => "solo",
        "budget_context" => %{"max" => 90},
        "preference_context" => %{"vibe" => "quiet"},
        "participant_ids" => [alex.id]
      })

    assert {:ok, %{outcome: "HIGH", result: result}} =
             DecisionIntelligence.resolve_high(ctx.id, alex.id, %{
               "expected_context_revision" => 1
             })

    assert result.confidence_class == "high"
    assert result.truth_state == "provisional"
    assert result.status == "provisional"
    assert result.based_on_context_revision == 1
    assert result.candidate_source == "fixture_catalog"
    assert is_binary(result.answer_entity_id)
    assert result.explanation_shareable["hue"] == "violet"

    assert Repo.exists?(
             from o in EventOutbox,
               where: o.aggregate_id == ^ctx.id and o.event_type == "decision.resolved"
           )
  end

  test "stale context revision rejects resolve", %{alex: alex} do
    {:ok, %{context: ctx}} =
      DecisionIntelligence.create_context(alex.id, %{"intent" => "nearby_now", "budget_context" => %{"max" => 50}})

    assert {:ok, %{context: _}} =
             DecisionIntelligence.apply_correction(ctx.id, alex.id, %{
               "operation" => "set_budget",
               "expected_revision" => 1,
               "budget_max" => 40
             })

    assert {:error, :stale_decision_revision} =
             DecisionIntelligence.resolve_high(ctx.id, alex.id, %{
               "expected_context_revision" => 1
             })
  end

  test "accept links same graph without gold", %{alex: alex} do
    {:ok, %{context: ctx}} =
      DecisionIntelligence.create_context(alex.id, %{
        "intent" => "date_ideas",
        "budget_context" => %{"max" => 100},
        "preference_context" => %{"vibe" => "quiet"}
      })

    {:ok, %{result: result}} =
      DecisionIntelligence.resolve_high(ctx.id, alex.id, %{"expected_context_revision" => 1})

    graph_id = Ecto.UUID.generate()

    assert {:ok, %{result: accepted, graph_id: ^graph_id}} =
             DecisionIntelligence.accept_result(result.id, alex.id, %{"graph_id" => graph_id})

    assert accepted.status == "accepted"
    assert accepted.truth_state == "accepted"
    refute accepted.truth_state in ~w(ready reserved confirmed)

    assert Repo.exists?(
             from o in EventOutbox,
               where: o.aggregate_id == ^ctx.id and o.event_type == "decision.accepted"
           )
  end

  test "accept stale result after context mutation fails", %{alex: alex} do
    {:ok, %{context: ctx}} =
      DecisionIntelligence.create_context(alex.id, %{
        "intent" => "date_ideas",
        "budget_context" => %{"max" => 100},
        "preference_context" => %{"vibe" => "quiet"}
      })

    {:ok, %{result: result}} =
      DecisionIntelligence.resolve_high(ctx.id, alex.id, %{"expected_context_revision" => 1})

    assert {:ok, _} =
             DecisionIntelligence.apply_correction(ctx.id, alex.id, %{
               "operation" => "set_budget",
               "expected_revision" => 1,
               "budget_max" => 70
             })

    assert {:error, :stale_decision_result} =
             DecisionIntelligence.accept_result(result.id, alex.id, %{
               "graph_id" => Ecto.UUID.generate()
             })
  end

  test "hard conflict yields NOT_HIGH", %{alex: alex} do
    {:ok, %{context: ctx}} =
      DecisionIntelligence.create_context(alex.id, %{
        "intent" => "date_ideas",
        "conflicts" => [%{"type" => "budget_vibe"}],
        "budget_context" => %{"max" => 50}
      })

    assert {:ok, %{outcome: "NOT_HIGH_CONFIDENCE", result: nil, assessment: a}} =
             DecisionIntelligence.resolve_high(ctx.id, alex.id, %{
               "expected_context_revision" => 1
             })

    assert "hard_constraint_conflict" in a["reason_codes"]
    assert Repo.aggregate(DecisionResult, :count) == 0
  end
end
