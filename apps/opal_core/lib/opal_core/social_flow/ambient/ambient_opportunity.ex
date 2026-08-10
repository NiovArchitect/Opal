defmodule OpalCore.SocialFlow.Ambient.AmbientOpportunity do
  @moduledoc """
  Ambient Opportunity Intelligence orchestrator.

  ADD-ON: composes SocialOpening, GroupViability, Heat, Density, Actionability,
  Expiry, Momentum, ExecutionReadiness, Surface with existing Restraint /
  CollectiveFit / Physical layers.

  Does NOT own Set, payments, membership, or location share authority.
  Does NOT create heat-map / feed / Around You UI.
  """

  alias OpalCore.SocialFlow.Ambient.{
    Actionability,
    AlignmentCompression,
    CoordinationMode,
    ExecutionReadiness,
    GroupViability,
    OpportunityDensity,
    OpportunityExpiry,
    Momentum,
    SocialOpening,
    StaleSuppression,
    Surface
  }

  alias OpalCore.SocialFlow.Physical.{
    CollectivePlaceFit,
    LocationPolicy,
    PlaceProvider
  }

  @doc """
  Evaluate ambient opportunity for an active alignment context.

  Returns silence by default. Surfaces only high-value moments.
  """
  def evaluate(attrs) when is_map(attrs) do
    a = stringify(attrs)
    ctx_key = context_key(a)

    case StaleSuppression.decide(ctx_key, a) do
      {:skip, meta} ->
        {:ok,
         %{
           "surface" => %{
             "surface" => :silence,
             "reason" => meta["reason"],
             "feed" => false,
             "authorizes_set" => false
           },
           "suppressed" => true,
           "recomputed" => false,
           "fingerprint" => meta["fingerprint"],
           "heat_map_ui" => false,
           "feed" => false,
           "authorizes_set" => false,
           "provider_is_not_authority" => true,
           "origins_exposed" => false,
           "private_budget_leaked" => false,
           "holdout_shamed" => false
         }}

      {:compute, fp} ->
        compute_evaluate(a, ctx_key, fp)
    end
  end

  def evaluate(_), do: {:error, :invalid}

  defp compute_evaluate(a, ctx_key, fp) do
    with :ok <- gate_context(a),
         {:ok, mode} <- CoordinationMode.infer(a),
         {:ok, viability} <- group_viability(a),
         {:ok, opening} <-
           SocialOpening.detect(%{
             "participant_ids" => a["participant_ids"],
             "viable_participant_ids" => viability["in_ids"] || a["viable_participant_ids"],
             "required_ids" => required_ids(a),
             "opening_hours" => a["opening_hours"],
             "time_compatible" => a["time_compatible"] || viability["viable"],
             "willingness_ok" => a["willingness_ok"] != false,
             "proximity_ok" => a["proximity_ok"] == true,
             "travel_burden_low" => a["travel_burden_low"] == true,
             "world_opportunity" => a["world_opportunity"] == true
           }),
         {:ok, density} <-
           OpportunityDensity.score(
             Map.merge(a, %{
               "time_compatible" => opening["time_ok"],
               "candidate_count" => a["candidate_count"] || length(List.wrap(a["options"]))
             })
           ),
         {:ok, action} <-
           Actionability.classify(
             Map.merge(a, %{
               "people_resolved" => opening["exists"] and viability["viable"],
               "willingness_ok" => a["willingness_ok"] == true or a["willingness_ok"] == nil,
               "time_resolved" => opening["time_ok"],
               "travel_ok" => opening["proximity_ok"] or a["travel_ok"] == true,
               "budget_ok" => a["budget_ok"] != false,
               "permission_ok" => a["permission_ok"] != false,
               "provider_unknown" => a["provider_available"] != true,
               "option_count" => a["option_count"] || density["candidate_count"]
             })
           ),
         {:ok, expiry} <- OpportunityExpiry.evaluate(a),
         {:ok, momentum} <-
           Momentum.assess(%{
             "unknown_count" => action["unknown_count"],
             "unknowns_before" => a["unknowns_before"] || action["unknown_count"] + 3,
             "in_count" => viability["in_count"],
             "viable" => viability["viable"],
             "actionable" => action["actionable"],
             "density" => density["density"]
           }),
         {:ok, exec} <- ExecutionReadiness.assess(a),
         {:ok, compression} <-
           AlignmentCompression.measure(
             Map.merge(a, %{
               "option_count" => min(to_i(a["option_count"] || 2), 3),
               "questions_asked" => a["questions_asked"] || 0,
               "human_choices" => min(to_i(a["option_count"] || 1), 3)
             })
           ) do
      options = maybe_fit_options(a, viability)

      {:ok, surface} =
        Surface.decide(%{
          "confidence" => a["confidence"] || density["density"],
          "actionable" => action["actionable"] and viability["viable"] and opening["exists"],
          "momentum_rising" => momentum["rising"],
          "this_got_easy" => momentum["this_got_easy"],
          "density" => density["density"],
          "privacy_ok" => a["privacy_ok"] != false,
          "topic_changed" => a["topic_changed"] == true,
          "blocked" => a["blocked"] == true,
          "interruption_cost" => a["interruption_cost"],
          "recent_suggestion_count" => a["recent_suggestion_count"],
          "participant_count" => length(List.wrap(a["participant_ids"])),
          "option_count" => length(options),
          "unknown_count" => action["unknown_count"],
          "forming?" => a["forming?"] != false,
          "options" => options,
          "expiring" => expiry["expiring"],
          "copy" => a["copy"] || surface_copy(momentum, expiry, options)
        })

      surface_atom = surface["surface"]
      StaleSuppression.record(ctx_key, fp, surface_atom)

      {:ok,
       %{
         "opening" => opening,
         "viability" => viability,
         "density" => density,
         "actionability" => action,
         "expiry" => expiry,
         "momentum" => momentum,
         "execution" => exec,
         "compression" => compression,
         "mode" => mode,
         "surface" => surface,
         "options" => options,
         "suppressed" => false,
         "recomputed" => true,
         "fingerprint" => fp,
         "origins_exposed" => false,
         "private_budget_leaked" => false,
         "holdout_shamed" => false,
         "heat_map_ui" => false,
         "feed" => false,
         "authorizes_set" => false,
         "provider_is_not_authority" => true
       }}
    end
  end

  @doc "Block terminates ambient cross-user opportunity sharing."
  def on_block(owner_id, peer_id) do
    loc = LocationPolicy.on_block(owner_id, peer_id)

    Map.merge(loc, %{
      "ambient_opportunity_sharing" => :stopped,
      "network_heat_cross_user" => :stopped
    })
  end

  defp gate_context(a) do
    cond do
      a["blocked"] == true ->
        {:error, :blocked}

      a["peer_location_query"] == true ->
        {:error, :peer_location_query_forbidden}

      not is_list(a["participant_ids"]) and is_nil(a["participant_ids"]) ->
        {:error, :context_required}

      true ->
        :ok
    end
  end

  defp group_viability(a) do
    participants = List.wrap(a["participants"] || synthesize_participants(a))

    GroupViability.evaluate(participants,
      agreement_policy: a["agreement_policy"] || "majority_or_organizer",
      min_viable: a["min_viable"],
      purpose: a["relationship_context"] || a["purpose"] || "friends",
      hard_constraints: a["hard_constraints"] || [],
      failed_hard: a["failed_hard"] || []
    )
  end

  defp context_key(a) do
    conv = a["conversation_id"] || "noconv"
    actor = a["actor_user_id"] || a["owner_user_id"] || "system"
    "#{conv}:#{actor}"
  end

  defp synthesize_participants(a) do
    ids = List.wrap(a["participant_ids"])
    required = MapSet.new(List.wrap(a["required_ids"]))
    in_set = MapSet.new(List.wrap(a["in_ids"] || a["viable_participant_ids"] || ids))
    out_set = MapSet.new(List.wrap(a["out_ids"] || []))
    maybe_set = MapSet.new(List.wrap(a["maybe_ids"] || []))

    Enum.map(ids, fn id ->
      response =
        cond do
          id in out_set -> "not_this_time"
          id in maybe_set -> "maybe"
          id in in_set -> "im_in"
          true -> "undecided"
        end

      %{
        "user_id" => id,
        "role" => if(id in required, do: "required", else: "optional"),
        "response" => response,
        "engagement" => "active"
      }
    end)
  end

  defp required_ids(a) do
    List.wrap(a["required_ids"])
  end

  defp maybe_fit_options(a, _viability) do
    case a["options"] do
      list when is_list(list) and list != [] ->
        Enum.take(list, 3)

      _ ->
        if a["fetch_places"] == true do
          case PlaceProvider.search_with_fallback(
                 category: a["category"] || "dinner",
                 area_label: a["area_label"]
               ) do
            {:ok, cands} ->
              ranking =
                CollectivePlaceFit.rank(cands,
                  quiet_required: a["quiet_required"] == true,
                  max_price_band: a["max_price_band"],
                  relationship_context: a["relationship_context"] || "friends",
                  travel_by_place: a["travel_by_place"] || %{}
                )

              Enum.take(ranking["options"] || [], 3)

            _ ->
              []
          end
        else
          []
        end
    end
  end

  defp surface_copy(momentum, expiry, options) do
    cond do
      momentum["this_got_easy"] ->
        "This one actually lines up."

      expiry["may_surface_urgency"] and is_binary(expiry["shared_safe_copy"]) ->
        expiry["shared_safe_copy"]

      length(options) in 1..3 ->
        "This could be fun tonight."

      true ->
        "This could work."
    end
  end

  defp to_i(n) when is_integer(n), do: n
  defp to_i(n) when is_float(n), do: trunc(n)
  defp to_i(_), do: 0

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
