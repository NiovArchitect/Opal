defmodule OpalCore.SocialFlow.SocialRealityTest do
  use ExUnit.Case, async: true

  alias OpalCore.SocialFlow.SocialReality
  alias OpalCore.SocialFlow.PlaceGap
  alias OpalCore.SocialFlow.SharedRealityPresentation

  defp msgs(bodies) do
    Enum.with_index(bodies, fn body, i ->
      %{
        body: body,
        sender_user_id: if(rem(i, 2) == 0, do: "a", else: "b"),
        id: "m#{i}",
        server_seq: i
      }
    end)
  end

  test "time then place: dinner + thursday + 6:30 agreement → next_gap place" do
    m =
      msgs([
        "Dinner Thursday?",
        "Yeah after 6.",
        "6:30?",
        "Perfect."
      ])

    r = SocialReality.project(m, :set)
    assert r["when"]
    assert r["what"]
    assert r["next_gap"] == "place"
    assert hd(r["next_actions"])["share_kind"] == "place"
    refute hd(r["next_actions"])["share_kind"] == "time"
  end

  test "place then time: venue first → next_gap time" do
    gap =
      SocialReality.next_meaningful_gap(
        ["when"],
        %{
          "when_known" => false,
          "where_known" => true,
          "what_known" => true,
          "where_matters" => true
        },
        :still_open
      )

    assert gap == :time
  end

  test "fixed event: concert with when/where → not find-a-time" do
    m = msgs(["Concert Saturday 8 PM at The Rady Shell", "I'm in"])
    r = SocialReality.project(m, :set, fixed_event?: true)
    # Fixed provider event: no Find-a-time owner; gap may be none/participants/activity
    refute r["primary_action"] && r["primary_action"]["label"] == "Find a time" and
             r["next_gap"] == "time" and is_nil(r["when"])
    assert r["next_gap"] in ["none", "participants", "place", "time", "activity"]
  end

  test "remote activity: FaceTime does not force place" do
    gap =
      SocialReality.next_meaningful_gap([], %{
        "when_known" => true,
        "where_known" => false,
        "what_known" => true,
        "where_matters" => false
      })

    assert gap == :none
  end

  test "partial preservation: changing time keeps place" do
    base = %{
      "what" => "Dinner",
      "when" => "Thursday · 6:30 PM",
      "where" => "Juniper & Ivy",
      "speaker_count" => 2,
      "dimensions" => %{"remote" => false}
    }

    updated = SocialReality.apply_dimension_update(base, %{"when" => "Friday · 7 PM"})
    assert updated["where"] == "Juniper & Ivy"
    assert updated["when"] =~ "Friday"
    assert updated["what"] == "Dinner"
  end

  test "reversal: clear when reopens time gap, keeps place" do
    base = %{
      "what" => "Dinner",
      "when" => "Thursday · 6:30 PM",
      "where" => "Juniper & Ivy",
      "speaker_count" => 2,
      "dimensions" => %{"remote" => false, "where_matters" => true}
    }

    updated = SocialReality.apply_dimension_update(base, %{"when" => :clear, "stage" => "still_open"})
    assert updated["where"] == "Juniper & Ivy"
    assert updated["next_gap"] == "time"
  end

  test "PlaceGap.next_gap is order-agnostic for place after time" do
    assert {:gap, :place} =
             PlaceGap.next_gap(%{
               "time_aligned" => true,
               "place_known" => false,
               "what" => "Dinner",
               "where_matters" => true
             })
  end

  test "presentation includes next_gap and place actions" do
    m = msgs(["Dinner Thursday at 6:30", "Perfect"])
    r = SharedRealityPresentation.from_messages(m, :set)
    assert Map.has_key?(r, "next_gap")
    assert Map.has_key?(r, "next_actions")
  end

  test "private leave-around requires travel truth" do
    assert {:error, :insufficient_travel_truth} =
             SocialReality.private_leave_around(nil, 18)

    start = ~U[2026-08-13 19:30:00.000000Z]
    assert {:ok, leave} = SocialReality.private_leave_around(start, 18)
    assert leave["private"] == true
    assert leave["origin_exposed"] == false
    assert leave["distance_label"] == "18 min from you"
    assert leave["leave_around_label"] =~ "Leave around"
  end

  test "place share assert rejects time windows" do
    assert_raise RuntimeError, ~r/PLACE_SHARE/, fn ->
      SocialReality.assert_share_kind!(
        %{"share_kind" => "place", "windows" => [%{"start" => "x"}]},
        "place"
      )
    end

    assert :ok =
             SocialReality.assert_share_kind!(
               %{"share_kind" => "place", "place_name" => "Juniper"},
               "place"
             )
  end
end
