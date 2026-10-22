defmodule OpalCore.Calls.AudioDecode do
  @moduledoc """
  Repair #26 (F-1) — server-side decode of imported call recordings
  to WAV before transcription.

  Proven at the provider in R25/R26 investigation: Deepgram batch
  diarizes the same audio sent as MP3/M4A to ONE speaker, while the
  WAV form splits cleanly into two. So every non-WAV import is
  decoded to mono 16 kHz WAV here, server-side, before the Deepgram
  call. The stored original is never replaced — this module only
  transforms the in-memory binary the worker hands to transcription.

  Decoder resolution order (`resolve_decoder/0`):

  1. `:audio_decoder_fun` app env — a `fun(audio_binary,
     content_type)` seam returning the same contract as `to_wav/2`
     (mirrors the `:deepgram_http_fun` transport-seam precedent;
     tests use it to simulate decoder outcomes),
  2. the `OPAL_FFMPEG_PATH` environment variable,
  3. `ffmpeg` on the PATH.

  Honesty law: a non-WAV input that cannot be decoded FAILS with a
  named reason. The original bytes are never silently passed through
  as if they were WAV.
  """

  require Logger

  @wav_content_types ~w(audio/wav audio/x-wav audio/wave)
  @decode_timeout_ms 120_000

  @doc """
  Decode `audio_binary` to WAV unless it already is WAV.

  WAV content types (`audio/wav`, `audio/x-wav`, `audio/wave`) pass
  through UNCHANGED and never require a decoder.

  Returns:

  - `{:ok, wav_binary}`
  - `{:error, :decoder_unavailable}` — no seam, no `OPAL_FFMPEG_PATH`,
    no `ffmpeg` on the PATH
  - `{:error, {:decode_failed, detail}}` — the decoder ran and failed,
    or produced output that is not a non-empty RIFF/WAV binary;
    `detail` is an excerpt of the decoder's stderr or
    `:invalid_output`
  - `{:error, :decode_timeout}` — decoding exceeded the 120-second
    timeout and the decoder process was killed
  """
  def to_wav(audio_binary, content_type)
      when is_binary(audio_binary) and is_binary(content_type) do
    if normalize(content_type) in @wav_content_types do
      {:ok, audio_binary}
    else
      decode(audio_binary, normalize(content_type))
    end
  end

  def to_wav(_, _), do: {:error, {:decode_failed, :invalid_input}}

  @doc """
  Resolve the audio decoder, in precedence order.

  Returns `{:ok, {:seam, fun}}`, `{:ok, {:ffmpeg, path}}`, or
  `{:error, :decoder_unavailable}`.
  """
  def resolve_decoder do
    cond do
      is_function(Application.get_env(:opal_core, :audio_decoder_fun), 2) ->
        {:ok, {:seam, Application.get_env(:opal_core, :audio_decoder_fun)}}

      is_binary(System.get_env("OPAL_FFMPEG_PATH")) and
          System.get_env("OPAL_FFMPEG_PATH") != "" ->
        {:ok, {:ffmpeg, System.get_env("OPAL_FFMPEG_PATH")}}

      is_binary(System.find_executable("ffmpeg")) ->
        {:ok, {:ffmpeg, System.find_executable("ffmpeg")}}

      true ->
        {:error, :decoder_unavailable}
    end
  end

  defp decode(audio_binary, content_type) do
    case resolve_decoder() do
      {:error, :decoder_unavailable} = err ->
        err

      {:ok, {:seam, fun}} ->
        run_seam(fun, audio_binary, content_type)

      {:ok, {:ffmpeg, path}} ->
        run_ffmpeg(path, audio_binary, content_type)
    end
  end

  defp run_seam(fun, audio_binary, content_type) do
    case fun.(audio_binary, content_type) do
      {:ok, wav} when is_binary(wav) -> {:ok, wav}
      {:error, reason} -> {:error, reason}
      other -> {:error, {:decode_failed, {:invalid_decoder_result, other}}}
    end
  rescue
    e -> {:error, {:decode_failed, {:decoder_raised, Exception.message(e)}}}
  end

  defp run_ffmpeg(ffmpeg, audio_binary, content_type) do
    dir =
      Path.join(
        System.tmp_dir!(),
        "opal_audio_decode_#{System.unique_integer([:positive])}"
      )

    File.mkdir_p!(dir)
    in_path = Path.join(dir, "input.#{extension(content_type)}")
    out_path = Path.join(dir, "output.wav")
    File.write!(in_path, audio_binary)

    args = [
      "-v",
      "error",
      "-i",
      in_path,
      "-ac",
      "1",
      "-ar",
      "16000",
      "-f",
      "wav",
      out_path
    ]

    try do
      case run_with_timeout(ffmpeg, args) do
        {:ok, {_output, 0}} ->
          read_output(out_path)

        {:ok, {output, _nonzero}} ->
          {:error, {:decode_failed, stderr_excerpt(output)}}

        {:error, :decode_timeout} ->
          {:error, :decode_timeout}

        {:error, detail} ->
          {:error, {:decode_failed, detail}}
      end
    after
      File.rm_rf(dir)
    end
  end

  # System.cmd runs in a task so a hung decoder cannot hang the
  # worker: on timeout the task (and its ffmpeg child) is
  # brutal-killed and the failure is named, never retried silently.
  defp run_with_timeout(ffmpeg, args) do
    task =
      Task.async(fn ->
        try do
          {:ok, System.cmd(ffmpeg, args, stderr_to_stdout: true)}
        rescue
          e -> {:error, {:decoder_raised, Exception.message(e)}}
        catch
          kind, reason -> {:error, {:decoder_raised, {kind, reason}}}
        end
      end)

    case Task.yield(task, @decode_timeout_ms) do
      {:ok, result} ->
        result

      {:exit, reason} ->
        {:error, {:decoder_exited, reason}}

      nil ->
        Task.shutdown(task, :brutal_kill)
        {:error, :decode_timeout}
    end
  end

  defp read_output(out_path) do
    case File.read(out_path) do
      {:ok, "RIFF" <> _rest = wav} when byte_size(wav) > 0 ->
        {:ok, wav}

      {:ok, _not_riff} ->
        {:error, {:decode_failed, :invalid_output}}

      {:error, _} ->
        {:error, {:decode_failed, :invalid_output}}
    end
  end

  defp stderr_excerpt(output) when is_binary(output) do
    output |> String.trim() |> String.slice(0, 500)
  end

  defp stderr_excerpt(_), do: ""

  defp extension("audio/mpeg"), do: "mp3"
  defp extension("audio/mp3"), do: "mp3"
  defp extension("audio/mp4"), do: "m4a"
  defp extension("audio/m4a"), do: "m4a"
  defp extension("audio/x-m4a"), do: "m4a"
  defp extension("audio/webm"), do: "webm"
  defp extension("audio/ogg"), do: "ogg"
  defp extension(_), do: "bin"

  defp normalize(content_type) do
    content_type
    |> String.split(";", parts: 2)
    |> hd()
    |> String.trim()
    |> String.downcase()
  end
end
