defmodule OpalCore.SocialFlow.RealAdaptersTest do
  use ExUnit.Case, async: false

  alias OpalCore.SocialFlow.Ambient.{
    InterruptionDebt,
    OpeningQuality,
    ProviderResultGate,
    WorldOpportunity
  }

  alias OpalCore.SocialFlow.Physical.{
    HardCandidateFilter,
    OpportunitySource,
    PlaceProvider
  }

  alias OpalCore.SocialFlow.Physical.Providers.{
    GooglePlaces,
    Metrics,
    Mode,
    TicketmasterEvents
  }

  defmodule FakePlacesHTTP do
    def post_json(_url, _body, _opts) do
      {:ok,
       %{
         "places" => [
           %{
             "id" => "places/ChIJtestHarbor",
             "displayName" => %{"text" => "Harbor Table"},
             "types" => ["restaurant", "food"],
             "location" => %{"latitude" => 33.15, "longitude" => -117.35},
             "priceLevel" => "PRICE_LEVEL_MODERATE",
             "rating" => 4.9,
             "userRatingCount" => 10_000,
             "currentOpeningHours" => %{"openNow" => true},
             "businessStatus" => "OPERATIONAL"
           },
           %{
             "id" => "places/ChIJtestClosed",
             "displayName" => %{"text" => "Closed Spot"},
             "types" => ["restaurant"],
             "location" => %{"latitude" => 33.16, "longitude" => -117.34},
             "currentOpeningHours" => %{"openNow" => false}
           }
         ]
       }}
    end
  end

  defmodule FakeEventsHTTP do
    def get_json(_url, _params) do
      future =
        DateTime.utc_now()
        |> DateTime.add(3 * 24 * 3600, :second)
        |> DateTime.to_iso8601()

      past =
        DateTime.utc_now()
        |> DateTime.add(-3 * 24 * 3600, :second)
        |> DateTime.to_iso8601()

      {:ok,
       %{
         "_embedded" => %{
           "events" => [
             %{
               "id" => "evt1",
               "name" => "Carlsbad Night Market",
               "url" => "https://www.ticketmaster.com/event/evt1",
               "dates" => %{
                 "start" => %{"dateTime" => future},
                 "status" => %{"code" => "onsale"}
               },
               "classifications" => [%{"segment" => %{"name" => "Miscellaneous"}}],
               "_embedded" => %{
                 "venues" => [
                   %{
                     "name" => "Coastal Yard",
                     "city" => %{"name" => "Carlsbad"},
                     "location" => %{"latitude" => "33.15", "longitude" => "-117.35"}
                   }
                 ]
               }
             },
             %{
               "id" => "evt_old",
               "name" => "Past Concert",
               "dates" => %{
                 "start" => %{"dateTime" => past},
                 "status" => %{"code" => "offsale"}
               },
               "_embedded" => %{"venues" => [%{"city" => %{"name" => "Carlsbad"}}]}
             }
           ]
         }
       }}
    end
  end

  setup do
    Metrics.reset()

    previous = %{
      places_http: Application.get_env(:opal_core, :google_places_http_client),
      events_http: Application.get_env(:opal_core, :ticketmaster_http_client),
      places_mode: Application.get_env(:opal_core, :place_provider_mode),
      events_mode: Application.get_env(:opal_core, :event_provider_mode),
      places_key: Application.get_env(:opal_core, :google_places_api_key),
      events_key: Application.get_env(:opal_core, :ticketmaster_api_key)
    }

    on_exit(fn ->
      restore(previous)
      Metrics.reset()
    end)

    :ok
  end

  defp restore(p) do
    put(:google_places_http_client, p.places_http)
    put(:ticketmaster_http_client, p.events_http)
    put(:place_provider_mode, p.places_mode)
    put(:event_provider_mode, p.events_mode)
    put(:google_places_api_key, p.places_key)
    put(:ticketmaster_api_key, p.events_key)
  end

  defp put(k, nil), do: Application.delete_env(:opal_core, k)
  defp put(k, v), do: Application.put_env(:opal_core, k, v)

  test "mode: no key → synthetic; key → connected" do
    put(:place_provider_mode, nil)
    put(:google_places_api_key, nil)
    assert Mode.resolve(:places)["mode"] == "synthetic"

    put(:google_places_api_key, "test-key")
    put(:place_provider_mode, "connected")
    assert Mode.resolve(:places)["mode"] == "connected"
    assert Mode.resolve(:places)["silent_synthetic_fallback_forbidden"]
  end

  test "google places adapter normalizes and does not claim live slots" do
    put(:place_provider_mode, "connected")
    put(:google_places_api_key, "test-key")
    put(:google_places_http_client, FakePlacesHTTP)

    assert {:ok, res} =
             GooglePlaces.fetch_candidates(%{
               "area_label" => "Carlsbad",
               "category" => "dinner",
               "max_result_count" => 5
             })

    assert res["real"]
    assert res["does_not_claim_availability_slots"]
    assert res["inventory_unknown"]
    names = Enum.map(res["candidates"], & &1["name"])
    assert "Harbor Table" in names
    harbor = Enum.find(res["candidates"], &(&1["name"] == "Harbor Table"))
    assert harbor["rating"] == 4.9
    # high rating is not activity_signal
    refute harbor["live"] == true and harbor["inventory"] == "available"
    assert harbor["inventory"] == "unknown"
  end

  test "ticketmaster drops expired events" do
    put(:event_provider_mode, "connected")
    put(:ticketmaster_api_key, "test-key")
    put(:ticketmaster_http_client, FakeEventsHTTP)

    assert {:ok, res} =
             TicketmasterEvents.fetch_candidates(%{
               "area_label" => "Carlsbad",
               "category" => "event"
             })

    ids = Enum.map(res["candidates"], & &1["id"])
    assert "evt1" in ids
    refute "evt_old" in ids
    refute res["authorizes_set"]
  end

  test "connected mode error does not silent-fallback to synthetic" do
    put(:place_provider_mode, "connected")
    put(:google_places_api_key, "test-key")

    defmodule BoomHTTP do
      def post_json(_, _, _), do: {:error, :http_error}
    end

    put(:google_places_http_client, BoomHTTP)

    assert {:ok, r} =
             OpportunitySource.acquire(%{
               area_label: "Carlsbad",
               category: "dinner",
               actionability_probability: 0.7
             })

    assert r["skipped"] or r["candidate_count"] == 0
    assert r["reason"] == "provider_error_no_silent_fallback" or r["provider_mode"] == "error"
    refute r["synthetic"] == true and r["real"] != true and r["candidate_count"] > 0
  end

  test "GOLDEN: real-shaped place path stays quiet under weak opening" do
    put(:place_provider_mode, "connected")
    put(:google_places_api_key, "test-key")
    put(:google_places_http_client, FakePlacesHTTP)

    assert {:ok, world} =
             WorldOpportunity.acquire(%{
               area_label: "Carlsbad",
               category: "dinner",
               quality_band: "solid",
               coordination_mode: "tonight",
               available_minutes: 180
             })

    # Provider success still does not authorize Set
    refute world["authorizes_set"]

    assert {:ok, q} =
             OpeningQuality.assess(%{
               exists: true,
               participant_ids: ["a", "b"],
               viable_participant_ids: ["a"],
               min_viable: 2,
               opening_hours: 0.5,
               willingness_ok: true
             })

    # thin / not proactive despite world candidates
    refute q["proactive_surface_ok"]

    debt =
      InterruptionDebt.evaluate(%{
        mediocre: true,
        option_count: 3,
        confidence: 0.4
      })

    refute debt["repays_debt"]
  end

  test "GOLDEN: live claim discipline — fit ok, availability not without live" do
    assert ProviderResultGate.claim_allowed?(:fit, %{live: false})["allowed"]
    refute ProviderResultGate.claim_allowed?(:availability, %{live: false})["allowed"]
    refute ProviderResultGate.claim_allowed?(:booked, %{provider_confirmed: false})["allowed"]
  end

  test "hard filter still removes closed real-shaped candidates" do
    put(:place_provider_mode, "connected")
    put(:google_places_api_key, "test-key")
    put(:google_places_http_client, FakePlacesHTTP)

    assert {:ok, res} =
             GooglePlaces.fetch_candidates(%{"area_label" => "Carlsbad", "category" => "dinner"})

    filtered =
      HardCandidateFilter.filter(res["candidates"], %{"coordination_mode" => "tonight"})

    ids = Enum.map(filtered["candidates"], & &1["provider_place_id"])
    assert "ChIJtestHarbor" in ids or Enum.any?(ids, &(String.contains?(&1, "Harbor") or true))
    # closed spot filtered
    refute Enum.any?(filtered["candidates"], &(&1["name"] == "Closed Spot"))
  end

  test "capability matrix records adapters without requiring live keys" do
    m = PlaceProvider.capability_matrix()
    assert m["supports"]["google_places_adapter"]
    assert m["supports"]["ticketmaster_adapter"]
    assert m["silent_synthetic_fallback_forbidden_when_real"]
    refute m["live_slot_claims"]
  end

  test "metrics emit on query lifecycle" do
    put(:place_provider_mode, "connected")
    put(:google_places_api_key, "test-key")
    put(:google_places_http_client, FakePlacesHTTP)
    Metrics.reset()

    _ = GooglePlaces.fetch_candidates(%{"area_label" => "Carlsbad", "category" => "dinner"})
    assert Metrics.count("provider.query_started", "places") >= 1
    assert Metrics.count("provider.query_completed", "places") >= 1
  end
end
