defmodule OpalCore.SocialFlow.Ambient.LocationConfidence do
  @moduledoc """
  Location facts have a half-life.

  Where I am now: useful for ~next hour.
  Where I was four hours ago: probably irrelevant.
  Familiar areas: private preference, not current presence evidence.
  """

  @half_life_minutes %{
    "current_precise" => 20,
    "current_approximate" => 60,
    "eta" => 30,
    "plan_expected" => 24 * 60,
    "familiar_area" => 90 * 24 * 60,
    "home_area_preference" => 365 * 24 * 60,
    "work_area_preference" => 365 * 24 * 60
  }

  def half_life_minutes(kind) when is_binary(kind),
    do: Map.get(@half_life_minutes, kind, 45)

  def half_life_minutes(_), do: 45

  @doc """
  Temporal confidence 0.0–1.0 from observed_at and kind.
  """
  def confidence(attrs) when is_map(attrs) do
    a = stringify(attrs)
    kind = a["kind"] || "current_approximate"
    now = parse_dt(a["now"]) || DateTime.utc_now() |> DateTime.truncate(:microsecond)
    observed = parse_dt(a["observed_at"])

    conf =
      case observed do
        %DateTime{} = o ->
          age_min = max(0.0, DateTime.diff(now, o, :second) / 60.0)
          hl = half_life_minutes(kind) * 1.0
          # Exponential decay
          :math.exp(-age_min / max(hl, 1.0)) |> clamp()

        _ ->
          0.0
      end

    usable_as_current? =
      kind in ~w(current_precise current_approximate eta) and conf >= 0.35

    usable_as_expected? =
      kind in ~w(plan_expected familiar_area home_area_preference work_area_preference) or
        (kind == "current_approximate" and a["near_term"] == true and conf >= 0.35)

    {:ok,
     %{
       "kind" => kind,
       "confidence" => conf,
       "usable_as_current" => usable_as_current?,
       "usable_as_expected" => usable_as_expected?,
       "stale" => conf < 0.2,
       "not_evidence_of_presence" =>
         kind in ~w(familiar_area home_area_preference work_area_preference),
       "private" => true
     }}
  end

  def confidence(_), do: {:ok, %{"confidence" => 0.0, "stale" => true}}

  defp clamp(n) when n < 0.0, do: 0.0
  defp clamp(n) when n > 1.0, do: 1.0
  defp clamp(n), do: Float.round(n * 1.0, 3)

  defp parse_dt(%DateTime{} = dt), do: DateTime.truncate(dt, :microsecond)

  defp parse_dt(iso) when is_binary(iso) do
    case DateTime.from_iso8601(iso) do
      {:ok, dt, _} -> DateTime.truncate(dt, :microsecond)
      _ -> nil
    end
  end

  defp parse_dt(_), do: nil

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
