defmodule OpalCoreWeb.RealPeopleTwoUserSetJourneyTest do
  @moduledoc """
  Complete two-user activate → invite → message → Set journey through
  product HTTP session path, with Phoenix session connect + channel join proof.
  """

  use OpalCoreWeb.ConnCase

  # Same pattern as product_activation_test for product session sockets.
  require Phoenix.ChannelTest

  alias OpalCore.FixturesHelper
  alias OpalCore.SocialFlow.{AlignmentState, PrivateParticipation, ProductSignals}
  alias OpalCoreWeb.UserSocket
  alias OpalCore.Auth.ProductSession

  @endpoint OpalCoreWeb.Endpoint

  @phone_a "+12025550201"
  @phone_b "+12025550202"
  @phone_c "+12025550203"

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

    assert %{"challenge" => %{"id" => challenge_id}, "development_code" => code} =
             json_response(conn, 201)

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
    {body["session"]["access_token"], body["user"]["id"], body}
  end

  defp auth(conn, token), do: put_req_header(conn, "authorization", "Bearer #{token}")

  defp send_msg(token, conv_id, body, client_id) do
    build_conn()
    |> auth(token)
    |> post("/api/v1/product/conversations/#{conv_id}/messages", %{
      "body" => body,
      "client_message_id" => client_id
    })
    |> json_response(201)
  end

  defp history(token, conv_id) do
    build_conn()
    |> auth(token)
    |> get("/api/v1/product/conversations/#{conv_id}/messages")
    |> json_response(200)
  end

  test "two users complete message-to-Set with refresh, reconnect, isolation", %{conn: conn} do
    {token_a, user_a, _} = activate(conn, @phone_a, "Alex Study", "alex_set")
    {token_b, user_b, _} = activate(conn, @phone_b, "Jordan Study", "jordan_set")
    {token_c, user_c, _} = activate(conn, @phone_c, "Maya Outside", "maya_set")

    conn =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/invitations", %{
        "phone" => @phone_b,
        "label" => "Jordan",
        "message" => "Want to study this week?",
        "idempotency_key" => "inv-set-#{System.unique_integer([:positive])}"
      })

    inv = json_response(conn, 201)["invitation"]
    assert inv["id"]

    conn =
      build_conn()
      |> auth(token_b)
      |> post("/api/v1/product/invitations/#{inv["id"]}/accept", %{})

    accept = json_response(conn, 200)
    conversation_id = accept["establishment"]["conversation_id"]
    assert is_binary(conversation_id)

    {:ok, sock_a} =
      Phoenix.ChannelTest.connect(UserSocket, %{
        "session_token" => token_a,
        "device_id" => "web-a-set",
        "app_state" => "foreground",
        "client_version" => "rp-test"
      })

    {:ok, sock_b} =
      Phoenix.ChannelTest.connect(UserSocket, %{
        "session_token" => token_b,
        "device_id" => "web-b-set",
        "app_state" => "foreground",
        "client_version" => "rp-test"
      })

    assert sock_a.assigns.user_id == user_a
    assert sock_b.assigns.user_id == user_b

    {:ok, _, _} =
      Phoenix.ChannelTest.subscribe_and_join(sock_a, "conversation:#{conversation_id}", %{})

    {:ok, _, _} =
      Phoenix.ChannelTest.subscribe_and_join(sock_b, "conversation:#{conversation_id}", %{})

    {:ok, sock_c} =
      Phoenix.ChannelTest.connect(UserSocket, %{
        "session_token" => token_c,
        "device_id" => "web-c-set",
        "app_state" => "foreground",
        "client_version" => "rp-test"
      })

    assert {:error, %{reason: "unauthorized"}} =
             Phoenix.ChannelTest.subscribe_and_join(
               sock_c,
               "conversation:#{conversation_id}",
               %{}
             )

    msg1 = send_msg(token_a, conversation_id, "We should study together this week.", "cm-set-a-1")
    assert msg1["message"]["server_seq"] == 1
    assert Enum.any?(msg1["signals"], &(&1["lifecycle_stage"] == "plan_forming"))
    assert Enum.any?(msg1["signals"], &(&1["kind"] == "proposal"))

    proposal_id =
      msg1["signals"]
      |> Enum.map(& &1["proposal_id"])
      |> Enum.find(&(is_binary(&1) and &1 != ""))

    assert is_binary(proposal_id)

    hist_b1 = history(token_b, conversation_id)
    assert length(hist_b1["messages"]) == 1
    assert Enum.any?(hist_b1["signals"], &(&1["lifecycle_stage"] == "plan_forming"))

    msg2 = send_msg(token_b, conversation_id, "Wednesday works, but not too late.", "cm-set-b-1")
    assert msg2["message"]["server_seq"] == 2

    hist_a2 = history(token_a, conversation_id)
    assert Enum.any?(hist_a2["signals"], &(&1["lifecycle_stage"] == "still_open"))
    assert Enum.any?(hist_a2["signals"], &(&1["detail"] == "Wednesday at 5:30"))
    assert Enum.any?(hist_a2["signals"], &(&1["proposal_id"] == proposal_id))

    msg3 = send_msg(token_a, conversation_id, "I'm in", "cm-set-a-2")
    assert msg3["message"]["server_seq"] == 3
    assert Enum.any?(msg3["signals"], &(&1["lifecycle_stage"] == "still_open"))
    refute Enum.any?(msg3["signals"], &(&1["lifecycle_stage"] == "set"))

    msg4 = send_msg(token_b, conversation_id, "Works for me", "cm-set-b-2")
    assert msg4["message"]["server_seq"] == 4
    assert Enum.any?(msg4["signals"], &(&1["lifecycle_stage"] == "set"))
    refute Enum.any?(msg4["signals"], &(&1["label"] == "Set"))
    assert Enum.any?(msg4["signals"], &(&1["set_version"] == 1))
    assert Enum.any?(msg4["signals"], &(&1["proposal_id"] == proposal_id))

    for token <- [token_a, token_b] do
      h = history(token, conversation_id)
      assert Enum.any?(h["signals"], &(&1["lifecycle_stage"] == "set"))
      assert length(h["messages"]) == 4
      encoded = Jason.encode!(h)
      refute encoded =~ "response_key"
      refute encoded =~ "private_reason"
    end

    {:ok, sock_b2} =
      Phoenix.ChannelTest.connect(UserSocket, %{
        "session_token" => token_b,
        "device_id" => "web-b-set-re",
        "app_state" => "foreground",
        "client_version" => "rp-test"
      })

    {:ok, _, _} =
      Phoenix.ChannelTest.subscribe_and_join(sock_b2, "conversation:#{conversation_id}", %{})

    assert {:ok, signals_b} = ProductSignals.signals_for_conversation(conversation_id, user_b)
    assert Enum.any?(signals_b, &(&1["lifecycle_stage"] == "set"))

    conn =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/conversations/#{conversation_id}/messages", %{
        "body" => "I'm in",
        "client_message_id" => "cm-set-a-2"
      })

    dup = json_response(conn, conn.status)
    assert dup["message"]["server_seq"] == 3 or dup["origin"] == "idempotent"

    assert AlignmentState.set_gate_satisfied?(%{
             member_user_ids: [user_a, user_b],
             affirmative_user_ids: [user_a, user_b],
             plan_evidence?: true
           })

    conn =
      build_conn()
      |> auth(token_c)
      |> get("/api/v1/product/conversations/#{conversation_id}/messages")

    assert json_response(conn, 403)["error_code"] == "not_a_member"

    assert {:error, :not_a_member} =
             ProductSignals.signals_for_conversation(conversation_id, user_c)

    priv =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/conversations/#{conversation_id}/alignment/private", %{
        "response_key" => "maybe",
        "proposal_key" => proposal_id
      })
      |> json_response(200)

    PrivateParticipation.assert_shared_safe!(priv)
    refute Map.has_key?(priv, "response_key")

    build_conn()
    |> auth(token_a)
    |> delete("/api/v1/product/session")
    |> json_response(200)

    assert {:error, _} = ProductSession.authenticate(token_a)

    assert :error =
             Phoenix.ChannelTest.connect(UserSocket, %{
               "session_token" => token_a,
               "device_id" => "web-a-after-out",
               "app_state" => "foreground",
               "client_version" => "rp-test"
             })
  end
end
