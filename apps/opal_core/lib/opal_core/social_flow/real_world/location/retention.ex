defmodule OpalCore.SocialFlow.RealWorld.Location.Retention do
  @moduledoc """
  Explicit retention semantics for location classes.

  Never retain raw location indefinitely because storage is easy.
  """

  # seconds
  @ttl %{
    "current_approximate_location" => 15 * 60,
    "eta" => 4 * 3600,
    "plan_scoped_area" => 48 * 3600,
    "explicit_shared_location" => 24 * 3600,
    "familiar_area" => 90 * 86_400,
    "home_area_preference" => 365 * 86_400,
    "work_area_preference" => 365 * 86_400
  }

  def ttl_seconds(kind) when is_binary(kind), do: Map.get(@ttl, kind, 3600)
  def ttl_seconds(_), do: 3600

  def expires_at(kind, from \\ DateTime.utc_now()) do
    DateTime.add(from, ttl_seconds(kind), :second) |> DateTime.truncate(:microsecond)
  end

  def expired?(fact, now \\ DateTime.utc_now())

  def expired?(fact, now) when is_map(fact) do
    f = stringify(fact)

    cond do
      f["revoked"] == true ->
        true

      match?(%DateTime{}, f["valid_until"]) ->
        DateTime.compare(f["valid_until"], now) != :gt

      true ->
        kind = f["source"] || f["kind"]
        observed = f["observed_at"]

        if match?(%DateTime{}, observed) do
          DateTime.diff(now, observed, :second) > ttl_seconds(kind)
        else
          false
        end
    end
  end

  def expired?(_, _), do: true

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
