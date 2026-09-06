defmodule OpalCore.DecisionIntelligenceLowTest do
  use OpalCore.DataCase, async: true

  alias OpalCore.Accounts.User
  alias OpalCore.DecisionIntelligence
  alias OpalCore.Events.EventOutbox
  alias OpalCore.Repo

  setup do
    alex =
      %User{}
      |> User.changeset(%{handle: "low-alex-#{System.unique_integer([:positive])}", display_name: "Alex"})
      |> Repo.insert!()

    %{alex: alex}
  end

  test "resolve surfaces one tradeoff for grounded budget/fit conflict", %{alex: alex} do
    {:ok, %{context: ctx}} =
      DecisionIntelligence.create_context(alex.id, %{
        "intent" => "date_ideas",
        "scope_type" => "solo",
        "participant_ids" => [alex.id],
        "budget_context" => %{"max" => 40},
        "preference_context" => %{"vibe" => "quiet", "prefer_special" => true},
        "time_context" => %{"preference" => "flexible"},
        "soft_preferences" => %{"prefer_special" => true}
      })

    assert {:ok, %{outcome: "LOW", result: result}} =
             DecisionIntelligence.resolve(ctx.id, alex.id, %{"expected_context_revision" => 1})

    assert result.mode == "low"
    assert result.confidence_class == "low"
    assert result.tradeoff_status == "open"
    assert result.tradeoff_axis == "CHEAPER_VS_BETTER_FIT"
    assert length(result.actions) == 2
    assert result.explanation_shareable["figma_authority"] == "988:263"
    assert result.explanation_shareable["no_blame"] == true

    assert Repo.exists?(
             from o in EventOutbox,
               where: o.aggregate_id == ^ctx.id and o.event_type == "decision.tradeoff_presented"
           )
  end

  test "selecting tradeoff mutates same decision and can earn High", %{alex: alex} do
    {:ok, %{context: ctx}} =
      DecisionIntelligence.create_context(alex.id, %{
        "intent" => "date_ideas",
        "participant_ids" => [alex.id],
        "budget_context" => %{"max" => 40},
        "preference_context" => %{"vibe" => "quiet", "prefer_special" => true},
        "time_context" => %{"preference" => "flexible"},
        "soft_preferences" => %{"prefer_special" => true}
      })

    {:ok, %{result: t}} =
      DecisionIntelligence.resolve(ctx.id, alex.id, %{"expected_context_revision" => 1})

    assert {:ok, resolved} =
             DecisionIntelligence.resolve_tradeoff(t.id, alex.id, %{"selected_id" => "better_fit"})

    assert resolved.context.revision == 2
    assert resolved.tradeoff_result.tradeoff_status == "selected"

    assert Repo.exists?(
             from o in EventOutbox,
               where: o.aggregate_id == ^ctx.id and o.event_type == "decision.tradeoff_selected"
           )

    case resolved do
      %{outcome: "HIGH_AFTER_TRADEOFF", result: high} ->
        assert high.mode == "high"
        assert high.truth_state == "provisional"

      %{outcome: "TRADEOFF_RESOLVED_NOT_YET_HIGH", context: c} ->
        assert {:ok, %{outcome: "HIGH", result: high}} =
                 DecisionIntelligence.resolve_high(c.id, alex.id, %{
                   "expected_context_revision" => c.revision
                 })

        assert high.confidence_class == "high"

      other ->
        flunk("unexpected: #{inspect(other)}")
    end
  end

  test "stale tradeoff cannot be selected after context moved", %{alex: alex} do
    {:ok, %{context: ctx}} =
      DecisionIntelligence.create_context(alex.id, %{
        "intent" => "date_ideas",
        "participant_ids" => [alex.id],
        "budget_context" => %{"max" => 40},
        "preference_context" => %{"vibe" => "quiet", "prefer_special" => true},
        "time_context" => %{"preference" => "flexible"},
        "soft_preferences" => %{"prefer_special" => true}
      })

    {:ok, %{result: t}} =
      DecisionIntelligence.resolve(ctx.id, alex.id, %{"expected_context_revision" => 1})

    assert {:ok, _} =
             DecisionIntelligence.apply_correction(ctx.id, alex.id, %{
               "operation" => "set_vibe",
               "expected_revision" => 1,
               "vibe" => "lively"
             })

    assert {:error, :stale_tradeoff, superseded} =
             DecisionIntelligence.resolve_tradeoff(t.id, alex.id, %{"selected_id" => "cheaper"})

    assert superseded.tradeoff_status == "superseded"
  end

  test "complete non-conflict context still resolves HIGH", %{alex: alex} do
    {:ok, %{context: ctx}} =
      DecisionIntelligence.create_context(alex.id, %{
        "intent" => "date_ideas",
        "budget_context" => %{"max" => 90},
        "preference_context" => %{"vibe" => "quiet"},
        "time_context" => %{"preference" => "flexible"},
        "participant_ids" => [alex.id]
      })

    assert {:ok, %{outcome: "HIGH", result: result}} =
             DecisionIntelligence.resolve(ctx.id, alex.id, %{"expected_context_revision" => 1})

    assert result.mode == "high"
  end

  test "does not invent LOW without grounded soft conflict", %{alex: alex} do
    {:ok, %{context: ctx}} =
      DecisionIntelligence.create_context(alex.id, %{
        "intent" => "date_ideas",
        "participant_ids" => [alex.id],
        "budget_context" => %{"max" => 90},
        "preference_context" => %{"vibe" => "quiet"},
        "time_context" => %{"preference" => "flexible"}
      })

    assert {:ok, %{outcome: "HIGH", result: result}} =
             DecisionIntelligence.resolve(ctx.id, alex.id, %{"expected_context_revision" => 1})

    assert result.mode == "high"
  end
end

