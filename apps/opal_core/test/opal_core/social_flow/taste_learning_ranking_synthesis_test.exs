defmodule OpalCore.SocialFlow.TasteLearningRankingSynthesisTest do
  @moduledoc """
  Phase 5C — learning→ranking synthesis verify.

  Chain: agree plan with italian → MemoryIntelligence candidate →
  confidence ≥ 0.5 after repeat → RecommendationIntelligence ranks italian higher.
  """

  use OpalCore.DataCase, async: true

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Messaging.Conversation
  alias OpalCore.Messaging.ConversationMember
  alias OpalCore.Repo

  alias OpalCore.SocialFlow.{
    MemoryCandidate,
    MemoryIntelligence,
    PlanAgreementTasteBridge,
    PlanParticipant,
    RecommendationIntelligence,
    SharedPlan
  }

  @equal_pool [
    %{
      "id" => "italian_spot",
      "display_name" => "Italian Spot",
      "cuisine" => "italian",
      "quiet" => false,
      "score" => 4.0,
      "open_now" => true,
      "max_party" => 6
    },
    %{
      "id" => "thai_spot",
      "display_name" => "Thai Spot",
      "cuisine" => "thai",
      "quiet" => false,
      "score" => 4.0,
      "open_now" => true,
      "max_party" => 6
    }
  ]

  setup do
    user = insert_user!("p5c-learn")
    fresh = insert_user!("p5c-fresh")
    conv = solo_conv(user)
    {:ok, user: user, fresh: fresh, conv: conv}
  end

  test "full chain: agree → candidate summary/confidence → repeat → rank boost", %{
    user: user,
    fresh: fresh,
    conv: conv
  } do
    # --- 1. First agreement: candidate exists, conf below soft floor ---
    _plan1 = agree_italian!(conv, user, 1)

    cand1 = cuisine_candidate!(user.id)
    assert cand1.candidate_summary == "taste:cuisine:italian"
    assert cand1.memory_class == "preference"
    assert cand1.evidence_kind == "accepted_plan_pattern"
    assert cand1.status == "visible"
    assert cand1.confidence == 0.35
    assert cand1.observation_count == 1
    assert cand1.promoted_memory_id == nil

    # Below 0.5 → usable_soft_prefs ignores; no cuisine boost yet
    {:ok, early} = recommend_for(user.id)
    assert score(early, "italian_spot") == score(early, "thai_spot")

    # --- 2. Repeat ≥3: strengthen; auto-promote gate holds (recorded) ---
    _plan2 = agree_italian!(conv, user, 2)
    _plan3 = agree_italian!(conv, user, 3)

    cand3 = cuisine_candidate!(user.id)
    assert cand3.id == cand1.id
    assert cand3.observation_count == 3
    assert cand3.confidence == 0.59
    assert cand3.candidate_summary == "taste:cuisine:italian"
    # Gate data: accepted_plan_pattern does not auto-promote (5A auto_promote:false;
    # auto_promote? only for explicit_statement or repeated_behavior≥3).
    assert cand3.status == "visible"
    assert cand3.promoted_memory_id == nil
    refute cand3.status == "approved"

    ctx = MemoryIntelligence.candidates_for_context(user.id)

    assert Enum.any?(ctx, fn c ->
             c["candidate_summary"] == "taste:cuisine:italian" and c["confidence"] >= 0.5
           end)

    # --- 3. Rank: italian higher BECAUSE of learned preference ---
    {:ok, learned} = recommend_for(user.id)
    {:ok, control} = recommend_for(fresh.id)

    i_learned = score(learned, "italian_spot")
    t_learned = score(learned, "thai_spot")
    i_control = score(control, "italian_spot")
    t_control = score(control, "thai_spot")

    assert i_control == t_control
    assert i_learned > t_learned
    assert i_learned - t_learned > 0.1

    italian_row = Enum.find(learned["ranked"], &(&1["id"] == "italian_spot"))

    soft =
      Enum.filter(italian_row["signals"] || [], fn s ->
        s["type"] == "soft_preference" and s["strength"] == "medium"
      end)

    assert soft != []
    assert hd(learned["ranked"])["id"] == "italian_spot"

    # Fresh user: no soft_preference from A4 taste
    fresh_top_signals =
      (hd(control["ranked"])["signals"] || [])
      |> Enum.filter(&(&1["type"] == "soft_preference"))

    assert fresh_top_signals == []
  end

  test "control: fresh user gets no italian boost from empty A4 memory", %{fresh: fresh} do
    {:ok, result} = recommend_for(fresh.id)
    assert score(result, "italian_spot") == score(result, "thai_spot")
    assert score(result, "italian_spot") == 4.0
  end

  test "single agreement stays below soft-pref floor (no invent, no gate weaken)", %{
    user: user,
    conv: conv
  } do
    agree_italian!(conv, user, 1)
    cand = cuisine_candidate!(user.id)
    assert cand.confidence < 0.5

    {:ok, result} = recommend_for(user.id)
    assert score(result, "italian_spot") == score(result, "thai_spot")
  end

  test "record_acceptance still never writes durable memory" do
    receipt =
      RecommendationIntelligence.record_acceptance(%{"id" => "x", "name" => "Italian Spot"}, %{
        "user_id" => "walk-a"
      })

    assert receipt["durable_memory_written"] == false
  end

  # --- helpers ---

  defp recommend_for(viewer_id) do
    RecommendationIntelligence.recommend(%{
      "candidates" => @equal_pool,
      "viewer_user_id" => viewer_id,
      "load_a4_candidates" => true,
      "activity" => "dinner",
      "limit" => 5
    })
  end

  defp score(result, id) do
    row = Enum.find(result["ranked"], &(&1["id"] == id))
    assert row, "missing ranked row #{id}"
    row["score"]
  end

  defp cuisine_candidate!(owner_id) do
    from(c in MemoryCandidate,
      where: c.owner_user_id == ^owner_id,
      where: c.candidate_summary == "taste:cuisine:italian"
    )
    |> Repo.one!()
  end

  defp agree_italian!(conv, user, n) do
    plan =
      %SharedPlan{}
      |> SharedPlan.changeset(%{
        conversation_id: conv.id,
        title: "Italian dinner #{n}",
        status: "agreed",
        timezone: "UTC",
        location: "Juniper & Ivy",
        time_label: "Saturday · 7:30 PM",
        created_by_user_id: user.id,
        # Cuisine only — avoid vibe/area boosting both pool places equally
        alignment: %{"cuisine" => "italian"}
      })
      |> Repo.insert!()

    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    %PlanParticipant{}
    |> PlanParticipant.changeset(%{
      plan_id: plan.id,
      user_id: user.id,
      role: "lead",
      response_state: "accepted",
      responded_at: now,
      authority_source: "user_action"
    })
    |> Repo.insert!()

    summary = PlanAgreementTasteBridge.after_agreed(Repo.preload(plan, :participants))
    assert summary.submitted >= 1
    plan
  end

  defp insert_user!(prefix) do
    %User{}
    |> User.changeset(%{
      handle: "#{prefix}-#{System.unique_integer([:positive])}",
      display_name: prefix
    })
    |> Repo.insert!()
  end

  defp solo_conv(user) do
    conv =
      %Conversation{}
      |> Conversation.changeset(%{label: "p5c-#{System.unique_integer([:positive])}"})
      |> Repo.insert!()

    %ConversationMember{}
    |> ConversationMember.changeset(%{conversation_id: conv.id, user_id: user.id})
    |> Repo.insert!()

    conv
  end
end
