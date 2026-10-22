defmodule OpalCore.Intelligence.DeepgramEarsTest do
  use OpalCore.DataCase, async: false

  alias OpalCore.Intelligence.{AudioIngestor, CallTranscription, DeepgramClient, Extractor}
  alias OpalCore.Accounts.User
  alias OpalCore.Messaging.{Conversation, ConversationMember}
  alias OpalCore.Repo

  setup do
    # Repair #18 BS-4: the canned-transcript stub is GONE. These tests
    # run the real client against a provider-shaped response injected
    # through the :deepgram_http_fun transport seam, with a (fake) key
    # present so configured?/0 is true.
    prior = System.get_env("DEEPGRAM_API_KEY")
    prior_app_key = Application.get_env(:opal_core, :deepgram_api_key)
    prior_fun = Application.get_env(:opal_core, :deepgram_http_fun)

    System.put_env("DEEPGRAM_API_KEY", "test-key-not-real")
    Application.delete_env(:opal_core, :deepgram_api_key)

    on_exit(fn ->
      if prior,
        do: System.put_env("DEEPGRAM_API_KEY", prior),
        else: System.delete_env("DEEPGRAM_API_KEY")

      restore_app(:deepgram_api_key, prior_app_key)
      restore_app(:deepgram_http_fun, prior_fun)
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

  defp restore_app(key, nil), do: Application.delete_env(:opal_core, key)
  defp restore_app(key, val), do: Application.put_env(:opal_core, key, val)

  # Install a provider-shaped Deepgram response at the transport seam.
  defp stub_provider(transcript, confidence) do
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

  test "DeepgramClient returns the provider transcript (no canned text anywhere)" do
    stub_provider("The provider heard this", 0.93)

    assert {:ok, result} = DeepgramClient.transcribe_batch(<<1, 2, 3, 4>>)
    assert result.stub == false
    assert result.transcript == "The provider heard this"
    refute result.transcript =~ "Juniper"
    assert is_list(result.segments)
  end

  test "DeepgramClient unkeyed is an honest disabled, never a canned transcript" do
    System.delete_env("DEEPGRAM_API_KEY")
    Application.put_env(:opal_core, :deepgram_api_key, nil)
    Application.delete_env(:opal_core, :deepgram_http_fun)

    assert {:disabled, "transcription not configured"} =
             DeepgramClient.transcribe_batch(<<1, 2, 3, 4>>)

    refute DeepgramClient.configured?()
  end

  test "diarized segments prefer punctuated_word so capitalization cues survive (R26 F-3)" do
    # Provider-shaped words: raw `word` is lowercase; `punctuated_word`
    # carries the smart_format capitalization/punctuation. One word
    # omits `punctuated_word` entirely and must fall back to `word`.
    words = [
      %{
        "word" => "let's",
        "punctuated_word" => "Let's",
        "speaker" => 0,
        "start" => 0.0,
        "end" => 0.25,
        "confidence" => 0.98
      },
      %{
        "word" => "do",
        "punctuated_word" => "do",
        "speaker" => 0,
        "start" => 0.3,
        "end" => 0.5,
        "confidence" => 0.98
      },
      %{
        "word" => "dinner",
        "punctuated_word" => "dinner",
        "speaker" => 0,
        "start" => 0.55,
        "end" => 0.9,
        "confidence" => 0.98
      },
      %{
        "word" => "at",
        "punctuated_word" => "at",
        "speaker" => 0,
        "start" => 0.95,
        "end" => 1.1,
        "confidence" => 0.98
      },
      %{
        "word" => "juniper",
        "punctuated_word" => "Juniper",
        "speaker" => 0,
        "start" => 1.15,
        "end" => 1.5,
        "confidence" => 0.98
      },
      %{
        "word" => "and",
        "punctuated_word" => "and",
        "speaker" => 0,
        "start" => 1.55,
        "end" => 1.7,
        "confidence" => 0.98
      },
      %{
        "word" => "ivy.",
        "punctuated_word" => "Ivy.",
        "speaker" => 0,
        "start" => 1.75,
        "end" => 2.0,
        "confidence" => 0.98
      },
      %{"word" => "tonight", "speaker" => 0, "start" => 2.05, "end" => 2.4, "confidence" => 0.98},
      %{
        "word" => "sounds",
        "punctuated_word" => "Sounds",
        "speaker" => 1,
        "start" => 2.5,
        "end" => 2.8,
        "confidence" => 0.97
      },
      %{
        "word" => "good.",
        "punctuated_word" => "good.",
        "speaker" => 1,
        "start" => 2.85,
        "end" => 3.1,
        "confidence" => 0.97
      }
    ]

    body =
      Jason.encode!(%{
        "results" => %{
          "channels" => [
            %{
              "alternatives" => [
                %{
                  "transcript" => "Let's do dinner at Juniper and Ivy. tonight Sounds good.",
                  "confidence" => 0.98,
                  "words" => words
                }
              ]
            }
          ]
        }
      })

    Application.put_env(:opal_core, :deepgram_http_fun, fn _url, _headers, _audio, _ct ->
      {:ok, 200, body}
    end)

    assert {:ok, result} = DeepgramClient.transcribe_batch(<<1, 2, 3, 4>>)
    assert length(result.segments) == 2

    first = Enum.at(result.segments, 0)
    assert first["speaker"] == 0
    assert first["text"] =~ "Let's"
    assert first["text"] =~ "Juniper"
    assert first["text"] =~ "Ivy."
    # the word without punctuated_word fell back to the raw word
    assert first["text"] =~ "tonight"

    second = Enum.at(result.segments, 1)
    assert second["text"] == "Sounds good."

    # The whole point of the fix: the extractor's capitalization cues
    # can now fire on segment text.
    {_intent, entities, _vibe} = Extractor.classify_message(first["text"])
    assert entities["place"] == "Juniper and Ivy"
  end

  test "stream_interface documents the live-call seam" do
    seam = DeepgramClient.stream_interface()
    assert seam.status == :not_wired
    assert is_binary(seam.url_template)
  end

  test "AudioIngestor voice → message + pipeline", %{user: user, conversation: conv} do
    stub_provider("Yes let's lock it in", 0.95)

    assert {:ok, result} =
             AudioIngestor.ingest_voice_message(<<9, 9, 9>>, conv.id, user.id, duration_ms: 1200)

    assert result.stub == false
    assert result.transcription_uncertain == false
    assert result.message.message_type == "voice_transcript"
    assert result.message.body =~ "lock"
    assert result.event.type == "message.received"
  end

  test "low confidence triggers transcription_uncertain", %{user: user, conversation: conv} do
    stub_provider("mumble something about dinner", 0.3)

    assert {:ok, result} =
             AudioIngestor.ingest_voice_message(<<1>>, conv.id, user.id, [])

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
    stub_provider("Dinner on Saturday sounds good", 0.9)

    assert {:ok, result} =
             CallTranscription.after_call_ended(%{
               call_id: Ecto.UUID.generate(),
               consent: true,
               recording_audio: <<1, 2, 3, 4, 5>>,
               participant_ids: [user.id, peer.id],
               conversation_id: conv.id
             })

    assert result.transcribed == true
    assert result.stub == false

    assert Enum.all?(result.segments, fn s ->
             is_binary(s["speaker_label"]) and not String.contains?(s["speaker_label"], "Speaker")
           end)
  end
end
