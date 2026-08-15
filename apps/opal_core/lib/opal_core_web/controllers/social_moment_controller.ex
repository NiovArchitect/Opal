defmodule OpalCoreWeb.SocialMomentController do
  use OpalCoreWeb, :controller

  alias OpalCore.SocialFlow.SocialMomentPublishing

  def media_status(conn, _params) do
    json(conn, SocialMomentPublishing.media_status())
  end

  def upload_media(conn, params) do
    user_id = conn.assigns.current_user_id

    case SocialMomentPublishing.upload_media(user_id, params) do
      {:ok, media} -> json(conn, %{"media" => media})
      {:error, reason} -> conn |> put_status(:unprocessable_entity) |> json(%{"error" => to_string(reason)})
    end
  end

  def create(conn, params) do
    user_id = conn.assigns.current_user_id

    case SocialMomentPublishing.publish(user_id, params) do
      {:ok, body} -> json(conn, body)
      {:error, reason} -> conn |> put_status(:unprocessable_entity) |> json(%{"error" => to_string(reason)})
    end
  end

  def audience_preview(conn, params) do
    user_id = conn.assigns.current_user_id
    preview = SocialMomentPublishing.audience_preview(user_id, params)
    json(conn, %{"preview" => preview, "question" => "Who can see this?"})
  end

  def index(conn, _params) do
    user_id = conn.assigns.current_user_id
    moments = SocialMomentPublishing.list_for_viewer(user_id)
    json(conn, %{"moments" => moments, "not_home_feed" => true, "discovery_uses_commission" => false})
  end

  def show(conn, %{"id" => id}) do
    user_id = conn.assigns.current_user_id

    case SocialMomentPublishing.get_for_viewer(id, user_id) do
      {:ok, moment} -> json(conn, %{"moment" => moment})
      {:error, _} -> conn |> put_status(:not_found) |> json(%{"error" => "not_found"})
    end
  end

  def delete(conn, %{"id" => id}) do
    user_id = conn.assigns.current_user_id

    case SocialMomentPublishing.delete_own(user_id, id) do
      {:ok, body} -> json(conn, body)
      {:error, :forbidden} -> conn |> put_status(:forbidden) |> json(%{"error" => "forbidden"})
      {:error, :not_found} -> conn |> put_status(:not_found) |> json(%{"error" => "not_found"})
      {:error, reason} -> conn |> put_status(:unprocessable_entity) |> json(%{"error" => to_string(reason)})
    end
  end

  def update(conn, %{"id" => id} = params) do
    user_id = conn.assigns.current_user_id

    case SocialMomentPublishing.edit_own(user_id, id, params) do
      {:ok, moment} -> json(conn, %{"moment" => moment})
      {:error, :forbidden} -> conn |> put_status(:forbidden) |> json(%{"error" => "forbidden"})
      {:error, :not_found} -> conn |> put_status(:not_found) |> json(%{"error" => "not_found"})
      {:error, reason} -> conn |> put_status(:unprocessable_entity) |> json(%{"error" => inspect(reason)})
    end
  end

  def hide(conn, %{"id" => id}) do
    user_id = conn.assigns.current_user_id

    case SocialMomentPublishing.hide(user_id, id) do
      {:ok, body} -> json(conn, body)
      {:error, reason} -> conn |> put_status(:unprocessable_entity) |> json(%{"error" => inspect(reason)})
    end
  end

  def report(conn, %{"id" => id} = params) do
    user_id = conn.assigns.current_user_id

    case SocialMomentPublishing.report(user_id, id, params) do
      {:ok, body} -> json(conn, body)
      {:error, reason} -> conn |> put_status(:unprocessable_entity) |> json(%{"error" => inspect(reason)})
    end
  end

  def media(conn, %{"media_id" => media_id}) do
    user_id = conn.assigns.current_user_id

    case SocialMomentPublishing.read_media(media_id, user_id) do
      {:ok, bin} ->
        conn
        |> put_resp_content_type("application/octet-stream")
        |> send_resp(200, bin)

      {:error, _} ->
        conn |> put_status(:not_found) |> json(%{"error" => "not_found"})
    end
  end
end
