defmodule OpalCore.SocialFlow.BookingAuthorization do
  @moduledoc """
  Explicit human authorization to attempt an external reservation (Pass 19).

  ALIGNMENT ≠ AUTHORIZATION TO BOOK.

  Not AVP² (payments-only). This is Opal booking capability authority.
  Not a generic can_book=true boolean alone.
  """

  @capability "restaurant_reservation"

  @doc """
  Build a structured booking authorization object.

  Required intent fields: actor, place, party_size, time/slot, capability.
  """
  def issue(attrs) when is_map(attrs) do
    a = stringify(attrs)
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)
    ttl = parse_int(a["ttl_seconds"], 15 * 60)
    expires = DateTime.add(now, ttl, :second)

    cond do
      blank?(a["actor_user_id"]) ->
        {:error, :actor_required}

      blank?(a["provider_place_id"]) and blank?(a["place_display_name"]) ->
        {:error, :place_required}

      a["explicit_confirm"] != true ->
        {:error, :explicit_confirm_required}

      true ->
        id = a["authorization_id"] || Ecto.UUID.generate()

        auth = %{
          "authorization_id" => id,
          "actor_user_id" => a["actor_user_id"],
          "capability" => @capability,
          "scope" => "external_reservation",
          "provider" => a["provider"] || "synthetic_reservation",
          "provider_place_id" => a["provider_place_id"],
          "place_display_name" => a["place_display_name"],
          "party_size" => parse_int(a["party_size"], 2),
          "slot_id" => a["slot_id"],
          "slot_label" => a["slot_label"] || a["when_label"],
          "slot_starts_at" => a["slot_starts_at"] || a["when"],
          "reality_id" => a["reality_id"],
          "plan_id" => a["plan_id"],
          "plan_version" => a["plan_version"],
          "authority_scope" => a["authority_scope"] || "plan_booking",
          "requested_by_user_id" => a["requested_by_user_id"] || a["actor_user_id"],
          "authorized_by" => a["authorized_by"] || [a["actor_user_id"]],
          "economic_limit" => a["economic_limit"],
          "issued_at" => now,
          "expires_at" => expires,
          "revoked" => false,
          "proof" => %{
            "kind" => "human_explicit_confirm",
            "copy" => human_copy(a),
            "confirmed_at" => now
          },
          "authorizes_payment" => false,
          "avp2" => false
        }

        {:ok, auth}
    end
  end

  def issue(_), do: {:error, :invalid}

  @doc "Valid for this booking request?"
  def valid?(auth, request \\ %{})

  def valid?(auth, request) when is_map(auth) do
    a = stringify(auth)
    r = stringify(request || %{})
    now = DateTime.utc_now()

    cond do
      a["revoked"] == true ->
        {:error, :authorization_revoked}

      expired?(a["expires_at"], now) ->
        {:error, :authorization_expired}

      a["capability"] != @capability ->
        {:error, :capability_mismatch}

      not blank?(r["provider_place_id"]) and
          to_string(a["provider_place_id"]) != to_string(r["provider_place_id"]) ->
        {:error, :place_mismatch}

      not blank?(r["party_size"]) and
          parse_int(a["party_size"], 0) != parse_int(r["party_size"], -1) ->
        {:error, :party_size_mismatch}

      not blank?(r["slot_id"]) and not blank?(a["slot_id"]) and
          to_string(a["slot_id"]) != to_string(r["slot_id"]) ->
        {:error, :slot_mismatch}

      not blank?(r["plan_id"]) and not blank?(a["plan_id"]) and
          to_string(a["plan_id"]) != to_string(r["plan_id"]) ->
        {:error, :plan_mismatch}

      not blank?(r["plan_version"]) and not blank?(a["plan_version"]) and
          parse_int(a["plan_version"], -1) != parse_int(r["plan_version"], -2) ->
        {:error, :stale_authorization}

      not blank?(r["slot_label"]) and not blank?(a["slot_label"]) and
          normalize_label(a["slot_label"]) != normalize_label(r["slot_label"]) ->
        {:error, :slot_mismatch}

      true ->
        :ok
    end
  end

  def valid?(_, _), do: {:error, :invalid}

  def revoke(auth) when is_map(auth) do
    stringify(auth)
    |> Map.put("revoked", true)
    |> Map.put("revoked_at", DateTime.utc_now() |> DateTime.truncate(:microsecond))
  end

  def human_copy(attrs) when is_map(attrs) do
    a = stringify(attrs)
    place = a["place_display_name"] || "this place"
    when_label = a["slot_label"] || a["when_label"] || "the requested time"
    party = parse_int(a["party_size"], 2)
    people = if party == 1, do: "1 person", else: "#{party} people"
    "Reserve #{place}\n#{when_label}\n#{people}"
  end

  def human_copy(_), do: "Confirm reservation"

  defp expired?(nil, _), do: false

  defp expired?(%DateTime{} = exp, now), do: DateTime.compare(now, exp) == :gt

  defp expired?(exp, now) when is_binary(exp) do
    case DateTime.from_iso8601(exp) do
      {:ok, dt, _} -> DateTime.compare(now, dt) == :gt
      _ -> true
    end
  end

  defp expired?(_, _), do: true

  defp blank?(nil), do: true
  defp blank?(""), do: true
  defp blank?(_), do: false

  defp normalize_label(s) when is_binary(s) do
    s |> String.trim() |> String.downcase() |> String.replace(~r/\s+/, " ")
  end

  defp normalize_label(s), do: to_string(s)

  defp parse_int(n, _) when is_integer(n), do: n

  defp parse_int(n, default) when is_binary(n) do
    case Integer.parse(n) do
      {i, _} -> i
      :error -> default
    end
  end

  defp parse_int(_, default), do: default

  defp stringify(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
