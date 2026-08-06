defmodule OpalCore.SocialFlow.TwilioVerifyAdapterTest do
  use ExUnit.Case, async: false

  alias OpalCore.SocialFlow.PhoneVerification.TwilioVerifyAdapter

  setup do
    prev = Application.get_env(:opal_core, :phone_verify_http_client)

    on_exit(fn ->
      if prev,
        do: Application.put_env(:opal_core, :phone_verify_http_client, prev),
        else: Application.delete_env(:opal_core, :phone_verify_http_client)

      System.delete_env("OPAL_TWILIO_ACCOUNT_SID")
      System.delete_env("OPAL_TWILIO_AUTH_TOKEN")
      System.delete_env("OPAL_TWILIO_VERIFY_SERVICE_SID")
    end)

    :ok
  end

  test "missing configuration fails closed" do
    System.delete_env("OPAL_TWILIO_ACCOUNT_SID")

    assert {:error, :provider_not_configured} =
             TwilioVerifyAdapter.start_challenge("+15551234567", %{})
  end

  test "mock approved check_by_e164" do
    System.put_env("OPAL_TWILIO_ACCOUNT_SID", "ACtest")
    System.put_env("OPAL_TWILIO_AUTH_TOKEN", "token")
    System.put_env("OPAL_TWILIO_VERIFY_SERVICE_SID", "VAtest")

    Application.put_env(:opal_core, :phone_verify_http_client, fn _method,
                                                                  _url,
                                                                  _body,
                                                                  _headers ->
      {:ok, %{"status" => "approved", "sid" => "VEtest"}}
    end)

    assert :ok = TwilioVerifyAdapter.check_by_e164("+15551234567", "123456")
  end

  test "mock rejected code" do
    System.put_env("OPAL_TWILIO_ACCOUNT_SID", "ACtest")
    System.put_env("OPAL_TWILIO_AUTH_TOKEN", "token")
    System.put_env("OPAL_TWILIO_VERIFY_SERVICE_SID", "VAtest")

    Application.put_env(:opal_core, :phone_verify_http_client, fn _method,
                                                                  _url,
                                                                  _body,
                                                                  _headers ->
      {:ok, %{"status" => "pending"}}
    end)

    assert {:error, :invalid_code} = TwilioVerifyAdapter.check_by_e164("+15551234567", "000000")
  end

  test "mock provider error" do
    System.put_env("OPAL_TWILIO_ACCOUNT_SID", "ACtest")
    System.put_env("OPAL_TWILIO_AUTH_TOKEN", "token")
    System.put_env("OPAL_TWILIO_VERIFY_SERVICE_SID", "VAtest")

    Application.put_env(:opal_core, :phone_verify_http_client, fn _method,
                                                                  _url,
                                                                  _body,
                                                                  _headers ->
      {:error, :provider_error}
    end)

    assert {:error, :provider_error} = TwilioVerifyAdapter.start_challenge("+15551234567", %{})
  end

  test "mock start success" do
    System.put_env("OPAL_TWILIO_ACCOUNT_SID", "ACtest")
    System.put_env("OPAL_TWILIO_AUTH_TOKEN", "token")
    System.put_env("OPAL_TWILIO_VERIFY_SERVICE_SID", "VAtest")

    Application.put_env(:opal_core, :phone_verify_http_client, fn _method,
                                                                  _url,
                                                                  _body,
                                                                  _headers ->
      {:ok, %{"sid" => "VEabc", "status" => "pending"}}
    end)

    assert {:ok, result} = TwilioVerifyAdapter.start_challenge("+15551234567", %{})
    assert result.provider_reference == "VEabc"
    assert result.provider == "twilio_verify"
    refute Map.has_key?(result, :synthetic_code)
  end
end
