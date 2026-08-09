defmodule OpalCore.SocialFlow.Ambient.SocialOpening do
  @moduledoc """
  Social Opening — derived intelligence, not authority.

  A realistically usable coordination pocket:
  people + time + willingness + physical feasibility (+ optional world opportunity).

  Not merely free time. Does not own Set or membership.
  """

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
    all = List.wrap(a["participant_ids"])
    viable = List.wrap(a["viable_participant_ids"] || a["participant_ids"])
    required = List.wrap(a["required_ids"])
    n = length(all)
    v = length(viable)

    time_ok = a["time_compatible"] == true or to_f(a["opening_hours"]) >= 1.0
    willing = a["willingness_ok"] != false
    proximity = a["proximity_ok"] == true or a["travel_burden_low"] == true
    world? = a["world_opportunity"] == true

    required_ok =
      required == [] or Enum.all?(required, &(&1 in viable))

    kind =
      cond do
        n <= 1 -> "personal"
        n == 2 -> "dyad"
        v < n -> "subset"
        true -> "group"
      end

    exists? =
      time_ok and willing and required_ok and
        (n <= 1 or proximity or a["proximity_optional"] == true) and
        (v >= 1 or kind == "personal")

    {:ok,
     %{
       "exists" => exists?,
       "kind" => kind,
       "participant_count" => n,
       "viable_count" => v,
       "required_ok" => required_ok,
       "time_ok" => time_ok,
       "willingness_ok" => willing,
       "proximity_ok" => proximity,
       "world_opportunity" => world?,
       "authorizes_set" => false,
       "is_authority" => false,
       "private" => true
     }}
  end

  def detect(_), do: {:ok, %{"exists" => false, "authorizes_set" => false}}

  defp to_f(n) when is_number(n), do: n * 1.0
  defp to_f(_), do: 0.0

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
