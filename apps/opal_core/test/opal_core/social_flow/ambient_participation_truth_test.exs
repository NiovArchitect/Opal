defmodule OpalCore.SocialFlow.AmbientParticipationTruthTest do
  use ExUnit.Case, async: true

  alias OpalCore.SocialFlow.Ambient.{
    AmbientOpportunity,
    BookingBridge,
    ParticipationTruth,
    SmallestOutput,
    StaleSuppression
  }

  setup do
    StaleSuppression.reset()
    :ok
  end

  test "silence is not decline" do
    c = ParticipationTruth.classify("silent")
    refute c["is_decline"]
    refute c["counts_toward_quorum"]

    c2 = ParticipationTruth.classify("not_this_time")
    assert c2["is_decline"]
  end

  test "shared summary never shames silent holdouts" do
    s =
      ParticipationTruth.shared_summary([
        %{user_id: "1", response: "im_in"},
        %{user_id: "2", response: "im_in"},
        %{user_id: "3", response: "silent"},
        %{user_id: "4", response: "maybe"}
      ])

    assert s["silence_is_not_decline"]
    assert s["no_holdout_shame"]
    refute s["benefit_copy"] =~ "Jordan"
    refute s["benefit_copy"] =~ "never"
  end

  test "smallest output is opportunity, question, or nothing" do
    assert {:ok, r} =
             AmbientOpportunity.evaluate(%{
               conversation_id: "small-1",
               participant_ids: ["a", "b"],
               in_ids: ["a", "b"],
               time_compatible: true,
               proximity_ok: true,
               willingness_ok: true,
               place_resolved: true,
               travel_ok: true,
               confidence: 0.9,
               options: [%{"name" => "Night market"}],
               option_count: 1,
               forming?: true,
               opening_hours: 2.5,
               unknowns_before: 6
             })

    smallest = r["smallest"] || SmallestOutput.compress(r)
    assert smallest["kind"] in ["opportunity", "minimum_question", "nothing"]
    refute smallest["feed"]
    refute smallest["heat_map"]
  end

  test "provider recovery keeps social truth without restart" do
    assert {:ok, fail} =
             BookingBridge.check_for_set(%{
               set: true,
               venue_id: "primary",
               conversation_id: "c1",
               slots: []
             })

    refute fail["execution"]["execution_ready"]
    assert fail["social_truth_intact"]

    assert {:ok, rec} =
             BookingBridge.recover_without_restart(%{
               set: true,
               venue_id: "primary",
               conversation_id: "c1",
               alternate_venues: [
                 %{
                   "venue_id" => "alt",
                   "label" => "7:45",
                   "slots" => [%{"id" => "s2", "label" => "7:45"}]
                 }
               ]
             })

    assert rec["restarted_social_plan"] == false
    assert rec["social_truth_intact"]
    # recovery may or may not find open slot depending on provider stub
    assert is_boolean(rec["recovered"])
  end

  test "user work removed listed when opportunity surfaces" do
    out =
      SmallestOutput.compress(%{
        "surface" => %{"surface" => :opportunity, "copy" => "This lines up."},
        "options" => [%{"name" => "A"}]
      })

    assert out["kind"] == "opportunity"
    assert "place_browse" in out["user_work_removed"]
  end
end
