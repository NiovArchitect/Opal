defmodule OpalCore.SocialFlow.RealWorld.Location.ApproximateStore do
  @moduledoc """
  Private approximate location store (device/web handoff).

  Lowest precision first. Not continuous background GPS.
  Provider fact about location ≠ share permission.
  """

  use Agent

  alias OpalCore.SocialFlow.RealWorld.ContextSource
  alias OpalCore.SocialFlow.RealWorld.Location.Precision
  alias OpalCore.SocialFlow.RealWorld.Location.Retention

  def start_link(_opts \\ []) do
    Agent.start_link(fn -> %{} end, name: __MODULE__)
  end

  def ensure_started do
    case Process.whereis(__MODULE__) do
      nil ->
        case start_link([]) do
          {:ok, _} -> :ok
          {:error, {:already_started, _}} -> :ok
          other -> other
        end

      _ ->
        :ok
    end
  end

  def put(user_id, attrs) when is_binary(user_id) and is_map(attrs) do
    ensure_started()
    a = stringify(attrs)
    purpose = a["purpose"] || "private_nearby_suggestions"
    precision = Precision.cap_request(a["precision"] || "coarse_area", purpose)
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    entry = %{
      "precision" => precision,
      "area_label" => a["area_label"],
      "approx_geohash" => a["approx_geohash"],
      # Never require precise coords; drop if precision capped below precise
      "observed_at" => now,
      "valid_until" => Retention.expires_at("current_approximate_location", now),
      "purpose" => purpose,
      "shared" => false
    }

    Agent.update(__MODULE__, &Map.put(&1, user_id, entry))

    ContextSource.build(%{
      source: "current_approximate_location",
      owner_user_id: user_id,
      permission_class: "owner_private",
      confidence: 0.85,
      valid_until: entry["valid_until"],
      observed_at: now,
      step_eliminated: "where_are_you",
      payload: Map.take(entry, ~w(precision area_label approx_geohash purpose))
    })
  end

  def get(user_id) when is_binary(user_id) do
    ensure_started()

    case Agent.get(__MODULE__, &Map.get(&1, user_id)) do
      nil ->
        {:error, :not_found}

      entry ->
        if Retention.expired?(Map.put(entry, "source", "current_approximate_location")) do
          revoke(user_id)
          {:error, :expired}
        else
          {:ok, entry}
        end
    end
  end

  def revoke(user_id) when is_binary(user_id) do
    ensure_started()
    Agent.update(__MODULE__, &Map.delete(&1, user_id))
    :ok
  end

  def reset do
    ensure_started()
    Agent.update(__MODULE__, fn _ -> %{} end)
  end

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
