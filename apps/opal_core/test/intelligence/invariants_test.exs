defmodule OpalCore.Intelligence.InvariantsTest do
  @moduledoc """
  Executable intelligence constitution invariants.

  These tests encode durable product law already present in SocialReality /
  PlaceGap / share contracts. New intelligence must keep them green unless an
  intentional SUPERSEDED ADR documents the change.

  See:
  - docs/intelligence/OPAL_INTELLIGENCE_CONSTITUTION.md
  - docs/intelligence/INTELLIGENCE_CAPABILITY_LEDGER.md
  - config/intelligence_manifest.json
  """
  use ExUnit.Case, async: true

  alias OpalCore.SocialFlow.PlaceGap
  alias OpalCore.SocialFlow.SocialReality

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

  # ---------------------------------------------------------------------------
  # INV-PRESERVE-DIM — INT-REALITY-001
  # Changing WHEN does not erase WHERE unless evidence invalidates WHERE
  # ---------------------------------------------------------------------------

  describe "INV-PRESERVE-DIM" do
    test "changing when preserves what and where" do
      base = %{
        "what" => "Dinner",
        "when" => "Thursday · 6:30 PM",
        "where" => "Juniper & Ivy",
        "speaker_count" => 2,
        "dimensions" => %{"remote" => false, "where_matters" => true}
      }

      updated = SocialReality.apply_dimension_update(base, %{"when" => "Friday · 7 PM"})
      assert updated["what"] == "Dinner"
      assert updated["where"] == "Juniper & Ivy"
      assert updated["when"] =~ "Friday"
    end

    test "clearing when reopens time gap and keeps place (EP-007)" do
      base = %{
        "what" => "Dinner",
        "when" => "Thursday · 6:30 PM",
        "where" => "Juniper & Ivy",
        "speaker_count" => 2,
        "dimensions" => %{"remote" => false, "where_matters" => true}
      }

      updated =
        SocialReality.apply_dimension_update(base, %{"when" => :clear, "stage" => "still_open"})

      assert updated["where"] == "Juniper & Ivy"
      assert updated["what"] == "Dinner"
      assert updated["next_gap"] == "time"
    end

    test "changing where preserves when and what" do
      base = %{
        "what" => "Dinner",
        "when" => "Thursday · 6:30 PM",
        "where" => "Juniper & Ivy",
        "speaker_count" => 2,
        "dimensions" => %{"remote" => false, "where_matters" => true}
      }

      updated = SocialReality.apply_dimension_update(base, %{"where" => "Harbor Table"})
      assert updated["when"] == "Thursday · 6:30 PM"
      assert updated["what"] == "Dinner"
      assert updated["where"] == "Harbor Table"
    end
  end

  # ---------------------------------------------------------------------------
  # INV-NEXT-GAP-ONE — INT-JOURNEY-001 / INT-JOURNEY-002
  # Exactly one meaningful next_gap; order-agnostic time↔place
  # ---------------------------------------------------------------------------

  describe "INV-NEXT-GAP-ONE" do
    test "time then place: dinner + thursday agreement → next_gap place (EP-002)" do
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
      assert is_binary(r["next_gap"])
      assert hd(r["next_actions"])["share_kind"] == "place"
      refute hd(r["next_actions"])["share_kind"] == "time"
    end

    test "place then time: when missing with where known → next_gap time (EP-003)" do
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

    test "PlaceGap is order-agnostic for place after time" do
      assert {:gap, :place} =
               PlaceGap.next_gap(%{
                 "time_aligned" => true,
                 "place_known" => false,
                 "what" => "Dinner",
                 "where_matters" => true
               })
    end

    test "commutativity: same final facts converge on place gap regardless of order flags" do
      # Semantic commutativity of settled WHAT+WHEN with open WHERE
      via_time =
        SocialReality.next_meaningful_gap(
          ["where"],
          %{
            "when_known" => true,
            "where_known" => false,
            "what_known" => true,
            "where_matters" => true
          },
          :set
        )

      via_place_known_when =
        SocialReality.next_meaningful_gap(
          ["where"],
          %{
            "what_known" => true,
            "when_known" => true,
            "where_known" => false,
            "where_matters" => true
          },
          :set
        )

      assert via_time == :place
      assert via_place_known_when == :place
    end
  end

  # ---------------------------------------------------------------------------
  # INV-REMOTE-NO-PLACE — INT-JOURNEY-003
  # ---------------------------------------------------------------------------

  describe "INV-REMOTE-NO-PLACE" do
    test "remote activity does not force place gap (EP-004)" do
      gap =
        SocialReality.next_meaningful_gap([], %{
          "when_known" => true,
          "where_known" => false,
          "what_known" => true,
          "where_matters" => false
        })

      assert gap == :none
    end

    test "FaceTime messages do not demand Choose a place as primary when remote" do
      m = msgs(["FaceTime Thursday 7?", "Yes!"])
      r = SocialReality.project(m, :set, remote?: true)
      refute r["next_gap"] == "place"
      refute r["primary_action"] && r["primary_action"]["label"] == "Choose a place"
    end
  end

  # ---------------------------------------------------------------------------
  # INV-FIXED-EVENT — INT-JOURNEY-004
  # ---------------------------------------------------------------------------

  describe "INV-FIXED-EVENT" do
    test "fixed concert does not own Find a time when when is present (EP-005)" do
      m = msgs(["Concert Saturday 8 PM at The Rady Shell", "I'm in"])
      r = SocialReality.project(m, :set, fixed_event?: true)

      refute r["primary_action"] && r["primary_action"]["label"] == "Find a time" and
               r["next_gap"] == "time" and is_nil(r["when"])

      assert r["next_gap"] in ["none", "participants", "place", "time", "activity"]
    end
  end

  # ---------------------------------------------------------------------------
  # INV-PLACE-SHARE-KIND — INT-PLACE-002
  # Share place cannot serialize a time-only payload
  # ---------------------------------------------------------------------------

  describe "INV-PLACE-SHARE-KIND" do
    test "place share rejects time windows" do
      assert_raise RuntimeError, ~r/PLACE_SHARE/, fn ->
        SocialReality.assert_share_kind!(
          %{"share_kind" => "place", "windows" => [%{"start" => "x"}]},
          "place"
        )
      end
    end

    test "place share accepts place_name payload" do
      assert :ok =
               SocialReality.assert_share_kind!(
                 %{"share_kind" => "place", "place_name" => "Juniper"},
                 "place"
               )
    end
  end

  # ---------------------------------------------------------------------------
  # INV-LEAVE-TRAVEL-TRUTH — leave-around never fabricates origin
  # ---------------------------------------------------------------------------

  describe "INV-LEAVE-TRAVEL-TRUTH" do
    test "without start_at travel truth, private leave-around errors" do
      assert {:error, :insufficient_travel_truth} =
               SocialReality.private_leave_around(nil, 18)
    end

    test "with start_at + minutes, leave-around is private and origin not exposed" do
      start = ~U[2026-08-13 19:30:00.000000Z]
      assert {:ok, leave} = SocialReality.private_leave_around(start, 18)
      assert leave["private"] == true
      assert leave["origin_exposed"] == false
      assert leave["distance_label"] == "18 min from you"
      assert leave["leave_around_label"] =~ "Leave around"
    end
  end

  # ---------------------------------------------------------------------------
  # INV-AUTHORIZES-SET-FALSE — SocialReality is projection, not Set authority
  # ---------------------------------------------------------------------------

  describe "INV-AUTHORIZES-SET-FALSE" do
    test "project never authorizes Set store writes" do
      m = msgs(["Dinner Thursday at 6:30", "Perfect"])
      r = SocialReality.project(m, :set)
      assert r["authorizes_set"] == false
      assert r["workflow_owner"] == "shared_reality"
    end
  end

  # ---------------------------------------------------------------------------
  # INV-PRIMARY-ACTION-MATCHES-GAP — presentation/action contract
  # ---------------------------------------------------------------------------

  describe "INV-PRIMARY-ACTION-MATCHES-GAP" do
    test "primary action share_kind aligns with next_gap when place" do
      m = msgs(["Dinner Thursday?", "Yeah after 6.", "6:30?", "Perfect."])
      r = SocialReality.project(m, :set)
      assert r["next_gap"] == "place"
      assert r["primary_action"]["share_kind"] == "place"
      assert r["primary_action"]["label"] == "Choose a place"
    end

    test "action_label never returns raw enum for place" do
      assert SocialReality.action_label(:place) == "Choose a place"
      assert SocialReality.action_label(:time) == "Find a time"
      refute SocialReality.action_label(:place) == "place"
    end
  end
end
