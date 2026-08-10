defmodule OpalCore.SocialFlow.Ambient.OpportunityFormation do
  @moduledoc """
  Recognize real opportunity before humans manually assemble it.

  Pipeline:
  Social Opening → (optional) zones → world acquisition → CollectiveFit
  → layers → convergence → actionability → SmallestOutput

  Composes protected modules. Never Sets. Never a feed/map.
  """

  alias OpalCore.SocialFlow.Ambient.{
    AlignmentCompression,
    Convergence,
    CoordinationMode,
    OpportunityLayers,
    OpportunityZone,
    SmallestOutput,
    TrustFact,
    WorldOpportunity
  }

  alias OpalCore.SocialFlow.Physical.CollectivePlaceFit
  alias OpalCore.SocialFlow.Feasibility.Probing

  @doc """
  Form an ambient opportunity from social + world signals.

  Returns smallest output: opportunity | minimum_question | nothing.
  """
  def form(attrs) when is_map(attrs) do
    a = stringify(attrs)

    with :ok <- gate(a),
         {:ok, mode} <- CoordinationMode.infer(a),
         {:ok, zones} <- OpportunityZone.derive(Map.put(a, "coordination_mode", mode["mode"])),
         {:ok, world} <- maybe_acquire(a, zones, mode),
         {:ok, fit} <- maybe_fit(a, world),
         options <- compress_options(fit, world),
         {:ok, layers} <-
           OpportunityLayers.classify(
             Map.merge(a, %{
               "world_candidate_count" => world["candidate_count"] || 0,
               "candidate_count" => length(options),
               "option_count" => length(options),
               "world_opportunity" => (world["candidate_count"] || 0) > 0
             })
           ),
         {:ok, conv} <-
           Convergence.detect(
             Map.merge(a, %{
               "social_opening" => layers["social_opening"],
               "viable" => layers["social_opening"],
               "candidate_count" => length(options),
               "density" => get_in(layers, ["density", "density"]),
               "in_count" => length(List.wrap(a["in_ids"] || a["viable_participant_ids"])),
               "trust_ok" => trust_ok?(a)
             })
           ) do
      # Social opening alone (no world) may still surface
      result = decide_surface(a, layers, conv, options, zones, world, mode)
      {:ok, result}
    end
  end

  def form(_), do: {:error, :invalid}

  defp gate(a) do
    cond do
      a["blocked"] == true ->
        {:error, :blocked}

      a["peer_location_query"] == true ->
        {:error, :peer_location_query_forbidden}

      is_binary(a["actor_user_id"]) and is_binary(a["conversation_id"]) ->
        # Rate limit probing-style evaluation
        case Probing.authorize_evaluation(a["actor_user_id"], a["conversation_id"], max: 30) do
          :ok -> :ok
          {:error, _} = err -> err
        end

      true ->
        :ok
    end
  end

  defp maybe_acquire(a, zones, mode) do
    if a["skip_world"] == true do
      {:ok, %{"candidates" => [], "candidate_count" => 0, "skipped" => true}}
    else
      area = zones["primary_area"] || a["area_label"] || a["expected_area"]

      WorldOpportunity.acquire(%{
        "area_label" => area,
        "category" => a["category"] || a["experience_type"],
        "available_minutes" => a["available_minutes"] || a["opening_minutes"],
        "coordination_mode" => mode["mode"],
        "source" => a["source"]
      })
    end
  end

  defp maybe_fit(a, world) do
    cands = List.wrap(world["candidates"])

    if cands == [] do
      {:ok, %{"options" => [], "provider_is_not_authority" => true}}
    else
      ranking =
        CollectivePlaceFit.rank(cands,
          quiet_required: a["quiet_required"] == true,
          max_price_band: a["max_price_band"],
          relationship_context: a["relationship_context"] || "friends",
          travel_by_place: a["travel_by_place"] || %{},
          max_travel_minutes: a["max_travel_minutes"] || 60
        )

      {:ok, ranking}
    end
  end

  defp compress_options(fit, world) do
    opts = List.wrap(fit["options"])

    AlignmentCompression.compress_to_human_options(opts, %{
      "candidate_count" => world["candidate_count"] || length(opts),
      "meaningful_tradeoff" => fit["meaningful_tradeoff"] == true,
      "preserve_choice" => fit["preserve_choice"] == true
    })
    |> Map.get("options", [])
  end

  defp decide_surface(a, layers, conv, options, zones, world, mode) do
    trust? = trust_ok?(a)

    # World without social → stay quiet
    cond do
      not trust? ->
        silence_result("untrustworthy", layers, zones, mode)

      layers["world_without_social_quiet"] ->
        silence_result("world_without_social_opening", layers, zones, mode)

      layers["must_stay_quiet"] and not layers["social_alone_valuable"] ->
        silence_result("not_actionable", layers, zones, mode)

      layers["actionable_opportunity"] or
        (layers["social_alone_valuable"] and conv["converged"]) or
          (layers["social_opening"] and options != [] and conv["this_got_easy"]) ->
        opportunity_result(a, layers, conv, options, zones, world, mode)

      layers["social_opening"] and options == [] and a["opening_alone_ok"] != false ->
        # Social opening without world candidate
        %{
          "smallest" => %{
            "kind" => "opportunity",
            "copy" => a["opening_copy"] || "This window looks unusually easy.",
            "options" => [],
            "option_count" => 0,
            "social_opening_only" => true,
            "then_get_quiet" => true,
            "feed" => false,
            "heat_map" => false,
            "authorizes_set" => false,
            "user_work_removed" => ~w(poll calendar_check)
          },
          "layers" => layers,
          "convergence" => conv,
          "zones" => zones,
          "mode" => mode,
          "authorizes_set" => false,
          "heat_map_ui" => false,
          "feed" => false
        }

      layers["social_opening"] ->
        %{
          "smallest" =>
            SmallestOutput.question_from(%{
              "viability" => %{"viable" => true},
              "actionability" => layers["actionability"]
            }),
          "layers" => layers,
          "convergence" => conv,
          "zones" => zones,
          "mode" => mode,
          "authorizes_set" => false,
          "feed" => false
        }

      true ->
        silence_result("no_opening", layers, zones, mode)
    end
  end

  defp opportunity_result(a, layers, conv, options, zones, world, mode) do
    compressed =
      AlignmentCompression.compress_to_human_options(options, a)

    opts = compressed["options"]

    copy =
      cond do
        length(opts) == 1 and conv["this_got_easy"] ->
          a["copy"] || "This one actually lines up."

        compressed["meaningful_tradeoff"] ->
          a["copy"] || "Two ways this could go."

        conv["this_got_easy"] ->
          a["copy"] || "This one actually lines up."

        opts == [] ->
          a["opening_copy"] || "This window looks unusually easy."

        true ->
          a["copy"] || "This could work."
      end

    compression_measure =
      case AlignmentCompression.measure(
             Map.merge(a, %{
               "option_count" => length(opts),
               "candidate_count" => world["candidate_count"] || length(options),
               "questions_asked" => 0
             })
           ) do
        {:ok, m} -> m
        _ -> %{}
      end

    %{
      "smallest" => %{
        "kind" => "opportunity",
        "copy" => copy,
        "options" => opts,
        "option_count" => length(opts),
        "compression_rule" => compressed["rule"],
        "meaningful_tradeoff" => compressed["meaningful_tradeoff"] == true,
        "then_get_quiet" => true,
        "feed" => false,
        "heat_map" => false,
        "authorizes_set" => false,
        "user_work_removed" =>
          ~w(poll calendar_check map_search travel_math place_browse re_entering_constraints)
      },
      "layers" => layers,
      "convergence" => conv,
      "zones" => zones,
      "world" => Map.take(world || %{}, ~w(candidate_count authentic_world_heat area_label)),
      "mode" => mode,
      "compression" => compression_measure,
      "origins_exposed" => false,
      "private_budget_leaked" => false,
      "holdout_shamed" => false,
      "authorizes_set" => false,
      "provider_is_not_authority" => true,
      "heat_map_ui" => false,
      "feed" => false
    }
  end

  defp silence_result(reason, layers, zones, mode) do
    %{
      "smallest" => %{
        "kind" => "nothing",
        "reason" => reason,
        "feed" => false,
        "heat_map" => false,
        "authorizes_set" => false,
        "then_get_quiet" => true
      },
      "layers" => layers,
      "zones" => zones,
      "mode" => mode,
      "authorizes_set" => false,
      "feed" => false,
      "heat_map_ui" => false
    }
  end

  defp trust_ok?(a) do
    if a["observed_at"] do
      case TrustFact.evaluate(%{
             "source_class" => a["primary_source"] || "conversation_evidence",
             "observed_at" => a["observed_at"],
             "active_plan_id" => a["active_plan_id"] || a["plan_id"],
             "plan_id" => a["plan_id"]
           }) do
        {:ok, t} -> t["may_influence"]
        _ -> true
      end
    else
      a["trust_ok"] != false
    end
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
