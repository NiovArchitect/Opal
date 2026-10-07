defmodule OpalCoreWeb.TwilioWebhookTest do
  use OpalCoreWeb.ConnCase, async: false

  setup do
    previous = System.get_env("OPAL_TWILIO_AUTH_TOKEN")
    System.delete_env("OPAL_TWILIO_AUTH_TOKEN")
    System.delete_env("TWILIO_AUTH_TOKEN")

    on_exit(fn ->
      if previous, do: System.put_env("OPAL_TWILIO_AUTH_TOKEN", previous)
    end)

    :ok
  end

  test "unsigned request without probe is 401", %{conn: conn} do
    conn = post(conn, "/webhooks/twilio/verify", %{"Status" => "delivered"})
    assert conn.status == 401
  end

  test "OpalProbe without auth token is 200", %{conn: conn} do
    conn = post(conn, "/webhooks/twilio/verify", %{"OpalProbe" => "1", "Status" => "delivered"})
    assert conn.status == 200
  end

  test "valid signature with auth token is 200", %{conn: conn} do
    token = "unit_test_twilio_token"
    System.put_env("OPAL_TWILIO_AUTH_TOKEN", token)
    Application.put_env(:opal_core, :public_base_url, "http://www.example.com")
    Application.put_env(:opal_core, :public_base_mode, :tunnel)

    params = %{"Status" => "delivered", "To" => "+15550001111"}
    url = "http://www.example.com/webhooks/twilio/verify"

    data =
      params
      |> Enum.sort_by(fn {k, _} -> to_string(k) end)
      |> Enum.reduce(url, fn {k, v}, acc -> acc <> to_string(k) <> to_string(v) end)

    sig = :crypto.mac(:hmac, :sha, token, data) |> Base.encode64()

    conn =
      conn
      |> put_req_header("x-twilio-signature", sig)
      |> post("/webhooks/twilio/verify", params)

    assert conn.status == 200
  end
end
