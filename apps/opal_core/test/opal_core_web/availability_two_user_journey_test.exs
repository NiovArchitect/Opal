defmodule OpalCoreWeb.AvailabilityTwoUserJourneyTest do
  @moduledoc """
  Two-user HTTP journey: private windows → share → overlap → revoke → no auto Set.
  """

  use OpalCoreWeb.ConnCase

  alias OpalCore.Accounts.User
  alias OpalCore.Auth.ProductSession
  alias OpalCore.Messaging.{Conversation, ConversationMember}
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.DeviceSession

  setup do
    uid = System.unique_integer([:positive])

    {:ok, a} =
      %User{}
      |> User.changeset(%{display_name: "Jordan", handle: "j-#{uid}"})
      |> Repo.insert()

    {:ok, b} =
      %User{}
      |> User.changeset(%{display_name: "Sam", handle: "s-#{uid}"})
      |> Repo.insert()

    {:ok, conv} =
      %Conversation{}
      |> Conversation.changeset(%{label: "j-#{uid}"})
      |> Repo.insert()

    for u <- [a, b] do
      %ConversationMember{}
      |> ConversationMember.changeset(%{conversation_id: conv.id, user_id: u.id})
      |> Repo.insert!()
    end

    %{
      a: a,
      b: b,
      conv: conv,
      token_a: mint(a),
      token_b: mint(b)
    }
  end

  defp mint(%User{} = user) do
    n = System.unique_integer([:positive])
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    session =
      %DeviceSession{}
      |> DeviceSession.changeset(%{
        user_id: user.id,
        device_label: "web",
        platform: "web",
        status: "active",
        session_ref: "ref-j-#{n}",
        refresh_family: "rf-j-#{n}",
        idempotency_key: "idem-j-#{n}",
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

  defp range(hours, duration_h) do
    start =
      DateTime.utc_now()
      |> DateTime.add(hours * 3600, :second)
      |> DateTime.truncate(:microsecond)

    {DateTime.to_iso8601(start),
     DateTime.to_iso8601(DateTime.add(start, duration_h * 3600, :second))}
  end

  test "full two-user API journey without auto Set", %{
    conv: conv,
    token_a: token_a,
    token_b: token_b
  } do
    {s1, e1} = range(26, 4)
    {s2, e2} = range(27, 4)

    # A private window
    conn =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/availability/windows", %{
        "start_at" => s1,
        "end_at" => e1,
        "timezone" => "America/Los_Angeles"
      })

    wa = json_response(conn, 201)["window"]["id"]

    # B cannot see A's private list
    conn =
      build_conn()
      |> auth(token_b)
      |> get("/api/v1/product/availability/windows")

    refute wa in Enum.map(json_response(conn, 200)["windows"], & &1["id"])

    # B private window
    conn =
      build_conn()
      |> auth(token_b)
      |> post("/api/v1/product/availability/windows", %{
        "start_at" => s2,
        "end_at" => e2,
        "timezone" => "America/New_York"
      })

    wb = json_response(conn, 201)["window"]["id"]

    # Share A
    conn =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/conversations/#{conv.id}/availability/share", %{
        "window_ids" => [wa]
      })

    share_a = json_response(conn, 201)
    assert share_a["private_schedule_hidden"] == true
    share_id_a = hd(share_a["shared"])["share_id"]
    refute Jason.encode!(share_a) =~ "private_reason"
    refute Jason.encode!(share_a) =~ "calendar_title"

    # Share B → overlap
    conn =
      build_conn()
      |> auth(token_b)
      |> post("/api/v1/product/conversations/#{conv.id}/availability/share", %{
        "window_ids" => [wb]
      })

    share_b = json_response(conn, 201)
    assert share_b["overlap"]["overlap_status"] == "overlap_found"
    assert length(share_b["overlap"]["overlaps"]) == 1

    # Both read shared-safe + overlap
    conn =
      build_conn()
      |> auth(token_a)
      |> get("/api/v1/product/conversations/#{conv.id}/availability/shared")

    shared = json_response(conn, 200)["shared"]
    assert length(shared) == 2

    conn =
      build_conn()
      |> auth(token_a)
      |> get("/api/v1/product/conversations/#{conv.id}/availability/overlap")

    assert json_response(conn, 200)["overlap_status"] == "overlap_found"

    # Conversation signals still not Set from availability alone
    conn =
      build_conn()
      |> auth(token_a)
      |> get("/api/v1/product/conversations/#{conv.id}/messages")

    signals = json_response(conn, 200)["signals"] || []
    refute Enum.any?(signals, &(&1["label"] == "Set"))

    # Revoke A share → need more
    conn =
      build_conn()
      |> auth(token_a)
      |> post(
        "/api/v1/product/conversations/#{conv.id}/availability/shares/#{share_id_a}/revoke",
        %{}
      )

    assert json_response(conn, 200)["revoked"] == true

    conn =
      build_conn()
      |> auth(token_b)
      |> get("/api/v1/product/conversations/#{conv.id}/availability/overlap")

    assert json_response(conn, 200)["overlap_status"] == "need_more_shares"

    # Idempotent re-revoke
    conn =
      build_conn()
      |> auth(token_a)
      |> post(
        "/api/v1/product/conversations/#{conv.id}/availability/shares/#{share_id_a}/revoke",
        %{}
      )

    assert json_response(conn, 200)["origin"] == "idempotent"
  end
end
