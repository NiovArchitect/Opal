defmodule OpalCoreWeb.R23FollowApiTest do
  @moduledoc """
  Repair #23 close battery (coordinator-owned) - the follow leg's
  two-account API read-back that WS-23-4 declared for the close:
  POST /follows -> GET /follows/status read-back (one-way truth) ->
  GET /follows list -> DELETE -> status re-read false. The model's
  honesty fields ride every response: follow_is_not_friend,
  grants_friend_visibility = false.
  """
  use OpalCoreWeb.ConnCase, async: false

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

  defp activate(conn, name, handle) do
    uniq = rem(System.unique_integer([:positive]), 9000) + 1000
    phone = "+1202555#{uniq}"

    conn =
      post(conn, "/api/v1/product/activation/challenges", %{
        "otp_consent_accepted" => true,
        "phone" => phone,
        "device_label" => "#{handle}-web",
        "idempotency_key" => "r23f-ch-#{handle}-#{System.unique_integer([:positive])}"
      })

    body = json_response(conn, 201)

    conn =
      post(conn, "/api/v1/product/activation/verify", %{
        "challenge_id" => body["challenge"]["id"],
        "code" => body["development_code"],
        "phone" => phone,
        "display_name" => name,
        "device_label" => "#{handle}-web",
        "handle_hint" => "#{handle}#{uniq}",
        "platform" => "web",
        "include_bearer" => true
      })

    body = json_response(conn, 200)
    {body["session"]["access_token"], body["user"]["id"]}
  end

  defp auth(conn, token), do: put_req_header(conn, "authorization", "Bearer #{token}")

  defp call(token, method, path, params \\ %{}) do
    conn = build_conn() |> auth(token)

    case method do
      :get -> get(conn, path)
      :post -> post(conn, path, params)
      :delete -> delete(conn, path)
    end
  end

  test "follow over HTTP: status, follow, one-way read-back, list, unfollow", %{conn: conn} do
    {tok_a, _a_id} = activate(conn, "R23 Fern", "r23_fern")
    {tok_b, b_id} = activate(build_conn(), "R23 Gale", "r23_gale")

    # Before: not following, and the model's honesty fields ride along.
    before_status =
      call(tok_a, :get, "/api/v1/product/follows/status?creator_user_id=#{b_id}")
      |> json_response(200)

    assert before_status["following"] == false
    assert before_status["follow_is_not_friend"] == true
    assert before_status["grants_friend_visibility"] == false

    # Follow: created.
    created =
      call(tok_a, :post, "/api/v1/product/follows", %{"creator_user_id" => b_id})
      |> json_response(201)

    assert created["following"] == true

    # Read-back: A follows B; B does NOT follow A (one-way truth).
    a_status =
      call(tok_a, :get, "/api/v1/product/follows/status?creator_user_id=#{b_id}")
      |> json_response(200)

    assert a_status["following"] == true

    b_status =
      call(tok_b, :get, "/api/v1/product/follows/status?creator_user_id=#{a_status["follower_user_id"]}")
      |> json_response(200)

    assert b_status["following"] == false

    # The list carries B.
    list = call(tok_a, :get, "/api/v1/product/follows") |> json_response(200)
    assert b_id in list["following_user_ids"]
    assert list["grants_friend_visibility"] == false

    # Unfollow, then the status re-reads false.
    deleted = call(tok_a, :delete, "/api/v1/product/follows/#{b_id}") |> json_response(200)
    assert deleted["following"] == false

    after_status =
      call(tok_a, :get, "/api/v1/product/follows/status?creator_user_id=#{b_id}")
      |> json_response(200)

    assert after_status["following"] == false
  end
end
