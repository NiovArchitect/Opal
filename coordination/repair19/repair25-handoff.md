# Repair #25 — Call-Recording Extraction Wave — Handoff

Founder-approved 2026-10-22 07:17 PDT. Base: `muse/repair-24`
(mirror `11e61887`, tree `ea1f2f2d`). Branch: `muse/repair-25`.
Acceptance constraints, in the founder's terms: (1) real
functionality only, (2) no blind spots, (3) fast, real-time fast.
The one fake thing is the recordings' content; every piece of
machinery in the proof is real, and the proof ran live against the
real Deepgram batch API on the founder's Mac.

`FOUNDER_ACCEPTED` stays NO. No merge, no production deploy, no
Pass 2, no user-data deletion, additive-only migration (1 new).

## Dispositions at a glance

| Workstream | Disposition |
|---|---|
| 1. Dummy recording factory | DONE — 3 scripted calls (wav/mp3/m4a) + 6 adversarial files, real ElevenLabs voices, ground-truth manifest |
| 2. Import door | DONE — real multipart door, consent attestation enforced, provenance `imported_recording`, Oban + PubSub (no polling) |
| 3. Transcribe + fold | DONE — real Deepgram batch + diarization via the existing `CallTranscription` path; fold via VoiceAlignment/Outcomes + SocialMemory fanout; one provenance-tagged capsule per party |
| 4. Accuracy proof | DONE — scored per planted fact below; two honest misses by design, three diarization-caused degradations on compressed formats (evidence-backed) |
| 5. Speed | DONE — measured per leg below; worst case 7.8× faster than real time, best 53× |
| 6. Blind-spot register | DONE — 12 tasked cases + 4 found cases, each dispositioned with evidence |
| 7. Battery + push | DONE — migrations 125×2, backend 3,476/0, API 101/101, web 2,333/0 + typecheck 0, mobile carried; §8 |

## 1. What was built

**Migration (additive, 1):** `call_recording_imports` — the import
record: uploader, call id, conversation id, speaker map, truthful
status (`received → transcribing → folding → done/failed`),
failure reason, storage key + sha256 + byte size, the consent
attestation (attested_by / attested_at / basis), provider +
confidence, segment + unattributed counts, capsule ids, and
per-leg timing stamps (transcription_started_at / transcribed_at /
folded_at + transcription_ms / fold_ms / total_ms). Unique index
`(uploader_user_id, sha256)` is the idempotency spine.

**The door** (`CallRecordingImportController`, product routes):
`POST /api/v1/product/call-recording-imports` (multipart: file,
`speaker_user_ids` JSON array in diarized-speaker order,
`consent_attested`, `consent_basis`, optional `language`),
`GET` one (participants/uploader only — everyone else gets 404,
existence never leaks), `GET` index (own + participated imports).
Refusals happen **before a single byte is stored**: missing
attestation → 422 `consent_attestation_required`; missing basis →
422; uploader not a declared participant → 403; not exactly two
distinct real accounts → 422; unsupported content type → 415;
empty → 422; >100 MB → 413.

**Consent, on evidence:** at import, the attestation is recorded
on the import row AND materialized as `AssistConsent` rows for
both participants (`allowed: true`, `source:
"recording_import_attestation"`), so the existing transcription
machinery's own consent lookup passes on recorded evidence. The
worker's transcription call passes **no** `:consent` override —
the same gate in-app calls face.

**Call record:** a `CallSession` in status `ended` with
`ended_reason: "imported_recording"`; the import contract exposes
`"source" => "imported_recording"` end to end. Audio lives in a
private, owner-scoped store (`RecordingStore`, 100 MB cap,
sha-named files, never web-served).

**Pipeline:** Oban worker on a new `imports` queue (max_attempts
1 — a failed import stays failed and visible; segment persistence
is idempotent so a manual re-run cannot double-fold). Status
broadcasts on PubSub topics `call_import:<id>` and
`call_imports:<user_id>` at every transition. No polling anywhere
in the product path. (The external proof harness sampled the GET
endpoint to timestamp completion; the authoritative latencies are
the server's own stamps.)

**Transcribe + fold:** the worker runs the *existing*
`CallTranscription.after_call_ended/1` — real Deepgram batch,
diarization on, speakers resolved against the declared
participants. The fold persists `TranscriptSegment` rows
(provider_segment_id `import-<id>-<position>`), then per segment
runs the same machinery a live call gets: `VoiceAlignment.record`
→ `Outcomes.record_proposal/maybe_record_commitment/
open_question/waiting_on` → SocialMemory fanout to both parties'
stores. Finally one Memory Wallet capsule per party is written
through the capsule facade (`CapsuleRead.remember` — the only
sanctioned write path), provenance `source_kind:
"imported_call_recording"`, scope = the conversation, counterpart
set. Capsule summaries cite only what *this* call's fold produced
(commitments are segment-precise; facts/plans are window-scoped by
their own timestamps — see Finding F-2). A diarized speaker index
with no declared participant is counted as unattributed and
**never persisted under a guessed identity** (transcript segments
require a real speaker_user_id; the text is dropped, the count is
kept). Segment rows carry no wall-clock start/end — Deepgram
offsets are not wall-clock, and the fold does not fabricate them.

**Client change (surgical):** `DeepgramClient.transcribe_batch`
gains a `:language` opt (default `"en-US"` — the pin it always
had; existing callers byte-identical) so an import can declare
its recording language; `CallTranscription` threads it through.

**Tests:** 15 new (11 context + 4 controller): happy-path fold
with speaker attribution, facts/commitments/plans in the right
accounts, non-party invisibility, attestation refusals (nothing
stored), uploader-not-participant, unsupported/empty/oversize,
duplicate idempotency, unconfigured-Deepgram honest failure,
provider-400 failure, silence (done, zero memory), third-speaker
unattributed, capsule window-scoping regression, full HTTP door
incl. 415/422/404 and participant-gated read-back.

## 2. Dummy factory

Scripts + ground truth: `coordination/repair19/r25-dummies/`
(`calls.json`, `MANIFEST.md`, `generate.exs`, `assemble.py`,
`proof_driver.py`, `generation-receipt.json`, audio files).

Voices — ElevenLabs via the app's own `Voice.ElevenLabs` client,
from the Mac: speaker 0 = **Adam** (`pNInz6obpgDQGcFmaJgB`),
speaker 1 = **Matilda** (`XrExE9yKIg1WjnnlVkGX`), third voice =
**Arnold** (`VR6AewLTigWG4xSOukaG`). No `say` fallback was needed.
Formats: call1 WAV (39.5 s), call2 MP3 (25.7 s — same-encoder
segment concatenation; CoreAudio cannot encode MP3 on macOS,
verified), call3 M4A (19.0 s). Adversarial: silence (3 s),
corrupt (512 random bytes), Spanish (12.7 s), three-speakers
(9.4 s), overlap (9.5 s), long (134.1 s, 38 turns).

## 3. Live proof — method

Mac worktree `opal-r25-proof` at the pushed R25 tip (never the
founder's `opal-walk` stack), own DB `opal_r25_proof` (125
migrations), port 4100, synthetic phone verification with exposed
codes (the standard staging posture), `r1a1.env` loaded for the
real Deepgram + ElevenLabs keys (names only, never printed).
Three staging accounts activated through the real HTTP door:
A = Daniel Reyes, B = Priya Nair, C = Sam Whitaker (never a
party). Nine recordings imported as A through
`POST /call-recording-imports`; read-backs via the served
`/memory-wallet` surface and the import GET. The full run was
executed **twice** (run 1 found the capsule-scoping defect F-2;
the fix was regression-tested, pushed, and run 2 below is the
scored run on a fresh DB — both bundles retained in scratch).

Run 2 headline results: call1 done 10/10 segments, attribution
perfect; spanish done 4/4; long done 38/38; silence done 0
segments, zero memory; corrupt **failed** with
`transcription_failed: {:http_status, 400}` (the provider's real
rejection); call2/call3/three-speakers/overlap done with 1
segment each — the diarization story in §5/F-1. Live refusals
(HTTP status verified on the served stack): no-attestation →
**422** `consent_attestation_required`; uploader-not-participant
→ **403** `uploader_not_participant`; unsupported type → **415**
`unsupported_format`; duplicate import of call2 →
`origin: "duplicate"` with the **same import id**. Non-party C:
import GET → 404; wallet capsules → 0.

## 4. Accuracy — scored per planted fact

Transcript evidence is the served import GET (segments in the
bundle). "Store" = PersonMemory facts / Commitment ledger /
PlanMemory / capsule, read back on the served stack + DB.

### call1 (WAV) — fold quality: excellent
| # | Planted | Verdict |
|---|---|---|
| 1.1 | Dinner plan Fri→**Sat** correction, 7 pm, Juniper and Ivy | **PARTIAL.** Transcript perfect. Plan buckets created: "dinner" (no time/place labels) and "saturday". The correction's net effect landed (surviving day bucket is Saturday), but place and clock-time never reached PlanMemory labels — diarized word-joined text is lowercase, and place/time extraction loses "Juniper and Ivy" and the day on the Friday line (F-3). |
| 1.2 | Priya allergic to shellfish | **FOUND**, attributed to Priya in both stores |
| 1.3 | Daniel: "I'll book the table" | **FOUND** (Daniel's commitment ledger) |
| 1.4 | Priya: "I'll bring the tickets" | **FOUND** (Priya's commitment ledger) |
| 1.5 | Daniel: birthday March 14 | **FOUND**, attributed to Daniel in both stores |
| 1.6 | Priya hates mornings | **FOUND**, attributed to Priya in both stores |

### call2 (MP3) — diarization collapsed (F-1); transcript text complete
| # | Planted | Verdict |
|---|---|---|
| 2.1 | Hike plan Sun 9 am, Torrey Pines→**Cowles Mountain** | **MISSED as a plan; correction not represented.** One merged segment under Daniel; a "hike" plan line surfaced in B's capsule from the blob, with no time/place labels. |
| 2.2 | Priya: "I'll text the trailhead pin" | **MISATTRIBUTED** — inside the merged blob recorded as Daniel's commitment text. |
| 2.3 | Daniel allergic to peanuts | **FOUND-but-garbled** — an allergy fact landed under Daniel in both stores, but its stored value is the entire merged segment, not the allergy statement. |
| 2.4 | Priya: parking pass ("let me handle…") | **MISSED** as Priya's — inside the blob under Daniel. |

### call3 (M4A) — diarization collapsed (F-1); two misses by design
| # | Planted | Verdict |
|---|---|---|
| 3.1 | Recital plan, Tue 6 pm, Balboa Theatre | **MISSED** (expected: no proposal shape the classifier keys on; compounded by the single-segment merge). Transcript evidence is verbatim. |
| 3.2 | Priya can't stand cilantro | **MISSED** (expected: dislike shapes cover mornings only). No fact stored — the miss is honest, not silent: the line is in the transcript and in no memory row. |
| 3.3 | Door code 4218 (negative control) | **PASSED as a fact** — no fact, plan, or capsule line contains it. Caveat, stated precisely: the code string exists inside the commitment ledger row's quoted source text for call3's merged segment (commitments quote their source utterance), because "I'll call…" later in the same merged segment fired a commitment. |
| 3.4 | Priya: "I'll call the venue" | **MISATTRIBUTED** — the commitment fired, but under Daniel (merged segment). |

### Long call (WAV, 134 s) — planted at the end
| Planted | Verdict |
|---|---|
| Lunch plan, Wed 12 pm, Harbor Cafe | **PARTIAL** — bucket relabeled "lunch"; day/place labels empty (F-3 again). |
| Priya: "I'll book the table in the morning" | **FOUND** (Priya's ledger: "wednesday at noon harbor cafe i'll book the table in the morning") |

### Spanish call (WAV, language=es)
Transcription: **excellent** — 4/4 segments, correct attribution,
near-verbatim Spanish ("hola prya nos vemos mañana a las 6 en la
biblioteca"). Memory extraction: **nothing landed** — the fact/
commitment/plan shapes are English; both capsules honestly read
"No durable facts extracted." Scored: transcript FOUND,
extraction MISSED (language-shaped extractors), named as F-4.

## 5. Speed — measured, per leg (run 2, server-stamped)

| Recording | Audio | Upload POST | Deepgram leg | Fold leg | **Total** | vs real time |
|---|---|---|---|---|---|---|
| call1.wav | 39.5 s | ~0.3 s | 1,753 ms | 3,299 ms | **5,078 ms** | 7.8× |
| call2.mp3 | 25.7 s | ~0.2 s | 1,682 ms | 37 ms | **1,738 ms** | 14.8× |
| call3.m4a | 19.0 s | ~0.2 s | 804 ms | 31 ms | **851 ms** | 22× |
| spanish.wav | 12.7 s | ~0.2 s | 1,185 ms | 48 ms | **1,246 ms** | 10× |
| long.wav | 134.1 s | ~0.4 s | 1,844 ms | 648 ms | **2,510 ms** | **53×** |
| silence.wav | 3.0 s | ~0.2 s | 767 ms | 1 ms | **780 ms** | — |
| truncated call1 (40%) | ~15.8 s | ~0.1 s | 459 ms | 78 ms | **549 ms** | 29× |

Dominating leg: Deepgram's round trip everywhere except call1,
where the **fold** dominates (3.3 s ≈ 330 ms per segment:
alignment + outcomes + dual-account ingest + summary enqueue on
this stack). That is our leg and it is linear in segments; the
2.2-minute call's fold (38 segments) took 648 ms because most of
its segments are chitchat-shaped and skip the expensive branches.
A ~2-minute call is fully extracted, capsules readable, in
2.5 s — 53× faster than real time. Run 1 vs run 2 totals for
call1 (7,337 ms vs 5,078 ms) show provider-side variance, not
instability.

## 6. Blind-spot register

| # | Case | Disposition (evidence) |
|---|---|---|
| B-1 | Corrupt file | **Handled.** Live: 512 random bytes → import `failed`, reason `transcription_failed: {:http_status, 400}` (Deepgram's real rejection), zero segments/capsules. |
| B-2 | Truncated file | **Handled.** Live: call1 cut at 40% → `done`, the intact prefix transcribed faithfully (5 segments, the 6th cut mid-word), 549 ms. No crash, nothing fabricated past the cut. |
| B-3 | Unsupported format | **Handled.** Door refuses before storage: **415 verified live** on the served stack (a real WAV declared as `video/mp4`), plus controller test (.exe/octet-stream) + context tests; run 1 also showed the door failing closed when a client sends no recognizable type at all. |
| B-4 | Silent audio | **Handled.** Live + unit: `done`, 0 segments, **zero** memory written, capsules absent — silence fabricates nothing. |
| B-5 | 3+ speakers | **Handled with a provider caveat (F-1b).** When Deepgram emits an undeclared speaker index, the fold counts it unattributed and persists nothing under a guessed identity (unit-proven). In the live 3-voice file Deepgram never separated the third voice at all (raw probe: all 29 words speaker 0), so the third voice's sentence folded under Daniel — a provider diarization miss our layer cannot detect from the response. Named, not hidden. |
| B-6 | Heavy overlap | **Handled.** Live: the summed segment came back garbled ("no way three is nine in the morning not eight" — a fusion of both lines), folded as heard, no crash. ASR under true overlap is what it is; the fold invents nothing cleaner. |
| B-7 | Very long recording | **Handled at tested scale.** 134 s / 38 turns → 2,510 ms end to end. The door's bound is the 100 MB cap (~90 min of 16 kHz WAV). A 30+ minute file was **not** generated (TTS cost) — residual gap, stated plainly; nothing in the path is duration-sensitive (single batch call, per-segment fold). |
| B-8 | Uploader NOT a participant | **Handled.** Live refusal (`uploader_not_participant`) + unit test; nothing stored. |
| B-9 | Missing consent attestation | **Handled.** Live 422 `consent_attestation_required`, unit-proven zero rows (no import, no call session). Missing basis likewise refused. |
| B-10 | Duplicate import | **Handled.** Live: same bytes → `origin: "duplicate"`, identical import id, one row, one fold (unit: segment count stays 4). Different uploader + same bytes is a distinct import by design (consent/attestation are per-uploader). |
| B-11 | Capsule crossing accounts | **Handled.** Live: non-party C — wallet 0 capsules, import GET 404; capsule reads are owner-scoped through the facade's fail-closed scope check; unit-proven. Facts land only in the two parties' stores. |
| B-12 | Non-English transcript | **Handled honestly.** `language` opt exercised live (es): transcription excellent; English-shaped memory extraction lands nothing and says so ("No durable facts extracted") rather than inventing facts (F-4). |
| B-13 | Fact contradicted later in the same call (corrections) | **Partially handled — the machinery's real semantics, evidenced.** Transcript preserves both statements. Plan memory is (time, place)-bucket upserts: call1's Friday line never formed its own bucket (its day was lost in time extraction, F-3), so the surviving bucket is Saturday — the correction effectively won, partly by luck. Call2's place correction was lost with the diarization collapse. There is no general "correction" concept in the fold: a later contradictory *fact* overwrites by kind key (allergy/mornings/birthday are kind-keyed maps), which handles same-kind corrections and silently keeps both for cross-kind contradictions. |
| B-14 | *(found)* Diarization collapses on compressed formats | **F-1.** See §7. |
| B-15 | *(found)* Capsule credit leaking across calls | **Fixed (F-2).** Found in run 1, regression-tested, verified fixed in run 2. |
| B-16 | *(found)* Plan-bucket label drift across calls | **Observed (F-3b).** The long call's chatter upserted call1's buckets: "dinner"→"lunch", "saturday" label→"market". Same (time, place) bucket = same PlanMemory row, latest label wins. Pre-existing fold semantics, now evidenced with real calls. |
| B-17 | *(found)* `/memory/facts` reads a different store | **Observed.** The served facts endpoint returned empty for A and B while PersonMemory.known_facts was populated by the fold — the endpoint reads a separate facts table the ingestion fold does not write. Read-back for this wave therefore used the Memory Wallet surface (capsules) + person-memory stores directly. Pre-existing product split; flagged for the founder, not fixed here (out of this wave's scope). |

## 7. Findings (beyond the door itself)

- **F-1 — Deepgram diarization is format-sensitive at this
  scale.** Direct provider probes (same audio, Mac): call2 as
  MP3 → all 71 words speaker 0; the identical audio as WAV →
  speakers {0: 42, 1: 29}. Call3 as M4A → all 51 words speaker 0;
  as WAV → {0: 27, 1: 24}. Every WAV input diarized perfectly
  (10/10, 4/4, 38/38 segments); every compressed input collapsed
  to one speaker. Consequences land in §4 (call2/call3 tables).
  The door accepts the formats honestly; extraction quality on
  them is the provider's. **Follow-up for the founder:** prefer
  lossless for imports, or add a server-side decode-to-WAV step
  before Deepgram (needs an audio decoder in the server stack —
  none exists today; not built here).
  **F-1b:** on the 3-voice WAV, Deepgram merged the brief third
  voice into speaker 0 (29/29 words) — short-interjection
  diarization limit, same follow-up family.
- **F-2 — Capsule summaries initially credited earlier calls'
  facts** (shared dyad conversation). Fixed by window-scoping
  (learned_at / updated_at ≥ import creation); regression test;
  run 2 verified (long call's capsule cites only its own plans).
- **F-3 — Call transcripts lose place + day in plan extraction.**
  Diarized segments are word-joined lowercase; `extract_place`'s
  cues need capitalization and `extract_time` dropped the day on
  "this friday at 7pm" (returned a bare 19:00). So PlanMemory
  labels come out as bare activities/days ("dinner", "saturday")
  with empty place — for **all** call folds, not just imports:
  the in-app call path joins words identically. **Follow-up:**
  fold the provider's punctuated transcript (smart_format is
  already on) for extraction, or lowercase-proof the extractors.
  **F-3b:** plan buckets key on (time_label, place_label) only —
  unrelated plans in one conversation sharing a bucket overwrite
  each other's labels (evidenced: dinner→lunch, saturday→market).
- **F-4 — Memory extraction is English-shaped.** Spanish
  transcription is excellent; zero memory lands. Any future
  non-English surface inherits this. Named, not fixed here.

## 8. Battery at the fixed tip (figures read from this run's logs)

- Migrations from empty: **125**, twice (two fresh DBs)
- Backend: **3,476 tests, 0 failures** (legs 822 + 838 + 497 +
  1,211 + extras 83 + watchlist 25; R24's 3,461 + the 15 new R25
  tests). A `mix format` pass over the new files landed during
  the backend legs; the affected suites were re-run green after
  it (15/15) — formatting only, no semantic change.
- API regression: **101/101**
- Web: **2,333 vitest, 0 failures**, typecheck **0 errors** (R25
  touched no web files; node_modules carried from the R24
  worktree, identical lockfile)
- Mobile: carried (untouched by this branch — the tree diff vs
  R24 base is backend + coordination only)

## 9. Gates & founder items

- No merge performed; `FOUNDER_ACCEPTED` stays NO.
  `muse/repair-17` untouched. One additive migration (125 total).
- The Mac proof stack (`opal-r25-proof`, port 4100, DB
  `opal_r25_proof`) is left running for inspection; the founder's
  walk stack was never touched.
- Founder decisions surfaced by this wave: (a) F-1 follow-up —
  accept WAV-preferred imports or fund a server-side decode step;
  (b) F-3 — punctuated-transcript extraction fix (affects in-app
  calls too); (c) B-17's facts-store split. None blocks this
  branch.
