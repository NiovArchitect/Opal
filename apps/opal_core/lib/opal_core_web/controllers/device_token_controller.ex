defmodule OpalCoreWeb.DeviceTokenController do
  @moduledoc """
  Device push token registration.

  POST   /api/v1/product/devices/tokens  {platform, token, env} → upsert
  DELETE /api/v1/product/devices/tokens  {token} → soft-disable (disabled_at)
  """

  use OpalCoreWeb, :controller

  alias OpalCore.Push.DeviceToken
  alias OpalCore.Push.DeviceTokens

  def create(conn, params) do
    user_id = conn.assigns.current_user_id

    case DeviceTokens.upsert(user_id, params) do
      {:ok, row} ->
        conn
        |> put_status(200)
        |> json(%{"token" => DeviceToken.to_contract(row)})

      {:error, %Ecto.Changeset{} = cs} ->
        conn
        |> put_status(422)
        |> json(%{
          "error_code" => "invalid_token",
          "errors" => Ecto.Changeset.traverse_errors(cs, fn {msg, _} -> msg end)
        })

      {:error, reason} ->
        conn
        |> put_status(422)
        |> json(%{"error_code" => to_string(reason)})
    end
  end

  def delete(conn, params) do
    user_id = conn.assigns.current_user_id
    token = params["token"]

    cond do
      not is_binary(token) or String.trim(token) == "" ->
        conn |> put_status(422) |> json(%{"error_code" => "token_required"})

      true ->
        case DeviceTokens.disable(user_id, token) do
          {:ok, row} ->
            json(conn, %{"token" => DeviceToken.to_contract(row)})

          {:error, :not_found} ->
            conn |> put_status(404) |> json(%{"error_code" => "not_found"})

          {:error, :forbidden} ->
            conn |> put_status(403) |> json(%{"error_code" => "forbidden"})

          {:error, reason} ->
            conn |> put_status(422) |> json(%{"error_code" => to_string(reason)})
        end
    end
  end
end
