defmodule OpalCore.SocialFlow.EconomicPool do
  @moduledoc """
  Bounded economic pool identity (Pass 21).

  ONE provider economic event → ONE pool.
  Attribution hops never increase pool size.
  Pool is NOT cash and NOT a payout instruction.
  """

  @doc """
  Build a stable pool identity from a provider economic event.

  Pool is tied to provider event / transaction / currency — not creator.
  """
  def from_economic_fact(fact) when is_map(fact) do
    f = stringify(fact)
    tx = f["transaction_id"] || f["execution_id"] || "unknown"
    currency = f["currency"] || "USD"
    provider = f["provider"] || "unknown"
    amount = f["commission_pool"] || f["gross_value"]
    simulation = f["simulation"] == true or f["live_economic"] != true

    pool_id = "pool:#{provider}:#{tx}:#{currency}"

    %{
      "pool_id" => pool_id,
      "provider" => provider,
      "transaction_id" => tx,
      "execution_id" => f["execution_id"],
      "currency" => currency,
      "amount" => amount,
      "source" => if(simulation, do: "simulation", else: "provider"),
      "simulation" => simulation,
      "live_economic" => f["live_economic"] == true,
      "is_payout" => false,
      "grows_with_lineage" => false,
      "creator_count_does_not_expand_pool" => true
    }
  end

  def from_economic_fact(_), do: {:error, :invalid}

  @doc "Hard invariant: hops never expand pool amount."
  def expand_pool_for_hops?(pool, hop_count) when is_map(pool) and is_integer(hop_count) do
    false
  end

  def expand_pool_for_hops?(_, _), do: false

  @doc "One transaction → one pool id (stable)."
  def one_transaction_one_pool?(pool_a, pool_b) when is_map(pool_a) and is_map(pool_b) do
    a = stringify(pool_a)
    b = stringify(pool_b)
    a["transaction_id"] == b["transaction_id"] and a["pool_id"] == b["pool_id"]
  end

  def one_transaction_one_pool?(_, _), do: false

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
