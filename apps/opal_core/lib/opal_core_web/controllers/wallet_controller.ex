defmodule OpalCoreWeb.WalletController do
  @moduledoc """
  Phase 5 — stored-value wallet HTTP surface.

  Loads return disabled honestly without Stripe. See BLOCKED.md.
  """

  use OpalCoreWeb, :controller

  alias OpalCore.Wallets

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
