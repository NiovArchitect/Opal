defmodule OpalCoreWeb.CenterLocationController do
  @moduledoc """
  Center device-location ingest (Repair #12 / F12-11c).

  `POST /opal/location` — accepts COARSE, user-granted device coords for
  venue ranking / near-me. Stored per user via
  `OpalCore.Center.DeviceLocation` (single origin invariant).

  PRIVACY LAW (hard): this endpoint never touches the travel pipeline.
  Precise travel sharing still requires a time-bounded session and
  `travel_controller.ex` keeps its deliberate 422 on GPS keys. Coarse coords
  here are rounded server-side to 3 decimals (~110 m) and are used only for
  ranking nearby venues — never persisted to the user profile, never shared.
  """

  use OpalCoreWeb, :controller

  alias OpalCore.Center.DeviceLocation
  alias OpalCore.OpalConversations

  def update(conn, params) do
    user_id = conn.assigns.current_user_id

    case DeviceLocation.validate_coords(params) do
      {:ok, coarse} ->
        # Ensure the per-user store exists, then persist best-effort.
        _ =
          case OpalConversations.get_or_create_conversation(user_id) do
            {:ok, _} -> :ok
            _ -> :error
          end

        case DeviceLocation.put_for_user(user_id, coarse) do
          :ok ->
            json(conn, %{
              "ok" => true,
              "origin_source" => coarse["origin_source"],
              "coarsened" => true
            })

          {:error, reason} ->
            conn
            |> put_status(:unprocessable_entity)
            |> json(%{"ok" => false, "error" => to_string(reason)})
        end

      {:error, reason} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{"ok" => false, "error" => to_string(reason)})
    end
  end
end
