defmodule OpalCoreWeb.JourneyController do
  use OpalCoreWeb, :controller

  alias OpalCore.SocialFlow.JourneyAuthority

  def activate(conn, params) do
    user_id = conn.assigns.current_user_id

    case JourneyAuthority.activate(Map.put(params, "user_id", user_id)) do
      {:ok, journey} -> json(conn, %{"journey" => journey})
      {:error, :forbidden} -> conn |> put_status(:forbidden) |> json(%{"error" => "DENIED"})
      {:error, reason} -> conn |> put_status(:unprocessable_entity) |> json(%{"error" => to_string(reason)})
    end
  end

  def show(conn, %{"id" => id}) do
    user_id = conn.assigns.current_user_id

    case JourneyAuthority.get(id, user_id) do
      {:ok, journey} -> json(conn, %{"journey" => journey})
      {:error, :forbidden} -> conn |> put_status(:forbidden) |> json(%{"error" => "DENIED"})
      {:error, :not_journey} -> conn |> put_status(:conflict) |> json(%{"error" => "not_journey"})
      {:error, :not_found} -> conn |> put_status(:not_found) |> json(%{"error" => "not_found"})
      {:error, reason} -> conn |> put_status(:unprocessable_entity) |> json(%{"error" => to_string(reason)})
    end
  end

  def cant_make_it(conn, %{"id" => id} = params) do
    user_id = conn.assigns.current_user_id

    case JourneyAuthority.cant_make_it(id, user_id, params) do
      {:ok, body} -> json(conn, body)
      {:error, :forbidden} -> conn |> put_status(:forbidden) |> json(%{"error" => "DENIED"})
      {:error, :not_found} -> conn |> put_status(:not_found) |> json(%{"error" => "not_found"})
      {:error, reason} -> conn |> put_status(:unprocessable_entity) |> json(%{"error" => to_string(reason)})
    end
  end

  def material_change(conn, %{"id" => id} = params) do
    user_id = conn.assigns.current_user_id

    case JourneyAuthority.material_change(id, user_id, params) do
      {:ok, body} -> json(conn, body)
      {:error, :forbidden} -> conn |> put_status(:forbidden) |> json(%{"error" => "DENIED"})
      {:error, :not_found} -> conn |> put_status(:not_found) |> json(%{"error" => "not_found"})
      {:error, reason} -> conn |> put_status(:unprocessable_entity) |> json(%{"error" => to_string(reason)})
    end
  end

  def reconfirm(conn, %{"id" => id}) do
    user_id = conn.assigns.current_user_id

    case JourneyAuthority.reconfirm(id, user_id) do
      {:ok, journey} -> json(conn, %{"journey" => journey})
      {:error, :forbidden} -> conn |> put_status(:forbidden) |> json(%{"error" => "DENIED"})
      {:error, :not_found} -> conn |> put_status(:not_found) |> json(%{"error" => "not_found"})
      {:error, reason} -> conn |> put_status(:unprocessable_entity) |> json(%{"error" => to_string(reason)})
    end
  end

  def add_people(conn, %{"id" => id} = params) do
    user_id = conn.assigns.current_user_id
    peers = List.wrap(params["peer_user_ids"] || params["member_user_ids"] || [])

    case JourneyAuthority.add_people(id, user_id, peers) do
      {:ok, body} -> json(conn, body)
      {:error, :forbidden} -> conn |> put_status(:forbidden) |> json(%{"error" => "DENIED"})
      {:error, :not_found} -> conn |> put_status(:not_found) |> json(%{"error" => "not_found"})
      {:error, reason} -> conn |> put_status(:unprocessable_entity) |> json(%{"error" => to_string(reason)})
    end
  end

  def assign_co_lead(conn, %{"id" => id} = params) do
    user_id = conn.assigns.current_user_id
    peer = params["peer_user_id"]

    case JourneyAuthority.assign_co_lead(id, user_id, peer) do
      {:ok, journey} -> json(conn, %{"journey" => journey})
      {:error, :forbidden} -> conn |> put_status(:forbidden) |> json(%{"error" => "DENIED"})
      {:error, reason} -> conn |> put_status(:unprocessable_entity) |> json(%{"error" => to_string(reason)})
    end
  end

  def handoff_lead(conn, %{"id" => id} = params) do
    user_id = conn.assigns.current_user_id
    peer = params["peer_user_id"]

    case JourneyAuthority.handoff_lead(id, user_id, peer) do
      {:ok, journey} -> json(conn, %{"journey" => journey})
      {:error, :forbidden} -> conn |> put_status(:forbidden) |> json(%{"error" => "DENIED"})
      {:error, reason} -> conn |> put_status(:unprocessable_entity) |> json(%{"error" => to_string(reason)})
    end
  end
end
