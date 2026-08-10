defmodule OpalCore.SocialFlow.Ambient.SocialOpening do
  @moduledoc """
  Social Opening — derived intelligence, not authority.

  A realistically usable coordination pocket:
  people + time + willingness + physical feasibility (+ optional world opportunity).

  Not merely free time. Does not own Set or membership.

  Quality band (via OpeningQuality) decides whether proactive ambient
  may interrupt — thin openings exist but stay quiet unless asked.
  """

  alias OpalCore.SocialFlow.Ambient.OpeningQuality

  @kinds ~w(personal dyad subset group)

  def kinds, do: @kinds

  @doc """
  Detect whether a social opening exists from permissioned signals.

  attrs:
  - participant_ids
  - viable_participant_ids (those who can participate)
  - required_ids
  - opening_hours / time_compatible
  - willingness_ok
  - travel_burden_low / proximity_ok
  - world_opportunity? (optional)
  """
  def detect(attrs) when is_map(attrs) do
    a = stringify(attrs)
    facts = opening_facts(a)
    base = base_opening(facts, a)
    quality = attach_quality(a, base, facts)

    {:ok,
     Map.merge(base, %{
       "quality_band" => quality["band"],
       "quality" => quality,
       "proactive_surface_ok" => base["exists"] and quality["proactive_surface_ok"] == true
     })}
  end

  def detect(_), do: {:ok, %{"exists" => false, "authorizes_set" => false}}

  defp opening_facts(a) do
    all = List.wrap(a["participant_ids"])
    viable = List.wrap(a["viable_participant_ids"] || a["participant_ids"])
    required = List.wrap(a["required_ids"])
    n = count(all)
    v = count(viable)
    min_viable = to_i(a["min_viable"]) || default_min(n)

    %{
      all: all,
      viable: viable,
      required: required,
      n: n,
      v: v,
      min_viable: min_viable,
      time_ok: a["time_compatible"] == true or to_f(a["opening_hours"]) >= 1.0,
      willing: a["willingness_ok"] != false,
      proximity: a["proximity_ok"] == true or a["travel_burden_low"] == true,
      world?: a["world_opportunity"] == true,
      required_ok: required == [] or Enum.all?(required, &(&1 in viable)),
      kind: kind_for(n, v)
    }
  end

  defp kind_for(n, v) do
    cond do
      n <= 1 -> "personal"
      n == 2 -> "dyad"
      v < n -> "subset"
      true -> "group"
    end
  end

  defp base_opening(f, a) do
    quorum_ok? = f.v >= f.min_viable or f.kind == "personal"

    exists? =
      f.time_ok and f.willing and f.required_ok and quorum_ok? and
        (f.n <= 1 or f.proximity or a["proximity_optional"] == true) and
        (f.v >= 1 or f.kind == "personal")

    conf =
      [
        f.time_ok,
        f.willing,
        f.required_ok,
        f.proximity or f.n <= 1,
        f.v >= f.min_viable,
        a["native_commitments_known"] == true,
        a["relationship_context"] != nil
      ]
      |> Enum.count(& &1)
      |> then(fn c -> Float.round(c / 7.0, 3) end)

    %{
      "exists" => exists?,
      "kind" => f.kind,
      "participant_count" => f.n,
      "viable_count" => f.v,
      "min_viable" => f.min_viable,
      "required_ok" => f.required_ok,
      "quorum_ok" => quorum_ok?,
      "time_ok" => f.time_ok,
      "willingness_ok" => f.willing,
      "proximity_ok" => f.proximity,
      "world_opportunity" => f.world?,
      "confidence" => conf,
      "perfect_group_not_required" => true,
      "authorizes_set" => false,
      "is_authority" => false,
      "is_not_set" => true,
      "is_not_booking" => true,
      "private" => true
    }
  end

  defp attach_quality(a, base, f) do
    case OpeningQuality.assess(
           Map.merge(a, base)
           |> Map.merge(%{
             "viable_participant_ids" => f.viable,
             "participant_ids" => f.all,
             "required_ids" => f.required,
             "min_viable" => f.min_viable
           })
         ) do
      {:ok, q} -> q
      _ -> %{"band" => "absent", "proactive_surface_ok" => false}
    end
  end

  defp count(list), do: Enum.reduce(list, 0, fn _, acc -> acc + 1 end)

  defp to_f(n) when is_number(n), do: n * 1.0
  defp to_f(_), do: 0.0

  defp to_i(nil), do: nil
  defp to_i(n) when is_integer(n), do: n
  defp to_i(n) when is_float(n), do: trunc(n)
  defp to_i(_), do: nil

  defp default_min(n) when n <= 1, do: 1
  defp default_min(n) when n == 2, do: 2
  defp default_min(n) when n >= 5, do: 3
  defp default_min(n), do: max(2, div(n, 2))

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
