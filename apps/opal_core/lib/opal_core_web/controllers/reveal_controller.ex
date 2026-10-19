defmodule OpalCoreWeb.RevealController do
  @moduledoc """
  Repair #18 DIR-4 - the reveals endpoint. The ONE derivation
  (OpalCore.SocialFlow.Reveal) serves every in-app reveal surface
  through this door: GET returns the viewer's items (optionally
  scoped to one conversation for the thread), POST dismiss
  persists a permanent dismissal and returns the remaining feed.
  No push, no mode picker - those dependencies stay open (D-4/D-8).
  """
  use OpalCoreWeb, :controller

  alias OpalCore.SocialFlow.Reveal

  def index(conn, params) do
    user_id = conn.assigns.current_user_id

    opts =
      if params["conversation_id"], do: [conversation_id: params["conversation_id"]], else: []

    json(conn, Reveal.for_viewer(user_id, opts))
  end

  def dismiss(conn, %{"reveal_key" => key}) do
    user_id = conn.assigns.current_user_id

    case Reveal.dismiss(user_id, key) do
      {:ok, feed} -> json(conn, feed)
      {:error, _} -> conn |> put_status(422) |> json(%{"error_code" => "invalid"})
    end
  end

  def dismiss(conn, _params) do
    conn |> put_status(422) |> json(%{"error_code" => "invalid"})
  end
end
