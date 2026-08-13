defmodule OpalCore.SocialFlow.SharedRealityPresentationTest do
  use ExUnit.Case, async: true

  alias OpalCore.SocialFlow.SharedRealityPresentation

  defp msg(body), do: %{body: body}

  test "extracts dinner + thursday into human headline without Set token" do
    messages = [
      msg("We should get dinner Thursday."),
      msg("I'm free after 6:30. Does Thursday work?"),
      msg("I'm in."),
      msg("Works for me.")
    ]

    reality = SharedRealityPresentation.from_messages(messages, :set)
    assert reality["what"] == "Dinner"
    assert reality["when"] =~ "Thursday"
    assert reality["headline"] =~ "Dinner"
    refute reality["headline"] == "Set"
    assert reality["sufficiency"] in ["usable", "converging"]
    assert reality["ui_job"] in ["reveal", "resolve"]
  end

  test "maya-style coffee becomes usable only with time and place" do
    weak = SharedRealityPresentation.from_messages([msg("Coffee Tuesday?")], :still_open)
    assert weak["what"] == "Coffee"
    assert weak["when"] == "Tuesday"
    assert "confirmation" in weak["gaps"] or "where" in weak["gaps"]
    assert weak["sufficiency"] in ["intention", "converging"]

    strong =
      SharedRealityPresentation.from_messages(
        [
          msg("Coffee with you Tuesday?"),
          msg("10:30 AM works."),
          msg("Communal Coffee is perfect."),
          msg("I'm in."),
          msg("Works for me.")
        ],
        :set
      )

    assert strong["what"] == "Coffee"
    assert strong["where"] == "Communal Coffee"
    assert strong["headline"] =~ "Coffee"
    assert strong["headline"] =~ "Communal Coffee"
    assert strong["usable?"] == true or strong["sufficiency"] == "converging"
  end

  test "friend dinner without venue stays partially unresolved (not fully arranged)" do
    reality =
      SharedRealityPresentation.from_messages(
        [
          msg("Saturday dinner with the five of us?"),
          msg("After 7 works."),
          msg("I'm in"),
          msg("Works for me")
        ],
        :set
      )

    assert reality["what"] == "Dinner"
    assert "where" in reality["gaps"]
    assert reality["sufficiency"] == "converging"
    # Headline holds only resolved facts — not "complete plan + parenthetical"
    refute reality["headline"] =~ ~r/place still open|need a place/i
    # V2 human gap language: "Place still open" (not homework "need a place")
    assert reality["detail"] =~ ~r/place still open|need a place/i
    assert reality["ui_job"] == "resolve"
  end

  test "plan_forming is intention not durable plans surface" do
    reality =
      SharedRealityPresentation.from_messages(
        [msg("We should grab coffee sometime.")],
        :plan_forming
      )

    assert reality["sufficiency"] == "intention"
    assert reality["plans_durable?"] == false
  end

  test "does not invent Thursday 6:30 without clock evidence" do
    reality =
      SharedRealityPresentation.from_messages(
        [msg("Thursday works for me."), msg("Thursday is good.")],
        :still_open
      )

    assert reality["when"] == "Thursday" or reality["when"] =~ ~r/^Thursday$/
    refute reality["when"] =~ ~r/6:30/
  end

  test "Thursday 7 keeps hour evidence rather than inventing 6:30" do
    reality =
      SharedRealityPresentation.from_messages(
        [msg("FaceTime Thursday 7?"), msg("Yes!")],
        :set
      )

    assert reality["what"] == "FaceTime"
    assert reality["when"] =~ "Thursday"
    assert reality["when"] =~ "7"
    refute reality["when"] =~ "6:30"
    # Remote: place is not the next gap
    refute reality["next_gap"] == "place"
  end

  test "Italian dinner category leaves place open with place gap label" do
    reality =
      SharedRealityPresentation.from_messages(
        [
          msg("Dinner Thursday after 6:30?"),
          msg("Perfect."),
          msg("Something Italian but I don't know where yet.")
        ],
        :set
      )

    assert reality["what"] == "Dinner"
    assert reality["when"] =~ "Thursday"
    assert is_nil(reality["where"])
    assert reality["next_gap"] == "place"
    assert reality["place_gap_label"] =~ ~r/Italian|Place still open/i
  end
end
