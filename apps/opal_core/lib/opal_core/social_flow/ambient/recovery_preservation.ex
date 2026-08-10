defmodule OpalCore.SocialFlow.Ambient.RecoveryPreservation do
  @moduledoc """
  When a dependency fails, preserve every still-valid dimension.

  Engineering quality signal: resolved dimensions preserved during recovery.
  Not exposed as a user percentage.
  """

  alias OpalCore.SocialFlow.Ambient.FailureRadius

  @dimensions ~w(
    time
    place_area
    cuisine_or_category
    participants
    quiet
    budget
    relationship_context
    travel_mode
  )

  def dimensions, do: @dimensions

  @doc """
  Measure how much alignment survives a failure.

  attrs:
  - resolved_before: list of dimension keys
  - invalidated: list of dimension keys that failed
  """
  def measure(attrs) when is_map(attrs) do
    a = stringify(attrs)
    before = MapSet.new(List.wrap(a["resolved_before"] || @dimensions))
    invalid = MapSet.new(List.wrap(a["invalidated"] || []))
    preserved = MapSet.difference(before, invalid)

    total = MapSet.size(before)
    kept = MapSet.size(preserved)
    ratio = if total == 0, do: 1.0, else: kept / total

    {:ok,
     %{
       "resolved_before" => Enum.sort(MapSet.to_list(before)),
       "invalidated" => Enum.sort(MapSet.to_list(invalid)),
       "preserved" => Enum.sort(MapSet.to_list(preserved)),
       "preserved_count" => kept,
       "total_count" => total,
       "preservation_ratio" => Float.round(ratio * 1.0, 3),
       "restarted_time_inquiry" => "time" in invalid,
       "restarted_place_discovery" => "place_area" in invalid or "cuisine_or_category" in invalid,
       "restarted_who" => "participants" in invalid,
       "failure_radius_bounded" => kept >= 1 or total == 0,
       "user_visible_percent" => false
     }}
  end

  def measure(_), do: {:ok, %{"preserved_count" => 0}}

  @doc "Restaurant filled: only provider/place candidate invalid — preserve social alignment."
  def restaurant_filled_example do
    measure(%{
      resolved_before: ~w(time place_area cuisine_or_category participants quiet budget),
      invalidated: ~w(provider_slot)
    })
  end

  @doc """
  Contract: recover from a named failure using FailureRadius defaults.
  """
  def from_failure(failure_kind, resolved \\ nil) do
    resolved = resolved || FailureRadius.alignment_dimensions()
    invalid = FailureRadius.invalidated_dimensions(failure_kind)
    # Map execution-only dims out of social resolved list for measure
    social_invalid = Enum.filter(invalid, &(&1 in resolved or &1 in ~w(provider_slot venue)))

    measure(%{
      "resolved_before" => resolved,
      "invalidated" => social_invalid
    })
  end

  @doc "Optional drop should preserve nearly all social dimensions."
  def optional_drop_example do
    measure(%{
      resolved_before:
        ~w(time place_area cuisine_or_category participants quiet budget willingness),
      invalidated: []
    })
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
