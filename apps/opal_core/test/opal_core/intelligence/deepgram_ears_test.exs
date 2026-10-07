defmodule OpalCore.Intelligence.DeepgramEarsTest do
  use OpalCore.DataCase, async: false

  alias OpalCore.Intelligence.{AudioIngestor, CallTranscription, DeepgramClient}
  alias OpalCore.Accounts.User
  alias OpalCore.Messaging.{Conversation, ConversationMember}
  alias OpalCore.Repo

  setup do
    # Force stub path regardless of host DEEPGRAM_API_KEY
    prior = System.get_env("DEEPGRAM_API_KEY")
    System.delete_env("DEEPGRAM_API_KEY")
    Application.put_env(:opal_core, :deepgram_api_key, nil)

    on_exit(fn ->
      if prior, do: System.put_env("DEEPGRAM_API_KEY", prior), else: System.delete_env("DEEPGRAM_API_KEY")
    end)

    user =
      %User{}
      |> User.changeset(%{
        handle: "voice-#{System.unique_integer([:positive])}",
        display_name: "Voice Tester"
      })
      |> Repo.insert!()

    peer =
      %User{}
      |> User.changeset(%{
        handle: "chanelle-#{System.unique_integer([:positive])}",
        display_name: "Chanelle"
      })
      |> Repo.insert!()

    conv =
      %Conversation{}
      |> Conversation.changeset(%{label: "voice-test-#{System.unique_integer([:positive])}"})
      |> Repo.insert!()

    for uid <- [user.id, peer.id] do
      %ConversationMember{}
      |> ConversationMember.changeset(%{conversation_id: conv.id, user_id: uid})
      |> Repo.insert!()
    end

    %{user: user, peer: peer, conversation: conv}
  end

  test "DeepgramClient stub returns canned transcript with stub:true" do
    assert {:ok, result} = DeepgramClient.transcribe_batch(<<1, 2, 3, 4>>)
    assert result.stub == true
    assert is_binary(result.transcript)
    assert result.transcript != ""
    assert is_list(result.segments)
  end

  test "stream_interface documents the live-call seam" do
    seam = DeepgramClient.stream_interface()
    assert seam.status == :not_wired
    assert is_binary(seam.url_template)
  end

  test "AudioIngestor voice → message + pipeline", %{user: user, conversation: conv} do
    assert {:ok, result} =
             AudioIngestor.ingest_voice_message(<<9, 9, 9>>, conv.id, user.id,
               stub_transcript: "Yes let's lock it in",
               stub_confidence: 0.95,
               duration_ms: 1200
             )

    assert result.stub == true
    assert result.transcription_uncertain == false
    assert result.message.message_type == "voice_transcript"
    assert result.message.body =~ "lock"
    assert result.event.type == "message.received"
  end

  test "low confidence triggers transcription_uncertain", %{user: user, conversation: conv} do
    assert {:ok, result} =
             AudioIngestor.ingest_voice_message(<<1>>, conv.id, user.id,
               stub_transcript: "mumble something about dinner",
               stub_confidence: 0.3
             )

    assert result.transcription_uncertain == true
    assert get_in(result.event.payload, ["transcription_uncertain"]) == true
  end

  test "call transcription skipped without consent" do
    assert {:ok, %{transcribed: false, reason: :no_consent}} =
             CallTranscription.after_call_ended(%{
               call_id: Ecto.UUID.generate(),
               consent: false,
               recording_audio: <<1, 2, 3>>,
               participant_ids: []
             })
  end

  test "call transcription resolves speaker labels", %{user: user, peer: peer, conversation: conv} do
    assert {:ok, result} =
             CallTranscription.after_call_ended(%{
               call_id: Ecto.UUID.generate(),
               consent: true,
               recording_audio: <<1, 2, 3, 4, 5>>,
               participant_ids: [user.id, peer.id],
               conversation_id: conv.id
             })

    assert result.transcribed == true
    assert Enum.all?(result.segments, fn s ->
             is_binary(s["speaker_label"]) and not String.contains?(s["speaker_label"], "Speaker")
           end)
  end
end
