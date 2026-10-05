defmodule OpalCoreWeb.CelebrationController do
  @moduledoc """
  Phase 10A — celebrations HTTP API.

  GET    /api/v1/product/celebrations
  POST   /api/v1/product/celebrations
  DELETE /api/v1/product/celebrations/:id
  """

  use OpalCoreWeb, :controller

  alias OpalCore.Celebrations

  def index(conn, _params) do
    user_id = conn.assigns.current_user_id

    case Celebrations.list_for_user(user_id) do
      {:ok, list} ->
        json(conn, %{"celebrations" => Enum.map(list, &Celebrations.to_contract/1)})

      {:error, _} ->
        conn |> put_status(422) |> json(%{"error_code" => "invalid"})
    end
  end

  def create(conn, params) do
    user_id = conn.assigns.current_user_id

    case Celebrations.create(user_id, params) do
      {:ok, celebration} ->
        conn
        |> put_status(201)
        |> json(%{"celebration" => Celebrations.to_contract(celebration)})

      {:error, %Ecto.Changeset{} = cs} ->
        unprocessable(conn, cs)

      {:error, _} ->
        conn |> put_status(422) |> json(%{"error_code" => "invalid"})
    end
  end

  def delete(conn, %{"id" => id}) do
    user_id = conn.assigns.current_user_id

    case Celebrations.delete(user_id, id) do
      {:ok, celebration} ->
        json(conn, %{"celebration" => Celebrations.to_contract(celebration), "deleted" => true})

      {:error, :not_found} ->
        not_found(conn)

      {:error, %Ecto.Changeset{} = cs} ->
        unprocessable(conn, cs)
    end
  end

  defp not_found(conn) do
    conn |> put_status(404) |> json(%{"error_code" => "not_found"})
  end

  defp unprocessable(conn, %Ecto.Changeset{} = cs) do
    conn
    |> put_status(422)
    |> json(%{
      "error_code" => "invalid",
      "errors" => Ecto.Changeset.traverse_errors(cs, fn {msg, opts} ->
        Regex.replace(~r"%{(\w+)}", msg, fn _, key ->
          opts |> Keyword.get(String.to_existing_atom(key), key) |> to_string()
        end)
      end)
    })
  end
end
