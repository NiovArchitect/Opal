defmodule OpalCore.SocialFlow.Ambient.Freshness do
  @moduledoc """
  Source-specific opportunity / fact half-life.

  Different facts decay differently. Stale data must not stay authoritative.
  Never one global TTL.
  """

  # half-life minutes by source class (confidence ~ halves over this window)
  @half_life_min %{
    "current_location" => 20,
    "friend_proximity" => 45,
    "expected_location" => 6 * 60,
    "provider_inventory" => 15,
    "restaurant_slot" => 20,
    "nearby_event" => 90,
    "tonight_opening" => 4 * 60,
    "saturday_plan" => 2 * 24 * 60,
    "future_concert" => 14 * 24 * 60,
    "conversation_evidence" => 12 * 60,
    "explicit_willingness" => 24 * 60,
    "weather" => 3 * 60,
    "native_commitment" => :lifecycle,
    "preference" => 30 * 24 * 60
  }

  def half_life_minutes(class) when is_binary(class), do: Map.get(@half_life_min, class, 60)
  def half_life_minutes(_), do: 60

  @doc """
  Confidence 0.0–1.0 given source class and observed_at.
  native_commitment stays 1.0 until lifecycle says otherwise.
  """
  def confidence(attrs) when is_map(attrs) do
    a = stringify(attrs)
    class = a["source_class"] || a["kind"] || "conversation_evidence"
    now = parse_dt(a["now"]) || DateTime.utc_now() |> DateTime.truncate(:microsecond)
    observed = parse_dt(a["observed_at"] || a["valid_from"])

    hl = half_life_minutes(class)

    conf =
      cond do
        hl == :lifecycle ->
          if a["lifecycle_active"] == false, do: 0.0, else: 1.0

        match?(%DateTime{}, observed) ->
          age_min = max(0.0, DateTime.diff(now, observed, :second) / 60.0)
          :math.exp(-age_min / max(hl * 1.0, 1.0)) |> clamp()

        true ->
          0.0
      end

    stale? = conf < 0.25
    usable? = conf >= 0.35

    {:ok,
     %{
       "source_class" => class,
       "confidence" => conf,
       "stale" => stale?,
       "usable" => usable?,
       "half_life_minutes" => if(hl == :lifecycle, do: nil, else: hl),
       "authoritative_while_fresh" => usable?,
       "private" => true
     }}
  end

  def confidence(_), do: {:ok, %{"confidence" => 0.0, "stale" => true, "usable" => false}}

  @doc """
  Evaluate a bag of dependency facts; return which critical ones are stale.
  """
  def dependency_freshness(deps) when is_list(deps) do
    evaluated =
      Enum.map(deps, fn d ->
        d = stringify(d)
        {:ok, f} = confidence(d)
        Map.merge(f, %{"id" => d["id"] || d["source_class"], "critical" => d["critical"] == true})
      end)

    critical_stale =
      evaluated
      |> Enum.filter(&(&1["critical"] and &1["stale"]))
      |> Enum.map(& &1["id"])

    {:ok,
     %{
       "dependencies" => evaluated,
       "critical_stale" => critical_stale,
       "all_critical_fresh" => critical_stale == [],
       "must_recompute" => critical_stale != [],
       "must_suppress_execution" =>
         Enum.any?(critical_stale, &(&1 in ~w(provider_inventory restaurant_slot)))
     }}
  end

  def dependency_freshness(_),
    do: {:ok, %{"all_critical_fresh" => true, "must_recompute" => false}}

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
