defmodule OpalCore.SocialFlow.RealWorld.Cognition.PlanVersion do
  @moduledoc """
  Plan versioning and stale-work cancellation.

  When Thursday becomes Friday, travel calculations, places, and reservation
  checks for Thursday must invalidate — avoid embarrassing real-world mistakes.
  """

  def new(attrs) when is_map(attrs) do
    a = stringify(attrs)
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    {:ok,
     %{
       "schema_version" => "0.1.0",
       "plan_id" => a["plan_id"] || Ecto.UUID.generate(),
       "version" => 1,
       "conversation_id" => a["conversation_id"],
       "time_key" => a["time_key"],
       "place_key" => a["place_key"],
       "intent_key" => a["intent_key"],
       "created_at" => now,
       "derived_work" => [],
       "cancelled_work" => []
     }}
  end

  def new(_), do: {:error, :invalid}

  @doc """
  Bump version when authoritative plan inputs change.
  Cancels derived work tagged with previous version.
  """
  def revise(plan, changes) when is_map(plan) and is_map(changes) do
    p = stringify(plan)
    c = stringify(changes)

    changed? =
      Enum.any?(~w(time_key place_key intent_key), fn k ->
        Map.has_key?(c, k) and c[k] != p[k]
      end)

    if changed? do
      old_v = p["version"]
      derived = p["derived_work"] || []

      cancelled =
        derived
        |> Enum.filter(&(&1["plan_version"] == old_v or &1["plan_version"] == nil))
        |> Enum.map(&Map.put(&1, "status", "cancelled_stale"))

      next =
        p
        |> Map.merge(Map.take(c, ~w(time_key place_key intent_key)))
        |> Map.put("version", old_v + 1)
        |> Map.put("derived_work", [])
        |> Map.put("cancelled_work", (p["cancelled_work"] || []) ++ cancelled)
        |> Map.put("revised_at", DateTime.utc_now() |> DateTime.to_iso8601())

      {:ok, next, cancelled}
    else
      {:ok, p, []}
    end
  end

  def revise(_, _), do: {:error, :invalid}

  @doc "Attach derived work (places, travel, booking check) to current version."
  def attach_work(plan, work) when is_map(plan) and is_map(work) do
    p = stringify(plan)
    w = stringify(work) |> Map.put("plan_version", p["version"]) |> Map.put("status", "active")

    {:ok, Map.update(p, "derived_work", [w], &[w | &1])}
  end

  def attach_work(_, _), do: {:error, :invalid}

  def active_work(plan) when is_map(plan) do
    p = stringify(plan)
    v = p["version"]

    (p["derived_work"] || [])
    |> Enum.filter(&(&1["status"] == "active" and &1["plan_version"] == v))
  end

  def active_work(_), do: []

  defp stringify(%{__struct__: _} = s), do: s

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), stringify_val(v)}
      {k, v} -> {to_string(k), stringify_val(v)}
    end)
  end

  defp stringify_val(%{__struct__: _} = s), do: s
  defp stringify_val(v) when is_map(v), do: stringify(v)
  defp stringify_val(v) when is_list(v), do: Enum.map(v, &stringify_val/1)
  defp stringify_val(v), do: v
end
