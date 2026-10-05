defmodule OpalCoreWeb.OpalConversationApiTest do
  use OpalCoreWeb.ConnCase

  alias OpalCore.FixturesHelper
  alias OpalCore.OpalConversations.OpalMessage
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
        "idempotency_key" => "oc1-ch-#{handle}-#{System.unique_integer([:positive])}"
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

  test "GET creates then returns existing; POST validates; auth 404; messages asc", %{conn: conn} do
    {tok_a, _user_a} = activate(conn, @alex, "OC1 A", "oc1_a")
    {tok_b, _user_b} = activate(build_conn(), @jordan, "OC1 B", "oc1_b")

    # First GET creates empty conversation
    conn = build_conn() |> auth(tok_a) |> get("/api/v1/product/opal/conversation")
    body1 = json_response(conn, 200)
    id1 = body1["conversation"]["id"]
    assert is_binary(id1)
    assert body1["conversation"]["messages"] == []

    # Second GET returns same
    conn = build_conn() |> auth(tok_a) |> get("/api/v1/product/opal/conversation")
    body2 = json_response(conn, 200)
    assert body2["conversation"]["id"] == id1

    # POST empty → 422
    conn =
      build_conn()
      |> auth(tok_a)
      |> post("/api/v1/product/opal/conversation/messages", %{"body" => "  "})

    assert json_response(conn, 422)["error_code"] == "invalid"

    # POST >2000 → 422
    conn =
      build_conn()
      |> auth(tok_a)
      |> post("/api/v1/product/opal/conversation/messages", %{
        "body" => String.duplicate("x", 2001)
      })

    assert json_response(conn, 422)["error_code"] == "invalid"

    # POST ok → 201 with user + OC-4 generated reply
    conn =
      build_conn()
      |> auth(tok_a)
      |> post("/api/v1/product/opal/conversation/messages", %{"body" => "hello"})

    created = json_response(conn, 201)
    assert length(created["messages"]) == 2
    assert Enum.at(created["messages"], 0)["role"] == "user"
    assert Enum.at(created["messages"], 0)["body"] == "hello"
    assert Enum.at(created["messages"], 1)["role"] == "opal"
    opal_body = Enum.at(created["messages"], 1)["body"]
    assert is_binary(opal_body) and opal_body != ""
    assert opal_body != OpalMessage.oc1_placeholder_body()
    assert is_map(Enum.at(created["messages"], 1)["metadata"])
    assert is_binary(Enum.at(created["messages"], 1)["metadata"]["generated_at"])

    # History asc
    conn = build_conn() |> auth(tok_a) |> get("/api/v1/product/opal/conversation")
    hist = json_response(conn, 200)["conversation"]["messages"]
    assert length(hist) == 2
    assert Enum.map(hist, & &1["role"]) == ["user", "opal"]

    # B posting to A's conversation_id → 404
    conn =
      build_conn()
      |> auth(tok_b)
      |> post("/api/v1/product/opal/conversation/messages", %{
        "body" => "sneak",
        "conversation_id" => id1
      })

    assert json_response(conn, 404)["error_code"] == "not_found"

    # B GET is their own empty (or new) conversation — never A's messages
    conn = build_conn() |> auth(tok_b) |> get("/api/v1/product/opal/conversation")
    b_body = json_response(conn, 200)
    assert b_body["conversation"]["id"] != id1
    assert b_body["conversation"]["messages"] == []
  end
end
