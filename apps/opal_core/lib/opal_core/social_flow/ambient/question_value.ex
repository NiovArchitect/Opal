defmodule OpalCore.SocialFlow.Ambient.QuestionValue do
  @moduledoc """
  Question value — how much uncertainty would this answer remove?

  Only high-leverage unknowns deserve a human question.
  Never wizard-chain time → place → budget → vibe.

  Compose with AlignmentLoop.should_ask?/1.
  """

  @high_leverage ~w(
    willingness_required
    confirm_time
    required_participant
    invite_optional
    zone_tradeoff
    book_authorization
  )

  @low_leverage ~w(
    food_vibe
    open_ended_preference
    full_availability_form
    neighborhood_browse
    schedule_dump
  )

  def high_leverage_topics, do: @high_leverage
  def low_leverage_topics, do: @low_leverage

  @doc """
  Score whether a candidate question is worth asking.

  Returns ask? + value 0.0–1.0 + topic.
  """
  def evaluate(attrs) when is_map(attrs) do
    a = stringify(attrs)
    topic = a["topic"] || a["question_topic"] || "confirm"

    already = already_known?(topic, a)
    leverage = leverage_for(topic, a)
    improves? = material_actionability_gain?(topic, a)

    value =
      cond do
        already -> 0.0
        topic in @low_leverage -> 0.15
        not improves? -> 0.2
        true -> leverage
      end

    ask? = not already and value >= 0.55 and a["wizard_chain"] != true

    %{
      "topic" => topic,
      "value" => Float.round(value * 1.0, 2),
      "ask" => ask?,
      "skip" => not ask?,
      "already_known" => already,
      "high_leverage" => topic in @high_leverage,
      "reason" => reason(already, ask?, topic),
      "authorizes_set" => false
    }
  end

  def evaluate(_), do: %{"ask" => false, "skip" => true, "value" => 0.0}

  defp already_known?("when", a) do
    a["native_social_time"] == true or a["explicit_availability"] == true or
      a["aligned_when"] not in [nil, ""] or a["conversation_evidence_time"] == true
  end

  defp already_known?("confirm_time", a), do: already_known?("when", a)

  defp already_known?("where", a) do
    a["location_known"] == true or a["aligned_where"] not in [nil, ""] or
      a["expected_area"] not in [nil, ""]
  end

  defp already_known?("zone_tradeoff", a),
    do: already_known?("where", a) and a["zone_resolved"] == true

  defp already_known?("availability", a) do
    a["native_calendar_sufficient"] == true or a["explicit_availability"] == true
  end

  defp already_known?("willingness_required", a) do
    a["willingness_ok"] == true and a["required_willingness_known"] == true
  end

  defp already_known?("is_it_open", a), do: a["provider_hours_known"] == true
  defp already_known?("can_you_get_there", a), do: a["travel_feasible"] == true
  defp already_known?(_, a), do: a["opal_already_knows"] == true

  defp leverage_for(topic, a) do
    cond do
      topic in ~w(willingness_required required_participant) -> 0.9
      topic in ~w(confirm_time when) -> if(blocks_all?(a), do: 0.9, else: 0.7)
      topic in ~w(book_authorization) -> 0.8
      topic in ~w(invite_optional) -> 0.6
      topic in ~w(zone_tradeoff where) -> 0.7
      topic in ~w(confirm availability) -> 0.6
      topic in @low_leverage -> 0.15
      true -> 0.45
    end
  end

  defp material_actionability_gain?(topic, a) do
    topic in @high_leverage or topic in ~w(when where confirm availability) or
      (a["one_missing_blocks"] == true and topic not in @low_leverage)
  end

  defp blocks_all?(a),
    do: a["one_missing_blocks"] == true or a["required_willingness_unknown"] == true

  defp reason(true, _, _), do: "already_knew"
  defp reason(_, true, topic), do: "high_leverage_" <> to_string(topic)
  defp reason(_, false, topic) when topic in @low_leverage, do: "low_value_question"
  defp reason(_, false, _), do: "insufficient_leverage"

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
