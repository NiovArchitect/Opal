defmodule OpalCore.SocialFlow.MomentRealityBridge do
  @moduledoc """
  Social Moment → Shared Reality → ProviderVertical projection (Pass 15 add-on).

  Uses existing seams only:
  SocialMoment → SocialReality seed → ProviderVertical → ExternalWorldTruth
  → CollectivePlaceFit → Curate projection → private select → explicit share

  Does NOT replace Curate UI, ranking engines, or claim live provider product complete.
  Does NOT claim booking/payment.

  Live SPA Curate remains partially fixture-facing — this bridge is the domain path.
  """

  alias OpalCore.SocialFlow.{
    AttributionGraph,
    ExperienceGraph,
    ProviderVertical,
    SocialMoment
  }

  @doc """
  Full additive path from Moment intent through provider projection.

  opts:
  - participant_user_ids
  - actor_user_id
  - prefer_recorded (default true when no live key)
  - origin_lat/lng (private)
  - minutes_until_event
  """
  def moment_to_reality_path(moment_attrs, opts \\ %{}) do
    moment = SocialMoment.new(moment_attrs)
    o = stringify(opts)

    with {:ok, seed} <-
           SocialMoment.do_with_people(moment, %{
             "participant_user_ids" => o["participant_user_ids"] || o["people"] || ["peer-1"],
             "actor_user_id" => o["actor_user_id"] || "actor-1",
             "what" => o["what"],
             "when" => o["when"]
           }) do
      reality_id = o["reality_id"] || "reality-from-" <> moment["id"]

      {:ok, graph} =
        ExperienceGraph.new()
        |> ExperienceGraph.link_moment_to_reality(moment["id"], reality_id, %{
          "moment" => %{"author" => moment["author_user_id"]},
          "reality" => %{"what" => seed["what"]}
        })

      # Provider projection — Pass 15 foundation; recorded by default
      vertical =
        ProviderVertical.jordan_place_vertical(%{
          "prefer_recorded" => o["prefer_recorded"] != false,
          "area_label" => place_area(moment) || o["area_label"] || "Little Italy",
          "category" => o["category"] || "italian",
          "hard_exclude_areas" => o["hard_exclude_areas"] || [],
          "origin_lat" => o["origin_lat"] || 32.7157,
          "origin_lng" => o["origin_lng"] || -117.1611,
          "who" => "people",
          "what" => seed["what"],
          "when_label" => seed["when"],
          "conversation_id" => reality_id,
          "minutes_until_event" => o["minutes_until_event"] || 120,
          "selected_place_id" => place_provider_id(moment)
        })

      # If Moment already has place identity, prefer it as candidate note
      curate_projection = %{
        "surface" => "existing_curate",
        "not_new_curate" => true,
        "provider_backed" => vertical["recorded"] == true or vertical["live"] == true,
        "live_claimed" => vertical["live"] == true,
        "recorded_fixture" => vertical["recorded"] == true,
        "candidates" => vertical["candidates"] || [],
        "ranked_by" => "collective_place_fit",
        "provider_is_not_authority" => true,
        "bookability" => "unknown",
        "execution" => "none",
        "fixture_facing_spa_gap" => true,
        "domain_path_ready" => true
      }

      selected = vertical["private_select"]
      share = vertical["explicit_share"]

      # Synthetic conversion attribution only when forced for proof
      attribution =
        if o["simulate_transaction"] == true do
          AttributionGraph.attribute_transaction(
            %{
              "id" => "sim-txn-" <> reality_id,
              "status" => "completed",
              "simulation" => true,
              "reality_id" => reality_id,
              "place_identity" => vertical["place_identity"],
              "amount_pool" => o["pool"] || 15.0,
              "causal_chain" => [
                %{
                  "moment_id" => moment["id"],
                  "author_user_id" => moment["author_user_id"],
                  "hop" => 0,
                  "evidence" => %{
                    "seeded_reality_from_moment" => true,
                    "place_remained_to_transaction" => true
                  }
                }
                | List.wrap(o["upstream_chain"] || [])
              ]
            },
            max_hops: o["max_hops"] || 3
          )
        else
          AttributionGraph.attribute_transaction(%{
            "id" => "no-txn",
            "status" => "none",
            "reality_id" => reality_id
          })
        end

      pool_sim =
        if o["simulate_transaction"] == true and attribution["status"] == "attributed" do
          AttributionGraph.simulate_pool_split(attribution, o["pool"] || 15.0)
        else
          nil
        end

      %{
        "moment" => moment,
        "reality_seed" => seed,
        "reality_id" => reality_id,
        "experience_graph" => graph,
        "provider_vertical" => %{
          "source" => vertical["source"],
          "live" => vertical["live"],
          "recorded" => vertical["recorded"],
          "synthetic" => vertical["synthetic"]
        },
        "curate_projection" => curate_projection,
        "private_select" => selected,
        "explicit_share" => share,
        "travel" => travel_honesty(vertical["travel"]),
        "leave_consequence" => vertical["leave_consequence"],
        "attribution" => attribution,
        "pool_simulation" => pool_sim,
        "commerce_on_moment" => SocialMoment.commerce_led?(moment),
        "laws" => %{
          "pass15_not_replaced" => true,
          "provider_vertical_canonical" => true,
          "recorded_not_live" => vertical["live"] != true,
          "haversine_not_traffic_eta" => true,
          "bookability_unknown" => true,
          "execution_none" => true,
          "attribution_not_payout" => attribution["is_payout"] != true,
          "live_economic_not_claimed" => true,
          "spa_curate_fixture_gap_preserved" => true
        }
      }
    end
  end

  defp place_area(moment) do
    get_in(moment, ["place_ref", "area_label"])
  end

  defp place_provider_id(moment) do
    get_in(moment, ["place_ref", "provider_place_id"])
  end

  defp travel_honesty(nil), do: nil

  defp travel_honesty(t) when is_map(t) do
    t
    |> Map.put("estimate_class", t["estimate_class"] || "geometric_estimate")
    |> Map.put("traffic_aware", t["traffic_aware"] == true)
    |> Map.put("not_live_traffic_eta", t["traffic_aware"] != true)
    |> Map.put("may_label_as_drive_eta", t["may_label_as_drive_eta"] == true)
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
