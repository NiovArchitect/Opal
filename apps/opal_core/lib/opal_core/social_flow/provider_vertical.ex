defmodule OpalCore.SocialFlow.ProviderVertical do
  @moduledoc """
  Pass 15 — first real-world vertical: PLACE DISCOVERY + TRAVEL TRUTH.

  Providers are SENSES and HANDS, not the brain.

  Pipeline:
  Social context
  → place adapter (live | recorded_fixture | synthetic catalog)
  → ExternalWorldTruth envelopes
  → CollectivePlaceFit (social rank; provider order is not authority)
  → private select
  → place identity
  → travel fact
  → PersonalFlow leave consequence
  → NotificationDelivery policy

  No booking. No map UI. No second attention engine.
  """

  alias OpalCore.SocialFlow.{
    ExternalWorldTruth,
    NotificationDelivery,
    PersonalFlow
  }

  alias OpalCore.SocialFlow.Physical.{
    CollectivePlaceFit,
    PlaceProvider,
    TravelProvider,
    WorldFact
  }

  alias OpalCore.SocialFlow.Physical.Providers.{Mode, RecordedPlaces}

  @place_ttl_sec 6 * 60 * 60
  @travel_ttl_sec 15 * 60

  @doc """
  Full Jordan-style place gap vertical.

  opts / context:
  - area_label (default Little Italy)
  - category (italian / dinner)
  - hard_exclude_areas (e.g. ["Downtown"])
  - origin_lat/lng (private; never shared)
  - party_size
  - when_label
  - minutes_until_event
  - prefer_recorded: true forces recorded fixture
  - force_provider_failure: true
  - selected_place_id after private select
  """
  def jordan_place_vertical(ctx \\ %{}) do
    c = stringify(ctx)
    mode = Mode.resolve(:places)

    search = place_search(c, mode)

    candidates = Map.get(search, "candidates", [])
    hard_excl = List.wrap(c["hard_exclude_areas"] || ["Downtown"])

    admitted =
      candidates
      |> Enum.map(&attach_provider_envelope/1)
      |> Enum.reject(&closed_hard?/1)
      |> Enum.reject(&excluded_area?(&1, hard_excl))
      |> Enum.map(&ensure_provenance!/1)

    fit =
      CollectivePlaceFit.rank(admitted, %{
        "relationship_context" => c["relationship_context"] || "date",
        "quiet_required" => c["quiet_required"] == true,
        "max_travel_minutes" => c["max_travel_minutes"] || 45,
        "travel_by_place" => travel_by_place(admitted, c)
      })

    ranked = fit["options"] || fit["candidates"] || ranked_from_fit(fit)
    # provider order must not dictate final list — fit engine already re-scored
    provider_order_ids = Enum.map(admitted, & &1["provider_place_id"])
    social_order_ids = Enum.map(ranked, &(&1["id"] || &1["provider_place_id"]))

    selected_id = c["selected_place_id"] || List.first(social_order_ids)
    selected = Enum.find(ranked, &((&1["id"] || &1["provider_place_id"]) == selected_id)) || List.first(ranked)

    place_identity = place_identity(selected)
    travel = travel_for(selected, c)
    leave = leave_consequence(travel, c)
    notify = delivery_for(leave, c)

    failure =
      if c["force_provider_failure"] == true do
        ExternalWorldTruth.recompose_after_provider_failure(
          %{
            "what" => c["what"] || "Dinner",
            "when" => c["when_label"] || "Thursday · 6:30 PM",
            "where" => place_identity && place_identity["display_name"],
            "next_gap" => "none"
          },
          %{"state" => "failed", "scope" => "place_provider"}
        )
      else
        nil
      end

    empty? = admitted == [] and search["error"] == nil and search["skipped"] != true

    %{
      "vertical" => "place_discovery_travel",
      "provider_mode" => search["provider_mode"] || mode["mode"],
      "credential_present" => mode["credential_present"] == true,
      "live" => search["live"] == true or search["real"] == true,
      "recorded" => search["recorded"] == true,
      "synthetic" => search["synthetic"] == true,
      "source" => search["source"],
      "search" => %{
        "result_count" => length(candidates),
        "admitted_count" => length(admitted),
        "error" => search["error"],
        "skipped" => search["skipped"],
        "reason" => search["reason"]
      },
      "candidates" => Enum.map(admitted, &curate_surface/1),
      "social_fit" => %{
        "engine" => "collective_place_fit",
        "provider_is_not_authority" => true,
        "provider_order" => provider_order_ids,
        "social_order" => social_order_ids,
        "provider_order_equals_social" => provider_order_ids == social_order_ids,
        "ranked" => Enum.map(ranked, &curate_surface/1)
      },
      "private_select" => curate_surface(selected),
      "place_identity" => place_identity,
      "explicit_share" => explicit_share(place_identity),
      "travel" => travel,
      "leave_consequence" => leave,
      "notification" => notify,
      "provider_failure_recompose" => failure,
      "empty_result" => empty?,
      "abstention" => empty_abstention(empty?, c),
      "invariants" => %{
        "llm_not_provider" => true,
        "no_fake_availability" => true,
        "no_fake_booking" => true,
        "provider_fact_has_provenance" => Enum.all?(admitted, &has_provenance?/1),
        "provider_failure_preserves_who_what_when" =>
          is_nil(failure) or
            (failure["what"] != nil and failure["when"] != nil and failure["next_gap"] == "place"),
        "attention_not_spammed_by_provider" => true
      },
      "debug_snapshot" => debug_snapshot(selected, travel)
    }
  end

  @doc "Place search with truthful source selection."
  def place_search(ctx, mode \\ nil) do
    c = stringify(ctx)
    mode = mode || Mode.resolve(:places)

    cond do
      c["force_provider_failure"] == true ->
        %{
          "candidates" => [],
          "error" => "forced_failure",
          "provider_mode" => "error",
          "real" => false,
          "synthetic" => false,
          "recorded" => false,
          "source" => "none"
        }

      c["prefer_recorded"] == true or c["source"] == "recorded_fixture" ->
        case RecordedPlaces.fetch_candidates(search_query(c)) do
          {:ok, r} -> r
          {:error, e} -> %{"candidates" => [], "error" => to_string(e), "source" => "recorded_fixture"}
        end

      mode["mode"] == "connected" and mode["credential_present"] == true ->
        case PlaceProvider.search_with_meta(
               area_label: c["area_label"] || "Little Italy",
               category: c["category"] || "italian",
               lat: c["origin_lat"] || c["lat"],
               lng: c["origin_lng"] || c["lng"],
               max_result_count: c["max_candidates"] || 8
             ) do
          {:ok, list, meta} ->
            Map.merge(meta || %{}, %{
              "candidates" => list,
              "live" => true,
              "real" => true,
              "synthetic" => false,
              "recorded" => false
            })

          {:error, e} ->
            # connected mode: no silent synthetic — try recorded for proof continuity only if allowed
            if c["allow_recorded_on_live_error"] == true do
              case RecordedPlaces.fetch_candidates(search_query(c)) do
                {:ok, r} -> Map.put(r, "live_error", to_string(e))
                _ -> %{"candidates" => [], "error" => to_string(e), "provider_mode" => "error"}
              end
            else
              %{
                "candidates" => [],
                "error" => to_string(e),
                "provider_mode" => "error",
                "real" => false,
                "source" => "google_places"
              }
            end
        end

      true ->
        # intentional synthetic catalog (labeled)
        case PlaceProvider.search_with_fallback(
               area_label: c["area_label"] || "Little Italy",
               category: c["category"] || "dinner"
             ) do
          {:ok, list} ->
            %{
              "candidates" =>
                Enum.map(list, fn p ->
                  Map.merge(p, %{
                    "provenance" =>
                      WorldFact.provenance(%{
                        "source" => "fixture_catalog",
                        "source_item_id" => p["provider_place_id"] || p["id"],
                        "synthetic" => true,
                        "real" => false,
                        "live" => false
                      }),
                    "truth_class" => "provider_fact"
                  })
                end),
              "provider_mode" => "synthetic",
              "source" => "fixture_catalog",
              "real" => false,
              "synthetic" => true,
              "recorded" => false,
              "live" => false
            }

          {:error, e} ->
            %{"candidates" => [], "error" => to_string(e), "source" => "fixture_catalog"}
        end
    end
  end

  @doc "Travel fact with provenance + freshness."
  def travel_fact(attrs) when is_map(attrs) do
    a = stringify(attrs)
    observed = DateTime.utc_now() |> DateTime.truncate(:second)

    case TravelProvider.estimate(a) do
      {:ok, t} ->
        t = stringify(t)
        expires = DateTime.add(observed, @travel_ttl_sec, :second)

        fact = %{
          "truth_class" => "provider_fact",
          "fact_type" => "travel_duration",
          "origin" => %{
            "lat" => a["origin_lat"] || a["from_lat"],
            "lng" => a["origin_lng"] || a["from_lng"],
            "label" => a["origin_label"] || "private_origin",
            "shared" => false
          },
          "destination" => %{
            "lat" => a["dest_lat"] || a["to_lat"] || a["lat"],
            "lng" => a["dest_lng"] || a["to_lng"] || a["lng"],
            "label" => a["dest_label"] || a["name"],
            "provider_place_id" => a["provider_place_id"]
          },
          "mode" => t["mode"] || a["mode"] || "driving",
          "duration_minutes" => t["duration_minutes"],
          "distance_meters" => t["distance_meters"],
          "estimate_class" => t["estimate_class"] || "geometric_estimate",
          "traffic_aware" => t["traffic_aware"] == true,
          "may_label_as_drive_eta" => t["may_label_as_drive_eta"] == true,
          "observed_at" => observed,
          "expires_at" => expires,
          "fresh" => true,
          "provider" => t["provider"] || "haversine",
          "provenance" =>
            WorldFact.provenance(%{
              "source" => t["provider"] || "haversine",
              "source_item_id" => a["provider_place_id"],
              "observed_at" => observed,
              "valid_until" => expires,
              "real" => t["provider"] not in ["haversine", nil],
              "synthetic" => t["provider"] in ["haversine", nil],
              "live" => false,
              "confidence" => if(t["traffic_aware"], do: 0.85, else: 0.55)
            }),
          "origin_exposed_to_peers" => false,
          "authorizes_set" => false
        }

        :ok = ExternalWorldTruth.assert_provider_provenance!(fact)
        {:ok, fact}

      err ->
        err
    end
  end

  def travel_fact(_), do: {:error, :invalid}

  @doc "Stale travel must not remain authoritative."
  def travel_fresh?(fact, now \\ DateTime.utc_now())

  def travel_fresh?(fact, now) when is_map(fact) do
    f = stringify(fact)
    exp = f["expires_at"] || get_in(f, ["provenance", "valid_until"])

    cond do
      match?(%DateTime{}, exp) -> DateTime.compare(now, exp) != :gt
      is_binary(exp) ->
        case DateTime.from_iso8601(exp) do
          {:ok, dt, _} -> DateTime.compare(now, dt) != :gt
          _ -> false
        end
      true -> false
    end
  end

  def travel_fresh?(_, _), do: false

  @doc "Soft leave copy — no fake exactness for geometric estimates."
  def leave_copy(travel_fact, when_label \\ "dinner")

  def leave_copy(travel_fact, when_label) when is_map(travel_fact) do
    t = stringify(travel_fact)
    mins = t["duration_minutes"]

    cond do
      not is_number(mins) ->
        nil

      t["may_label_as_drive_eta"] == true and travel_fresh?(t) ->
        # precise traffic ETA path (not default)
        "Leave in about #{round(mins)} minutes for #{when_label}."

      true ->
        # geometric / approximate
        approx = approx_bucket(mins)
        "Leave in about #{approx} minutes for #{when_label}."
    end
  end

  def leave_copy(_, _), do: nil

  # --- internals ---

  defp search_query(c) do
    %{
      "area_label" => c["area_label"] || "Little Italy",
      "category" => c["category"] || "italian",
      "lat" => c["origin_lat"] || c["lat"],
      "lng" => c["origin_lng"] || c["lng"],
      "max_candidates" => c["max_candidates"] || 8,
      "actionability_probability" => 0.8
    }
  end

  defp attach_provider_envelope(c) do
    c = stringify(c)
    observed = DateTime.utc_now() |> DateTime.truncate(:second)
    prov = c["provenance"] || WorldFact.provenance(%{
      "source" => c["provider"] || c["provider_freshness"] || "fixture_catalog",
      "source_item_id" => c["provider_place_id"] || c["id"],
      "observed_at" => observed,
      "valid_until" => DateTime.add(observed, @place_ttl_sec, :second),
      "synthetic" => c["provider_freshness"] in ["fixture", "fixture_catalog", nil],
      "real" => c["provider"] == "google_places" and c["provider_freshness"] != "recorded"
    })

    c
    |> Map.put("truth_class", "provider_fact")
    |> Map.put("fact_type", "place")
    |> Map.put("provenance", prov)
    |> Map.put("observed_at", prov["observed_at"])
    |> Map.put("expires_at", prov["valid_until"] || DateTime.add(observed, @place_ttl_sec, :second))
    |> Map.put_new("reservation_available", :unknown)
    |> Map.put("authorizes_set", false)
  end

  defp closed_hard?(c) do
    c["open_at_plan_time"] == false or c["open_now"] == false or
      c["business_status"] in ~w(CLOSED_TEMPORARILY CLOSED_PERMANENTLY)
  end

  defp excluded_area?(c, excl) do
    area = String.downcase(to_string(c["area_label"] || ""))
    Enum.any?(excl, fn e -> String.contains?(area, String.downcase(to_string(e))) end)
  end

  defp ensure_provenance!(c) do
    :ok = ExternalWorldTruth.assert_provider_provenance!(c)
    c
  end

  defp has_provenance?(c) do
    ExternalWorldTruth.assert_provider_provenance!(c)
    true
  rescue
    _ -> false
  end

  defp travel_by_place(candidates, c) do
    Enum.reduce(candidates, %{}, fn p, acc ->
      id = p["provider_place_id"] || p["id"]

      case travel_for(p, c) do
        %{"duration_minutes" => m} when is_number(m) -> Map.put(acc, id, m)
        _ -> Map.put(acc, id, 18)
      end
    end)
  end

  defp travel_for(nil, _), do: nil

  defp travel_for(place, c) do
    p = stringify(place || %{})

    attrs = %{
      "origin_lat" => c["origin_lat"] || 32.7157,
      "origin_lng" => c["origin_lng"] || -117.1611,
      "origin_label" => "work",
      "dest_lat" => p["lat"],
      "dest_lng" => p["lng"],
      "dest_label" => p["name"] || p["display_name"],
      "provider_place_id" => p["provider_place_id"] || p["id"],
      "mode" => c["travel_mode"] || "driving",
      "from_lat" => c["origin_lat"] || 32.7157,
      "from_lng" => c["origin_lng"] || -117.1611,
      "to_lat" => p["lat"] || 32.7269,
      "to_lng" => p["lng"] || -117.1698
    }

    case travel_fact(attrs) do
      {:ok, t} -> t
      _ -> nil
    end
  end

  defp place_identity(nil), do: nil

  defp place_identity(p) do
    p = stringify(p)

    %{
      "display_name" => p["display_name"] || p["name"],
      "provider" => get_in(p, ["provenance", "source"]) || p["provider"] || "unknown",
      "provider_place_id" => p["provider_place_id"] || p["id"],
      "address" => p["address"],
      "area_label" => p["area_label"],
      "lat" => p["lat"],
      "lng" => p["lng"],
      "truth_class" => "provider_fact",
      "provenance" => p["provenance"],
      "authorizes_set" => false,
      "reservation_available" => :unknown
    }
  end

  defp explicit_share(nil), do: nil

  defp explicit_share(id) do
    %{
      "human" =>
        [id["display_name"], id["area_label"]]
        |> Enum.reject(&(&1 in [nil, ""]))
        |> Enum.join(" · "),
      "backend" => %{
        "provider_place_id" => id["provider_place_id"],
        "provider" => id["provider"],
        "lat" => id["lat"],
        "lng" => id["lng"],
        "source" => get_in(id, ["provenance", "source"])
      },
      "share_kind" => "explicit_user_share",
      "auto_shared" => false
    }
  end

  defp leave_consequence(nil, _), do: %{"kind" => "silence", "reason" => "no_travel_truth"}

  defp leave_consequence(travel, c) do
    mins_until = c["minutes_until_event"] || 90
    duration = travel["duration_minutes"]

    facts = [
      %{
        "conversation_id" => c["conversation_id"] || "jordan-1",
        "who" => c["who"] || "Jordan",
        "next_gap" => "none",
        "lifecycle_stage" => "set",
        "sufficiency" => "usable",
        "has_meaningful_dims" => true,
        "when" => c["when_label"] || "Thursday · 6:30 PM",
        "minutes_until" => mins_until,
        "requires_user_action" => false
      }
    ]

    flow =
      PersonalFlow.compose(facts, %{
        "work_ends_in_minutes" => c["work_ends_in_minutes"] || -30,
        "travel_minutes" => duration,
        "travel_source" => travel["provider"],
        "already_travelling" => c["already_travelling"] == true
      })

    soft_copy = leave_copy(travel, "dinner with Jordan")

    flow
    |> Map.put("travel_fresh", travel_fresh?(travel))
    |> Map.put("human_consequence", soft_copy || flow["human_consequence"])
    |> Map.put("no_fake_exactness", travel["may_label_as_drive_eta"] != true)
  end

  defp delivery_for(leave, c) do
    facts = %{
      "conversation_id" => c["conversation_id"] || "jordan-1",
      "leave_by_relevant" => leave["kind"] == "leave_window",
      "minutes_until" => leave["minutes_until"] || 20
    }

    prior = c["prior_delivery_history"] || []

    NotificationDelivery.build_intent(facts, leave, %{
      "permission" => c["notification_permission"] || "granted",
      "app_backgrounded" => c["app_backgrounded"] != false,
      "history" => prior
    })
  end

  defp curate_surface(nil), do: nil

  defp curate_surface(p) do
    p = stringify(p)
    open = p["open_now"]

    open_label =
      cond do
        open == true -> "open"
        open == false -> "closed"
        true -> "hours unknown"
      end

    travel = p["travel"] || p["duration_minutes"]

    %{
      "id" => p["id"] || p["provider_place_id"],
      "name" => p["display_name"] || p["name"],
      "area" => p["area_label"],
      "travel_minutes" => travel,
      "open_state" => open_label,
      "social_score" => p["score"],
      "truth_class" => p["truth_class"] || "provider_fact",
      "provider_place_id" => p["provider_place_id"] || p["id"],
      "provenance_source" => get_in(p, ["provenance", "source"]),
      "reservation_available" => :unknown,
      "curate_line" =>
        [
          p["display_name"] || p["name"],
          p["area_label"],
          if(is_number(travel), do: "#{round(travel)} min", else: nil)
        ]
        |> Enum.reject(&is_nil/1)
        |> Enum.join(" · ")
    }
  end

  defp ranked_from_fit(fit) when is_map(fit) do
    fit["options"] || fit["kept"] || fit["candidates"] || []
  end

  defp ranked_from_fit(_), do: []

  defp empty_abstention(true, c) do
    %{
      "kind" => "one_question",
      "text" =>
        c["empty_question"] ||
          "Nothing nearby fits all of that well. Want to widen the area?",
      "authorizes_set" => false,
      "fabricated_venue" => false
    }
  end

  defp empty_abstention(_, _), do: nil

  defp debug_snapshot(selected, travel) do
    %{
      "SOCIAL_FIT" => if(selected, do: "ranked_by_collective_place_fit", else: "none"),
      "PROVIDER_FACTS" => %{
        "open" => selected && selected["open_now"],
        "address" => selected && selected["address"],
        "coordinates" => selected && %{lat: selected["lat"], lng: selected["lng"]}
      },
      "TRAVEL" => travel && travel["duration_minutes"],
      "BOOKABILITY" => "unknown",
      "EXECUTION" => "none"
    }
  end

  defp approx_bucket(mins) when mins <= 10, do: 10
  defp approx_bucket(mins) when mins <= 15, do: 15
  defp approx_bucket(mins) when mins <= 20, do: 20
  defp approx_bucket(mins) when mins <= 25, do: 25
  defp approx_bucket(mins) when mins <= 30, do: 30
  defp approx_bucket(mins) when mins <= 40, do: 40
  defp approx_bucket(mins) when mins <= 50, do: 50
  defp approx_bucket(_), do: 60

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
