defmodule OpalCore.SocialFlow.ProviderEconomicIngest do
  @moduledoc """
  Provider economic event ingest pipeline (Pass 22).

  Flow:

  raw/normalized event
  → webhook verify (when applicable)
  → adapter observe / normalize
  → durable store (dedupe)
  → ProviderEconomicFact
  → EconomicPool (one lineage per transaction)
  → EconomicQualification
  → AttributionEntitlement

  Out-of-order events converge by replaying transaction history.

  LIVE ECONOMIC VALUE = NOT PROVEN.
  No payouts. No social ranking feedback.
  """

  alias OpalCore.SocialFlow.{
    EconomicPool,
    EconomicQualification,
    ProviderEconomicAdapter,
    ProviderEconomicEventStore,
    ProviderEconomicFact
  }

  def status, do: ProviderEconomicAdapter.status()

  @doc """
  Ingest a provider economic/completion event for a transaction.

  opts:
  - causal_chain for attribution join
  - execution_status default confirmed
  - skip_webhook_verify
  """
  def ingest(attrs, opts \\ []) when is_map(attrs) do
    a = stringify(attrs)
    ProviderEconomicEventStore.ensure_started()

    with :ok <- maybe_verify(a, opts),
         {:ok, event} <- normalize_or_observe(a),
         {:ok, stored, origin} <- ProviderEconomicEventStore.put(event) do
      # Always recompute from full history for out-of-order convergence
      history = ProviderEconomicEventStore.history(stored["transaction_id"] || stored["execution_id"])
      projection = project_transaction(history, a, opts)

      {:ok,
       Map.merge(projection, %{
         "event" => stored,
         "ingest_origin" => origin,
         "history_count" => length(history),
         "live_economic_value" => "NOT_PROVEN",
         "is_payout" => false,
         "privacy" => EconomicQualification.privacy_invariants()
       })}
    end
  end

  @doc "Recompute projection from stored history (no new event)."
  def reproject(transaction_id, opts \\ []) when is_binary(transaction_id) do
    ProviderEconomicEventStore.ensure_started()
    history = ProviderEconomicEventStore.history(transaction_id)
    ctx = opts_to_map(opts)
    {:ok, project_transaction(history, Map.put(ctx, "transaction_id", transaction_id), opts)}
  end

  @doc """
  Project a transaction's economic state from ordered event history.

  Provider truth for terminal reverse wins.
  Latest commission amount updates pool (history retained in store).
  """
  def project_transaction(history, ctx \\ %{}, opts \\ [])

  def project_transaction(history, ctx, opts) when is_list(history) do
    c = stringify(ctx || %{})
    causal = Keyword.get(opts, :causal_chain) || c["causal_chain"] || []
    opal = Keyword.get(opts, :opal_recommended) || c["opal_recommended"] == true

    # Terminal precedence: reverse > cancel > settled/commission > completed > unknown
    latest_by_type = Enum.reduce(history, %{}, fn e, acc -> Map.put(acc, e["economic_event_type"], e) end)
    last = List.last(history)

    reversed? = Enum.any?(history, &(&1["status"] == "reversed" or &1["economic_event_type"] == "commission_reversed"))
    cancelled? = Enum.any?(history, &(&1["cancelled"] == true or &1["status"] == "cancelled"))
    completed? = Enum.any?(history, &(&1["completion"] == true or &1["experience_completed"] == true or &1["economic_event_type"] == "experience_completed"))

    commission_events =
      Enum.filter(history, fn e ->
        e["economic_event_type"] in ~w(commission_confirmed commission_observed transaction_settled no_commission) and
          e["status"] != "reversed"
      end)

    primary_economic =
      cond do
        reversed? ->
          Enum.find(history, &(&1["economic_event_type"] == "commission_reversed")) || last

        cancelled? and commission_events == [] ->
          Enum.find(history, &(&1["cancelled"] == true)) || last

        commission_events != [] ->
          # Latest non-reversed commission-bearing event (amount evolution)
          List.last(commission_events)

        true ->
          last
      end

    fact =
      if is_map(primary_economic) do
        to_fact(primary_economic)
      else
        nil
      end

    pool =
      if is_map(fact) and fact["commission_pool"] not in [nil] do
        EconomicPool.from_economic_fact(fact)
        |> Map.put("history_event_count", length(history))
        |> Map.put("pool_version", length(commission_events))
      else
        nil
      end

    # Finality recommendation (no money movement)
    finality = derive_finality(history, primary_economic)

    exec_status =
      cond do
        reversed? -> "confirmed"
        cancelled? -> "cancelled"
        true -> c["execution_status"] || "confirmed"
      end

    qualification =
      EconomicQualification.qualify(%{
        "execution_status" => exec_status,
        "execution_id" => c["execution_id"] || (primary_economic && primary_economic["execution_id"]),
        "transaction_id" => c["transaction_id"] || (primary_economic && primary_economic["transaction_id"]),
        "experience_completed" => completed?,
        "provider_economic_fact" => fact,
        "cancelled" => cancelled? and not reversed?,
        "prior_qualification_status" => c["prior_qualification_status"],
        "prior_pool" => c["prior_pool"],
        "causal_chain" => causal,
        "opal_recommended" => opal,
        "recruitment_event" => c["recruitment_event"] == true,
        "risk_hold" => c["risk_hold"] == true
      })

    %{
      "transaction_id" => qualification["transaction_id"],
      "fact" => fact,
      "pool" => pool || qualification["pool"],
      "qualification" => qualification,
      "entitlements" => qualification["entitlements"],
      "attribution" => qualification["attribution"],
      "finality" => finality,
      "finality_recommendation" => finality_recommendation(),
      "completed" => completed?,
      "reversed" => reversed?,
      "cancelled" => cancelled?,
      "source_mode" => primary_economic && primary_economic["source_mode"],
      "provider_contract_version" => primary_economic && primary_economic["provider_contract_version"],
      "currency" => (pool && pool["currency"]) || (fact && fact["currency"]),
      "is_payout" => false,
      "live_economic" => false,
      "simulation_or_recorded" => true,
      "social_rank_unaffected" => true,
      "visibility_unaffected" => true,
      "latest_by_type" => Map.keys(latest_by_type)
    }
  end

  def project_transaction(_, _, _), do: %{"qualification" => %{"status" => "abstain"}, "is_payout" => false}

  def finality_recommendation do
    %{
      "provisional" => "experience_completed without commission",
      "earned" => "commission_confirmed — preferred for QUALIFIED entitlement candidate",
      "settled" => "transaction_settled — stronger finality; still not payout",
      "reversed" => "clawback/refund/chargeback",
      "payout_finality" => "NOT_IN_PASS_22",
      "recommendation" =>
        "Qualify entitlement candidates at commission_confirmed (earned); " <>
          "treat transaction_settled as stronger audit finality; " <>
          "never move money until payout policy + compliance exist."
    }
  end

  # --- internals ---

  defp maybe_verify(a, opts) do
    if Keyword.get(opts, :skip_webhook_verify, false) or
         a["mode"] in ~w(recorded_fixture synthetic) or
         a["source_mode"] in ~w(recorded_fixture synthetic) do
      :ok
    else
      case ProviderEconomicAdapter.verify_webhook(a) do
        {:ok, _} -> :ok
        {:error, _} = err -> err
      end
    end
  end

  defp normalize_or_observe(a) do
    if is_binary(a["economic_event_type"]) and is_binary(a["economic_event_id"]) and a["pre_normalized"] == true do
      {:ok, a}
    else
      ProviderEconomicAdapter.observe_economic_event(a)
    end
  end

  defp to_fact(event) when is_map(event) do
    e = stringify(event)

    ProviderEconomicFact.envelope(%{
      "provider" => e["provider"],
      "transaction_id" => e["transaction_id"] || e["provider_transaction_id"],
      "execution_id" => e["execution_id"],
      "economic_event_type" => e["economic_event_type"],
      "economic_event_id" => e["economic_event_id"],
      "commission_pool" => e["commission_pool"] || e["commission_value"],
      "gross_value" => e["gross_value"],
      "currency" => e["currency"] || "USD",
      "status" => e["status"] || "confirmed",
      "settlement_state" => e["settlement_state"],
      "observed_at" => e["observed_at"],
      "reversal_reason" => e["reversal_reason"],
      "synthetic" => e["source_mode"] != "live",
      "live" => false,
      "source" => e["source_mode"] || "recorded_fixture",
      "provider_contract_version" => e["provider_contract_version"],
      "finality" => e["finality"],
      "source_mode" => e["source_mode"]
    })
    |> Map.put("economic_event_id", e["economic_event_id"])
    |> Map.put("provider_contract_version", e["provider_contract_version"])
    |> Map.put("finality", e["finality"])
    |> Map.put("source_mode", e["source_mode"])
    |> Map.put("partial", e["partial"] == true)
  end

  defp derive_finality(history, primary) do
    cond do
      Enum.any?(history, &(&1["finality"] == "reversed" or &1["status"] == "reversed")) ->
        "reversed"

      Enum.any?(history, &(&1["finality"] == "settled" or &1["economic_event_type"] == "transaction_settled")) ->
        "settled"

      Enum.any?(history, &(&1["finality"] == "earned" or &1["economic_event_type"] in ~w(commission_confirmed no_commission))) ->
        "earned"

      is_map(primary) and primary["completion"] == true ->
        "provisional"

      true ->
        "provisional"
    end
  end

  defp opts_to_map(opts) when is_list(opts), do: Map.new(opts, fn {k, v} -> {to_string(k), v} end)
  defp opts_to_map(opts) when is_map(opts), do: stringify(opts)
  defp opts_to_map(_), do: %{}

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
