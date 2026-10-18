defmodule OpalCoreWeb.StripeWebhookController do
  @moduledoc """
  Paste G Phase 7 — Stripe webhook → wallet credit via Wallets.load/4.

  SECURITY (Repair #18, BS-16): the `Stripe-Signature` header is
  REQUIRED in every environment. The previous dev/test branch accepted
  unsigned JSON whenever `Mix.env()` was `:test` or `:dev` — and the
  staging build IS a dev-mode build, so an unsigned
  `checkout.session.completed` payload could reach the wallet-credit
  path with only the loads gate flag in front of it. That branch is
  deleted: no secret configured → `webhook_secret_missing`; missing,
  malformed, or stale signature → `invalid_signature`. Signatures are
  verified over the exact raw bytes (see CacheBodyReader) with
  Stripe's 5-minute timestamp tolerance, so captured signatures are
  not replayable indefinitely.

  Wallet loads themselves remain LAW-GATED OFF (founder decision +
  GAP-23 legal review pending): a verified event still flows into
  `StripeCheckout.handle_webhook_event/1`, whose credit path returns
  the gated `{:disabled, _}` result until loads are enabled by the
  founder. This fix is containment only — it enables nothing.
  """

  # Stripe's default signature tolerance: 5 minutes.
  @signature_tolerance_seconds 300

  use OpalCoreWeb, :controller

  require Logger

  alias OpalCore.Wallets.StripeCheckout

  def webhook(conn, _params) do
    raw = raw_body(conn)

    case verify_and_parse(conn, raw) do
      {:ok, event} ->
        case StripeCheckout.handle_webhook_event(event) do
          {:ok, _} ->
            json(conn, %{"received" => true})

          {:disabled, _} ->
            json(conn, %{"received" => true, "credited" => false})

          {:error, reason} ->
            Logger.warning("stripe.webhook_credit_failed reason=#{inspect(reason)}")
            json(conn, %{"received" => true, "credited" => false, "error" => inspect(reason)})
        end

      {:error, :invalid_signature} ->
        conn |> put_status(:bad_request) |> json(%{"error" => "invalid_signature"})

      {:error, reason} ->
        conn |> put_status(:bad_request) |> json(%{"error" => error_string(reason)})
    end
  end

  defp error_string(reason) when is_atom(reason), do: Atom.to_string(reason)
  defp error_string(reason), do: inspect(reason)

  defp raw_body(conn) do
    case conn.assigns[:raw_body] do
      body when is_binary(body) -> body
      _ ->
        case Plug.Conn.read_body(conn) do
          {:ok, body, _} -> body
          _ -> ""
        end
    end
  end

  defp verify_and_parse(conn, raw) do
    secret = System.get_env("STRIPE_WEBHOOK_SECRET")
    header = Plug.Conn.get_req_header(conn, "stripe-signature") |> List.first()

    cond do
      is_binary(secret) and String.trim(secret) != "" ->
        if valid_stripe_signature?(raw, header, secret) do
          Jason.decode(raw)
        else
          {:error, :invalid_signature}
        end

      # No unsigned fallback in ANY environment (the BS-16 hole was a
      # Mix.env() in [:test, :dev] branch here). Tests must sign.
      true ->
        {:error, :webhook_secret_missing}
    end
  end

  # Stripe signature check (t=,v1=) with replay protection: the
  # timestamp must parse and sit within @signature_tolerance_seconds
  # of now before the HMAC is compared in constant time.
  defp valid_stripe_signature?(payload, header, secret)
       when is_binary(payload) and is_binary(header) and is_binary(secret) do
    parts =
      header
      |> String.split(",")
      |> Enum.map(&String.split(&1, "=", parts: 2))
      |> Map.new(fn
        [k, v] -> {k, v}
        _ -> {"_", nil}
      end)

    t = parts["t"]
    v1 = parts["v1"]

    with true <- is_binary(t) and is_binary(v1),
         {timestamp, ""} <- Integer.parse(t),
         true <- abs(System.system_time(:second) - timestamp) <= @signature_tolerance_seconds do
      signed = "#{t}.#{payload}"
      expect = :crypto.mac(:hmac, :sha256, secret, signed) |> Base.encode16(case: :lower)
      Plug.Crypto.secure_compare(expect, String.downcase(v1))
    else
      _ -> false
    end
  end

  defp valid_stripe_signature?(_, _, _), do: false
end
