defmodule OpalCoreWeb.SocialMomentEngagementApiTest do
  use OpalCoreWeb.ConnCase, async: false

  alias OpalCore.Accounts.User
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.DeviceSession
  alias OpalCore.Auth.ProductSession
  alias OpalCore.SocialFlow.SocialMomentPublishing

  setup %{conn: conn} do
    user = insert_user!("api_eng_author", "API Author")
    token = mint_token(user)

    {:ok, pub} =
      SocialMomentPublishing.publish(user.id, %{
        "caption" => "API memory",
        "visibility" => "friends",
        "media_ids" => []
      })

    %{
      conn: conn,
      user: user,
      token: token,
      moment_id: pub["moment"]["id"]
    }
  end

  test "PUT like / comments / home feed", %{
    conn: conn,
    token: token,
    moment_id: moment_id
  } do
    conn =
      conn
      |> put_req_header("authorization", "Bearer #{token}")
      |> put("/api/v1/product/social-moments/#{moment_id}/like")

    assert %{
             "viewer_liked" => true,
             "like_count" => 1
           } = json_response(conn, 200)

    conn =
      build_conn()
      |> put_req_header("authorization", "Bearer #{token}")
      |> post("/api/v1/product/social-moments/#{moment_id}/comments", %{"body" => "Nice shot"})

    assert %{"comment" => %{"body" => "Nice shot"}, "comment_count" => 1} = json_response(conn, 200)

    conn =
      build_conn()
      |> put_req_header("authorization", "Bearer #{token}")
      |> get("/api/v1/product/home/feed")

    body = json_response(conn, 200)
    assert body["mode"] == "PRODUCTION_HYDRATION"
    assert body["fixture_injected"] == false
    assert Enum.any?(body["objects"], &(&1["id"] == moment_id))
  end

  test "stranger denied private comment", %{conn: conn} do
    author = insert_user!("api_priv_author", "Priv Author")
    stranger = insert_user!("api_priv_stranger", "Priv Stranger")
    stranger_token = mint_token(stranger)

    {:ok, pub} =
      SocialMomentPublishing.publish(author.id, %{
        "caption" => "secret",
        "visibility" => "private",
        "media_ids" => []
      })

    moment_id = pub["moment"]["id"]

    conn =
      conn
      |> put_req_header("authorization", "Bearer #{stranger_token}")
      |> post("/api/v1/product/social-moments/#{moment_id}/comments", %{"body" => "nope"})

    assert json_response(conn, 403)["error"] == "DENIED"
  end

  defp insert_user!(handle, name) do
    %User{}
    |> User.changeset(%{handle: handle, display_name: name})
    |> Repo.insert!()
  end

  defp mint_token(%User{} = user) do
    n = System.unique_integer([:positive])
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    session =
      %DeviceSession{}
      |> DeviceSession.changeset(%{
        user_id: user.id,
        device_label: "test-web",
        platform: "web",
        status: "active",
        session_ref: "ref-eng-#{n}",
        refresh_family: "rf-eng-#{n}",
        idempotency_key: "idem-eng-#{n}",
        last_seen_at: now
      })
      |> Repo.insert!()

    {:ok, payload} = ProductSession.issue(session)
    payload.access_token
  end
end
