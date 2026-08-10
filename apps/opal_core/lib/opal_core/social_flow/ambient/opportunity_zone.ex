defmodule OpalCore.SocialFlow.Ambient.OpportunityZone do
  @moduledoc """
  INTERNAL opportunity zones — not a map product.

  Zone fidelity:
  - RIGHT NOW: current location can matter heavily
  - TONIGHT: current/expected blend
  - NEXT WEEK: current GPS near-zero weight; prefer expected/native commitment

  Group zones consider required person burden and do not drag the group
  halfway for one optional far participant.

  Never exposes raw origin coordinates or peer locations.
  """

  alias OpalCore.SocialFlow.Ambient.CoordinationMode
  alias OpalCore.SocialFlow.Physical.LocationContext

  @doc """
  Derive internal zone labels for candidate acquisition.
  """
  def derive(attrs) when is_map(attrs) do
    a = stringify(attrs)

    with {:ok, mode} <- CoordinationMode.infer(a),
         {:ok, origin} <- expected_origin(a, mode) do
      horizon = horizon_bucket(a, mode)
      weights = location_weights(horizon, mode)
      primary = primary_area(a, origin, mode, horizon, weights)
      zones = build_zones(a, primary)
      fairness = group_fairness(a, primary)

      {:ok,
       %{
         "zones" => zones,
         "primary_area" => primary,
         "mode" => mode["mode"],
         "horizon" => horizon,
         "location_weights" => weights,
         "origin_kind" => origin["kind"],
         "projects_today_to_future" => origin["projects_today_to_future"] == true,
         "current_location_weight" => weights["current_location"],
         "usable" => zones != [],
         "required_reachable" => fairness["required_reachable"],
         "optional_far_ignored" => fairness["optional_far_ignored"],
         "fairness" => fairness,
         "not_generic_midpoint" => true,
         "map_ui" => false,
         "heat_map_ui" => false,
         "private" => true,
         "authorizes_set" => false
       }}
    end
  end

  def derive(_), do: {:ok, %{"zones" => [], "usable" => false, "map_ui" => false}}

  defp expected_origin(a, mode) do
    LocationContext.expected_origin(%{
      "prior_commitment_place" => a["prior_commitment_place"],
      "explicit_area" => a["expected_area"] || a["explicit_area"],
      "home_area" => a["home_area"],
      "work_area" => a["work_area"],
      "current_area" => a["current_area"],
      "near_term" => near_term?(mode, a)
    })
  end

  defp horizon_bucket(a, mode) do
    hours = to_f(a["hours_until_candidate"])

    cond do
      mode["mode"] in ~w(already_out on_the_way) or a["right_now"] == true -> "now"
      is_number(hours) and hours <= 3 -> "now"
      is_number(hours) and hours <= 12 -> "tonight"
      is_number(hours) and hours <= 48 -> "soon"
      is_number(hours) and hours > 48 -> "future"
      mode["mode"] == "planning_ahead" -> "future"
      true -> "tonight"
    end
  end

  defp location_weights("now", _),
    do: %{
      "current_location" => 0.9,
      "expected_area" => 0.4,
      "native_commitment" => 0.5,
      "home_area" => 0.2
    }

  defp location_weights("tonight", _),
    do: %{
      "current_location" => 0.45,
      "expected_area" => 0.7,
      "native_commitment" => 0.75,
      "home_area" => 0.35
    }

  defp location_weights("soon", _),
    do: %{
      "current_location" => 0.15,
      "expected_area" => 0.8,
      "native_commitment" => 0.85,
      "home_area" => 0.4
    }

  defp location_weights("future", _),
    do: %{
      "current_location" => 0.05,
      "expected_area" => 0.85,
      "native_commitment" => 0.9,
      "home_area" => 0.5
    }

  defp location_weights(_, mode), do: mode["signal_weights"] || %{}

  defp primary_area(a, origin, mode, horizon, weights) do
    # Prefer durable expected context over stale GPS for future
    candidates = [
      {a["prior_commitment_place"], weights["native_commitment"] || 0.0},
      {a["expected_area"] || a["explicit_area"], weights["expected_area"] || 0.0},
      {a["destination_area"], weights["expected_area"] || 0.0},
      {a["home_area"], weights["home_area"] || 0.0},
      {if(horizon in ~w(now tonight), do: a["current_area"]), weights["current_location"] || 0.0},
      {origin["area_label"], 0.3}
    ]

    # Do not project current GPS into next week
    candidates =
      if horizon == "future" or not near_term?(mode, a) do
        Enum.reject(candidates, fn {label, w} ->
          label == a["current_area"] and w < 0.2 and a["force_current"] != true
        end)
      else
        candidates
      end

    candidates
    |> Enum.filter(fn {label, _} -> is_binary(label) and label != "" end)
    |> Enum.max_by(fn {_, w} -> w end, fn -> {nil, 0.0} end)
    |> elem(0)
    |> case do
      nil -> a["expected_area"] || a["home_area"] || a["current_area"]
      area -> area
    end
  end

  defp build_zones(a, primary) do
    # Optional far participants do not inject their area into the group zone set
    optional_far = MapSet.new(List.wrap(a["optional_far_areas"]))

    peer =
      List.wrap(a["participant_areas"])
      |> Enum.filter(&is_binary/1)
      |> Enum.reject(&MapSet.member?(optional_far, &1))
      |> Enum.uniq()

    required_areas =
      List.wrap(a["required_participant_areas"])
      |> Enum.filter(&is_binary/1)

    ([primary] ++ required_areas ++ peer ++ List.wrap(a["destination_area"]))
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
  end

  defp group_fairness(a, primary) do
    burdens = List.wrap(a["travel_burden_by_participant"] || a["burdens"] || [])
    required_ids = MapSet.new(List.wrap(a["required_ids"]))
    optional_ids = MapSet.new(List.wrap(a["optional_ids"]))

    required_ok =
      if burdens == [] do
        a["required_reachable"] != false
      else
        Enum.all?(burdens, fn b ->
          b = stringify_burden(b)
          id = b["id"] || b["user_id"]
          mins = to_f(b["minutes"] || b["travel_minutes"])

          cond do
            id in required_ids and mins > to_f(a["max_required_minutes"] || 45) -> false
            id in required_ids and b["reachable"] == false -> false
            true -> true
          end
        end)
      end

    # One far optional should not drag zone; detect if optional burdens extreme
    optional_far? =
      Enum.any?(burdens, fn b ->
        b = stringify_burden(b)
        id = b["id"] || b["user_id"]
        id in optional_ids and to_f(b["minutes"] || b["travel_minutes"]) >= 40
      end)

    max_b =
      burdens |> Enum.map(&to_f(stringify_burden(&1)["minutes"] || 0)) |> Enum.max(fn -> 0.0 end)

    median_b = median(Enum.map(burdens, &to_f(stringify_burden(&1)["minutes"] || 0)))

    %{
      "required_reachable" => required_ok,
      "optional_far_ignored" => optional_far? or List.wrap(a["optional_far_areas"]) != [],
      "max_burden_minutes" => max_b,
      "median_burden_minutes" => median_b,
      "perfect_equality_not_required" => true,
      "primary_area" => primary,
      "exposed_to_users" => false
    }
  end

  defp median([]), do: 0.0

  defp median([only]), do: only * 1.0

  defp median(list) do
    s = Enum.sort(list)
    n = Enum.reduce(s, 0, fn _, acc -> acc + 1 end)
    mid = div(n, 2)

    if rem(n, 2) == 1 do
      Enum.at(s, mid) * 1.0
    else
      (Enum.at(s, mid - 1) + Enum.at(s, mid)) / 2.0
    end
  end

  defp stringify_burden(b) when is_map(b) do
    Map.new(b, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end

  defp stringify_burden(_), do: %{}

  defp near_term?(%{"mode" => mode}, a) do
    mode in ~w(tonight already_out on_the_way) or a["near_term"] == true or
      (is_number(a["hours_until_candidate"]) and a["hours_until_candidate"] <= 8)
  end

  defp near_term?(_, a), do: a["near_term"] == true

  defp to_f(n) when is_number(n), do: n * 1.0
  defp to_f(_), do: 0.0

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
