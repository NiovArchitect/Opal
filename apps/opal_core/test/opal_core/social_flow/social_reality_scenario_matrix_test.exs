defmodule OpalCore.SocialFlow.SocialRealityScenarioMatrixTest do
  @moduledoc """
  Hundreds of synthetic social-coordination scenarios.
  Order-agnostic WHO/WHAT/WHEN/WHERE intelligence — no linear workflow ownership.
  """
  use ExUnit.Case, async: true

  alias OpalCore.SocialFlow.SocialReality

  # --- generators ---

  @whats ["Dinner", "Coffee", "Lunch", "Drinks", "Sushi", "FaceTime", "Study together", nil]
  @whens ["Thursday · 6:30 PM", "Friday · 7 PM", "Tonight · 8 PM", "Saturday · 10:30 AM", nil]
  @wheres ["Juniper & Ivy", "Harbor Table", "my place", nil]
  @stages [:plan_forming, :still_open, :set, :ready]

  defp gap(dims, stage \\ :still_open) do
    gaps =
      []
      |> then(fn g -> if dims.when, do: g, else: ["when" | g] end)
      |> then(fn g -> if dims.where || not where_matters?(dims.what), do: g, else: ["where" | g] end)
      |> then(fn g -> if dims.what, do: g, else: ["what" | g] end)

    SocialReality.next_meaningful_gap(
      gaps,
      %{
        "when_known" => not is_nil(dims.when),
        "where_known" => not is_nil(dims.where),
        "what_known" => not is_nil(dims.what),
        "where_matters" => where_matters?(dims.what),
        "fixed_event" => dims[:fixed] == true,
        "speaker_count" => dims[:speakers] || 2
      },
      stage
    )
  end

  defp where_matters?(nil), do: false
  defp where_matters?(w), do: Regex.match?(~r/dinner|coffee|lunch|drinks|sushi/i, w)

  defp action(gap), do: SocialReality.available_actions(gap, %{}, :still_open)

  test "matrix: every (what,when,where) yields a valid next_gap" do
    combos =
      for what <- @whats,
          when_l <- @whens,
          where <- @wheres,
          stage <- @stages do
        {what, when_l, where, stage}
      end

    assert length(combos) >= 100

    Enum.each(combos, fn {what, when_l, where, stage} ->
      g =
        gap(
          %{what: what, when: when_l, where: where},
          stage
        )

      assert g in [
               :none,
               :time,
               :place,
               :activity,
               :participants,
               :confirm_required_person,
               :execution,
               :transport,
               :payment,
               :provider_handoff
             ]

      actions = action(g)
      assert is_list(actions)

      # Never offer Find a time when when is known
      if when_l do
        refute g == :time
      end

      # Never force place for remote/FaceTime
      if what && Regex.match?(~r/facetime|call|online/i, what) do
        refute g == :place
      end

      # When place is gap, primary share_kind is place
      if g == :place do
        a = List.first(actions)
        assert a["share_kind"] == "place"
        refute a["label"] =~ ~r/time/i
      end

      # When time is gap, share_kind is time
      if g == :time do
        a = List.first(actions)
        assert a["share_kind"] == "time"
      end
    end)
  end

  test "permutation stories: activity→time→place" do
    # 1) only activity
    assert gap(%{what: "Dinner", when: nil, where: nil}) == :time
    # 2) activity + time
    assert gap(%{what: "Dinner", when: "Thursday · 7 PM", where: nil}) == :place
    # 3) all known
    assert gap(%{what: "Dinner", when: "Thursday · 7 PM", where: "Juniper & Ivy"}) == :none
  end

  test "permutation stories: place→time" do
    assert gap(%{what: "Dinner", when: nil, where: "Juniper & Ivy"}) == :time
    assert gap(%{what: "Dinner", when: "Thursday · 7 PM", where: "Juniper & Ivy"}) == :none
  end

  test "permutation stories: coffee place open" do
    assert gap(%{what: "Coffee", when: "Tomorrow · 10 AM", where: nil}) == :place
  end

  test "permutation stories: FaceTime never place" do
    assert gap(%{what: "FaceTime", when: "Tonight · 8 PM", where: nil}) == :none
  end

  test "permutation stories: time only hang (weak what)" do
    # nil what → activity or time depending on gaps list
    g = gap(%{what: nil, when: "Thursday · 7 PM", where: nil})
    # no place matters without dinner-like activity
    refute g == :place
  end

  test "partial preservation across 50 random updates" do
    Enum.each(1..50, fn i ->
      base = %{
        "what" => "Dinner",
        "when" => "Thursday · 6:30 PM",
        "where" => "Harbor Table",
        "speaker_count" => 2,
        "dimensions" => %{"remote" => false, "where_matters" => true}
      }

      updated =
        if rem(i, 2) == 0 do
          SocialReality.apply_dimension_update(base, %{"when" => "Friday · 7 PM"})
        else
          SocialReality.apply_dimension_update(base, %{"where" => "Campfire"})
        end

      assert updated["what"] == "Dinner"

      if rem(i, 2) == 0 do
        assert updated["where"] == "Harbor Table"
        assert updated["when"] =~ "Friday"
      else
        assert updated["when"] == "Thursday · 6:30 PM"
        assert updated["where"] == "Campfire"
      end
    end)
  end

  test "reversal clears only the changed dimension" do
    base = %{
      "what" => "Dinner",
      "when" => "Thursday · 6:30 PM",
      "where" => "Juniper & Ivy",
      "speaker_count" => 2,
      "dimensions" => %{"remote" => false, "where_matters" => true}
    }

    t = SocialReality.apply_dimension_update(base, %{"when" => :clear, "stage" => "still_open"})
    assert t["where"] == "Juniper & Ivy"
    assert t["next_gap"] == "time"

    p = SocialReality.apply_dimension_update(base, %{"where" => :clear, "stage" => "set"})
    assert p["when"] == "Thursday · 6:30 PM"
    assert p["next_gap"] == "place"
  end

  test "group speaker_count does not invent place for FaceTime" do
    g =
      SocialReality.next_meaningful_gap([], %{
        "when_known" => true,
        "where_known" => false,
        "what_known" => true,
        "where_matters" => false,
        "speaker_count" => 5
      })

    assert g == :none
  end

  test "CTA labels never expose enum names" do
    for g <- [:time, :place, :activity, :none, :participants] do
      for a <- action(g) do
        refute a["label"] =~ ~r/next_gap|enum|when_known|PLACE_GAP/i
        refute a["label"] == to_string(g)
      end
    end
  end

  test "project from message permutations stays coherent" do
    scripts = [
      ["Dinner Thursday?", "Yeah after 6", "6:30?", "Perfect"],
      ["Want to try Harbor Table?", "Yes", "Thursday?", "Works"],
      ["FaceTime tonight?", "Yes 8"],
      ["Coffee tomorrow morning", "10:30 works"],
      ["Concert Saturday 8 at the Shell", "I'm in"],
      ["Come over Thursday", "Ok"],
      ["We should get sushi", "Definitely", "Friday?", "Yes"]
    ]

    Enum.each(scripts, fn bodies ->
      messages =
        Enum.with_index(bodies, fn body, i ->
          %{
            body: body,
            sender_user_id: if(rem(i, 2) == 0, do: "u1", else: "u2"),
            id: "id#{i}",
            server_seq: i
          }
        end)

      r = SocialReality.project(messages, :still_open)
      assert is_binary(r["next_gap"])
      assert is_list(r["next_actions"])
      assert r["workflow_owner"] == "shared_reality"
      assert r["authorizes_set"] == false

      # primary action share_kind matches gap dimension
      case r["next_gap"] do
        "place" ->
          assert get_in(r, ["primary_action", "share_kind"]) == "place"

        "time" ->
          assert get_in(r, ["primary_action", "share_kind"]) == "time"

        _ ->
          :ok
      end
    end)
  end
end
