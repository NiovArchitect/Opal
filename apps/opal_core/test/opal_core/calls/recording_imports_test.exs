defmodule OpalCore.Calls.RecordingImportsTest do
  @moduledoc """
  Repair #25 — the import door, end to end, against the REAL pipeline.

  Transcription runs the real DeepgramClient + CallTranscription +
  fold; only the provider's HTTP response is shaped through the
  client's own `:deepgram_http_fun` transport seam (the same seam
  the batch path's own tests use) — every downstream fact asserted
  here was produced by product code, not by the test.
  """
  use OpalCore.DataCase, async: false

  import Ecto.Query

  alias OpalCore.Accounts.User
  alias OpalCore.Calls.{RecordingImport, RecordingImports, TranscriptSegment}
  alias OpalCore.MemoryWallet.CapsuleRead
  alias OpalCore.Repo
  alias OpalCore.SocialMemory.{Commitment, PersonMemory, PlanMemory}

  # Repair #26 (F-1): the pipeline now decodes non-WAV audio
  # server-side before Deepgram, and dummy bytes fail that decode
  # honestly. The shared fixture is therefore a REAL tiny WAV built
  # sample-by-sample here (valid RIFF/PCM), imported as audio/wav so
  # it takes the WAV passthrough; MP3 coverage lives in its own
  # ffmpeg-generated test below.
  defp audio_bytes do
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

  setup do
    prior_env = System.get_env("DEEPGRAM_API_KEY")
    prior_app_key = Application.get_env(:opal_core, :deepgram_api_key)
    prior_fun = Application.get_env(:opal_core, :deepgram_http_fun)
    prior_decoder = Application.get_env(:opal_core, :audio_decoder_fun)

    on_exit(fn ->
      if prior_env,
        do: System.put_env("DEEPGRAM_API_KEY", prior_env),
        else: System.delete_env("DEEPGRAM_API_KEY")

      restore_app(:deepgram_api_key, prior_app_key)
      restore_app(:deepgram_http_fun, prior_fun)
      restore_app(:audio_decoder_fun, prior_decoder)
    end)

    %{
      a: user("Alex Rivera"),
      b: user("Maya Chen"),
      c: user("Uninvolved Third")
    }
  end

  defp restore_app(key, nil), do: Application.delete_env(:opal_core, key)
  defp restore_app(key, val), do: Application.put_env(:opal_core, key, val)

  defp user(name) do
    %User{}
    |> User.changeset(%{
      handle: "u-#{System.unique_integer([:positive])}",
      display_name: name
    })
    |> Repo.insert!()
  end

  defp key_on do
    System.put_env("DEEPGRAM_API_KEY", "test-key-not-real")
    Application.delete_env(:opal_core, :deepgram_api_key)
  end

  defp key_off do
    System.delete_env("DEEPGRAM_API_KEY")
    Application.delete_env(:opal_core, :deepgram_api_key)
    Application.delete_env(:opal_core, :deepgram_http_fun)
  end

  # Provider-shaped Deepgram response: diarized words per turn.
  defp stub_turns(turns) do
    body = turns_body(turns)

    Application.put_env(:opal_core, :deepgram_http_fun, fn _url, _headers, _audio, _ct ->
      {:ok, 200, body}
    end)
  end

  defp turns_body(turns) do
    words =
      turns
      |> Enum.with_index()
      |> Enum.flat_map(fn {{speaker, text}, turn_idx} ->
        text
        |> String.split(" ")
        |> Enum.with_index()
        |> Enum.map(fn {word, wi} ->
          %{
            "word" => word,
            "speaker" => speaker,
            "start" => turn_idx * 10.0 + wi * 0.3,
            "end" => turn_idx * 10.0 + wi * 0.3 + 0.25,
            "confidence" => 0.98
          }
        end)
      end)

    transcript = turns |> Enum.map(&elem(&1, 1)) |> Enum.join(" ")

    Jason.encode!(%{
      "results" => %{
        "channels" => [
          %{
            "alternatives" => [
              %{"transcript" => transcript, "confidence" => 0.97, "words" => words}
            ]
          }
        ]
      }
    })
  end

  defp stub_raw(body, status \\ 200) do
    Application.put_env(:opal_core, :deepgram_http_fun, fn _url, _headers, _audio, _ct ->
      {:ok, status, body}
    end)
  end

  defp attrs(a, b, overrides \\ %{}) do
    Map.merge(
      %{
        speaker_user_ids: [a.id, b.id],
        consent_attested: true,
        consent_basis: "Both participants consented to recording and import (test fixture).",
        content_type: "audio/wav",
        original_filename: "call.wav"
      },
      overrides
    )
  end

  @turns [
    {0, "Let's do dinner this Saturday at 7 pm at Juniper and Ivy."},
    {1, "Sounds good. I'm allergic to shellfish, so let's skip the oyster place."},
    {0, "Perfect, I'll book the table tonight."},
    {1, "And I'll bring the tickets for the movie after."}
  ]

  test "happy path: real fold lands attributed memory in each party's own store",
       %{a: a, b: b, c: c} do
    key_on()
    stub_turns(@turns)
    Phoenix.PubSub.subscribe(OpalCore.PubSub, "call_imports:#{a.id}")

    assert {:ok, row, :created} =
             RecordingImports.import_recording(a.id, audio_bytes(), attrs(a, b))

    assert_receive {:call_import, "done", _}, 5_000

    row = Repo.get!(RecordingImport, row.id)
    assert row.status == "done"
    assert row.provider == "deepgram"
    assert row.segment_count == 4
    assert row.unattributed_segment_count == 0
    assert is_integer(row.transcription_ms)
    assert is_integer(row.fold_ms)
    assert is_integer(row.total_ms)
    assert map_size(row.capsule_ids) == 2

    # Segments persisted with correct speaker attribution.
    segments = RecordingImports.segments_for(row)
    assert length(segments) == 4
    assert Enum.map(segments, & &1["speaker_user_id"]) == [a.id, b.id, a.id, b.id]

    assert Enum.map(segments, & &1["speaker_name"]) == [
             "Alex Rivera",
             "Maya Chen",
             "Alex Rivera",
             "Maya Chen"
           ]

    # The allergy B stated is a fact ABOUT B in both stores — and is
    # not attributed to A anywhere.
    assert fact_about?(a.id, b.id, "shellfish")
    assert fact_about?(b.id, b.id, "shellfish")
    refute fact_about?(a.id, a.id, "shellfish")
    refute fact_about?(b.id, a.id, "shellfish")

    # A's commitment lives in A's ledger.
    commitments =
      Repo.all(from(cmt in Commitment, where: cmt.account_id == ^a.id, select: cmt.description))

    assert Enum.any?(commitments, &String.contains?(&1, "book the table"))

    # A plan signal landed for the conversation in both stores.
    assert Repo.aggregate(from(p in PlanMemory, where: p.account_id == ^a.id), :count) >= 1
    assert Repo.aggregate(from(p in PlanMemory, where: p.account_id == ^b.id), :count) >= 1

    # One provenance-tagged capsule per party, readable on the
    # owner's Memory browse; the non-party sees none of it.
    for owner <- [a, b] do
      capsules = CapsuleRead.list_for_owner_browse(owner.id)

      assert Enum.any?(capsules, fn cap ->
               cap.provenance["source_kind"] == "imported_call_recording" and
                 String.contains?(cap.payload["summary"], "imported recording")
             end)
    end

    c_capsules = CapsuleRead.list_for_owner_browse(c.id)
    refute Enum.any?(c_capsules, &(&1.provenance["source_kind"] == "imported_call_recording"))
    assert {:error, :not_found} = RecordingImports.get_for(row.id, c.id)
    assert {:ok, _} = RecordingImports.get_for(row.id, b.id)
  end

  test "no attestation — refused at the door, nothing stored", %{a: a, b: b} do
    key_on()
    stub_turns(@turns)

    assert {:error, :consent_attestation_required} =
             RecordingImports.import_recording(
               a.id,
               audio_bytes(),
               attrs(a, b, %{consent_attested: false})
             )

    assert {:error, :consent_basis_required} =
             RecordingImports.import_recording(
               a.id,
               audio_bytes(),
               attrs(a, b, %{consent_basis: "  "})
             )

    assert Repo.aggregate(RecordingImport, :count) == 0
    assert Repo.aggregate(OpalCore.Calls.CallSession, :count) == 0
  end

  test "uploader must be a declared participant", %{a: a, b: b, c: c} do
    assert {:error, :uploader_not_participant} =
             RecordingImports.import_recording(c.id, audio_bytes(), attrs(a, b))

    assert Repo.aggregate(RecordingImport, :count) == 0
  end

  test "unsupported format and empty audio are refused honestly", %{a: a, b: b} do
    assert {:error, :unsupported_format} =
             RecordingImports.import_recording(
               a.id,
               audio_bytes(),
               attrs(a, b, %{content_type: "video/mp4"})
             )

    assert {:error, :empty_audio} = RecordingImports.import_recording(a.id, "", attrs(a, b))
  end

  test "a recording over the door's size cap is refused before storage", %{a: a, b: b} do
    oversize = :binary.copy(<<7>>, 100 * 1024 * 1024 + 1)

    assert {:error, :recording_too_large} =
             RecordingImports.import_recording(a.id, oversize, attrs(a, b))

    assert Repo.aggregate(RecordingImport, :count) == 0
  end

  test "duplicate import of the same bytes is idempotent", %{a: a, b: b} do
    key_on()
    stub_turns(@turns)

    assert {:ok, first, :created} =
             RecordingImports.import_recording(a.id, audio_bytes(), attrs(a, b))

    assert {:ok, second, :duplicate} =
             RecordingImports.import_recording(a.id, audio_bytes(), attrs(a, b))

    assert first.id == second.id
    assert Repo.aggregate(RecordingImport, :count) == 1
    assert Repo.aggregate(TranscriptSegment, :count) == 4
  end

  test "unconfigured Deepgram fails the import honestly — no fabricated transcript",
       %{a: a, b: b} do
    key_off()

    assert {:ok, row, :created} =
             RecordingImports.import_recording(a.id, audio_bytes(), attrs(a, b))

    row = Repo.get!(RecordingImport, row.id)
    assert row.status == "failed"
    assert row.failure_reason =~ "transcription_not_configured"
    assert Repo.aggregate(TranscriptSegment, :count) == 0
    assert CapsuleRead.list_for_owner_browse(a.id) == []
  end

  test "provider error fails the import with the real reason", %{a: a, b: b} do
    key_on()
    stub_raw(Jason.encode!(%{"err_code" => "BAD_REQUEST", "err_msg" => "corrupt audio"}), 400)

    assert {:ok, row, :created} =
             RecordingImports.import_recording(a.id, audio_bytes(), attrs(a, b))

    row = Repo.get!(RecordingImport, row.id)
    assert row.status == "failed"
    assert row.failure_reason =~ "transcription_failed"
    assert Repo.aggregate(TranscriptSegment, :count) == 0
  end

  test "silence completes truthfully with zero memory written", %{a: a, b: b} do
    key_on()

    stub_raw(
      Jason.encode!(%{
        "results" => %{
          "channels" => [
            %{"alternatives" => [%{"transcript" => "", "confidence" => 0.0, "words" => []}]}
          ]
        }
      })
    )

    assert {:ok, row, :created} =
             RecordingImports.import_recording(a.id, audio_bytes(), attrs(a, b))

    row = Repo.get!(RecordingImport, row.id)
    assert row.status == "done"
    assert row.segment_count == 0
    assert row.capsule_ids == %{}
    assert CapsuleRead.list_for_owner_browse(a.id) == []
    assert CapsuleRead.list_for_owner_browse(b.id) == []
  end

  test "a third diarized speaker is never guessed into a participant's mouth", %{a: a, b: b} do
    key_on()

    stub_turns([
      {0, "Let's do dinner this Saturday at 7 pm at Juniper and Ivy."},
      {2, "I am a third voice who was never declared."},
      {1, "Sounds good, see you there."}
    ])

    assert {:ok, row, :created} =
             RecordingImports.import_recording(a.id, audio_bytes(), attrs(a, b))

    row = Repo.get!(RecordingImport, row.id)
    assert row.status == "done"
    assert row.unattributed_segment_count == 1

    segments = RecordingImports.segments_for(row)
    assert length(segments) == 2
    refute Enum.any?(segments, &String.contains?(&1["text"], "third voice"))
  end

  test "a later import's capsule never takes credit for an earlier call's facts",
       %{a: a, b: b} do
    key_on()
    {:ok, counter} = Agent.start_link(fn -> 0 end)

    Application.put_env(:opal_core, :deepgram_http_fun, fn _u, _h, _a2, _ct ->
      case Agent.get_and_update(counter, fn n -> {n, n + 1} end) do
        0 ->
          {:ok, 200, turns_body(@turns)}

        _ ->
          {:ok, 200, turns_body([{0, "Thanks for the update, talk soon."}, {1, "Bye for now."}])}
      end
    end)

    assert {:ok, _first, :created} =
             RecordingImports.import_recording(a.id, audio_bytes(), attrs(a, b))

    assert {:ok, second, :created} =
             RecordingImports.import_recording(
               a.id,
               <<9, 9, 9, 9>>,
               attrs(a, b, %{original_filename: "second.wav"})
             )

    assert second.status == "done"

    a_capsules = CapsuleRead.list_for_owner_browse(a.id)
    assert length(a_capsules) == 2

    second_capsule =
      Enum.find(a_capsules, fn cap ->
        String.contains?(cap.payload["summary"], "2 utterances")
      end)

    assert second_capsule
    refute String.contains?(second_capsule.payload["summary"], "shellfish")
    refute String.contains?(second_capsule.payload["summary"], "book the table")
  end

  # ----------------------------------------------------------------
  # Repair #26 (F-1) — decode-to-WAV before Deepgram.
  # ----------------------------------------------------------------

  # A real tiny MP3, encoded by ffmpeg from this suite's real WAV
  # fixture. Returns :no_ffmpeg only when ffmpeg is genuinely absent.
  defp ffmpeg_mp3_bytes do
    ffmpeg = System.get_env("OPAL_FFMPEG_PATH") || System.find_executable("ffmpeg")

    if ffmpeg do
      dir =
        Path.join(System.tmp_dir!(), "r26-mp3-#{System.unique_integer([:positive])}")

      File.mkdir_p!(dir)
      wav_path = Path.join(dir, "tone.wav")
      mp3_path = Path.join(dir, "tone.mp3")
      File.write!(wav_path, audio_bytes())
      {_, 0} = System.cmd(ffmpeg, ["-v", "error", "-i", wav_path, "-y", mp3_path])
      bytes = File.read!(mp3_path)
      File.rm_rf(dir)
      {:ok, bytes}
    else
      :no_ffmpeg
    end
  end

  test "real MP3 import is decoded to WAV before Deepgram and folds two speakers",
       %{a: a, b: b} do
    case ffmpeg_mp3_bytes() do
      :no_ffmpeg ->
        IO.puts("SKIP: ffmpeg absent on this machine; MP3 import test not run")

      {:ok, mp3} ->
        key_on()
        {:ok, capture} = Agent.start_link(fn -> nil end)

        body =
          turns_body([
            {0, "Let's do dinner this Saturday at 7 pm."},
            {1, "Sounds good, see you there."}
          ])

        Application.put_env(:opal_core, :deepgram_http_fun, fn _u, _h, audio, ct ->
          Agent.update(capture, fn _ -> {audio, ct} end)
          {:ok, 200, body}
        end)

        assert {:ok, row, :created} =
                 RecordingImports.import_recording(
                   a.id,
                   mp3,
                   attrs(a, b, %{content_type: "audio/mpeg", original_filename: "call.mp3"})
                 )

        row = Repo.get!(RecordingImport, row.id)
        assert row.status == "done"
        # The stored import still describes the ORIGINAL upload.
        assert row.content_type == "audio/mpeg"

        # Deepgram received the DECODED WAV, not the MP3 bytes.
        {sent_audio, sent_content_type} = Agent.get(capture, & &1)
        assert sent_content_type == "audio/wav"
        assert "RIFF" <> _ = sent_audio
        refute sent_audio == mp3

        # Two diarized speakers folded into two persisted segments.
        segments = RecordingImports.segments_for(row)
        assert length(segments) == 2
        assert Repo.aggregate(TranscriptSegment, :count) == 2
    end
  end

  test "decoder unavailable fails the import with audio_decode_failed — no fabricated transcript",
       %{a: a, b: b} do
    key_on()
    stub_turns(@turns)

    Application.put_env(:opal_core, :audio_decoder_fun, fn _audio, _ct ->
      {:error, :decoder_unavailable}
    end)

    assert {:ok, row, :created} =
             RecordingImports.import_recording(
               a.id,
               audio_bytes(),
               attrs(a, b, %{content_type: "audio/mpeg", original_filename: "call.mp3"})
             )

    row = Repo.get!(RecordingImport, row.id)
    assert row.status == "failed"
    assert row.failure_reason =~ "audio_decode_failed"
    assert row.failure_reason =~ "decoder_unavailable"
    assert Repo.aggregate(TranscriptSegment, :count) == 0
  end

  # Repair #26 regression (B-19): a long failure reason (ffmpeg
  # stderr excerpts run long) must still land the import in failed —
  # failure_reason is varchar(255) and fail/2 once sliced to 500, so
  # the update raised 22001, the job was discarded, and the import
  # stayed "transcribing" forever (hit live by the corrupt dummy).
  test "long decode failure reason lands failed, never stranded transcribing",
       %{a: a, b: b} do
    key_on()
    stub_turns(@turns)

    Application.put_env(:opal_core, :audio_decoder_fun, fn _audio, _ct ->
      {:error, {:decode_failed, String.duplicate("decoder said no. ", 40)}}
    end)

    assert {:ok, row, :created} =
             RecordingImports.import_recording(
               a.id,
               audio_bytes(),
               attrs(a, b, %{content_type: "audio/mpeg", original_filename: "call.mp3"})
             )

    row = Repo.get!(RecordingImport, row.id)
    assert row.status == "failed"
    assert row.failure_reason =~ "audio_decode_failed"
    assert String.length(row.failure_reason) <= 255
    assert Repo.aggregate(TranscriptSegment, :count) == 0
  end

  defp fact_about?(account_id, person_id, needle) do
    case Repo.get_by(PersonMemory, account_id: account_id, person_id: person_id) do
      %PersonMemory{known_facts: facts} when is_map(facts) ->
        Enum.any?(Map.values(facts), fn v ->
          is_map(v) and String.contains?(String.downcase(v["value"] || ""), needle)
        end)

      _ ->
        false
    end
  end
end
