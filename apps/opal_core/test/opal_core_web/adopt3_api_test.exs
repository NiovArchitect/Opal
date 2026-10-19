defmodule OpalCoreWeb.Adopt3ApiTest do
  @moduledoc """
  Repair #18 adoption wave 3 - ST-C archive, ST-H voice notes,
  ST-I provider status, 4.C11 artifact shelf. All assertions read back
  through the real API from a second account where isolation matters.
  """
  use OpalCoreWeb.ConnCase, async: false

  alias OpalCore.Accounts.User
  alias OpalCore.Artifacts.Artifact
  alias OpalCore.Auth.ProductSession
  alias OpalCore.Fixtures
  alias OpalCore.FixturesHelper
  alias OpalCore.Repo
  alias OpalCore.SocialFlow.DeviceSession
  alias OpalCore.SocialFlow.SocialMomentPublishing

  setup do
    FixturesHelper.seed!()

    prior_dg = System.get_env("DEEPGRAM_API_KEY")
    prior_el = System.get_env("ELEVENLABS_API_KEY")
    prior_oa = System.get_env("OPENAI_API_KEY")
    System.delete_env("DEEPGRAM_API_KEY")
    System.delete_env("ELEVENLABS_API_KEY")
    System.delete_env("OPENAI_API_KEY")

    root = Path.join(System.tmp_dir!(), "opal-adopt3-#{System.unique_integer([:positive])}")
    File.mkdir_p!(root)
    prior_media = Application.get_env(:opal_core, :local_media_root)
    Application.put_env(:opal_core, :local_media_root, root)

    on_exit(fn ->
      for {k, v} <- [
            {"DEEPGRAM_API_KEY", prior_dg},
            {"ELEVENLABS_API_KEY", prior_el},
            {"OPENAI_API_KEY", prior_oa}
          ] do
        if v, do: System.put_env(k, v), else: System.delete_env(k)
      end

      if is_nil(prior_media),
        do: Application.delete_env(:opal_core, :local_media_root),
        else: Application.put_env(:opal_core, :local_media_root, prior_media)

      File.rm_rf(root)
    end)

    alex = Repo.get!(User, Fixtures.user_alex_id())
    jordan = Repo.get!(User, Fixtures.user_jordan_id())

    %{
      alex: alex,
      jordan: jordan,
      alex_token: mint_token(alex),
      jordan_token: mint_token(jordan),
      conv: Fixtures.conv_alex_jordan_id()
    }
  end

  defp auth(conn, token), do: put_req_header(conn, "authorization", "Bearer #{token}")

  defp mint_token(%User{} = user) do
    n = System.unique_integer([:positive])
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    session =
      %DeviceSession{}
      |> DeviceSession.changeset(%{
        user_id: user.id,
        device_label: "test-web",
        platform: "web",
        status: "active",
        session_ref: "ref-adopt3-#{n}",
        refresh_family: "rf-adopt3-#{n}",
        idempotency_key: "idem-adopt3-#{n}",
        last_seen_at: now
      })
      |> Repo.insert!()

    {:ok, payload} = ProductSession.issue(session)
    payload.access_token
  end

  describe "ST-C moments archive" do
    test "own posts only, newest first, and the same record the feed carries", %{
      conn: conn,
      alex: alex,
      jordan: jordan,
      alex_token: alex_token,
      jordan_token: jordan_token
    } do
      {:ok, first} =
        SocialMomentPublishing.publish(alex.id, %{
          "caption" => "first post",
          "visibility" => "friends",
          "media_ids" => []
        })

      {:ok, second} =
        SocialMomentPublishing.publish(alex.id, %{
          "caption" => "second post",
          "visibility" => "friends",
          "media_ids" => []
        })

      {:ok, _j} =
        SocialMomentPublishing.publish(jordan.id, %{
          "caption" => "jordan post",
          "visibility" => "friends",
          "media_ids" => []
        })

      body =
        conn
        |> auth(alex_token)
        |> get("/api/v1/product/social-moments/mine")
        |> json_response(200)

      ids = Enum.map(body["posts"], & &1["id"])
      assert ids == [second["moment"]["id"], first["moment"]["id"]]
      assert body["count"] == length(body["posts"]) + length(body["stories"])
      assert Enum.all?(body["posts"], &(&1["author_user_id"] == alex.id))

      # The feed carries the same own record (B-11 read-back parity).
      feed =
        build_conn()
        |> auth(alex_token)
        |> get("/api/v1/product/home/feed")
        |> json_response(200)

      assert Enum.any?(feed["objects"], &(&1["id"] == second["moment"]["id"]))

      # Isolation: Jordan's archive holds none of Alex's records.
      jbody =
        build_conn()
        |> auth(jordan_token)
        |> get("/api/v1/product/social-moments/mine")
        |> json_response(200)

      jids = Enum.map(jbody["posts"], & &1["id"])
      assert jids != []
      assert Enum.all?(jbody["posts"], &(&1["author_user_id"] == jordan.id))
      refute second["moment"]["id"] in jids
    end
  end

  describe "ST-H voice notes" do
    test "audio sends without transcription configured; identical playback URL for both participants; sender-only correction",
         %{conn: conn, alex_token: alex_token, jordan_token: jordan_token, conv: conv} do
      audio = Base.encode64("fake-webm-audio-bytes-for-voice-note")

      resp =
        conn
        |> auth(alex_token)
        |> post("/api/v1/product/conversations/#{conv}/voice_notes", %{
          "audio_base64" => audio,
          "content_type" => "audio/webm",
          "duration_ms" => 1200,
          "client_message_id" => "vn-adopt3-1"
        })
        |> json_response(201)

      # No Deepgram in this env: the note sends as audio with NO
      # transcript - never a canned one.
      assert resp["transcription_state"] == "none"
      assert resp["transcript"] in [nil, ""]
      message = resp["message"]
      assert message["message_type"] == "voice_note"
      assert message["audio_url"] =~ "/share/voice-audio/"
      message_id = message["id"]

      # Jordan reads the thread: identical audio URL.
      jmessages =
        build_conn()
        |> auth(jordan_token)
        |> get("/api/v1/product/conversations/#{conv}/messages")
        |> json_response(200)

      jnote = Enum.find(jmessages["messages"], &(&1["id"] == message_id))
      assert is_binary(jnote["audio_url"])

      # Identical playback: signed URLs are re-minted per read (the TTS
      # pattern), so the strings differ - what must match is the stored
      # audio both URLs serve.
      path = URI.parse(message["audio_url"]).path
      raw_conn = build_conn() |> get(path)
      assert raw_conn.status == 200
      assert raw_conn.resp_body == "fake-webm-audio-bytes-for-voice-note"

      jpath = URI.parse(jnote["audio_url"]).path
      jraw_conn = build_conn() |> get(jpath)
      assert jraw_conn.status == 200
      assert jraw_conn.resp_body == raw_conn.resp_body

      # Correction is sender-only.
      build_conn()
      |> auth(jordan_token)
      |> patch("/api/v1/product/conversations/#{conv}/voice_notes/#{message_id}/transcript", %{
        "transcript" => "jordan edit"
      })
      |> json_response(403)

      corrected =
        build_conn()
        |> auth(alex_token)
        |> patch("/api/v1/product/conversations/#{conv}/voice_notes/#{message_id}/transcript", %{
          "transcript" => "Meet at seven, not eight"
        })
        |> json_response(200)

      assert corrected["transcript"] == "Meet at seven, not eight"

      # The correction is the stored transcript Jordan now reads.
      jmessages2 =
        build_conn()
        |> auth(jordan_token)
        |> get("/api/v1/product/conversations/#{conv}/messages")
        |> json_response(200)

      jnote2 = Enum.find(jmessages2["messages"], &(&1["id"] == message_id))
      assert jnote2["body"] == "Meet at seven, not eight"
    end

    test "non-member cannot send a voice note", %{conn: conn, conv: conv} do
      stranger = insert_user!("adopt3_stranger", "Stranger")

      conn
      |> auth(mint_token(stranger))
      |> post("/api/v1/product/conversations/#{conv}/voice_notes", %{
        "audio_base64" => Base.encode64("nope-nope-nope"),
        "content_type" => "audio/webm"
      })
      |> json_response(403)
    end
  end

  describe "ST-I voice status" do
    test "unconfigured providers report false - the Listen control stays absent", %{
      conn: conn,
      alex_token: alex_token
    } do
      body =
        conn
        |> auth(alex_token)
        |> get("/api/v1/product/voice/status")
        |> json_response(200)

      assert body["tts_configured"] == false
      assert body["transcription_configured"] == false
    end
  end

  describe "4.C11 Made-by-Opal shelf" do
    test "owner lists and deletes own artifacts; the other account sees and deletes none",
         %{conn: conn, alex: alex, alex_token: alex_token, jordan_token: jordan_token} do
      art =
        %Artifact{}
        |> Artifact.changeset(%{
          account_id: alex.id,
          kind: "event_plan",
          plan_id: Ecto.UUID.generate(),
          version: 1,
          html_or_path: "<html>plan</html>",
          signed_token: "adopt3-token-#{System.unique_integer([:positive])}",
          expires_at: DateTime.add(DateTime.utc_now(), 3600, :second),
          source_fingerprint: "fp-adopt3"
        })
        |> Repo.insert!()

      body =
        conn
        |> auth(alex_token)
        |> get("/api/v1/product/artifacts")
        |> json_response(200)

      assert Enum.any?(body["artifacts"], &(&1["artifact_id"] == art.id))
      listed = Enum.find(body["artifacts"], &(&1["artifact_id"] == art.id))
      assert listed["share_url"] =~ "/share/artifacts/"

      jbody =
        build_conn()
        |> auth(jordan_token)
        |> get("/api/v1/product/artifacts")
        |> json_response(200)

      refute Enum.any?(jbody["artifacts"], &(&1["artifact_id"] == art.id))

      build_conn()
      |> auth(jordan_token)
      |> delete("/api/v1/product/artifacts/#{art.id}")
      |> json_response(404)

      build_conn()
      |> auth(alex_token)
      |> delete("/api/v1/product/artifacts/#{art.id}")
      |> json_response(200)

      after_body =
        build_conn()
        |> auth(alex_token)
        |> get("/api/v1/product/artifacts")
        |> json_response(200)

      refute Enum.any?(after_body["artifacts"], &(&1["artifact_id"] == art.id))
    end
  end

  defp insert_user!(handle, name) do
    %User{}
    |> User.changeset(%{handle: handle, display_name: name})
    |> Repo.insert!()
  end
end
