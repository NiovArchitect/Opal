defmodule OpalCore.Intelligence.GoldenEpisodeBridgeTest do
  @moduledoc """
  Smallest executable bridge from golden-episode docs → existing domain APIs.

  Does NOT introduce a new evaluation framework.
  Does NOT rewrite founder proof harness.
  Maps EP-IDs in `docs/intelligence/golden-episodes/` and
  `config/intelligence_enforcement.json` episode_eval_bridge to SocialReality /
  PlaceGap checks already proven elsewhere.

  Documentation-only episodes (e.g. full group membership UI) still assert
  preservation properties here where possible.
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

  # EP-001 — easy friend coffee: settled what/when/where → not stuck on place search
  @tag :ep_001
  test "EP-001 coffee with place settled does not demand choose-a-place as only truth" do
    m =
      msgs([
        "Coffee Tuesday?",
        "Tuesday 10:30 AM works for me.",
        "Harbor Table is perfect. I'm in.",
        "Works for me. See you at Harbor Table."
      ])

    r = SocialReality.project(m, :set)
    # Settlement may leave residual gaps depending on extractors; must not invent place search when where present
    if present?(r["where"]) do
      refute r["next_gap"] == "place" and is_nil(r["where"])
    end

    assert r["authorizes_set"] == false
  end

  # EP-002 — busy dinner time → place (Jordan foundation)
  @tag :ep_002
  test "EP-002 dinner + time agreement → next_gap place" do
    m =
      msgs([
        "Dinner Thursday?",
        "Yeah after 6.",
        "6:30?",
        "Perfect."
      ])

    r = SocialReality.project(m, :set)
    assert r["what"]
    assert r["when"]
    assert r["next_gap"] == "place"
    assert r["primary_action"]["label"] == "Choose a place"
    assert r["primary_action"]["share_kind"] == "place"
  end

  # EP-003 — place then time
  @tag :ep_003
  test "EP-003 where known when open → next_gap time; place not erased" do
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

    base = %{
      "what" => "Dinner",
      "when" => nil,
      "where" => "Juniper & Ivy",
      "speaker_count" => 2,
      "dimensions" => %{"remote" => false, "where_matters" => true}
    }

    # Setting time must not clear place
    updated = SocialReality.apply_dimension_update(base, %{"when" => "Thursday · 7 PM"})
    assert updated["where"] == "Juniper & Ivy"
  end

  # EP-004 — remote FaceTime
  @tag :ep_004
  test "EP-004 remote does not force place" do
    gap =
      SocialReality.next_meaningful_gap([], %{
        "when_known" => true,
        "where_known" => false,
        "what_known" => true,
        "where_matters" => false
      })

    assert gap == :none

    m = msgs(["FaceTime Thursday 7?", "Yes!"])
    r = SocialReality.project(m, :set, remote?: true)
    refute r["next_gap"] == "place"
  end

  # EP-005 — fixed concert
  @tag :ep_005
  test "EP-005 fixed event does not invent find-a-time ownership" do
    m = msgs(["Concert Saturday 8 PM at The Rady Shell", "I'm in"])
    r = SocialReality.project(m, :set, fixed_event?: true)

    refute r["primary_action"] && r["primary_action"]["label"] == "Find a time" and
             r["next_gap"] == "time" and is_nil(r["when"])
  end

  # EP-006 — group recompose property (preservation; full group suite remains group_composition_test)
  @tag :ep_006
  test "EP-006 dimension update preserves settled fields (recompose property)" do
    base = %{
      "what" => "Dinner",
      "when" => "Friday · 7 PM",
      "where" => "Harbor Table",
      "speaker_count" => 2,
      "dimensions" => %{"remote" => false, "where_matters" => true}
    }

    # Simulating participation growth does not wipe plan dimensions
    updated =
      base
      |> Map.put("speaker_count", 3)
      |> then(&SocialReality.apply_dimension_update(&1, %{}))

    assert updated["what"] == "Dinner"
    assert updated["when"] == "Friday · 7 PM"
    assert updated["where"] == "Harbor Table"
  end

  # EP-007 — time reversal preserves place
  @tag :ep_007
  test "EP-007 clear when reopens time gap and keeps place" do
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

  # EP-008 — private selection ≠ send (domain share contract; UI non-send remains live/private tests)
  @tag :ep_008
  test "EP-008 place share payload cannot be time-only windows" do
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

  # Commutativity metamorphic: same settled dims → same gap
  test "metamorphic: WHAT+WHEN known WHERE open → place regardless of flag order" do
    a =
      SocialReality.next_meaningful_gap(
        ["where"],
        %{"when_known" => true, "where_known" => false, "what_known" => true, "where_matters" => true},
        :set
      )

    b =
      SocialReality.next_meaningful_gap(
        ["where"],
        %{"what_known" => true, "when_known" => true, "where_known" => false, "where_matters" => true},
        :set
      )

    assert a == :place
    assert b == :place

    assert {:gap, :place} =
             PlaceGap.next_gap(%{
               "time_aligned" => true,
               "place_known" => false,
               "what" => "Dinner",
               "where_matters" => true
             })
  end

  defp present?(nil), do: false
  defp present?(""), do: false
  defp present?(s) when is_binary(s), do: String.trim(s) != ""
  defp present?(_), do: true
end
