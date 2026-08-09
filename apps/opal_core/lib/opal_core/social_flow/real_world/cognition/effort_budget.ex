defmodule OpalCore.SocialFlow.RealWorld.Cognition.EffortBudget do
  @moduledoc """
  Internal user-effort budget for interventions.

  Prefer equivalent paths requiring less thinking, searching, comparing,
  context switching — not just fewer clicks.
  """

  @doc """
  Estimate effort score (lower is better).

  Components: taps, typing, context_switch, thinking, privacy_decision, search.
  """
  def estimate(attrs) when is_map(attrs) do
    a = stringify(attrs)

    taps = to_num(a["taps"])
    typing = to_num(a["typing_burden"])
    ctx = to_num(a["context_switching"])
    think = to_num(a["thinking_burden"])
    privacy = to_num(a["privacy_decision_burden"])
    search = to_num(a["manual_search_burden"])

    score = taps * 1.0 + typing * 1.5 + ctx * 2.0 + think * 2.5 + privacy * 2.0 + search * 3.0

    %{
      "effort_score" => score,
      "components" => %{
        "taps" => taps,
        "typing" => typing,
        "context_switch" => ctx,
        "thinking" => think,
        "privacy_decision" => privacy,
        "search" => search
      }
    }
  end

  def estimate(_), do: %{"effort_score" => 99.0}

  @doc "Prefer path with lower effort when outcomes are equivalent."
  def prefer(path_a, path_b) when is_map(path_a) and is_map(path_b) do
    ea = estimate(path_a)["effort_score"]
    eb = estimate(path_b)["effort_score"]
    if ea <= eb, do: :a, else: :b
  end

  @doc "Canned path costs for common Opal interventions."
  def path_cost(:one_confirmation) do
    estimate(%{
      taps: 1,
      typing_burden: 0,
      context_switching: 0,
      thinking_burden: 0.5,
      privacy_decision_burden: 0.5,
      manual_search_burden: 0
    })
  end

  def path_cost(:manual_editor) do
    estimate(%{
      taps: 6,
      typing_burden: 3,
      context_switching: 1,
      thinking_burden: 2,
      privacy_decision_burden: 1,
      manual_search_burden: 0
    })
  end

  def path_cost(:browse_many) do
    estimate(%{
      taps: 12,
      typing_burden: 0,
      context_switching: 2,
      thinking_burden: 4,
      privacy_decision_burden: 0,
      manual_search_burden: 3
    })
  end

  def path_cost(:one_recommendation) do
    estimate(%{
      taps: 1,
      typing_burden: 0,
      context_switching: 0,
      thinking_burden: 0.8,
      privacy_decision_burden: 0,
      manual_search_burden: 0
    })
  end

  def path_cost(_), do: estimate(%{})

  defp to_num(nil), do: 0.0
  defp to_num(n) when is_number(n), do: n * 1.0
  defp to_num(_), do: 0.0

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
