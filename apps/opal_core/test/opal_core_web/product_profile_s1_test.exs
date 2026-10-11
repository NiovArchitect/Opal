defmodule OpalCoreWeb.ProductProfileS1Test do
  use OpalCoreWeb.ConnCase

  alias OpalCore.FixturesHelper

  @alex "+12025550101"
  @jordan "+12025550102"

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
    {body["session"]["access_token"], body["user"]}
  end

  test "S1 FR08 profile update persists display name and unique handle", %{conn: conn} do
    {token_a, user_a} = activate(conn, @alex, "You", "you_tmp_a")
    {_token_b, user_b} = activate(conn, @jordan, "Jordan", "jordan_s1")

    assert user_a["display_name"] == "You"
    # Fixture phones may already exist from seed — use the peer's actual handle.
    peer_handle = user_b["handle"]
    assert is_binary(peer_handle) and peer_handle != ""

    unique_handle = "sadeil_s1_#{System.unique_integer([:positive])}"

    conn =
      build_conn()
      |> put_req_header("authorization", "Bearer #{token_a}")
      |> patch("/api/v1/product/session/profile", %{
        "display_name" => "Sadeil",
        "handle" => unique_handle
      })

    body = json_response(conn, 200)
    assert body["profile_updated"] == true
    assert body["user"]["display_name"] == "Sadeil"
    assert body["user"]["handle"] == unique_handle

    conn =
      build_conn()
      |> put_req_header("authorization", "Bearer #{token_a}")
      |> get("/api/v1/product/session")

    me = json_response(conn, 200)
    assert me["user"]["display_name"] == "Sadeil"
    assert me["user"]["handle"] == unique_handle

    # Real uniqueness: cannot steal the other account's handle
    conn =
      build_conn()
      |> put_req_header("authorization", "Bearer #{token_a}")
      |> patch("/api/v1/product/session/profile", %{
        "display_name" => "Sadeil",
        "handle" => peer_handle
      })

    err = json_response(conn, 422)
    assert err["error_code"] == "handle_taken"
  end

  test "S1 profile requires display name", %{conn: conn} do
    {token, _} = activate(conn, @alex, "Alex", "alex_s1_req")

    conn =
      build_conn()
      |> put_req_header("authorization", "Bearer #{token}")
      |> patch("/api/v1/product/session/profile", %{
        "display_name" => "   "
      })

    err = json_response(conn, 422)
    assert err["error_code"] == "display_name_required"
  end
end
