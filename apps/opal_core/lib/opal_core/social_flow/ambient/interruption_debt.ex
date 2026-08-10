defmodule OpalCore.SocialFlow.Ambient.InterruptionDebt do
  @moduledoc """
  Every Opal interruption incurs a debt.

  It must repay that debt by removing more human effort or uncertainty
  than the interruption itself creates.

  Canonical judgment law for ambient intelligence:

  Is what I am about to say worth making these people think about me
  instead of each other?

  If not: quiet.

  Not engagement. Not surface count. Selectivity.
  """

  @doc """
  Evaluate whether a proactive moment repays its interruption cost.

  attrs may include:
  - effort_removed (0.0–1.0) estimated coordination labor removed
  - uncertainty_removed (0.0–1.0)
  - interruption_cost (0.0–1.0) default 0.35
  - this_got_easy / became_easy
  - quality_band / opening_quality_band
  - option_count
  - mediocre / world_heat_only / popularity_only
  - humans_already_solved
  - topic_changed
  - human_asked
  """
  def evaluate(attrs) when is_map(attrs) do
    a = stringify(attrs)

    if hard_silence?(a) do
      silent("hard_restraint")
    else
      cost = clamp(to_f(a["interruption_cost"] || default_cost(a)))
      value = clamp(repayment_value(a))
      repays? = value > cost + 0.05

      %{
        "interruption_cost" => cost,
        "repayment_value" => value,
        "repays_debt" => repays?,
        "surface_ok" => repays? or a["human_asked"] == true,
        "reason" => reason(repays?, a, value, cost),
        "not_engagement" => true,
        "authorizes_set" => false,
        "private" => true
      }
    end
  end

  def evaluate(_), do: silent("invalid")

  @doc "True when proactive surface is justified by debt repayment."
  def repays?(attrs) when is_map(attrs) do
    evaluate(attrs)["repays_debt"] == true
  end

  def repays?(_), do: false

  defp hard_silence?(a) do
    a["humans_already_solved"] == true or a["topic_changed"] == true or
      a["blocked"] == true or a["privacy_ok"] == false or
      a["popularity_only"] == true or a["world_heat_only"] == true
  end

  defp silent(reason) do
    %{
      "interruption_cost" => 1.0,
      "repayment_value" => 0.0,
      "repays_debt" => false,
      "surface_ok" => false,
      "reason" => reason,
      "not_engagement" => true,
      "authorizes_set" => false,
      "private" => true
    }
  end

  defp repayment_value(a) do
    effort = to_f(a["effort_removed"] || inferred_effort(a))
    uncertainty = to_f(a["uncertainty_removed"] || inferred_uncertainty(a))

    base =
      effort * 0.45 +
        uncertainty * 0.35 +
        quality_bonus(a) +
        convergence_bonus(a) +
        compression_bonus(a)

    penalties =
      if(a["mediocre"] == true, do: 0.35, else: 0.0) +
        if(weak_confidence?(a), do: 0.25, else: 0.0) +
        if a["static_repeat"] == true, do: 0.4, else: 0.0

    max(base - penalties, 0.0)
  end

  # Infer value when callers only pass behavioral flags
  defp inferred_effort(a) do
    cond do
      a["this_got_easy"] == true or a["became_easy"] == true -> 0.75
      a["actionable"] == true and to_f(a["confidence"] || 0) >= 0.85 -> 0.55
      a["actionable"] == true -> 0.35
      true -> 0.0
    end
  end

  defp inferred_uncertainty(a) do
    cond do
      a["this_got_easy"] == true or a["converged"] == true -> 0.7
      a["actionable"] == true -> 0.4
      true -> 0.0
    end
  end

  defp quality_bonus(a) do
    case a["quality_band"] || a["opening_quality_band"] do
      "exceptional" -> 0.35
      "strong" -> 0.25
      "solid" -> 0.12
      "thin" -> 0.0
      _ -> 0.0
    end
  end

  defp convergence_bonus(a) do
    if a["this_got_easy"] == true or a["became_easy"] == true or a["converged"] == true do
      0.2
    else
      0.0
    end
  end

  defp compression_bonus(a) do
    case to_i(a["option_count"]) do
      1 -> 0.15
      n when n in 2..3 -> if a["meaningful_tradeoff"] == true, do: 0.1, else: 0.0
      _ -> 0.0
    end
  end

  defp weak_confidence?(a) do
    to_f(a["confidence"] || 1.0) < 0.55 or a["stale_location"] == true or
      a["willingness_inferred_weak"] == true
  end

  defp default_cost(a) do
    cond do
      a["human_asked"] == true -> 0.1
      a["private_prompt"] == true -> 0.25
      a["group_size"] && to_i(a["group_size"]) >= 6 -> 0.45
      true -> 0.35
    end
  end

  defp reason(true, _, value, cost),
    do: "repays_#{Float.round(value, 2)}_gt_#{Float.round(cost, 2)}"

  defp reason(false, a, _, _) do
    cond do
      a["mediocre"] == true -> "mediocrity_not_worth_interrupt"
      a["static_repeat"] == true -> "no_delta_static_state"
      weak_confidence?(a) -> "weak_confidence"
      true -> "debt_not_repaid"
    end
  end

  defp clamp(n) when n < 0.0, do: 0.0
  defp clamp(n) when n > 1.0, do: 1.0
  defp clamp(n), do: n * 1.0

  defp to_f(n) when is_number(n), do: n * 1.0
  defp to_f(_), do: 0.0

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
