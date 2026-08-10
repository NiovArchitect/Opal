defmodule OpalCore.SocialFlow.Physical.HardCandidateFilter do
  @moduledoc """
  Remove candidates that violate authoritative hard constraints
  BEFORE CollectiveFit / soft ranking.

  Never majority-vote them back in.
  """

  @doc """
  Filter a candidate list against hard constraints in attrs.

  attrs may include:
  - max_travel_minutes / travel_by_place
  - accessibility_required
  - max_price_band (1–4)
  - min_capacity / party_size
  - age_restricted_ok
  - available_minutes
  - coordination_mode
  - now (DateTime) for event ended checks
  """
  def filter(candidates, attrs \\ %{})

  def filter(candidates, attrs) when is_list(candidates) do
    a = stringify(attrs)

    kept =
      candidates
      |> Enum.map(&stringify/1)
      |> Enum.reject(&reject_reason(&1, a))

    rejected =
      candidates
      |> Enum.map(&stringify/1)
      |> Enum.map(&{&1, reject_reason(&1, a)})
      |> Enum.filter(fn {_, r} -> r != nil end)
      |> Enum.map(fn {c, r} ->
        %{
          "candidate_id" => c["candidate_id"] || c["provider_place_id"],
          "reason" => r
        }
      end)

    %{
      "candidates" => kept,
      "kept_count" => length(kept),
      "rejected" => rejected,
      "rejected_count" => length(rejected),
      "majority_cannot_override" => true,
      "authorizes_set" => false
    }
  end

  def filter(_, _), do: %{"candidates" => [], "kept_count" => 0, "rejected_count" => 0}

  defp reject_reason(c, a) do
    cond do
      c["open_at_plan_time"] == false or c["open_now"] == false ->
        if a["coordination_mode"] in ~w(tonight already_out now), do: "closed", else: nil

      event_ended?(c, a) ->
        "event_already_ended"

      not reachable?(c, a) ->
        "cannot_physically_reach"

      capacity_too_small?(c, a) ->
        "capacity_too_small"

      a["accessibility_required"] == true and c["accessible"] == false ->
        "accessibility_incompatible"

      price_blocked?(c, a) ->
        "hard_budget_constraint"

      a["age_restricted_ok"] == false and c["age_restricted"] == true ->
        "age_restriction"

      duration_impossible?(c, a) ->
        "insufficient_useful_duration"

      true ->
        nil
    end
  end

  defp event_ended?(c, a) do
    end_at = c["event_end"] || c["end_at"]
    now = a["now"] || DateTime.utc_now()

    case end_at do
      %DateTime{} = dt -> DateTime.compare(dt, now) == :lt
      _ -> c["event_ended"] == true
    end
  end

  defp reachable?(c, a) do
    travel = a["travel_by_place"] || %{}
    id = c["candidate_id"] || c["provider_place_id"] || c["name"]
    mins = travel[id] || travel[to_string(id)] || c["travel_minutes"]
    max = to_i(a["max_travel_minutes"] || 0)

    cond do
      c["reachable"] == false -> false
      max > 0 and is_number(mins) and mins > max -> false
      true -> true
    end
  end

  defp capacity_too_small?(c, a) do
    need = to_i(a["party_size"] || a["min_capacity"] || 0)
    cap = to_i(c["capacity"] || c["max_party"] || 0)
    need > 0 and cap > 0 and cap < need
  end

  defp price_blocked?(c, a) do
    max_band = price_band_num(a["max_price_band"])
    cand = price_band_num(c["price_level"] || c["price_band"] || c["cost_indication"])
    max_band > 0 and cand > 0 and cand > max_band
  end

  defp duration_impossible?(c, a) do
    available = to_i(a["available_minutes"] || 0)
    need = to_i(c["duration_minutes"] || 0)
    available > 0 and need > 0 and need > available
  end

  defp price_band_num(n) when is_integer(n), do: n
  defp price_band_num("$"), do: 1
  defp price_band_num("$$"), do: 2
  defp price_band_num("$$$"), do: 3
  defp price_band_num("$$$$"), do: 4
  defp price_band_num(s) when is_binary(s), do: String.length(s) |> min(4)
  defp price_band_num(_), do: 0

  defp to_i(n) when is_integer(n), do: n
  defp to_i(n) when is_float(n), do: trunc(n)
  defp to_i(_), do: 0

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end

  defp stringify(other), do: other
end
