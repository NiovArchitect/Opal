defmodule OpalCore.SocialFlow.Execution.EtaShare do
  @moduledoc """
  Private ETA first. Social share is explicit one-time / plan-scoped.

  Share ETA? → peer sees "About 12 minutes away."
  No live tracking screen.
  Ends on arrival, plan cancel, TTL, or explicit revoke.
  OS location permission ≠ social sharing permission.
  """

  @doc """
  Compute private ETA estimate (execution input only — not shared).
  """
  def private_eta(attrs) when is_map(attrs) do
    a = stringify(attrs)

    minutes =
      cond do
        is_number(a["travel_minutes"]) -> trunc(a["travel_minutes"])
        is_number(a["eta_minutes"]) -> trunc(a["eta_minutes"])
        is_number(a["duration_minutes"]) -> trunc(a["duration_minutes"])
        true -> nil
      end

    cond do
      is_nil(minutes) and a["location_permission"] != "granted" ->
        {:ok,
         %{
           "private" => true,
           "shared" => false,
           "status" => "fallback",
           "fallback" => a["fallback"] || "expected_location_or_quiet",
           "minutes" => a["coarse_minutes"],
           "precise" => false,
           "os_location_ne_social_share" => true
         }}

      is_nil(minutes) ->
        {:ok,
         %{
           "private" => true,
           "shared" => false,
           "status" => "unknown",
           "minutes" => nil,
           "os_location_ne_social_share" => true
         }}

      true ->
        {:ok,
         %{
           "private" => true,
           "shared" => false,
           "status" => "ready",
           "minutes" => minutes,
           "label" => "About #{minutes} minutes away",
           "precise_coordinates" => false,
           "live_tracking" => false,
           "os_location_ne_social_share" => true
         }}
    end
  end

  def private_eta(_), do: {:error, :invalid}

  @doc """
  Explicit share authorization. One action. Plan-scoped.
  """
  def share(private_eta, opts \\ [])

  def share(private_eta, opts) when is_map(private_eta) do
    e = stringify(private_eta)
    authorized? = Keyword.get(opts, :user_authorized) == true
    now = Keyword.get(opts, :now) || DateTime.utc_now()
    ttl_min = Keyword.get(opts, :ttl_minutes, 45)
    plan_id = Keyword.get(opts, :plan_id) || e["plan_id"]

    cond do
      not authorized? ->
        {:error, :user_authorization_required}

      e["minutes"] == nil and e["label"] == nil ->
        {:error, :no_eta}

      true ->
        minutes = e["minutes"]
        label = e["label"] || "About #{minutes} minutes away"

        {:ok,
         %{
           "shared" => true,
           "private" => false,
           "visibility" => "plan_scoped",
           "peer_copy" => label,
           "minutes" => minutes,
           "live_tracking" => false,
           "tracking_screen" => false,
           "precise_coordinates" => false,
           "route" => false,
           "plan_id" => plan_id,
           "shared_at" => now,
           "expires_at" => DateTime.add(now, ttl_min * 60, :second),
           "status" => "active",
           "os_location_ne_social_share" => true,
           "one_time_or_plan_scoped" => true
         }}
    end
  end

  def share(_, _), do: {:error, :invalid}

  @doc """
  End share: arrival | plan_cancellation | ttl | explicit_revoke.
  """
  def end_share(share, reason, opts \\ [])

  def end_share(share, reason, opts) when is_map(share) do
    s = stringify(share)
    now = Keyword.get(opts, :now) || DateTime.utc_now()
    r = to_string(reason)

    valid? =
      r in ~w(arrival plan_cancellation cancelled ttl expired explicit_revoke revoke completed)

    if valid? do
      {:ok,
       Map.merge(s, %{
         "status" => "ended",
         "end_reason" => r,
         "ended_at" => now,
         "shared" => false,
         "persistent_location_relationship" => false,
         "live_tracking" => false
       })}
    else
      {:error, :invalid_reason}
    end
  end

  def end_share(_, _, _), do: {:error, :invalid}

  @doc "TTL / cancel check before peer can still see share."
  def still_active?(share, now \\ nil)

  def still_active?(share, now) when is_map(share) do
    s = stringify(share)
    now = now || DateTime.utc_now()

    cond do
      s["status"] != "active" ->
        false

      match?(%DateTime{}, s["expires_at"]) and DateTime.compare(now, s["expires_at"]) == :gt ->
        false

      true ->
        true
    end
  end

  def still_active?(_, _), do: false

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
