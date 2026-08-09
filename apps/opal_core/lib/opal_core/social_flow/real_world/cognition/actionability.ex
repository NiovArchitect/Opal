defmodule OpalCore.SocialFlow.RealWorld.Cognition.Actionability do
  @moduledoc """
  Distinguish interesting / useful / actionable.

  Only actionable or very useful things deserve visible interruption.
  Weak signal → silence.
  """

  alias OpalCore.SocialFlow.DynamicIntelligence.Restraint
  alias OpalCore.SocialFlow.RealWorld.Cognition.EffortBudget

  @doc """
  Classify an opportunity.

  Returns :silence | :interesting | :useful | :actionable
  """
  def classify(attrs) when is_map(attrs) do
    a = stringify(attrs)
    conf = to_float(a["confidence"])
    benefit = to_float(a["benefit"])
    effort = EffortBudget.estimate(a)["effort_score"]

    restraint =
      Restraint.decide(%{
        "forming?" => a["forming?"] != false,
        "context_confidence" => conf,
        "participant_count" => to_int(a["participant_count"], 2),
        "option_count" => to_int(a["option_count"], 1),
        "preferred_quality" => to_float(a["preferred_quality"], 2.0),
        "recent_suggestion_count" => to_int(a["recent_suggestion_count"], 0),
        "missing_information_count" => to_int(a["missing_information_count"], 0),
        "permission_revoked" => a["permission_revoked"] == true,
        "privacy_risk" => a["privacy_risk"]
      })

    cond do
      a["ignored_suggestion"] == true or a["topic_changed"] == true or a["casual_chat"] == true ->
        {:silence, "low_interruption_value"}

      match?({:silence, _}, restraint) ->
        {:silence, elem(restraint, 1)}

      conf >= 0.8 and benefit >= 0.7 and effort <= 4.0 ->
        {:actionable, "high_confidence_low_effort"}

      conf >= 0.65 and benefit >= 0.5 ->
        {:useful, "material_help"}

      conf >= 0.4 ->
        {:interesting, "weak_signal"}

      true ->
        {:silence, "below_threshold"}
    end
  end

  def classify(_), do: {:silence, "invalid"}

  @doc "Whether classification deserves a visible surface."
  def surface?({:actionable, _}), do: true
  def surface?({:useful, _}), do: true
  def surface?(_), do: false

  defp to_float(nil), do: 0.0
  defp to_float(n) when is_number(n), do: n * 1.0
  defp to_float(_), do: 0.0

  defp to_float(nil, d), do: d
  defp to_float(n, _) when is_number(n), do: n * 1.0
  defp to_float(_, d), do: d

  defp to_int(nil, d), do: d
  defp to_int(n, _) when is_integer(n), do: n
  defp to_int(_, d), do: d

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
