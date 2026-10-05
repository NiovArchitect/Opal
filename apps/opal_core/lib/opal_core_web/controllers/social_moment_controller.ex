defmodule OpalCoreWeb.SocialMomentController do
  use OpalCoreWeb, :controller

  alias OpalCore.SocialFlow.{
    HomeFeed,
    SocialMomentEngagement,
    SocialMomentPublishing,
    TemporaryStoryPublishing
  }

  def media_status(conn, _params) do
    json(conn, SocialMomentPublishing.media_status())
  end

  @doc "Production Home hydration — eligible SocialMoments as Memory projections."
  def home_feed(conn, params) do
    user_id = conn.assigns.current_user_id
    limit = parse_int(params["limit"], 40)
    cursor = params["cursor"]

    body = HomeFeed.compose(user_id, limit: limit, cursor: cursor)
    json(conn, body)
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

    moments =
      SocialMomentPublishing.list_for_viewer(user_id)
      |> Enum.map(&SocialMomentEngagement.enrich_moment_contract(&1, user_id))

    json(conn, %{
      "moments" => moments,
      "not_home_feed" => true,
      "home_feed_path" => "/api/v1/product/home/feed",
      "discovery_uses_commission" => false
    })
  end

  def show(conn, %{"id" => id}) do
    user_id = conn.assigns.current_user_id

    case SocialMomentPublishing.get_for_viewer(id, user_id) do
      {:ok, moment} ->
        json(conn, %{
          "moment" => SocialMomentEngagement.enrich_moment_contract(moment, user_id)
        })

      {:error, _} ->
        conn |> put_status(:not_found) |> json(%{"error" => "not_found"})
    end
  end

  def like(conn, %{"id" => id}) do
    user_id = conn.assigns.current_user_id

    case SocialMomentEngagement.like(user_id, id) do
      {:ok, body} -> json(conn, body)
      {:error, :denied} -> conn |> put_status(:forbidden) |> json(%{"error" => "DENIED"})
      {:error, :not_found} -> conn |> put_status(:not_found) |> json(%{"error" => "not_found"})
      {:error, reason} -> conn |> put_status(:unprocessable_entity) |> json(%{"error" => to_string(reason)})
    end
  end

  def unlike(conn, %{"id" => id}) do
    user_id = conn.assigns.current_user_id

    case SocialMomentEngagement.unlike(user_id, id) do
      {:ok, body} -> json(conn, body)
      {:error, :denied} -> conn |> put_status(:forbidden) |> json(%{"error" => "DENIED"})
      {:error, :not_found} -> conn |> put_status(:not_found) |> json(%{"error" => "not_found"})
      {:error, reason} -> conn |> put_status(:unprocessable_entity) |> json(%{"error" => to_string(reason)})
    end
  end

  def comments(conn, %{"id" => id}) do
    user_id = conn.assigns.current_user_id

    case SocialMomentEngagement.list_comments(user_id, id) do
      {:ok, body} -> json(conn, body)
      {:error, :denied} -> conn |> put_status(:forbidden) |> json(%{"error" => "DENIED"})
      {:error, :not_found} -> conn |> put_status(:not_found) |> json(%{"error" => "not_found"})
      {:error, reason} -> conn |> put_status(:unprocessable_entity) |> json(%{"error" => to_string(reason)})
    end
  end

  def create_comment(conn, %{"id" => id} = params) do
    user_id = conn.assigns.current_user_id
    # Ignore client author_user_id — session is authority.
    body = params["body"] || ""

    case SocialMomentEngagement.add_comment(user_id, id, body) do
      {:ok, result} -> json(conn, result)
      {:error, :denied} -> conn |> put_status(:forbidden) |> json(%{"error" => "DENIED"})
      {:error, :not_found} -> conn |> put_status(:not_found) |> json(%{"error" => "not_found"})
      {:error, :empty_body} -> conn |> put_status(:unprocessable_entity) |> json(%{"error" => "empty_body"})
      {:error, reason} -> conn |> put_status(:unprocessable_entity) |> json(%{"error" => to_string(reason)})
    end
  end

  def repost(conn, %{"id" => id}) do
    user_id = conn.assigns.current_user_id

    case SocialMomentEngagement.repost(user_id, id) do
      {:ok, body} -> json(conn, body)
      {:error, :repost_not_allowed} ->
        conn |> put_status(:forbidden) |> json(%{"error" => "repost_not_allowed"})
      {:error, :denied} -> conn |> put_status(:forbidden) |> json(%{"error" => "DENIED"})
      {:error, :not_found} -> conn |> put_status(:not_found) |> json(%{"error" => "not_found"})
      {:error, reason} -> conn |> put_status(:unprocessable_entity) |> json(%{"error" => to_string(reason)})
    end
  end

  def unrepost(conn, %{"id" => id}) do
    user_id = conn.assigns.current_user_id

    case SocialMomentEngagement.unrepost(user_id, id) do
      {:ok, body} -> json(conn, body)
      {:error, :denied} -> conn |> put_status(:forbidden) |> json(%{"error" => "DENIED"})
      {:error, :not_found} -> conn |> put_status(:not_found) |> json(%{"error" => "not_found"})
      {:error, reason} -> conn |> put_status(:unprocessable_entity) |> json(%{"error" => to_string(reason)})
    end
  end

  def save(conn, %{"id" => id}) do
    user_id = conn.assigns.current_user_id

    case SocialMomentEngagement.save(user_id, id) do
      {:ok, body} -> json(conn, body)
      {:error, :denied} -> conn |> put_status(:forbidden) |> json(%{"error" => "DENIED"})
      {:error, :not_found} -> conn |> put_status(:not_found) |> json(%{"error" => "not_found"})
      {:error, reason} -> conn |> put_status(:unprocessable_entity) |> json(%{"error" => to_string(reason)})
    end
  end

  def unsave(conn, %{"id" => id}) do
    user_id = conn.assigns.current_user_id

    case SocialMomentEngagement.unsave(user_id, id) do
      {:ok, body} -> json(conn, body)
      {:error, :denied} -> conn |> put_status(:forbidden) |> json(%{"error" => "DENIED"})
      {:error, :not_found} -> conn |> put_status(:not_found) |> json(%{"error" => "not_found"})
      {:error, reason} -> conn |> put_status(:unprocessable_entity) |> json(%{"error" => to_string(reason)})
    end
  end

  def list_saved(conn, _params) do
    user_id = conn.assigns.current_user_id
    json(conn, SocialMomentEngagement.list_saved(user_id))
  end

  def create_story(conn, params) do
    user_id = conn.assigns.current_user_id

    case TemporaryStoryPublishing.create(user_id, params) do
      {:ok, story} -> json(conn, %{"story" => story})
      {:error, :media_required} ->
        conn |> put_status(:unprocessable_entity) |> json(%{"error" => "media_required"})
      {:error, reason} ->
        conn |> put_status(:unprocessable_entity) |> json(%{"error" => inspect(reason)})
    end
  end

  def list_stories(conn, _params) do
    user_id = conn.assigns.current_user_id
    stories = TemporaryStoryPublishing.list_for_viewer(user_id)
    json(conn, %{"stories" => stories})
  end

  def delete_story(conn, %{"id" => id}) do
    user_id = conn.assigns.current_user_id

    case TemporaryStoryPublishing.delete_own(user_id, id) do
      :ok ->
        json(conn, %{"deleted" => true, "story_id" => id})

      {:error, :forbidden} ->
        conn |> put_status(:forbidden) |> json(%{"error" => "forbidden"})

      {:error, :not_found} ->
        conn |> put_status(:not_found) |> json(%{"error" => "not_found"})

      {:error, reason} ->
        conn |> put_status(:unprocessable_entity) |> json(%{"error" => to_string(reason)})
    end
  end

  defp parse_int(nil, default), do: default
  defp parse_int(v, default) when is_binary(v) do
    case Integer.parse(v) do
      {n, _} -> n
      :error -> default
    end
  end
  defp parse_int(v, _default) when is_integer(v), do: v
  defp parse_int(_, default), do: default

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
