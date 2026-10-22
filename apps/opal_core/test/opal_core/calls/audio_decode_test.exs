defmodule OpalCore.Calls.AudioDecodeTest do
  @moduledoc """
  Repair #26 (F-1) — server-side decode-to-WAV unit tests.

  MP3/M4A fixtures are generated in setup with ffmpeg itself from a
  tiny synthesized WAV (lavfi sine tone), so the fixtures are real
  encoded audio, never dummy bytes wearing an audio content type.
  Tests that need ffmpeg skip gracefully (with a printed reason)
  only when ffmpeg is genuinely absent on this machine.
  """
  use ExUnit.Case, async: false

  alias OpalCore.Calls.AudioDecode

  @wav_bytes "RIFF$\x00\x00\x00WAVEfmt fake-but-wav-typed fixture bytes"

  setup do
    prior_seam = Application.get_env(:opal_core, :audio_decoder_fun)
    prior_ffmpeg_path = System.get_env("OPAL_FFMPEG_PATH")
    prior_path = System.get_env("PATH")

    on_exit(fn ->
      restore_app(:audio_decoder_fun, prior_seam)
      restore_env("OPAL_FFMPEG_PATH", prior_ffmpeg_path)
      restore_env("PATH", prior_path)
    end)

    Application.delete_env(:opal_core, :audio_decoder_fun)

    ffmpeg = System.get_env("OPAL_FFMPEG_PATH") || System.find_executable("ffmpeg")

    fixtures =
      if ffmpeg do
        dir =
          Path.join(
            System.tmp_dir!(),
            "opal_audio_decode_test_#{System.unique_integer([:positive])}"
          )

        File.mkdir_p!(dir)
        on_exit(fn -> File.rm_rf(dir) end)

        wav = Path.join(dir, "tone.wav")

        {_, 0} =
          System.cmd(ffmpeg, [
            "-v",
            "error",
            "-f",
            "lavfi",
            "-i",
            "sine=frequency=440:duration=0.2",
            "-y",
            wav
          ])

        mp3 = Path.join(dir, "tone.mp3")
        {_, 0} = System.cmd(ffmpeg, ["-v", "error", "-i", wav, "-y", mp3])

        m4a = Path.join(dir, "tone.m4a")
        {_, 0} = System.cmd(ffmpeg, ["-v", "error", "-i", wav, "-y", m4a])

        %{
          wav_file_bytes: File.read!(wav),
          mp3_bytes: File.read!(mp3),
          m4a_bytes: File.read!(m4a)
        }
      else
        %{}
      end

    Map.merge(%{ffmpeg: ffmpeg}, fixtures)
  end

  defp restore_app(key, nil), do: Application.delete_env(:opal_core, key)
  defp restore_app(key, val), do: Application.put_env(:opal_core, key, val)

  defp restore_env(key, nil), do: System.delete_env(key)
  defp restore_env(key, val), do: System.put_env(key, val)

  test "WAV content types pass through unchanged and never call a decoder" do
    Application.put_env(:opal_core, :audio_decoder_fun, fn _, _ ->
      raise "decoder seam must not be called for WAV input"
    end)

    for content_type <- ["audio/wav", "audio/x-wav", "audio/wave", "audio/wav; charset=binary"] do
      assert {:ok, @wav_bytes} = AudioDecode.to_wav(@wav_bytes, content_type)
    end
  end

  test "the app-env seam takes precedence and its result is returned", %{ffmpeg: _} do
    Application.put_env(:opal_core, :audio_decoder_fun, fn audio, content_type ->
      assert content_type == "audio/mpeg"
      {:ok, "RIFF-seam-output-" <> audio}
    end)

    assert {:ok, "RIFF-seam-output-abc"} = AudioDecode.to_wav("abc", "audio/mpeg")
    assert {:ok, {:seam, _fun}} = AudioDecode.resolve_decoder()
  end

  test "MP3 decodes to a valid non-empty RIFF/WAV binary", %{ffmpeg: ffmpeg} = ctx do
    if ffmpeg do
      assert {:ok, wav} = AudioDecode.to_wav(ctx.mp3_bytes, "audio/mpeg")
      assert "RIFF" <> _ = wav
      assert byte_size(wav) > 0
      refute wav == ctx.mp3_bytes
    else
      IO.puts("SKIP: ffmpeg absent on this machine; MP3 decode test not run")
    end
  end

  test "M4A decodes to a valid non-empty RIFF/WAV binary", %{ffmpeg: ffmpeg} = ctx do
    if ffmpeg do
      assert {:ok, wav} = AudioDecode.to_wav(ctx.m4a_bytes, "audio/m4a")
      assert "RIFF" <> _ = wav
      assert byte_size(wav) > 0
      refute wav == ctx.m4a_bytes
    else
      IO.puts("SKIP: ffmpeg absent on this machine; M4A decode test not run")
    end
  end

  test "corrupt bytes fail honestly as decode_failed — original bytes never returned",
       %{ffmpeg: ffmpeg} do
    if ffmpeg do
      assert {:error, {:decode_failed, detail}} =
               AudioDecode.to_wav(<<0, 1, 2, 3, 255, 254, 253, 7, 7, 7>>, "audio/mpeg")

      assert is_binary(detail)
    else
      IO.puts("SKIP: ffmpeg absent on this machine; corrupt-bytes test not run")
    end
  end

  test "no decoder anywhere resolves to :decoder_unavailable" do
    Application.delete_env(:opal_core, :audio_decoder_fun)
    System.delete_env("OPAL_FFMPEG_PATH")

    empty_dir =
      Path.join(System.tmp_dir!(), "opal_no_ffmpeg_#{System.unique_integer([:positive])}")

    File.mkdir_p!(empty_dir)
    on_exit(fn -> File.rm_rf(empty_dir) end)
    System.put_env("PATH", empty_dir)

    assert {:error, :decoder_unavailable} = AudioDecode.resolve_decoder()

    assert {:error, :decoder_unavailable} =
             AudioDecode.to_wav(<<1, 2, 3>>, "audio/mpeg")
  end

  test "OPAL_FFMPEG_PATH is honored when the PATH has no ffmpeg", %{ffmpeg: ffmpeg} do
    if ffmpeg do
      Application.delete_env(:opal_core, :audio_decoder_fun)

      empty_dir =
        Path.join(System.tmp_dir!(), "opal_no_ffmpeg_#{System.unique_integer([:positive])}")

      File.mkdir_p!(empty_dir)
      on_exit(fn -> File.rm_rf(empty_dir) end)
      System.put_env("PATH", empty_dir)
      System.put_env("OPAL_FFMPEG_PATH", ffmpeg)

      assert {:ok, {:ffmpeg, ^ffmpeg}} = AudioDecode.resolve_decoder()
    else
      IO.puts("SKIP: ffmpeg absent on this machine; OPAL_FFMPEG_PATH test not run")
    end
  end
end
