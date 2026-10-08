defmodule OpalCoreWeb.ContactCelebrationController do
  @moduledoc """
  Paste G Phase 5 — sync birthday/anniversary from a user-selected contact only.
  """

  use OpalCoreWeb, :controller

  alias OpalCore.Social.ContactCelebrationSync

  def sync(conn, params) do
    user_id = conn.assigns.current_user_id

    case ContactCelebrationSync.sync_selected_contact(user_id, params) do
      {:ok, :nothing} ->
        json(conn, %{"kind" => "nothing", "message" => "No birthday or anniversary fields present"})

      {:ok, result} ->
        celebrations =
          Enum.map(result.celebrations || [], fn c ->
            OpalCore.Celebrations.to_contract(c)
          end)

        json(conn, %{
          "kind" => "synced",
          "provenance" => result.provenance,
          "celebrations" => celebrations
        })

      {:error, :person_name_required} ->
        conn |> put_status(:unprocessable_entity) |> json(%{"error" => "person_name_required"})

      {:error, reason} ->
        conn |> put_status(:unprocessable_entity) |> json(%{"error" => error_string(reason)})
    end
  end

  defp error_string(reason) when is_atom(reason), do: Atom.to_string(reason)
  defp error_string(reason) when is_binary(reason), do: reason
  defp error_string(%Ecto.Changeset{}), do: "invalid"
  defp error_string(reason), do: inspect(reason)
end
