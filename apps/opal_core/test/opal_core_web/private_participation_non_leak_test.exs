defmodule OpalCoreWeb.PrivateParticipationNonLeakTest do
  @moduledoc """
  Phoenix gate: private alignment answers never leak to peers.

  Proves:
  - HTTP response is shared-safe only
  - peer message history has no private response keys / reasons
  - socket broadcast (if any) is shared-safe only
  - non-member cannot post private participation
  """

  use OpalCoreWeb.ConnCase

  alias OpalCore.FixturesHelper
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.{AlignmentParticipation, PrivateParticipation}
  alias OpalCore.Messaging.Message
  @endpoint OpalCoreWeb.Endpoint

  @alex "+12025550111"
  @jordan "+12025550112"
  @outsider "+12025550113"

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

    assert %{
             "challenge" => %{"id" => challenge_id},
             "development_code" => code
           } = json_response(conn, 201)

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

  defp auth(conn, token) do
    put_req_header(conn, "authorization", "Bearer #{token}")
  end

  defp establish_pair(conn) do
    {token_a, user_a} = activate(conn, @alex, "Alex NonLeak", "alex_nl")
    {token_b, user_b} = activate(conn, @jordan, "Jordan NonLeak", "jordan_nl")

    conn =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/invitations", %{
        "phone" => @jordan,
        "label" => "Jordan",
        "message" => "Study this week?",
        "idempotency_key" => "inv-nl-#{System.unique_integer([:positive])}"
      })

    inv_id = json_response(conn, 201)["invitation"]["id"]

    conn =
      build_conn()
      |> auth(token_b)
      |> post("/api/v1/product/invitations/#{inv_id}/accept", %{})

    conversation_id = json_response(conn, 200)["establishment"]["conversation_id"]
    assert is_binary(conversation_id)

    %{
      token_a: token_a,
      token_b: token_b,
      user_a: user_a,
      user_b: user_b,
      conversation_id: conversation_id
    }
  end

  test "private participation HTTP body is shared-safe only", %{conn: conn} do
    %{token_a: token_a, user_a: user_a, conversation_id: conv} = establish_pair(conn)

    conn =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/conversations/#{conv}/alignment/private", %{
        "response_key" => "need_another_time",
        "proposal_key" => "study-1"
      })

    body = json_response(conn, 200)
    PrivateParticipation.assert_shared_safe!(body)
    PrivateParticipation.assert_shared_safe!(body["shared_safe"])

    refute Map.has_key?(body, "response_key")
    refute Map.has_key?(body, "user_id")
    refute body["shared_safe"]["label"] =~ user_a
    assert body["shared_safe"]["label"] == "One person needs another time."
    assert body["private_reason_hidden"] == true
    assert body["not_in_message_history"] == true
  end

  test "peer message history and signals never contain private answer keys", %{conn: conn} do
    %{token_a: token_a, token_b: token_b, user_a: user_a, conversation_id: conv} =
      establish_pair(conn)

    # Human messages first
    build_conn()
    |> auth(token_a)
    |> post("/api/v1/product/conversations/#{conv}/messages", %{
      "body" => "We should study Thursday.",
      "client_message_id" => "nl-msg-a-1"
    })
    |> json_response(201)

    # Private answer from A — not a chat message
    build_conn()
    |> auth(token_a)
    |> post("/api/v1/product/conversations/#{conv}/alignment/private", %{
      "response_key" => "need_another_time",
      "proposal_key" => "study-1"
    })
    |> json_response(200)

    # Peer B reads history
    conn =
      build_conn()
      |> auth(token_b)
      |> get("/api/v1/product/conversations/#{conv}/messages")

    body = json_response(conn, 200)
    encoded = Jason.encode!(body)

    # Private response keys and reasons must not appear in peer history payload.
    # Legitimate human messages may still show sender_user_id (not a private-answer leak).
    refute encoded =~ "need_another_time"
    refute encoded =~ "response_key"
    refute encoded =~ "private_reason"
    refute Enum.any?(body["messages"], fn m ->
             String.contains?(m["body"] || "", "need_another_time")
           end)

    _ = user_a

    # Authoritative store has the private row; peer API does not expose it.
    assert Repo.get_by(PrivateParticipation,
             conversation_id: conv,
             user_id: user_a,
             proposal_key: "study-1"
           )

    # No message rows with private response language
    messages = Repo.all(Message)
    refute Enum.any?(messages, fn m -> m.body != nil and String.contains?(m.body, "need_another_time") end)
  end

  test "Phoenix channel peer only receives shared-safe participation event", %{conn: conn} do
    %{token_a: token_a, token_b: token_b, user_a: user_a, user_b: user_b, conversation_id: conv} =
      establish_pair(conn)

    # PubSub subscribe is enough to assert broadcast shape without ChannelTest.connect/2 clash.
    :ok = @endpoint.subscribe("conversation:#{conv}")

    build_conn()
    |> auth(token_a)
    |> post("/api/v1/product/conversations/#{conv}/alignment/private", %{
      "response_key" => "not_this_time",
      "proposal_key" => "study-2"
    })
    |> json_response(200)

    assert_receive %Phoenix.Socket.Broadcast{
                     event: "alignment:participation",
                     payload: payload
                   },
                   1000

    PrivateParticipation.assert_shared_safe!(payload)
    PrivateParticipation.assert_shared_safe!(payload["shared_safe"])
    assert payload["shared_safe"]["label"] == "This may not work for everyone."
    refute Map.has_key?(payload, "response_key")
    refute Map.has_key?(payload, "user_id")
    refute inspect(payload) =~ user_a
    refute inspect(payload) =~ "not_this_time"
    _ = {token_b, user_b}
  end

  test "non-member cannot record private participation", %{conn: conn} do
    %{conversation_id: conv} = establish_pair(conn)
    {token_c, _} = activate(conn, @outsider, "Maya Outsider", "maya_nl")

    conn =
      build_conn()
      |> auth(token_c)
      |> post("/api/v1/product/conversations/#{conv}/alignment/private", %{
        "response_key" => "im_in"
      })

    assert json_response(conn, 403)["error_code"] == "not_a_member"
  end

  test "shared-safe projections cover all public keys without leak", _ do
    for {key, _} <- AlignmentParticipation.public_action_labels() do
      payload = AlignmentParticipation.shared_safe_projection(key)
      PrivateParticipation.assert_shared_safe!(payload)
      # Labels may use ordinary English ("privately"); raw response_key must not appear as identity.
      refute Map.has_key?(payload, "response_key")
      refute payload["label"] == key
    end
  end

end
