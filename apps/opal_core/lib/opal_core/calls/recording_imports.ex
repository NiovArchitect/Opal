defmodule OpalCore.Calls.RecordingImports do
  @moduledoc """
  Repair #25 — the import door for call recordings, and the fold that
  turns a transcribed recording into per-party memory.

  SOURCE-AGNOSTIC BY CONSTRUCTION: this door accepts an audio binary
  + declared participants + a consent attestation. It does not know
  or care whether the recording came from a phone, a recorder app, or
  a test factory. A real recording dropped in later walks the exact
  same path as the dummy recordings the wave was proven with.

  CONSENT IS A DOOR CONDITION, NOT A FLAG DAY: an import without a
  recorded attestation (who attested, when, on what basis) is
  REFUSED before anything is stored. The attestation is written to
  the import row and materialized as per-call `AssistConsent` rows —
  the same consent records the live-call transcription path checks —
  so `CallTranscription`'s own consent lookup passes on its own
  evidence, never on an override.

  The pipeline is event-driven: import enqueues an Oban job; every
  state transition broadcasts on PubSub (`call_import:<id>` and
  `call_imports:<user_id>`). No polling anywhere.
  """

  import Ecto.Query
  require Logger

  alias OpalCore.Accounts.User
  alias OpalCore.Calls.{AssistConsent, CallSession, Outcomes, RecordingImport, RecordingStore}
  alias OpalCore.Calls.VoiceAlignment
  alias OpalCore.Intelligence.Extractor
  alias OpalCore.MemoryWallet.CapsuleRead
  alias OpalCore.Messages
  alias OpalCore.Repo
  alias OpalCore.SocialMemory
  alias OpalCore.SocialMemory.{Commitment, PersonMemory, PlanMemory}

  @content_types ~w(audio/wav audio/x-wav audio/wave audio/mpeg audio/mp3 audio/mp4 audio/m4a audio/x-m4a audio/webm audio/ogg)

  def content_types, do: @content_types

  # ------------------------------------------------------------------
  # The door.
  # ------------------------------------------------------------------

  @doc """
  Import a call recording.

  attrs (atom or string keys):
  - `:speaker_user_ids` — exactly two participant user ids in
    diarized-speaker order: index 0 spoke as "speaker 0", index 1 as
    "speaker 1". The uploader must be one of them.
  - `:consent_attested` — must be `true`.
  - `:consent_basis` — non-empty statement of the consent basis.
  - `:content_type`, `:original_filename`, `:language` (default "en-US").

  Returns `{:ok, import, :created}` | `{:ok, import, :duplicate}` |
  `{:error, reason}`. A duplicate is the SAME uploader re-importing
  the SAME bytes: the existing import is returned and nothing is
  stored or enqueued twice (idempotency at the door).
  """
  def import_recording(uploader_id, audio, attrs)
      when is_binary(uploader_id) and is_map(attrs) do
    a = stringify(attrs)

    with {:ok, speakers} <- validate_speakers(uploader_id, a),
         :ok <- validate_consent(uploader_id, a),
         {:ok, content_type} <- validate_audio(audio, a) do
      sha = :crypto.hash(:sha256, audio) |> Base.encode16(case: :lower)

      case Repo.get_by(RecordingImport, uploader_user_id: uploader_id, sha256: sha) do
        %RecordingImport{} = existing ->
          {:ok, existing, :duplicate}

        nil ->
          do_import(uploader_id, audio, a, speakers, content_type, sha)
      end
    end
  end

  def import_recording(_, _, _), do: {:error, :invalid_attrs}

  defp do_import(uploader_id, audio, a, speakers, content_type, sha) do
    [speaker0, speaker1] = speakers
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    with {:ok, stored} <- RecordingStore.put(uploader_id, audio, %{content_type: content_type}),
         {:ok, %{conversation_id: conversation_id}} <-
           Messages.ensure_direct_conversation(speaker0, speaker1),
         {:ok, call} <- create_call_record(uploader_id, speakers, conversation_id, now),
         :ok <- record_consent(call.id, speakers, now),
         {:ok, row} <-
           insert_import(
             uploader_id,
             a,
             speakers,
             content_type,
             sha,
             stored,
             call,
             conversation_id,
             now
           ) do
      case enqueue(row) do
        :ok ->
          broadcast(row, "received")
          # Re-read: with inline job execution (tests) the pipeline
          # may already have advanced the row; the door always
          # answers with the row's current truth, never a stale copy.
          {:ok, Repo.get!(RecordingImport, row.id), :created}

        {:error, reason} ->
          Logger.warning(
            "recording_import.enqueue_failed import=#{row.id} reason=#{inspect(reason)}"
          )

          {:ok, failed} = fail(row, "enqueue_failed")
          {:ok, failed, :created}
      end
    else
      {:error, reason} -> {:error, reason}
    end
  end

  defp insert_import(
         uploader_id,
         a,
         speakers,
         content_type,
         sha,
         stored,
         call,
         conversation_id,
         now
       ) do
    speaker_map =
      speakers
      |> Enum.with_index()
      |> Map.new(fn {user_id, idx} -> {Integer.to_string(idx), user_id} end)

    %RecordingImport{}
    |> RecordingImport.create_changeset(%{
      uploader_user_id: uploader_id,
      call_id: call.id,
      conversation_id: conversation_id,
      speaker_map: speaker_map,
      status: "received",
      storage_key: stored["storage_key"],
      original_filename: a["original_filename"],
      content_type: content_type,
      byte_size: stored["byte_size"],
      sha256: sha,
      language: a["language"] || "en-US",
      consent_attested_by_user_id: uploader_id,
      consent_attested_at: now,
      consent_basis: String.trim(a["consent_basis"])
    })
    |> Repo.insert()
  end

  defp create_call_record(uploader_id, [speaker0, speaker1], conversation_id, now) do
    callee = if uploader_id == speaker0, do: speaker1, else: speaker0

    with {:ok, call} <-
           CallSession.create_changeset(%{
             caller_user_id: uploader_id,
             callee_user_id: callee,
             conversation_id: conversation_id,
             status: "ended",
             correlation_id: "recording-import",
             ringing_at: now
           })
           |> Repo.insert(),
         {:ok, call} <-
           call
           |> CallSession.transition_changeset(%{
             status: "ended",
             ended_reason: "imported_recording",
             answered_at: now,
             ended_at: now
           })
           |> Repo.update() do
      {:ok, call}
    end
  end

  defp record_consent(call_id, speakers, now) do
    Enum.each(speakers, fn user_id ->
      %AssistConsent{}
      |> AssistConsent.changeset(%{
        call_id: call_id,
        user_id: user_id,
        allowed: true,
        allowed_at: now,
        source: "recording_import_attestation"
      })
      |> Repo.insert(on_conflict: :nothing)
    end)

    :ok
  end

  defp enqueue(row) do
    %{import_id: row.id}
    |> OpalCore.Calls.Workers.RecordingImportWorker.new()
    |> Oban.insert()
    |> case do
      {:ok, _job} -> :ok
      {:error, reason} -> {:error, reason}
    end
  end

  # ------------------------------------------------------------------
  # Validation — every refusal is honest and happens before storage.
  # ------------------------------------------------------------------

  defp validate_speakers(uploader_id, a) do
    speakers = a["speaker_user_ids"] || a["participant_user_ids"] || []

    cond do
      not is_list(speakers) or length(speakers) != 2 ->
        {:error, :exactly_two_participants_required}

      Enum.uniq(speakers) != speakers ->
        {:error, :participants_must_differ}

      uploader_id not in speakers ->
        {:error, :uploader_not_participant}

      not Enum.all?(speakers, &match?(%User{}, Repo.get(User, &1))) ->
        {:error, :unknown_participant}

      true ->
        {:ok, speakers}
    end
  end

  defp validate_consent(uploader_id, a) do
    attested = a["consent_attested"] == true or a["consent_attested"] == "true"
    basis = a["consent_basis"]

    cond do
      not attested ->
        {:error, :consent_attestation_required}

      not is_binary(basis) or String.trim(basis) == "" ->
        {:error, :consent_basis_required}

      true ->
        _ = uploader_id
        :ok
    end
  end

  defp validate_audio(audio, a) do
    content_type = a["content_type"]

    cond do
      not is_binary(audio) or audio == "" ->
        {:error, :empty_audio}

      byte_size(audio) > RecordingStore.max_bytes() ->
        {:error, :recording_too_large}

      content_type not in @content_types ->
        {:error, :unsupported_format}

      true ->
        {:ok, content_type}
    end
  end

  # ------------------------------------------------------------------
  # Reads — participants and uploader only; existence never leaks.
  # ------------------------------------------------------------------

  def get_for(import_id, user_id) when is_binary(import_id) and is_binary(user_id) do
    case Repo.get(RecordingImport, import_id) do
      %RecordingImport{} = row ->
        if user_id == row.uploader_user_id or user_id in RecordingImport.participant_ids(row) do
          {:ok, row}
        else
          {:error, :not_found}
        end

      nil ->
        {:error, :not_found}
    end
  end

  def get_for(_, _), do: {:error, :not_found}

  def list_for_user(user_id) when is_binary(user_id) do
    from(r in RecordingImport,
      where:
        r.uploader_user_id == ^user_id or
          fragment(
            "EXISTS (SELECT 1 FROM jsonb_each_text(?) j WHERE j.value = ?)",
            r.speaker_map,
            ^user_id
          ),
      order_by: [desc: r.inserted_at]
    )
    |> Repo.all()
  end

  def list_for_user(_), do: []

  @doc "Persisted transcript segments for the import's call, speaker names resolved."
  def segments_for(%RecordingImport{call_id: call_id}) when is_binary(call_id) do
    alias OpalCore.Calls.TranscriptSegment

    rows =
      from(s in TranscriptSegment,
        where: s.call_id == ^call_id,
        order_by: [asc: s.sequence]
      )
      |> Repo.all()

    names =
      rows
      |> Enum.map(& &1.speaker_user_id)
      |> Enum.uniq()
      |> Map.new(fn id -> {id, display_name(id)} end)

    Enum.map(rows, fn s ->
      %{
        "id" => s.id,
        "sequence" => s.sequence,
        "speaker_user_id" => s.speaker_user_id,
        "speaker_name" => Map.get(names, s.speaker_user_id),
        "text" => s.text,
        "final" => s.final,
        "confidence" => s.confidence,
        "provider" => s.provider
      }
    end)
  end

  def segments_for(_), do: []

  # ------------------------------------------------------------------
  # Lifecycle transitions (worker-facing). Each writes its timing
  # stamp and broadcasts; status only ever moves forward or to failed.
  # ------------------------------------------------------------------

  def begin_transcription(%RecordingImport{} = row) do
    transition(row, %{
      status: "transcribing",
      transcription_started_at: DateTime.utc_now() |> DateTime.truncate(:microsecond)
    })
  end

  def begin_fold(%RecordingImport{} = row, meta) do
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    transcription_ms =
      if row.transcription_started_at,
        do: DateTime.diff(now, row.transcription_started_at, :millisecond)

    transition(row, %{
      status: "folding",
      transcribed_at: now,
      transcription_ms: transcription_ms,
      provider: meta[:provider] || "deepgram",
      confidence: meta[:confidence]
    })
  end

  def complete(%RecordingImport{} = row, meta) do
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    fold_ms =
      if row.transcribed_at, do: DateTime.diff(now, row.transcribed_at, :millisecond)

    total_ms =
      if row.inserted_at, do: DateTime.diff(now, row.inserted_at, :millisecond)

    transition(row, %{
      status: "done",
      folded_at: now,
      fold_ms: fold_ms,
      total_ms: total_ms,
      segment_count: meta[:segment_count] || 0,
      unattributed_segment_count: meta[:unattributed_segment_count] || 0,
      capsule_ids: meta[:capsule_ids] || %{}
    })
  end

  def fail(%RecordingImport{} = row, reason) when is_binary(reason) do
    # failure_reason is varchar(255): slicing to 500 (the original
    # R25 code) made any 256..500-char reason raise 22001 inside the
    # worker, discarding the job and stranding the import at
    # "transcribing" forever (found by R26's corrupt-file proof leg,
    # whose ffmpeg-excerpt reasons are long). Slice to the column.
    transition(row, %{status: "failed", failure_reason: String.slice(reason, 0, 255)})
  end

  defp transition(row, attrs) do
    row
    |> RecordingImport.transition_changeset(attrs)
    |> Repo.update()
    |> case do
      {:ok, updated} ->
        broadcast(updated, updated.status)
        {:ok, updated}

      {:error, _} = err ->
        err
    end
  end

  defp broadcast(%RecordingImport{} = row, event) do
    payload = %{"event" => event, "import" => RecordingImport.to_contract(row)}

    Phoenix.PubSub.broadcast(
      OpalCore.PubSub,
      "call_import:#{row.id}",
      {:call_import, event, payload}
    )

    for user_id <- [row.uploader_user_id | RecordingImport.participant_ids(row)] |> Enum.uniq() do
      Phoenix.PubSub.broadcast(
        OpalCore.PubSub,
        "call_imports:#{user_id}",
        {:call_import, event, payload}
      )
    end

    :ok
  end

  # ------------------------------------------------------------------
  # The fold — the same machinery the live-call path folds with.
  # ------------------------------------------------------------------

  @doc """
  Fold a transcribed recording's diarized segments into memory.

  `resolved_segments` is the shape `CallTranscription` produces:
  speaker indices already carried through diarization. Each
  attributed segment is persisted as a real `TranscriptSegment` and
  folded exactly the way `Calls.Assist.store_final/4` folds a live
  segment (VoiceAlignment + Outcomes), plus the Pipeline's
  SocialMemory fanout for both parties. Segments whose diarized
  speaker index has no declared participant are counted as
  unattributed and are NEVER guessed into someone's mouth.

  Ends with one provenance-tagged capsule per party via the one
  capsule write path (`CapsuleRead.remember/2`).
  """
  def fold(%RecordingImport{} = row, %CallSession{} = call, resolved_segments, confidence)
      when is_list(resolved_segments) do
    participants = RecordingImport.participant_ids(row)

    {persisted, unattributed} =
      resolved_segments
      |> Enum.with_index()
      |> Enum.reduce({[], 0}, fn {seg, position}, {acc, unattr} ->
        idx = seg["speaker_index"] || seg[:speaker_index] || 0
        speaker_id = row.speaker_map[Integer.to_string(idx)] || row.speaker_map[idx]
        text = String.trim(seg["text"] || seg[:text] || "")

        cond do
          not is_binary(speaker_id) ->
            {acc, unattr + 1}

          text == "" ->
            {acc, unattr}

          true ->
            case persist_segment(row, call, position, speaker_id, text, confidence) do
              {:ok, segment_row, :new} ->
                fold_segment(row, call, segment_row, participants)
                {[segment_row | acc], unattr}

              {:ok, _existing, :existing} ->
                {acc, unattr}

              {:error, _} ->
                {acc, unattr}
            end
        end
      end)

    capsule_ids =
      if persisted == [] do
        %{}
      else
        build_capsules(row, call, participants, persisted, confidence)
      end

    {:ok,
     %{
       segment_count: length(persisted),
       unattributed_segment_count: unattributed,
       capsule_ids: capsule_ids
     }}
  end

  defp persist_segment(row, call, position, speaker_id, text, confidence) do
    alias OpalCore.Calls.TranscriptSegment

    provider_segment_id = "import-#{row.id}-#{position}"

    case Repo.get_by(TranscriptSegment,
           call_id: call.id,
           provider_segment_id: provider_segment_id
         ) do
      %TranscriptSegment{} = existing ->
        {:ok, existing, :existing}

      nil ->
        sequence =
          Repo.aggregate(
            from(s in TranscriptSegment, where: s.call_id == ^call.id),
            :count
          ) + 1

        %TranscriptSegment{}
        |> TranscriptSegment.changeset(%{
          call_id: call.id,
          conversation_id: call.conversation_id,
          speaker_user_id: speaker_id,
          sequence: sequence,
          text: text,
          final: true,
          confidence: confidence,
          language: row.language,
          provider: "deepgram",
          provider_segment_id: provider_segment_id
        })
        |> Repo.insert()
        |> case do
          {:ok, segment_row} -> {:ok, segment_row, :new}
          {:error, _} = err -> err
        end
    end
  end

  defp fold_segment(row, call, segment_row, participants) do
    attrs = %{
      "text" => segment_row.text,
      "speaker_user_id" => segment_row.speaker_user_id,
      "call_id" => call.id,
      "source_segment_id" => segment_row.id,
      "confidence" => segment_row.confidence,
      "source_type" => "call_transcript"
    }

    folded =
      if is_binary(call.conversation_id) do
        VoiceAlignment.record(call.conversation_id, attrs)
      else
        {:ok, :no_conversation}
      end

    case folded do
      {:ok, state} when is_map(state) -> Outcomes.record_proposal(call, segment_row, state)
      _ -> :skipped
    end

    if is_binary(call.conversation_id) do
      _ = Outcomes.maybe_record_commitment(call.conversation_id, attrs)
      _ = Outcomes.maybe_record_open_question(call.conversation_id, attrs)
      _ = Outcomes.maybe_record_waiting_on(call.conversation_id, attrs)
      social_memory_fanout(row, call, segment_row, participants)
    end

    :ok
  end

  defp social_memory_fanout(row, call, segment_row, participants) do
    {intent, entities, vibe} = Extractor.classify_message(segment_row.text)
    extraction = %{intent: intent, entities: entities, vibe: vibe}

    Enum.each(participants, fn account_id ->
      _ =
        SocialMemory.ingest(account_id, call.conversation_id, segment_row.id, extraction, %{
          sender_id: segment_row.speaker_user_id,
          body: segment_row.text,
          timestamp: DateTime.utc_now(),
          participant_ids: participants,
          language: row.language
        })
    end)

    _ = row
    :ok
  end

  defp build_capsules(row, call, participants, persisted, confidence) do
    segment_ids = MapSet.new(Enum.map(persisted, & &1.id))

    Map.new(participants, fn owner_id ->
      other_id = Enum.find(participants, &(&1 != owner_id))

      summary =
        capsule_summary(
          owner_id,
          other_id,
          call,
          segment_ids,
          persisted,
          confidence,
          row.inserted_at
        )

      case CapsuleRead.remember(owner_id, %{
             "summary" => summary,
             "kind" => "call_recording",
             "scope_kind" => "conversation",
             "scope_id" => call.conversation_id,
             "counterpart_user_id" => other_id,
             "purpose" => "call_ingestion",
             "source_kind" => "imported_call_recording",
             "source_label" => "Imported call recording",
             "learned_from_kind" => "call_transcript"
           }) do
        {:ok, capsule} -> {owner_id, capsule.id}
        _ -> {owner_id, nil}
      end
    end)
    |> Enum.reject(fn {_, v} -> is_nil(v) end)
    |> Map.new()
  end

  defp capsule_summary(owner_id, other_id, call, segment_ids, persisted, confidence, since) do
    other_name = display_name(other_id)
    mine = Enum.count(persisted, &(&1.speaker_user_id == owner_id))
    theirs = length(persisted) - mine

    durable = durable_lines(owner_id, call.conversation_id, segment_ids, since)

    base =
      "Call with #{other_name} (imported recording): #{length(persisted)} utterances " <>
        "(#{mine} by you, #{theirs} by #{other_name}), transcript confidence " <>
        "#{format_confidence(confidence)}."

    case durable do
      [] -> base <> " No durable facts extracted."
      lines -> base <> " Learned: " <> Enum.join(lines, "; ") <> "."
    end
  end

  # Durable lines for THIS call only. Commitments carry the exact
  # source segment id, so they scope precisely. Facts and plan
  # memories are conversation-scoped stores with no per-call key, so
  # they are scoped by their own timestamps to what this import's
  # fold learned or touched (learned_at / updated_at at or after the
  # import was created) — a capsule never takes credit for an
  # earlier call's facts.
  defp durable_lines(owner_id, conversation_id, segment_ids, since) do
    commitments =
      from(c in Commitment,
        where:
          c.account_id == ^owner_id and c.source_conversation_id == ^conversation_id and
            c.source_message_id in ^MapSet.to_list(segment_ids),
        select: c.description
      )
      |> Repo.all()
      |> Enum.map(&("commitment: " <> String.slice(&1, 0, 120)))

    facts =
      from(p in PersonMemory,
        where: p.account_id == ^owner_id,
        select: p.known_facts
      )
      |> Repo.all()
      |> Enum.flat_map(fn facts ->
        facts
        |> Map.values()
        |> Enum.filter(fn v ->
          is_map(v) and v["source_conversation_id"] == conversation_id and
            learned_in_window?(v["learned_at"], since)
        end)
        |> Enum.map(&("fact: " <> String.slice(&1["value"] || "", 0, 120)))
      end)

    plans =
      from(p in PlanMemory,
        where:
          p.account_id == ^owner_id and p.updated_at >= ^since and
            ^conversation_id in p.related_conversation_ids,
        select: {p.plan_label, p.time_label, p.place_label}
      )
      |> Repo.all()
      |> Enum.map(fn {label, time, place} ->
        parts =
          [label, time, place]
          |> Enum.map(&render_label/1)
          |> Enum.reject(&(&1 in [nil, ""]))

        "plan: " <> Enum.join(parts, " · ")
      end)

    (commitments ++ facts ++ plans) |> Enum.uniq() |> Enum.take(6)
  end

  defp learned_in_window?(learned_at, %DateTime{} = since) when is_binary(learned_at) do
    case DateTime.from_iso8601(learned_at) do
      {:ok, at, _} -> DateTime.compare(at, since) != :lt
      _ -> false
    end
  end

  defp learned_in_window?(_, _), do: false

  # Stored labels are usually strings, but the plan fold can persist
  # a word list — render either honestly rather than crashing.
  defp render_label(nil), do: nil
  defp render_label(label) when is_binary(label), do: label
  defp render_label(label) when is_list(label), do: Enum.join(label, " ")
  defp render_label(other), do: inspect(other)

  defp display_name(user_id) when is_binary(user_id) do
    case Repo.get(User, user_id) do
      %User{display_name: name} when is_binary(name) and name != "" -> name
      _ -> "the other participant"
    end
  end

  defp display_name(_), do: "the other participant"

  defp format_confidence(c) when is_number(c), do: :erlang.float_to_binary(c * 1.0, decimals: 2)
  defp format_confidence(_), do: "unknown"

  # NOTE: Deepgram reports segment start/end as offsets into the
  # recording, not wall-clock times; the recording's own start time
  # is unknown, so segment rows honestly carry no started/ended
  # stamps rather than fabricated ones.

  defp stringify(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {Atom.to_string(k), v}
      {k, v} -> {to_string(k), v}
    end)
  end
end
