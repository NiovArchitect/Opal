defmodule OpalCoreWeb.PeopleProjectionApiTest do
  @moduledoc """
  Repair #20 pins at the HTTP seam:

    * F-6 — GET /people/projection: one row per person identity
      across all sources; distinct same-name accounts stay two rows.
    * F-8a — the projection orders most-talked-to first.
    * F-8b — POST /conversations/by-phone: a typed number starts or
      finds the real direct conversation; unknown numbers are an
      honest 404; malformed numbers a 422.
  """

  use OpalCoreWeb.ConnCase

  alias OpalCore.SocialFlow.PhoneVerification.Provider

  setup do
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
        "idempotency_key" => "r20p-ch-#{handle}-#{System.unique_integer([:positive])}"
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

  defp ensure_direct(conn, token, peer_id) do
    conn
    |> auth(token)
    |> post("/api/v1/product/conversations/direct", %{"peer_user_id" => peer_id})
    |> json_response(201)
  end

  test "F-6: one identity across conversation + relationship sources projects once; same-name distinct account stays separate",
       %{conn: conn} do
    {tok_a, _a} = activate(conn, "+12025550101", "Ethan Walker", "r20ethan")
    {_tok_b, b_id} = activate(conn, "+12025550102", "Maya Torres", "r20maya1")
    {_tok_c, c_id} = activate(conn, "+12025550103", "Maya Torres", "r20maya2")

    ensure_direct(conn, tok_a, b_id)
    ensure_direct(conn, tok_a, c_id)

    # The relationship source names the SAME identity (b) again.
    conn
    |> auth(tok_a)
    |> put("/api/v1/product/relationships/#{b_id}", %{"type" => "close_friend"})
    |> json_response(200)

    body =
      conn
      |> auth(tok_a)
      |> get("/api/v1/product/people/projection")
      |> json_response(200)

    mayas = Enum.filter(body["people"], fn p -> p["display_name"] == "Maya Torres" end)
    assert length(mayas) == 2
    assert Enum.sort(Enum.map(mayas, fn p -> p["id"] end)) == Enum.sort([b_id, c_id])

    b_row = Enum.find(mayas, fn p -> p["id"] == b_id end)
    assert b_row["relationship_type"] == "close_friend"
    assert b_row["account_backed"] == true
    assert is_binary(b_row["conversation_id"])

    c_row = Enum.find(mayas, fn p -> p["id"] == c_id end)
    assert c_row["relationship_type"] == nil
  end

  test "F-8a: projection orders most-talked-to first from real messages", %{conn: conn} do
    {tok_a, _a} = activate(conn, "+12025550101", "Ethan Walker", "r20ethan8")
    {_tok_b, b_id} = activate(conn, "+12025550102", "Aaron Aardvark", "r20aaron")
    {_tok_c, c_id} = activate(conn, "+12025550103", "Zoe Zephyr", "r20zoe")

    conv_b = ensure_direct(conn, tok_a, b_id)
    conv_c = ensure_direct(conn, tok_a, c_id)

    # Talk to Aaron first, then Zoe — Zoe is the most recent.
    conn
    |> auth(tok_a)
    |> post("/api/v1/product/conversations/#{conv_b["conversation_id"]}/messages", %{
      "body" => "morning",
      "client_message_id" => "r20p-m1-#{System.unique_integer([:positive])}"
    })
    |> json_response(201)

    conn
    |> auth(tok_a)
    |> post("/api/v1/product/conversations/#{conv_c["conversation_id"]}/messages", %{
      "body" => "later",
      "client_message_id" => "r20p-m2-#{System.unique_integer([:positive])}"
    })
    |> json_response(201)

    body =
      conn
      |> auth(tok_a)
      |> get("/api/v1/product/people/projection")
      |> json_response(200)

    names = Enum.map(body["people"], fn p -> p["display_name"] end)
    assert names == ["Zoe Zephyr", "Aaron Aardvark"]
  end

  test "F-8b: by-phone starts the real direct conversation, then finds the same one",
       %{conn: conn} do
    {tok_a, _a} = activate(conn, "+12025550101", "Ethan Walker", "r20ethanp")
    {_tok_b, b_id} = activate(conn, "+12025550102", "Maya Torres", "r20mayap")

    created =
      conn
      |> auth(tok_a)
      |> post("/api/v1/product/conversations/by-phone", %{"phone" => "202-555-0102"})
      |> json_response(201)

    assert is_binary(created["conversation_id"])
    assert created["peer"]["id"] == b_id
    assert created["peer"]["display_name"] == "Maya Torres"
    # The number itself is never echoed back.
    refute String.contains?(inspect(created), "2025550102")

    again =
      conn
      |> auth(tok_a)
      |> post("/api/v1/product/conversations/by-phone", %{"phone" => "+12025550102"})
      |> json_response(200)

    assert again["conversation_id"] == created["conversation_id"]
    assert again["origin"] == "existing"
  end

  test "F-8b: unknown number is an honest 404, malformed a 422, own number a 422",
       %{conn: conn} do
    {tok_a, _a} = activate(conn, "+12025550101", "Ethan Walker", "r20ethanx")

    body =
      conn
      |> auth(tok_a)
      |> post("/api/v1/product/conversations/by-phone", %{"phone" => "+12025559999"})
      |> json_response(404)

    assert body["error_code"] == "not_on_opal"

    body =
      conn
      |> auth(tok_a)
      |> post("/api/v1/product/conversations/by-phone", %{"phone" => "call me maybe"})
      |> json_response(422)

    assert body["error_code"] == "invalid_phone"

    body =
      conn
      |> auth(tok_a)
      |> post("/api/v1/product/conversations/by-phone", %{"phone" => "+12025550101"})
      |> json_response(422)

    assert body["error_code"] == "cannot_direct_self"
  end
end
