defmodule OpalCore.SocialFlow.RealWorld.ContextSource do
  @moduledoc """
  Coherent source registry / fact interface for real-world context.

  Provider-neutral: one fact shape for conversation, calendar free/busy,
  location, preferences, device state, etc. Alignment intelligence consumes
  facts — never provider-specific payloads.

  Product law:
  - Automate cognition aggressively
  - Automate external actions progressively
  - Every source should eliminate a user step without taking authority
  """

  @source_classes ~w(
    conversation
    manual_availability
    calendar_free_busy
    device_schedule
    explicit_recurring_availability
    current_approximate_location
    explicit_shared_location
    eta
    familiar_area
    home_area_preference
    work_area_preference
    user_preference
    relationship_preference
    plan_context
    place_context
    event_context
    weather_context
    provider_availability
    device_capability_state
  )

  @permission_classes ~w(
    owner_private
    conversation_shared_safe
    purpose_bound
    relationship_scoped
    public_safe
  )

  def source_classes, do: @source_classes
  def permission_classes, do: @permission_classes

  @doc """
  Build a normalized context fact map.

  Required: source, owner_user_id.
  Optional metadata as needed — do not invent empty fields for unused keys.
  """
  def build(attrs) when is_map(attrs) do
    a = stringify(attrs)
    source = normalize_source(a["source"] || a["source_class"])

    cond do
      source not in @source_classes ->
        {:error, :unknown_source}

      not is_binary(a["owner_user_id"]) or a["owner_user_id"] == "" ->
        {:error, :owner_required}

      true ->
        now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

        fact =
          %{
            "schema_version" => "0.1.0",
            "source" => source,
            "provenance" => a["provenance"] || source,
            "owner_user_id" => a["owner_user_id"],
            "scope" => a["scope"] || "owner",
            "observed_at" => a["observed_at"] || now,
            "valid_from" => a["valid_from"],
            "valid_until" => a["valid_until"] || a["expires_at"],
            "confidence" => to_float(a["confidence"], 1.0),
            "permission_class" => a["permission_class"] || "owner_private",
            "sharing_status" => a["sharing_status"] || "private",
            "revoked" => a["revoked"] == true,
            "purpose" => a["purpose"],
            "conversation_id" => a["conversation_id"],
            "relationship_id" => a["relationship_id"],
            "payload" => a["payload"] || %{},
            "step_eliminated" => a["step_eliminated"]
          }
          |> drop_nils()

        if fact["permission_class"] in @permission_classes do
          {:ok, fact}
        else
          {:error, :invalid_permission_class}
        end
    end
  end

  def build(_), do: {:error, :invalid}

  @doc "Freshness: live | short | medium | expired | revoked | unknown"
  def freshness(fact, now \\ DateTime.utc_now())

  def freshness(fact, now) when is_map(fact) do
    f = stringify(fact)

    cond do
      f["revoked"] == true ->
        "revoked"

      expired?(f["valid_until"], now) ->
        "expired"

      f["source"] in ~w(current_approximate_location eta) ->
        case f["observed_at"] do
          %DateTime{} = o ->
            if DateTime.diff(now, o, :second) > 900, do: "short", else: "live"

          _ ->
            "short"
        end

      f["source"] in ~w(calendar_free_busy device_schedule) ->
        case f["observed_at"] do
          %DateTime{} = o ->
            if DateTime.diff(now, o, :second) > 86_400, do: "medium", else: "live"

          _ ->
            "unknown"
        end

      true ->
        "live"
    end
  end

  def freshness(_, _), do: "unknown"

  def usable?(fact, now \\ DateTime.utc_now()) do
    freshness(fact, now) in ~w(live short medium)
  end

  def revoke(fact, at \\ DateTime.utc_now()) when is_map(fact) do
    fact
    |> stringify()
    |> Map.put("revoked", true)
    |> Map.put("revoked_at", at)
    |> Map.put("sharing_status", "revoked")
  end

  defp normalize_source(s) when is_atom(s), do: s |> Atom.to_string() |> String.downcase()
  defp normalize_source(s) when is_binary(s), do: String.downcase(s)
  defp normalize_source(_), do: ""

  defp expired?(nil, _), do: false
  defp expired?(%DateTime{} = until, now), do: DateTime.compare(until, now) != :gt

  defp expired?(iso, now) when is_binary(iso) do
    case DateTime.from_iso8601(iso) do
      {:ok, dt, _} -> DateTime.compare(dt, now) != :gt
      _ -> false
    end
  end

  defp expired?(_, _), do: false

  defp to_float(nil, default), do: default
  defp to_float(n, _) when is_number(n), do: n * 1.0

  defp to_float(s, default) when is_binary(s) do
    case Float.parse(s) do
      {f, _} -> f
      :error -> default
    end
  end

  defp to_float(_, default), do: default

  defp drop_nils(map), do: Map.reject(map, fn {_k, v} -> is_nil(v) end)

  defp stringify(%{__struct__: _} = s), do: s

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), preserve(v)}
      {k, v} -> {to_string(k), preserve(v)}
    end)
  end

  defp preserve(%{__struct__: _} = s), do: s
  defp preserve(v) when is_map(v), do: stringify(v)
  defp preserve(v), do: v
end
