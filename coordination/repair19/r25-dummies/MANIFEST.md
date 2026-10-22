# Repair #25 — dummy call recordings: ground-truth manifest

The recordings in this directory are FICTIONAL (scripted dialogue,
synthetic voices). Everything else about them is real: real TTS
audio, real files in real formats, imported through the real door,
transcribed by the real Deepgram batch API, folded by the real
ingestion machinery.

Speakers (all calls): speaker 0 = **Daniel Reyes** (staging account
A), speaker 1 = **Priya Nair** (staging account B). Adversarial
three-speaker file adds an undeclared speaker 2.

Voices: ElevenLabs via `OpalCore.Voice.ElevenLabs` (the app's own
client), two distinct voices; the exact voice ids used are recorded
in `generation-receipt.json` after generation. If ElevenLabs had
failed, the fallback would have been macOS `say` and this manifest
would say so.

## Planted facts — scored after the live fold

Expectation key: **covered** = a shape the existing fold machinery
handles (allergy/birthday/morning-preference regexes, commitment
patterns, plan propose+time+place). **not covered** = planted
deliberately in a shape the machinery does not claim; an honest
miss is the correct outcome and must be reported as a miss with
transcript evidence. **negative control** = must NOT be stored
anywhere.

### call1-dinner-plan.wav

| # | Planted fact | Speaker | Kind | Expectation |
|---|---|---|---|---|
| 1.1 | Dinner plan, 7 pm, Juniper and Ivy — first said as **Friday**, then corrected in-call to **Saturday** | Daniel proposes, Priya corrects | plan | covered; correction handling scored: the fold's plan memory is keyed by conversation and re-proposals upsert — check which day the surviving plan row carries, and whether the correction is visible |
| 1.2 | Allergic to shellfish | Priya | fact | covered (`i'm allergic to`) |
| 1.3 | "I'll book the table tonight" | Daniel | commitment | covered (`i'll book`) |
| 1.4 | "I'll bring the tickets for the gallery opening" | Priya | commitment | covered (`i'll bring the …`) |
| 1.5 | Birthday is March 14 | Daniel | fact | covered (`my birthday is`) |
| 1.6 | Hates mornings | Priya | fact | covered (`i hate mornings`) |

### call2-hike-plan.mp3

| # | Planted fact | Speaker | Kind | Expectation |
|---|---|---|---|---|
| 2.1 | Hike plan, Sunday 9 am — first said as **Torrey Pines**, corrected in-call to **Cowles Mountain** | Priya proposes, Daniel corrects | plan | covered; correction scored as in 1.1 |
| 2.2 | "I'll text you the trailhead pin Saturday night" | Priya | commitment | covered (`i'll text`) |
| 2.3 | Allergic to peanuts | Daniel | fact | covered |
| 2.4 | "Let me handle the parking pass, I'll get it online" | Priya | commitment | covered (`let me` / `i'll get`) |

### call3-recital.m4a

| # | Planted fact | Speaker | Kind | Expectation |
|---|---|---|---|---|
| 3.1 | Sister's recital, next Tuesday 6 pm, Balboa Theatre | Daniel | plan-shaped | **not covered** — no proposal verb the classifier keys on; expected honest miss, scored with transcript evidence |
| 3.2 | Can't stand cilantro | Priya | dislike | **not covered** — the fold's dislike shapes are mornings-only; expected honest miss |
| 3.3 | Door code 4218 | Daniel | — | **negative control** — must appear in NO fact, capsule, or memory row |
| 3.4 | "I'll call the venue tomorrow to confirm our seats" | Priya | commitment | covered (`i'll call`) |

## Adversarial assets

| File | Construction | Expected disposition |
|---|---|---|
| adv-silence.wav | 3 s digital silence, valid WAV | done, 0 segments, zero memory written |
| adv-corrupt.mp3 | 512 random bytes, .mp3 name | failed with the provider's real reason; nothing stored downstream |
| adv-spanish.wav | 4-line Spanish call (see calls.json) | imported with language=es; transcription real; English-shaped extraction scored honestly |
| adv-three-speakers.wav | 3 voices, only 2 declared | third voice counted unattributed; never attributed to a declared participant |
| adv-overlap.wav | two voices summed for ~2.5 s mid-call | disposition from Deepgram's actual return; no crash |
| adv-long.wav | ~6 min extended call, plan + commitment planted at the end | completes; latency vs. recording length reported; late facts scored |

## Generation

`generate.exs` (this directory) synthesizes every line with the
app's ElevenLabs client from the Mac (where the key lives), and
`assemble.py` builds the masters: per-line MP3 → WAV decode
(afconvert, 16 kHz mono), turn-concatenation with 350 ms gaps,
then afconvert encodes for the mp3/m4a members of the set.
`generation-receipt.json` records voices used, per-file durations,
and byte sizes.
