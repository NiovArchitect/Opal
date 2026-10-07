defmodule OpalCore.Intelligence.CallTranscription do
  @moduledoc """
  Post-call diarized transcription → key moments → thread surface.

  Privacy: requires per-call transcription consent on the call record /
  AssistConsent. No consent → no Deepgram call (no exceptions).

  Speaker labels: "Speaker 0" is resolved via call participant list to
  display names. Raw speaker indices never reach the user.
  """

  require Logger

  alias OpalCore.Calls.AssistConsent
  alias OpalCore.Intelligence.{DeepgramClient, EventIngestor, Extractor, Pipeline}
  alias OpalCore.Messages
  alias OpalCore.Repo
  alias OpalCore.Accounts.User

  import Ecto.Query

  @doc """
  After call.ended: optionally transcribe recording.

  attrs:
  - `:call_id` (required)
  - `:recording_audio` binary (required when consent)
  - `:recording_url`
  - `:participant_ids` [user_id] ordered (speaker index maps to this list)
  - `:conversation_id`
  - `:consent` boolean override (else looked up)
  - `:content_type`
  """
  def after_call_ended(attrs) when is_map(attrs) do
    call_id = fetch(attrs, :call_id)
    consent? = consented?(call_id, attrs)

    if not consent? do
      Logger.info("call_transcription.skipped_no_consent call_id=#{call_id}")
      {:ok, %{transcribed: false, reason: :no_consent}}
    else
      audio = fetch(attrs, :recording_audio)

      if not is_binary(audio) or audio == "" do
        {:error, :missing_recording}
      else
        do_transcribe(call_id, audio, attrs)
      end
    end
  end

  def after_call_ended(_), do: {:error, :invalid_attrs}

  defp do_transcribe(call_id, audio, attrs) do
    opts = [
      content_type: Map.get(attrs, :content_type) || Map.get(attrs, "content_type") || "audio/wav"
    ]

    with {:ok, dg} <- DeepgramClient.transcribe_batch(audio, opts),
         resolved <- resolve_speakers(dg.segments, attrs),
         {:ok, event} <- ingest_call_event(call_id, dg, resolved, attrs),
         {:ok, moment} <- maybe_surface_key_moment(resolved, dg, attrs) do
      {:ok,
       %{
         transcribed: true,
         stub: dg.stub == true,
         confidence: dg.confidence,
         segments: resolved,
         event: event,
         key_moment: moment
       }}
    end
  end

  defp consented?(call_id, attrs) do
    case Map.get(attrs, :consent) || Map.get(attrs, "consent") do
      true -> true
      false -> false
      _ ->
        from(c in AssistConsent,
          where: c.call_id == ^call_id and c.allowed == true and is_nil(c.revoked_at),
          select: c.id,
          limit: 1
        )
        |> Repo.one()
        |> is_binary()
    end
  end

  @doc "Map speaker indices to participant display names. Never returns 'Speaker N'."
  def resolve_speakers(segments, attrs) when is_list(segments) do
    participants = Map.get(attrs, :participant_ids) || Map.get(attrs, "participant_ids") || []
    names = participant_names(participants)

    Enum.map(segments, fn seg ->
      idx = seg["speaker"] || seg[:speaker] || 0
      idx = if is_integer(idx), do: idx, else: 0
      label = Enum.at(names, idx) || Enum.at(names, 0) || "Someone"
      text = seg["text"] || seg[:text] || ""

      %{
        "speaker_index" => idx,
        "speaker_label" => label,
        "text" => text,
        "start" => seg["start"] || seg[:start],
        "end" => seg["end"] || seg[:end]
      }
    end)
  end

  def resolve_speakers(_, _), do: []

  defp participant_names(ids) when is_list(ids) do
    Enum.map(ids, fn id ->
      case Repo.get(User, id) do
        %User{display_name: name} when is_binary(name) and name != "" -> name
        _ -> "Someone"
      end
    end)
  end

  defp participant_names(_), do: []

  defp ingest_call_event(call_id, dg, resolved, attrs) do
    actor = List.first(Map.get(attrs, :participant_ids) || []) || "system"
    conversation_id = Map.get(attrs, :conversation_id) || Map.get(attrs, "conversation_id")

    EventIngestor.ingest(%{
      type: "call.transcribed",
      actor_id: actor,
      conversation_id: conversation_id,
      idempotency_key: "call.transcribed:#{call_id}",
      payload: %{
        "call_id" => call_id,
        "transcript" => dg.transcript,
        "segments" => resolved,
        "transcription_confidence" => dg.confidence,
        "transcription_uncertain" => DeepgramClient.uncertain?(dg.confidence),
        "stub" => dg.stub == true,
        "recording_url" => Map.get(attrs, :recording_url) || Map.get(attrs, "recording_url")
      }
    })
  end

  defp maybe_surface_key_moment(resolved, dg, attrs) do
    conversation_id = Map.get(attrs, :conversation_id) || Map.get(attrs, "conversation_id")
    actor = List.first(Map.get(attrs, :participant_ids) || [])

    if not is_binary(conversation_id) or not is_binary(actor) do
      {:ok, nil}
    else
      # Run extractor on combined transcript for plan intents
      {intent, _entities, _vibe} = Extractor.classify_message(dg.transcript || "")

      if intent in ["plan.propose", "plan.confirm", "plan.question", "plan.counter"] do
        labels =
          resolved
          |> Enum.map(& &1["speaker_label"])
          |> Enum.uniq()
          |> Enum.take(2)

        who =
          case labels do
            [a, b] -> "#{a} and #{b}"
            [a] -> a
            _ -> "You"
          end

        # Surface a short Opal system-style message into the thread
        body =
          case intent do
            "plan.confirm" ->
              "#{who} locked something in on the call — want me to hold it on the graph?"

            "plan.propose" ->
              snippet = String.slice(dg.transcript || "", 0, 80)
              "#{who} discussed plans on the call (#{snippet}) — want me to lock it in?"

            _ ->
              "#{who} talked through plans on the call — I can hold the next step."
          end

        case Messages.accept_message(%{
               conversation_id: conversation_id,
               sender_user_id: actor,
               client_message_id: "call-moment-#{System.unique_integer([:positive])}",
               message_type: "text",
               body: body
             }) do
          {:ok, msg, _} ->
            _ = Pipeline.on_message_created(msg, %{conversation_id: conversation_id})
            {:ok, %{intent: intent, message_id: msg.id, body: body}}

          err ->
            Logger.warning("call_transcription.surface_failed #{inspect(err)}")
            {:ok, nil}
        end
      else
        {:ok, nil}
      end
    end
  end

  defp fetch(attrs, key) do
    Map.get(attrs, key) || Map.get(attrs, Atom.to_string(key))
  end
end
