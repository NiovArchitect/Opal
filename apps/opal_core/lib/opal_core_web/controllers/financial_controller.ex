defmodule OpalCoreWeb.FinancialController do
  @moduledoc """
  Phase RU-3 — financial comfort HTTP API.

  GET    /api/v1/product/financial/profile
  PUT    /api/v1/product/financial/profile
  DELETE /api/v1/product/financial/profile
  """

  use OpalCoreWeb, :controller

  alias OpalCore.FinancialProfiles
  alias OpalCore.TrustTiers

  def show(conn, _params) do
    user_id = conn.assigns.current_user_id

    with :ok <- require_trusted(user_id) do
      case FinancialProfiles.get_profile(user_id) do
        nil ->
          conn |> put_status(404) |> json(%{"error_code" => "not_found"})

        profile ->
          json(conn, %{"profile" => FinancialProfiles.to_contract(profile)})
      end
    else
      {:error, :forbidden} -> forbidden(conn)
    end
  end

  def upsert(conn, params) do
    user_id = conn.assigns.current_user_id

    with :ok <- require_trusted(user_id) do
      case FinancialProfiles.set_profile(user_id, params) do
        {:ok, profile} ->
          json(conn, %{"profile" => FinancialProfiles.to_contract(profile)})

        {:error, :forbidden} ->
          forbidden(conn)

        {:error, %Ecto.Changeset{} = cs} ->
          unprocessable(conn, cs)

        {:error, _} ->
          conn |> put_status(422) |> json(%{"error_code" => "invalid"})
      end
    else
      {:error, :forbidden} -> forbidden(conn)
    end
  end

  def delete(conn, _params) do
    user_id = conn.assigns.current_user_id

    with :ok <- require_trusted(user_id) do
      case FinancialProfiles.delete_profile(user_id) do
        {:ok, status} ->
          json(conn, %{"deleted" => true, "status" => Atom.to_string(status)})

        {:error, :forbidden} ->
          forbidden(conn)

        {:error, _} ->
          conn |> put_status(422) |> json(%{"error_code" => "invalid"})
      end
    else
      {:error, :forbidden} -> forbidden(conn)
    end
  end

  defp require_trusted(user_id) do
    if TrustTiers.can_access?(user_id, :financial), do: :ok, else: {:error, :forbidden}
  end

  defp forbidden(conn) do
    conn
    |> put_status(403)
    |> json(%{
      "error_code" => "forbidden",
      "message" => "Spending comfort unlocks as we get to know each other better."
    })
  end

  defp unprocessable(conn, %Ecto.Changeset{} = cs) do
    conn
    |> put_status(422)
    |> json(%{
      "error_code" => "invalid",
      "errors" =>
        Ecto.Changeset.traverse_errors(cs, fn {msg, opts} ->
          Regex.replace(~r"%{(\w+)}", msg, fn _, key ->
            opts |> Keyword.get(String.to_existing_atom(key), key) |> to_string()
          end)
        end)
    })
  end
end
