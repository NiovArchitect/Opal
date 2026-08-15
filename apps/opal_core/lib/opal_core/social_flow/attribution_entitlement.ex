defmodule OpalCore.SocialFlow.AttributionEntitlement do
  @moduledoc """
  Attribution Entitlement candidates (Pass 21).

  NOT cash. NOT a wallet balance. NOT a payout.

  Attribution: “Chanelle's Moment helped cause this.”
  Entitlement: “Under current policy, Chanelle may participate in the value pool.”
  Payout: “Money was actually sent.” — FUTURE ONLY.

  Policy version: econ-dev-0.1 (non-monetary; no split percentages).
  """

  alias OpalCore.SocialFlow.AttributionGraph

  @policy_version "econ-dev-0.1"

  # Non-monetary eligibility under default policy — not payout formula
  @strength_policy %{
    "direct_causal" => "eligible",
    "strong_assist" => "eligible_for_policy_review",
    "weak_assist" => "eligible_for_policy_review",
    "non_causal_exposure" => "ineligible"
  }

  def policy_version, do: @policy_version
  def strength_policy, do: @strength_policy

  @doc """
  Build entitlement candidates from a qualification + its attribution.

  Only when qualification is qualified (or pending for candidate visibility).
  Reversed / no_value → entitlements reversed/ineligible.
  """
  def from_qualification(qualification) when is_map(qualification) do
    q = stringify(qualification)
    attribution = stringify(q["attribution"] || %{})
    status = q["status"]
    pool = q["pool"]
    pool_id = if is_map(pool), do: pool["pool_id"], else: nil

    contributors = List.wrap(attribution["contributors"])

    case status do
      "no_value" ->
        Enum.map(contributors, fn c -> entitlement(c, q, pool_id, "ineligible", "no_economic_value") end)

      "reversed" ->
        Enum.map(contributors, fn c -> entitlement(c, q, pool_id, "reversed", "economic_reversed") end)

      "abstain" ->
        []

      "unknown" ->
        []

      "pending" ->
        # Candidates only — not qualified money
        contributors
        |> Enum.map(fn c ->
          role = policy_role(c)
          ent_status = if role == "ineligible", do: "ineligible", else: "candidate"
          entitlement(c, q, pool_id, ent_status, "awaiting_qualification")
        end)
        |> Enum.reject(&(&1["status"] == "ineligible" and &1["causal_strength"] == "non_causal_exposure"))

      "qualified" ->
        contributors
        |> Enum.map(fn c ->
          role = policy_role(c)

          ent_status =
            case role do
              "eligible" -> "qualified"
              "eligible_for_policy_review" -> "candidate"
              _ -> "ineligible"
            end

          entitlement(c, q, pool_id, ent_status, "policy_#{@policy_version}")
        end)

      _ ->
        []
    end
    # Hard: recruitment never
    |> Enum.reject(fn e -> e["recruitment"] == true end)
    |> then(fn ents ->
      if q["risk_hold"] == true do
        Enum.map(ents, &Map.put(&1, "risk_hold", true))
      else
        ents
      end
    end)
  end

  def from_qualification(_), do: []

  @doc "View-only exposure never creates entitlement."
  def view_only_creates_entitlement?, do: false

  @doc "Recruitment never creates entitlement."
  def recruitment_creates_entitlement?, do: false

  @doc "Creator entitlement must not leak downstream identity."
  def leaks_downstream_identity?, do: false

  @doc "Safe product-facing summary for a creator (future UI) — no who/when privacy leak."
  def privacy_safe_creator_summary(entitlement) when is_map(entitlement) do
    e = stringify(entitlement)

    case e["status"] do
      "qualified" ->
        %{
          "copy" => "Your Moment inspired a completed experience.",
          "shows_who" => false,
          "shows_when" => false,
          "shows_where_exact" => false,
          "is_payout" => false,
          "live_economic" => false
        }

      "candidate" ->
        %{
          "copy" => "Your Moment may be linked to an experience under review.",
          "shows_who" => false,
          "is_payout" => false
        }

      _ ->
        %{"copy" => nil, "is_payout" => false}
    end
  end

  def privacy_safe_creator_summary(_), do: %{"is_payout" => false}

  # --- internals ---

  defp policy_role(contributor) do
    c = stringify(contributor)
    strength = c["strength"] || AttributionGraph.classify_strength(c["evidence"] || %{})
    Map.get(@strength_policy, strength, "ineligible")
  end

  defp entitlement(contributor, q, pool_id, status, reason) do
    c = stringify(contributor)
    strength = c["strength"] || "non_causal_exposure"
    role = policy_role(c)

    %{
      "schema" => "attribution_entitlement.v1",
      "entitlement_id" => Ecto.UUID.generate(),
      "qualification_id" => q["qualification_id"],
      "attribution_source_id" => c["moment_id"],
      "author_user_id" => c["author_user_id"],
      "role" => role,
      "causal_strength" => strength,
      "hop" => c["hop"] || 0,
      "eligible_pool_id" => pool_id,
      "policy_version" => @policy_version,
      "status" => status,
      "reason" => reason,
      "is_payout" => false,
      "live_economic" => q["live_economic"] == true,
      "simulation" => q["simulation"] != false,
      "recruitment" => false,
      "bank_data" => nil,
      "payment_data" => nil,
      "downstream_identity_leaked" => false
    }
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
