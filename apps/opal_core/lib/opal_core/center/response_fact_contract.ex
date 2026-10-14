defmodule OpalCore.Center.ResponseFactContract do
  @moduledoc """
  LLM language must be entailed by authoritative domain state.

  The LLM may phrase creatively; it must not invent surprise, booking,
  confirmation, travel-attached, payment, or availability claims.
  Also enforces one-question maximum (Minimum Question Engine).
  """

  @surprise_claim ~r/\b(?:since\s+it'?s\s+a\s+surprise|as\s+a\s+surprise|this\s+is\s+a\s+surprise|surprise\s+(?:trip|plan|dinner))\b/i

  @doc """
  Validate/repair draft text against planning + action meta.

  Returns `{text, repairs}` where repairs is a list of atom reasons.
  """
  def validate(text, planning \\ %{}, meta \\ %{})

  def validate(text, planning, meta) when is_binary(text) do
    c = stringify(planning || %{})
    meta = stringify(meta || %{})
    repairs = []

    {text, repairs} = repair_surprise(text, c, repairs)
    {text, repairs} = enforce_one_question(text, repairs)
    {text, repairs} = repair_false_travel_claim(text, c, meta, repairs)

    {String.trim(text), repairs}
  end

  def validate(other, _, _), do: {other, []}

  @doc "True when draft invents surprise while planning is not surprise."
  def invented_surprise?(text, planning) when is_binary(text) do
    c = stringify(planning || %{})
    surprise? = c["visibility_mode"] == "surprise" or c["surprise"] == true
    not surprise? and Regex.match?(@surprise_claim, text)
  end

  def invented_surprise?(_, _), do: false

  @doc "Count of interrogative clauses (rough)."
  def question_count(text) when is_binary(text) do
    text
    |> String.graphemes()
    |> Enum.count(&(&1 == "?"))
  end

  def question_count(_), do: 0

  defp repair_surprise(text, c, repairs) do
    surprise? = c["visibility_mode"] == "surprise" or c["surprise"] == true

    if not surprise? and Regex.match?(@surprise_claim, text) do
      repaired =
        text
        |> String.replace(~r/\s*since\s+it'?s\s+a\s+surprise[,.]?\s*/i, " ")
        |> String.replace(~r/\bas\s+a\s+surprise\b/i, "")
        |> String.replace(~r/\bthis\s+is\s+a\s+surprise\b/i, "")
        |> String.replace(~r/\s{2,}/, " ")
        |> String.trim()

      # Drop trailing surprise-or-together fork when inventing surprise framing.
      repaired =
        repaired
        |> String.replace(
          ~r/,?\s*and\s+is\s+this\s+a\s+surprise\s+or\s+are\s+you\s+planning\s+it\s+together\??/i,
          "?"
        )
        |> String.replace(~r/\?\?+/, "?")
        |> String.trim()

      {repaired, [:invented_surprise | repairs]}
    else
      {text, repairs}
    end
  end

  defp enforce_one_question(text, repairs) do
    count = question_count(text)
    batched? = batched_questions?(text)

    cond do
      count <= 1 and not batched? ->
        {text, repairs}

      true ->
        kept = first_question_only(text)
        {kept, [:questions_batched | repairs]}
    end
  end

  # Two interrogative intents joined by "and … ?" even with a single "?".
  defp batched_questions?(text) when is_binary(text) do
    down = String.downcase(text)

    String.contains?(down, "?") and
      Regex.match?(
        ~r/\b(?:what|when|where|who|which|is|are|do|does|should|would|can|could)\b.+\band\b.+\b(?:what|when|where|who|which|is|are|do|does|should|would|can|could|or)\b.+\?/i,
        text
      )
  end

  defp batched_questions?(_), do: false

  defp first_question_only(text) do
    # Prefer split before ", and" / " and" that introduces a second ask.
    case Regex.split(~r/,\s*and\s+(?=is|are|do|does|should|would|can|could|what|when|where|who)/i, text,
           parts: 2
         ) do
      [first, _rest] ->
        first = String.trim(first)
        if String.ends_with?(first, "?"), do: first, else: first <> "?"

      _ ->
        case String.split(text, "?", parts: 2) do
          [first, _] -> String.trim(first) <> "?"
          _ -> text
        end
    end
  end

  defp repair_false_travel_claim(text, c, meta, repairs) do
    travel_pending? =
      meta["next_dependency"] == "travel" or c["next_dependency"] == "travel"

    trip? = OpalCore.Center.DependencyPlanner.travel_applicable?(c)

    if not trip? and not travel_pending? and
         Regex.match?(~r/travel isn't attached/i, text) do
      repaired =
        text
        |> String.replace(~r/\s*Travel isn't attached yet\.\s*Want me to check that next\?/i, "")
        |> String.trim()

      {repaired, [:false_travel_dependency | repairs]}
    else
      {text, repairs}
    end
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end

  defp stringify(_), do: %{}
end
