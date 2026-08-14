defmodule OpalCore.SocialFlow.AttributionGraph do
  @moduledoc """
  Causal Attribution Graph (Pass 15 add-on).

  ATTRIBUTION determines who causally contributed to value.
  PAYOUT POLICY (separate, future) determines how a pool is divided.

  Hard laws:
  - No transaction → no economic attribution
  - No recruiting payouts
  - Finite hop depth (default max 3 meaningful generations)
  - One bounded economic pool (does not grow with lineage length)
  - Social ranking must not use commission value
  - Views/likes alone are NON_CAUSAL

  LIVE ECONOMIC ATTRIBUTION: NOT CLAIMED — structural + synthetic proof only.
  """

  @strengths ~w(direct_causal strong_assist weak_assist non_causal_exposure)
  @default_max_hops 3

  def strengths, do: @strengths
  def default_max_hops, do: @default_max_hops

  @doc """
  Classify causal strength from evidence signals.

  Evidence keys (booleans / counts):
  - seeded_reality_from_moment
  - shared_into_conversation
  - place_remained_to_transaction
  - opened_only
  - liked_only
  - viewed_only
  - independent_search
  - months_since_view
  """
  def classify_strength(evidence) when is_map(evidence) do
    e = stringify(evidence)

    cond do
      e["recruitment_only"] == true ->
        "non_causal_exposure"

      e["viewed_only"] == true or e["liked_only"] == true or e["opened_only"] == true ->
        if e["seeded_reality_from_moment"] == true or e["shared_into_conversation"] == true do
          "strong_assist"
        else
          "non_causal_exposure"
        end

      e["seeded_reality_from_moment"] == true and e["place_remained_to_transaction"] == true ->
        "direct_causal"

      e["seeded_reality_from_moment"] == true ->
        "strong_assist"

      e["shared_into_conversation"] == true and e["place_remained_to_transaction"] == true ->
        "strong_assist"

      e["independent_search"] == true and e["months_since_view"] not in [nil, 0] ->
        "non_causal_exposure"

      e["shared_into_conversation"] == true ->
        "weak_assist"

      true ->
        "non_causal_exposure"
    end
  end

  def classify_strength(_), do: "non_causal_exposure"

  @doc """
  Build attribution for a completed (or simulated) provider transaction.

  transaction:
  - id, provider_entity_id, amount_pool (optional), status
  - reality_id, place_identity
  - causal_chain: list of %{moment_id, author_user_id, evidence, hop}

  Returns attribution record — NOT a payout instruction.
  """
  def attribute_transaction(transaction, opts \\ [])

  def attribute_transaction(transaction, opts) when is_map(transaction) do
    t = stringify(transaction)
    max_hops = Keyword.get(opts, :max_hops, @default_max_hops)
    status = t["status"] || t["execution_state"] || "none"

    cond do
      status in ~w(none unverified failed cancelled canceled) and t["force_attribute"] != true ->
        abstain(t, "no_completed_transaction")

      t["recruitment_event"] == true ->
        abstain(t, "recruitment_not_attributable")

      true ->
        chain =
          t["causal_chain"]
          |> List.wrap()
          |> Enum.map(&stringify/1)
          |> Enum.with_index()
          |> Enum.map(fn {node, idx} ->
            hop = node["hop"] || idx
            strength = classify_strength(node["evidence"] || %{})

            %{
              "moment_id" => node["moment_id"],
              "author_user_id" => node["author_user_id"],
              "hop" => hop,
              "strength" => strength,
              "within_depth" => hop < max_hops,
              "evidence" => node["evidence"] || %{}
            }
          end)
          |> Enum.filter(fn n ->
            n["within_depth"] and n["strength"] != "non_causal_exposure"
          end)

        if chain == [] do
          # Opal-as-source or provider-as-source — no creator attribution
          %{
            "schema" => "attribution.v1",
            "transaction_id" => t["id"],
            "reality_id" => t["reality_id"],
            "place_identity" => t["place_identity"],
            "status" => "attributed",
            "contributors" => [],
            "opal_source" => t["opal_recommended"] == true,
            "provider_source" => t["provider_supplied_discovery"] == true,
            "creator_attribution" => "none",
            "max_hops" => max_hops,
            "is_payout" => false,
            "live_economic" => false,
            "simulation" => t["simulation"] == true,
            "reason" => "no_causal_creator_evidence"
          }
        else
          %{
            "schema" => "attribution.v1",
            "transaction_id" => t["id"],
            "reality_id" => t["reality_id"],
            "place_identity" => t["place_identity"],
            "status" => "attributed",
            "contributors" => chain,
            "direct" => Enum.find(chain, &(&1["hop"] == 0)),
            "upstream" => Enum.filter(chain, &(&1["hop"] > 0)),
            "max_hops" => max_hops,
            "is_payout" => false,
            "live_economic" => false,
            "simulation" => t["simulation"] == true,
            "bounded_pool" => t["amount_pool"],
            "pool_does_not_grow_with_lineage" => true,
            "recruitment_paid" => false
          }
        end
    end
  end

  def attribute_transaction(_, _), do: abstain(%{}, "invalid")

  @doc """
  Simulate bounded pool division weights (NOT live payout).

  Returns share weights that sum to 1.0 for policy exploration.
  Label: SIMULATION.
  """
  def simulate_pool_split(attribution, pool_amount) when is_map(attribution) and is_number(pool_amount) do
    a = stringify(attribution)
    contributors = a["contributors"] || []

    if contributors == [] do
      %{
        "simulation" => true,
        "live_payout" => false,
        "pool" => pool_amount,
        "shares" => [%{"party" => "opal", "weight" => 1.0, "amount" => pool_amount * 1.0}],
        "total" => pool_amount * 1.0,
        "exceeds_pool" => false
      }
    else
      # Weight: direct 0.5 base, hop1 0.2, hop2 0.1, opal residual
      raw =
        Enum.map(contributors, fn c ->
          c = stringify(c)
          hop = c["hop"] || 0

          w =
            case {hop, c["strength"]} do
              {0, "direct_causal"} -> 0.5
              {0, _} -> 0.4
              {1, _} -> 0.2
              {2, _} -> 0.1
              _ -> 0.05
            end

          {c["author_user_id"] || c["moment_id"], w}
        end)

      sum_c = raw |> Enum.map(&elem(&1, 1)) |> Enum.sum()
      opal_w = max(0.15, 1.0 - sum_c)
      # renormalize creators into (1 - opal_w)
      creator_budget = 1.0 - opal_w

      creator_shares =
        if sum_c <= 0 do
          []
        else
          Enum.map(raw, fn {id, w} ->
            weight = w / sum_c * creator_budget
            %{"party" => id, "role" => "creator_lineage", "weight" => Float.round(weight, 4), "amount" => Float.round(pool_amount * weight, 2)}
          end)
        end

      shares =
        creator_shares ++
          [
            %{
              "party" => "opal",
              "role" => "platform",
              "weight" => Float.round(opal_w, 4),
              "amount" => Float.round(pool_amount * opal_w, 2)
            }
          ]

      total = shares |> Enum.map(& &1["amount"]) |> Enum.sum() |> Float.round(2)

      %{
        "simulation" => true,
        "live_payout" => false,
        "label" => "SIMULATION",
        "pool" => pool_amount,
        "shares" => shares,
        "total" => total,
        "exceeds_pool" => total > pool_amount + 0.02,
        "lineage_does_not_increase_pool" => true
      }
    end
  end

  def simulate_pool_split(_, _), do: %{"simulation" => true, "error" => "invalid"}

  @doc "Recruitment-only events never produce economic attribution."
  def recruitment_attributable?, do: false

  @doc "Social ranking must ignore economic value of Moments."
  def social_rank_uses_commission?, do: false

  @doc """
  Multiple Moments about same venue: do not auto 100% last-view.
  Prefer Moment that seeded Reality if present.
  """
  def resolve_multiple_sources(candidates) when is_list(candidates) do
    scored =
      Enum.map(candidates, fn c ->
        c = stringify(c)
        strength = classify_strength(c["evidence"] || %{})
        score =
          case strength do
            "direct_causal" -> 100
            "strong_assist" -> 70
            "weak_assist" -> 30
            _ -> 0
          end

        # Prefer seeded_reality over last_viewed
        score = if get_in(c, ["evidence", "seeded_reality_from_moment"]) == true, do: score + 20, else: score
        score = if get_in(c, ["evidence", "last_viewed"]) == true, do: score + 5, else: score
        {score, c, strength}
      end)
      |> Enum.filter(fn {s, _, _} -> s > 0 end)
      |> Enum.sort_by(fn {s, _, _} -> -s end)

    case scored do
      [] ->
        %{"primary" => nil, "also_considered" => [], "last_click_only" => false}

      [{_, primary, strength} | rest] ->
        %{
          "primary" => Map.put(primary, "strength", strength),
          "also_considered" => Enum.map(rest, fn {_, c, st} -> Map.put(c, "strength", st) end),
          "last_click_only" => false
        }
    end
  end

  def resolve_multiple_sources(_), do: %{"primary" => nil, "also_considered" => []}

  # --- internals ---

  defp abstain(t, reason) do
    %{
      "schema" => "attribution.v1",
      "transaction_id" => t["id"],
      "status" => "abstain",
      "contributors" => [],
      "reason" => reason,
      "is_payout" => false,
      "live_economic" => false,
      "recruitment_paid" => false
    }
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
