defmodule OpalCore.SocialFlow.Ambient.Surface do
  @moduledoc """
  Gate whether Ambient Opportunity materializes into conversation.

  Silence is success. High threshold. Existing Restraint + existing Opal grammar.
  No heat map, no feed, no Around You page.
  """

  alias OpalCore.SocialFlow.Ambient.{HumanResolution, InterruptionDebt}
  alias OpalCore.SocialFlow.DynamicIntelligence.Restraint

  @doc """
  Decide surface vs silence for a computed opportunity.
  """
  def decide(attrs) when is_map(attrs) do
    a = stringify(attrs)
    humans = HumanResolution.solved?(a)
    topic = HumanResolution.topic_shifted?(a)

    a =
      Map.merge(a, %{
        "humans_already_solved" =>
          a["humans_already_solved"] == true or humans["suppress_competing"] == true,
        "topic_changed" => a["topic_changed"] == true or topic["kill_opportunity"] == true
      })

    debt = InterruptionDebt.evaluate(a)
    signals = surface_signals(a, debt)

    case silence_reason(signals, a, debt) do
      nil -> materialize(Map.put(a, "interruption_debt", debt))
      reason -> silence(reason)
    end
  end

  def decide(_), do: silence("invalid")

  defp surface_signals(a, debt) do
    confidence = to_f(a["confidence"] || 0.5)
    rising? = a["momentum_rising"] == true or a["this_got_easy"] == true

    restraint =
      Restraint.decide(%{
        "forming?" => a["forming?"] != false,
        "context_confidence" => confidence,
        "participant_count" => max(to_i(a["participant_count"] || 2), 2),
        "option_count" => max(to_i(a["option_count"] || 1), 1),
        "preferred_quality" => to_f(a["preferred_quality"] || 2.0),
        "recent_suggestion_count" => to_i(a["recent_suggestion_count"] || 0),
        "missing_information_count" => to_i(a["unknown_count"] || 0)
      })

    %{
      confidence: confidence,
      actionable?: a["actionable"] == true,
      rising?: rising?,
      density_ok?: to_f(a["density"] || 0.0) >= 0.45,
      privacy_ok?: a["privacy_ok"] != false,
      stale?: a["topic_changed"] == true or a["stale"] == true,
      blocked?: a["blocked"] == true,
      humans_solved?: a["humans_already_solved"] == true,
      mediocre?: a["mediocre"] == true,
      debt_ok?: debt["surface_ok"] == true,
      interruption_cost: to_f(a["interruption_cost"] || debt["interruption_cost"] || 0.3),
      restraint: restraint
    }
  end

  defp silence_reason(%{blocked?: true}, _, _), do: "blocked"
  defp silence_reason(%{stale?: true}, _, _), do: "topic_changed"
  defp silence_reason(%{privacy_ok?: false}, _, _), do: "privacy"
  defp silence_reason(%{humans_solved?: true}, _, _), do: "humans_already_solved"
  defp silence_reason(%{mediocre?: true}, _, _), do: "mediocrity"

  defp silence_reason(%{restraint: {:silence, reason}}, _, _), do: reason
  defp silence_reason(%{actionable?: false}, _, _), do: "not_actionable"
  defp silence_reason(%{confidence: c}, _, _) when c < 0.72, do: "low_confidence"

  defp silence_reason(%{debt_ok?: false}, a, _) do
    if a["human_asked"] == true, do: nil, else: "debt_not_repaid"
  end

  defp silence_reason(%{interruption_cost: cost, rising?: false}, _, _) when cost > 0.7,
    do: "interruption_cost"

  defp silence_reason(%{density_ok?: false, rising?: false}, _, _), do: "weak_density"
  defp silence_reason(_, _, _), do: nil

  defp materialize(a) do
    {:ok,
     %{
       "surface" => :opportunity,
       "copy" => a["copy"] || default_copy(a),
       "options" => Enum.take(List.wrap(a["options"]), 3),
       "feed" => false,
       "heat_map" => false,
       "around_you_page" => false,
       "authorizes_set" => false,
       "then_get_quiet" => true
     }}
  end

  defp silence(reason) do
    {:ok,
     %{"surface" => :silence, "reason" => reason, "feed" => false, "authorizes_set" => false}}
  end

  defp default_copy(a) do
    cond do
      a["this_got_easy"] == true -> "This one actually lines up."
      a["expiring"] == true -> "This works right now."
      a["option_count"] in 1..3 -> "This could be fun tonight."
      true -> "This could work."
    end
  end

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
