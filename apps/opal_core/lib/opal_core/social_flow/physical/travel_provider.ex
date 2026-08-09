defmodule OpalCore.SocialFlow.Physical.TravelProvider do
  @moduledoc """
  Provider-neutral travel boundary.

  Provider establishes duration/distance facts.
  Opal decides relevance.

  Taxonomy:
  - geometric_estimate (haversine fallback) — NOT traffic_eta
  - traffic_eta only when a real provider returns it
  """

  alias OpalCore.SocialFlow.RealWorld.Proximity.TravelProvider, as: HaversineTravel

  def estimate(attrs) when is_map(attrs) do
    a = stringify(attrs)
    adapter = Application.get_env(:opal_core, :physical_travel_adapter, :geometric)

    case adapter do
      :geometric ->
        geometric(a)

      mod when is_atom(mod) ->
        if function_exported?(mod, :estimate, 1), do: mod.estimate(a), else: geometric(a)

      _ ->
        geometric(a)
    end
  end

  def estimate(_), do: {:error, :invalid}

  defp geometric(a) do
    case HaversineTravel.estimate(a) do
      {:ok, result} ->
        {:ok,
         %{
           "duration_minutes" => result["duration_minutes"],
           "distance_meters" => result["distance_meters"],
           "mode" => a["mode"] || "driving",
           "estimate_class" => "geometric_estimate",
           "traffic_aware" => false,
           "provider" => "haversine",
           "observed_at" => DateTime.utc_now() |> DateTime.truncate(:microsecond),
           "origin_exposed" => false,
           # Do not claim "25 minute drive" as traffic truth
           "may_label_as_drive_eta" => false
         }}

      err ->
        err
    end
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
