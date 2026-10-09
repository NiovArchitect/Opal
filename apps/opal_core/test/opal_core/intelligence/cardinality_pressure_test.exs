defmodule OpalCore.Intelligence.CardinalityPressureTest do
  @moduledoc """
  Paste I Cardinality Matrix addendum — N1–N4.

  Complements multiuser_pressure_test (30) with deliberate 1:1 / 1:many /
  many:many depth, batched AttentionBudget law, and BroadcastFraming.
  """
  use OpalCore.DataCase, async: false

  import OpalCore.MultiuserHarness

  alias OpalCore.Intelligence.{AttentionBudget, PromptBuilder}
  alias OpalCore.Messages
  alias OpalCore.Relationships.{Access, Behavior, BroadcastFraming}
  alias OpalCore.Repo
  alias OpalCore.SocialMemory
  alias OpalCore.SocialMemory.{PersonMemory, Routine}

  @moduletag :cardinality

  setup do
    prior = System.get_env("OPAL_MEMORY_ENABLED")
    System.put_env("OPAL_MEMORY_ENABLED", "true")

    on_exit(fn ->
      if prior,
        do: System.put_env("OPAL_MEMORY_ENABLED", prior),
        else: System.delete_env("OPAL_MEMORY_ENABLED")
    end)

    :ok
  end

  # ═══════════════════════════════════════════════════════════════════════════
  # N1 — 1:many typed broadcast (no cross-leak)
  # ═══════════════════════════════════════════════════════════════════════════

  @tag :cardinality
  test "N1 — hosting dinner Saturday: four typed cards; no sibling framing leak" do
    a = account!(%{display_name: "A", timezone: "Asia/Tokyo", maturity: "established"})
    spouse = account!(%{display_name: "Spouse"})
    close = account!(%{display_name: "CloseFriend"})
    biz = account!(%{display_name: "Colleague"})
    acq = account!(%{display_name: "Acquaintance"})

    set_type!(a.id, spouse.id, "spouse")
    set_type!(a.id, close.id, "close_friend")
    set_type!(a.id, biz.id, "business")
    set_type!(a.id, acq.id, "acquaintance")

    recipients = [
      %{user_id: spouse.id, display_name: spouse.display_name},
      %{user_id: close.id, display_name: close.display_name},
      %{user_id: biz.id, display_name: biz.display_name},
      %{user_id: acq.id, display_name: acq.display_name}
    ]

    batch =
      BroadcastFraming.frame_cards(a.id, "hosting dinner", recipients, when: "Saturday")

    assert batch["cardinality"] == "1:many"
    assert length(batch["cards"]) == 4

    spouse_card = BroadcastFraming.viewer_safe_card(batch, spouse.id)
    close_card = BroadcastFraming.viewer_safe_card(batch, close.id)
    biz_card = BroadcastFraming.viewer_safe_card(batch, biz.id)
    acq_card = BroadcastFraming.viewer_safe_card(batch, acq.id)

    # Warm/full, casual, formal/logistics, minimal
    assert spouse_card["tone"] == "warm"
    assert spouse_card["depth"] == :rich
    assert String.contains?(spouse_card["card"], "Hey love")

    assert close_card["tone"] == "casual"
    assert String.contains?(close_card["card"], "no pressure")

    assert biz_card["tone"] == "formal"
    assert String.contains?(biz_card["card"], "Logistics")

    assert acq_card["tone"] == "formal"
    assert acq_card["depth"] == :minimal
    assert String.contains?(acq_card["card"], "RSVP optional")

    # Behavior copy also diverges by type
    assert Behavior.plan_proposal_copy("spouse").copy !=
             Behavior.plan_proposal_copy("business").copy

    # Each viewer only sees own framing — no cross-leak of sibling cards
    for {viewer, card} <- [
          {spouse.id, spouse_card},
          {close.id, close_card},
          {biz.id, biz_card},
          {acq.id, acq_card}
        ] do
      refute BroadcastFraming.cross_leaks?(batch, viewer)
      assert card["visibility"] == "private_to_viewer"
      assert card["sibling_viewer_ids"] == []

      others =
        Enum.reject(batch["cards"], fn c -> c["viewer_id"] == viewer end)

      Enum.each(others, fn o ->
        refute String.contains?(card["card"], o["card"])
        # Spouse must never see business logistics; biz never sees warm love copy
        if card["tone"] == "warm" do
          refute String.contains?(card["card"], "Logistics")
        end

        if card["depth"] == :minimal do
          refute String.contains?(card["card"], "Hey love")
        end
      end)

      # Access plan facts for business strip personal WHY when relevant
      if card["relationship_type"] == "business" do
        depth = Access.nudge_depth("business")
        assert depth.depth == :minimal
      end
    end

    # Recipient PersonMemory must not hold other recipients' card copy
    assert_no_leak!(spouse.id, a.id, ["Logistics:", "RSVP optional"])
    assert_no_leak!(acq.id, a.id, ["Hey love"])
  end

  # ═══════════════════════════════════════════════════════════════════════════
  # N2 — 1:1 spouse depth vs group strip
  # ═══════════════════════════════════════════════════════════════════════════

  @tag :cardinality
  test "N2 — spouses 1:1 retain vibe/routines/rhythms/open loops; group strips" do
    a = account!(%{display_name: "Alex", timezone: "Asia/Tokyo", maturity: "established"})
    spouse = account!(%{display_name: "Jordan"})
    friend = account!(%{display_name: "Sam"})

    set_type!(a.id, spouse.id, "spouse")
    set_type!(spouse.id, a.id, "spouse")

    six_months_ago =
      DateTime.utc_now() |> DateTime.add(-180 * 86_400, :second) |> DateTime.truncate(:microsecond)

    {:ok, _pm} =
      %PersonMemory{}
      |> PersonMemory.changeset(%{
        account_id: a.id,
        person_id: spouse.id,
        relationship_type: "spouse",
        cadence_status: "stable",
        last_contact_at: six_months_ago,
        contact_frequency_days: 1.0,
        known_facts: %{
          "vibe" => %{
            "value" => "cozy-quiet-evenings",
            "provenance" => "stated",
            "confidence" => 0.95,
            "source_note" => "6-month history"
          },
          "rhythms" => %{
            "value" => "sunday-market-walk",
            "provenance" => "observed",
            "confidence" => 0.85
          },
          "anniversary" => %{
            "value" => "June 2",
            "provenance" => "stated",
            "confidence" => 0.99
          }
        },
        open_loops: [
          %{
            "id" => Ecto.UUID.generate(),
            "summary" => "still-owe-jordan-that-hike",
            "opened_at" => DateTime.to_iso8601(six_months_ago)
          }
        ],
        behavior_override: %{"warmth" => "high", "initiative" => "gentle"}
      })
      |> Repo.insert()

    {:ok, _} =
      %Routine{}
      |> Routine.changeset(%{
        account_id: a.id,
        person_id: spouse.id,
        activity: "morning coffee together",
        cadence: "weekly",
        day_of_week: 6,
        confidence: 0.85,
        detection_count: 12,
        last_occurrence_at: DateTime.utc_now() |> DateTime.truncate(:microsecond),
        provenance: "observed"
      })
      |> Repo.insert()

    one_to_one = Access.prompt_person_context(a.id, spouse.id, :one_to_one)
    assert one_to_one["includes_intimate_depth"] == true
    assert one_to_one["vibe"] == "cozy-quiet-evenings"
    assert one_to_one["rhythms"] == "sunday-market-walk"
    assert length(one_to_one["open_loops"]) == 1
    assert Enum.any?(one_to_one["routines"], &(&1.activity =~ "coffee"))

    group_ctx = Access.prompt_person_context(a.id, spouse.id, :group)
    assert group_ctx["includes_intimate_depth"] == false
    assert group_ctx["vibe"] == nil
    assert group_ctx["rhythms"] == nil
    assert group_ctx["open_loops"] == []
    assert group_ctx["routines"] == []

    # Dyad PromptBuilder keeps depth
    assert {:ok, %{conversation_id: dyad_id}} =
             Messages.ensure_direct_conversation(a.id, spouse.id)

    built_1_1 =
      PromptBuilder.build(SocialMemory.for_account(a.id), dyad_id, "how are we feeling about the weekend?", [])

    blob_1_1 = (built_1_1.what_you_know || "") <> inspect(built_1_1.recall)
    assert String.contains?(blob_1_1, "cozy-quiet-evenings") or
             String.contains?(blob_1_1, "still-owe-jordan-that-hike") or
             String.contains?(blob_1_1, "morning coffee") or
             String.contains?(blob_1_1, "rhythm:")

    # Group PromptBuilder strips intimacy
    assert {:ok, %{conversation_id: group_id}} =
             Messages.create_group_conversation(a.id, [spouse.id, friend.id], label: "Trip chat")

    built_group =
      PromptBuilder.build(SocialMemory.for_account(a.id), group_id, "what's the group vibe?", [])

    blob_g = (built_group.what_you_know || "") <> inspect(built_group.recall)
    refute String.contains?(blob_g, "cozy-quiet-evenings")
    refute String.contains?(blob_g, "still-owe-jordan-that-hike")
    refute String.contains?(blob_g, "sunday-market-walk")
    refute String.contains?(blob_g, "morning coffee")
  end

  # ═══════════════════════════════════════════════════════════════════════════
  # N3 — 1:many batch budget (1 unit for 3 person nudges)
  # ═══════════════════════════════════════════════════════════════════════════

  @tag :cardinality
  test "N3 — three typed nudges; grant_batch uses exactly one AttentionBudget unit" do
    owner = account!(%{display_name: "Owner", timezone: "Asia/Tokyo", maturity: "established"})
    mom = account!(%{display_name: "Mom"})
    colleague = account!(%{display_name: "Colleague"})
    old_friend = account!(%{display_name: "OldFriend"})

    set_type!(owner.id, mom.id, "family")
    set_type!(owner.id, colleague.id, "business")
    set_type!(owner.id, old_friend.id, "friend")

    mom_copy = Behavior.reminder_copy("family", "Mom's birthday this week")
    biz_copy = Behavior.reminder_copy("business", "Follow up on Q3 proposal")
    friend_copy = Behavior.reminder_copy("friend", "Catch up with OldFriend")

    assert mom_copy.tone == "warm"
    assert biz_copy.tone == "formal"
    assert friend_copy.tone == "casual"
    assert mom_copy.body != biz_copy.body
    assert biz_copy.body != friend_copy.body

    before = AttentionBudget.used_today(owner.id)

    items = [
      %{
        person_id: mom.id,
        topic: "mom_birthday",
        relationship_type: "family",
        priority: "proactive_thread",
        copy: mom_copy.body
      },
      %{
        person_id: colleague.id,
        topic: "business_followup",
        relationship_type: "business",
        priority: "proactive_thread",
        copy: biz_copy.body
      },
      %{
        person_id: old_friend.id,
        topic: "old_friend_casual",
        relationship_type: "friend",
        priority: "proactive_thread",
        copy: friend_copy.body
      }
    ]

    assert {:granted, result} =
             AttentionBudget.grant_batch(owner.id, "center_batch", items, topic: "nudge_batch_n3")

    assert result.batch_size == 3
    assert result.counts_against_budget == true
    assert is_binary(result.slot_id)

    after_used = AttentionBudget.used_today(owner.id)
    assert after_used == before + 1

    # time_critical still breaks through as separate non-counting grants
    assert {:granted, crit} =
             AttentionBudget.grant_batch(owner.id, "center_batch", [
               %{person_id: mom.id, topic: "urgent_flight", priority: "time_critical"}
             ])

    assert crit.batch_size == 0
    assert length(crit.breakthroughs) == 1
    assert AttentionBudget.used_today(owner.id) == after_used
  end

  # ═══════════════════════════════════════════════════════════════════════════
  # N4 — many:many group + private fork sealed from C
  # ═══════════════════════════════════════════════════════════════════════════

  @tag :cardinality
  test "N4 — group trip + A↔B private surprise fork; C sealed; group unchanged" do
    a = account!(%{display_name: "A", timezone: "Asia/Tokyo", maturity: "established"})
    b = account!(%{display_name: "B"})
    c = account!(%{display_name: "C"})

    set_type!(a.id, b.id, "close_friend")
    set_type!(a.id, c.id, "friend")
    set_type!(b.id, a.id, "close_friend")

    group =
      create_shared_plan!(a.id, [b.id, c.id], %{
        title: "Big Sur group trip",
        location: "Glen Oaks",
        time_label: "Oct 18–20",
        status: "agreed",
        alignment: %{"scope" => "social"}
      })

    group_title = group.title
    group_location = group.location
    group_time = group.time_label

    fork =
      create_shared_plan!(a.id, [b.id], %{
        title: "Surprise cake for C — keep secret",
        location: "private bakery run",
        time_label: "night before trip",
        status: "tentative",
        alignment: %{"scope" => "private_1_1", "private" => true, "surprise_for" => c.id}
      })

    # Participants see their plans
    assert {:ok, _} = plan_access(group.id, a.id)
    assert {:ok, _} = plan_access(group.id, b.id)
    assert {:ok, _} = plan_access(group.id, c.id)
    assert {:ok, _} = plan_access(fork.id, a.id)
    assert {:ok, _} = plan_access(fork.id, b.id)

    # C is not a participant — plan_access 404
    assert {:error, :not_found} = plan_access(fork.id, c.id)

    # Access privacy seal
    refute Access.can_see_plan?(c.id, fork)
    assert Access.plan_scope(fork) == :private_1_1
    assert Access.can_see_plan?(c.id, group)

    seed_private_memory!(a.id, b.id, %{
      "surprise_for_c" => "never-tell-c-about-cake",
      "fork_note" => "private-bakery-run-secret"
    })

    assert_no_leak!(c.id, a.id, [
      "Surprise cake for C",
      "never-tell-c-about-cake",
      "private-bakery-run-secret",
      "private bakery run"
    ])

    # Group plan unchanged
    reloaded = Repo.get!(OpalCore.SocialFlow.SharedPlan, group.id)
    assert reloaded.title == group_title
    assert reloaded.location == group_location
    assert reloaded.time_label == group_time
    assert reloaded.status == "agreed"

    # Prompt facts for C must not include fork
    facts = Access.prompt_plan_facts(c.id, a.id, [group, fork])
    refute Enum.any?(facts, &(&1["plan_id"] == fork.id))
    assert Enum.any?(facts, &(&1["plan_id"] == group.id))
  end
end
