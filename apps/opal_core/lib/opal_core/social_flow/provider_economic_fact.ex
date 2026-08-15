defmodule OpalCore.SocialFlow.ProviderEconomicFact do
  @moduledoc """
  Provider economic fact envelope (Pass 21).

  Economic truth requires provenance. LLM cannot invent commission/settlement.

  LIVE COMMISSION / SETTLEMENT: NOT CLAIMED by default.
  Synthetic adapters may emit simulation-labeled facts only.
  """

  alias OpalCore.SocialFlow.ExternalWorldTruth

  @event_types ~w(
    commission_observed
    commission_confirmed
    commission_reversed
    experience_completed
    transaction_settled
    no_commission
    unknown
  )

  def event_types, do: @event_types

  def live_economic_provider?, do: false
  def live_commission?, do: false
  def live_settlement?, do: false
  def live_payout?, do: false

  def status do
    %{
      "live_economic_provider" => false,
      "live_commission" => false,
      "live_settlement" => false,
      "live_payout" => false,
      "default_mode" => "simulation",
      "llm_can_create_economic_fact" => false
    }
  end

  @doc """
  Build a provider economic fact with provenance.

  attrs:
  - provider, transaction_id / provider_transaction_id
  - economic_event_type
  - gross_value, commission_pool, currency (optional)
  - status: observed | confirmed | reversed | unknown
  - settlement_state
  - synthetic / simulation flags
  """
  def envelope(attrs) when is_map(attrs) do
    a = stringify(attrs)
    now = DateTime.utc_now() |> DateTime.truncate(:second)
    synthetic = a["synthetic"] != false and a["live"] != true
    source = a["source"] || if(synthetic, do: "synthetic_economic", else: a["provider"] || "unknown")

    event = a["economic_event_type"] || a["event_type"] || "unknown"

    if event not in @event_types and event != "unknown" do
      # Allow free-form but normalize later
      :ok
    end

    prov = %{
      "source" => source,
      "source_item_id" => a["transaction_id"] || a["provider_transaction_id"] || a["execution_id"],
      "observed_at" => a["observed_at"] || now,
      "synthetic" => synthetic,
      "real" => synthetic != true and a["live"] == true,
      "confidence" => a["confidence"] || if(synthetic, do: 0.5, else: 0.8)
    }

    env = %{
      "truth_class" => "provider_fact",
      "fact_type" => "provider_economic",
      "provider" => a["provider"] || "synthetic_reservation",
      "transaction_id" => a["transaction_id"] || a["provider_transaction_id"] || a["execution_id"],
      "execution_id" => a["execution_id"],
      "economic_event_id" => a["economic_event_id"],
      "economic_event_type" => event,
      "gross_value" => a["gross_value"],
      "commission_pool" => a["commission_pool"] || a["commission_value"] || a["amount_pool"],
      "commission_value" => a["commission_value"] || a["commission_pool"] || a["amount_pool"],
      "commission_basis" => a["commission_basis"],
      "currency" => a["currency"] || "USD",
      "observed_at" => prov["observed_at"],
      "effective_at" => a["effective_at"] || prov["observed_at"],
      "settled_at" => a["settled_at"],
      "status" => a["status"] || default_status(event),
      "settlement_state" => a["settlement_state"] || "unknown",
      "finality" => a["finality"],
      "reversal_reason" => a["reversal_reason"],
      "reversal_reference" => a["reversal_reference"],
      "provider_contract_version" => a["provider_contract_version"],
      "source_mode" => a["source_mode"] || if(synthetic, do: "synthetic", else: "unknown"),
      "source" => source,
      "provenance" => prov,
      "simulation" => synthetic,
      "live_economic" => synthetic != true and a["live"] == true,
      "is_payout" => false,
      "llm_invented" => a["llm_invented"] == true
    }

    # Provenance invariant via ExternalWorldTruth shape
    :ok =
      ExternalWorldTruth.assert_provider_provenance!(%{
        "provenance" => Map.put(prov, "source", source)
      })

    env
  end

  def envelope(_), do: {:error, :invalid}

  @doc "Synthetic commission for foundation proof — always simulation-labeled."
  def simulate_commission(attrs \\ %{}) do
    a = stringify(attrs || %{})

    envelope(%{
      "provider" => a["provider"] || "synthetic_reservation",
      "transaction_id" => a["transaction_id"] || a["execution_id"] || Ecto.UUID.generate(),
      "execution_id" => a["execution_id"],
      "economic_event_type" => a["economic_event_type"] || "commission_confirmed",
      "commission_pool" => a["commission_pool"] || 15.0,
      "currency" => a["currency"] || "USD",
      "status" => a["status"] || "confirmed",
      "settlement_state" => a["settlement_state"] || "simulated_settled",
      "synthetic" => true,
      "live" => false
    })
  end

  @doc "LLM cannot create economic facts."
  def llm_can_create_economic_fact?, do: false

  def accept_llm_economic_claim?(_), do: false

  defp default_status("commission_confirmed"), do: "confirmed"
  defp default_status("commission_reversed"), do: "reversed"
  defp default_status("experience_completed"), do: "observed"
  defp default_status("transaction_settled"), do: "confirmed"
  defp default_status("no_commission"), do: "confirmed"
  defp default_status(_), do: "unknown"

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
