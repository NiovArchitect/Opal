defmodule OpalCoreWeb.StripeWebhookController do
  @moduledoc """
  Paste G Phase 7 — Stripe webhook → wallet credit via Wallets.load/4.

  Verifies `Stripe-Signature` when `STRIPE_WEBHOOK_SECRET` is set; otherwise
  accepts JSON in non-prod only (tests). Never invents payment success.
  """

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
        conn |> put_status(:bad_request) |> json(%{"error" => inspect(reason)})
    end
  end

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

      Mix.env() in [:test, :dev] ->
        Jason.decode(raw)

      true ->
        {:error, :webhook_secret_missing}
    end
  end

  # Minimal Stripe signature check (t=,v1=). Sufficient for gating; full
  # tolerance window can be tightened later.
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

    if is_binary(t) and is_binary(v1) do
      signed = "#{t}.#{payload}"
      expect = :crypto.mac(:hmac, :sha256, secret, signed) |> Base.encode16(case: :lower)
      Plug.Crypto.secure_compare(expect, String.downcase(v1))
    else
      false
    end
  end

  defp valid_stripe_signature?(_, _, _), do: false
end
