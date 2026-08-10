defmodule OpalCore.SocialFlow.Ambient.OpportunityZone do
  @moduledoc """
  INTERNAL opportunity zones — not a map product.

  Derives one or a few candidate regions for acquisition.
  Never exposes raw origin coordinates or peer locations.
  """

  alias OpalCore.SocialFlow.Ambient.CoordinationMode
  alias OpalCore.SocialFlow.Physical.LocationContext

  @doc """
  Derive internal zone labels for candidate acquisition.

  attrs may include:
  - expected_area / home_area / destination_area
  - prior_commitment_place
  - current_area + near_term
  - participant_areas (shared-safe labels only)
  - hours_until_candidate
  """
  def derive(attrs) when is_map(attrs) do
    a = stringify(attrs)

    with {:ok, mode} <- CoordinationMode.infer(a),
         {:ok, origin} <-
           LocationContext.expected_origin(%{
             "prior_commitment_place" => a["prior_commitment_place"],
             "explicit_area" => a["expected_area"] || a["explicit_area"],
             "home_area" => a["home_area"],
             "work_area" => a["work_area"],
             "current_area" => a["current_area"],
             "near_term" => near_term?(mode, a)
           }) do
      weights = mode["signal_weights"] || %{}

      # Do not project current GPS into next Thursday
      area =
        cond do
          origin["usable_for_future_plan"] -> origin["area_label"]
          near_term?(mode, a) -> a["current_area"] || origin["area_label"]
          true -> a["expected_area"] || a["home_area"] || a["destination_area"]
        end

      peer_areas =
        List.wrap(a["participant_areas"])
        |> Enum.filter(&is_binary/1)
        |> Enum.uniq()

      zones =
        ([area] ++ peer_areas ++ List.wrap(a["destination_area"]))
        |> Enum.filter(&is_binary/1)
        |> Enum.uniq()
        |> Enum.take(3)
        |> Enum.map(fn label ->
          %{
            "area_label" => label,
            "shared_safe" => true,
            "origins_exposed" => false,
            "map_ui" => false
          }
        end)

      {:ok,
       %{
         "zones" => zones,
         "primary_area" => area,
         "mode" => mode["mode"],
         "origin_kind" => origin["kind"],
         "projects_today_to_future" => origin["projects_today_to_future"],
         "usable" => zones != [],
         "signal_weights" => weights,
         "map_ui" => false,
         "heat_map_ui" => false,
         "private" => true,
         "authorizes_set" => false
       }}
    end
  end

  def derive(_), do: {:ok, %{"zones" => [], "usable" => false, "map_ui" => false}}

  defp near_term?(%{"mode" => mode}, a) do
    mode in ~w(tonight already_out on_the_way) or a["near_term"] == true or
      (is_number(a["hours_until_candidate"]) and a["hours_until_candidate"] <= 8)
  end

  defp near_term?(_, a), do: a["near_term"] == true

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
