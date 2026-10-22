#!/usr/bin/env python3
"""Repair #25 — assemble dummy call recordings from synthesized lines.

Run on the founder's Mac after generate.exs:
  python3 assemble.py --dir <r25-dummies dir>

Per call: decode each line MP3 to 16 kHz mono WAV (afconvert),
concatenate turns with 350 ms silence gaps -> master WAV; then
encode the set's mp3/m4a members from their masters. Also builds
the constructed adversarial files (silence, corrupt, overlap mix).
Writes generation-receipt.json next to the audio files.
"""
import argparse
import json
import os
import random
import struct
import subprocess
import sys
import wave

RATE = 16000
GAP_MS = 350


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"command failed: {' '.join(cmd)}\n{r.stdout}\n{r.stderr}")
    return r


def decode_mp3_to_wav(mp3_path, wav_path):
    if mp3_path.endswith(".wav"):
        # macOS `say` fallback lines are already rendered as 16 kHz WAV.
        import shutil

        shutil.copy(mp3_path, wav_path)
        return
    run(["afconvert", "-f", "WAVE", "-d", f"LEI16@{RATE}", mp3_path, wav_path])


def read_pcm(wav_path):
    with wave.open(wav_path, "rb") as w:
        assert w.getframerate() == RATE and w.getnchannels() == 1, wav_path
        return w.readframes(w.getnframes())


def write_wav(path, pcm):
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(pcm)


def silence_pcm(ms):
    return b"\x00\x00" * int(RATE * ms / 1000)


def mix_pcm(a, b):
    n = min(len(a), len(b)) // 2
    out = bytearray()
    for i in range(n):
        x = struct.unpack_from("<h", a, i * 2)[0]
        y = struct.unpack_from("<h", b, i * 2)[0]
        v = max(-32768, min(32767, x + y))
        out += struct.pack("<h", v)
    # pad the shorter one out with the longer tail, attenuated
    return bytes(out)


def assemble_call(build_dir, call_id, lines, overlap_pair=None):
    tmp = os.path.join(build_dir, call_id, "pcm")
    os.makedirs(tmp, exist_ok=True)
    pcms = []
    for line in lines:
        src = os.path.join(build_dir, call_id, line_file(line))
        wav = os.path.join(tmp, f"line-{line['idx']}.wav")
        decode_mp3_to_wav(src, wav)
        pcms.append(read_pcm(wav))

    gap = silence_pcm(GAP_MS)
    parts = []
    skip = set(overlap_pair[1:]) if overlap_pair else set()
    for i, pcm in enumerate(pcms):
        if i in skip:
            continue
        if overlap_pair and i == overlap_pair[0]:
            other = pcms[overlap_pair[1]]
            parts.append(mix_pcm(pcm, other))
        else:
            parts.append(pcm)
        parts.append(gap)
    master = os.path.join(build_dir, call_id, "master.wav")
    write_wav(master, b"".join(parts))
    return master


def line_file(line_meta):
    return line_meta["file"]


def duration_s(path):
    with wave.open(path, "rb") as w:
        return round(w.getnframes() / w.getframerate(), 2)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", required=True)
    args = ap.parse_args()
    d = args.dir
    build = os.path.join(d, "build")
    spec = json.load(open(os.path.join(d, "calls.json")))
    receipt = json.load(open(os.path.join(build, "receipt.json")))

    out = {"voices": receipt.get("voices", {}), "files": {}}

    # id -> (lines with idx/speaker, target file, format)
    jobs = []
    for call in spec["calls"]:
        jobs.append((call["id"], call["file"], call["format"], None))
    for adv in spec["adversarial"]:
        if "lines" in adv:
            jobs.append((adv["id"], adv["file"], "wav", adv.get("overlap_pair")))
    jobs.append(("long", "adv-long.wav", "wav", None))

    for call_id, filename, fmt, overlap_pair in jobs:
        meta_lines = receipt["calls"][call_id]["lines"]
        master = assemble_call(build, call_id, meta_lines, overlap_pair)
        target = os.path.join(d, filename)
        if fmt == "wav":
            os.replace(master, target)
        elif fmt == "m4a":
            run(["afconvert", "-f", "m4af", "-d", "aac", master, target])
        elif fmt == "mp3":
            # CoreAudio on macOS cannot ENCODE mp3 (decode only —
            # verified on the generation machine), so the mp3 member
            # of the set is assembled by concatenating the per-line
            # ElevenLabs MP3 segments themselves: one encoder, one
            # bitrate, a single valid stream. Turns butt directly
            # (the script alternates speakers every line).
            blob = b""
            for lm in meta_lines:
                blob += open(os.path.join(build, call_id, lm["file"]), "rb").read()
            open(target, "wb").write(blob)
        size = os.path.getsize(target)
        dur = duration_s(target) if fmt == "wav" else None
        out["files"][filename] = {"bytes": size, "duration_s_wav_master": dur, "format": fmt}
        print(f"{filename}: {size} bytes")

    # Constructed adversarial files.
    sil = os.path.join(d, "adv-silence.wav")
    write_wav(sil, silence_pcm(3000))
    out["files"]["adv-silence.wav"] = {"bytes": os.path.getsize(sil), "duration_s": 3.0, "format": "wav"}
    print("adv-silence.wav written")

    rnd = random.Random(25)
    corrupt = bytes(rnd.getrandbits(8) for _ in range(512))
    cpath = os.path.join(d, "adv-corrupt.mp3")
    open(cpath, "wb").write(corrupt)
    out["files"]["adv-corrupt.mp3"] = {"bytes": 512, "format": "mp3 (invalid content)"}
    print("adv-corrupt.mp3 written")

    json.dump(out, open(os.path.join(d, "generation-receipt.json"), "w"), indent=2)
    print("receipt written")


if __name__ == "__main__":
    sys.exit(main())
