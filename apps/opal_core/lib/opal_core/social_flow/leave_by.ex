defmodule OpalCore.SocialFlow.LeaveBy do
  @moduledoc """
  Leave-by intelligence (Founder Polish, Cluster G - P10c; the
  BS-06 foundation: a distance writer / travel derivation did not
  exist and distances were never faked in its absence).

  THE one leave-by derivation. Given a plan and a viewer it answers
  exactly one question - when should THIS viewer leave - from:

  - origin: the viewer's OWN fresh per-plan location share
    (`PlanLocationShare` - the share they made for this plan, and
    nothing else; another party's location is never the viewer's
    origin, and Center device coords are never repurposed: that
    store's privacy law forbids it);
  - destination: the plan's own place coordinates
    (`shared_plans.place_lat/place_lon`);
  - the routed travel time from `OpalCore.Places.TravelTime`
    (Geoapify routing through the places gateway; the provider has
    no live traffic, so the class is "estimate" and the label says
    so plainly).

  Honesty states (a fabricated time is a defect; every absence is
  a named state with a finished plain line):

  - "ok" - a real route was computed. Carries leave_by_at,
    duration, distance, traffic class, buffer, computed_at, the
    urgency truth, and a finished spoken-style label.
  - "needs_location_share" - the viewer is not sharing location
    for this plan: "Share your location to see when to leave".
  - "no_place_coordinates" - the plan's place carries no
    coordinates: no leave-by, plainly.
  - "no_start_time" - no start instant to subtract from.
  - "not_applicable" - a virtual plan has no trip to time.
  - "unavailable" - the provider could not route (no key, error,
    no route): traffic class "unavailable" and NO numbers.

  Freshness: this is a read-time derivation with no cache - every
  projection read recomputes from the current share row and a
  fresh provider route, and stamps `computed_at`. Surfaces re-read
  on their existing cadence (detail open + re-reads after actions,
  thread alignment/message reads and realtime-triggered re-reads);
  the stamp is theirs to show, the math is never the client's.

  Access law: this module derives for a plan the CALLER has
  already established the viewer may read (PlanHistory /
  NextPlan both gate first). It reads no plan tables itself.
  """

  alias OpalCore.Places.TravelTime
  alias OpalCore.SocialFlow.PlanLocationShare
  alias OpalCore.SocialFlow.SharedPlan

  @traffic_label_estimate "Estimate - typical traffic, not live"

  @doc """
  The leave-by projection for one plan and one viewer. Always a
  full map (never nil): absent states carry nil numbers and a
  finished `label` line. Options: `:now` (test/clock), `:route_fun`
  (`fun(origin, destination) -> {:ok, travel} | {:error, _}`,
  defaults to `TravelTime.route/2`).
  """
  def for_plan(%SharedPlan{} = plan, viewer_id, opts \\ [])
      when is_binary(viewer_id) do
    now = Keyword.get(opts, :now) || DateTime.utc_now()

    cond do
      SharedPlan.virtual?(plan) ->
        absent("not_applicable", "This plan is online - there is no trip to time.", now)

      not match?(%DateTime{}, plan.start_at) ->
        absent("no_start_time", "No start time yet - leave-by needs a set time.", now)

      not (is_number(plan.place_lat) and is_number(plan.place_lon)) ->
        absent(
          "no_place_coordinates",
          "Leave-by is not available - this place has no location yet.",
          now
        )

      true ->
        case PlanLocationShare.fresh_for(plan.id, viewer_id, now) do
          %PlanLocationShare{} = share ->
            route_and_project(plan, share, viewer_id, now, opts)

          _ ->
            absent(
              "needs_location_share",
              "Share your location to see when to leave",
              now
            )
        end
    end
  end

  def for_plan(_, _, _), do: nil

  defp route_and_project(plan, share, _viewer_id, now, opts) do
    route_fun = Keyword.get(opts, :route_fun, &TravelTime.route/2)
    origin = %{lat: share.lat, lon: share.lon}
    destination = %{lat: plan.place_lat, lon: plan.place_lon}

    case route_fun.(origin, destination) do
      {:ok, %{"duration_seconds" => dur, "distance_m" => dist} = travel}
      when is_number(dur) and is_number(dist) ->
        computed(plan, travel, now)

      _ ->
        absent("unavailable", "Leave-by is unavailable right now.", now)
        |> Map.put("traffic_class", "unavailable")
    end
  end

  defp computed(plan, travel, now) do
    duration = travel["duration_seconds"]
    distance = travel["distance_m"]
    buffer = TravelTime.buffer_seconds()
    leave_by = TravelTime.leave_by_at(plan.start_at, duration, buffer)
    urgency = TravelTime.urgency(now, leave_by, plan.start_at)
    leave_by_label = time_label(leave_by, plan.timezone)
    duration_label = duration_label(duration)
    distance_label = distance_label(distance)
    traffic_class = travel["traffic_class"] || "estimate"

    label =
      case urgency do
        "leave_now" ->
          "Leave now to arrive on time - the drive is about #{duration_label} (estimate)"

        "started" ->
          "This plan has started - leave-by was #{leave_by_label}"

        _ ->
          "Leave by #{leave_by_label} to arrive calm - #{duration_label} drive, #{distance_label} (estimate, includes a #{div(buffer, 60)} min buffer)"
      end

    %{
      "state" => "ok",
      "label" => label,
      "urgency" => urgency,
      "leave_by_at" => DateTime.to_iso8601(leave_by),
      "leave_by_label" => leave_by_label,
      "travel_duration_seconds" => round(duration),
      "travel_duration_label" => duration_label,
      "travel_distance_m" => round(distance),
      "travel_distance_label" => distance_label,
      "traffic_class" => traffic_class,
      "traffic_label" => traffic_label(traffic_class),
      "buffer_seconds" => buffer,
      "provider" => travel["provider"],
      "computed_at" => travel["computed_at"] || DateTime.to_iso8601(now)
    }
  end

  defp absent(state, label, now) do
    %{
      "state" => state,
      "label" => label,
      "urgency" => nil,
      "leave_by_at" => nil,
      "leave_by_label" => nil,
      "travel_duration_seconds" => nil,
      "travel_duration_label" => nil,
      "travel_distance_m" => nil,
      "travel_distance_label" => nil,
      "traffic_class" => nil,
      "traffic_label" => nil,
      "buffer_seconds" => TravelTime.buffer_seconds(),
      "provider" => nil,
      "computed_at" => DateTime.to_iso8601(now)
    }
  end

  defp traffic_label("estimate"), do: @traffic_label_estimate
  defp traffic_label("live"), do: "Live traffic"
  defp traffic_label("unavailable"), do: "Traffic unavailable"
  defp traffic_label(_), do: nil

  # Finished clock label in the plan's own timezone ("6:40 PM").
  defp time_label(%DateTime{} = dt, tz) do
    local =
      case DateTime.shift_zone(dt, tz || "UTC") do
        {:ok, shifted} -> shifted
        _ -> dt
      end

    hour12 = rem(local.hour + 11, 12) + 1
    minute = local.minute |> Integer.to_string() |> String.pad_leading(2, "0")
    ampm = if local.hour >= 12, do: "PM", else: "AM"
    "#{hour12}:#{minute} #{ampm}"
  end

  defp duration_label(seconds) when is_number(seconds) do
    minutes = round(seconds / 60)

    cond do
      minutes < 1 -> "under a minute"
      minutes < 60 -> "#{minutes} min"
      rem(minutes, 60) == 0 -> "#{div(minutes, 60)} hr"
      true -> "#{div(minutes, 60)} hr #{rem(minutes, 60)} min"
    end
  end

  defp distance_label(meters) when is_number(meters) do
    miles = meters / 1609.344
    "#{:erlang.float_to_binary(Float.round(miles * 10) / 10, decimals: 1)} mi"
  end
end
