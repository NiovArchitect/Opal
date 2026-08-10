defmodule OpalCore.SocialFlow.Physical.WorldFact do
  @moduledoc """
  Semantic taxonomy + provenance for real-world facts.

  Answers WHAT EXISTS — never WHAT SHOULD USERS DO.

  Facts stay honest. Do not collapse into hot / available / trending.
  Provenance is internal; not exposed socially.
  """

  @fact_kinds ~w(
    venue_exists
    venue_open
    venue_hours_known
    event_scheduled
    inventory_unknown
    inventory_available
    inventory_low
    reservation_supported
    reservation_checked
    weather_forecast
    activity_signal
    popularity_signal
  )

  def fact_kinds, do: @fact_kinds

  @doc """
  Build mandatory provenance for a world fact or candidate.

  source, source_item_id, observed_at, scopes, confidence, live vs cached,
  synthetic vs real, retrieval mode.
  """
  def provenance(attrs) when is_map(attrs) do
    a = stringify(attrs)
    now = a["observed_at"] || DateTime.utc_now() |> DateTime.truncate(:microsecond)

    %{
      "source" => a["source"] || a["provider"] || "unknown",
      "source_item_id" => a["source_item_id"] || a["id"] || a["provider_place_id"],
      "observed_at" => now,
      "valid_from" => a["valid_from"] || now,
      "valid_until" => a["valid_until"],
      "geographic_scope" => a["geographic_scope"] || a["area_label"],
      "temporal_scope" => a["temporal_scope"] || a["coordination_mode"] || "unknown",
      "confidence" => clamp(to_f(a["confidence"] || default_confidence(a))),
      "live" => a["live"] == true,
      "cached" => a["cached"] != false and a["live"] != true,
      "provider_authority_type" => a["provider_authority_type"] || "inventory_only",
      "synthetic" => a["synthetic"] != false and a["real"] != true,
      "real" => a["real"] == true,
      "retrieval_mode" => a["retrieval_mode"] || default_retrieval(a),
      "social_exposure" => false
    }
  end

  def provenance(_), do: provenance(%{})

  @doc "Attach a typed fact assertion to a candidate (private)."
  def assert_fact(kind, attrs) when kind in @fact_kinds do
    a = stringify(attrs)

    %{
      "kind" => kind,
      "value" => Map.get(a, "value", true),
      "provenance" => provenance(a),
      "not_social_authority" => true
    }
  end

  def assert_fact(_, _), do: %{"kind" => "unknown", "value" => false}

  @doc """
  Static popularity must not become live heat.

  4.9 stars + 10k reviews ≠ hot right now.
  """
  def popularity_is_not_live_heat?(attrs) when is_map(attrs) do
    a = stringify(attrs)
    has_static = a["rating"] != nil or a["review_count"] != nil or a["popularity_signal"] == true

    has_live =
      a["live_demand"] == true or a["activity_signal"] == true or a["event_happening"] == true

    has_static and not has_live
  end

  def popularity_is_not_live_heat?(_), do: true

  defp default_confidence(a) do
    cond do
      a["live"] == true -> 0.85
      a["real"] == true -> 0.75
      a["synthetic"] != false -> 0.55
      true -> 0.5
    end
  end

  defp default_retrieval(a) do
    cond do
      a["live"] == true -> "live_query"
      a["prefetch"] == true -> "prefetch_cache"
      true -> "fixture_or_cache"
    end
  end

  defp clamp(n) when n < 0.0, do: 0.0
  defp clamp(n) when n > 1.0, do: 1.0
  defp clamp(n), do: Float.round(n * 1.0, 3)

  defp to_f(n) when is_number(n), do: n * 1.0
  defp to_f(_), do: 0.0

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
