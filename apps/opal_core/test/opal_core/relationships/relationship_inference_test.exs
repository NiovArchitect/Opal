defmodule OpalCore.Relationships.RelationshipInferenceTest do
  @moduledoc """
  Paste I Phase 0.4 — noiseless inference + Access A8 confirm path.
  """
  use OpalCore.DataCase, async: false

  import OpalCore.MultiuserHarness

  alias OpalCore.Intelligence.{AttentionBudget, ProductSurface}
  alias OpalCore.Relationships
  alias OpalCore.Relationships.{Behavior, Inference}

  @moduletag :relationship_matrix

  describe "0.4 noiseless inference" do
    test "weak signals → :insufficient; no provisional; no nag prompt" do
      owner = account!(%{display_name: "Owner"})
      contact = account!(%{display_name: "Maya"})

      assert Relationships.get_type(owner.id, contact.id) == nil

      assert {:ok, :insufficient} =
               Inference.maybe_infer(owner.id, contact.id, %{
                 "message_count" => 2,
                 "span_days" => 1,
                 "weekend_plans" => 0
               })

      assert Relationships.get_type(owner.id, contact.id) == nil
      assert Inference.peek_prompt(owner.id) == nil
      assert Inference.pending_prompt(owner.id) == nil
    end

    test "strong 21-day signals → provisional close_friend; one-time prompt; never re-asked" do
      owner = account!(%{display_name: "Owner"})
      contact = account!(%{display_name: "Maya"})

      signals = Inference.simulate_weeks_signals(days: 21)
      assert {:ok, rel} = Inference.maybe_infer(owner.id, contact.id, signals)
      assert rel.type == "close_friend"
      assert rel.source == "provisional"
      assert rel.inference_status == "pending_confirm"

      peeked = Inference.peek_prompt(owner.id)
      assert peeked["provisional_type"] == "close_friend"
      assert peeked["prompt"] == "I think of Maya as a close friend — right?"

      shown = Inference.pending_prompt(owner.id)
      assert shown["prompt"] == "I think of Maya as a close friend — right?"
      assert shown["one_time"] == true
      assert "confirm" in shown["choices"]

      # Second delivery → nil (never re-asked)
      assert Inference.pending_prompt(owner.id) == nil
      assert Inference.peek_prompt(owner.id) == nil
    end

    test "dismiss → second infer does not re-prompt" do
      owner = account!(%{display_name: "Owner"})
      contact = account!(%{display_name: "Maya"})

      signals = Inference.simulate_weeks_signals(days: 21)
      assert {:ok, _} = Inference.maybe_infer(owner.id, contact.id, signals)
      assert {:ok, _} = Inference.dismiss(owner.id, contact.id)

      assert {:ok, :dismissed, _} = Inference.maybe_infer(owner.id, contact.id, signals)
      assert Inference.peek_prompt(owner.id) == nil
      assert Inference.pending_prompt(owner.id) == nil
    end

    test "correct to friend → type/bounds friend; plan_proposal_copy propagates in session" do
      owner = account!(%{display_name: "Owner"})
      contact = account!(%{display_name: "Maya"})

      signals = Inference.simulate_weeks_signals(days: 21)
      assert {:ok, _} = Inference.maybe_infer(owner.id, contact.id, signals)
      assert {:ok, updated} = Inference.correct(owner.id, contact.id, "friend")

      assert updated.type == "friend"
      assert updated.source == "confirmed"
      assert Relationships.get_type(owner.id, contact.id) == "friend"

      bounds = Behavior.resolved_bounds(owner.id, contact.id)
      assert bounds["planning"] == "planned"
      assert bounds["style"] == "casual"

      copy = Behavior.plan_proposal_copy("friend", who: "Maya", when: "Friday")
      assert copy.tone == "casual"
      assert copy.spontaneity == "planned"
      assert copy.copy == Behavior.plan_proposal_copy(
               Relationships.get_type(owner.id, contact.id),
               who: "Maya",
               when: "Friday"
             ).copy
    end

    test "add-person path — contacts exist without type; no onboarding inference ask" do
      owner = account!(%{display_name: "Owner"})
      contact = account!(%{display_name: "NewPerson"})

      # set_type is NOT required to have a contact account
      assert Relationships.get_type(owner.id, contact.id) == nil
      assert Inference.peek_prompt(owner.id) == nil
      assert Inference.pending_prompt(owner.id) == nil

      {:ok, transparency} = ProductSurface.memory_transparency(owner.id)
      assert transparency["has_inference_prompt"] == false
      assert transparency["inference_prompt"] == nil
    end
  end

  describe "A8 infer → one-time prompt → confirm" do
    test "3 weeks signals → close_friend provisional → confirm → source confirmed" do
      owner = account!(%{display_name: "Owner", timezone: "Asia/Tokyo", maturity: "established"})
      contact = account!(%{display_name: "Sam"})

      signals = Inference.simulate_weeks_signals(days: 21)
      assert {:ok, rel} = Inference.maybe_infer(owner.id, contact.id, signals)
      assert rel.type == "close_friend"
      assert rel.source == "provisional"

      prompt = Inference.pending_prompt(owner.id)
      assert prompt["prompt"] =~ "close friend"
      assert prompt["one_time"] == true

      assert {:ok, confirmed} = Inference.confirm(owner.id, contact.id)
      assert confirmed.source == "confirmed"
      assert confirmed.inference_status == "confirmed"
      assert Relationships.get_type(owner.id, contact.id) == "close_friend"

      # AttentionBudget: acquaintance denied; close_friend granted
      assert {:denied, :relationship_bounds} =
               AttentionBudget.request_slot(owner.id, "nudge", "nudge", %{
                 person_id: contact.id,
                 topic: "acq_nudge",
                 provenance: "stated",
                 relationship_type: "acquaintance"
               })

      assert {:granted, _} =
               AttentionBudget.request_slot(owner.id, "nudge", "nudge", %{
                 person_id: contact.id,
                 topic: "cf_nudge",
                 provenance: "stated",
                 relationship_type: "close_friend"
               })
    end
  end
end
