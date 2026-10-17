defmodule OpalCore.Repair18ThrottleFairnessTest do
  @moduledoc """
  Repair #18 (Division A, F18-02) - spam-throttle fairness at the
  Messages boundary.

  The founder's first "change dinner to 8pm" was 429-rolled-back by the
  spam throttle during normal use: the bucket was scoped per user
  across ALL conversations, and the throttles ran before the
  client_message_id idempotency check. These tests pin the fixes:
  - a normal single send in a fresh thread never throttles, even after
    heavy sending in another thread
  - a genuine burst into one non-contact thread still throttles
  - re-sending an already-stored message returns it idempotently and
    consumes no throttle budget, even with the bucket exhausted
  """
  use OpalCore.DataCase, async: false

  alias OpalCore.Accounts.User
  alias OpalCore.Messages
  alias OpalCore.Repo

  defp insert_user!(name) do
    n = System.unique_integer([:positive])

    %User{}
    |> User.changeset(%{
      display_name: name,
      handle: "r18-throttle-#{String.downcase(name)}-#{n}"
    })
    |> Repo.insert!()
  end

  setup do
    a = insert_user!("Sender")
    b = insert_user!("PeerB")
    c = insert_user!("PeerC")
    %{a: a, b: b, c: c}
  end

  defp send!(conversation_id, sender_id, client_id, body) do
    Messages.accept_message(%{
      conversation_id: conversation_id,
      sender_user_id: sender_id,
      client_message_id: client_id,
      message_type: "text",
      body: body
    })
  end

  test "fresh thread never throttles on its first sends; a burst in one thread still does",
       %{a: a, b: b, c: c} do
    {:ok, conv_b} = Messages.ensure_direct_conversation(a.id, b.id)
    {:ok, conv_c} = Messages.ensure_direct_conversation(a.id, c.id)

    # Ten sends to one non-contact thread pass (the per-thread cap).
    for i <- 1..10 do
      assert {:ok, _msg, :created} =
               send!(conv_b.conversation_id, a.id, "tb-#{i}", "burst #{i}")
    end

    # The eleventh in the SAME thread is genuine spam-shaped: throttled.
    assert {:error, :rate_limited} =
             send!(conv_b.conversation_id, a.id, "tb-11", "one too many")

    # But the user's first message in a DIFFERENT fresh thread is normal
    # use, not spam - the old global bucket throttled exactly this.
    assert {:ok, _msg, :created} =
             send!(conv_c.conversation_id, a.id, "tc-1", "Let's change dinner to 8pm")

    assert {:ok, _msg, :created} = send!(conv_c.conversation_id, a.id, "tc-2", "thanks")
  end

  test "re-send of an already-stored message is idempotent even with the bucket exhausted",
       %{a: a, b: b} do
    {:ok, conv} = Messages.ensure_direct_conversation(a.id, b.id)

    assert {:ok, first, :created} =
             send!(conv.conversation_id, a.id, "keep-1", "Let's change dinner to 8pm")

    for i <- 2..10 do
      assert {:ok, _msg, :created} = send!(conv.conversation_id, a.id, "keep-#{i}", "more #{i}")
    end

    # Bucket for this thread is now exhausted for new sends...
    assert {:error, :rate_limited} = send!(conv.conversation_id, a.id, "keep-11", "new words")

    # ...but the client retrying the message it already stored (e.g.
    # after a flaky connection) gets it back instead of a 429 that
    # silently eats the user's words.
    assert {:ok, again, :idempotent} =
             send!(conv.conversation_id, a.id, "keep-1", "Let's change dinner to 8pm")

    assert again.id == first.id
  end
end

defmodule OpalCoreWeb.Repair18ThrottleShapeTest do
  @moduledoc """
  Repair #18 (Division A, F18-02) - the throttled-send API response is
  explicit and distinguishable: 429 with "sent" => false,
  "retryable" => true, "client_action" => "retry_send", so the client
  can surface "not sent, tap to retry" instead of dropping the words.
  """
  use OpalCoreWeb.ConnCase, async: false

  alias OpalCore.FixturesHelper
  alias OpalCore.SocialFlow.PhoneVerification.Provider

  @alex "+12025550101"
  @jordan "+12025550102"

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
        "idempotency_key" => "r18t-ch-#{handle}-#{System.unique_integer([:positive])}"
      })

    body = json_response(conn, 201)

    conn =
      post(conn, "/api/v1/product/activation/verify", %{
        "challenge_id" => body["challenge"]["id"],
        "code" => body["development_code"],
        "phone" => phone,
        "display_name" => name,
        "device_label" => "#{handle}-web",
        "handle_hint" => handle,
        "platform" => "web",
        "include_bearer" => true
      })

    body = json_response(conn, 200)
    assert Provider.synthetic_mode?()
    {body["session"]["access_token"], body["user"]["id"]}
  end

  defp auth(conn, token), do: put_req_header(conn, "authorization", "Bearer #{token}")

  test "throttled message POST returns the explicit not-sent retryable shape", %{conn: conn} do
    {token_a, _user_a} = activate(conn, @alex, "R18 TA", "r18_ta")
    {_token_b, user_b} = activate(build_conn(), @jordan, "R18 TB", "r18_tb")

    conn =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/conversations/direct", %{"peer_user_id" => user_b})

    direct = json_response(conn, 201)
    conversation_id = direct["conversation_id"] || get_in(direct, ["conversation", "id"])
    assert is_binary(conversation_id)

    # Ten sends pass; the eleventh bursts past the per-thread spam cap.
    for i <- 1..10 do
      conn =
        build_conn()
        |> auth(token_a)
        |> post("/api/v1/product/conversations/#{conversation_id}/messages", %{
          "body" => "message #{i}",
          "client_message_id" => "r18t-#{i}"
        })

      assert json_response(conn, 201)
    end

    conn =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/conversations/#{conversation_id}/messages", %{
        "body" => "Let's change dinner to 8pm",
        "client_message_id" => "r18t-11"
      })

    body = json_response(conn, 429)
    assert body["error_code"] == "rate_limited"
    assert body["sent"] == false
    assert body["retryable"] == true
    assert body["client_action"] == "retry_send"
    assert body["message"] =~ "was not sent"
    assert get_resp_header(conn, "retry-after") != []
  end
end
