defmodule OpalCore.SocialFlow.Feasibility.TravelEstimate do
  @moduledoc """
  Measured vs assumed travel time — Repair #18 FALSE-fix F-11
  (GAP-11 / BS-10).

  The pure feasibility/execution layer used to fall back silently
  (`travel_minutes || 20`, `|| 30`): a caller could not tell a measured
  20 from an assumed 20, and surfaces downstream could present an
  assumption as fact. This module is the single place that fallback
  happens now, and it always labels the result:

  - `"travel_minutes_source" => "measured"` — the caller supplied a number.
  - `"travel_minutes_source" => "assumed_default"` — no measurement was
    supplied; the value is the named default and
    `"travel_minutes_estimated" => true`.

  Any output map that carries a defaulted travel value must also carry
  these fields (spread `fields/2` into it) so the distinction survives
  to the contract boundary.
  """

  @default_minutes 20

  @doc """
  Resolve a maybe-missing travel value to `{minutes, source}` where
  source is `"measured"` or `"assumed_default"`.
  """
  @spec resolve(term(), number()) :: {number(), String.t()}
  def resolve(value, default \\ @default_minutes)

  def resolve(value, _default) when is_number(value), do: {value, "measured"}
  def resolve(_value, default) when is_number(default), do: {default, "assumed_default"}

  @doc "The labeled fields to spread into any output carrying the value."
  @spec fields(term(), number()) :: %{String.t() => term()}
  def fields(value, default \\ @default_minutes) do
    {minutes, source} = resolve(value, default)

    %{
      "travel_minutes" => minutes,
      "travel_minutes_source" => source,
      "travel_minutes_estimated" => source == "assumed_default"
    }
  end

  @doc "True when the value was supplied (measured), false when defaulted."
  @spec measured?(term()) :: boolean()
  def measured?(value), do: is_number(value)
end
