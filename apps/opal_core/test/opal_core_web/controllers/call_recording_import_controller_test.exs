defmodule OpalCoreWeb.CallRecordingImportControllerTest do
  @moduledoc """
  Repair #25 — HTTP door for imported call recordings: multipart
  upload, consent refusal at the door, ownership-gated read-back.
  Accounts are real activated sessions (synthetic OTP, the same
  path every product test uses). Transcription runs the real
  client against the provider-shaped transport seam; everything
  downstream is product code.
  """
  use OpalCoreWeb.ConnCase, async: false

  setup do
    prior_env = System.get_env("DEEPGRAM_API_KEY")
    prior_app_key = Application.get_env(:opal_core, :deepgram_api_key)
    prior_fun = Application.get_env(:opal_core, :deepgram_http_fun)

    System.put_env("DEEPGRAM_API_KEY", "test-key-not-real")
    Application.delete_env(:opal_core, :deepgram_api_key)

    on_exit(fn ->
      if prior_env,
        do: System.put_env("DEEPGRAM_API_KEY", prior_env),
        else: System.delete_env("DEEPGRAM_API_KEY")

      if prior_app_key,
        do: Application.put_env(:opal_core, :deepgram_api_key, prior_app_key),
        else: Application.delete_env(:opal_core, :deepgram_api_key)

      if prior_fun,
        do: Application.put_env(:opal_core, :deepgram_http_fun, prior_fun),
        else: Application.delete_env(:opal_core, :deepgram_http_fun)
    end)

    {token_a, a} = activate(build_conn(), "+12025550101", "Alex Rivera", "r25_alex")
    {token_b, b} = activate(build_conn(), "+12025550102", "Maya Chen", "r25_maya")
    {token_c, c} = activate(build_conn(), "+14155552671", "Third Party", "r25_third")

    %{a: a, b: b, c: c, token_a: token_a, token_b: token_b, token_c: token_c}
  end

  defp activate(conn, phone, name, handle) do
    conn =
      post(conn, "/api/v1/product/activation/challenges", %{
        "otp_consent_accepted" => true,
        "phone" => phone,
        "device_label" => "#{handle}-web",
        "idempotency_key" => "r25-ch-#{handle}-#{System.unique_integer([:positive])}"
      })

    body = json_response(conn, 201)
    code = body["development_code"]
    challenge_id = body["challenge"]["id"]
    assert is_binary(code)

    conn =
      post(conn, "/api/v1/product/activation/verify", %{
        "challenge_id" => challenge_id,
        "code" => code,
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

  defp stub_turns do
    words =
      [{0, "Let's do dinner this Saturday"}, {1, "Sounds good"}]
      |> Enum.with_index()
      |> Enum.flat_map(fn {{speaker, text}, ti} ->
        text
        |> String.split(" ")
        |> Enum.with_index()
        |> Enum.map(fn {w, wi} ->
          %{
            "word" => w,
            "speaker" => speaker,
            "start" => ti * 5.0 + wi * 0.3,
            "end" => ti * 5.0 + wi * 0.3 + 0.2,
            "confidence" => 0.97
          }
        end)
      end)

    body =
      Jason.encode!(%{
        "results" => %{
          "channels" => [
            %{
              "alternatives" => [
                %{
                  "transcript" => "Let's do dinner this Saturday Sounds good",
                  "confidence" => 0.96,
                  "words" => words
                }
              ]
            }
          ]
        }
      })

    Application.put_env(:opal_core, :deepgram_http_fun, fn _u, _h, _a, _ct ->
      {:ok, 200, body}
    end)
  end

  defp upload_fixture(content_type \\ "audio/mpeg", filename \\ "call.mp3") do
    path =
      Path.join(System.tmp_dir!(), "r25-upload-#{System.unique_integer([:positive])}")

    File.write!(path, tiny_mp3_bytes())
    %Plug.Upload{path: path, filename: filename, content_type: content_type}
  end

  # Repair #26 (F-1): the pipeline decodes non-WAV audio server-side
  # before Deepgram and rejects undecodable bytes honestly, so this
  # fixture must be a REAL tiny MP3 (ffmpeg-built from a synthesized
  # WAV), not magic bytes. Same pattern as recording_imports_test.exs.
  defp tiny_mp3_bytes do
    ffmpeg = System.get_env("OPAL_FFMPEG_PATH") || System.find_executable("ffmpeg")

    case ffmpeg do
      nil ->
        <<1, 2, 3, 4, 5>>

      _ ->
        dir =
          Path.join(System.tmp_dir!(), "r26-upload-#{System.unique_integer([:positive])}")

        File.mkdir_p!(dir)
        wav_path = Path.join(dir, "tone.wav")
        mp3_path = Path.join(dir, "tone.mp3")
        File.write!(wav_path, tiny_wav_bytes())
        {_, 0} = System.cmd(ffmpeg, ["-v", "error", "-i", wav_path, "-y", mp3_path])
        bytes = File.read!(mp3_path)
        File.rm_rf(dir)
        bytes
    end
  end

  defp tiny_wav_bytes do
    sample_rate = 8_000

    data =
      for i <- 0..799,
          into: <<>>,
          do:
            <<round(1_000 * :math.sin(2 * :math.pi() * 440 * i / sample_rate))::little-signed-16>>

    riff_size = 36 + byte_size(data)

    "RIFF" <>
      <<riff_size::little-32>> <>
      "WAVEfmt " <>
      <<16::little-32, 1::little-16, 1::little-16, sample_rate::little-32,
        sample_rate * 2::little-32, 2::little-16,
        16::little-16>> <>
      "data" <> <<byte_size(data)::little-32>> <> data
  end

  test "create → 201 with truthful done status; read-back is participant-gated", %{
    a: a,
    b: b,
    token_a: token_a,
    token_b: token_b,
    token_c: token_c
  } do
    stub_turns()

    conn =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/call-recording-imports", %{
        "file" => upload_fixture(),
        "speaker_user_ids" => Jason.encode!([a, b]),
        "consent_attested" => "true",
        "consent_basis" => "Both participants consented to this recording."
      })

    assert %{"import" => imp, "origin" => "created"} = json_response(conn, 201)
    assert imp["status"] == "done"
    assert imp["source"] == "imported_recording"
    assert imp["consent"]["attested_by_user_id"] == a
    assert imp["timings_ms"]["total"] >= 0

    conn =
      build_conn()
      |> auth(token_b)
      |> get("/api/v1/product/call-recording-imports/#{imp["id"]}")

    assert %{"segments" => segs} = json_response(conn, 200)
    assert length(segs) == 2
    assert hd(segs)["speaker_user_id"] == a

    conn =
      build_conn()
      |> auth(token_c)
      |> get("/api/v1/product/call-recording-imports/#{imp["id"]}")

    assert %{"error_code" => "not_found"} = json_response(conn, 404)
  end

  test "create without consent attestation → 422 refusal", %{a: a, b: b, token_a: token_a} do
    stub_turns()

    conn =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/call-recording-imports", %{
        "file" => upload_fixture(),
        "speaker_user_ids" => Jason.encode!([a, b]),
        "consent_basis" => "no attestation flag"
      })

    assert %{"error_code" => "consent_attestation_required"} = json_response(conn, 422)
  end

  test "create with an unsupported file type → 415", %{a: a, b: b, token_a: token_a} do
    conn =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/call-recording-imports", %{
        "file" => upload_fixture("application/octet-stream", "evil.exe"),
        "speaker_user_ids" => Jason.encode!([a, b]),
        "consent_attested" => "true",
        "consent_basis" => "basis"
      })

    assert %{"error_code" => "unsupported_format"} = json_response(conn, 415)
  end

  test "index lists the caller's imports; a stranger's list is empty", %{
    a: a,
    b: b,
    token_a: token_a,
    token_b: token_b,
    token_c: token_c
  } do
    stub_turns()

    conn =
      build_conn()
      |> auth(token_a)
      |> post("/api/v1/product/call-recording-imports", %{
        "file" => upload_fixture(),
        "speaker_user_ids" => Jason.encode!([a, b]),
        "consent_attested" => "true",
        "consent_basis" => "basis"
      })

    assert json_response(conn, 201)

    conn = build_conn() |> auth(token_b) |> get("/api/v1/product/call-recording-imports")
    assert %{"imports" => imports} = json_response(conn, 200)
    assert length(imports) == 1

    conn = build_conn() |> auth(token_c) |> get("/api/v1/product/call-recording-imports")
    assert %{"imports" => []} = json_response(conn, 200)
  end
end
