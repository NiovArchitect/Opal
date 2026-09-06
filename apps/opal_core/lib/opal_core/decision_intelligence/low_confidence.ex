defmodule OpalCore.DecisionIntelligence.LowConfidence do
  @moduledoc """
  P4.4 — detect real human tradeoffs (not missing info, not system failure).

  Hard constraints are never tradeoff options.
  One axis · two legitimate sides.
  """

  @policy_version "p4.4.tradeoff.v1"

  alias OpalCore.DecisionIntelligence.CandidateAcquisition
  alias OpalCore.DecisionIntelligence.DecisionContext
  alias OpalCore.DecisionIntelligence.MediumConfidence
  alias OpalCore.SocialFlow.Physical.HardCandidateFilter

  @doc """
  Returns:
  - `{:high, _}` / `{:medium, _}` if those apply first
  - `{:low, tradeoff}` one real tradeoff
  - `{:no_valid_candidate, meta}` hard constraints leave zero candidates
  - `{:not_low, meta}` no grounded conflict
  """
  def evaluate(%DecisionContext{} = ctx, opts \\ []) do
    {:ok, acq} = CandidateAcquisition.fetch(ctx, opts)
    raw = acq.candidates
    hard = hard_attrs(ctx)
    filtered = HardCandidateFilter.filter(raw, hard)
    kept = filtered["candidates"] || []

    cond do
      kept == [] and hard_present?(ctx) ->
        {:no_valid_candidate,
         %{
           "decision_id" => ctx.id,
           "based_on_context_revision" => ctx.revision,
           "reason_codes" => ["no_valid_candidate"],
           "rejected" => filtered["rejected"],
           "candidate_source" => acq.source,
           "policy_version" => @policy_version
         }}

      # Real conflict before collapsing to High/Medium
      (tradeoff = detect_tradeoff(ctx, kept)) != nil ->
        {:low,
         %{
           "decision_id" => ctx.id,
           "based_on_context_revision" => ctx.revision,
           "tradeoff" => tradeoff,
           "kept_count" => length(kept),
           "candidate_source" => acq.source,
           "policy_version" => @policy_version
         }}

      true ->
        case MediumConfidence.evaluate(ctx, opts) do
          {:high, a} -> {:high, a}
          {:medium, a} -> {:medium, a}
          {:not_medium, med} ->
            {:not_low,
             Map.merge(med, %{
               "reason_codes" => (med["reason_codes"] || []) ++ ["no_grounded_conflict"],
               "policy_version" => @policy_version
             })}
        end
    end
  end

  defp hard_present?(%DecisionContext{} = ctx) do
    map_size(ctx.hard_constraints || %{}) > 0 or
      is_number(get_in(ctx.budget_context || %{}, ["max"])) or
      is_number(get_in(ctx.hard_constraints || %{}, ["max_budget"]))
  end

  defp hard_attrs(%DecisionContext{} = ctx) do
    budget = ctx.budget_context || %{}
    hard = ctx.hard_constraints || %{}
    max = hard["max_budget"] || budget["max"]

    %{
      "party_size" => max(length(ctx.participant_ids || []), 1),
      "max_price_band" =>
        cond do
          is_number(max) and max <= 40 -> 2
          is_number(max) and max <= 80 -> 3
          true -> 4
        end,
      "max_travel_minutes" => hard["max_travel_minutes"]
    }
  end

  defp detect_tradeoff(%DecisionContext{} = ctx, kept) do
    soft = ctx.soft_preferences || %{}
    pref = ctx.preference_context || %{}
    hard = ctx.hard_constraints || %{}
    budget = ctx.budget_context || %{}

    # Explicit soft conflict markers (shareable framing — no private blame)
    explicit = soft["conflict_axis"] || pref["conflict_axis"]

    cond do
      is_binary(explicit) and explicit in ~w(CHEAPER_VS_BETTER_FIT CLOSER_VS_MORE_SPECIAL QUIETER_VS_MORE_ENERGETIC EARLIER_VS_EVERYONE_TOGETHER) ->
        build_tradeoff(ctx, explicit)

      # Hard-ish budget cap vs soft "more special" / high price preference
      budget_vs_special?(budget, hard, soft, pref, kept) ->
        build_tradeoff(ctx, "CHEAPER_VS_BETTER_FIT")

      # Distance hard vs special preference
      closer_vs_special?(hard, soft, pref) ->
        build_tradeoff(ctx, "CLOSER_VS_MORE_SPECIAL")

      # Quiet vs lively both asserted as soft needs (group-safe labels only)
      quieter_vs_energetic?(soft, pref, kept) ->
        build_tradeoff(ctx, "QUIETER_VS_MORE_ENERGETIC")

      true ->
        nil
    end
  end

  defp budget_vs_special?(budget, hard, soft, pref, _kept) do
    max = hard["max_budget"] || budget["max"]
    wants_special =
      soft["prefer_special"] == true or pref["prefer_special"] == true or pref["vibe"] == "special"

    # Conflict is grounded in context: tight spend vs desire for more special — independent of filter survivors
    is_number(max) and max <= 50 and wants_special
  end

  defp closer_vs_special?(hard, soft, pref) do
    (hard["max_travel_minutes"] || 0) > 0 and hard["max_travel_minutes"] <= 20 and
      (soft["prefer_special"] == true or pref["prefer_special"] == true or pref["accept_drive"] == false)
  end

  defp quieter_vs_energetic?(soft, pref, kept) do
    wants_quiet = soft["prefer_quiet"] == true or pref["vibe"] == "quiet"
    wants_lively = soft["prefer_lively"] == true or pref["vibe"] == "lively"
    # Both preferences asserted via soft_preferences map (not private blame fields)
    dual = soft["prefer_quiet"] == true and soft["prefer_lively"] == true
    split = Enum.any?(kept, &(&1["quiet"] == true)) and Enum.any?(kept, &(&1["quiet"] == false))
    (dual or (wants_quiet and wants_lively)) and split
  end

  defp build_tradeoff(ctx, "CHEAPER_VS_BETTER_FIT") do
    %{
      "conflict_id" => "cf_budget_" <> String.slice(ctx.id, 0, 8),
      "conflict_type" => "BUDGET_FIT_CONFLICT",
      "tradeoff_axis" => "CHEAPER_VS_BETTER_FIT",
      "prompt" => "What matters more right now?",
      "option_a" => %{"id" => "cheaper", "label" => "Cheaper", "means" => "prefer_lower_spend"},
      "option_b" => %{"id" => "better_fit", "label" => "Better fit", "means" => "prefer_experience_fit"},
      "shareable" => true,
      "figma_authority" => "988:263",
      "hard_constraints_intact" => true
    }
  end

  defp build_tradeoff(ctx, "CLOSER_VS_MORE_SPECIAL") do
    %{
      "conflict_id" => "cf_dist_" <> String.slice(ctx.id, 0, 8),
      "conflict_type" => "DISTANCE_CONFLICT",
      "tradeoff_axis" => "CLOSER_VS_MORE_SPECIAL",
      "prompt" => "What matters more right now?",
      "option_a" => %{"id" => "closer", "label" => "Closer", "means" => "prefer_nearby"},
      "option_b" => %{"id" => "more_special", "label" => "More special", "means" => "accept_farther"},
      "shareable" => true,
      "figma_authority" => "988:263",
      "hard_constraints_intact" => true
    }
  end

  defp build_tradeoff(ctx, "QUIETER_VS_MORE_ENERGETIC") do
    %{
      "conflict_id" => "cf_vibe_" <> String.slice(ctx.id, 0, 8),
      "conflict_type" => "EXPERIENCE_FIT_CONFLICT",
      "tradeoff_axis" => "QUIETER_VS_MORE_ENERGETIC",
      "prompt" => "What matters more right now?",
      "option_a" => %{"id" => "quieter", "label" => "Quieter", "means" => "prefer_quiet"},
      "option_b" => %{"id" => "more_energetic", "label" => "More energetic", "means" => "prefer_lively"},
      "shareable" => true,
      "figma_authority" => "988:263",
      "hard_constraints_intact" => true
    }
  end

  defp build_tradeoff(ctx, "EARLIER_VS_EVERYONE_TOGETHER") do
    %{
      "conflict_id" => "cf_time_" <> String.slice(ctx.id, 0, 8),
      "conflict_type" => "TIMING_CONFLICT",
      "tradeoff_axis" => "EARLIER_VS_EVERYONE_TOGETHER",
      "prompt" => "What matters more right now?",
      "option_a" => %{"id" => "earlier", "label" => "Earlier", "means" => "prefer_earlier"},
      "option_b" => %{"id" => "everyone", "label" => "Everyone together", "means" => "prefer_full_group"},
      "shareable" => true,
      "figma_authority" => "988:263",
      "hard_constraints_intact" => true
    }
  end

  defp build_tradeoff(_, _), do: nil

  def map_selection_to_correction("CHEAPER_VS_BETTER_FIT", "cheaper") do
    %{"operation" => "set_budget", "budget_max" => 40, "soft_clear_special" => true}
  end

  def map_selection_to_correction("CHEAPER_VS_BETTER_FIT", "better_fit") do
    %{"operation" => "set_budget", "budget_max" => 120, "prefer_special" => true}
  end

  def map_selection_to_correction("CLOSER_VS_MORE_SPECIAL", "closer") do
    %{"operation" => "set_location_constraint", "location_context" => %{"prefer" => "nearby"}}
  end

  def map_selection_to_correction("CLOSER_VS_MORE_SPECIAL", "more_special") do
    %{"operation" => "set_location_constraint", "location_context" => %{"prefer" => "special", "accept_drive" => true}}
  end

  def map_selection_to_correction("QUIETER_VS_MORE_ENERGETIC", "quieter") do
    %{"operation" => "set_vibe", "vibe" => "quiet"}
  end

  def map_selection_to_correction("QUIETER_VS_MORE_ENERGETIC", "more_energetic") do
    %{"operation" => "set_vibe", "vibe" => "lively"}
  end

  def map_selection_to_correction("EARLIER_VS_EVERYONE_TOGETHER", "earlier") do
    %{"operation" => "set_time", "time_context" => %{"preference" => "earlier"}}
  end

  def map_selection_to_correction("EARLIER_VS_EVERYONE_TOGETHER", "everyone") do
    %{"operation" => "set_time", "time_context" => %{"preference" => "everyone_together"}}
  end

  def map_selection_to_correction(_, _), do: nil

  def policy_version, do: @policy_version
end
