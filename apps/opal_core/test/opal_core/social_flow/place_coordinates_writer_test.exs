defmodule OpalCore.SocialFlow.PlaceCoordinatesWriterTest do
  @moduledoc """
  Founder Polish Wave, Cluster G2 - the place-coordinates writer
  (the BS-06 writer gap).

  Before this cluster, nothing outside the schema/changeset wrote
  `shared_plans.place_lat/place_lon`, so the shipped P10c leave-by
  derivation truthfully read "no_place_coordinates" for every real
  plan. These pins cover the writer end to end:

  - a plan created from a chosen candidate (conversation create,
    Center create, graph create, and the server-side Center venue
    attach - the path that actually receives gateway candidates)
    carries the candidate's coordinates on the ROW and on the plan
    CONTRACT;
  - a plan created without a candidate keeps null coords (nothing
    is geocoded or invented at create time);
  - the pair follows the place through the existing edit path and
    the place-type conversion (clear on location-only edit / on a
    coordinate-less candidate / while virtual; restored on
    convert-back from the suspended-place stash);
  - a lone or out-of-range pair is rejected - at the create entry
    points, at the edit path, and at the SharedPlan changeset
    itself - and nothing is written;
  - the chain closes: a plan created WITH a candidate through the
    real create function reaches leave-by's ok state (route stubbed
    at the :geoapify_http_fun seam, the leave_by_test pattern),
    while the same create without a candidate reads
    no_place_coordinates.

  The route stub and share helpers mirror leave_by_test.exs.
  """
  use OpalCore.DataCase, async: false

  alias OpalCore.Center.ProviderAction
  alias OpalCore.Fixtures
  alias OpalCore.FixturesHelper
  alias OpalCore.Repo
  alias OpalCore.SocialFlow
  alias OpalCore.SocialFlow.LeaveBy
  alias OpalCore.SocialFlow.PlanLocationShare
  alias OpalCore.SocialFlow.SharedPlan

  @place_lat 32.7231
  @place_lon -117.1683
  @route_body {:ok,
               %{
                 "features" => [
                   %{
                     "properties" => %{
                       "mode" => "drive",
                       "distance" => 12_000,
                       "time" => 1500.0
                     }
                   }
                 ]
               }}

  setup do
    FixturesHelper.seed!()

    prior_key = Application.get_env(:opal_core, :geoapify_api_key)
    prior_fun = Application.get_env(:opal_core, :geoapify_http_fun)
    Application.put_env(:opal_core, :geoapify_api_key, "test-key-not-real")

    on_exit(fn ->
      restore_env(:geoapify_api_key, prior_key)
      restore_env(:geoapify_http_fun, prior_fun)
    end)

    :ok
  end

  defp restore_env(key, nil), do: Application.delete_env(:opal_core, key)
  defp restore_env(key, value), do: Application.put_env(:opal_core, key, value)

  defp stub_route(result) do
    pid = self()

    Application.put_env(:opal_core, :geoapify_http_fun, fn _url, params ->
      send(pid, {:geoapify_route, params})
      result
    end)
  end

  defp alex, do: Fixtures.user_alex_id()
  defp conv, do: Fixtures.conv_alex_jordan_id()

  # Row values are Decimals once loaded; in-flight structs can
  # still carry the caller's plain numbers. Both read as floats.
  defp as_float(%Decimal{} = value), do: Decimal.to_float(value)
  defp as_float(value) when is_number(value), do: value * 1.0
  defp as_float(_), do: nil

  defp coords(%SharedPlan{} = plan), do: {as_float(plan.place_lat), as_float(plan.place_lon)}

  defp reload!(plan), do: Repo.get!(SharedPlan, plan.id)

  describe "place_coordinates_from_params/1 - the one reader" do
    test "a full in-range pair reads ok (place_* keys and gateway lat/lon keys)" do
      assert {:ok, {@place_lat, @place_lon}} =
               SocialFlow.place_coordinates_from_params(%{
                 "place_lat" => @place_lat,
                 "place_lon" => @place_lon
               })

      assert {:ok, {@place_lat, @place_lon}} =
               SocialFlow.place_coordinates_from_params(%{
                 "lat" => @place_lat,
                 "lon" => @place_lon
               })
    end

    test "no pair is :absent - null coords are the honest default" do
      assert :absent = SocialFlow.place_coordinates_from_params(%{"title" => "Dinner"})
      assert :absent = SocialFlow.place_coordinates_from_params(%{})
    end

    test "a lone, non-numeric, or out-of-range pair is rejected, never clamped" do
      assert {:error, :invalid_place_coordinates} =
               SocialFlow.place_coordinates_from_params(%{"place_lat" => @place_lat})

      assert {:error, :invalid_place_coordinates} =
               SocialFlow.place_coordinates_from_params(%{
                 "place_lat" => 91.0,
                 "place_lon" => @place_lon
               })

      assert {:error, :invalid_place_coordinates} =
               SocialFlow.place_coordinates_from_params(%{
                 "place_lat" => @place_lat,
                 "place_lon" => -181.0
               })

      assert {:error, :invalid_place_coordinates} =
               SocialFlow.place_coordinates_from_params(%{
                 "place_lat" => "32.7231",
                 "place_lon" => @place_lon
               })
    end
  end

  describe "SharedPlan changeset - the pair law on the row itself" do
    test "a lone or out-of-range pair fails validation; a valid pair passes" do
      base = %{
        "title" => "Changeset plan",
        "status" => "tentative",
        "timezone" => "UTC",
        "time_label" => "Saturday 7 PM",
        "location" => "Juniper & Ivy",
        "created_by_user_id" => alex(),
        "source" => "center",
        "alignment" => %{}
      }

      assert {:error, cs} =
               %SharedPlan{}
               |> SharedPlan.changeset(Map.put(base, "place_lat", @place_lat))
               |> Repo.insert()

      assert %{place_lon: _} = errors_on(cs)

      assert {:error, cs} =
               %SharedPlan{}
               |> SharedPlan.changeset(
                 Map.merge(base, %{"place_lat" => 91.0, "place_lon" => @place_lon})
               )
               |> Repo.insert()

      assert %{place_lat: _} = errors_on(cs)

      assert {:ok, plan} =
               %SharedPlan{}
               |> SharedPlan.changeset(
                 Map.merge(base, %{"place_lat" => @place_lat, "place_lon" => @place_lon})
               )
               |> Repo.insert()

      assert coords(plan) == {@place_lat, @place_lon}
    end
  end

  describe "conversation create (SocialFlow.create_tentative_plan_from_conversation/3)" do
    test "with a candidate pair: row + contract carry the coordinates" do
      assert {:ok, plan, _participants} =
               SocialFlow.create_tentative_plan_from_conversation(conv(), alex(), %{
                 "title" => "Dinner at Juniper & Ivy",
                 "location" => "Juniper & Ivy",
                 "time_label" => "Saturday 7 PM",
                 "place_lat" => @place_lat,
                 "place_lon" => @place_lon
               })

      assert coords(reload!(plan)) == {@place_lat, @place_lon}

      payload = SocialFlow.plan_payload(plan)
      assert as_float(payload["place_lat"]) == @place_lat
      assert as_float(payload["place_lon"]) == @place_lon
    end

    test "without a candidate: coords stay null - never invented" do
      assert {:ok, plan, _participants} =
               SocialFlow.create_tentative_plan_from_conversation(conv(), alex(), %{
                 "title" => "Dinner somewhere",
                 "location" => "Juniper & Ivy",
                 "time_label" => "Saturday 7 PM"
               })

      assert coords(reload!(plan)) == {nil, nil}
      payload = SocialFlow.plan_payload(plan)
      assert payload["place_lat"] == nil
      assert payload["place_lon"] == nil
    end

    test "an invalid pair refuses the create and writes nothing" do
      before = Repo.aggregate(SharedPlan, :count)

      assert {:error, :invalid_place_coordinates} =
               SocialFlow.create_tentative_plan_from_conversation(conv(), alex(), %{
                 "title" => "Dinner at Juniper & Ivy",
                 "location" => "Juniper & Ivy",
                 "time_label" => "Saturday 7 PM",
                 "place_lat" => @place_lat
               })

      assert Repo.aggregate(SharedPlan, :count) == before
    end

    test "a virtual plan never carries a physical place's coordinates" do
      assert {:ok, plan, _participants} =
               SocialFlow.create_tentative_plan_from_conversation(conv(), alex(), %{
                 "title" => "Video call dinner",
                 "time_label" => "Saturday 7 PM",
                 "plan_type" => "virtual",
                 "meeting_link" => "https://meet.google.com/abc-defg-hij",
                 "place_lat" => @place_lat,
                 "place_lon" => @place_lon
               })

      assert plan.plan_type == "virtual"
      assert coords(reload!(plan)) == {nil, nil}
    end
  end

  describe "Center + graph create" do
    test "center create with a candidate pair stamps the row" do
      assert {:ok, plan, _participants} =
               SocialFlow.create_tentative_plan_from_center(alex(), %{
                 "title" => "Juniper & Ivy",
                 "area" => "Little Italy",
                 "time_label" => "Open window",
                 "decision_id" => "dec-g2-coords",
                 "place_lat" => @place_lat,
                 "place_lon" => @place_lon
               })

      assert coords(reload!(plan)) == {@place_lat, @place_lon}
    end

    test "center create rejects an out-of-range pair and writes nothing" do
      before = Repo.aggregate(SharedPlan, :count)

      assert {:error, :invalid_place_coordinates} =
               SocialFlow.create_tentative_plan_from_center(alex(), %{
                 "title" => "Juniper & Ivy",
                 "time_label" => "Open window",
                 "decision_id" => "dec-g2-bad",
                 "place_lat" => @place_lat,
                 "place_lon" => 200.0
               })

      assert Repo.aggregate(SharedPlan, :count) == before
    end

    test "graph create with a candidate pair stamps the row; invalid pair refused" do
      assert {:ok, plan, _participants, false} =
               SocialFlow.create_plan_from_graph_create(alex(), %{
                 "title" => "Graph dinner at Juniper",
                 "location" => "Juniper & Ivy",
                 "time_label" => "Saturday 7 PM",
                 "place_lat" => @place_lat,
                 "place_lon" => @place_lon
               })

      assert coords(reload!(plan)) == {@place_lat, @place_lon}

      assert {:error, :invalid_place_coordinates} =
               SocialFlow.create_plan_from_graph_create(alex(), %{
                 "title" => "Graph dinner elsewhere",
                 "place_lon" => @place_lon
               })
    end

    test "center dedupe merge fills a survivor's empty pair, never overwrites" do
      attrs = %{
        "title" => "Mergeable dinner",
        "location" => "Juniper & Ivy",
        "time_label" => "Saturday 7 PM"
      }

      assert {:ok, first, _} = SocialFlow.create_tentative_plan_from_center(alex(), attrs)
      assert coords(first) == {nil, nil}

      assert {:ok, merged, _} =
               SocialFlow.create_tentative_plan_from_center(
                 alex(),
                 Map.merge(attrs, %{"place_lat" => @place_lat, "place_lon" => @place_lon})
               )

      assert merged.id == first.id
      assert coords(reload!(merged)) == {@place_lat, @place_lon}

      # A later fragment with a DIFFERENT pair does not overwrite.
      assert {:ok, again, _} =
               SocialFlow.create_tentative_plan_from_center(
                 alex(),
                 Map.merge(attrs, %{"place_lat" => 40.0, "place_lon" => -70.0})
               )

      assert again.id == first.id
      assert coords(reload!(again)) == {@place_lat, @place_lon}
    end
  end

  describe "Center venue attach (ProviderAction.attach_selected_venue/4) - the gateway candidate writer" do
    test "attaching a gateway candidate stamps its coordinates on the row + contract" do
      venue = %{
        "name" => "Juniper & Ivy",
        "address" => "2228 Kettner Blvd, San Diego",
        "provider" => "geoapify",
        "provider_place_id" => "geoapify-juniper",
        "lat" => @place_lat,
        "lon" => @place_lon
      }

      planning = %{"destination" => "San Diego", "when" => "Saturday 7 PM"}

      assert {:ok, %{plan: plan}} = ProviderAction.attach_selected_venue(alex(), venue, planning)
      assert coords(reload!(plan)) == {@place_lat, @place_lon}
      assert plan.alignment["venue"]["lat"] == @place_lat

      payload = SocialFlow.plan_payload(plan)
      assert as_float(payload["place_lat"]) == @place_lat
      assert as_float(payload["place_lon"]) == @place_lon
    end

    test "re-placing with a coordinate-less candidate clears the old place's pair" do
      venue = %{
        "name" => "Juniper & Ivy",
        "provider" => "geoapify",
        "provider_place_id" => "geoapify-juniper",
        "lat" => @place_lat,
        "lon" => @place_lon
      }

      planning = %{"destination" => "San Diego", "when" => "Saturday 7 PM"}
      assert {:ok, %{plan: plan}} = ProviderAction.attach_selected_venue(alex(), venue, planning)
      assert coords(plan) == {@place_lat, @place_lon}

      # The orchestrator's name-only fallback candidate shape: a name
      # and a provider, no coordinates at all.
      fallback = %{"name" => "Somewhere New", "provider" => "geoapify"}

      assert {:ok, %{plan: replaced}} =
               ProviderAction.attach_selected_venue(
                 alex(),
                 fallback,
                 Map.put(planning, "plan_id", plan.id)
               )

      assert replaced.id == plan.id
      assert coords(reload!(replaced)) == {nil, nil}
    end
  end

  describe "edit path (SocialFlow.edit_plan_details/1) - coords follow the place" do
    setup do
      {:ok, plan, _} =
        SocialFlow.create_tentative_plan_from_center(alex(), %{
          "title" => "Editable dinner",
          "location" => "Juniper & Ivy",
          "time_label" => "Saturday 7 PM",
          "decision_id" => "dec-g2-edit",
          "place_lat" => @place_lat,
          "place_lon" => @place_lon
        })

      %{plan: plan}
    end

    defp edit(plan, changes) do
      SocialFlow.edit_plan_details(%{
        plan_id: plan.id,
        user_id: alex(),
        changes: changes,
        trace_id: "trace-g2-edit"
      })
    end

    test "a location-only edit clears the old place's coordinates", %{plan: plan} do
      assert {:ok, %{plan: updated}} = edit(plan, %{"location" => "Harbor Table"})
      assert updated.location == "Harbor Table"
      assert coords(reload!(updated)) == {nil, nil}
    end

    test "a location edit WITH the new candidate's pair updates the coordinates", %{plan: plan} do
      assert {:ok, %{plan: updated}} =
               edit(plan, %{
                 "location" => "Harbor Table",
                 "place_lat" => 32.7157,
                 "place_lon" => -117.1611
               })

      assert coords(reload!(updated)) == {32.7157, -117.1611}
    end

    test "a title-only edit leaves the coordinates untouched", %{plan: plan} do
      assert {:ok, %{plan: updated}} = edit(plan, %{"title" => "Renamed dinner"})
      assert coords(reload!(updated)) == {@place_lat, @place_lon}
    end

    test "a lone coordinate refuses the whole edit atomically", %{plan: plan} do
      assert {:error, :invalid_place_coordinates} =
               edit(plan, %{"title" => "Should not stick", "place_lat" => 32.7})

      reloaded = reload!(plan)
      assert reloaded.title == "Editable dinner"
      assert coords(reloaded) == {@place_lat, @place_lon}
    end
  end

  describe "place-type conversion - the pair rides the suspended-place stash" do
    test "to virtual clears the row pair; convert-back restores the same pair" do
      {:ok, plan, _} =
        SocialFlow.create_tentative_plan_from_center(alex(), %{
          "title" => "Convertible dinner",
          "location" => "Juniper & Ivy",
          "time_label" => "Saturday 7 PM",
          "decision_id" => "dec-g2-convert",
          "place_lat" => @place_lat,
          "place_lon" => @place_lon
        })

      assert {:ok, %{plan: virtual, applied: true}} =
               SocialFlow.convert_plan_place_type(%{
                 "plan_id" => plan.id,
                 "user_id" => alex(),
                 "to_plan_type" => "virtual",
                 "meeting_link" => "https://meet.google.com/abc-defg-hij"
               })

      assert coords(reload!(virtual)) == {nil, nil}

      assert {:ok, %{plan: physical, applied: true}} =
               SocialFlow.convert_plan_place_type(%{
                 "plan_id" => plan.id,
                 "user_id" => alex(),
                 "to_plan_type" => "in_person"
               })

      assert coords(reload!(physical)) == {@place_lat, @place_lon}
    end
  end

  describe "the chain closes: created-with-candidate reaches leave-by ok" do
    test "conversation create with a candidate -> leave-by ok with a stubbed route" do
      stub_route(@route_body)
      now = DateTime.utc_now() |> DateTime.truncate(:second)

      assert {:ok, plan, _participants} =
               SocialFlow.create_tentative_plan_from_conversation(conv(), alex(), %{
                 "title" => "Dinner at Juniper & Ivy",
                 "location" => "Juniper & Ivy",
                 "time_label" => "Saturday 7 PM",
                 "place_lat" => @place_lat,
                 "place_lon" => @place_lon
               })

      # Test scaffolding for the CLOCK only (create paths carry the
      # label; start_at settles through the schedule chain) - the
      # coordinates under test came from the create itself.
      {:ok, plan} =
        plan
        |> SharedPlan.changeset(%{"start_at" => DateTime.add(now, 7200, :second)})
        |> Repo.update()

      {:ok, _share} =
        PlanLocationShare.share(plan.id, alex(), %{"lat" => 32.7503, "lon" => -117.16})

      lb = LeaveBy.for_plan(reload!(plan), alex(), now: now)
      assert lb["state"] == "ok"
      assert lb["travel_duration_seconds"] == 1500
      assert_received {:geoapify_route, _params}
    end

    test "the same create without a candidate reads no_place_coordinates" do
      stub_route(@route_body)
      now = DateTime.utc_now() |> DateTime.truncate(:second)

      assert {:ok, plan, _participants} =
               SocialFlow.create_tentative_plan_from_conversation(conv(), alex(), %{
                 "title" => "Dinner at Juniper & Ivy",
                 "location" => "Juniper & Ivy",
                 "time_label" => "Saturday 7 PM"
               })

      {:ok, plan} =
        plan
        |> SharedPlan.changeset(%{"start_at" => DateTime.add(now, 7200, :second)})
        |> Repo.update()

      {:ok, _share} =
        PlanLocationShare.share(plan.id, alex(), %{"lat" => 32.7503, "lon" => -117.16})

      lb = LeaveBy.for_plan(reload!(plan), alex(), now: now)
      assert lb["state"] == "no_place_coordinates"
      assert lb["leave_by_at"] == nil
      refute_received {:geoapify_route, _}
    end
  end
end
