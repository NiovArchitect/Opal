defmodule OpalCore.SocialFlow.ProviderEconomicAdapter do
  @moduledoc """
  Provider economic + completion adapter foundation (Pass 22).

  Modes (explicit — never ambiguous “provider-backed”):

  - LIVE — real partner economic API (NOT available / NOT claimed)
  - SANDBOX — partner sandbox (NOT wired)
  - RECORDED_FIXTURE — deterministic recorded events for proof
  - SYNTHETIC — local synthetic outcomes for development
  - UNKNOWN

  LIVE ECONOMIC VALUE = NOT PROVEN.

  Does not scrape. Does not invent commission from booking alone.
  Does not build payouts.
  """

  alias OpalCore.SocialFlow.ProviderEconomicContract

  @modes ~w(live sandbox recorded_fixture synthetic unknown)

  def modes, do: @modes

  def status do
    %{
      "adapter" => "ProviderEconomicAdapter",
      "default_mode" => "recorded_fixture",
      "live_reservation_provider" => false,
      "live_completion_provider" => false,
      "live_economic_provider" => false,
      "live_commission" => false,
      "live_financial_settlement" => false,
      "live_creator_payout" => false,
      "live_economic_value" => "NOT_PROVEN",
      "webhook_auth" => "required_when_live",
      "pass18_holds" => [
        "390_audience_selector_ux_incomplete",
        "realtime_pubsub_audience_routing_audit"
      ]
    }
  end

  @doc """
  Observe a normalized economic/completion event for a transaction reference.

  attrs:
  - provider
  - execution_id / transaction_id / provider_transaction_id
  - scenario: completed_commission | completed_zero | cancelled | reversed |
              unknown | partial | settled | experience_completed
  - economic_event_id (optional; generated for fixtures)
  - mode: recorded_fixture | synthetic | live | sandbox
  - observed_at / amount overrides
  - webhook_signature for live path verification
  """
  def observe_economic_event(attrs) when is_map(attrs) do
    a = stringify(attrs)
    mode = normalize_mode(a["mode"] || a["source_mode"] || "recorded_fixture")

    cond do
      mode == "live" ->
        {:error, :live_economic_provider_not_available}

      mode == "sandbox" ->
        {:error, :sandbox_economic_provider_not_wired}

      mode in ~w(recorded_fixture synthetic) ->
        build_event(a, mode)

      true ->
        {:error, :unknown_mode}
    end
  end

  def observe_economic_event(_), do: {:error, :invalid}

  @doc "Verify webhook authenticity for live path (not live yet)."
  def verify_webhook(attrs) when is_map(attrs) do
    a = stringify(attrs)

    cond do
      a["mode"] in ~w(recorded_fixture synthetic) ->
        # Fixture path does not require crypto signature
        {:ok, %{"verified" => true, "mode" => a["mode"], "live" => false}}

      is_nil(a["signature"]) or a["signature"] == "" ->
        {:error, :unauthenticated_webhook}

      a["signature"] == "invalid" ->
        {:error, :invalid_signature}

      # Live would verify HMAC/public key — not implemented without provider
      true ->
        {:error, :live_webhook_verification_not_configured}
    end
  end

  def verify_webhook(_), do: {:error, :invalid}

  @doc "Recorded fixture catalog for proof cases."
  def recorded_scenarios, do: ~w(
    completed_commission
    completed_zero
    cancelled
    reversed
    unknown
    partial
    settled
    experience_completed
  )

  # --- internals ---

  defp build_event(a, mode) do
    provider = a["provider"] || default_provider(mode)
    scenario = a["scenario"] || "completed_commission"
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)
    observed = parse_dt(a["observed_at"]) || now
    tx = a["transaction_id"] || a["provider_transaction_id"] || a["execution_id"]
    exec = a["execution_id"] || tx
    event_id = a["economic_event_id"] || "ee-#{scenario}-#{:erlang.phash2({tx, scenario, a["dedupe_key"]})}"

    with {:ok, contract} <- resolve_contract(provider, observed, a) do
      base = %{
        "provider" => provider,
        "provider_transaction_id" => tx,
        "transaction_id" => tx,
        "execution_id" => exec,
        "economic_event_id" => event_id,
        "source_mode" => mode,
        "mode" => mode,
        "observed_at" => observed,
        "effective_at" => parse_dt(a["effective_at"]) || observed,
        "provider_contract_version" => contract["contract_version"],
        "currency" => a["currency"] || contract["currency"] || "USD",
        "live" => false,
        "synthetic" => mode == "synthetic",
        "recorded" => mode == "recorded_fixture",
        "raw_source_reference" => a["raw_source_reference"] || "fixture:#{scenario}",
        "llm_invented" => false
      }

      event =
        case scenario do
          "experience_completed" ->
            Map.merge(base, %{
              "economic_event_type" => "experience_completed",
              "transaction_type" => "reservation",
              "status" => "observed",
              "commission_value" => nil,
              "commission_pool" => nil,
              "finality" => "provisional",
              "completion" => true,
              "settlement_state" => "unknown"
            })

          "completed_commission" ->
            amount = a["commission_value"] || contract["fixed_commission"] || 12.0

            Map.merge(base, %{
              "economic_event_type" => "commission_confirmed",
              "transaction_type" => "reservation",
              "status" => "confirmed",
              "commission_value" => amount,
              "commission_pool" => amount,
              "commission_basis" => contract["commission_model"],
              "gross_value" => a["gross_value"],
              "finality" => "earned",
              "completion" => true,
              "settlement_state" => "unsettled",
              "experience_completed" => true
            })

          "completed_zero" ->
            Map.merge(base, %{
              "economic_event_type" => "no_commission",
              "transaction_type" => "reservation",
              "status" => "confirmed",
              "commission_value" => 0.0,
              "commission_pool" => 0.0,
              "finality" => "earned",
              "completion" => true,
              "settlement_state" => "n/a",
              "experience_completed" => true
            })

          "partial" ->
            amount = a["commission_value"] || 6.0

            Map.merge(base, %{
              "economic_event_type" => "commission_confirmed",
              "transaction_type" => "reservation",
              "status" => "confirmed",
              "commission_value" => amount,
              "commission_pool" => amount,
              "partial" => true,
              "finality" => "earned",
              "completion" => true,
              "settlement_state" => "unsettled",
              "experience_completed" => true,
              "note" => "partial commission after cancellation fee"
            })

          "settled" ->
            amount = a["commission_value"] || contract["fixed_commission"] || 12.0

            Map.merge(base, %{
              "economic_event_type" => "transaction_settled",
              "transaction_type" => "reservation",
              "status" => "confirmed",
              "commission_value" => amount,
              "commission_pool" => amount,
              "finality" => "settled",
              "completion" => true,
              "settlement_state" => "settled",
              "settled_at" => observed,
              "experience_completed" => true
            })

          "cancelled" ->
            Map.merge(base, %{
              "economic_event_type" => "unknown",
              "transaction_type" => "reservation",
              "status" => "cancelled",
              "commission_value" => 0.0,
              "commission_pool" => 0.0,
              "finality" => "reversed",
              "completion" => false,
              "cancelled" => true,
              "settlement_state" => "n/a"
            })

          "reversed" ->
            Map.merge(base, %{
              "economic_event_type" => "commission_reversed",
              "transaction_type" => "reservation",
              "status" => "reversed",
              "commission_value" => a["commission_value"] || 12.0,
              "commission_pool" => a["commission_value"] || 12.0,
              "finality" => "reversed",
              "reversal_reason" => a["reversal_reason"] || "provider_clawback",
              "reversal_reference" => a["reversal_reference"] || "rev-#{event_id}",
              "completion" => true,
              "settlement_state" => "reversed"
            })

          "unknown" ->
            Map.merge(base, %{
              "economic_event_type" => "unknown",
              "transaction_type" => "reservation",
              "status" => "unknown",
              "commission_value" => nil,
              "commission_pool" => nil,
              "finality" => "provisional",
              "completion" => false,
              "settlement_state" => "unknown"
            })

          other ->
            Map.merge(base, %{
              "economic_event_type" => "unknown",
              "status" => "unknown",
              "scenario" => other,
              "finality" => "provisional"
            })
        end

      {:ok, event}
    end
  end

  defp resolve_contract(provider, observed, a) do
    cond do
      is_binary(a["provider_contract_version"]) ->
        ProviderEconomicContract.get_version(provider, a["provider_contract_version"])

      true ->
        ProviderEconomicContract.resolve(provider, observed)
    end
  end

  defp default_provider("synthetic"), do: "synthetic_reservation"
  defp default_provider(_), do: "recorded_reservation_econ"

  defp normalize_mode(m) do
    case to_string(m || "recorded_fixture") |> String.downcase() do
      "live" -> "live"
      "sandbox" -> "sandbox"
      "recorded_fixture" -> "recorded_fixture"
      "recorded" -> "recorded_fixture"
      "synthetic" -> "synthetic"
      "simulation" -> "synthetic"
      _ -> "unknown"
    end
  end

  defp parse_dt(nil), do: nil
  defp parse_dt(%DateTime{} = d), do: d

  defp parse_dt(s) when is_binary(s) do
    case DateTime.from_iso8601(s) do
      {:ok, dt, _} -> dt
      _ -> nil
    end
  end

  defp parse_dt(_), do: nil

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
