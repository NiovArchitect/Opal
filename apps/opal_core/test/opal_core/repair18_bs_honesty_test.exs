defmodule OpalCore.Repair18BsHonestyTest do
  @moduledoc """
  Repair #18 Phase 2 — blind-spot honesty fixes (BS-4, BS-5, BS-6/17).

  Failing-first: every test in this file asserted the HONEST behaviour
  while the dishonest code was still in place, and failed:

  - BS-4: DeepgramClient returned a canned transcript when unkeyed.
  - BS-5: Sentry.capture returned {:ok, :queued} with a DSN even though
    nothing is ever delivered (no SDK linked).
  - BS-6: APNs raised when credentials were present but no JWT fun.
  - BS-17: TwilioVerifyAdapter.check_challenge/3 always errored with
    :use_check_with_e164, even when the caller supplied the E.164.
  """
  use OpalCore.DataCase, async: false

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Intelligence.{AudioIngestor, CallTranscription, DeepgramClient}
  alias OpalCore.Messaging.{Conversation, ConversationMember, Message}
  alias OpalCore.Observability.Sentry
  alias OpalCore.Push.Adapters.APNS
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.PhoneVerification.TwilioVerifyAdapter

  @canned "Yes, let's lock in Juniper for Saturday."

  setup do
    env_keys = [
      "DEEPGRAM_API_KEY",
      "SENTRY_DSN",
      "OPAL_SENTRY_DSN",
      "OPAL_TWILIO_ACCOUNT_SID",
      "OPAL_TWILIO_AUTH_TOKEN",
      "OPAL_TWILIO_VERIFY_SERVICE_SID"
    ]

    saved_env = Map.new(env_keys, &{&1, System.get_env(&1)})

    app_keys = [:deepgram_api_key, :deepgram_http_fun, :apns, :apns_jwt_fun, :apns_http_fun, :phone_verify_http_client]
    saved_app = Map.new(app_keys, &{&1, Application.get_env(:opal_core, &1)})

    on_exit(fn ->
      Enum.each(saved_env, fn
        {k, nil} -> System.delete_env(k)
        {k, v} -> System.put_env(k, v)
      end)

      Enum.each(saved_app, fn
        {k, nil} -> Application.delete_env(:opal_core, k)
        {k, v} -> Application.put_env(:opal_core, k, v)
      end)
    end)

    :ok
  end

  defp unkey_deepgram do
    System.delete_env("DEEPGRAM_API_KEY")
    Application.put_env(:opal_core, :deepgram_api_key, nil)
    Application.delete_env(:opal_core, :deepgram_http_fun)
  end

  defp key_deepgram_with_provider(transcript, confidence) do
    System.put_env("DEEPGRAM_API_KEY", "test-key-not-real")
    Application.delete_env(:opal_core, :deepgram_api_key)

    body =
      Jason.encode!(%{
        "results" => %{
          "channels" => [
            %{
              "alternatives" => [
                %{"transcript" => transcript, "confidence" => confidence, "words" => []}
              ]
            }
          ]
        }
      })

    Application.put_env(:opal_core, :deepgram_http_fun, fn _url, _headers, _audio, _ct ->
      {:ok, 200, body}
    end)
  end

  defp make_conversation do
    user =
      %User{}
      |> User.changeset(%{
        handle: "bs-#{System.unique_integer([:positive])}",
        display_name: "BS Tester"
      })
      |> Repo.insert!()

    conv =
      %Conversation{}
      |> Conversation.changeset(%{label: "bs-#{System.unique_integer([:positive])}"})
      |> Repo.insert!()

    %ConversationMember{}
    |> ConversationMember.changeset(%{conversation_id: conv.id, user_id: user.id})
    |> Repo.insert!()

    {user, conv}
  end

  describe "BS-4 Deepgram canned transcript" do
    test "unkeyed transcribe_batch is an honest disabled, never canned text" do
      unkey_deepgram()

      assert {:disabled, reason} = DeepgramClient.transcribe_batch(<<1, 2, 3, 4>>)
      assert is_binary(reason)
      refute DeepgramClient.configured?()
    end

    test "unkeyed transcribe_batch ignores any caller-supplied transcript text" do
      unkey_deepgram()

      # The old stub honoured :stub_transcript / :stub_confidence opts and
      # returned them as if Deepgram had heard them. That seam is gone.
      assert {:disabled, _} =
               DeepgramClient.transcribe_batch(<<9, 9>>,
                 stub_transcript: "invented words nobody said",
                 stub_confidence: 0.99
               )
    end

    test "keyed transcribe returns the provider transcript via the transport seam" do
      key_deepgram_with_provider("Completely different words about trains", 0.97)

      assert {:ok, result} = DeepgramClient.transcribe_batch(<<1, 2, 3>>)
      assert result.transcript == "Completely different words about trains"
      assert result.stub == false
      assert result.raw_provider == "deepgram"
      refute result.transcript =~ "Juniper"
    end

    test "AudioIngestor unkeyed persists NO voice_transcript message" do
      unkey_deepgram()
      {user, conv} = make_conversation()

      assert {:disabled, _} =
               AudioIngestor.ingest_voice_message(<<9, 9, 9>>, conv.id, user.id, [])

      count =
        from(m in Message, where: m.conversation_id == ^conv.id, select: count(m.id))
        |> Repo.one()

      assert count == 0
    end

    test "AudioIngestor keyed persists exactly the provider transcript" do
      key_deepgram_with_provider("Provider heard the real words", 0.95)
      {user, conv} = make_conversation()

      assert {:ok, result} =
               AudioIngestor.ingest_voice_message(<<9, 9, 9>>, conv.id, user.id,
                 duration_ms: 900
               )

      assert result.transcript == "Provider heard the real words"
      assert result.stub == false
      assert result.message.body == "Provider heard the real words"
      refute result.message.body =~ @canned
    end

    test "CallTranscription with consent but unkeyed provider is disabled, not fabricated" do
      unkey_deepgram()

      assert {:disabled, _} =
               CallTranscription.after_call_ended(%{
                 call_id: Ecto.UUID.generate(),
                 consent: true,
                 recording_audio: <<1, 2, 3, 4, 5>>,
                 participant_ids: []
               })
    end
  end

  describe "BS-5 Sentry fake queued" do
    test "capture with no DSN is an explicit not-configured error, not ok" do
      System.delete_env("SENTRY_DSN")
      System.delete_env("OPAL_SENTRY_DSN")

      refute Sentry.configured?()
      assert {:error, :not_configured} = Sentry.capture(%RuntimeError{message: "probe"})
      assert Sentry.delivery_available?() == false
      assert Sentry.reporting_status() == :not_configured
    end

    test "capture WITH a DSN still cannot claim queued — no delivery is wired" do
      System.put_env("SENTRY_DSN", "https://public@example.invalid/1")
      System.delete_env("OPAL_SENTRY_DSN")

      assert Sentry.configured?()
      assert {:error, :reporting_not_wired} = Sentry.capture(%RuntimeError{message: "probe"})
      assert Sentry.delivery_available?() == false
      assert Sentry.reporting_status() == :not_wired
    end
  end

  describe "BS-6 APNs raise" do
    setup do
      Application.put_env(:opal_core, :apns,
        key_id: "KEYID",
        team_id: "TEAMID",
        bundle_id: "com.example.opal",
        auth_key: "test-pem-contents"
      )

      Application.delete_env(:opal_core, :apns_jwt_fun)
      Application.delete_env(:opal_core, :apns_http_fun)
      :ok
    end

    test "credentials present but no JWT provider degrades to an error, never raises" do
      assert APNS.credentials_present?()

      assert {:error, :jwt_not_configured} =
               APNS.send("device-token-abcdef12", %{title: "Hi", body: "There"}, [])
    end

    test "with a JWT provider and transport seam, delivery still works" do
      Application.put_env(:opal_core, :apns_jwt_fun, fn -> "signed-jwt" end)

      Application.put_env(:opal_core, :apns_http_fun, fn _url, _body, _headers ->
        {:ok, %{status: 200, body: ""}}
      end)

      assert {:ok, :sent} =
               APNS.send("device-token-abcdef12", %{title: "Hi", body: "There"}, [])
    end
  end

  describe "BS-17 Twilio Verify check_challenge" do
    setup do
      System.put_env("OPAL_TWILIO_ACCOUNT_SID", "ACtest")
      System.put_env("OPAL_TWILIO_AUTH_TOKEN", "token")
      System.put_env("OPAL_TWILIO_VERIFY_SERVICE_SID", "VAtest")
      :ok
    end

    test "check_challenge with the E.164 in context performs the real check (approved)" do
      Application.put_env(:opal_core, :phone_verify_http_client, fn _m, url, body, _h ->
        # The real VerificationCheck endpoint + To/Code form must be used.
        assert url =~ "VerificationCheck"
        assert URI.decode_query(body) == %{"To" => "+15551234567", "Code" => "123456"}
        {:ok, %{"status" => "approved"}}
      end)

      assert :ok =
               TwilioVerifyAdapter.check_challenge("VEreference", "123456", %{
                 e164: "+15551234567"
               })
    end

    test "check_challenge with the E.164 in context surfaces a wrong code honestly" do
      Application.put_env(:opal_core, :phone_verify_http_client, fn _m, _url, _body, _h ->
        {:ok, %{"status" => "pending"}}
      end)

      assert {:error, :invalid_code} =
               TwilioVerifyAdapter.check_challenge("VEreference", "000000", %{
                 "e164" => "+15551234567"
               })
    end

    test "check_challenge without an E.164 states exactly what is missing" do
      assert {:error, :e164_required} =
               TwilioVerifyAdapter.check_challenge("VEreference", "123456", %{})

      # The old dead-path atom must never come back.
      refute match?(
               {:error, :use_check_with_e164},
               TwilioVerifyAdapter.check_challenge("VEreference", "123456", %{})
             )
    end
  end
end
