defmodule OpalCore.SocialFlow.EconomicQualification do
  @moduledoc """
  Economic Qualification owner (Pass 21).

  ## Three layers (never collapse)

  1. **Attribution** — who caused the value (AttributionGraph)
  2. **Qualification** — whether economic value actually exists (this module)
  3. **Payout** — money sent (FUTURE — NOT built here)

  ## Law

  CONFIRMED BOOKING ≠ ECONOMIC VALUE EARNED

  A confirmed reservation creates at most PENDING qualification.
  QUALIFIED requires provider economic fact (completion/commission/settlement).
  Cancellation / reversal → NO_VALUE or REVERSED.

  LIVE ECONOMIC: NOT CLAIMED. Simulation labeled explicitly.
  No wallet. No creator cash UI. No payouts.
  """

  alias OpalCore.SocialFlow.{
    AttributionEntitlement,
    AttributionGraph,
    EconomicPool,
    ProviderEconomicFact
  }

  @states ~w(no_value pending qualified reversed expired unknown abstain)
  @policy_version "econ-dev-0.1"

  def states, do: @states
  def policy_version, do: @policy_version

  def status do
    Map.merge(ProviderEconomicFact.status(), %{
      "qualification_owner" => "EconomicQualification",
      "attribution_owner" => "AttributionGraph",
      "entitlement_owner" => "AttributionEntitlement",
      "policy_version" => @policy_version,
      "is_payout" => false,
      "is_accounting_ledger" => false,
      "is_wallet" => false,
      "pass18_holds" => [
        "390_audience_selector_ux_incomplete",
        "realtime_pubsub_audience_routing_audit"
      ],
      "tax_compliance" => "future_payout_blocker",
      "fraud_engine" => "not_built_supports_risk_hold"
    })
  end

  @doc """
  Qualify economic value for a transaction/execution context.

  Input attrs:
  - execution_status: confirmed | cancelled | failed | held | ...
  - experience_completed: boolean (provider truth, not event start time alone)
  - provider_economic_fact: envelope or nil
  - cancelled / reversed flags
  - transaction_id / execution_id
  - attribution: optional precomputed AttributionGraph result
  - causal_chain / simulation flags for attribution

  Returns qualification record — NOT a payout.
  """
  def qualify(attrs) when is_map(attrs) do
    a = stringify(attrs)
    exec = a["execution_status"] || a["status"] || "none"
    fact = normalize_fact(a["provider_economic_fact"] || a["economic_fact"])
    completed = a["experience_completed"] == true or a["completed"] == true
    cancelled = exec in ~w(cancelled canceled) or a["cancelled"] == true
    failed = exec in ~w(failed expired)
    confirmed = exec in ~w(confirmed)
    held = exec in ~w(held)
    risk_hold = a["risk_hold"] == true

    cond do
      # LLM-invented facts rejected (hard invariant)
      is_map(fact) and fact["llm_invented"] == true ->
        result(a, "abstain", "llm_cannot_create_economic_fact", nil)

      cancelled and not post_qualified_reversal?(a, fact) ->
        # Cancel before qualification → no value (history may remain elsewhere)
        result(a, "no_value", "cancelled_before_qualification", nil)

      is_map(fact) and fact_reversed?(fact) ->
        pool = EconomicPool.from_economic_fact(fact)
        result(a, "reversed", "provider_economic_reversal", pool)

      a["prior_qualification_status"] == "qualified" and
          (cancelled or fact_reversed?(fact)) ->
        pool = if is_map(fact), do: EconomicPool.from_economic_fact(fact), else: prior_pool(a)
        result(a, "reversed", "post_qualification_reversal", pool)

      failed ->
        result(a, "no_value", "execution_failed", nil)

      held ->
        result(a, "no_value", "held_not_confirmed", nil)

      # Confirmed only, no completion / economic fact → PENDING
      confirmed and not completed and fact_missing_or_unknown?(fact) ->
        result(a, "pending", "confirmed_booking_not_economic_value", nil)

      confirmed and completed and fact_missing_or_unknown?(fact) ->
        # Completion claimed but no economic provenance → abstain/unknown
        result(a, "unknown", "provider_economic_truth_missing", nil)

      # No commission
      is_map(fact) and fact["economic_event_type"] == "no_commission" ->
        pool = EconomicPool.from_economic_fact(fact)
        result(a, "no_value", "provider_no_commission", pool)

      # QUALIFIED: provider economic fact confirms value
      is_map(fact) and fact_qualifying?(fact) and (completed or fact_settled?(fact)) ->
        pool = EconomicPool.from_economic_fact(fact)

        q =
          result(a, "qualified", "provider_economic_value_observed", pool)
          |> Map.put("risk_hold", risk_hold)

        q

      confirmed and is_map(fact) and fact_qualifying?(fact) and not completed and
          not fact_settled?(fact) ->
        pool = EconomicPool.from_economic_fact(fact)
        result(a, "pending", "economic_fact_observed_awaiting_completion", pool)

      true ->
        result(a, "no_value", "not_eligible", nil)
    end
    |> attach_attribution(a)
    |> attach_entitlements()
    |> Map.put("is_payout", false)
    |> Map.put("is_accounting_ledger", false)
  end

  def qualify(_), do: result(%{}, "abstain", "invalid", nil)

  @doc "Confirmed booking alone is never earned value."
  def confirmed_booking_equals_earned_value?, do: false

  @doc "Cancellation does not qualify."
  def cancelled_booking_qualifies?, do: false

  @doc "LLM cannot create economic facts."
  def llm_can_create_economic_fact?, do: ProviderEconomicFact.llm_can_create_economic_fact?()

  @doc """
  Full structural chain for proof:

  execution + completion + economic fact + causal chain
  → attribution + qualification + entitlement candidates
  """
  def qualify_transaction_chain(attrs) when is_map(attrs) do
    a = stringify(attrs)
    q = qualify(a)

    %{
      "qualification" => q,
      "attribution" => q["attribution"],
      "entitlements" => q["entitlements"],
      "pool" => q["pool"],
      "is_payout" => false,
      "live_economic" => q["live_economic"] == true,
      "simulation" => q["simulation"] == true,
      "privacy" => privacy_invariants(),
      "policy_version" => @policy_version
    }
  end

  def qualify_transaction_chain(_), do: qualify(%{})

  def privacy_invariants do
    %{
      "creator_sees_who_booked" => false,
      "creator_sees_attendees" => false,
      "creator_sees_relationship" => false,
      "creator_sees_calendar" => false,
      "creator_sees_conversation" => false,
      "public_moment_shows_earnings" => false,
      "provider_sees_social_graph" => false,
      "safe_creator_future_copy" => "Your Moment inspired a completed experience.",
      "forbidden_creator_copy" => "Jordan booked with Chanelle Thursday at 7."
    }
  end

  def development_debug_snapshot(qualification) when is_map(qualification) do
    q = stringify(qualification)

    %{
      "development_only" => true,
      "transaction_id" => q["transaction_id"],
      "qualification_status" => q["status"],
      "reason" => q["reason"],
      "pool" => q["pool"],
      "attribution_status" => get_in(q, ["attribution", "status"]),
      "entitlement_count" => length(List.wrap(q["entitlements"])),
      "policy_version" => q["policy_version"],
      "live_economic" => false,
      "is_payout" => false,
      "not_product_ui" => true
    }
  end

  def development_debug_snapshot(_), do: %{"development_only" => true, "is_payout" => false}

  # --- internals ---

  defp attach_attribution(q, a) do
    attribution =
      cond do
        is_map(a["attribution"]) ->
          stringify(a["attribution"])

        true ->
          AttributionGraph.attribute_transaction(%{
            "id" => q["transaction_id"] || a["transaction_id"] || a["execution_id"],
            "status" => attribution_tx_status(q, a),
            "reality_id" => a["reality_id"],
            "place_identity" => a["place_identity"],
            "causal_chain" => a["causal_chain"] || [],
            "simulation" => q["simulation"] == true,
            "opal_recommended" => a["opal_recommended"] == true,
            "provider_supplied_discovery" => a["provider_supplied_discovery"] == true,
            "recruitment_event" => a["recruitment_event"] == true,
            "amount_pool" => get_in(q, ["pool", "amount"]),
            "force_attribute" => a["force_attribute"] == true
          })
      end

    Map.put(q, "attribution", attribution)
  end

  defp attach_entitlements(q) do
    ents = AttributionEntitlement.from_qualification(q)
    Map.put(q, "entitlements", ents)
  end

  defp attribution_tx_status(q, a) do
    cond do
      q["status"] in ~w(qualified pending) -> "completed"
      a["experience_completed"] == true -> "completed"
      a["execution_status"] in ~w(confirmed) -> "completed"
      a["execution_status"] in ~w(cancelled canceled) -> "cancelled"
      true -> a["execution_status"] || "none"
    end
  end

  defp result(a, status, reason, pool) do
    simulation =
      cond do
        is_map(pool) -> pool["simulation"] == true or pool["live_economic"] != true
        is_map(a["provider_economic_fact"]) ->
          f = stringify(a["provider_economic_fact"])
          f["simulation"] == true or f["live_economic"] != true

        true ->
          true
      end

    %{
      "schema" => "economic_qualification.v1",
      "qualification_id" => a["qualification_id"] || Ecto.UUID.generate(),
      "transaction_id" => a["transaction_id"] || a["execution_id"],
      "execution_id" => a["execution_id"],
      "reality_id" => a["reality_id"],
      "status" => status,
      "reason" => reason,
      "pool" => pool,
      "policy_version" => @policy_version,
      "simulation" => simulation,
      "live_economic" => is_map(pool) and pool["live_economic"] == true,
      "is_payout" => false,
      "confirmed_booking_equals_earned_value" => false,
      "risk_hold" => a["risk_hold"] == true,
      "historical_record_retained" => true
    }
  end

  defp normalize_fact(nil), do: nil
  defp normalize_fact({:error, _}), do: nil

  defp normalize_fact(fact) when is_map(fact) do
    f = stringify(fact)

    if f["provenance"] do
      f
    else
      # wrap loose maps
      case ProviderEconomicFact.envelope(f) do
        %{} = env -> env
        _ -> f
      end
    end
  end

  defp normalize_fact(_), do: nil

  defp fact_missing_or_unknown?(nil), do: true

  defp fact_missing_or_unknown?(fact) do
    f = stringify(fact)
    f["status"] in [nil, "unknown"] and f["economic_event_type"] in [nil, "unknown"]
  end

  defp fact_qualifying?(fact) do
    f = stringify(fact)

    f["economic_event_type"] in ~w(commission_confirmed commission_observed transaction_settled experience_completed) and
      f["status"] not in ~w(reversed unknown) and
      f["economic_event_type"] != "no_commission"
  end

  defp fact_settled?(fact) do
    f = stringify(fact)

    f["settlement_state"] in ~w(settled simulated_settled confirmed) or
      f["economic_event_type"] in ~w(transaction_settled commission_confirmed)
  end

  defp fact_reversed?(nil), do: false

  defp fact_reversed?(fact) do
    f = stringify(fact)
    f["status"] == "reversed" or f["economic_event_type"] == "commission_reversed"
  end

  defp post_qualified_reversal?(a, fact) do
    a["prior_qualification_status"] == "qualified" or fact_reversed?(fact)
  end

  defp prior_pool(a) do
    if is_map(a["prior_pool"]), do: stringify(a["prior_pool"]), else: nil
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
