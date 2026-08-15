defmodule OpalCore.SocialFlow.SyntheticReservationProvider do
  @moduledoc """
  Synthetic / recorded-execution reservation adapter (Pass 19).

  LIVE EXECUTION: NOT CLAIMED.

  OpenTable partner API is not available as a public create-reservation API.
  This adapter returns deterministic availability and booking outcomes for
  foundation proof — never labeled as live provider confirmation.

  Does not scrape. Does not invent social fit as availability.
  """

  alias OpalCore.SocialFlow.ExternalWorldTruth

  @provider "synthetic_reservation"
  @mode "synthetic_provider"
  # Pass 15 TTL for reservation_availability
  @availability_ttl_sec 3 * 60

  def provider_id, do: @provider
  def mode, do: @mode
  def live_claimed?, do: false

  def capability_status do
    %{
      "provider" => @provider,
      "mode" => @mode,
      "live_execution" => false,
      "live_claimed" => false,
      "partner_api" => false,
      "opentable_public_create" => false,
      "default_product_path" => "synthetic_or_handoff",
      "availability_ttl_seconds" => @availability_ttl_sec,
      "supports_hold" => true,
      "supports_async_confirm" => true,
      "payment_required" => false
    }
  end

  @doc """
  Check availability for place/party/time.

  attrs:
  - provider_place_id (required)
  - party_size
  - requested_at / slot_starts_at / when_label
  - scenario: available | unavailable | expire_fast | payment_required | timeout_on_book
  """
  def check_availability(attrs) when is_map(attrs) do
    a = stringify(attrs)
    place_id = a["provider_place_id"] || a["venue_id"]

    if blank?(place_id) do
      {:error, :provider_place_id_required}
    else
      scenario = a["scenario"] || scenario_from_place(place_id)
      now = DateTime.utc_now() |> DateTime.truncate(:microsecond)
      ttl = if scenario == "expire_fast", do: 1, else: @availability_ttl_sec
      expires = DateTime.add(now, ttl, :second)
      party = parse_int(a["party_size"], 2)
      slot_start = a["slot_starts_at"] || a["when"] || now
      label = a["slot_label"] || a["when_label"] || "7:30 PM"

      case scenario do
        "unavailable" ->
          env =
            ExternalWorldTruth.fact_envelope(%{
              "provider" => @provider,
              "provider_place_id" => place_id,
              "fact_type" => "reservation_availability",
              "value" => "unavailable",
              "observed_at" => now,
              "expires_at" => expires,
              "provenance" => %{
                "source" => @provider,
                "source_item_id" => place_id,
                "observed_at" => now,
                "synthetic" => true,
                "real" => false
              }
            })

          {:ok,
           %{
             "truth_class" => "provider_fact",
             "available" => false,
             "status" => "unavailable",
             "provider" => @provider,
             "provider_place_id" => place_id,
             "party_size" => party,
             "slots" => [],
             "observed_at" => now,
             "expires_at" => expires,
             "availability_id" => "avail-none-#{:erlang.phash2({place_id, now})}",
             "mode" => @mode,
             "live_claimed" => false,
             "envelope" => env,
             "shared_safe_summary" => "No times open there."
           }}

        _ ->
          slot_id = a["slot_id"] || "slot-#{:erlang.phash2({place_id, label, party})}"

          slot = %{
            "slot_id" => slot_id,
            "label" => label,
            "starts_at" => slot_start,
            "party_size" => party,
            "hold_supported" => true
          }

          # Optional nearby alternative for recovery UX (not auto-selected)
          alt =
            if a["include_alt_slot"] != false do
              [
                %{
                  "slot_id" => slot_id <> "-alt",
                  "label" => alt_label(label),
                  "starts_at" => slot_start,
                  "party_size" => party,
                  "hold_supported" => true
                }
              ]
            else
              []
            end

          env =
            ExternalWorldTruth.fact_envelope(%{
              "provider" => @provider,
              "provider_place_id" => place_id,
              "fact_type" => "reservation_availability",
              "value" => "available",
              "observed_at" => now,
              "expires_at" => expires,
              "provenance" => %{
                "source" => @provider,
                "source_item_id" => place_id,
                "observed_at" => now,
                "synthetic" => true,
                "real" => false
              }
            })

          {:ok,
           %{
             "truth_class" => "provider_fact",
             "available" => true,
             "status" => "available",
             "provider" => @provider,
             "provider_place_id" => place_id,
             "party_size" => party,
             "slots" => [slot | alt] |> Enum.take(3),
             "primary_slot" => slot,
             "observed_at" => now,
             "expires_at" => expires,
             "availability_id" => "avail-#{slot_id}",
             "mode" => @mode,
             "live_claimed" => false,
             "scenario" => scenario,
             "envelope" => env,
             "shared_safe_summary" => "#{label} is open."
           }}
      end
    end
  end

  def check_availability(_), do: {:error, :invalid}

  @doc """
  Attempt reservation. Outcomes driven by scenario flags.

  scenario:
  - available (default) → confirmed immediately (sync synthetic)
  - hold → held (not confirmed)
  - fail → failed
  - timeout → unknown/reconciling (caller must reconcile)
  - payment_required → payment_authorization_required stop
  """
  def request_reservation(attrs) when is_map(attrs) do
    a = stringify(attrs)
    scenario = a["scenario"] || scenario_from_place(a["provider_place_id"])
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)
    req_id = a["provider_request_id"] || "sreq-#{Ecto.UUID.generate()}"

    case scenario do
      "payment_required" ->
        {:ok,
         %{
           "status" => "payment_authorization_required",
           "booked" => false,
           "provider_request_id" => req_id,
           "payment_status" => "authorization_required",
           "live_claimed" => false,
           "mode" => @mode
         }}

      "fail" ->
        {:ok,
         %{
           "status" => "failed",
           "booked" => false,
           "provider_request_id" => req_id,
           "provider_response_id" => "sresp-fail-#{:erlang.phash2(req_id)}",
           "failure_reason" => a["failure_reason"] || "slot_unavailable",
           "live_claimed" => false,
           "mode" => @mode
         }}

      "timeout" ->
        {:ok,
         %{
           "status" => "unknown",
           "booked" => false,
           "provider_request_id" => req_id,
           "needs_reconcile" => true,
           "live_claimed" => false,
           "mode" => @mode
         }}

      "hold" ->
        {:ok,
         %{
           "status" => "held",
           "booked" => false,
           "held" => true,
           "provider_request_id" => req_id,
           "provider_response_id" => "sresp-hold-#{:erlang.phash2(req_id)}",
           "provider_resource_id" => "hold-#{:erlang.phash2(req_id)}",
           "expires_at" => DateTime.add(now, 10 * 60, :second),
           "live_claimed" => false,
           "mode" => @mode
         }}

      _ ->
        # sync confirm synthetic
        conf_id = "sconf-#{:erlang.phash2(req_id)}"

        {:ok,
         %{
           "status" => "confirmed",
           "booked" => true,
           "provider_request_id" => req_id,
           "provider_response_id" => "sresp-#{conf_id}",
           "provider_resource_id" => conf_id,
           "confirmed_at" => now,
           "live_claimed" => false,
           "mode" => @mode
         }}
    end
  end

  def request_reservation(_), do: {:error, :invalid}

  @doc "Reconcile unknown/timeout by request id — deterministic from hash."
  def reconcile(provider_request_id, opts \\ []) when is_binary(provider_request_id) do
    force = Keyword.get(opts, :force_status)

    status =
      cond do
        is_binary(force) -> force
        rem(:erlang.phash2(provider_request_id), 2) == 0 -> "confirmed"
        true -> "failed"
      end

    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    case status do
      "confirmed" ->
        conf_id = "sconf-rec-#{:erlang.phash2(provider_request_id)}"

        {:ok,
         %{
           "status" => "confirmed",
           "booked" => true,
           "provider_request_id" => provider_request_id,
           "provider_response_id" => "sresp-rec-#{conf_id}",
           "provider_resource_id" => conf_id,
           "confirmed_at" => now,
           "reconciled" => true,
           "live_claimed" => false,
           "mode" => @mode
         }}

      _ ->
        {:ok,
         %{
           "status" => "failed",
           "booked" => false,
           "provider_request_id" => provider_request_id,
           "provider_response_id" => "sresp-rec-fail",
           "failure_reason" => "reconciled_unavailable",
           "reconciled" => true,
           "live_claimed" => false,
           "mode" => @mode
         }}
    end
  end

  def cancel(provider_resource_id, opts \\ [])

  def cancel(provider_resource_id, _opts) when is_binary(provider_resource_id) do
    {:ok,
     %{
       "status" => "cancelled",
       "provider_resource_id" => provider_resource_id,
       "cancelled_at" => DateTime.utc_now() |> DateTime.truncate(:microsecond),
       "live_claimed" => false,
       "mode" => @mode
     }}
  end

  def cancel(_, _), do: {:error, :invalid}

  # --- internals ---

  defp scenario_from_place(id) when is_binary(id) do
    cond do
      String.contains?(id, "unavailable") or String.contains?(id, "full") -> "unavailable"
      String.contains?(id, "timeout") -> "timeout"
      String.contains?(id, "hold") -> "hold"
      String.contains?(id, "pay") -> "payment_required"
      String.contains?(id, "fail") -> "fail"
      true -> "available"
    end
  end

  defp scenario_from_place(_), do: "available"

  defp alt_label(label) when is_binary(label) do
    cond do
      String.contains?(label, "7:30") -> String.replace(label, "7:30", "7:45")
      true -> label <> " (nearby)"
    end
  end

  defp alt_label(_), do: "7:45 PM"

  defp blank?(nil), do: true
  defp blank?(""), do: true
  defp blank?(_), do: false

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
