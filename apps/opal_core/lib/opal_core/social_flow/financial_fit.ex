defmodule OpalCore.SocialFlow.FinancialFit do
  @moduledoc """
  Private financial fit for life curation (Pass 23 add-on).

  ## Laws

  Financial data is PRIVATE actor infrastructure.
  Never expose balance/income/debt/limits to friends/followers/providers.

  FINANCIAL FIT ≠ PAYMENT AUTHORITY

  Knowing something fits budget does NOT authorize purchase/deposit/charge.

  If financial truth insufficient: abstain — do not invent affordability.
  Do not fake bank intelligence.
  """

  @doc """
  Assess whether a candidate experience fits private budget constraints.

  context:
  - discretionary_budget (number or nil)
  - estimated_cost (number or nil)
  - budget_preference (user-supplied string/number)
  - bank_connected (boolean) — still not claimed live

  Returns fit assessment — never a charge authorization.
  """
  def assess(context) when is_map(context) do
    c = stringify(context)
    budget = num(c["discretionary_budget"] || c["budget"])
    cost = num(c["estimated_cost"] || c["cost"])
    pref = c["budget_preference"]

    cond do
      is_nil(budget) and is_nil(pref) and is_nil(cost) ->
        abstain("financial_truth_insufficient")

      is_nil(budget) and is_nil(pref) ->
        abstain("no_budget_signal")

      is_nil(cost) ->
        %{
          "fit" => "unknown",
          "reason" => "cost_unknown",
          "authorizes_payment" => false,
          "authorizes_booking" => false,
          "private" => true,
          "expose_to_followers" => false,
          "expose_to_friends" => false,
          "expose_to_providers" => false,
          "bank_intelligence_claimed" => false,
          "is_payout" => false
        }

      is_number(budget) and is_number(cost) and cost <= budget ->
        %{
          "fit" => "fits",
          "reason" => "within_discretionary_budget",
          "authorizes_payment" => false,
          "authorizes_booking" => false,
          "private" => true,
          "expose_to_followers" => false,
          "expose_to_friends" => false,
          "expose_to_providers" => false,
          "bank_intelligence_claimed" => false,
          "is_payout" => false
        }

      is_number(budget) and is_number(cost) and cost > budget ->
        %{
          "fit" => "over",
          "reason" => "exceeds_discretionary_budget",
          "authorizes_payment" => false,
          "authorizes_booking" => false,
          "private" => true,
          "expose_to_followers" => false,
          "suppress_suggestion" => true,
          "bank_intelligence_claimed" => false,
          "is_payout" => false
        }

      true ->
        abstain("ambiguous_financial_context")
    end
  end

  def assess(_), do: abstain("invalid")

  def financial_fit_authorizes_payment?, do: false

  def expose_balance_to_followers?, do: false

  def invent_affordability_when_unknown?, do: false

  defp abstain(reason) do
    %{
      "fit" => "unknown",
      "reason" => reason,
      "abstain" => true,
      "authorizes_payment" => false,
      "authorizes_booking" => false,
      "private" => true,
      "expose_to_followers" => false,
      "expose_to_friends" => false,
      "expose_to_providers" => false,
      "bank_intelligence_claimed" => false,
      "do_not_invent_affordability" => true,
      "is_payout" => false
    }
  end

  defp num(n) when is_number(n), do: n

  defp num(n) when is_binary(n) do
    case Float.parse(n) do
      {f, _} -> f
      :error -> nil
    end
  end

  defp num(_), do: nil

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
