defmodule OpalCore.DecisionIntelligence.HighConfidence do
  @moduledoc """
  P4.2 high-confidence evaluation — deterministic gates first, optional model propose.

  Never forces High when gates fail. Never paints Gold from confidence.
  """

  @policy_version "p4.2.high.v1"

  alias OpalCore.DecisionIntelligence.CandidateAcquisition
  alias OpalCore.DecisionIntelligence.DecisionContext
  alias OpalCore.SocialFlow.Physical.HardCandidateFilter

  @doc """
  Evaluate whether DecisionContext can produce ONE high-confidence answer.

  Returns:
  - `{:high, assessment}` with selected candidate from authorized set
  - `{:not_high, assessment}` with reason_codes
  """
  def evaluate(%DecisionContext{} = ctx, opts \\ []) do
    model_pick = Keyword.get(opts, :model_selected_candidate_id)
    model_version = Keyword.get(opts, :model_version)

    case CandidateAcquisition.fetch(ctx, opts) do
      {:error, _reason} ->
        {:not_high,
         base_assessment(ctx, %{}, ["provider_unavailable"], [], [], model_version, "provider_error")}

      {:ok, acq} ->
        raw = exclude_places(acq.candidates, ctx)
        candidate_source = acq.source || "fixture_catalog"
        authorized_ids = Enum.map(raw, & &1["provider_place_id"])

        hard_attrs = hard_attrs_from_context(ctx)
        filtered = HardCandidateFilter.filter(raw, hard_attrs)
        kept = filtered["candidates"] || []

        factors = assess_dimensions(ctx, kept, filtered)
        hard_block = hard_gate(ctx, kept, factors)

        cond do
          hard_block != nil ->
            {:not_high,
             base_assessment(
               ctx,
               factors,
               [hard_block],
               authorized_ids,
               kept,
               model_version,
               candidate_source
             )}

          Enum.any?(Map.values(factors), &(&1 == "block")) ->
            reasons =
              factors
              |> Enum.filter(fn {_, v} -> v == "block" end)
              |> Enum.map(fn {k, _} -> "dim_#{k}" end)

            {:not_high,
             base_assessment(
               ctx,
               factors,
               reasons,
               authorized_ids,
               kept,
               model_version,
               candidate_source
             )}

          true ->
            selected =
              cond do
                is_binary(model_pick) and model_pick in authorized_ids and
                    Enum.any?(kept, &(&1["provider_place_id"] == model_pick)) ->
                  Enum.find(kept, &(&1["provider_place_id"] == model_pick))

                true ->
                  select_deterministic(kept, ctx)
              end

            if is_nil(selected) do
              {:not_high,
               base_assessment(
                 ctx,
                 factors,
                 ["no_feasible_candidate"],
                 authorized_ids,
                 kept,
                 model_version,
                 candidate_source
               )}
            else
              id = selected["provider_place_id"]

              if id in authorized_ids do
                {:high,
                 base_assessment(
                   ctx,
                   factors,
                   [],
                   authorized_ids,
                   kept,
                   model_version,
                   candidate_source
                 )
                 |> Map.merge(%{
                   "high_confidence_eligible" => true,
                   "selected_candidate_id" => id,
                   "selected_candidate" => selected,
                   "candidate_source" => candidate_source,
                   "provider_mode" => acq.provider_mode,
                   "real" => acq.real,
                   "policy_version" => @policy_version
                 })}
              else
                {:not_high,
                 base_assessment(
                   ctx,
                   factors,
                   ["candidate_not_in_set"],
                   authorized_ids,
                   kept,
                   model_version,
                   candidate_source
                 )}
              end
            end
        end
    end
  end

  defp exclude_places(candidates, %DecisionContext{} = ctx) do
    excluded =
      List.wrap(get_in(ctx.provider_context || %{}, ["excluded_place_ids"])) ++
        List.wrap(get_in(ctx.provider_context || %{}, [:excluded_place_ids]))

    if excluded == [] do
      candidates
    else
      Enum.reject(candidates, &(&1["provider_place_id"] in excluded))
    end
  end

  defp hard_attrs_from_context(%DecisionContext{} = ctx) do
    budget = ctx.budget_context || %{}
    max = budget["max"] || budget[:max]
    party = length(ctx.participant_ids || [])
    vibe = get_in(ctx.preference_context || %{}, ["vibe"]) || get_in(ctx.preference_context || %{}, [:vibe])

    %{
      "party_size" => max(party, 1),
      "max_price_band" => price_band_from_budget(max),
      "coordination_mode" => if(ctx.intent in ~w(nearby_now), do: "now", else: nil),
      "prefer_quiet" => vibe in ~w(quiet quieter calm)
    }
  end

  defp price_band_from_budget(nil), do: 4
  defp price_band_from_budget(n) when is_number(n) and n <= 40, do: 2
  defp price_band_from_budget(n) when is_number(n) and n <= 80, do: 3
  defp price_band_from_budget(_), do: 4

  defp assess_dimensions(%DecisionContext{} = ctx, kept, _filtered) do
    conflicts = ctx.conflicts || []

    %{
      "CONTEXT_COMPLETENESS" =>
        if(is_binary(ctx.intent) and ctx.intent != "" and ctx.intent != "unspecified",
          do: "pass",
          else: "block"
        ),
      "EVIDENCE_QUALITY" => if(map_size(ctx.hard_constraints || %{}) > 0 or map_size(ctx.budget_context || %{}) > 0 or map_size(ctx.preference_context || %{}) > 0, do: "pass", else: "soft"),
      "CONFLICT_LEVEL" => if(conflicts == [], do: "pass", else: "block"),
      "FRESHNESS" => "pass",
      "FEASIBILITY" => if(kept != [], do: "pass", else: "block"),
      "PROVIDER_CERTAINTY" => "soft",
      "PEOPLE_ALIGNMENT" => people_dim(ctx),
      "RISK" => "pass",
      "MODEL_CERTAINTY" => "soft"
    }
  end

  defp people_dim(%DecisionContext{scope_type: "solo"}), do: "pass"

  defp people_dim(%DecisionContext{scope_type: "dyad", participant_ids: ids}) do
    if is_list(ids) and length(ids) >= 2, do: "pass", else: "block"
  end

  defp people_dim(%DecisionContext{scope_type: scope, participant_ids: ids})
       when scope in ~w(group family) do
    if is_list(ids) and length(ids) >= 2, do: "pass", else: "block"
  end

  defp people_dim(_), do: "pass"

  defp hard_gate(%DecisionContext{} = ctx, kept, _factors) do
    cond do
      (ctx.conflicts || []) != [] -> "hard_constraint_conflict"
      kept == [] -> "candidate_unavailable"
      ctx.scope_type == "dyad" and length(ctx.participant_ids || []) < 2 -> "scope_ambiguity"
      # P4.3: High needs enough soft context for planning intents — else Medium may ask once
      planning_intent?(ctx) and missing_decision_soft_context?(ctx) -> "incomplete_soft_context"
      true -> nil
    end
  end

  defp planning_intent?(%DecisionContext{intent: intent}) do
    intent in ~w(date_ideas weekend_getaway family_plans nearby_now)
  end

  defp missing_decision_soft_context?(%DecisionContext{} = ctx) do
    budget_empty = map_size(ctx.budget_context || %{}) == 0
    time_empty = map_size(ctx.time_context || %{}) == 0
    vibe = get_in(ctx.preference_context || %{}, ["vibe"])
    vibe_empty = is_nil(vibe) or vibe == ""
    budget_empty and time_empty and vibe_empty
  end

  defp select_deterministic([], _), do: nil

  defp select_deterministic(kept, %DecisionContext{} = ctx) do
    prefer_quiet =
      get_in(ctx.preference_context || %{}, ["vibe"]) in ~w(quiet quieter calm)

    ranked =
      kept
      |> Enum.sort_by(fn c ->
        quiet_bonus = if prefer_quiet and c["quiet"] == true, do: 0, else: 1
        rating = -(c["rating"] || 0)
        {quiet_bonus, rating, c["provider_place_id"]}
      end)

    hd(ranked)
  end

  defp base_assessment(ctx, factors, reasons, authorized_ids, kept, model_version, candidate_source) do
    %{
      "decision_id" => ctx.id,
      "based_on_context_revision" => ctx.revision,
      "high_confidence_eligible" => false,
      "confidence_factors" => factors,
      "reason_codes" => reasons,
      "authorized_candidate_ids" => authorized_ids,
      "kept_count" => length(kept),
      "policy_version" => @policy_version,
      "model_version" => model_version,
      "candidate_source" => candidate_source,
      "result_type" => "high_evaluation"
    }
  end

  def policy_version, do: @policy_version
end
