defmodule OpalCoreWeb.InvitationSmsDeliveryTest do
  use OpalCoreWeb.ConnCase

  alias OpalCore.FixturesHelper
  alias OpalCore.SocialFlow.Sms.TwilioSmsAdapter

  @alex "+12025550101"
  @jordan "+12025550102"

  setup do
    FixturesHelper.seed!()

    prev = Application.get_env(:opal_core, :sms_http_client)

    on_exit(fn ->
      if prev,
        do: Application.put_env(:opal_core, :sms_http_client, prev),
        else: Application.delete_env(:opal_core, :sms_http_client)

      System.delete_env("OPAL_TWILIO_ACCOUNT_SID")
      System.delete_env("OPAL_TWILIO_AUTH_TOKEN")
      System.delete_env("OPAL_TWILIO_FROM_NUMBER")
      System.delete_env("OPAL_TWILIO_MESSAGING_SERVICE_SID")
      System.delete_env("OPAL_PUBLIC_WEB_URL")
    end)

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

    %{"challenge" => %{"id" => challenge_id}, "development_code" => code} =
      json_response(conn, 201)

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
    {body["session"]["access_token"], body["user"]["id"]}
  end

  defp auth(conn, token), do: put_req_header(conn, "authorization", "Bearer #{token}")

  defp clear_sms_env do
    System.delete_env("OPAL_TWILIO_ACCOUNT_SID")
    System.delete_env("OPAL_TWILIO_AUTH_TOKEN")
    System.delete_env("OPAL_TWILIO_FROM_NUMBER")
    System.delete_env("OPAL_TWILIO_MESSAGING_SERVICE_SID")
  end

  defp enable_sms_env do
    System.put_env("OPAL_TWILIO_ACCOUNT_SID", "ACtest")
    System.put_env("OPAL_TWILIO_AUTH_TOKEN", "token")
    System.put_env("OPAL_TWILIO_FROM_NUMBER", "+15551234567")
    System.put_env("OPAL_PUBLIC_WEB_URL", "https://opal.example")
  end

  test "adapter stays disabled when From unset — honest delivery", %{conn: conn} do
    clear_sms_env()
    assert TwilioSmsAdapter.readiness() == {:disabled, :account_creds_missing}

    {token_a, _} = activate(conn, @alex, "Alex Reed", "alex_sms_off")

    conn =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/invitations", %{
        "phone" => @jordan,
        "label" => "Jordan",
        "message" => "Dinner?",
        "idempotency_key" => "inv-sms-off-#{System.unique_integer([:positive])}"
      })

    body = json_response(conn, 201)
    delivery = body["delivery"]

    assert delivery["sms_sent"] == false
    assert delivery["sms_adapter"] == "disabled"
    assert delivery["honest_no_production_sms"] == true
    assert is_binary(delivery["sms_disabled_reason"])
    assert body["product_delivery_label"] == "invite_ready"
    assert delivery["labels"]["invite_ready"] == true
    assert delivery["labels"]["sent"] == false
  end

  test "adapter disabled when account set but From missing", %{conn: conn} do
    System.put_env("OPAL_TWILIO_ACCOUNT_SID", "ACtest")
    System.put_env("OPAL_TWILIO_AUTH_TOKEN", "token")
    System.delete_env("OPAL_TWILIO_FROM_NUMBER")
    System.delete_env("OPAL_TWILIO_MESSAGING_SERVICE_SID")

    assert TwilioSmsAdapter.readiness() == {:disabled, :from_or_messaging_service_missing}

    {token_a, _} = activate(conn, @alex, "Alex Reed", "alex_sms_nofrom")

    conn =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/invitations", %{
        "phone" => @jordan,
        "label" => "Jordan",
        "idempotency_key" => "inv-sms-nofrom-#{System.unique_integer([:positive])}"
      })

    delivery = json_response(conn, 201)["delivery"]
    assert delivery["sms_adapter"] == "disabled"
    assert delivery["sms_disabled_reason"] == "from_or_messaging_service_missing"
    assert delivery["sms_sent"] == false
  end

  test "when configured, mock send succeeds with body format and SID", %{conn: conn} do
    enable_sms_env()
    parent = self()

    Application.put_env(:opal_core, :sms_http_client, fn _method, _url, body, _headers ->
      send(parent, {:invite_sms, body})
      {:ok, %{"sid" => "SMinvite99"}}
    end)

    {token_a, _} = activate(conn, @alex, "Alex Reed", "alex_sms_on")

    conn =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/invitations", %{
        "phone" => @jordan,
        "label" => "Jordan",
        "inviter_display_name" => "Alex Reed",
        "idempotency_key" => "inv-sms-on-#{System.unique_integer([:positive])}"
      })

    body = json_response(conn, 201)
    delivery = body["delivery"]

    assert delivery["sms_sent"] == true
    assert delivery["sms_adapter"] == "twilio"
    assert delivery["sms_provider_sid"] == "SMinvite99"
    assert delivery["honest_no_production_sms"] == false
    assert body["product_delivery_label"] == "sent"
    assert delivery["labels"]["sent"] == true

    assert_receive {:invite_sms, encoded}
    decoded = URI.decode_query(encoded)
    sms_body = decoded["Body"]
    assert sms_body =~ "Alex Reed invited you to Opal —"
    assert sms_body =~ "https://opal.example/?invite="
    assert sms_body =~ "Reply STOP to opt out"
  end

  test "Twilio provider error is reported honestly — no fake success", %{conn: conn} do
    enable_sms_env()

    Application.put_env(:opal_core, :sms_http_client, fn _method, _url, _body, _headers ->
      {:error, {:twilio, 21606, "The From phone number is not a valid, SMS-capable inbound phone number"}}
    end)

    {token_a, _} = activate(conn, @alex, "Alex Reed", "alex_sms_err")

    conn =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/invitations", %{
        "phone" => @jordan,
        "label" => "Jordan",
        "idempotency_key" => "inv-sms-err-#{System.unique_integer([:positive])}"
      })

    body = json_response(conn, 201)
    delivery = body["delivery"]

    assert delivery["sms_sent"] == false
    assert delivery["sms_adapter"] == "twilio"
    assert delivery["sms_error_code"] == 21606
    assert delivery["sms_error_message"] =~ "SMS-capable"
    assert delivery["honest_no_production_sms"] == true
    assert delivery["labels"]["could_not_send"] == true
    assert body["product_delivery_label"] == "could_not_send"
    # Share link still ready — invitations are not blocked by SMS failure.
    assert delivery["share_link_ready"] == true
  end

  test "no phone provided skips SMS without enabling adapter fiction", %{conn: conn} do
    enable_sms_env()

    Application.put_env(:opal_core, :sms_http_client, fn _, _, _, _ ->
      flunk("SMS must not be called without inviter-provided phone")
    end)

    {token_a, _} = activate(conn, @alex, "Alex Reed", "alex_sms_nophone")
    {_, user_b} = activate(build_conn(), @jordan, "Jordan Lee", "jordan_sms_nophone")

    conn =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/invitations", %{
        "recipient_user_id" => user_b,
        "label" => "Jordan",
        "idempotency_key" => "inv-sms-nophone-#{System.unique_integer([:positive])}"
      })

    delivery = json_response(conn, 201)["delivery"]
    assert delivery["sms_sent"] == false
    assert delivery["sms_skipped"] == "no_phone_provided"
  end

  test "idempotent replay does not re-send SMS", %{conn: conn} do
    enable_sms_env()
    key = "inv-sms-idem-#{System.unique_integer([:positive])}"
    parent = self()

    Application.put_env(:opal_core, :sms_http_client, fn _method, _url, body, _headers ->
      send(parent, {:invite_sms, body})
      {:ok, %{"sid" => "SMidem1"}}
    end)

    {token_a, _} = activate(conn, @alex, "Alex Reed", "alex_sms_idem")

    conn1 =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/invitations", %{
        "phone" => @jordan,
        "label" => "Jordan",
        "idempotency_key" => key
      })

    assert json_response(conn1, 201)["delivery"]["sms_sent"] == true
    assert_receive {:invite_sms, _}

    conn2 =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/invitations", %{
        "phone" => @jordan,
        "label" => "Jordan",
        "idempotency_key" => key
      })

    delivery2 = json_response(conn2, 200)["delivery"]
    assert delivery2["sms_sent"] == false
    assert delivery2["sms_skipped"] == "idempotent_replay"
    refute_receive {:invite_sms, _}, 50
  end
end
