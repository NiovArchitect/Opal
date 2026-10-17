defmodule OpalCoreWeb.Repair13SinisterPlansApiTest do
  @moduledoc """
  Repair #13 — W2: permission probe at the HTTP layer.

  Two freshly activated accounts: the plans listing endpoint must return
  only the caller's plans — never another account's — over a real authed
  request.
  """

  use OpalCoreWeb.ConnCase, async: false

  alias OpalCore.SocialFlow

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
        "idempotency_key" => "w2-ch-#{handle}-#{System.unique_integer([:positive])}"
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
    {body["session"]["access_token"], body["user"]["id"]}
  end

  defp auth(conn, token), do: put_req_header(conn, "authorization", "Bearer #{token}")

  test "GET /api/v1/product/opal/plans never leaks another account's plans", %{conn: conn} do
    {tok_a, user_a} = activate(conn, "+12025559011", "W2 Alice", "w2_alice")
    {tok_b, user_b} = activate(build_conn(), "+12025559012", "W2 Bob", "w2_bob")

    {:ok, plan_a, _} =
      SocialFlow.create_tentative_plan_from_center(user_a, %{
        "title" => "Alice secret dinner",
        "time_label" => "Sat 7:30 PM"
      })

    {:ok, plan_b, _} =
      SocialFlow.create_tentative_plan_from_center(user_b, %{
        "title" => "Bob secret dinner",
        "time_label" => "Sun 6:00 PM"
      })

    conn_a = get(auth(build_conn(), tok_a), "/api/v1/product/opal/plans")
    body_a = json_response(conn_a, 200)
    ids_a = Enum.map(body_a["plans"], & &1["id"])
    assert plan_a.id in ids_a
    refute plan_b.id in ids_a
    assert Enum.all?(body_a["plans"], &(&1["title"] != "Bob secret dinner"))

    conn_b = get(auth(build_conn(), tok_b), "/api/v1/product/opal/plans")
    body_b = json_response(conn_b, 200)
    ids_b = Enum.map(body_b["plans"], & &1["id"])
    assert plan_b.id in ids_b
    refute plan_a.id in ids_b
    assert Enum.all?(body_b["plans"], &(&1["title"] != "Alice secret dinner"))
  end

  test "unauthenticated plans listing is rejected", %{conn: conn} do
    conn = get(conn, "/api/v1/product/opal/plans")
    assert conn.status in [401, 403]
  end
end
