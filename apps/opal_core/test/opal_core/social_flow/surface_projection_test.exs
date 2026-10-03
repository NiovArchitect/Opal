defmodule OpalCore.SocialFlow.SurfaceProjectionTest do
  use ExUnit.Case, async: true

  alias OpalCore.SocialFlow.SurfaceProjection, as: SP

  # --- Laws ---

  test "laws: all A8 zero predicates are false" do
    refute SP.multiple_canonical_action_implementations?()
    refute SP.active_context_duplicate_action?()
    refute SP.proposer_cross_surface_action_cta?()
    refute SP.downstream_action_competes_with_unsettled_upstream?()
    refute SP.recommendation_cross_surface_spam?()
    refute SP.every_attention_item_appears_on_home?()
    refute SP.home_bypasses_mute_attention?()
    refute SP.banner_while_canonical_action_visible?()
    refute SP.dismiss_banner_resolves_action?()
  end

  # --- TIME_PROPOSAL_PENDING / RESPONDER ---

  test "responder 8pm: one prominent action, thread owns CTA, home none, banner suppress when active" do
    facts = %{
      "source_type" => "proposal",
      "source_id" => "p-8pm",
      "attention_id" => "att-8pm",
      "recipient_user_id" => "walk-b",
      "role" => "required_responder",
      "conversation_id" => "conv-1",
      "plan_id" => "plan-1",
      "proposal_id" => "p-8pm",
      "change_proposal_value" => "8:00 PM",
      "current_plan_when" => "7:30 PM",
      "active_conversation_viewer_id" => "walk-b"
    }

    d = SP.decide(facts)

    assert d["prominent_action_count"] == 1
    assert d["proposer_approval_cta_count"] == 0
    assert d["primary_surface"] == "thread"
    assert d["projections"]["thread"] == "action"
    assert d["projections"]["attention"] == "review_link"
    assert d["projections"]["graph_detail"] == "pending_status"
    assert d["projections"]["chats"] == "compact_consequence"
    assert d["projections"]["home"] == "none"
    assert d["projections"]["banner"] == "suppress"
    assert d["active_context"] == true
    assert d["active_context_duplicate_action"] == false
    assert d["banner_while_canonical_action_visible"] == false
    assert d["canonical_action_target"]["surface"] == "thread"
    assert d["canonical_action_target"]["focus"] == "change_proposal"
    refute SP.banner_allowed?(d)
    assert SP.home_pending_treatment(d) == :none
    assert SP.compact_chats_label(facts) == "8:00 PM proposed"
    assert SP.graph_pending_status(facts) == "8:00 PM proposed"
    assert "thread" in SP.prominent_action_surfaces(d)
  end

  test "responder away from thread: banner allowed, home still none by default" do
    d =
      SP.decide(%{
        source_type: :proposal,
        role: :required_responder,
        recipient_user_id: "walk-b",
        conversation_id: "conv-1",
        change_proposal_value: "8:00 PM",
        active_conversation_viewer_id: "walk-b-on-home"
      })

    assert d["projections"]["thread"] == "action"
    assert d["projections"]["banner"] == "allow"
    assert d["projections"]["home"] == "none"
    assert SP.banner_allowed?(d)
  end

  test "responder with home_relevance gets quiet_status only" do
    d =
      SP.decide_for_role("proposal", "required_responder", %{
        "recipient_user_id" => "walk-b",
        "home_relevance" => true,
        "change_proposal_value" => "8:00 PM"
      })

    assert d["projections"]["home"] == "quiet_status"
    assert SP.home_pending_treatment(d) == :quiet_status
    refute SP.every_attention_item_appears_on_home?()
  end

  # --- TIME_PROPOSAL_PENDING / PROPOSER ---

  test "proposer: no approval CTA, waiting status, banner suppress" do
    d =
      SP.decide(%{
        "source_type" => "proposal",
        "role" => "proposer",
        "recipient_user_id" => "walk-a",
        "conversation_id" => "conv-1",
        "change_proposal_value" => "8:00 PM"
      })

    assert d["proposer_approval_cta_count"] == 0
    assert d["prominent_action_count"] == 0
    assert d["projections"]["thread"] == "waiting_status"
    assert d["projections"]["attention"] == "waiting"
    assert d["projections"]["graph_detail"] == "pending_status"
    assert d["projections"]["banner"] == "suppress"
    refute d["projections"]["thread"] == "action"
    refute SP.proposer_cross_surface_action_cta?()
  end

  # --- RESERVATION_AUTH blocked by pending proposal ---

  test "booking_auth with pending_change: downstream suppressed, prominent is not reservation" do
    facts = %{
      "source_type" => "booking_authorization",
      "role" => "authorizer",
      "recipient_user_id" => "walk-a",
      "conversation_id" => "conv-1",
      "pending_change" => true,
      "upstream_unsettled" => true,
      "blocked_by" => "proposal",
      "change_proposal_value" => "8:00 PM"
    }

    assert SP.suppress_downstream?(facts)

    d = SP.decide(facts)

    assert "reservation_auth" in d["downstream_suppressed"]
    assert d["primary_surface"] == "thread"
    assert d["projections"]["graph_detail"] == "pending_status"
    assert d["canonical_action_target"]["focus"] == "change_proposal"
    refute SP.downstream_action_competes_with_unsettled_upstream?()
    assert d["projection_reason"] =~ "suppressed"
  end

  # --- MUTE ---

  test "mute: banner suppress, home not interruptive, truth still projects" do
    d =
      SP.decide(%{
        "source_type" => "proposal",
        "role" => "required_responder",
        "recipient_user_id" => "walk-b",
        "conversation_id" => "conv-1",
        "muted" => true,
        "change_proposal_value" => "8:00 PM",
        "home_relevance" => true
      })

    assert d["projections"]["banner"] == "suppress"
    assert d["projections"]["home"] == "none"
    assert d["projections"]["thread"] == "action"
    assert d["projections"]["graph_detail"] == "pending_status"
    assert d["projections"]["chats"] == "compact_consequence"
    assert d["home_bypasses_mute_attention"] == false
    assert "banner" in d["suppress_surfaces"]
    refute SP.home_bypasses_mute_attention?()
  end

  # --- ACTIVE CONTEXT ---

  test "active context: banner suppress, thread still may show action" do
    d =
      SP.decide(%{
        "source_type" => "proposal",
        "role" => "required_responder",
        "recipient_user_id" => "walk-b",
        "active_conversation_viewer_id" => "walk-b",
        "conversation_id" => "conv-1"
      })

    assert d["active_context"] == true
    assert d["projections"]["banner"] == "suppress"
    assert d["projections"]["thread"] == "action"
    assert d["active_context_duplicate_action"] == false
    refute SP.active_context_duplicate_action?()
    refute SP.banner_while_canonical_action_visible?()
  end

  # --- RECOMMENDATION ---

  test "recommendation: no cross-surface spam" do
    d =
      SP.decide(%{
        "source_type" => "recommendation",
        "role" => "participant",
        "recipient_user_id" => "walk-a"
      })

    assert d["projections"]["thread"] == "none"
    assert d["projections"]["attention"] == "none"
    assert d["projections"]["home"] == "none"
    assert d["projections"]["banner"] == "suppress"
    assert d["projections"]["chats"] == "none"
    assert d["prominent_action_count"] == 0
    assert d["primary_surface"] == "none"
    assert d["recommendation_cross_surface_spam"] == false
    refute SP.recommendation_cross_surface_spam?()
  end

  # --- PROVIDER FAILURE ---

  test "provider failure: attention review, graph execution_failed, compact chats" do
    facts = %{
      "source_type" => "provider_failure",
      "role" => "authorizer",
      "recipient_user_id" => "walk-a",
      "conversation_id" => "conv-1"
    }

    d = SP.decide(facts)

    assert d["projections"]["attention"] == "review_link"
    assert d["projections"]["graph_detail"] == "execution_failed"
    assert d["projections"]["chats"] == "compact_consequence"
    assert d["projections"]["thread"] == "action"
    assert d["projections"]["home"] == "none"
    assert SP.compact_chats_label(facts) == "Booking issue"
    assert SP.graph_pending_status(facts) == "Booking failed"
  end

  # --- COMMITMENT ---

  test "commitment due: attention review, graph commitment_visible, home only if relevant" do
    d =
      SP.decide(%{
        "source_type" => "commitment",
        "role" => "commitment_owner",
        "recipient_user_id" => "walk-a",
        "plan_id" => "plan-1"
      })

    assert d["projections"]["attention"] == "review_link"
    assert d["projections"]["graph_detail"] == "commitment_visible"
    assert d["projections"]["home"] == "none"
    assert d["projections"]["thread"] == "none"

    relevant =
      SP.decide(%{
        "source_type" => "commitment_due",
        "role" => "commitment_owner",
        "recipient_user_id" => "walk-a",
        "home_relevance" => true
      })

    assert relevant["projections"]["home"] == "relevant"
    assert SP.home_pending_treatment(relevant) == :relevant
  end

  # --- helpers / wiring ---

  test "facts_from_attention_item merges AttentionAuthority item + extras" do
    item = %{
      "dedupe_key" => "proposal:p-8pm",
      "source_id" => "p-8pm",
      "source_type" => "proposal",
      "recipient_user_id" => "walk-b",
      "role" => "required_responder",
      "action_required" => true,
      "conversation_id" => "conv-1"
    }

    facts = SP.facts_from_attention_item(item, %{"change_proposal_value" => "8:00 PM"})
    d = SP.decide(facts)

    assert d["prominent_action_count"] == 1
    assert d["projections"]["attention"] == "review_link"
    assert facts["attention_carries_action"] == true
  end

  test "dismiss_banner_resolves_action remains false on decision maps" do
    d = SP.decide_for_role(:proposal, :required_responder, %{recipient_user_id: "walk-b"})
    assert d["dismiss_banner_resolves_action"] == false
    refute SP.dismiss_banner_resolves_action?()
  end
end
