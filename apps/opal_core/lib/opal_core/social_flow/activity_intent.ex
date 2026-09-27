defmodule OpalCore.SocialFlow.ActivityIntent do
  @moduledoc """
  One reading of what people are trying to do.

  Shortcut buttons, the Describe-it field, and chat all call this.
  The category is internal. People do not pick from a taxonomy.
  """

  @shortcuts %{
    "dinner" => {:food_drink, "dinner", "local_experience", "reservation"},
    "coffee" => {:food_drink, "coffee", "micro", "reservation"},
    "drinks" => {:food_drink, "drinks", "local_experience", "reservation"},
    "something active" => {:outdoor, "hike", "local_experience", "none"}
  }

  def compile(text) when is_binary(text), do: known(text)
  def compile(_), do: nil

  def compile_freeform(text) when is_binary(text) do
    known(text) ||
      case String.trim(text) do
        "" -> nil
        raw -> build(raw, title_label(raw), {:other, "custom", "local_event", "other"})
      end
  end

  def compile_freeform(_), do: nil

  defp known(text) when is_binary(text) do
    raw = String.trim(text)
    normalized = raw |> String.downcase() |> String.replace(~r/\s+/, " ")

    cond do
      normalized == "" ->
        nil

      shortcut = @shortcuts[normalized] ->
        build(raw, label_for(elem(shortcut, 1)), shortcut)

      faith?(normalized) ->
        build(raw, faith_label(normalized), {:faith, faith_subtype(normalized), "local_event", "calendar"})

      travel?(normalized) ->
        build(raw, "Trip", {:travel, "vacation", "journey_scale", "travel_booking"})

      Regex.match?(~r/\b(danc\w*|date night|romantic)\b/, normalized) ->
        build(raw, "Something social", {:social, "date", "local_experience", "reservation"})

      Regex.match?(~r/\b(meeting|contractor|launch)\b/, normalized) ->
        build(raw, "Meeting", {:work, "meeting", "micro", "calendar"})

      Regex.match?(~r/\b(hike|hiking|gym)\b/, normalized) ->
        build(raw, "Something active", {:outdoor, "hike", "local_experience", "none"})

      Regex.match?(~r/\b(movie|concert)\b/, normalized) ->
        build(raw, "Entertainment", {:entertainment, "event", "local_experience", "ticket"})

      Regex.match?(~r/\b(kids|birthday|family)\b/, normalized) ->
        build(raw, "Family time", {:family, "outing", "day_plan", "none"})

      true ->
        nil
    end
  end

  def restaurant?(intent) when is_map(intent) do
    intent["execution_type"] == "reservation" and intent["category"] == "food_drink"
  end

  def restaurant?(_), do: false

  defp build(raw, label, {category, subtype, scope, execution}) do
    %{
      "raw_text" => raw,
      "normalized_label" => label,
      "category" => to_string(category),
      "subtype" => to_string(subtype),
      "scope" => scope,
      "execution_type" => execution,
      "source" => "stated",
      "confidence" => "explicit"
    }
  end

  defp label_for("dinner"), do: "Dinner"
  defp label_for("coffee"), do: "Coffee"
  defp label_for("drinks"), do: "Drinks"
  defp label_for("hike"), do: "Something active"
  defp label_for(other), do: other

  defp faith?(text) do
    Regex.match?(~r/\b(church|bible study|bible|worship|small group|sunday service)\b/, text)
  end

  defp faith_label(text) do
    cond do
      String.contains?(text, "bible") -> "Bible study"
      true -> "Church"
    end
  end

  defp faith_subtype(text) do
    cond do
      String.contains?(text, "bible") -> :bible_study
      String.contains?(text, "worship") -> :worship
      true -> :church_service
    end
  end

  defp travel?(text) do
    Regex.match?(~r/\b(vacation|italy|weekend getaway|road trip|getaway)\b/, text)
  end

  defp title_label(raw) do
    raw
    |> String.split(~r/\s+/, trim: true)
    |> Enum.map_join(" ", &String.capitalize/1)
  end
end
