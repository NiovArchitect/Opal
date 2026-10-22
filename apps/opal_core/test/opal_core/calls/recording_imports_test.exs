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

  @audio <<1, 2, 3, 4, 5, 6, 7, 8>>

  setup do
    prior_env = System.get_env("DEEPGRAM_API_KEY")
    prior_app_key = Application.get_env(:opal_core, :deepgram_api_key)
    prior_fun = Application.get_env(:opal_core, :deepgram_http_fun)

    on_exit(fn ->
      if prior_env,
        do: System.put_env("DEEPGRAM_API_KEY", prior_env),
        else: System.delete_env("DEEPGRAM_API_KEY")

      restore_app(:deepgram_api_key, prior_app_key)
      restore_app(:deepgram_http_fun, prior_fun)
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

    body =
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

    Application.put_env(:opal_core, :deepgram_http_fun, fn _url, _headers, _audio, _ct ->
      {:ok, 200, body}
    end)
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
        content_type: "audio/mpeg",
        original_filename: "call.mp3"
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

    assert {:ok, row, :created} = RecordingImports.import_recording(a.id, @audio, attrs(a, b))
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
    assert Enum.map(segments, & &1["speaker_name"]) == ["Alex Rivera", "Maya Chen", "Alex Rivera", "Maya Chen"]

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
             RecordingImports.import_recording(a.id, @audio, attrs(a, b, %{consent_attested: false}))

    assert {:error, :consent_basis_required} =
             RecordingImports.import_recording(a.id, @audio, attrs(a, b, %{consent_basis: "  "}))

    assert Repo.aggregate(RecordingImport, :count) == 0
    assert Repo.aggregate(OpalCore.Calls.CallSession, :count) == 0
  end

  test "uploader must be a declared participant", %{a: a, b: b, c: c} do
    assert {:error, :uploader_not_participant} =
             RecordingImports.import_recording(c.id, @audio, attrs(a, b))

    assert Repo.aggregate(RecordingImport, :count) == 0
  end

  test "unsupported format and empty audio are refused honestly", %{a: a, b: b} do
    assert {:error, :unsupported_format} =
             RecordingImports.import_recording(a.id, @audio, attrs(a, b, %{content_type: "video/mp4"}))

    assert {:error, :empty_audio} = RecordingImports.import_recording(a.id, "", attrs(a, b))
  end

  test "duplicate import of the same bytes is idempotent", %{a: a, b: b} do
    key_on()
    stub_turns(@turns)

    assert {:ok, first, :created} = RecordingImports.import_recording(a.id, @audio, attrs(a, b))
    assert {:ok, second, :duplicate} = RecordingImports.import_recording(a.id, @audio, attrs(a, b))
    assert first.id == second.id
    assert Repo.aggregate(RecordingImport, :count) == 1
    assert Repo.aggregate(TranscriptSegment, :count) == 4
  end

  test "unconfigured Deepgram fails the import honestly — no fabricated transcript",
       %{a: a, b: b} do
    key_off()

    assert {:ok, row, :created} = RecordingImports.import_recording(a.id, @audio, attrs(a, b))
    row = Repo.get!(RecordingImport, row.id)
    assert row.status == "failed"
    assert row.failure_reason =~ "transcription_not_configured"
    assert Repo.aggregate(TranscriptSegment, :count) == 0
    assert CapsuleRead.list_for_owner_browse(a.id) == []
  end

  test "provider error fails the import with the real reason", %{a: a, b: b} do
    key_on()
    stub_raw(Jason.encode!(%{"err_code" => "BAD_REQUEST", "err_msg" => "corrupt audio"}), 400)

    assert {:ok, row, :created} = RecordingImports.import_recording(a.id, @audio, attrs(a, b))
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
          "channels" => [%{"alternatives" => [%{"transcript" => "", "confidence" => 0.0, "words" => []}]}]
        }
      })
    )

    assert {:ok, row, :created} = RecordingImports.import_recording(a.id, @audio, attrs(a, b))
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

    assert {:ok, row, :created} = RecordingImports.import_recording(a.id, @audio, attrs(a, b))
    row = Repo.get!(RecordingImport, row.id)
    assert row.status == "done"
    assert row.unattributed_segment_count == 1

    segments = RecordingImports.segments_for(row)
    assert length(segments) == 2
    refute Enum.any?(segments, &String.contains?(&1["text"], "third voice"))
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
