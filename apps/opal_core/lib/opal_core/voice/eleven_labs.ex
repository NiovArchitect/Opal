defmodule OpalCore.Voice.ElevenLabs do
  @moduledoc """
  ElevenLabs TTS provider (Paste G Phase 10).

  Gates on `ELEVENLABS_API_KEY`. Without the key returns
  `{:disabled, "ELEVENLABS_API_KEY missing"}`.

  Founder-tunable voice ID (ElevenLabs dashboard → Voices):
  default `"21m00Tcm4TlvDq8ikWAM"` (Rachel) — swap when founder picks Opal brand voice.
  Override via `ELEVENLABS_VOICE_ID` or `opts[:voice_id]`.
  """

  @behaviour OpalCore.Voice.Provider

  # Founder-tunable: replace with Opal brand voice id from ElevenLabs dashboard.
  @default_voice_id "21m00Tcm4TlvDq8ikWAM"
  # eleven_monolingual_v1 / multilingual_v1 are deprecated (API returns unsupported_model).
  @default_model_id "eleven_multilingual_v2"
  @api_base "https://api.elevenlabs.io/v1"

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
      {:ok, key} ->
        voice_id =
          Keyword.get(opts, :voice_id) || System.get_env("ELEVENLABS_VOICE_ID") ||
            @default_voice_id

        do_synthesize(key, voice_id, text)

      {:disabled, _} = disabled ->
        disabled
    end
  end

  defp do_synthesize(key, voice_id, text) do
    url = "#{@api_base}/text-to-speech/#{URI.encode_www_form(voice_id)}"

    model_id =
      System.get_env("ELEVENLABS_MODEL_ID") || @default_model_id

    body = %{
      "text" => text,
      "model_id" => model_id,
      "voice_settings" => %{"stability" => 0.4, "similarity_boost" => 0.8}
    }

    case Req.post(url,
           json: body,
           headers: [
             {"xi-api-key", key},
             {"accept", "audio/mpeg"},
             {"content-type", "application/json"}
           ],
           receive_timeout: 60_000
         ) do
      {:ok, %Req.Response{status: 200, body: audio}} when is_binary(audio) and audio != "" ->
        {:ok, audio, %{provider: "elevenlabs", content_type: "audio/mpeg", voice_id: voice_id}}

      {:ok, %Req.Response{status: status, body: body}} ->
        {:error, {:elevenlabs_http, status, truncate(body)}}

      {:error, %Req.TransportError{reason: reason}} ->
        {:error, {:elevenlabs_transport, reason}}

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
          System.get_env("ELEVENLABS_API_KEY") ||
            Application.get_env(:opal_core, :elevenlabs_api_key)

        if is_binary(key) and key != "",
          do: {:ok, key},
          else: {:disabled, "ELEVENLABS_API_KEY missing"}
    end
  end

  defp truncate(body) when is_binary(body), do: String.slice(body, 0, 200)
  defp truncate(body), do: inspect(body) |> String.slice(0, 200)
end
