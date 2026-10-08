defmodule OpalCoreWeb.ReminderController do
  @moduledoc """
  Paste G Phase 8 — user-command reminders HTTP surface.

  CRITICAL: delivery is never AttentionBudget-gated.
  """

  use OpalCoreWeb, :controller

  alias OpalCore.Reminders

  def index(conn, params) do
    user_id = conn.assigns.current_user_id
    # Past-due pending → deliver with overdue flag on fetch.
    _ = Reminders.deliver_past_due(user_id)

    opts =
      []
      |> then(fn o ->
        if is_binary(params["status"]), do: Keyword.put(o, :status, params["status"]), else: o
      end)

    case Reminders.list(user_id, opts) do
      {:ok, rows} ->
        json(conn, %{"reminders" => Enum.map(rows, &Reminders.to_contract/1)})

      {:error, reason} ->
        conn |> put_status(:unprocessable_entity) |> json(%{"error" => error_string(reason)})
    end
  end

  def create(conn, params) do
    user_id = conn.assigns.current_user_id

    case Reminders.create(user_id, params) do
      {:ok, reminder} ->
        conn
        |> put_status(:created)
        |> json(%{"reminder" => Reminders.to_contract(reminder)})

      {:error, reason} ->
        conn |> put_status(:unprocessable_entity) |> json(%{"error" => error_string(reason)})
    end
  end

  def cancel(conn, %{"id" => id}) do
    user_id = conn.assigns.current_user_id

    case Reminders.cancel(user_id, id) do
      {:ok, reminder} ->
        json(conn, %{"reminder" => Reminders.to_contract(reminder)})

      {:error, :not_found} ->
        conn |> put_status(:not_found) |> json(%{"error" => "not_found"})

      {:error, reason} ->
        conn |> put_status(:unprocessable_entity) |> json(%{"error" => error_string(reason)})
    end
  end

  defp error_string(reason) when is_atom(reason), do: Atom.to_string(reason)
  defp error_string(reason) when is_binary(reason), do: reason
  defp error_string(%Ecto.Changeset{}), do: "invalid"
  defp error_string(reason), do: inspect(reason)
end
