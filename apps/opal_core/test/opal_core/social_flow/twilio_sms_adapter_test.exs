defmodule OpalCore.SocialFlow.TwilioSmsAdapterTest do
  use ExUnit.Case, async: false

  alias OpalCore.SocialFlow.Sms.TwilioSmsAdapter

  setup do
    prev = Application.get_env(:opal_core, :sms_http_client)

    on_exit(fn ->
      if prev,
        do: Application.put_env(:opal_core, :sms_http_client, prev),
        else: Application.delete_env(:opal_core, :sms_http_client)

      System.delete_env("OPAL_TWILIO_ACCOUNT_SID")
      System.delete_env("OPAL_TWILIO_AUTH_TOKEN")
      System.delete_env("OPAL_TWILIO_FROM_NUMBER")
      System.delete_env("OPAL_TWILIO_MESSAGING_SERVICE_SID")
    end)

    :ok
  end

  defp put_account_creds do
    System.put_env("OPAL_TWILIO_ACCOUNT_SID", "ACtest")
    System.put_env("OPAL_TWILIO_AUTH_TOKEN", "token")
  end

  test "readiness disabled when account creds missing" do
    System.delete_env("OPAL_TWILIO_ACCOUNT_SID")
    System.delete_env("OPAL_TWILIO_AUTH_TOKEN")
    System.delete_env("OPAL_TWILIO_FROM_NUMBER")

    assert TwilioSmsAdapter.readiness() == {:disabled, :account_creds_missing}
    refute TwilioSmsAdapter.configured?()
  end

  test "readiness disabled when From and Messaging Service both unset" do
    put_account_creds()
    System.delete_env("OPAL_TWILIO_FROM_NUMBER")
    System.delete_env("OPAL_TWILIO_MESSAGING_SERVICE_SID")

    assert TwilioSmsAdapter.readiness() == {:disabled, :from_or_messaging_service_missing}
    refute TwilioSmsAdapter.configured?()
  end

  test "readiness ready when From number set" do
    put_account_creds()
    System.put_env("OPAL_TWILIO_FROM_NUMBER", "+15551234567")
    System.delete_env("OPAL_TWILIO_MESSAGING_SERVICE_SID")

    assert TwilioSmsAdapter.readiness() == :ready
    assert TwilioSmsAdapter.configured?()
  end

  test "readiness ready when Messaging Service SID set" do
    put_account_creds()
    System.delete_env("OPAL_TWILIO_FROM_NUMBER")
    System.put_env("OPAL_TWILIO_MESSAGING_SERVICE_SID", "MGtest")

    assert TwilioSmsAdapter.readiness() == :ready
  end

  test "send fails closed when not configured" do
    System.delete_env("OPAL_TWILIO_FROM_NUMBER")
    System.delete_env("OPAL_TWILIO_MESSAGING_SERVICE_SID")

    assert {:error, :provider_not_configured} =
             TwilioSmsAdapter.send("+15557654321", "hello")
  end

  test "mock success returns message sid and posts From+To+Body" do
    put_account_creds()
    System.put_env("OPAL_TWILIO_FROM_NUMBER", "+15551234567")

    parent = self()

    Application.put_env(:opal_core, :sms_http_client, fn method, url, body, headers ->
      send(parent, {:sms_http, method, url, body, headers})
      {:ok, %{"sid" => "SMabc123", "status" => "queued"}}
    end)

    assert {:ok, "SMabc123"} = TwilioSmsAdapter.send("+15557654321", "Jordan invited you to Opal")

    assert_receive {:sms_http, :post, url, body, headers}
    assert url =~ "/2010-04-01/Accounts/ACtest/Messages.json"
    assert body =~ "To=%2B15557654321" or body =~ "To=+15557654321"
    assert body =~ "From=%2B15551234567" or body =~ "From=+15551234567"
    assert body =~ "Body="
    assert Enum.any?(headers, fn {k, v} -> k == "authorization" and String.starts_with?(v, "Basic ") end)
  end

  test "mock uses MessagingServiceSid when set" do
    put_account_creds()
    System.delete_env("OPAL_TWILIO_FROM_NUMBER")
    System.put_env("OPAL_TWILIO_MESSAGING_SERVICE_SID", "MGtest")

    parent = self()

    Application.put_env(:opal_core, :sms_http_client, fn _method, _url, body, _headers ->
      send(parent, {:sms_body, body})
      {:ok, %{"sid" => "SMmsid1"}}
    end)

    assert {:ok, "SMmsid1"} = TwilioSmsAdapter.send("+15557654321", "hi")
    assert_receive {:sms_body, body}
    assert body =~ "MessagingServiceSid=MGtest"
    refute body =~ "From="
  end

  test "mock error path returns twilio code verbatim" do
    put_account_creds()
    System.put_env("OPAL_TWILIO_FROM_NUMBER", "+15551234567")

    Application.put_env(:opal_core, :sms_http_client, fn _method, _url, _body, _headers ->
      {:error, {:twilio, 21211, "Invalid 'To' Phone Number"}}
    end)

    assert {:error, {:twilio, 21211, "Invalid 'To' Phone Number"}} =
             TwilioSmsAdapter.send("+15550001111", "hi")
  end

  test "oversize body truncates to 1600 chars and never crashes" do
    put_account_creds()
    System.put_env("OPAL_TWILIO_FROM_NUMBER", "+15551234567")

    parent = self()
    huge = String.duplicate("a", 2500)

    Application.put_env(:opal_core, :sms_http_client, fn _method, _url, body, _headers ->
      send(parent, {:sms_body, body})
      {:ok, %{"sid" => "SMtrunc"}}
    end)

    assert {:ok, "SMtrunc"} = TwilioSmsAdapter.send("+15557654321", huge)
    assert_receive {:sms_body, encoded}
    decoded = URI.decode_query(encoded)
    assert String.length(decoded["Body"]) == 1600
  end

  test "invalid args return error" do
    put_account_creds()
    System.put_env("OPAL_TWILIO_FROM_NUMBER", "+15551234567")

    assert {:error, :invalid} = TwilioSmsAdapter.send(nil, "hi")
    assert {:error, :invalid} = TwilioSmsAdapter.send("+15557654321", nil)
  end
end
