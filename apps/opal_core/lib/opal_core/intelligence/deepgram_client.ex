defmodule OpalCore.Intelligence.DeepgramClient do
  @moduledoc """
  Deepgram speech-to-text client for Opal's ears.

  Modes:
  - `transcribe_batch/2` — POST audio → full transcript (voice messages, call recordings)
  - `stream_interface/0` — documented seam for future live-call websocket wiring
    (Assist already streams via short-lived grant; this module owns batch + stub)

  Language: **en-US** default. Auto-detect is available on some Deepgram tiers via
  `detect_language=true`; we pin en-US for predictable confidence on the current tier.
  Diarization: `diarize=true` for multi-speaker segments.

  When `DEEPGRAM_API_KEY` is unset, returns a canned diarized transcript with `stub: true`
  so the intelligence pipeline is testable end-to-end (see BLOCKED.md).
  """

  require Logger

  @batch_url ~c"https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&punctuate=true&diarize=true&language=en-US"
  @confidence_floor 0.6

  @doc "Batch transcribe audio binary. Returns {:ok, result} | {:error, reason}."
  def transcribe_batch(audio, opts \\ [])

  def transcribe_batch(audio, opts) when is_binary(audio) do
    content_type = Keyword.get(opts, :content_type, "audio/webm")

    case api_key() do
      key when is_binary(key) and key != "" ->
        request_batch(key, audio, content_type)

      _ ->
        {:ok, stub_transcript(opts)}
    end
  end

  def transcribe_batch(_, _), do: {:error, :invalid_audio}

  @doc """
  Streaming seam for future live-call websocket ownership in this module.
  Assist currently uses DeepgramGrant + FE websocket. Wire the socket here later.
  """
  def stream_interface do
    %{
      status: :not_wired,
      note: "Use Calls.DeepgramGrant + FE wss for live Assist; batch path owns post-call/voice notes",
      url_template: "wss://api.deepgram.com/v1/listen?model=nova-2&diarize=true&language=en-US"
    }
  end

  @doc "True when transcription confidence is below safety floor."
  def uncertain?(confidence) when is_number(confidence), do: confidence < @confidence_floor
  def uncertain?(_), do: true

  def confidence_floor, do: @confidence_floor

  defp request_batch(key, audio, content_type) do
    _ = Application.ensure_all_started(:inets)
    _ = Application.ensure_all_started(:ssl)

    headers = [
      {~c"authorization", String.to_charlist("Token " <> key)},
      {~c"content-type", String.to_charlist(content_type)}
    ]

    request = {@batch_url, headers, String.to_charlist(content_type), audio}

    case :httpc.request(:post, request, [timeout: 60_000, connect_timeout: 8_000], body_format: :binary) do
      {:ok, {{_, 200, _}, _, response}} ->
        parsed = Jason.decode!(io_to_bin(response))
        {:ok, normalize_response(parsed, stub: false)}

      {:ok, {{_, status, _}, _, response}} ->
        Logger.warning("deepgram.batch_failed status=#{status} body=#{String.slice(io_to_bin(response), 0, 200)}")
        {:error, {:http_status, status}}

      {:error, reason} ->
        Logger.warning("deepgram.batch_error reason=#{inspect(reason)}")
        {:error, reason}
    end
  end

  defp normalize_response(parsed, opts) do
    results = parsed["results"] || %{}
    channels = results["channels"] || []
    channel = List.first(channels) || %{}
    alternatives = channel["alternatives"] || []
    alt = List.first(alternatives) || %{}

    transcript = alt["transcript"] || ""
    confidence = alt["confidence"] || estimate_confidence(alt)
    words = alt["words"] || []
    segments = diarized_segments(words, transcript)

    %{
      transcript: String.trim(transcript),
      confidence: confidence,
      segments: segments,
      language: "en-US",
      stub: Keyword.get(opts, :stub, false),
      raw_provider: "deepgram"
    }
  end

  defp diarized_segments([], transcript) when is_binary(transcript) and transcript != "" do
    [%{"speaker" => 0, "text" => transcript, "start" => 0.0, "end" => 0.0}]
  end

  defp diarized_segments([], _), do: []

  defp diarized_segments(words, _transcript) when is_list(words) do
    words
    |> Enum.chunk_by(fn w -> w["speaker"] || 0 end)
    |> Enum.map(fn chunk ->
      speaker = (List.first(chunk) || %{})["speaker"] || 0
      text = chunk |> Enum.map(& &1["word"]) |> Enum.join(" ") |> String.trim()
      start = (List.first(chunk) || %{})["start"] || 0.0
      finish = (List.last(chunk) || %{})["end"] || start

      %{
        "speaker" => speaker,
        "text" => text,
        "start" => start,
        "end" => finish
      }
    end)
    |> Enum.reject(&(&1["text"] == ""))
  end

  defp estimate_confidence(%{"words" => words}) when is_list(words) and words != [] do
    confs =
      words
      |> Enum.map(& &1["confidence"])
      |> Enum.filter(&is_number/1)

    if confs == [], do: 0.85, else: Enum.sum(confs) / length(confs)
  end

  defp estimate_confidence(_), do: 0.85

  defp stub_transcript(opts) do
    forced = Keyword.get(opts, :stub_transcript)
    confidence = Keyword.get(opts, :stub_confidence, 0.92)

    transcript =
      cond do
        is_binary(forced) and forced != "" -> forced
        true -> "Yes, let's lock in Juniper for Saturday."
      end

    %{
      transcript: transcript,
      confidence: confidence,
      segments: [
        %{"speaker" => 0, "text" => transcript, "start" => 0.0, "end" => 2.4}
      ],
      language: "en-US",
      stub: true,
      raw_provider: "deepgram_stub"
    }
  end

  defp api_key do
    System.get_env("DEEPGRAM_API_KEY") ||
      Application.get_env(:opal_core, :deepgram_api_key) ||
      launchctl_key()
  end

  defp launchctl_key do
    case System.cmd("launchctl", ["getenv", "DEEPGRAM_API_KEY"], stderr_to_stdout: true) do
      {value, 0} ->
        trimmed = String.trim(value)
        if trimmed == "" or String.starts_with?(trimmed, "Could not"), do: nil, else: trimmed

      _ ->
        nil
    end
  end

  defp io_to_bin(bin) when is_binary(bin), do: bin
  defp io_to_bin(charlist) when is_list(charlist), do: List.to_string(charlist)
  defp io_to_bin(other), do: to_string(other)
end
