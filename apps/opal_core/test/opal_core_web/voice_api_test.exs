defmodule OpalCoreWeb.VoiceApiTest do
  @moduledoc "Paste G Phase 10 — voice speak/listen HTTP."
  use OpalCoreWeb.ConnCase, async: false

  alias OpalCore.FixturesHelper
  alias OpalCore.SocialFlow.PhoneVerification.Provider

  @alex "+12025550101"

  setup do
    FixturesHelper.seed!()
    previous = Application.get_env(:opal_core, :phone_verify_mode)
    Application.put_env(:opal_core, :phone_verify_mode, :synthetic_development)

    prior_el = System.get_env("ELEVENLABS_API_KEY")
    System.delete_env("ELEVENLABS_API_KEY")

    root = Path.join(System.tmp_dir!(), "opal-voice-api-#{System.unique_integer([:positive])}")
    File.mkdir_p!(root)
    prior_media = Application.get_env(:opal_core, :local_media_root)
    Application.put_env(:opal_core, :local_media_root, root)

    on_exit(fn ->
      if is_nil(previous) do
        Application.delete_env(:opal_core, :phone_verify_mode)
      else
        Application.put_env(:opal_core, :phone_verify_mode, previous)
      end

      if prior_el,
        do: System.put_env("ELEVENLABS_API_KEY", prior_el),
        else: System.delete_env("ELEVENLABS_API_KEY")

      if is_nil(prior_media),
        do: Application.delete_env(:opal_core, :local_media_root),
        else: Application.put_env(:opal_core, :local_media_root, prior_media)

      File.rm_rf(root)
    end)

    :ok
  end

  defp activate(conn, phone, name, handle) do
    conn =
      post(conn, "/api/v1/product/activation/challenges", %{
        "otp_consent_accepted" => true,
        "phone" => phone,
        "device_label" => "#{handle}-web",
        "idempotency_key" => "voice-ch-#{handle}-#{System.unique_integer([:positive])}"
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

    assert Provider.synthetic_mode?()
    body = json_response(conn, 200)
    {body["session"]["access_token"], body["user"]["id"]}
  end

  defp auth(conn, token), do: put_req_header(conn, "authorization", "Bearer #{token}")

  test "speak without approval → 422; with stub → audio_url; listen honesty", %{conn: conn} do
    {token, _user_id} = activate(conn, @alex, "Voice A", "voice_walk_a")

    conn =
      build_conn()
      |> auth(token)
      |> post("/api/v1/product/voice/speak", %{"text" => "Hi", "approved" => false})

    assert json_response(conn, 422)["error"] == "approval_required"

    conn =
      build_conn()
      |> auth(token)
      |> post("/api/v1/product/voice/speak", %{
        "text" => "Approved hello",
        "approved" => true,
        "allow_test_stub" => true
      })

    body = json_response(conn, 201)
    assert body["text"] == "Approved hello"
    assert is_binary(body["audio_url"])

    prior_dg = System.get_env("DEEPGRAM_API_KEY")
    System.delete_env("DEEPGRAM_API_KEY")

    conn = build_conn() |> auth(token) |> get("/api/v1/product/voice/listen")
    listen = json_response(conn, 200)
    assert listen["status"] == "disabled"
    assert listen["message"] == "I can't listen to voice notes yet"

    if prior_dg, do: System.put_env("DEEPGRAM_API_KEY", prior_dg)
  end
end
