defmodule OpalCoreWeb.R23AudienceInvisibilityTest do
  @moduledoc """
  Repair #23 (WS-23-2) - AUDIENCE MADE REAL, API leg.

  The mandatory proof: a post published with the restricted
  audience (visibility "specific_people" - the server's own
  vocabulary for moments, SocialMomentVisibility.supported_visibilities/0)
  must be SERVER-invisible to an excluded account, not merely
  un-rendered. Three real authenticated accounts:

    - A: the author
    - B: A's friend (dyad peer) who is NOT in the audience
    - C: A's friend (dyad peer) who IS in the audience

  Assertions:
    - B's GET /social-moments carries no trace of the restricted
      post (neither its id nor its caption).
    - B's GET /social-moments/:id is a 404.
    - B's GET /home/feed (the Flows read path, which composes
      from the same list_for_viewer) carries no trace either.
    - A and C both see the post on list and show.
    - NEGATIVE CONTROL: A's Friends post IS visible to B on
      list, show and home feed - proving the harness can see,
      so the invisibility above is the audience rule at work,
      not a broken harness.
    - The audience-preview endpoint answers its own question
      for the restricted choice.

  Run standalone:
      mix test test/opal_core_web/r23_audience_invisibility_test.exs
  """

  use OpalCoreWeb.ConnCase, async: false

  alias OpalCore.Accounts.User
  alias OpalCore.Auth.ProductSession
  alias OpalCore.Messages
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.DeviceSession

  @restricted_caption "r23 restricted audience post"
  @friends_caption "r23 friends audience post"

  setup do
    a = insert_user!("r23_aud_author", "R23 Author")
    b = insert_user!("r23_aud_excluded", "R23 Excluded Friend")
    c = insert_user!("r23_aud_included", "R23 Included Friend")

    # Dyad conversations make B and C A's friends under
    # RelationshipGraph (dyad peers) - the same friendship the
    # Friends negative control below relies on.
    {:ok, _} = Messages.ensure_direct_conversation(a.id, b.id)
    {:ok, _} = Messages.ensure_direct_conversation(a.id, c.id)

    %{
      a: a,
      b: b,
      c: c,
      token_a: mint_token(a),
      token_b: mint_token(b),
      token_c: mint_token(c)
    }
  end

  defp authed(token) do
    build_conn() |> put_req_header("authorization", "Bearer #{token}")
  end

  defp publish!(token, attrs) do
    conn = authed(token) |> post("/api/v1/product/social-moments", attrs)
    body = json_response(conn, 200)
    body["moment"]["id"]
  end

  defp list_ids(token) do
    conn = authed(token) |> get("/api/v1/product/social-moments")
    body = json_response(conn, 200)
    Enum.map(body["moments"], & &1["id"])
  end

  defp feed_ids(token) do
    conn = authed(token) |> get("/api/v1/product/home/feed")
    body = json_response(conn, 200)
    Enum.map(body["objects"], & &1["id"])
  end

  test "restricted post is server-invisible to the excluded friend, visible to author and included friend",
       %{a: a, c: c, token_a: token_a, token_b: token_b, token_c: token_c} do
    restricted_id =
      publish!(token_a, %{
        "caption" => @restricted_caption,
        "visibility" => "specific_people",
        "audience_user_ids" => [c.id],
        "media_ids" => []
      })

    # B: list carries no trace - neither the id nor the caption text.
    conn = authed(token_b) |> get("/api/v1/product/social-moments")
    body = json_response(conn, 200)
    refute restricted_id in Enum.map(body["moments"], & &1["id"])
    refute conn.resp_body =~ @restricted_caption

    # B: show is a hard 404 - the post does not exist for B.
    conn = authed(token_b) |> get("/api/v1/product/social-moments/#{restricted_id}")
    assert json_response(conn, 404)["error"] == "not_found"

    # B: the Flows read path (home feed) carries no trace either.
    refute restricted_id in feed_ids(token_b)

    conn = authed(token_b) |> get("/api/v1/product/home/feed")
    refute conn.resp_body =~ @restricted_caption

    # A (author) and C (included) both see it, list and show.
    assert restricted_id in list_ids(token_a)
    assert restricted_id in list_ids(token_c)
    assert restricted_id in feed_ids(token_c)

    conn = authed(token_c) |> get("/api/v1/product/social-moments/#{restricted_id}")
    shown = json_response(conn, 200)
    assert shown["moment"]["id"] == restricted_id
    assert shown["moment"]["visibility"] == "specific_people"

    conn = authed(token_a) |> get("/api/v1/product/social-moments/#{restricted_id}")
    assert json_response(conn, 200)["moment"]["id"] == restricted_id

    _ = a
  end

  test "negative control: the excluded friend DOES see the author's Friends post",
       %{token_a: token_a, token_b: token_b} do
    friends_id =
      publish!(token_a, %{
        "caption" => @friends_caption,
        "visibility" => "friends",
        "media_ids" => []
      })

    assert friends_id in list_ids(token_b)
    assert friends_id in feed_ids(token_b)

    conn = authed(token_b) |> get("/api/v1/product/social-moments/#{friends_id}")
    assert json_response(conn, 200)["moment"]["id"] == friends_id
  end

  test "audience-preview answers who can see the restricted choice",
       %{c: c, token_a: token_a} do
    conn =
      authed(token_a)
      |> post("/api/v1/product/social-moments/audience-preview", %{
        "visibility" => "specific_people",
        "audience_user_ids" => [c.id],
        "audience_labels" => ["R23 Included Friend"]
      })

    body = json_response(conn, 200)
    assert body["question"] == "Who can see this?"
    assert body["preview"]["visibility"] == "specific_people"
    assert body["preview"]["who_can_see"] == "R23 Included Friend"
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
        session_ref: "ref-r23aud-#{n}",
        refresh_family: "rf-r23aud-#{n}",
        idempotency_key: "idem-r23aud-#{n}",
        last_seen_at: now
      })
      |> Repo.insert!()

    {:ok, payload} = ProductSession.issue(session)
    payload.access_token
  end
end
