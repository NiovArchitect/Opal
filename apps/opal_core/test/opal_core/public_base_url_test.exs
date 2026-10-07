defmodule OpalCore.PublicBaseUrlTest do
  use ExUnit.Case, async: false

  alias OpalCore.PublicBaseUrl
  alias OpalCoreWeb.TwilioWebhookController

  setup do
    previous_mode = Application.get_env(:opal_core, :public_base_mode)
    previous_url = Application.get_env(:opal_core, :public_base_url)

    on_exit(fn ->
      if is_nil(previous_mode),
        do: Application.delete_env(:opal_core, :public_base_mode),
        else: Application.put_env(:opal_core, :public_base_mode, previous_mode)

      if is_nil(previous_url),
        do: Application.delete_env(:opal_core, :public_base_url),
        else: Application.put_env(:opal_core, :public_base_url, previous_url)
    end)

    :ok
  end

  test "tunnel mode uses configured public_base_url" do
    Application.put_env(:opal_core, :public_base_mode, :tunnel)
    Application.put_env(:opal_core, :public_base_url, "https://demo.ngrok-free.app")
    assert PublicBaseUrl.base_url() == "https://demo.ngrok-free.app"
    assert PublicBaseUrl.url("/webhooks/twilio/verify") ==
             "https://demo.ngrok-free.app/webhooks/twilio/verify"
  end

  test "ngrok host patterns allowed" do
    assert PublicBaseUrl.ngrok_host_allowed?("abc.ngrok-free.app")
    assert PublicBaseUrl.ngrok_host_allowed?("abc.ngrok.io")
    assert PublicBaseUrl.ngrok_host_allowed?("abc.trycloudflare.com")
    refute PublicBaseUrl.ngrok_host_allowed?("evil.example.com")
  end

  test "invite share_url uses PublicBaseUrl" do
    Application.put_env(:opal_core, :public_base_mode, :tunnel)
    Application.put_env(:opal_core, :public_base_url, "https://demo.ngrok-free.app")
    url = OpalCore.Invites.share_url("TESTCODE1")
    assert String.starts_with?(url, "https://demo.ngrok-free.app/invite/")
    refute String.contains?(url, "opal.app/join")
  end

  test "Twilio signature validation accepts good HMAC and rejects bad" do
    token = "test_auth_token_secret"
    url = "https://demo.ngrok-free.app/webhooks/twilio/verify"
    params = %{"Status" => "delivered", "To" => "+15551212"}

    data =
      params
      |> Enum.sort_by(fn {k, _} -> to_string(k) end)
      |> Enum.reduce(url, fn {k, v}, acc -> acc <> to_string(k) <> to_string(v) end)

    good =
      :crypto.mac(:hmac, :sha, token, data)
      |> Base.encode64()

    assert TwilioWebhookController.valid_twilio_signature?(token, url, params, good)
    refute TwilioWebhookController.valid_twilio_signature?(token, url, params, "bad")
  end
end
