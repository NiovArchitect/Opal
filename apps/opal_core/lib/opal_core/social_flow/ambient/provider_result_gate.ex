defmodule OpalCore.SocialFlow.Ambient.ProviderResultGate do
  @moduledoc """
  Admit provider results only when still relevant to active plan/version.

  Late/old responses: suppressed.
  Cached candidates may support fit; execution claims need live truth.
  """

  alias OpalCore.SocialFlow.Physical.OpportunitySource

  @doc """
  Decide whether a provider result may influence the active opportunity.

  attrs:
  - result_plan_version / active_plan_version
  - result_fingerprint / active query attrs
  - observed_at / max_age_seconds
  - claim_type: fit | availability | booked
  - live / inventory_checked
  """
  def admit?(attrs) when is_map(attrs) do
    a = stringify(attrs)

    cond do
      a["topic_changed"] == true or a["humans_already_solved"] == true ->
        reject("context_dead")

      version_mismatch?(a) ->
        reject("plan_version_mismatch")

      fingerprint_mismatch?(a) ->
        reject("query_fingerprint_mismatch")

      stale?(a) ->
        reject("stale_provider_result")

      execution_claim_without_live?(a) ->
        reject("execution_requires_live_truth")

      true ->
        %{
          "admit" => true,
          "reason" => "fresh_and_scoped",
          "authorizes_set" => false,
          "provider_is_not_authority" => true
        }
    end
  end

  def admit?(_), do: reject("invalid")

  @doc "Cached fit vs live availability claim separation."
  def claim_allowed?(claim_type, attrs) when is_map(attrs) do
    a = stringify(attrs)

    live? =
      a["live"] == true or a["inventory_checked"] == true or a["reservation_checked"] == true

    case to_string(claim_type) do
      "fit" ->
        %{"allowed" => true, "reason" => "cached_or_live_ok_for_fit"}

      "availability" ->
        if live?,
          do: %{"allowed" => true, "reason" => "live_inventory"},
          else: %{"allowed" => false, "reason" => "need_live_for_availability"}

      "booked" ->
        if a["provider_confirmed"] == true,
          do: %{"allowed" => true, "reason" => "provider_confirmed"},
          else: %{"allowed" => false, "reason" => "no_provider_confirmation"}

      _ ->
        %{"allowed" => false, "reason" => "unknown_claim"}
    end
  end

  def claim_allowed?(_, _), do: %{"allowed" => false, "reason" => "invalid"}

  defp version_mismatch?(a) do
    rp = a["result_plan_version"] || a["plan_version"]
    ap = a["active_plan_version"]

    not is_nil(rp) and not is_nil(ap) and to_i(rp) != to_i(ap)
  end

  defp fingerprint_mismatch?(a) do
    rf = a["result_fingerprint"]
    af = a["active_fingerprint"] || fingerprint_from(a)

    is_binary(rf) and is_binary(af) and rf != "" and af != "" and rf != af
  end

  defp fingerprint_from(a) do
    if a["area_label"] || a["category"] || a["plan_version"] do
      OpportunitySource.fingerprint(a)
    else
      nil
    end
  end

  defp stale?(a) do
    max_age = to_i(a["max_age_seconds"] || default_max_age(a))
    observed = a["observed_at"]

    case observed do
      %DateTime{} = dt ->
        DateTime.diff(DateTime.utc_now(), dt, :second) > max_age

      _ ->
        a["stale"] == true
    end
  end

  defp default_max_age(a) do
    case a["fact_kind"] || a["claim_type"] do
      "availability" -> 300
      "inventory_available" -> 300
      "inventory_low" -> 180
      "weather_forecast" -> 1800
      "event_scheduled" -> 86_400
      "venue_hours_known" -> 86_400
      _ -> 3600
    end
  end

  defp execution_claim_without_live?(a) do
    a["claim_type"] in ["availability", "booked"] and
      a["live"] != true and a["provider_confirmed"] != true and
      a["inventory_checked"] != true
  end

  defp reject(reason) do
    %{
      "admit" => false,
      "reason" => reason,
      "suppress" => true,
      "authorizes_set" => false
    }
  end

  defp to_i(n) when is_integer(n), do: n
  defp to_i(n) when is_float(n), do: trunc(n)
  defp to_i(_), do: 0

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
