defmodule OpalCoreWeb.FollowApiTest do
  use OpalCoreWeb.ConnCase

  alias OpalCore.FixturesHelper
  alias OpalCore.SocialFlow.{FollowGraph, RelationshipGraph}

  setup do
    FixturesHelper.seed!()
    :ok
  end

  defp activate(conn, phone, name, handle) do
    conn =
      post(conn, "/api/v1/product/activation/challenges", %{
        "otp_consent_accepted" => true,
        "phone" => phone,
        "device_label" => "#{handle}-web",
        "idempotency_key" => "ch-#{handle}-#{System.unique_integer([:positive])}"
      })

    body = json_response(conn, 201)
    code = body["development_code"]
    challenge_id = body["challenge"]["id"]

    conn =
      post(conn, "/api/v1/product/activation/verify", %{
        "challenge_id" => challenge_id,
        "code" => code,
        "display_name" => name,
        "device_label" => "#{handle}-web",
        "handle_hint" => handle,
        "platform" => "web",
        "include_bearer" => true
      })

    body = json_response(conn, 200)
    {body["session"]["access_token"], body["user"]["id"]}
  end

  defp auth(conn, token), do: put_req_header(conn, "authorization", "Bearer #{token}")

  test "follow / status / list / unfollow; never grants friend", %{conn: conn} do
    {tok_f, follower_id} = activate(conn, "+12025550901", "Follower Kai", "foll_p27")
    {tok_c, creator_id} = activate(conn, "+12025550902", "Creator Mira", "crea_p27")

    # Follow
    conn =
      conn
      |> auth(tok_f)
      |> post("/api/v1/product/follows", %{"creator_user_id" => creator_id})

    body = json_response(conn, 201)
    assert body["following"] == true
    assert body["grants_friend_visibility"] == false
    assert body["follow_is_not_friend"] == true
    assert body["permission_matrix"]["friend_visibility"] == false
    assert body["permission_matrix"]["reality_membership"] == false
    assert body["permission_matrix"]["calendar_availability"] == false

    # Status
    conn =
      build_conn()
      |> auth(tok_f)
      |> get("/api/v1/product/follows/status", %{"creator_user_id" => creator_id})

    st = json_response(conn, 200)
    assert st["following"] == true
    assert st["grants_friend_visibility"] == false

    # Durable domain agrees
    assert FollowGraph.following_durable?(follower_id, creator_id)

    # List
    conn =
      build_conn()
      |> auth(tok_f)
      |> get("/api/v1/product/follows")

    list = json_response(conn, 200)
    assert creator_id in list["following_user_ids"]
    assert list["no_synchronous_fanout"] == true

    # Follow does not create RelationshipGraph friend edge
    refute RelationshipGraph.friend_visibility_authorized?(creator_id, follower_id)

    # Unfollow
    conn =
      build_conn()
      |> auth(tok_f)
      |> delete("/api/v1/product/follows/#{creator_id}")

    u = json_response(conn, 200)
    assert u["following"] == false
    refute FollowGraph.following_durable?(follower_id, creator_id)

    # Stranger cannot follow without auth
    conn = post(build_conn(), "/api/v1/product/follows", %{"creator_user_id" => creator_id})
    assert conn.status == 401

    # Creator token unused is fine
    _ = tok_c
  end

  test "cannot follow self; restart durability via durable graph", %{conn: conn} do
    {tok, uid} = activate(conn, "+12025550903", "Self User", "self_p27")
    {_, creator_id} = activate(conn, "+12025550904", "Other Creator", "ocre_p27")

    conn =
      conn
      |> auth(tok)
      |> post("/api/v1/product/follows", %{"creator_user_id" => uid})

    assert json_response(conn, 422)["error_code"] == "cannot_follow_self"

    # Follow then "restart" = re-read durable graph
    assert {:ok, _, :created} = FollowGraph.follow_durable(uid, creator_id)
    assert FollowGraph.following_durable?(uid, creator_id)
    assert {:ok, _, :idempotent} = FollowGraph.follow_durable(uid, creator_id)
    assert {:ok, :revoked} = FollowGraph.unfollow_durable(uid, creator_id)
    refute FollowGraph.following_durable?(uid, creator_id)
  end
end
