defmodule OpalCore.Voice do
  @moduledoc """
  Paste G Phase 10 — cloud TTS voice notes + listen honesty.

  **Speak path:** text approval is MANDATORY. Never freelance speech from
  unapproved model output. Callers pass `approved: true` (or `"approved" => true`)
  with the exact text that will be spoken; that text is echoed into the
  conversation voice message body.

  **Providers:** ElevenLabs primary (`ELEVENLABS_API_KEY`). OpenAI TTS is a
  documented fallback when ElevenLabs is absent but `OPENAI_API_KEY` (or
  `OPAL_LLM_API_KEY` with an OpenAI-compatible base that supports `/audio/speech`)
  is present — useful for local/dev so founders can still hear a voice note
  without waiting on ElevenLabs provisioning. Brand voice ID stays ElevenLabs-
  first (founder-tunable comment on the ElevenLabs module).

  **Listen path:** receiving others' voice notes needs Deepgram. Without
  `DEEPGRAM_API_KEY`, `listen/1` returns an honest disabled message
  (`"I can't listen to voice notes yet"`). See BLOCKED.md.
  """

  alias OpalCore.Intelligence.DeepgramClient
  alias OpalCore.Messages
  alias OpalCore.Messaging.Message
  alias OpalCore.Voice.{AudioStore, ElevenLabs, OpenAITTS, PromptGuard}

  @listen_disabled "I can't listen to voice notes yet"

  @doc """
  Synthesize approved text to audio.

  opts / attrs:
  - `:text` / `"text"` (required)
  - `:approved` / `"approved"` must be true
  - `:conversation_id` optional — when set, delivers a voice_transcript message
  - `:account_id` / `:sender_user_id` required when delivering
  - `:provider` optional override (`:elevenlabs` | `:openai` | `:stub`)
  - `:stub_audio` test-only binary

  Returns `{:ok, result}` | `{:disabled, reason}` | `{:error, reason}`.
  """
  def speak(attrs, opts \\ []) when is_map(attrs) do
    text = attrs[:text] || attrs["text"]
    approved? = truthy?(attrs[:approved] || attrs["approved"])
    account_id = attrs[:account_id] || attrs["account_id"] || attrs[:sender_user_id] || attrs["sender_user_id"]
    conversation_id = attrs[:conversation_id] || attrs["conversation_id"]

    cond do
      not is_binary(text) or String.trim(text) == "" ->
        {:error, :text_required}

      not approved? ->
        {:error, :approval_required}

      true ->
        trimmed = String.trim(text)

        case PromptGuard.check(trimmed) do
          {:refuse, reason} ->
            {:error, {:prompt_injection, reason}}

          {:quote_back, safe_text} ->
            {:error, {:approval_quote_back, safe_text}}

          :ok ->
            do_speak(trimmed, account_id, conversation_id, opts)
        end
    end
  end

  def speak(_, _), do: {:error, :invalid}

  @doc """
  Product listen gate for inbound voice notes.

  Without Deepgram → `{:disabled, "#{@listen_disabled}"}`.
  With Deepgram → `{:ok, :ready}` (actual STT remains AudioIngestor).
  """
  def listen(_attrs \\ %{}) do
    if DeepgramClient.configured?() do
      {:ok, :ready}
    else
      {:disabled, @listen_disabled}
    end
  end

  def listen_disabled_message, do: @listen_disabled

  @doc "True when any TTS provider key is configured (or test stub allowed)."
  def tts_configured?(opts \\ []) do
    Keyword.get(opts, :allow_test_stub, false) == true or
      ElevenLabs.configured?() or
      OpenAITTS.configured?()
  end

  defp do_speak(text, account_id, conversation_id, opts) do
    allow_stub? = Keyword.get(opts, :allow_test_stub, false) == true and Mix.env() == :test

    with {:ok, audio, meta} <- synthesize(text, opts, allow_stub?),
         {:ok, stored} <- AudioStore.put(account_id || "anon", audio, meta) do
      audio_url = AudioStore.public_url(stored)

      result = %{
        audio_url: audio_url,
        storage_key: stored["storage_key"],
        text: text,
        provider: meta[:provider] || meta["provider"],
        content_type: stored["mime_type"]
      }

      case maybe_deliver(account_id, conversation_id, text, stored["storage_key"], opts) do
        {:ok, message} -> {:ok, Map.put(result, :message, message)}
        :skip -> {:ok, result}
        {:error, _} = err -> err
      end
    end
  end

  defp synthesize(text, opts, allow_stub?) do
    stub_audio = Keyword.get(opts, :stub_audio)
    provider = Keyword.get(opts, :provider)

    cond do
      is_binary(stub_audio) and allow_stub? ->
        {:ok, stub_audio, %{provider: "stub", content_type: "audio/mpeg"}}

      provider == :stub and allow_stub? ->
        {:ok, "stub-audio-bytes", %{provider: "stub", content_type: "audio/mpeg"}}

      provider == :openai ->
        OpenAITTS.synthesize(text, opts)

      provider == :elevenlabs ->
        ElevenLabs.synthesize(text, opts)

      ElevenLabs.configured?() ->
        ElevenLabs.synthesize(text, opts)

      OpenAITTS.configured?() ->
        OpenAITTS.synthesize(text, opts)

      allow_stub? ->
        {:ok, "stub-audio-bytes", %{provider: "stub", content_type: "audio/mpeg"}}

      true ->
        {:disabled, "ELEVENLABS_API_KEY missing"}
    end
  end

  defp maybe_deliver(account_id, conversation_id, text, storage_key, opts)
       when is_binary(account_id) and is_binary(conversation_id) do
    client_id =
      Keyword.get(opts, :client_message_id) ||
        "tts-#{System.unique_integer([:positive])}"

    # Compact media hint — messages.source_language is varchar(255).
    # Body carries the full approved text; hint only flags TTS + storage key.
    attrs = %{
      conversation_id: conversation_id,
      sender_user_id: account_id,
      client_message_id: client_id,
      message_type: "voice_transcript",
      body: text,
      source_language:
        Jason.encode!(%{
          "sk" => storage_key,
          "tts" => true,
          "approved" => true
        })
    }

    case Messages.accept_message(attrs) do
      {:ok, %Message{} = message, _origin} -> {:ok, message}
      {:error, _} = err -> err
    end
  end

  defp maybe_deliver(_, _, _, _, _), do: :skip

  defp truthy?(true), do: true
  defp truthy?("true"), do: true
  defp truthy?(1), do: true
  defp truthy?("1"), do: true
  defp truthy?(_), do: false
end
