defmodule OpalCore.DecisionIntelligence.RecomposerTest do
  use OpalCore.DataCase, async: false

  alias OpalCore.Accounts.User
  alias OpalCore.DecisionIntelligence
  alias OpalCore.DecisionIntelligence.EventProcessingRecord
  alias OpalCore.DecisionIntelligence.Recomposer
  alias OpalCore.Events.Consumers.DecisionRecompositionConsumer
  alias OpalCore.Events.EventOutbox
  alias OpalCore.Repo

  setup do
    Application.put_env(:opal_core, :place_provider_mode, "synthetic")

    user =
      %User{}
      |> User.changeset(%{
        handle: "rc-#{System.unique_integer([:positive])}",
        display_name: "Recomp"
      })
      |> Repo.insert!()

    {:ok, %{context: ctx}} =
      DecisionIntelligence.create_context(user.id, %{
        "intent" => "date_ideas",
        "scope_type" => "solo",
        "budget_context" => %{"max" => 95},
        "preference_context" => %{"vibe" => "quiet"},
        "participant_ids" => [user.id],
        "invalidation_conditions" => [%{"type" => "provider_availability", "version" => 1}]
      })

    {:ok, %{outcome: "HIGH", result: result}} =
      DecisionIntelligence.resolve_high(ctx.id, user.id, %{"expected_context_revision" => 1})

    %{user: user, ctx: ctx, result: result}
  end

  test "non-material event → silence", %{result: result} do
    assert {:ok, out} =
             Recomposer.apply_world_event(%{
               "event_id" => "evt_silence_#{System.unique_integer([:positive])}",
               "event_type" => "evidence.refreshed",
               "entity_id" => result.answer_entity_id,
               "decision_id" => result.decision_id
             })

    assert out["action"] == "silence"
    row = hd(out["results"])
    assert row["action"] == "silence"
    assert row["materiality"] in ~w(NO_EFFECT EVIDENCE_REFRESH_ONLY)
  end

  test "provider_unavailable for selected place → recompute FAILURE", %{result: result} do
    assert {:ok, out} =
             Recomposer.apply_world_event(%{
               "event_id" => "evt_fail_#{System.unique_integer([:positive])}",
               "event_type" => "provider.unavailable",
               "entity_id" => result.answer_entity_id,
               "provider_place_id" => result.answer_entity_id,
               "decision_id" => result.decision_id,
               "entity_type" => "provider_place"
             })

    assert out["action"] == "recomputed"
    row = hd(out["results"])
    assert row["outcome"] == "FAILURE"
    assert row["materiality"] == "URGENT_INVALIDATION"

    assert Repo.exists?(
             from o in EventOutbox,
               where: o.aggregate_id == ^result.decision_id and o.event_type == "decision.recomputed"
           )
  end

  test "accepted result requires user confirmation", %{user: user, result: result} do
    {:ok, %{result: accepted}} =
      DecisionIntelligence.accept_result(result.id, user.id, %{"graph_id" => Ecto.UUID.generate()})

    assert {:ok, out} =
             Recomposer.apply_world_event(%{
               "event_id" => "evt_confirm_#{System.unique_integer([:positive])}",
               "event_type" => "provider.unavailable",
               "entity_id" => accepted.answer_entity_id,
               "decision_id" => accepted.decision_id
             })

    row = hd(out["results"])
    assert row["action"] == "user_confirmation_required"
    assert row["commitment"] == "USER_CONFIRMATION_REQUIRED"
  end

  test "consumer dedupes; poison path quarantines" do
    event_id = "evt_dedupe_#{System.unique_integer([:positive])}"

    envelope = %{
      "event_id" => event_id,
      "event_type" => "evidence.refreshed",
      "payload" => %{"entity_id" => "x"}
    }

    assert {:ok, _} = DecisionRecompositionConsumer.handle_envelope(envelope)
    assert {:ok, :duplicate} = DecisionRecompositionConsumer.handle_envelope(envelope)
    assert EventProcessingRecord.already_processed?(event_id)

    poison_id = "evt_poison_#{System.unique_integer([:positive])}"
    assert {:ok, _} = EventProcessingRecord.record_quarantine(poison_id, "simulated_poison")
    assert EventProcessingRecord.already_processed?(poison_id)
  end
end
