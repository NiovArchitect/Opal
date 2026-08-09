defmodule OpalCore.SocialFlow.Ambient.AlignmentCompression do
  @moduledoc """
  Alignment compression — how much real-world complexity collapses into
  the smallest safe human decision.

  Engineering question for every subsystem:
  Did this allow fewer human decisions?
  """

  @doc """
  Measure compression from underlying variable count to human-facing choices.
  """
  def measure(attrs) when is_map(attrs) do
    a = stringify(attrs)

    under =
      to_i(a["underlying_variables"] || a["complexity_count"]) ||
        estimate_underlying(a)

    human_choices = max(to_i(a["human_choices"] || a["option_count"] || 1), 0)
    questions = to_i(a["questions_asked"] || 0)

    # Perfect: many vars → 0–1 question + ≤3 options
    ratio =
      if human_choices + questions == 0 do
        under * 1.0
      else
        under / max(human_choices + questions, 1)
      end

    strong? = under >= 5 and human_choices <= 3 and questions <= 1

    {:ok,
     %{
       "underlying_variables" => under,
       "human_choices" => human_choices,
       "questions_asked" => questions,
       "compression_ratio" => Float.round(ratio * 1.0, 2),
       "strong_compression" => strong?,
       "smallest_decision" => a["smallest_decision"] || default_decision(human_choices),
       "authorizes_set" => false
     }}
  end

  def measure(_), do: {:ok, %{"strong_compression" => false}}

  defp estimate_underlying(a) do
    [
      length(List.wrap(a["participant_ids"])),
      to_i(a["schedule_constraints"] || 0),
      to_i(a["locations"] || 0),
      to_i(a["venues_considered"] || a["candidate_count"] || 0),
      to_i(a["events"] || 0),
      if(a["travel_computed"], do: 1, else: 0),
      if(a["private_budgets"], do: 1, else: 0),
      if(a["weather"], do: 1, else: 0),
      if(a["optional_participant"], do: 1, else: 0),
      if(a["provider_call"], do: 1, else: 0)
    ]
    |> Enum.sum()
  end

  defp default_decision(n) when n > 1, do: "which_of_these"
  defp default_decision(1), do: "want_it"
  defp default_decision(_), do: "confirm"

  defp to_i(nil), do: 0
  defp to_i(n) when is_integer(n), do: n
  defp to_i(n) when is_float(n), do: trunc(n)
  defp to_i(_), do: 0

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
