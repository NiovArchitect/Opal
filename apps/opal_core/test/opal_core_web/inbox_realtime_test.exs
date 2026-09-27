defmodule OpalCoreWeb.InboxRealtimeTest do
  @moduledoc """
  A message must reach the recipient's user inbox even when that person
  is not joined to the conversation channel. The list API remains the
  truth path. Read receipts do not own unread.
  """
  use OpalCoreWeb.ConnCase

  alias OpalCore.FixturesHelper
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.PhoneVerification.Provider
  alias OpalCore.SocialFlow.SharedPlan

  @walk_a "+12025550191"
  @walk_b "+12025550192"
  @stranger "+12025550193"

  setup do
    FixturesHelper.seed!()
    previous = Application.get_env(:opal_core, :phone_verify_mode)
    Application.put_env(:opal_core, :phone_verify_mode, :synthetic_development)

    on_exit(fn ->
      if is_nil(previous) do
        Application.delete_env(:opal_core, :phone_verify_mode)
      else
        Application.put_env(:opal_core, :phone_verify_mode, previous)
      end
    end)

    :ok
  end

  defp activate(conn, phone, name, handle) do
    conn =
      post(conn, "/api/v1/product/activation/challenges", %{
        "otp_consent_accepted" => true,
        "phone" => phone,
        "device_label" => "#{handle}-web",
        "idempotency_key" => "inbox-ch-#{handle}-#{System.unique_integer([:positive])}"
      })

    body = json_response(conn, 201)
    code = body["development_code"]
    challenge_id = body["challenge"]["id"]
    assert Provider.synthetic_mode?()

    conn =
      post(conn, "/api/v1/product/activation/verify", %{
        "challenge_id" => challenge_id,
        "code" => code,
        "phone" => phone,
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

  defp row(_conn, token, conversation_id) do
    conn =
      build_conn()
      |> auth(token)
      |> get("/api/v1/product/conversations")

    Enum.find(json_response(conn, 200)["conversations"], &(&1["id"] == conversation_id))
  end

  test "inbox fanout, unread authority, receipt preference, and private plan projection", %{
    conn: conn
  } do
    {token_a, user_a} = activate(conn, @walk_a, "Walk A", "inbox_a")
    {token_b, user_b} = activate(build_conn(), @walk_b, "Walk B", "inbox_b")
    {token_c, user_c} = activate(build_conn(), @stranger, "Walk C", "inbox_c")

    conn =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/conversations/direct", %{"peer_user_id" => user_b})

    conversation_id = json_response(conn, 201)["conversation_id"]

    :ok = Phoenix.PubSub.subscribe(OpalCore.PubSub, "user:#{user_a}")
    :ok = Phoenix.PubSub.subscribe(OpalCore.PubSub, "user:#{user_b}")
    :ok = Phoenix.PubSub.subscribe(OpalCore.PubSub, "user:#{user_c}")

    conn =
      build_conn()
      |> auth(token_b)
      |> post("/api/v1/product/conversations/#{conversation_id}/messages", %{
        "body" => "Good afternoon",
        "client_message_id" => "inbox-good-afternoon"
      })

    message = json_response(conn, 201)["message"]

    assert_receive %Phoenix.Socket.Broadcast{
                     topic: "user:" <> ^user_a,
                     event: "inbox:message",
                     payload: for_a
                   },
                   1_000

    assert for_a["conversation_id"] == conversation_id
    assert for_a["message_id"] == message["id"]
    assert for_a["server_seq"] == message["server_seq"]
    assert for_a["sender_user_id"] == user_b
    assert for_a["preview"] == "Good afternoon"
    assert for_a["unread_count"] == 1
    assert for_a["acceptance"] == "sent_to_server"
    assert for_a["visibility"] == "participants"
    assert for_a["in_app"] == true

    assert_receive %Phoenix.Socket.Broadcast{
                     topic: "user:" <> ^user_b,
                     event: "inbox:message",
                     payload: for_b
                   },
                   1_000

    assert for_b["unread_count"] == 0
    assert for_b["in_app"] == false

    refute_receive %Phoenix.Socket.Broadcast{
                     topic: "user:" <> ^user_c,
                     event: "inbox:message"
                   },
                   200

    listed = row(conn, token_a, conversation_id)
    assert listed["preview"] == "Good afternoon"
    assert listed["unread_count"] == 1
    assert listed["plan_projection"] == nil

    conn =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/conversations/#{conversation_id}/read", %{})

    assert json_response(conn, 200)["unread_count"] == 0

    assert_receive %Phoenix.Socket.Broadcast{
                     topic: "user:" <> ^user_b,
                     event: "inbox:read",
                     payload: %{"peer_visible" => true, "reader_user_id" => ^user_a}
                   },
                   1_000

    assert row(conn, token_a, conversation_id)["unread_count"] == 0

    conn =
      build_conn()
      |> auth(token_a)
      |> patch("/api/v1/product/preferences/messaging", %{"read_receipts_enabled" => false})

    assert json_response(conn, 200)["read_receipts_enabled"] == false

    conn =
      build_conn()
      |> auth(token_b)
      |> post("/api/v1/product/conversations/#{conversation_id}/messages", %{
        "body" => "Unread durability test",
        "client_message_id" => "inbox-unread-durability"
      })

    assert json_response(conn, 201)["message"]["body"] == "Unread durability test"

    assert_receive %Phoenix.Socket.Broadcast{
                     topic: "user:" <> ^user_a,
                     event: "inbox:message",
                     payload: again
                   },
                   1_000

    assert again["preview"] == "Unread durability test"
    assert again["unread_count"] == 1

    conn =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/conversations/#{conversation_id}/read", %{})

    assert json_response(conn, 200)["unread_count"] == 0

    refute_receive %Phoenix.Socket.Broadcast{
                     event: "inbox:read",
                     payload: %{"peer_visible" => true}
                   },
                   200

    assert row(conn, token_a, conversation_id)["unread_count"] == 0

    {:ok, _plan} =
      %SharedPlan{}
      |> SharedPlan.changeset(%{
        conversation_id: conversation_id,
        title: "Dinner",
        status: "agreed",
        timezone: "America/Los_Angeles",
        created_by_user_id: user_a,
        alignment: %{
          "lineage_id" => "plan-walk",
          "plan_version" => 1,
          "commitment" => "execution_ready",
          "date" => %{"state" => "locked", "value" => "Tuesday · Sep 29"},
          "exact_time" => %{"state" => "locked", "value" => "7:30 PM"},
          "place" => %{"state" => "locked", "value" => "Fort Oak"}
        }
      })
      |> Repo.insert()

    projected = row(conn, token_a, conversation_id)["plan_projection"]
    assert projected["visibility"] == "participants"
    assert projected["public"] == false
    assert projected["participant_mode"] == "dyad"
    assert projected["place"] == "Fort Oak"
    assert projected["when_label"] == "Tuesday · Sep 29 · 7:30 PM"
    assert projected["execution_label"] == "Reservation approved"
    assert projected["execution_detail"] == "Booking hasn't been placed yet."

    stranger_list =
      build_conn()
      |> auth(token_c)
      |> get("/api/v1/product/conversations")
      |> json_response(200)

    refute Enum.any?(stranger_list["conversations"], &(&1["id"] == conversation_id))
  end

  test "mute stops the banner and keeps delivery, unread, receipts, and the plan", %{conn: conn} do
    {token_a, user_a} = activate(conn, "+12025550194", "Walk A", "mute_a")
    {token_b, user_b} = activate(build_conn(), "+12025550195", "Walk B", "mute_b")

    conversation_id =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/conversations/direct", %{"peer_user_id" => user_b})
      |> json_response(201)
      |> Map.fetch!("conversation_id")

    {:ok, _} =
      %SharedPlan{}
      |> SharedPlan.changeset(%{
        conversation_id: conversation_id,
        title: "Dinner",
        status: "agreed",
        timezone: "America/Los_Angeles",
        created_by_user_id: user_a,
        alignment: %{
          "lineage_id" => "plan-mute",
          "commitment" => "aligned",
          "date" => %{"value" => "Tuesday · Sep 29"},
          "exact_time" => %{"state" => "locked", "value" => "7:30 PM"},
          "place" => %{"state" => "locked", "value" => "Fort Oak"}
        }
      })
      |> Repo.insert()

    conn =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/conversations/#{conversation_id}/notifications", %{"muted" => true})

    assert json_response(conn, 200)["notifications_muted"] == true
    assert row(conn, token_a, conversation_id)["notifications_muted"] == true
    assert row(conn, token_a, conversation_id)["plan_projection"]["place"] == "Fort Oak"

    :ok = Phoenix.PubSub.subscribe(OpalCore.PubSub, "user:#{user_a}")
    :ok = Phoenix.PubSub.subscribe(OpalCore.PubSub, "user:#{user_b}")

    conn =
      build_conn()
      |> auth(token_b)
      |> post("/api/v1/product/conversations/#{conversation_id}/messages", %{
        "body" => "Hello",
        "client_message_id" => "mute-hello"
      })

    assert json_response(conn, 201)["message"]["body"] == "Hello"

    assert_receive %Phoenix.Socket.Broadcast{
                     topic: "user:" <> ^user_a,
                     event: "inbox:message",
                     payload: muted_notice
                   },
                   1_000

    assert muted_notice["preview"] == "Hello"
    assert muted_notice["unread_count"] == 1
    assert muted_notice["in_app"] == false
    assert muted_notice["acceptance"] == "sent_to_server"

    muted_row = row(conn, token_a, conversation_id)
    assert muted_row["preview"] == "Hello"
    assert muted_row["unread_count"] == 1
    assert muted_row["notifications_muted"] == true
    assert muted_row["plan_projection"]["place"] == "Fort Oak"

    conn =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/conversations/#{conversation_id}/read", %{})

    assert json_response(conn, 200)["unread_count"] == 0

    assert_receive %Phoenix.Socket.Broadcast{
                     topic: "user:" <> ^user_b,
                     event: "inbox:read",
                     payload: %{"peer_visible" => true, "reader_user_id" => ^user_a}
                   },
                   1_000

    conn =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/conversations/#{conversation_id}/notifications", %{"muted" => false})

    assert json_response(conn, 200)["notifications_muted"] == false
    assert row(conn, token_a, conversation_id)["notifications_muted"] == false

    _ =
      build_conn()
      |> auth(token_b)
      |> post("/api/v1/product/conversations/#{conversation_id}/messages", %{
        "body" => "Hello again",
        "client_message_id" => "mute-hello-again"
      })
      |> json_response(201)

    assert_receive %Phoenix.Socket.Broadcast{
                     topic: "user:" <> ^user_a,
                     event: "inbox:message",
                     payload: resumed
                   },
                   1_000

    assert resumed["preview"] == "Hello again"
    assert resumed["unread_count"] == 1
    assert resumed["in_app"] == true
  end
end
