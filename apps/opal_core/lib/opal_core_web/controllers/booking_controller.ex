defmodule OpalCoreWeb.BookingController do
  @moduledoc """
  Phase 4 — product booking HTTP surface.

  Thin wrapper over `OpalCore.Bookings.Service`. LIVE partner booking is only
  claimed when a provider key is present and the provider returns a real
  confirmation — disabled paths never invent one.
  """

  use OpalCoreWeb, :controller

  alias OpalCore.Bookings.Service

  def search(conn, params) do
    user_id = conn.assigns.current_user_id

    case Service.search(user_id, params) do
      {:ok, %{kind: :disabled} = body} ->
        json(conn, stringify_result(body))

      {:ok, body} ->
        json(conn, stringify_result(body))

      {:error, reason} ->
        conn |> put_status(:unprocessable_entity) |> json(%{"error" => error_string(reason)})
    end
  end

  def confirm(conn, params) do
    user_id = conn.assigns.current_user_id

    case Service.confirm(user_id, params) do
      {:ok, %{kind: :disabled} = body} ->
        json(conn, stringify_result(body))

      {:ok, body} ->
        json(conn, stringify_result(body))

      {:error, :not_found} ->
        conn |> put_status(:not_found) |> json(%{"error" => "not_found"})

      {:error, reason} ->
        conn |> put_status(:unprocessable_entity) |> json(%{"error" => error_string(reason)})
    end
  end

  def cancel(conn, %{"id" => id} = params) do
    user_id = conn.assigns.current_user_id
    opts = if params["allow_test_mock"] in [true, "true"], do: [allow_test_mock: true], else: []

    case Service.cancel(user_id, id, opts) do
      {:ok, body} ->
        json(conn, stringify_result(body))

      {:error, :not_found} ->
        conn |> put_status(:not_found) |> json(%{"error" => "not_found"})

      {:error, reason} ->
        conn |> put_status(:unprocessable_entity) |> json(%{"error" => error_string(reason)})
    end
  end

  def show(conn, %{"id" => id}) do
    user_id = conn.assigns.current_user_id

    case Service.get(user_id, id) do
      {:ok, booking} ->
        json(conn, %{"booking" => Service.to_contract(booking)})

      {:error, :not_found} ->
        conn |> put_status(:not_found) |> json(%{"error" => "not_found"})
    end
  end

  defp stringify_result(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), stringify_result(v)}
      {k, v} -> {to_string(k), stringify_result(v)}
    end)
  end

  defp stringify_result(list) when is_list(list), do: Enum.map(list, &stringify_result/1)
  defp stringify_result(other), do: other

  defp error_string(reason) when is_atom(reason), do: Atom.to_string(reason)
  defp error_string(reason) when is_binary(reason), do: reason
  defp error_string(reason), do: inspect(reason)
end
