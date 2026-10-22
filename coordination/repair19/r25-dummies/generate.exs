# Repair #25 — dummy-call TTS generation (run on the founder's Mac,
# where ELEVENLABS_API_KEY lives in ~/.opal/r1a1.env).
#
# Usage (from apps/opal_core of the R25 checkout):
#   set -a; source ~/.opal/r1a1.env; set +a
#   mix run ../../coordination/repair19/r25-dummies/generate.exs \
#     --dir ../../coordination/repair19/r25-dummies
#
# Synthesizes every scripted line with the app's own ElevenLabs
# client (OpalCore.Voice.ElevenLabs), two distinct voices (+ a third
# for the undeclared-speaker adversarial file). If ElevenLabs rejects
# every candidate voice for a line, falls back to macOS `say` and
# RECORDS that in the receipt — never silently.
#
# Output: <dir>/build/<call_id>/line-<idx>-spk<n>.mp3 (+ receipt.json)
# Assembly into call files is assemble.py's job.

alias OpalCore.Voice.ElevenLabs

args = System.argv()
dir = case Enum.find_index(args, &(&1 == "--dir")) do
  nil -> "."
  i -> Enum.at(args, i + 1)
end

build = Path.join(dir, "build")
File.mkdir_p!(build)

calls = Jason.decode!(File.read!(Path.join(dir, "calls.json")))

# Candidate voices (ElevenLabs ids). The receipt records the voice
# that actually succeeded per speaker.
candidates = %{
  0 => [{"Adam", "pNInz6obpgDQGcFmaJgB"}, {"Antoni", "ErXwobaYiN019PkySvjV"}, {"Josh", "TxGEqnHWrfWFTfGW9XjX"}],
  1 => [{"Matilda", "XrExE9yKIg1WjnnlVkGX"}, {"Rachel", "21m00Tcm4TlvDq8ikWAM"}, {"Bella", "EXAVITQu4vr4xnSDxMaL"}],
  2 => [{"Sam", "yoZ06aMxZJJ28mfd3POQ"}, {"Arnold", "VR6AewLTigWG4xSOukaG"}, {"Adam", "pNInz6obpgDQGcFmaJgB"}]
}

say_voices = %{0 => "Daniel", 1 => "Samantha", 2 => "Alex"}

# Extended neutral script for the long-call adversarial file: ~36
# short exchanges of weather/weekend chatter (no planted facts),
# then the two planted lines at the very end.
long_filler =
  [
    "So how has your week been so far?",
    "Busy, honestly. Work has been nonstop since Monday.",
    "Same here. The mornings just disappear before I get anything done.",
    "Did you see the weather forecast for this weekend?",
    "I did. It says sun on Saturday and maybe rain late Sunday.",
    "That would be nice. We could finally fix the garden fence.",
    "The fence has been leaning since the last storm.",
    "I know. I keep meaning to buy the posts and then I forget.",
    "Write it down this time. You always forget the hardware store run.",
    "Fair. I will add it to the list right after this call.",
    "Speaking of lists, we are almost out of coffee again.",
    "How do we go through coffee so fast in this house?",
    "Two people, two cups each, every morning. It adds up.",
    "We should try that new roastery near the station sometime.",
    "The one with the blue sign? I walked past it yesterday.",
    "That is the one. Their window display looks great.",
    "Maybe next weekend. This weekend is already full.",
    "True. Saturday is the market and Sunday is your sister's thing.",
    "Right, and I promised my neighbour I would water her plants.",
    "The tall ones on the balcony? Those need a lot of water.",
    "Just the herbs, she said. Basil and mint, mostly.",
    "Her basil is doing better than ours, I noticed.",
    "She gets more sun on that side of the building.",
    "That explains it. Our tomatoes are struggling this year too.",
    "Everything is a bit behind this year, the spring was cold.",
    "It was. I wore a jacket until almost June.",
    "Same. Well, at least the evenings are warm now.",
    "They are. Dinner on the balcony last night was lovely.",
    "We should do that more often while the weather holds.",
    "Agreed. Simple food, no fuss, just the evening air.",
    "Okay, I should let you go soon, my tea is getting cold.",
    "Mine too. This was a nice long catch-up though.",
    "It was. We do not talk like this often enough.",
    "We really do not. Let us not leave it so long next time.",
    "Deal. One more thing before we hang up, though.",
    "Go on, what is it?"
  ]
  |> Enum.with_index()
  |> Enum.map(fn {text, i} -> %{"speaker" => rem(i, 2), "text" => text} end)

long_lines =
  long_filler ++
    [
      %{"speaker" => 0, "text" => "Let's do lunch next Wednesday at 12 pm at the Harbor Cafe."},
      %{"speaker" => 1, "text" => "Wednesday at noon, Harbor Cafe. I'll book the table in the morning."}
    ]

call_lines = fn call ->
  case call["id"] do
    "long" -> long_lines
    _ -> call["lines"] || []
  end
end

all_calls =
  (calls["calls"] ++ Enum.filter(calls["adversarial"], &Map.has_key?(&1, "lines")))
  |> Enum.map(fn c -> {c["id"], call_lines.(c)} end)
  |> Enum.reject(fn {_id, lines} -> lines == [] end)
  |> Kernel.++([{"long", long_lines}])
  |> Enum.uniq_by(fn {id, _} -> id end)

working_voice = :ets.new(:voices, [:set, :public])

synthesize = fn speaker, text ->
  case :ets.lookup(working_voice, speaker) do
    [{^speaker, {name, id, engine}}] ->
      case engine do
        "elevenlabs" ->
          case ElevenLabs.synthesize(text, voice_id: id) do
            {:ok, mp3, _meta} -> {:ok, mp3, name, id, "elevenlabs"}
            {:error, reason} -> {:error, reason}
          end

        "say" ->
          {:say, name}
      end

    [] ->
      result =
        Enum.reduce_while(candidates[speaker], {:error, :no_voice_tried}, fn {name, id}, _ ->
          case ElevenLabs.synthesize(text, voice_id: id) do
            {:ok, mp3, _meta} -> {:halt, {:ok, mp3, name, id, "elevenlabs"}}
            {:error, reason} -> {:cont, {:error, reason}}
          end
        end)

      case result do
        {:ok, mp3, name, id, engine} ->
          :ets.insert(working_voice, {speaker, {name, id, engine}})
          {:ok, mp3, name, id, engine}

        {:error, reason} ->
          IO.puts("ELEVENLABS FAILED for speaker #{speaker} (#{inspect(reason)}); falling back to macOS say voice #{say_voices[speaker]}")
          :ets.insert(working_voice, {speaker, {say_voices[speaker], "macos-say", "say"}})
          {:say, say_voices[speaker]}
      end
  end
end

say_render = fn voice, text, out_mp3 ->
  # CoreAudio cannot encode mp3 on macOS; the say fallback renders a
  # 16 kHz WAV line instead (the receipt/assemble steps key off the
  # extension, and the fact of the fallback is recorded per line).
  out_wav = String.replace_suffix(out_mp3, ".mp3", ".wav")
  aiff = out_mp3 <> ".aiff"

  {_, 0} =
    System.cmd("say", ["-v", voice, "-o", aiff, text], stderr_to_stdout: true)

  {_, 0} =
    System.cmd("afconvert", ["-f", "WAVE", "-d", "LEI16@16000", aiff, out_wav],
      stderr_to_stdout: true
    )

  File.rm!(aiff)
  out_wav
end

receipt = %{"calls" => %{}, "voices" => %{}}

receipt =
  Enum.reduce(all_calls, receipt, fn {call_id, lines}, acc ->
    call_dir = Path.join(build, call_id)
    File.mkdir_p!(call_dir)

    line_meta =
      lines
      |> Enum.with_index()
      |> Enum.map(fn {line, idx} ->
        speaker = line["speaker"]
        out = Path.join(call_dir, "line-#{idx}-spk#{speaker}.mp3")

        meta =
          if File.exists?(out) do
            %{"idx" => idx, "speaker" => speaker, "file" => Path.basename(out), "cached" => true}
          else
            case synthesize.(speaker, line["text"]) do
              {:ok, mp3, name, id, engine} ->
                File.write!(out, mp3)

                %{
                  "idx" => idx,
                  "speaker" => speaker,
                  "file" => Path.basename(out),
                  "engine" => engine,
                  "voice_name" => name,
                  "voice_id" => id
                }

              {:say, voice} ->
                rendered = say_render.(voice, line["text"], out)
                %{"idx" => idx, "speaker" => speaker, "file" => Path.basename(rendered), "engine" => "macos-say", "voice_name" => voice}

              {:error, reason} ->
                raise "synthesis failed for #{call_id} line #{idx}: #{inspect(reason)}"
            end
          end

        IO.puts("#{call_id} line #{idx} spk#{speaker}: #{meta["engine"] || "cached"} #{meta["voice_name"] || ""}")
        meta
      end)

    voices_used =
      line_meta
      |> Enum.filter(& &1["voice_id"])
      |> Map.new(fn m -> {Integer.to_string(m["speaker"]), %{"name" => m["voice_name"], "id" => m["voice_id"], "engine" => m["engine"]}} end)

    acc
    |> put_in(["calls", call_id], %{"lines" => line_meta})
    |> Map.update!("voices", &Map.merge(&1, voices_used))
  end)

File.write!(Path.join(build, "receipt.json"), Jason.encode!(receipt, pretty: true))
IO.puts("DONE. receipt at #{Path.join(build, "receipt.json")}")
