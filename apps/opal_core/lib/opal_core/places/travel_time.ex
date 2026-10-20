defmodule OpalCore.Places.TravelTime do
  @moduledoc """
  Travel-time derivation for leave-by (Founder Polish, Cluster G -
  the missing BS-06 foundation: distances/durations were declared
  never-computed; this module computes them, truthfully, or says
  why it cannot).

  One derivation, through the places Gateway's wired provider
  (Geoapify routing). Provider truth, from the code and the Routing
  API documentation: the response carries distance (meters) and
  time (seconds) under a traffic MODEL - `free_flow` or
  `approximated`. There is no live traffic feed, so the traffic
  honesty class of a successful route is "estimate" - this module
  never emits "live". A provider failure, missing credential, or
  unroutable pair is `{:error, reason}` - callers render class
  "unavailable" and NO numbers. Numbers are never invented,
  interpolated, or straight-line estimated here: if the provider
  did not drive the route, there is no duration.

  Leave-by math is pure and stated: leave_by = plan start minus
  (duration + buffer). The buffer is a named constant, projected
  verbatim on every contract so a surface never has to guess what
  was added.
  """

  alias OpalCore.Places.Gateway

  # The stated buffer: time to get out the door and park, on top of
  # the routed drive. Projected as `buffer_seconds` wherever a
  # leave-by is projected.
  @buffer_seconds 600

  def buffer_seconds, do: @buffer_seconds

  @doc """
  Route from `origin` to `destination` (each `%{lat, lon}` or
  `%{"lat" => _, "lon" => _}`). Returns `{:ok, travel}` with the
  provider's real distance/duration and the honesty class, or
  `{:error, reason}` with no numbers.
  """
  def route(origin, destination, opts \\ [])

  def route(%{} = origin, %{} = destination, opts) do
    query = %{
      "origin_lat" => coord(origin, "lat"),
      "origin_lon" => coord(origin, "lon"),
      "destination_lat" => coord(destination, "lat"),
      "destination_lon" => coord(destination, "lon")
    }

    gateway = Keyword.get(opts, :gateway, &Gateway.route/1)

    case gateway.(query) do
      {:ok, %{"distance_m" => dist, "duration_seconds" => dur} = raw}
      when is_number(dist) and is_number(dur) ->
        now = Keyword.get(opts, :now) || DateTime.utc_now()

        {:ok,
         %{
           "provider" => raw["provider"] || Gateway.primary_id(),
           "distance_m" => dist * 1.0,
           "duration_seconds" => dur * 1.0,
           # The provider classes its own traffic as a model, never
           # a live feed; anything else it claims is not trusted
           # past this line - the class caps at "estimate".
           "traffic_class" =>
             if(raw["traffic_class"] == "live", do: "estimate", else: raw["traffic_class"] || "estimate"),
           "traffic_model" => raw["traffic_model"],
           "computed_at" => now |> DateTime.truncate(:second) |> DateTime.to_iso8601()
         }}

      {:error, _} = err ->
        err

      _ ->
        {:error, :no_route}
    end
  end

  def route(_, _, _), do: {:error, :invalid}

  @doc "leave_by = start - (duration + buffer). Pure; all inputs explicit."
  def leave_by_at(%DateTime{} = start_at, duration_seconds, buffer_seconds \\ @buffer_seconds)
      when is_number(duration_seconds) and is_number(buffer_seconds) do
    DateTime.add(start_at, -round(duration_seconds) - buffer_seconds, :second)
  end

  @doc """
  The urgency truth at `now` for a computed leave-by:

  - "leave_now" - the leave-by instant has arrived and the plan has
    not started: the viewer must leave now. This is the escalation
    threshold the ambient rulebook renders (ready gold -> action).
  - "started" - the plan's start has passed; leave-by is history.
  - "on_track" - leave-by is still ahead.
  """
  def urgency(%DateTime{} = now, %DateTime{} = leave_by, %DateTime{} = start_at) do
    cond do
      DateTime.compare(now, start_at) != :lt -> "started"
      DateTime.compare(now, leave_by) != :lt -> "leave_now"
      true -> "on_track"
    end
  end

  def urgency(_, _, _), do: nil

  defp coord(map, "lat"), do: map["lat"] || map[:lat]
  defp coord(map, "lon"), do: map["lon"] || map[:lon]
end
