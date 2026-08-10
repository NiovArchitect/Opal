defmodule OpalCore.SocialFlow.Ambient.HumanResolution do
  @moduledoc """
  Humans already solved it / topic shift — strong restraint.

  If humans coordinate while Opal is computing, cancel competing suggestions.
  Do not finish the AI thought merely because computation started.

  Natural language evidence is accepted as signals (not harness strings).
  """

  @solved_patterns [
    ~r/\blet'?s just do\b/i,
    ~r/\blet'?s do\b/i,
    ~r/\bwe'?re doing\b/i,
    ~r/\bmeet(ing)? at\b/i,
    ~r/\bi'?m down\b/i,
    ~r/\bfine with me\b/i,
    ~r/\byou guys pick\b/i
  ]

  @topic_shift_pairs [
    {~r/\bdinner\b|\brestaurant\b|\beat\b/i, ~r/\bmovie\b|\bfilm\b|\bcinema\b/i},
    {~r/\bcoffee\b/i, ~r/\bhike\b|\btrail\b/i},
    {~r/\bdrinks\b|\bbar\b/i, ~r/\bgame\b|\bmatch\b/i}
  ]

  @doc """
  Detect whether humans resolved the coordination problem themselves.
  """
  def solved?(attrs) when is_map(attrs) do
    a = stringify(attrs)

    explicit = a["humans_already_solved"] == true or a["human_chose_place"] == true

    messages = List.wrap(a["recent_messages"] || a["messages"])
    text = messages |> Enum.map(&message_text/1) |> Enum.join(" ")

    pattern_hit? =
      text != "" and Enum.any?(@solved_patterns, &Regex.match?(&1, text)) and
        (a["mutual_affirmation"] == true or String.contains?(String.downcase(text), "down") or
           String.contains?(String.downcase(text), "fine with me") or
           a["second_person_agreed"] == true)

    place_named? =
      a["human_place_name"] not in [nil, ""] or
        Regex.match?(~r/\b(harbor table|night market|[\w]+ (?:cafe|bar|spot))\b/i, text)

    %{
      "humans_already_solved" => explicit or (pattern_hit? and place_named?) or explicit_pair?(a),
      "suppress_competing" => explicit or pattern_hit? or explicit_pair?(a),
      "reason" =>
        cond do
          explicit -> "explicit_flag"
          explicit_pair?(a) -> "mutual_choice"
          pattern_hit? and place_named? -> "natural_language_resolution"
          pattern_hit? -> "possible_resolution"
          true -> "not_solved"
        end,
      "authorizes_set" => false
    }
  end

  def solved?(_), do: %{"humans_already_solved" => false, "suppress_competing" => false}

  @doc """
  Topic shifted away from the opportunity domain — kill old opportunity.
  """
  def topic_shifted?(attrs) when is_map(attrs) do
    a = stringify(attrs)

    if a["topic_changed"] == true do
      %{"topic_shifted" => true, "reason" => "flag", "kill_opportunity" => true}
    else
      old = to_string(a["prior_topic"] || a["opportunity_topic"] || "")
      new = to_string(a["current_topic"] || a["latest_topic"] || "")
      messages = List.wrap(a["recent_messages"]) |> Enum.map(&message_text/1) |> Enum.join(" ")

      shifted =
        Enum.any?(@topic_shift_pairs, fn {from, to} ->
          (old != "" and Regex.match?(from, old) and new != "" and Regex.match?(to, new)) or
            (Regex.match?(from, messages) and Regex.match?(to, messages) and
               a["domain_flip"] == true)
        end)

      %{
        "topic_shifted" => shifted,
        "kill_opportunity" => shifted,
        "reason" => if(shifted, do: "domain_flip", else: "same_or_unknown"),
        "authorizes_set" => false
      }
    end
  end

  def topic_shifted?(_), do: %{"topic_shifted" => false, "kill_opportunity" => false}

  defp explicit_pair?(a) do
    a["human_place_name"] not in [nil, ""] and a["second_person_agreed"] == true
  end

  defp message_text(%{"text" => t}) when is_binary(t), do: t
  defp message_text(%{text: t}) when is_binary(t), do: t
  defp message_text(t) when is_binary(t), do: t
  defp message_text(_), do: ""

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
