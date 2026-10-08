defmodule OpalCoreWeb.WalletController do
  @moduledoc """
  Phase 5 / Paste G Phase 7 — stored-value wallet HTTP surface.

  Loads return disabled honestly without Stripe. Checkout session when key
  present. Threshold PATCH is runtime-tunable. See BLOCKED.md.
  """

  use OpalCoreWeb, :controller

  alias OpalCore.Wallets
  alias OpalCore.Wallets.StripeCheckout

  def show(conn, _params) do
    user_id = conn.assigns.current_user_id

    case Wallets.get_or_create_wallet(user_id) do
      {:ok, wallet} ->
        json(conn, %{"wallet" => Wallets.to_contract(wallet)})

      {:error, reason} ->
        conn |> put_status(:unprocessable_entity) |> json(%{"error" => error_string(reason)})
    end
  end

  def transactions(conn, params) do
    user_id = conn.assigns.current_user_id
    limit = parse_limit(params["limit"])

    with {:ok, _wallet} <- Wallets.get_or_create_wallet(user_id),
         {:ok, rows} <- Wallets.list_transactions(user_id, limit: limit) do
      json(conn, %{
        "transactions" => Enum.map(rows, &Wallets.transaction_contract/1)
      })
    else
      {:error, reason} ->
        conn |> put_status(:unprocessable_entity) |> json(%{"error" => error_string(reason)})
    end
  end

  def load(conn, params) do
    user_id = conn.assigns.current_user_id
    amount = parse_amount(params["amount_cents"])
    idem = params["idempotency_key"]
    stripe_payment_id = params["stripe_payment_id"]

    with {:ok, wallet} <- Wallets.get_or_create_wallet(user_id),
         true <- is_integer(amount) and amount > 0,
         true <- is_binary(idem) and idem != "" do
      case Wallets.load(wallet, amount, stripe_payment_id, idem) do
        {:disabled, reason} ->
          json(conn, %{
            "kind" => "disabled",
            "message" => reason,
            "loadable" => false
          })

        {:ok, tx} ->
          {:ok, refreshed} = Wallets.get_or_create_wallet(user_id)

          json(conn, %{
            "kind" => "loaded",
            "transaction" => Wallets.transaction_contract(tx),
            "wallet" => Wallets.to_contract(refreshed)
          })

        {:error, reason} ->
          conn |> put_status(:unprocessable_entity) |> json(%{"error" => error_string(reason)})
      end
    else
      false ->
        conn |> put_status(:unprocessable_entity) |> json(%{"error" => "invalid"})

      {:error, reason} ->
        conn |> put_status(:unprocessable_entity) |> json(%{"error" => error_string(reason)})
    end
  end

  @doc "PATCH auto-approve threshold (cents)."
  def update_threshold(conn, params) do
    user_id = conn.assigns.current_user_id
    threshold = parse_amount(params["auto_approve_threshold_cents"] || params["threshold_cents"])

    with {:ok, wallet} <- Wallets.get_or_create_wallet(user_id),
         true <- is_integer(threshold) and threshold >= 0,
         {:ok, updated} <- Wallets.update_threshold(wallet, threshold) do
      json(conn, %{"wallet" => Wallets.to_contract(updated)})
    else
      false ->
        conn |> put_status(:unprocessable_entity) |> json(%{"error" => "invalid_threshold"})

      {:error, reason} ->
        conn |> put_status(:unprocessable_entity) |> json(%{"error" => error_string(reason)})
    end
  end

  @doc "Create Stripe Checkout session when STRIPE_SECRET_KEY present."
  def checkout(conn, params) do
    user_id = conn.assigns.current_user_id
    amount = parse_amount(params["amount_cents"])

    cond do
      not is_integer(amount) or amount <= 0 ->
        conn |> put_status(:unprocessable_entity) |> json(%{"error" => "invalid_amount"})

      true ->
        case StripeCheckout.create_session(user_id, amount,
               success_url: params["success_url"],
               cancel_url: params["cancel_url"]
             ) do
          {:disabled, reason} ->
            json(conn, %{
              "kind" => "disabled",
              "message" => reason,
              "loadable" => false
            })

          {:ok, session} ->
            json(conn, %{"kind" => "checkout", "session" => session})

          {:error, reason} ->
            conn |> put_status(:unprocessable_entity) |> json(%{"error" => error_string(reason)})
        end
    end
  end

  defp parse_amount(n) when is_integer(n), do: n

  defp parse_amount(n) when is_binary(n) do
    case Integer.parse(n) do
      {i, _} -> i
      :error -> nil
    end
  end

  defp parse_amount(_), do: nil

  defp parse_limit(nil), do: 50

  defp parse_limit(n) when is_integer(n), do: n

  defp parse_limit(n) when is_binary(n) do
    case Integer.parse(n) do
      {i, _} -> i
      :error -> 50
    end
  end

  defp parse_limit(_), do: 50

  defp error_string(reason) when is_atom(reason), do: Atom.to_string(reason)
  defp error_string(reason) when is_binary(reason), do: reason
  defp error_string(%Ecto.Changeset{}), do: "invalid"
  defp error_string(reason), do: inspect(reason)
end

