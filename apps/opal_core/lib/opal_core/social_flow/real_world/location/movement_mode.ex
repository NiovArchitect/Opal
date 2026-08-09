defmodule OpalCore.SocialFlow.RealWorld.Location.MovementMode do
  @moduledoc """
  Plan-scoped temporary realtime movement context.

  Temporary · purpose-bound · easy to revoke · not permanently location-live.
  """

  @signals ~w(eta approximate_movement arrival_state destination_change travel_mode)

  def signals, do: @signals

  def start(attrs) when is_map(attrs) do
    a = stringify(attrs)

    cond do
      not is_binary(a["plan_id"]) and not is_binary(a["conversation_id"]) ->
        {:error, :plan_or_conversation_required}

      a["user_authorized"] != true ->
        {:error, :user_authorization_required}

      true ->
        now = DateTime.utc_now() |> DateTime.truncate(:microsecond)
        ttl = to_int(a["ttl_sec"], 2 * 3600)

        {:ok,
         %{
           "schema_version" => "0.1.0",
           "mode" => "realtime_movement",
           "active" => true,
           "temporary" => true,
           "purpose_bound" => true,
           "plan_id" => a["plan_id"],
           "conversation_id" => a["conversation_id"],
           "actor_user_id" => a["actor_user_id"],
           "started_at" => now,
           "expires_at" => DateTime.add(now, ttl, :second),
           "signals" => Map.take(a, @signals),
           "permanent_live_tracking" => false
         }}
    end
  end

  def start(_), do: {:error, :invalid}

  def active?(mode, now \\ DateTime.utc_now())

  def active?(mode, now) when is_map(mode) do
    m = stringify(mode)

    m["active"] == true and m["revoked"] != true and
      (not match?(%DateTime{}, m["expires_at"]) or DateTime.compare(m["expires_at"], now) == :gt)
  end

  def active?(_, _), do: false

  def update_signal(mode, signal, value) when is_map(mode) and is_binary(signal) do
    if signal in @signals and active?(mode) do
      m = stringify(mode)
      signals = Map.put(m["signals"] || %{}, signal, value)
      {:ok, Map.put(m, "signals", signals)}
    else
      {:error, :invalid_or_inactive}
    end
  end

  def revoke(mode) when is_map(mode) do
    mode
    |> stringify()
    |> Map.put("active", false)
    |> Map.put("revoked", true)
    |> Map.put("revoked_at", DateTime.utc_now() |> DateTime.to_iso8601())
  end

  defp to_int(nil, d), do: d
  defp to_int(n, _) when is_integer(n), do: n
  defp to_int(_, d), do: d

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
