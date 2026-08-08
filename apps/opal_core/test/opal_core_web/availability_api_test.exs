defmodule OpalCoreWeb.AvailabilityApiTest do
  @moduledoc "HTTP surface for additive Find a time capability."

  use OpalCoreWeb.ConnCase

  alias OpalCore.Accounts.User
  alias OpalCore.Messaging.{Conversation, ConversationMember}
  alias OpalCore.Auth.ProductSession
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.DeviceSession

  setup %{conn: conn} do
    uid = System.unique_integer([:positive])

    {:ok, a} =
      %User{}
      |> User.changeset(%{display_name: "A", handle: "api-a-#{uid}"})
      |> Repo.insert()

    {:ok, b} =
      %User{}
      |> User.changeset(%{display_name: "B", handle: "api-b-#{uid}"})
      |> Repo.insert()

    {:ok, c} =
      %User{}
      |> User.changeset(%{display_name: "C", handle: "api-c-#{uid}"})
      |> Repo.insert()

    {:ok, conv} =
      %Conversation{}
      |> Conversation.changeset(%{label: "api-av-#{uid}"})
      |> Repo.insert()

    for u <- [a, b] do
      %ConversationMember{}
      |> ConversationMember.changeset(%{conversation_id: conv.id, user_id: u.id})
      |> Repo.insert!()
    end

    token_a = mint_token(a)
    token_b = mint_token(b)
    token_c = mint_token(c)

    %{
      conn: conn,
      a: a,
      b: b,
      c: c,
      conv: conv,
      token_a: token_a,
      token_b: token_b,
      token_c: token_c
    }
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
        session_ref: "ref-av-#{n}",
        refresh_family: "rf-av-#{n}",
        idempotency_key: "idem-av-#{n}",
        last_seen_at: now
      })
      |> Repo.insert!()

    {:ok, payload} = ProductSession.issue(session)
    payload.access_token
  end

  defp auth(conn, token) do
    conn
    |> put_req_header("content-type", "application/json")
    |> put_req_header("authorization", "Bearer #{token}")
  end

  defp future_iso(hours, duration_h) do
    start =
      DateTime.utc_now()
      |> DateTime.add(hours * 3600, :second)
      |> DateTime.truncate(:microsecond)

    {DateTime.to_iso8601(start),
     DateTime.to_iso8601(DateTime.add(start, duration_h * 3600, :second))}
  end

  test "create private window, share, overlap, outsider denied", %{
    conn: conn,
    conv: conv,
    token_a: token_a,
    token_b: token_b,
    token_c: token_c
  } do
    {s1, e1} = future_iso(24, 4)
    {s2, e2} = future_iso(25, 4)

    conn =
      conn
      |> auth(token_a)
      |> post("/api/v1/product/availability/windows", %{
        "start_at" => s1,
        "end_at" => e1,
        "timezone" => "America/Los_Angeles"
      })

    body = json_response(conn, 201)
    assert body["private"] == true
    wid_a = body["window"]["id"]

    conn =
      build_conn()
      |> auth(token_b)
      |> post("/api/v1/product/availability/windows", %{
        "start_at" => s2,
        "end_at" => e2,
        "timezone" => "America/Los_Angeles"
      })

    wid_b = json_response(conn, 201)["window"]["id"]

    # B cannot list A's private windows via owner index (only own)
    conn =
      build_conn()
      |> auth(token_b)
      |> get("/api/v1/product/availability/windows")

    ids = Enum.map(json_response(conn, 200)["windows"], & &1["id"])
    refute wid_a in ids
    assert wid_b in ids

    # Share both
    conn =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/conversations/#{conv.id}/availability/share", %{
        "window_ids" => [wid_a]
      })

    share_body = json_response(conn, 201)
    assert share_body["private_schedule_hidden"] == true
    assert hd(share_body["shared"])["shared_safe"] == true

    conn =
      build_conn()
      |> auth(token_b)
      |> post("/api/v1/product/conversations/#{conv.id}/availability/share", %{
        "window_ids" => [wid_b]
      })

    assert json_response(conn, 201)["overlap"]["overlap_status"] == "overlap_found"

    conn =
      build_conn()
      |> auth(token_a)
      |> get("/api/v1/product/conversations/#{conv.id}/availability/overlap")

    o = json_response(conn, 200)
    assert o["overlap_status"] == "overlap_found"
    assert length(o["overlaps"]) == 1

    # Outsider C
    conn =
      build_conn()
      |> auth(token_c)
      |> get("/api/v1/product/conversations/#{conv.id}/availability/shared")

    assert json_response(conn, 403)["error_code"] == "not_a_member"
  end
end
