defmodule OpalCore.SocialFlow.AttentionProactiveTest do
  use ExUnit.Case, async: true

  alias OpalCore.SocialFlow.AttentionAuthority, as: AA

  # --- Laws ---

  test "laws: attention does not mutate truth or spam" do
    refute AA.attention_can_mutate_plan?()
    refute AA.attention_can_mutate_memory?()
    refute AA.attention_can_execute_provider_action?()
    refute AA.new_recommendation_default_notification?()
    refute AA.high_recommendation_score_causes_notification?()
    refute AA.memory_alone_causes_proactive_alert?()
    refute AA.recommendation_without_need_interrupts?()
    refute AA.memory_without_context_interrupts?()
    refute AA.unread_equals_attention?()
    refute AA.mute_hides_canonical_state?()
    refute AA.open_thread_duplicate_banner?()
    refute AA.same_event_notification_fanout_spam?()
    refute AA.resolved_attention_stays_actionable?()
    refute AA.private_signal_attention_leak?()
    refute AA.feature_direct_banner_bypass?()
    refute AA.fake_leave_by_attention?()
    refute AA.proposer_gets_approval_prompt?()
  end

  # --- 1 ONLY ONE PERSON NEEDS TO ANSWER ---

  test "ATTENTION_DECISION_REQUIRED / RECIPIENT_ROUTING — proposer ambient, responder attention" do
    event = %{
      "source_type" => "proposal",
      "source_id" => "p-8pm",
      "conversation_id" => "conv-1",
      "proposer_user_id" => "walk-a",
      "required_responder_ids" => ["walk-b"],
      "participants" => ["walk-a", "walk-b"],
      "waiting_on_display" => "Walk B",
      "copy" => "8:00 PM instead?"
    }

    d = AA.decide(event)
    by = Map.new(d["items"], &{&1["recipient_user_id"], &1})

    assert by["walk-b"]["level"] == "attention"
    assert by["walk-b"]["action_required"] == true
    assert by["walk-b"]["reason"] == "decision_required"

    assert by["walk-a"]["level"] == "ambient"
    assert by["walk-a"]["action_required"] == false
    assert by["walk-a"]["copy"] =~ "Waiting on"
    refute by["walk-a"]["copy"] =~ "approve"
    refute AA.proposer_gets_approval_prompt?()
  end

  # --- 2 ACTIVE THREAD ---

  test "ATTENTION_ACTIVE_THREAD_SUPPRESSION — no redundant banner" do
    event = %{
      "source_type" => "proposal",
      "source_id" => "p-8pm",
      "conversation_id" => "conv-1",
      "proposer_user_id" => "walk-a",
      "required_responder_ids" => ["walk-b"],
      "participants" => ["walk-a", "walk-b"],
      "active_conversation_viewer_id" => "walk-b"
    }

    item = AA.decide_for(event, "walk-b")["focus"]
    assert item["level"] == "attention"
    assert item["surface"] == "inline"
    assert item["interrupt"] == false
    assert item["active_thread_duplicate_attention"] == false
    refute AA.open_thread_duplicate_banner?()
  end

  # --- 3 BACKGROUND ---

  test "BACKGROUND_ATTENTION — elsewhere in Opal gets interruptive surface" do
    event = %{
      "source_type" => "proposal",
      "source_id" => "p-8pm",
      "conversation_id" => "conv-1",
      "proposer_user_id" => "walk-a",
      "required_responder_ids" => ["walk-b"],
      "participants" => ["walk-a", "walk-b"],
      "active_conversation_viewer_id" => "walk-b-elsewhere-home"
    }

    item = AA.decide_for(event, "walk-b")["focus"]
    assert item["level"] == "attention"
    assert item["surface"] == "banner"
    assert item["interrupt"] == true
  end

  # --- 4 MUTE ---

  test "ATTENTION_MUTED_CONVERSATION — mute suppresses interruption, not truth" do
    event = %{
      "source_type" => "proposal",
      "source_id" => "p-8pm",
      "conversation_id" => "conv-1",
      "proposer_user_id" => "walk-a",
      "required_responder_ids" => ["walk-b"],
      "participants" => ["walk-a", "walk-b"],
      "muted_for" => ["walk-b"]
    }

    item = AA.decide_for(event, "walk-b")["focus"]
    assert item["level"] == "attention"
    assert item["mute_suppresses_interruption"] == true
    assert item["mute_suppresses_truth"] == false
    assert item["canonical_state_preserved"] == true
    assert item["interrupt"] == false
    refute AA.mute_hides_canonical_state?()
  end

  # --- 5 PROVIDER FAILURE ---

  test "ATTENTION_PROVIDER_FAILURE — required actor attention, observer ambient" do
    event = %{
      "source_type" => "booking_failed",
      "outcome_type" => "booking_failed",
      "source_id" => "exec-1",
      "conversation_id" => "conv-1",
      "authorization_required_user_id" => "walk-a",
      "required_responder_ids" => ["walk-a"],
      "participants" => ["walk-a", "walk-b"],
      "copy" => "Booking couldn't be completed"
    }

    d = AA.decide(event)
    by = Map.new(d["items"], &{&1["recipient_user_id"], &1})

    assert by["walk-a"]["level"] == "attention"
    assert by["walk-a"]["action_required"] == true
    assert by["walk-b"]["level"] == "ambient"
    assert d["mutates_plan"] == false
  end

  # --- 6 CONFIRMATION ---

  test "ATTENTION_PROVIDER_CONFIRMATION — brief ambient, no action badge" do
    event = %{
      "source_type" => "booking_confirmed",
      "source_id" => "exec-2",
      "conversation_id" => "conv-1",
      "participants" => ["walk-a", "walk-b"],
      "copy" => "Reservation confirmed"
    }

    d = AA.decide(event)
    assert Enum.all?(d["items"], &(&1["level"] == "ambient"))
    assert d["actionable_count"] == 0
    assert AA.actionable_badge_count(d, "walk-a") == 0
  end

  # --- 7 SUPERSESSION ---

  test "ATTENTION_SUPERSESSION — P1 no longer actionable after P2" do
    p1 = %{
      "source_type" => "proposal",
      "source_id" => "p1",
      "proposal_key" => "8pm",
      "conversation_id" => "conv-1",
      "proposer_user_id" => "walk-a",
      "required_responder_ids" => ["walk-b"],
      "participants" => ["walk-a", "walk-b"]
    }

    p2 = %{
      "source_type" => "proposal",
      "source_id" => "p2",
      "proposal_key" => "830pm",
      "conversation_id" => "conv-1",
      "proposer_user_id" => "walk-a",
      "required_responder_ids" => ["walk-b"],
      "participants" => ["walk-a", "walk-b"],
      "copy" => "8:30 PM instead?"
    }

    prior = AA.decide(p1)
    result = AA.supersede(prior, p2)

    assert result["prior_actionable"] == false
    assert result["prior"]["actionable_count"] == 0
    assert result["attention_supersession"] == true

    b_item = Enum.find(result["current"]["items"], &(&1["recipient_user_id"] == "walk-b"))
    assert b_item["level"] == "attention"
    assert b_item["dedupe_key"] != prior["dedupe_key"] or b_item["source_id"] == "p2"
  end

  # --- 8 OPEN QUESTION ---

  test "ATTENTION_OPEN_QUESTION — no owner ambient; assigned elevates owner only" do
    open = %{
      "source_type" => "open_question",
      "source_id" => "q-hotel",
      "conversation_id" => "conv-1",
      "participants" => ["walk-a", "walk-b"],
      "copy" => "What hotel are we staying at?"
    }

    d1 = AA.decide(open)
    assert Enum.all?(d1["items"], &(&1["level"] == "ambient"))
    assert d1["actionable_count"] == 0

    assigned = Map.put(open, "question_owner_user_id", "walk-b")
    d2 = AA.decide(assigned)
    by = Map.new(d2["items"], &{&1["recipient_user_id"], &1})

    assert by["walk-b"]["level"] == "attention"
    assert by["walk-a"]["level"] == "ambient"
  end

  # --- 9 COMMITMENT ---

  test "ATTENTION_COMMITMENT — no immediate disruptive banner" do
    event = %{
      "source_type" => "commitment",
      "source_id" => "c-tickets",
      "conversation_id" => "conv-1",
      "commitment_owner_user_id" => "walk-a",
      "participants" => ["walk-a", "walk-b"],
      "commitment_due_soon" => false,
      "copy" => "I'll bring the tickets."
    }

    d = AA.decide(event)
    a = Enum.find(d["items"], &(&1["recipient_user_id"] == "walk-a"))
    assert a["level"] == "silent"
    assert a["interrupt"] == false
  end

  # --- 10 RECOMMENDATION SILENCE ---

  test "ATTENTION_RECOMMENDATION_SILENCE — strong score without need stays silent" do
    event = %{
      "source_type" => "recommendation",
      "source_id" => "rec-1",
      "recommendation_score" => 0.99,
      "recommendation_need_open" => false,
      "participants" => ["walk-a", "walk-b"]
    }

    d = AA.decide(event)
    assert Enum.all?(d["items"], &(&1["level"] == "silent"))
    refute AA.recommendation_without_need_interrupts?()
    refute AA.high_recommendation_score_causes_notification?()
  end

  # --- 11 MEMORY SILENCE ---

  test "ATTENTION_MEMORY_SILENCE — durable pref alone does not interrupt" do
    event = %{
      "source_type" => "memory",
      "source_id" => "mem-jazz",
      "participants" => ["walk-a"],
      "private_memory_only" => true
    }

    d = AA.decide(event)
    assert Enum.all?(d["items"], &(&1["level"] == "silent"))
    refute AA.memory_without_context_interrupts?()
    refute AA.memory_alone_causes_proactive_alert?()
  end

  # --- 12 DEDUPE ---

  test "ATTENTION_DEDUPE — one identity across reconcile/outcome/graph" do
    base = %{
      "source_type" => "booking_failed",
      "outcome_type" => "booking_failed",
      "source_id" => "exec-9",
      "conversation_id" => "conv-1",
      "dedupe_key" => "fail:exec-9",
      "required_responder_ids" => ["walk-a"],
      "participants" => ["walk-a", "walk-b"]
    }

    events = [
      Map.put(base, "channel", "provider_reconcile"),
      Map.put(base, "channel", "outcome_event"),
      Map.put(base, "channel", "graph_refresh")
    ]

    coalesced = AA.coalesce(events)
    assert length(coalesced) == 1
    assert hd(coalesced)["fanout"] == 1
    assert hd(coalesced)["source_count"] == 3
    refute AA.same_event_notification_fanout_spam?()
  end

  # --- 13 RESOLUTION ---

  test "ATTENTION_RESOLUTION — accept clears actionable badge" do
    event = %{
      "source_type" => "proposal",
      "source_id" => "p-8pm",
      "conversation_id" => "conv-1",
      "proposer_user_id" => "walk-a",
      "required_responder_ids" => ["walk-b"],
      "participants" => ["walk-a", "walk-b"]
    }

    prior = AA.decide(event)
    assert AA.actionable_badge_count(prior, "walk-b") == 1

    resolved = AA.resolve(prior, %{"copy" => "Accepted"})
    assert resolved["actionable_count"] == 0
    assert AA.actionable_badge_count(resolved, "walk-b") == 0
    refute AA.resolved_attention_stays_actionable?()
  end

  # --- 14 GROUP ROUTING ---

  test "ATTENTION_GROUP_ROUTING — only organizer gets authorization prompt" do
    event = %{
      "source_type" => "booking_authorization",
      "source_id" => "auth-1",
      "conversation_id" => "conv-g",
      "organizer_user_id" => "org-1",
      "authorization_required_user_id" => "org-1",
      "required_responder_ids" => ["org-1"],
      "participants" => ["org-1", "p2", "p3", "p4"],
      "copy" => "Needs your approval"
    }

    d = AA.decide(event)
    by = Map.new(d["items"], &{&1["recipient_user_id"], &1})

    assert by["org-1"]["level"] == "attention"
    assert by["org-1"]["action_required"] == true

    for uid <- ["p2", "p3", "p4"] do
      refute by[uid]["level"] == "attention"
      refute by[uid]["action_required"]
    end
  end

  # --- Privacy ---

  test "PRIVATE_SIGNAL_ATTENTION_LEAK stays zero" do
    event = %{
      "source_type" => "plan_update",
      "source_id" => "u1",
      "participants" => ["walk-a", "walk-b"],
      "copy" => "Because Walk B privately prefers quiet places",
      "forbidden_copy_fragments" => ["privately prefers"],
      "private_signal_in_shared_copy" => true
    }

    d = AA.decide(event)

    for item <- d["items"] do
      refute item["copy"] =~ ~r/privately prefers/i
      assert item["privacy_safe"] == true
      assert item["private_signal_attention_leak"] == false
    end

    refute AA.private_signal_attention_leak?()
  end

  test "waiting_on before due stays silent for owner" do
    event = %{
      "source_type" => "waiting_on",
      "source_id" => "w1",
      "waiting_on_user_id" => "walk-b",
      "waiting_due" => false,
      "participants" => ["walk-a", "walk-b"],
      "waiting_on_display" => "Walk B"
    }

    d = AA.decide(event)
    by = Map.new(d["items"], &{&1["recipient_user_id"], &1})
    assert by["walk-b"]["level"] == "silent"
    assert by["walk-a"]["level"] == "ambient"
  end

  test "legacy evaluate still works (regression smoke)" do
    d = AA.evaluate(%{recompute_only: true, next_gap: "place"})
    assert d.class == "silence"
  end
end
