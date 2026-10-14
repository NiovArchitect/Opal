defmodule OpalCore.Center.TemporalPhrase do
  @moduledoc """
  Consumer temporal phrase composition.

  Normalizes daypart labels so relative when values never duplicate
  ("tonight night", "tomorrow night night").
  """

  @relative_alone ~w(tonight tomorrow today)
  @relative_with_part [
    "this evening",
    "this afternoon",
    "this morning",
    "this weekend",
    "weekend"
  ]

  @doc """
  Compose a consumer-facing when phrase for copy like "… in Mexico City".

  Examples:
  - tonight → tonight
  - Saturday → Saturday night
  - Sunday evening → Sunday evening
  """
  def when_phrase(when_s) when is_binary(when_s) do
    trimmed = String.trim(when_s)
    down = String.downcase(trimmed)

    cond do
      down in @relative_alone ->
        trimmed

      down in @relative_with_part ->
        trimmed

      String.contains?(down, "night") or String.contains?(down, "evening") or
          String.contains?(down, "afternoon") or String.contains?(down, "morning") ->
        trimmed

      true ->
        "#{trimmed} night"
    end
  end

  def when_phrase(_), do: "Saturday night"

  @doc "True when phrase would duplicate a daypart (guard for tests)."
  def duplicate_daypart?(phrase) when is_binary(phrase) do
    down = String.downcase(phrase)
    Regex.match?(~r/\btonight\s+night\b/, down) or
      Regex.match?(~r/\btomorrow\s+night\s+night\b/, down) or
      Regex.match?(~r/\btonight\s+evening\b/, down)
  end

  def duplicate_daypart?(_), do: false
end
