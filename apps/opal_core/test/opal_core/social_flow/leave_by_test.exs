defmodule OpalCore.SocialFlow.LeaveByTest do
  @moduledoc """
  Founder Polish, Cluster G (P10c) - leave-by intelligence.

  The provider is stubbed at the Geoapify transport seam
  (`:geoapify_http_fun`, the repo's mock-provider pattern) with a
  provider-shaped Routing API body. No external calls: the VM's
  DNS is synthetic and provider behavior in tests comes from the
  stub only.

  Pins: duration/distance math, the traffic honesty class (the
  wired provider has no live traffic - "estimate", never "live"),
  leave-by = start - (duration + stated buffer), the leave-now
  escalation threshold, the honest absent states, and per-viewer
  isolation (another party's location is never the viewer's
  origin - if the viewer is not sharing, there is no route call
  at all).
  """
  use OpalCore.DataCase, async: false

  alias OpalCore.Accounts.User
  alias OpalCore.Places.TravelTime
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.LeaveBy
  alias OpalCore.SocialFlow.NextPlan
  alias OpalCore.SocialFlow.PlanHistory
  alias OpalCore.SocialFlow.PlanLocationShare
  alias OpalCore.SocialFlow.PlanParticipant
  alias OpalCore.SocialFlow.PlanTransition
  alias OpalCore.SocialFlow.SharedPlan

  @place_lat 32.7231
  @place_lon -117.1683
  # 12,000 m = 7.5 mi; 1,500 s = 25 min.
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
    prior_key = Application.get_env(:opal_core, :geoapify_api_key)
    prior_fun = Application.get_env(:opal_core, :geoapify_http_fun)
    Application.put_env(:opal_core, :geoapify_api_key, "test-key-not-real")

    on_exit(fn ->
      restore(:geoapify_api_key, prior_key)
      restore(:geoapify_http_fun, prior_fun)
    end)

    :ok
  end

  defp restore(key, nil), do: Application.delete_env(:opal_core, key)
  defp restore(key, value), do: Application.put_env(:opal_core, key, value)

  defp stub_route(result) do
    pid = self()

    Application.put_env(:opal_core, :geoapify_http_fun, fn _url, params ->
      send(pid, {:geoapify_route, params})
      result
    end)
  end

  defp user!(name) do
    uid = System.unique_integer([:positive])

    %User{}
    |> User.changeset(%{display_name: name, handle: "lb-#{name}-#{uid}"})
    |> Repo.insert!()
  end

  defp plan!(creator_id, other_id, attrs \\ %{}) do
    base = %{
      "title" => "Leave-by plan",
      "status" => "agreed",
      "timezone" => "UTC",
      "time_label" => "Saturday 7 PM",
      "location" => "Juniper & Ivy",
      "created_by_user_id" => creator_id,
      "source" => "center",
      "alignment" => %{}
    }

    {:ok, plan} =
      %SharedPlan{}
      |> SharedPlan.changeset(Map.merge(base, attrs))
      |> PlanTransition.guard_changeset(:plan, :create_agreed)
      |> Repo.insert()

    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    for {user_id, role} <- [{creator_id, "lead"}, {other_id, "participant"}] do
      {:ok, _} =
        %PlanParticipant{}
        |> PlanParticipant.changeset(%{
          "plan_id" => plan.id,
          "user_id" => user_id,
          "role" => role,
          "response_state" => "accepted",
          "responded_at" => now
        })
        |> Repo.insert()
    end

    plan
  end

  defp share!(plan_id, user_id, lat \\ 32.7503, lon \\ -117.16) do
    {:ok, share} = PlanLocationShare.share(plan_id, user_id, %{"lat" => lat, "lon" => lon})
    share
  end

  describe "TravelTime.route/3 through the stubbed provider" do
    test "distance/duration pass through; class is estimate; request asks for the approximated model" do
      stub_route(@route_body)
      now = DateTime.utc_now()

      assert {:ok, travel} =
               TravelTime.route(%{lat: 32.7503, lon: -117.16}, %{lat: @place_lat, lon: @place_lon},
                 now: now
               )

      assert travel["distance_m"] == 12_000.0
      assert travel["duration_seconds"] == 1500.0
      assert(travel["traffic_class"] == "estimate")
      assert(travel["traffic_model"] == "approximated")
      assert(travel["provider"] == "geoapify")
      assert travel["computed_at"] == DateTime.to_iso8601(now)

      assert_received {:geoapify_route, params}
      params = Map.new(params)
      assert(params["traffic"] == "approximated")
      assert(params["mode"] == "drive")
      assert(params["waypoints"] == "32.7503,-117.16|32.7231,-117.1683")
    end

    test "a provider claiming live is capped at estimate - this provider has no live feed" do
      gateway = fn _query ->
        {:ok,
         %{
           "provider" => "geoapify",
           "distance_m" => 100.0,
           "duration_seconds" => 60.0,
           "traffic_class" => "live",
           "traffic_model" => "approximated"
         }}
      end

      assert {:ok, travel} =
               TravelTime.route(%{lat: 1.0, lon: 2.0}, %{lat: 3.0, lon: 4.0}, gateway: gateway)

      assert(travel["traffic_class"] == "estimate")
    end

    test "no route from the provider is an error with no numbers" do
      stub_route({:ok, %{"features" => []}})
      assert {:error, :no_route} = TravelTime.route(%{lat: 1.0, lon: 2.0}, %{lat: 3.0, lon: 4.0})
    end

    test "leave-by math: start minus duration minus the stated buffer" do
      start = ~U[2026-10-24 19:00:00Z]
      assert TravelTime.buffer_seconds() == 600
      assert TravelTime.leave_by_at(start, 1500.0) == DateTime.add(start, -2100, :second)
      assert TravelTime.leave_by_at(start, 1500.0, 0) == DateTime.add(start, -1500, :second)
    end

    test "urgency threshold: at the leave-by instant it flips to leave_now" do
      start = ~U[2026-10-24 19:00:00Z]
      leave_by = TravelTime.leave_by_at(start, 1500.0)
      assert TravelTime.urgency(DateTime.add(leave_by, -1, :second), leave_by, start) == "on_track"
      assert TravelTime.urgency(leave_by, leave_by, start) == "leave_now"
      assert TravelTime.urgency(start, leave_by, start) == "started"
    end
  end

  describe "LeaveBy.for_plan/3" do
    test "ok: full derivation with finished labels and the spoken-style line" do
      stub_route(@route_body)
      owner = user!("ownerok")
      guest = user!("guestok")
      now = DateTime.utc_now() |> DateTime.truncate(:second)
      start = DateTime.add(now, 7200, :second)

      plan =
        plan!(owner.id, guest.id, %{
          "start_at" => start,
          "place_lat" => @place_lat,
          "place_lon" => @place_lon
        })

      share!(plan.id, owner.id)

      lb = LeaveBy.for_plan(plan, owner.id, now: now)
      assert(lb["state"] == "ok")
      assert(lb["urgency"] == "on_track")
      assert lb["leave_by_at"] == DateTime.to_iso8601(DateTime.add(start, -2100, :second))
      assert lb["travel_duration_seconds"] == 1500
      assert(lb["travel_duration_label"] == "25 min")
      assert lb["travel_distance_m"] == 12_000
      assert(lb["travel_distance_label"] == "7.5 mi")
      assert(lb["traffic_class"] == "estimate")
      assert(lb["traffic_label"] == "Estimate - typical traffic, not live")
      assert lb["buffer_seconds"] == 600
      assert(lb["label"] =~ "Leave by ")
      assert(lb["label"] =~ "to arrive calm")
      assert(lb["label"] =~ "25 min drive, 7.5 mi")
      assert(lb["label"] =~ "includes a 10 min buffer")
      assert is_binary(lb["computed_at"])
    end

    test "escalation: inside the threshold the urgency is leave_now and the line says leave now" do
      stub_route(@route_body)
      owner = user!("ownernow")
      guest = user!("guestnow")
      now = DateTime.utc_now() |> DateTime.truncate(:second)
      # Start in 30 min; drive 25 min + 10 min buffer = leave-by 5 min ago.
      start = DateTime.add(now, 1800, :second)

      plan =
        plan!(owner.id, guest.id, %{
          "start_at" => start,
          "place_lat" => @place_lat,
          "place_lon" => @place_lon
        })

      share!(plan.id, owner.id)

      lb = LeaveBy.for_plan(plan, owner.id, now: now)
      assert(lb["state"] == "ok")
      assert(lb["urgency"] == "leave_now")
      assert(lb["label"] =~ "Leave now to arrive on time")
    end

    test "no share: the honest absent state, and the provider is never called" do
      stub_route(@route_body)
      owner = user!("ownernoshare")
      guest = user!("guestnoshare")
      now = DateTime.utc_now() |> DateTime.truncate(:second)

      plan =
        plan!(owner.id, guest.id, %{
          "start_at" => DateTime.add(now, 7200, :second),
          "place_lat" => @place_lat,
          "place_lon" => @place_lon
        })

      lb = LeaveBy.for_plan(plan, owner.id, now: now)
      assert(lb["state"] == "needs_location_share")
      assert(lb["label"] == "Share your location to see when to leave")
      assert(lb["leave_by_at"] == nil)
      assert(lb["travel_duration_seconds"] == nil)
      assert(lb["travel_distance_m"] == nil)
      refute_received {:geoapify_route, _}
    end

    test "per-viewer isolation: the other party's share is never the viewer's origin" do
      stub_route(@route_body)
      owner = user!("owneriso")
      guest = user!("guestiso")
      now = DateTime.utc_now() |> DateTime.truncate(:second)

      plan =
        plan!(owner.id, guest.id, %{
          "start_at" => DateTime.add(now, 7200, :second),
          "place_lat" => @place_lat,
          "place_lon" => @place_lon
        })

      # Only the GUEST shares. The owner's projection must not route
      # from the guest's position.
      share!(plan.id, guest.id, 33.1001, -117.3001)

      lb_owner = LeaveBy.for_plan(plan, owner.id, now: now)
      assert(lb_owner["state"] == "needs_location_share")
      refute_received {:geoapify_route, _}

      # The guest's own projection routes from the guest's share
      # (coarsened to 3 decimals by the share pipeline).
      lb_guest = LeaveBy.for_plan(plan, guest.id, now: now)
      assert(lb_guest["state"] == "ok")
      assert_received {:geoapify_route, params}
      assert(Map.new(params)["waypoints"] == "33.1,-117.3|32.7231,-117.1683")
    end

    test "no place coordinates: no leave-by, plainly, even when sharing" do
      stub_route(@route_body)
      owner = user!("ownernocoords")
      guest = user!("guestnocoords")
      now = DateTime.utc_now() |> DateTime.truncate(:second)

      plan = plan!(owner.id, guest.id, %{"start_at" => DateTime.add(now, 7200, :second)})
      share!(plan.id, owner.id)

      lb = LeaveBy.for_plan(plan, owner.id, now: now)
      assert(lb["state"] == "no_place_coordinates")
      assert(lb["leave_by_at"] == nil)
      assert(lb["travel_duration_seconds"] == nil)
      refute_received {:geoapify_route, _}
    end

    test "provider failure: unavailable, traffic class unavailable, no numbers" do
      stub_route({:error, :boom})
      owner = user!("ownerfail")
      guest = user!("guestfail")
      now = DateTime.utc_now() |> DateTime.truncate(:second)

      plan =
        plan!(owner.id, guest.id, %{
          "start_at" => DateTime.add(now, 7200, :second),
          "place_lat" => @place_lat,
          "place_lon" => @place_lon
        })

      share!(plan.id, owner.id)

      lb = LeaveBy.for_plan(plan, owner.id, now: now)
      assert(lb["state"] == "unavailable")
      assert(lb["traffic_class"] == "unavailable")
      assert(lb["leave_by_at"] == nil)
      assert(lb["travel_duration_seconds"] == nil)
      assert(lb["travel_distance_m"] == nil)
    end

    test "no provider key configured: unavailable, never a fabricated time" do
      Application.delete_env(:opal_core, :geoapify_api_key)
      Application.delete_env(:opal_core, :geoapify_http_fun)
      owner = user!("ownernokey")
      guest = user!("guestnokey")
      now = DateTime.utc_now() |> DateTime.truncate(:second)

      plan =
        plan!(owner.id, guest.id, %{
          "start_at" => DateTime.add(now, 7200, :second),
          "place_lat" => @place_lat,
          "place_lon" => @place_lon
        })

      share!(plan.id, owner.id)

      lb = LeaveBy.for_plan(plan, owner.id, now: now)
      assert(lb["state"] == "unavailable")
      assert(lb["travel_duration_seconds"] == nil)
    end

    test "virtual plan and undated plan are named absent states" do
      owner = user!("ownervirt")
      guest = user!("guestvirt")
      now = DateTime.utc_now() |> DateTime.truncate(:second)

      virtual =
        plan!(owner.id, guest.id, %{
          "start_at" => DateTime.add(now, 7200, :second),
          "plan_type" => "virtual",
          "place_lat" => @place_lat,
          "place_lon" => @place_lon
        })

      assert(LeaveBy.for_plan(virtual, owner.id, now: now)["state"] == "not_applicable")

      undated =
        plan!(owner.id, guest.id, %{"place_lat" => @place_lat, "place_lon" => @place_lon})

      assert(LeaveBy.for_plan(undated, owner.id, now: now)["state"] == "no_start_time")
    end
  end

  describe "projection wiring" do
    test "PlanHistory carries leave_by for the viewer (the plan detail projection)" do
      stub_route(@route_body)
      owner = user!("ownerhist")
      guest = user!("guesthist")
      now = DateTime.utc_now() |> DateTime.truncate(:second)

      plan =
        plan!(owner.id, guest.id, %{
          "start_at" => DateTime.add(now, 7200, :second),
          "place_lat" => @place_lat,
          "place_lon" => @place_lon
        })

      share!(plan.id, owner.id)

      assert {:ok, projection} = PlanHistory.for_plan(plan.id, owner.id)
      assert(projection["leave_by"]["state"] == "ok")
      assert projection["leave_by"]["travel_duration_seconds"] == 1500

      assert {:ok, guest_projection} = PlanHistory.for_plan(plan.id, guest.id)
      assert(guest_projection["leave_by"]["state"] == "needs_location_share")
    end

    test "NextPlan fact carries leave_by only when the caller opts in (thread path)" do
      stub_route(@route_body)
      owner = user!("ownernext")
      guest = user!("guestnext")
      now = DateTime.utc_now() |> DateTime.truncate(:second)

      {:ok, %{conversation_id: conversation_id}} =
        OpalCore.Messages.ensure_direct_conversation(owner.id, guest.id)

      plan =
        plan!(owner.id, guest.id, %{
          "source" => "conversation",
          "conversation_id" => conversation_id,
          "start_at" => DateTime.add(now, 7200, :second),
          "place_lat" => @place_lat,
          "place_lon" => @place_lon
        })

      share!(plan.id, owner.id)

      fact = NextPlan.for_conversation(owner.id, conversation_id, now: now)
      assert fact["plan_id"] == plan.id
      refute Map.has_key?(fact, "leave_by")

      fact_lb = NextPlan.for_conversation(owner.id, conversation_id, now: now, leave_by: true)
      assert(fact_lb["leave_by"]["state"] == "ok")
      assert(fact_lb["leave_by"]["urgency"] == "on_track")
      assert(fact_lb["leave_by"]["traffic_class"] == "estimate")
    end
  end
end
