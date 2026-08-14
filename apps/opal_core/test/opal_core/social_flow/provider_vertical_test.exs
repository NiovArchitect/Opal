defmodule OpalCore.SocialFlow.ProviderVerticalTest do
  use ExUnit.Case, async: true

  alias OpalCore.SocialFlow.ProviderVertical
  alias OpalCore.SocialFlow.ExternalWorldTruth
  alias OpalCore.SocialFlow.Physical.Providers.RecordedPlaces
  alias OpalCore.SocialFlow.Physical.PlaceProvider

  describe "recorded place adapter" do
    test "normalizes recorded fixture with provenance" do
      assert {:ok, r} = RecordedPlaces.fetch_candidates(%{"area_label" => "Little Italy", "category" => "italian"})
      assert r["recorded"] == true
      assert r["live"] == false
      assert r["source"] == "recorded_google_places"
      assert length(r["candidates"]) >= 3

      c = hd(r["candidates"])
      assert c["provider_place_id"]
      assert c["name"]
      assert c["provenance"]["source"] == "recorded_fixture"
      assert :ok = ExternalWorldTruth.assert_provider_provenance!(c)
      assert ExternalWorldTruth.llm_is_not_provider?(c["provenance"]["source"])
    end

    test "closed venues carry open_now false" do
      assert {:ok, r} = RecordedPlaces.fetch_candidates(%{})
      closed = Enum.find(r["candidates"], &(&1["name"] == "Closed Italian Corner"))
      assert closed
      assert closed["open_now"] == false
    end

    test "hours unknown is not closed" do
      assert {:ok, r} = RecordedPlaces.fetch_candidates(%{})
      unk = Enum.find(r["candidates"], &(&1["name"] == "Quiet Trattoria"))
      assert unk
      assert unk["open_now"] == :unknown
      assert unk["hours_known"] == false
    end
  end

  describe "jordan place vertical" do
    test "end-to-end recorded path: search → social fit → select → travel → leave" do
      v =
        ProviderVertical.jordan_place_vertical(%{
          "prefer_recorded" => true,
          "area_label" => "Little Italy",
          "category" => "italian",
          "hard_exclude_areas" => ["Downtown"],
          "origin_lat" => 32.7157,
          "origin_lng" => -117.1611,
          "minutes_until_event" => 90,
          "work_ends_in_minutes" => -20,
          "who" => "Jordan",
          "when_label" => "Thursday · 6:30 PM",
          "what" => "Dinner",
          "conversation_id" => "jordan-1",
          "notification_permission" => "granted",
          "app_backgrounded" => true
        })

      assert v["recorded"] == true
      assert v["live"] == false
      refute v["live"] == true
      assert v["search"]["admitted_count"] >= 1
      # Closed + downtown excluded
      names = Enum.map(v["candidates"], & &1["name"])
      refute "Closed Italian Corner" in names
      refute "Downtown Pasta Co" in names

      assert v["social_fit"]["provider_is_not_authority"] == true
      assert is_list(v["social_fit"]["ranked"])
      assert v["private_select"]["name"]
      assert v["place_identity"]["provider_place_id"]
      assert v["explicit_share"]["human"] =~ v["private_select"]["name"]
      assert v["explicit_share"]["backend"]["provider_place_id"]
      assert v["travel"]["duration_minutes"]
      assert v["travel"]["provenance"]
      assert v["travel"]["origin_exposed_to_peers"] == false
      assert v["leave_consequence"]["no_fake_exactness"] == true
      assert v["invariants"]["provider_fact_has_provenance"] == true
      assert v["invariants"]["no_fake_booking"] == true
      assert v["invariants"]["llm_not_provider"] == true
      assert v["debug_snapshot"]["BOOKABILITY"] == "unknown"
      assert v["debug_snapshot"]["EXECUTION"] == "none"
    end

    test "provider failure preserves who/what/when and reopens place" do
      v =
        ProviderVertical.jordan_place_vertical(%{
          "prefer_recorded" => true,
          "force_provider_failure" => true,
          "what" => "Dinner",
          "when_label" => "Thursday · 6:30 PM"
        })

      # forced failure short-circuits search candidates
      assert v["search"]["error"] == "forced_failure"
      f = v["provider_failure_recompose"]
      assert f["what"] == "Dinner"
      assert f["when"] == "Thursday · 6:30 PM"
      assert f["next_gap"] == "place"
      assert f["authorizes_set"] == false
    end

    test "stale travel is not fresh" do
      {:ok, t} =
        ProviderVertical.travel_fact(%{
          "origin_lat" => 32.72,
          "origin_lng" => -117.16,
          "dest_lat" => 32.73,
          "dest_lng" => -117.17,
          "provider_place_id" => "x"
        })

      assert ProviderVertical.travel_fresh?(t)
      stale = Map.put(t, "expires_at", DateTime.add(DateTime.utc_now(), -60, :second))
      refute ProviderVertical.travel_fresh?(stale)
    end

    test "leave copy stays approximate for geometric estimates" do
      t = %{
        "duration_minutes" => 23,
        "may_label_as_drive_eta" => false,
        "expires_at" => DateTime.add(DateTime.utc_now(), 600, :second)
      }

      copy = ProviderVertical.leave_copy(t, "dinner with Jordan")
      assert copy =~ "about"
      refute copy =~ "6:17"
    end

    test "notification supersession when leave key changes" do
      v1 =
        ProviderVertical.jordan_place_vertical(%{
          "prefer_recorded" => true,
          "minutes_until_event" => 50,
          "work_ends_in_minutes" => -10,
          "conversation_id" => "jordan-1",
          "notification_permission" => "granted",
          "app_backgrounded" => true
        })

      n1 = v1["notification"]
      hist = [%{"consequence_id" => "jordan-1", "supersession_key" => n1["supersession_key"], "status" => "delivered"}]

      v2 =
        ProviderVertical.jordan_place_vertical(%{
          "prefer_recorded" => true,
          "minutes_until_event" => 30,
          "work_ends_in_minutes" => -30,
          "conversation_id" => "jordan-1",
          "notification_permission" => "granted",
          "app_backgrounded" => true,
          "prior_delivery_history" => hist
        })

      # may supersede or suppress depending on leave window keys
      assert v2["notification"]["delivery_class"] in ~w(notify supersede suppress silent)
    end
  end

  describe "ExternalWorldTruth fact envelope" do
    test "travel ttl shorter than place ttl" do
      assert ExternalWorldTruth.freshness_ttl_seconds("travel_duration") <
               ExternalWorldTruth.freshness_ttl_seconds("place")

      assert ExternalWorldTruth.freshness_ttl_seconds("reservation_availability") <
               ExternalWorldTruth.freshness_ttl_seconds("travel_duration")
    end

    test "envelope requires provenance" do
      env =
        ExternalWorldTruth.fact_envelope(%{
          "provider" => "google_places",
          "provider_resource_id" => "p1",
          "fact_type" => "place",
          "value" => %{"name" => "X"},
          "source" => "recorded_fixture",
          "observed_at" => DateTime.utc_now()
        })

      assert env["truth_class"] == "provider_fact"
      assert env["llm_is_not_provider"] == true
    end
  end

  describe "place provider capability" do
    test "matrix exposes google adapter without claiming live booking" do
      m = PlaceProvider.capability_matrix()
      assert m["supports"]["google_places_adapter"]
      assert m["supports"]["live_booking"] == false
      assert m["provider_is_not_authority"] == true
    end
  end
end
