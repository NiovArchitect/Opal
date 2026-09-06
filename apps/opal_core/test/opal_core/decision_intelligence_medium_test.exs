defmodule OpalCore.DecisionIntelligenceMediumTest do
  use OpalCore.DataCase, async: true

  alias OpalCore.Accounts.User
  alias OpalCore.DecisionIntelligence
  alias OpalCore.Events.EventOutbox
  alias OpalCore.Repo

  setup do
    alex =
      %User{}
      |> User.changeset(%{handle: "med-alex-#{System.unique_integer([:positive])}", display_name: "Alex"})
      |> Repo.insert!()

    %{alex: alex}
  end

  defp medium_context(alex) do
    # Start unspecified so High cannot win; then set intent → Medium one question
    {:ok, %{context: c0}} =
      DecisionIntelligence.create_context(alex.id, %{
        "intent" => "unspecified",
        "scope_type" => "solo",
        "participant_ids" => [alex.id]
      })

    {:ok, %{context: ctx}} =
      DecisionIntelligence.apply_correction(c0.id, alex.id, %{
        "operation" => "set_intent",
        "expected_revision" => 1,
        "intent" => "date_ideas"
      })

    assert {:ok, %{outcome: "MEDIUM", result: q}} =
             DecisionIntelligence.resolve(ctx.id, alex.id, %{
               "expected_context_revision" => ctx.revision
             })

    {ctx, q}
  end

  test "resolve asks one human question when High not earned", %{alex: alex} do
    {_ctx, result} = medium_context(alex)

    assert result.mode == "medium"
    assert result.confidence_class == "medium"
    assert result.question_status == "open"
    assert result.status == "awaiting_answer"
    assert is_binary(result.question_id)
    assert result.question_dimension in ~w(TIME_PRECISION VIBE BUDGET)
    assert result.explanation_shareable["figma_authority"] == "988:2"

    assert Repo.exists?(
             from o in EventOutbox,
               where: o.aggregate_id == ^result.decision_id and o.event_type == "decision.question_asked"
           )
  end

  test "answering question mutates same decision and can earn High", %{alex: alex} do
    {_ctx, q} = medium_context(alex)

    choice =
      case q.question_dimension do
        "VIBE" -> "quiet"
        "TIME_PRECISION" -> "flexible"
        "BUDGET" -> "spend"
        _ -> "flexible"
      end

    assert {:ok, answered} =
             DecisionIntelligence.answer_question(q.id, alex.id, %{"choice_id" => choice})

    assert answered.context.revision == q.based_on_context_revision + 1
    assert answered.question_result.question_status == "answered"

    assert Repo.exists?(
             from o in EventOutbox,
               where: o.aggregate_id == ^q.decision_id and o.event_type == "decision.question_answered"
           )

    case answered do
      %{outcome: "HIGH_AFTER_ANSWER", result: high} ->
        assert high.mode == "high"
        assert high.truth_state == "provisional"

      %{outcome: "ANSWERED_NOT_YET_HIGH", context: c} ->
        {:ok, %{context: c2}} =
          DecisionIntelligence.apply_correction(c.id, alex.id, %{
            "operation" => "set_vibe",
            "expected_revision" => c.revision,
            "vibe" => "quiet"
          })

        {:ok, %{context: c3}} =
          DecisionIntelligence.apply_correction(c2.id, alex.id, %{
            "operation" => "set_budget",
            "expected_revision" => c2.revision,
            "budget_max" => 90
          })

        assert {:ok, %{outcome: "HIGH", result: high}} =
                 DecisionIntelligence.resolve_high(c3.id, alex.id, %{
                   "expected_context_revision" => c3.revision
                 })

        assert high.confidence_class == "high"

      other ->
        flunk("unexpected answer outcome: #{inspect(other)}")
    end
  end

  test "stale question cannot be answered after context moved", %{alex: alex} do
    {ctx, q} = medium_context(alex)

    assert {:ok, _} =
             DecisionIntelligence.apply_correction(ctx.id, alex.id, %{
               "operation" => "set_budget",
               "expected_revision" => ctx.revision,
               "budget_max" => 50
             })

    assert {:error, :stale_question, superseded} =
             DecisionIntelligence.answer_question(q.id, alex.id, %{"choice_id" => "quiet"})

    assert superseded.question_status == "superseded"

    assert Repo.exists?(
             from o in EventOutbox,
               where: o.aggregate_id == ^ctx.id and o.event_type == "decision.question_superseded"
           )
  end

  test "complete high context still resolves HIGH not MEDIUM", %{alex: alex} do
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
end
