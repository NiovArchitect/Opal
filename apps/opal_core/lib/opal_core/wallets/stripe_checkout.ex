defmodule OpalCore.Wallets.StripeCheckout do
  @moduledoc """
  Paste G Phase 7 — Stripe Checkout session for wallet loads.

  Without `STRIPE_SECRET_KEY` → `{:disabled, ...}`. Never invents payment success.
  With key but `OPAL_WALLET_LOADS_ENABLED` not explicitly `true` → loads stay
  gated (live keys may be present while legal review is pending).
  Webhook credits via `Wallets.load/4` idempotent on payment_intent id.
  """

  require Logger

  @stripe_api "https://api.stripe.com/v1"

  @doc "True when Stripe key is present AND wallet loads are founder-enabled."
  def configured? do
    case secret() do
      key when is_binary(key) and key != "" -> loads_enabled?()
      _ -> false
    end
  end

  @doc "True when STRIPE_SECRET_KEY is non-empty (loads may still be gated)."
  def key_present? do
    case secret() do
      key when is_binary(key) and key != "" -> true
      _ -> false
    end
  end

  @doc """
  Create a Checkout Session for loading `amount_cents` into the wallet.

  Returns `{:ok, %{id, url, payment_intent_id?}}` or `{:disabled, reason}`.
  """
  def create_session(account_id, amount_cents, opts \\ [])
      when is_binary(account_id) and is_integer(amount_cents) and amount_cents > 0 do
    cond do
      not key_present?() ->
        {:disabled, "wallet loading not connected"}

      not loads_enabled?() ->
        {:disabled, "wallet loads gated pending legal approval"}

      true ->
        key = secret()
        success = Keyword.get(opts, :success_url) || default_success_url()
        cancel = Keyword.get(opts, :cancel_url) || default_cancel_url()
        currency = Keyword.get(opts, :currency, "usd") |> to_string() |> String.downcase()

        form = [
          {"mode", "payment"},
          {"success_url", success},
          {"cancel_url", cancel},
          {"client_reference_id", account_id},
          {"metadata[account_id]", account_id},
          {"metadata[purpose]", "wallet_load"},
          {"line_items[0][quantity]", "1"},
          {"line_items[0][price_data][currency]", currency},
          {"line_items[0][price_data][unit_amount]", Integer.to_string(amount_cents)},
          {"line_items[0][price_data][product_data][name]", "Opal wallet load"}
        ]

        case Req.post("#{@stripe_api}/checkout/sessions",
               form: form,
               headers: [
                 {"authorization", "Bearer #{key}"},
                 {"content-type", "application/x-www-form-urlencoded"}
               ],
               receive_timeout: 15_000
             ) do
          {:ok, %{status: status, body: body}} when status in 200..299 and is_map(body) ->
            {:ok,
             %{
               "id" => body["id"],
               "url" => body["url"],
               "payment_intent" => body["payment_intent"],
               "amount_cents" => amount_cents,
               "currency" => currency
             }}

          {:ok, %{status: status, body: body}} ->
            {:error, {:stripe_http, status, body}}

          {:error, reason} ->
            {:error, {:stripe_request, reason}}
        end
    end
  end

  def create_session(_, _, _), do: {:error, :invalid}

  @doc """
  Handle a verified Stripe webhook event map.

  Credits wallet on `checkout.session.completed` or `payment_intent.succeeded`
  when metadata.purpose == wallet_load. Idempotent on payment_intent id.
  """
  def handle_webhook_event(event) when is_map(event) do
    type = event["type"] || event[:type]
    data = get_in(event, ["data", "object"]) || %{}

    case type do
      "checkout.session.completed" ->
        credit_from_session(data)

      "payment_intent.succeeded" ->
        credit_from_payment_intent(data)

      _ ->
        {:ok, :ignored}
    end
  end

  def handle_webhook_event(_), do: {:error, :invalid_event}

  defp credit_from_session(session) when is_map(session) do
    meta = session["metadata"] || %{}
    purpose = meta["purpose"]
    account_id = meta["account_id"] || session["client_reference_id"]
    amount = session["amount_total"]
    pi = session["payment_intent"]

    cond do
      purpose != "wallet_load" ->
        {:ok, :ignored}

      not is_binary(account_id) or account_id == "" ->
        {:error, :missing_account}

      not is_integer(amount) or amount <= 0 ->
        {:error, :invalid_amount}

      not is_binary(pi) or pi == "" ->
        {:error, :missing_payment_intent}

      true ->
        do_credit(account_id, amount, pi)
    end
  end

  defp credit_from_payment_intent(pi) when is_map(pi) do
    meta = pi["metadata"] || %{}
    purpose = meta["purpose"]
    account_id = meta["account_id"]
    amount = pi["amount_received"] || pi["amount"]
    id = pi["id"]

    cond do
      purpose != "wallet_load" and is_nil(account_id) ->
        {:ok, :ignored}

      not is_binary(account_id) ->
        {:ok, :ignored}

      not is_binary(id) ->
        {:error, :missing_payment_intent}

      not is_integer(amount) or amount <= 0 ->
        {:error, :invalid_amount}

      true ->
        do_credit(account_id, amount, id)
    end
  end

  defp do_credit(account_id, amount_cents, payment_intent_id) do
    alias OpalCore.Wallets

    with {:ok, wallet} <- Wallets.get_or_create_wallet(account_id) do
      # Idempotent on payment intent id.
      Wallets.load(wallet, amount_cents, payment_intent_id, "stripe:#{payment_intent_id}")
    end
  end

  defp secret do
    case System.get_env("STRIPE_SECRET_KEY") do
      key when is_binary(key) -> String.trim(key)
      _ -> nil
    end
  end

  defp loads_enabled? do
    System.get_env("OPAL_WALLET_LOADS_ENABLED") in ~w(true 1 yes)
  end

  defp default_success_url do
    System.get_env("STRIPE_CHECKOUT_SUCCESS_URL") || "https://opal.app/you?wallet=loaded"
  end

  defp default_cancel_url do
    System.get_env("STRIPE_CHECKOUT_CANCEL_URL") || "https://opal.app/you?wallet=cancelled"
  end
end
