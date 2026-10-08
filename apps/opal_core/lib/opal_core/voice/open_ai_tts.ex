defmodule OpalCore.Voice.OpenAITTS do
  @moduledoc """
  OpenAI TTS fallback (Paste G Phase 10).

  **Why a fallback:** ElevenLabs owns the intended Opal brand voice, but founders
  often already have `OPENAI_API_KEY` on the machine. When ElevenLabs is not
  provisioned yet, this adapter lets `speak/2` still produce real audio for local
  walks instead of hard-blocking on one vendor. Prefer ElevenLabs whenever
  `ELEVENLABS_API_KEY` is present.
  """

  @behaviour OpalCore.Voice.Provider

  @api_url "https://api.openai.com/v1/audio/speech"
  @default_model "tts-1"
  @default_voice "nova"

  @impl true
  def configured? do
    case resolve_api_key([]) do
      {:ok, _} -> true
      _ -> false
    end
  end

  @impl true
  def synthesize(text, opts \\ []) when is_binary(text) do
    case resolve_api_key(opts) do
      {:ok, key} -> do_synthesize(key, text, opts)
      {:disabled, _} = disabled -> disabled
    end
  end

  defp do_synthesize(key, text, opts) do
    model = Keyword.get(opts, :model, @default_model)
    voice = Keyword.get(opts, :voice, @default_voice)

    body = %{
      "model" => model,
      "input" => text,
      "voice" => voice,
      "response_format" => "mp3"
    }

    case Req.post(@api_url,
           json: body,
           headers: [
             {"authorization", "Bearer #{key}"},
             {"content-type", "application/json"}
           ],
           receive_timeout: 60_000
         ) do
      {:ok, %Req.Response{status: 200, body: audio}} when is_binary(audio) and audio != "" ->
        {:ok, audio, %{provider: "openai_tts", content_type: "audio/mpeg", voice: voice}}

      {:ok, %Req.Response{status: status, body: body}} ->
        {:error, {:openai_tts_http, status, truncate(body)}}

      {:error, %Req.TransportError{reason: reason}} ->
        {:error, {:openai_tts_transport, reason}}

      {:error, reason} ->
        {:error, reason}
    end
  end

  defp resolve_api_key(opts) do
    override = Keyword.get(opts, :api_key)

    cond do
      is_binary(override) and override != "" ->
        {:ok, override}

      true ->
        key =
          System.get_env("OPENAI_API_KEY") ||
            System.get_env("OPAL_OPENAI_API_KEY") ||
            Application.get_env(:opal_core, :openai_api_key)

        if is_binary(key) and key != "",
          do: {:ok, key},
          else: {:disabled, "OPENAI_API_KEY missing (ElevenLabs fallback)"}
    end
  end

  defp truncate(body) when is_binary(body), do: String.slice(body, 0, 200)
  defp truncate(body), do: inspect(body) |> String.slice(0, 200)
end
