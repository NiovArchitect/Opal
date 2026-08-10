defmodule OpalCore.SocialFlow.GroupRecoveryTest do
  use ExUnit.Case, async: true

  alias OpalCore.SocialFlow.Ambient.{
    ExecutionReadiness,
    FailureRadius,
    GroupRecovery,
    RecoveryPreservation
  }

  test "failure radius: restaurant fill only invalidates venue/provider" do
    assert {:ok, r} = FailureRadius.apply("restaurant_unavailable")
    assert "time" in r["still_true"]
    assert "participants" in r["still_true"]
    refute "time" in r["invalidated"]
    assert r["smallest_change_needed"] == "different_place_same_constraints"
    refute r["restart_social_alignment"]
  end

  test "failure radius: plan cancel is full reset" do
    assert {:ok, r} = FailureRadius.apply("plan_cancelled")
    assert r["full_plan_reset"]
    assert r["restart_social_alignment"]
  end

  test "optional drop continues quietly with high preservation" do
    people = [
      %{user_id: "1", role: "optional", response: "im_in"},
      %{user_id: "2", role: "optional", response: "im_in"},
      %{user_id: "3", role: "optional", response: "im_in"},
      %{user_id: "4", role: "optional", response: "im_in"}
    ]

    assert {:ok, d} =
             GroupRecovery.late_drop(%{
               participants: people,
               leaver_id: "4",
               purpose: "friends",
               min_viable: 3
             })

    assert d["viable"]
    refute d["was_required"]
    assert d["smallest"]["kind"] == "nothing"
    assert d["visible_opal_moments"] == 0
    refute d["shame_holdout"]
    assert d["re_enter_future_ok"]
  end

  test "required drop yields one minimum question, not full restart" do
    people = [
      %{user_id: "host", role: "required", response: "im_in"},
      %{user_id: "2", role: "optional", response: "im_in"}
    ]

    assert {:ok, d} =
             GroupRecovery.late_drop(%{
               participants: people,
               leaver_id: "host",
               purpose: "friends",
               min_viable: 2
             })

    assert d["was_required"]
    refute d["restart_entire_plan"]
    assert d["smallest"]["kind"] == "minimum_question"
    assert d["visible_opal_moments"] == 1
  end

  test "late join with capacity integrates without restarting time/place" do
    assert {:ok, j} =
             GroupRecovery.late_join(%{
               joiner_id: "5",
               in_count: 3,
               capacity: 5,
               set: true
             })

    assert j["integrated"]
    refute j["restarted_time"]
    refute j["restarted_place"]
    refute j["restarted_willingness"]
  end

  test "late join over capacity: plan intact, no silent exclusion" do
    assert {:ok, j} =
             GroupRecovery.late_join(%{
               joiner_id: "5",
               in_count: 4,
               capacity: 4,
               set: true
             })

    refute j["integrated"]
    refute j["silent_exclusion"]
    assert j["plan_intact"]
    assert j["smallest"]["kind"] == "minimum_question"
  end

  test "venue recovery preserves time/area/people/budget dimensions" do
    assert {:ok, r} =
             GroupRecovery.recover(%{
               failure_kind: "restaurant_unavailable",
               set: true,
               plan_version: 2,
               resolved_dimensions:
                 ~w(time place_area cuisine_or_category participants quiet budget),
               alternate_venues: [
                 %{
                   "venue_id" => "bistro",
                   "label" => "7:30",
                   "slots" => [%{"id" => "s1", "label" => "7:30"}]
                 }
               ]
             })

    assert "time" in r["still_true"]
    assert "participants" in r["still_true"]
    assert r["preservation"]["preserved_count"] >= 5
    refute r["restarted_social_alignment"]
    assert r["visible_opal_moments"] <= 1
    assert r["smallest"]["kind"] in ["opportunity", "minimum_question", "nothing"]
    refute r["smallest"]["feed"]
  end

  test "stale Book it suppressed when slot expires" do
    assert {:ok, e} =
             ExecutionReadiness.assess(%{
               set: true,
               provider_checked: true,
               provider_available: true,
               slot_expired: true,
               place_selected: true,
               time_known: true,
               party_size: 4
             })

    refute e["may_prompt_book"]
    assert e["stale_book_cta_suppressed"]
    assert e["social_truth_intact"]
  end

  test "execution readiness requires prereqs" do
    assert {:ok, e} =
             ExecutionReadiness.assess(%{
               set: true,
               provider_checked: true,
               provider_available: true,
               place_selected: false
             })

    # place missing → not execution_ready
    refute e["may_prompt_book"]
  end

  test "how much survives one bad event — restaurant fill metric" do
    assert {:ok, m} = RecoveryPreservation.restaurant_filled_example()
    assert m["preservation_ratio"] >= 0.8
    refute m["restarted_who"]
    refute m["user_visible_percent"]
  end

  test "recovery from_failure composes FailureRadius" do
    assert {:ok, m} = RecoveryPreservation.from_failure("optional_participant_drop")
    assert m["preserved_count"] >= 1
  end
end
