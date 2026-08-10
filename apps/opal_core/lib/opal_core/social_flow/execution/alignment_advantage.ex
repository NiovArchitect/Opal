defmodule OpalCore.SocialFlow.Execution.AlignmentAdvantage do
  @moduledoc """
  Structured ALIGNMENT ADVANTAGE — not a public score.

  How much less coordination work was required because trusted prior
  intelligence existed?

  Compare cold-start work vs compound-intelligence work for comparable plans.
  """

  @doc """
  Diff cold metrics vs mature metrics.

  Both maps may include:
  questions, manual_steps, candidates_considered, provider_queries,
  model_calls, visible_interventions, visible_options,
  time_to_readiness_units, re_entry_steps, recovery_restarts,
  corrections, false_assumptions, privacy_violations
  """
  def measure(cold, mature) when is_map(cold) and is_map(mature) do
    c = stringify(cold)
    m = stringify(mature)

    deltas = %{
      "questions_avoided" => delta(c, m, "questions"),
      "manual_steps_avoided" => delta(c, m, "manual_steps"),
      "candidates_eliminated" => delta(c, m, "candidates_considered"),
      "provider_queries_avoided" => delta(c, m, "provider_queries"),
      "model_calls_avoided" => delta(c, m, "model_calls"),
      "visible_interventions_delta" => delta(c, m, "visible_interventions"),
      "visible_options_delta" => delta(c, m, "visible_options"),
      "time_to_readiness_improvement" => delta(c, m, "time_to_readiness_units"),
      "re_entry_avoided" => delta(c, m, "re_entry_steps"),
      "recovery_restarts_delta" => delta(c, m, "recovery_restarts")
    }

    safety = %{
      "corrections_cold" => num(c["corrections"]),
      "corrections_mature" => num(m["corrections"]),
      "false_assumptions_mature" => num(m["false_assumptions"]),
      "privacy_violations" => num(m["privacy_violations"]),
      "privacy_perfect" => num(m["privacy_violations"]) == 0,
      "hard_constraints_honored" => m["hard_constraints_honored"] != false,
      "corrections_remain_low" => num(m["corrections"]) <= max(num(c["corrections"]), 1) + 1
    }

    work_down? =
      deltas["questions_avoided"] >= 0 and
        deltas["manual_steps_avoided"] >= 0 and
        deltas["visible_options_delta"] >= 0

    noise_ok? = deltas["visible_interventions_delta"] >= -1

    %{
      "deltas" => deltas,
      "safety" => safety,
      "advantage" =>
        work_down? and safety["privacy_perfect"] and safety["corrections_remain_low"],
      "noise_not_up" => noise_ok?,
      "public_score" => false,
      "scalar_magic" => false,
      "authorizes_set" => false
    }
  end

  def measure(_, _), do: %{"advantage" => false}

  @doc "Human-readable work eliminated summary (engineering only)."
  def summarize(%{"deltas" => d} = adv) when is_map(d) do
    parts =
      [
        if(d["questions_avoided"] > 0, do: "#{d["questions_avoided"]} questions avoided"),
        if(d["candidates_eliminated"] > 0,
          do: "#{d["candidates_eliminated"]} candidates eliminated"
        ),
        if(d["provider_queries_avoided"] > 0,
          do: "#{d["provider_queries_avoided"]} provider queries avoided"
        ),
        if(d["manual_steps_avoided"] > 0,
          do: "#{d["manual_steps_avoided"]} manual steps avoided"
        ),
        if(d["time_to_readiness_improvement"] > 0,
          do: "readiness #{d["time_to_readiness_improvement"]} units faster"
        )
      ]
      |> Enum.reject(&is_nil/1)

    %{
      "summary_lines" => parts,
      "advantage" => adv["advantage"] == true,
      "public" => false
    }
  end

  def summarize(_), do: %{"summary_lines" => [], "advantage" => false}

  defp delta(c, m, key), do: num(c[key]) - num(m[key])
  defp num(n) when is_number(n), do: n
  defp num(_), do: 0

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
