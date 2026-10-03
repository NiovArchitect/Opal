defmodule OpalCore.SocialFlow.AttentionCenterTest do
  use OpalCore.DataCase, async: false

  alias OpalCore.SocialFlow.AttentionAuthority, as: AA
  alias OpalCore.SocialFlow.AttentionCenter, as: AC
  alias OpalCore.SocialFlow.Clock
  alias OpalCore.SocialFlow.TemporalFollowThrough, as: TFT

  setup do
    Clock.unfreeze()
    :ok
  end

  # --- Laws ---

  test "laws: bell is a projection of AttentionAuthority" do
    refute AC.bell_bypasses_attention_authority?()
    refute AC.bell_bypasses_mute?()
    assert AC.bell_badge_equals_actionable_count?()
    assert AC.chat_unread_and_attention_badge_separate?()
    refute AC.bell_duplicates_all_messages?()
    refute AC.bell_recommendation_spam?()
    refute AC.bell_memory_spam?()
    refute AC.bell_private_signal_leak?()
    refute AC.bell_creates_second_action_path?()
    refute AC.attention_deep_link_dead_end?()
    refute AC.action_completed_badge_stale?()
  end

  # --- 1 ACTIONABLE COUNT / NEEDS YOU ---

  test "ATTENTION_CENTER_ACTIONABLE_COUNT — Walk B decision_required badge 1" do
    event = proposal_8pm()
    assert {:ok, _} = AC.ingest(event)

    feed_b = AC.feed("walk-b", refresh_temporal: false)
    assert feed_b["actionable_count"] == 1
    assert length(feed_b["needs_you"]) == 1

    row = hd(feed_b["needs_you"])
    assert row["title"] == "Fort Oak"
    assert row["copy"] =~ "8:00 PM" or row["detail"] =~ "8:00 PM" or row["copy"] =~ "Needs your"
    assert row["action_required"] == true
    assert row["badge_eligible"] == true
    assert row["deep_link"]["kind"] == "proposal"
    assert row["deep_link"]["id"] == "conv-fort-oak"
    assert row["deep_link"]["focus"] == "change_proposal"
    assert row["deep_link"]["target_surface"] == "alignment_proposal"
    assert row["deep_link"]["conversation_id"] == "conv-fort-oak"

    # Same event must not also appear in Waiting/Updated for responder
    refute Enum.any?(feed_b["waiting"], &(&1["dedupe_key"] == row["dedupe_key"]))
    refute Enum.any?(feed_b["updated"], &(&1["dedupe_key"] == row["dedupe_key"]))

    assert AC.actionable_count("walk-b") == 1
  end

  # --- 2 PROPOSER WAITING ---

  test "ATTENTION_CENTER_PROPOSER_WAITING — Walk A badge 0, Waiting on Walk B" do
    assert {:ok, _} = AC.ingest(proposal_8pm())

    feed_a = AC.feed("walk-a", refresh_temporal: false)
    assert feed_a["actionable_count"] == 0
    assert feed_a["needs_you"] == []
    assert length(feed_a["waiting"]) == 1

    row = hd(feed_a["waiting"])
    assert row["title"] == "Fort Oak"
    assert row["copy"] =~ "Waiting on Walk B"
    refute row["copy"] =~ ~r/approve/i
    refute row["action_required"]
  end

  # --- 3 MIXED SECTIONS ---

  test "ATTENTION_CENTER_SECTIONS — badge counts Needs You only" do
    assert {:ok, _} = AC.ingest(proposal_8pm())

    assert {:ok, _} =
             AC.ingest(%{
               "source_type" => "waiting_on",
               "source_id" => "w-friday",
               "conversation_id" => "conv-2",
               "title" => "Friday",
               "waiting_on_user_id" => "walk-c",
               "participants" => ["walk-b", "walk-c"],
               "waiting_on_display" => "Walk C",
               "copy" => "Waiting on Walk C"
             })

    assert {:ok, _} =
             AC.ingest(%{
               "source_type" => "open_question",
               "source_id" => "q-tickets",
               "conversation_id" => "conv-3",
               "title" => "Tickets",
               "participants" => ["walk-b"],
               "copy" => "Still open"
             })

    assert {:ok, _} =
             AC.ingest(%{
               "source_type" => "booking_confirmed",
               "source_id" => "exec-ok",
               "conversation_id" => "conv-4",
               "title" => "Hotel",
               "participants" => ["walk-b"],
               "copy" => "Reservation confirmed"
             })

    assert {:ok, _} =
             AC.ingest(%{
               "source_type" => "plan_update",
               "source_id" => "pu-1",
               "conversation_id" => "conv-5",
               "title" => "Fort Oak",
               "participants" => ["walk-b"],
               "copy" => "Now set for 8:00 PM"
             })

    assert {:ok, _} =
             AC.ingest(%{
               "source_type" => "plan_update",
               "source_id" => "pu-2",
               "conversation_id" => "conv-6",
               "title" => "Walk B",
               "participants" => ["walk-b"],
               "copy" => "Walk B confirmed Friday"
             })

    feed = AC.feed("walk-b", refresh_temporal: false)
    assert feed["actionable_count"] == 1
    assert length(feed["needs_you"]) == 1
    assert length(feed["waiting"]) >= 1
    assert length(feed["updated"]) >= 1
    # Badge is not sum of all rows
    total =
      length(feed["needs_you"]) + length(feed["waiting"]) + length(feed["updated"])

    assert total >= 3
    assert feed["actionable_count"] < total
  end

  # --- 4 RESOLUTION ---

  test "ATTENTION_CENTER_RESOLUTION — accept clears badge immediately" do
    assert {:ok, _} = AC.ingest(proposal_8pm())
    assert AC.actionable_count("walk-b") == 1

    key = AA.decide(proposal_8pm())["dedupe_key"]
    assert {:ok, _} = AC.resolve("walk-b", key)

    feed = AC.feed("walk-b", refresh_temporal: false)
    assert feed["actionable_count"] == 0
    assert feed["needs_you"] == []
    assert AC.actionable_count("walk-b") == 0
    refute AC.action_completed_badge_stale?()
  end

  test "VIEW_DOES_NOT_EQUAL_RESOLVE — mark_seen keeps badge while action unresolved" do
    assert {:ok, _} = AC.ingest(proposal_8pm())
    assert AC.actionable_count("walk-b") == 1

    assert {:ok, _} = AC.mark_seen("walk-b")
    feed = AC.feed("walk-b", refresh_temporal: false)
    assert feed["actionable_count"] == 1
    assert length(feed["needs_you"]) == 1
    assert hd(feed["needs_you"])["seen"] == true
    assert hd(feed["needs_you"])["badge_eligible"] == true
    assert feed["opening_bell_clears_unresolved_actionable_count"] == false
  end

  # --- 5 SUPERSESSION ---

  test "ATTENTION_CENTER_SUPERSESSION — only 8:30 remains actionable" do
    p1 = proposal_8pm()
    assert {:ok, _} = AC.ingest(p1)
    key1 = AA.decide(p1)["dedupe_key"]

    p2 = %{
      "source_type" => "proposal",
      "source_id" => "p-830",
      "proposal_key" => "830pm",
      "conversation_id" => "conv-fort-oak",
      "title" => "Fort Oak",
      "proposer_user_id" => "walk-a",
      "required_responder_ids" => ["walk-b"],
      "participants" => ["walk-a", "walk-b"],
      "waiting_on_display" => "Walk B",
      "copy" => "8:30 PM instead?"
    }

    assert {:ok, _} = AC.supersede(key1, p2)

    feed = AC.feed("walk-b", refresh_temporal: false)
    assert feed["actionable_count"] == 1
    assert length(feed["needs_you"]) == 1
    row = hd(feed["needs_you"])
    assert row["copy"] =~ "8:30" or row["detail"] =~ "8:30"
    refute Enum.any?(feed["needs_you"], &(&1["copy"] =~ "8:00 PM instead"))
  end

  # --- 6 MUTE ---

  test "ATTENTION_CENTER_MUTE — muted suppresses badge, no bypass" do
    event = Map.put(proposal_8pm(), "muted_for", ["walk-b"])
    assert {:ok, _} = AC.ingest(event)

    feed = AC.feed("walk-b", refresh_temporal: false)
    assert feed["actionable_count"] == 0
    assert AC.actionable_count("walk-b") == 0
    refute AC.bell_bypasses_mute?()

    # Canonical row may still exist without badge pressure
    case feed["needs_you"] do
      [row] ->
        assert row["badge_eligible"] == false
        assert row["muted"] == true

      [] ->
        :ok
    end
  end

  # --- 7 PROVIDER FAILURE ---

  test "ATTENTION_CENTER_PROVIDER_FAILURE — actor Needs You, observer ambient" do
    event = %{
      "source_type" => "booking_failed",
      "outcome_type" => "booking_failed",
      "source_id" => "exec-fail",
      "conversation_id" => "conv-1",
      "title" => "Hotel",
      "authorization_required_user_id" => "walk-a",
      "required_responder_ids" => ["walk-a"],
      "participants" => ["walk-a", "walk-b"],
      "copy" => "Booking couldn't be completed"
    }

    assert {:ok, _} = AC.ingest(event)

    a = AC.feed("walk-a", refresh_temporal: false)
    b = AC.feed("walk-b", refresh_temporal: false)

    assert a["actionable_count"] == 1
    assert hd(a["needs_you"])["copy"] =~ "Booking couldn't"
    assert b["actionable_count"] == 0
    refute Enum.any?(b["needs_you"], & &1["action_required"])
  end

  # --- 8 PROVIDER CONFIRMATION ---

  test "ATTENTION_CENTER_PROVIDER_CONFIRMATION — Updated, badge 0" do
    event = %{
      "source_type" => "booking_confirmed",
      "source_id" => "exec-ok",
      "conversation_id" => "conv-1",
      "title" => "Hotel",
      "participants" => ["walk-a", "walk-b"],
      "copy" => "Reservation confirmed"
    }

    assert {:ok, _} = AC.ingest(event)
    feed = AC.feed("walk-a", refresh_temporal: false)

    assert feed["actionable_count"] == 0
    assert feed["needs_you"] == []
    assert length(feed["updated"]) == 1
    assert hd(feed["updated"])["detail"] =~ "Reservation confirmed"
    assert hd(feed["updated"])["detail"] =~ "✓"
  end

  # --- 9 OPEN QUESTION ---

  test "ATTENTION_CENTER_OPEN_QUESTION — unowned waiting; assigned elevates owner" do
    open = %{
      "source_type" => "open_question",
      "source_id" => "q-hotel",
      "conversation_id" => "conv-1",
      "title" => "Hotel",
      "participants" => ["walk-a", "walk-b"],
      "copy" => "What hotel?"
    }

    assert {:ok, _} = AC.ingest(open)
    assert AC.feed("walk-b", refresh_temporal: false)["actionable_count"] == 0

    assigned = Map.put(open, "question_owner_user_id", "walk-b")
    # New source id so dedupe differs
    assigned = Map.put(assigned, "source_id", "q-hotel-owned")
    assert {:ok, _} = AC.ingest(assigned)

    feed = AC.feed("walk-b", refresh_temporal: false)
    assert feed["actionable_count"] == 1
    assert hd(feed["needs_you"])["action_required"] == true
  end

  # --- 10 TEMPORAL MATURITY ---

  test "ATTENTION_CENTER_TEMPORAL_MATURITY — no badge before due; elevates at due" do
    Clock.freeze(~U[2026-09-24 20:00:00.000000Z])

    assert {:ok, _, _} =
             TFT.register(%{
               "kind" => "waiting_on",
               "source_id" => "wo-mature",
               "owner_user_id" => "walk-b",
               "responsibility_user_id" => "walk-b",
               "participant_ids" => ["walk-a", "walk-b"],
               "timezone" => "America/Los_Angeles",
               "precision" => "date_only",
               "semantic_deadline_date" => ~D[2026-09-25],
               "idempotency_key" => "ac-mature-1",
               "metadata" => %{"owner_display" => "Walk B", "copy" => "I'll know Friday.", "title" => "Hotel"}
             })

    before = AC.feed("walk-b", refresh_temporal: true)
    assert before["actionable_count"] == 0

    # Friday afternoon LA daypart
    Clock.freeze(~U[2026-09-25 22:00:00.000000Z])
    due = AC.feed("walk-b", refresh_temporal: true)
    assert due["actionable_count"] >= 1
    assert Enum.any?(due["needs_you"], &(&1["action_required"] == true))
  end

  # --- 11 NOISE FILTER ---

  test "ATTENTION_CENTER_NOISE_FILTER — messages/recs/memory do not badge" do
    assert {:ok, _} = AC.ingest(proposal_8pm())

    for i <- 1..3 do
      assert {:ok, _} =
               AC.ingest(%{
                 "source_type" => "recommendation",
                 "source_id" => "rec-#{i}",
                 "conversation_id" => "conv-noise",
                 "participants" => ["walk-b"],
                 "recommendation_score" => 0.99,
                 "copy" => "We found a place you may like!"
               })
    end

    for i <- 1..2 do
      assert {:ok, _} =
               AC.ingest(%{
                 "source_type" => "memory",
                 "source_id" => "mem-#{i}",
                 "conversation_id" => "conv-noise",
                 "participants" => ["walk-b"],
                 "copy" => "Opal learned that you like jazz."
               })
    end

    feed = AC.feed("walk-b", refresh_temporal: false)
    assert feed["actionable_count"] == 1
    refute Enum.any?(feed["needs_you"] ++ feed["waiting"] ++ feed["updated"], fn r ->
             (r["copy"] || "") =~ "like jazz" or (r["copy"] || "") =~ "may like"
           end)

    refute AC.bell_recommendation_spam?()
    refute AC.bell_memory_spam?()
    refute AC.bell_duplicates_all_messages?()
  end

  # --- 12 GROUP ROUTING ---

  test "ATTENTION_CENTER_GROUP_ROUTING — only required responder badges" do
    event = %{
      "source_type" => "proposal",
      "source_id" => "p-group",
      "proposal_key" => "8pm-g",
      "conversation_id" => "conv-g",
      "title" => "Fort Oak",
      "proposer_user_id" => "walk-a",
      "organizer_user_id" => "walk-a",
      "required_responder_ids" => ["walk-b"],
      "participants" => ["walk-a", "walk-b", "walk-c", "walk-d"],
      "waiting_on_display" => "Walk B",
      "copy" => "8:00 PM instead?"
    }

    assert {:ok, _} = AC.ingest(event)

    assert AC.actionable_count("walk-b") == 1
    assert AC.actionable_count("walk-a") == 0
    assert AC.actionable_count("walk-c") == 0
    assert AC.actionable_count("walk-d") == 0
  end

  test "ATTENTION_CENTER empty Needs You omits zero chrome; calm copy when waiting remains" do
    assert {:ok, _} =
             AC.ingest(%{
               "source_type" => "booking_confirmed",
               "source_id" => "only-updated",
               "conversation_id" => "conv-u",
               "title" => "Hotel",
               "participants" => ["walk-a"],
               "copy" => "Reservation confirmed"
             })

    feed = AC.feed("walk-a", refresh_temporal: false)
    assert feed["needs_you"] == []
    assert feed["empty_needs_you_copy"] == "Nothing needs your attention right now."
    assert feed["actionable_count"] == 0
    # Not "all caught up" while Updated still matters
    assert feed["empty_copy"] == nil or feed["updated"] != []
  end

  test "private signal copy never leaks into shared bell rows" do
    event = %{
      "source_type" => "proposal",
      "source_id" => "p-priv",
      "conversation_id" => "conv-1",
      "title" => "Fort Oak",
      "proposer_user_id" => "walk-a",
      "required_responder_ids" => ["walk-b"],
      "participants" => ["walk-a", "walk-b"],
      "copy" => "Walk B privately prefers earlier",
      "forbidden_copy_fragments" => ["privately prefers"],
      "private_signal_in_shared_copy" => true
    }

    assert {:ok, _} = AC.ingest(event)
    feed = AC.feed("walk-b", refresh_temporal: false)
    row = hd(feed["needs_you"])
    refute row["copy"] =~ "privately"
    refute row["detail"] =~ "privately"
    assert row["privacy_safe"] == true
    refute AC.bell_private_signal_leak?()
  end

  defp proposal_8pm do
    %{
      "source_type" => "proposal",
      "source_id" => "p-8pm",
      "proposal_key" => "8pm",
      "conversation_id" => "conv-fort-oak",
      "title" => "Fort Oak",
      "plan_name" => "Fort Oak",
      "proposer_user_id" => "walk-a",
      "required_responder_ids" => ["walk-b"],
      "participants" => ["walk-a", "walk-b"],
      "waiting_on_display" => "Walk B",
      "copy" => "8:00 PM instead?"
    }
  end
end
