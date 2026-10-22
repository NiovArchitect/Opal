# Repair #26 — Extraction Findings Fix Wave — Handoff

Base: `muse/repair-25` (local `7f1071b5`, mirror `623abf11`, tree `fdbb33a8`).
Branch: `muse/repair-26`. Local tip `8e94d76a`, mirror `8e9d82cf`, tree read back equal (7,672 entries).
Gates unchanged: FOUNDER_ACCEPTED = NO. No merge, no production deploy, no Pass 2, no user-data deletion, additive-only migrations (this wave adds none — count stays 125).

## Dispositions

### WS-A (F-1, decode-to-WAV) — code FIXED; diarization recovery BLOCKED BY THE FIXTURES (B-18), losing leg named
- Built `OpalCore.Calls.AudioDecode`: non-WAV imports are decoded to 16 kHz mono WAV server-side in `RecordingImportWorker` between the store read and the Deepgram call; WAV passes through with no decoder consulted; the stored original is never replaced. Decoder resolution: `:audio_decoder_fun` app-env seam, then `OPAL_FFMPEG_PATH`, then `System.find_executable("ffmpeg")`; absent decoder fails the import honestly (`audio_decode_failed: :decoder_unavailable`), never a silent skip. Dependency itemized: ffmpeg — VM `/usr/bin/ffmpeg` 8.1.2; Mac proof stack uses a static ffmpeg 8.0 at `~/bin/ffmpeg` via `OPAL_FFMPEG_PATH` (the Mac had no ffmpeg and no brew).
- Proven in-pipeline on the Mac: MP3/M4A imports complete through the decode step; the corrupt dummy now fails AT decode with ffmpeg's true reason (see B-19).
- **The charter's recovery expectation cannot be met for these two files, and the reason is upstream of the product.** Probe matrix (direct Deepgram calls from the Mac, app-identical params): call2 master WAV splits {0:42, 1:29} and call3 master WAV splits {0:27, 1:24} — R25's exact reported counts. The shipped `call2-hike-plan.mp3` and `call3-recital.m4a`, and every decode of them (ffmpeg 16 kHz mono, ffmpeg native rate, afconvert LEI16@16000), collapse to one speaker on every probe. R25's F-1 probe compared the factory MASTER against the encoded file, never a decode against the encoded file. The shipped MP3 was assembled by raw concatenation of per-line MP3 segments and the M4A is an AAC encode; whatever the diarizer keys on did not survive those encodes, and no decoder restores it. Registered as B-18 below.

### WS-B (F-3/F-3b, shared fold machinery) — FIXED, live-proven
- `DeepgramClient.diarized_segments/2` now prefers `punctuated_word` (smart_format was already requested) — segment text arrives capitalized and punctuated for BOTH fold doors. Live segments confirm: "Let's do dinner this Friday at 7PM at Juniper and Ivy."
- `Extractor.extract_time/1` computes clock and day independently and merges (`this friday at 7pm` gives day friday + time 19:00); new place cues (do/try/pick, venue-before-time, optional "the" after cue words) plus guards (activity words and lone function words are never places — the function-word guard was added during this wave's proof when call2's place came out "For"; it is now "Torrey Pines").
- `Ingest.maybe_plan_signal/4` merge-target selection (place match, then activity match, then single-candidate confirm/counter; create requires a place/activity/clock anchor) with component-wise time-label merging ("saturday 19:00"). Generalized dislikes: "I can't stand X" and generic "I hate X" land as `dislike:<object>`; "I hate mornings" still keys `mornings`.

### WS-C (B-17, /memory/facts) — FIXED, live-proven
- Evidence chose the read path: `DurablePreferenceMemory`'s own write law forbids auto-learning from episode statements, so the fold must not write there. `MemoryController.index_facts` keeps the durable facts byte-identical and appends `PersonMemory.known_facts` projections (`pm:<row_id>:<key>`, value intact, `source: "person_memory"`); `delete_fact` handles `pm:` ids owner-checked under the same step-up elevation + audit. Live readback on the proof stack: A = 5 facts (all pm:), B = 5, non-party C = 0.

### WS-D (F-4, language-aware extraction) — FIXED, live-proven
- New `OpalCore.Intelligence.LlmMemoryExtract`: for non-English utterances the fold runs a scoped LLM leg (DeepSeek via `LlmAdapter`). The prompt is assembled ONLY through `PromptBuilder.build(scoped, conversation_id, text, [])` with the ingesting account's own `SocialMemory.for_account` scope; speaker identity enters as "self"/"other party" only; strict JSON with verbatim excerpts; results feed the SAME writers as the rules (shared `put_fact/5` with provenance `stated_llm`, shared commitment writer — speaker's own ledger only — and Cluster B's `maybe_plan_signal/4`). English/nil language never invokes the LLM; disabled/error/parse-failure extracts nothing, honestly.
- Live proof (final run, 4 segments): the Spanish plan landed in both stores (tomorrow 18:00, la biblioteca) and BOTH commitments landed in the right ledgers (Daniel: "Yo llevo los documentos para la reunión."; Priya: "yo llevo el café para los 2").

### WS-E (close) — this handoff; battery below; Mac proof bundle archived at `coordination/repair19/r26-proof-bundle.json` (final run).

## Before / after accuracy (manifest-scored, Mac live proof)

| Item | R25 | R26 |
|---|---|---|
| 1.1 dinner plan | PARTIAL (day + place lost) | **FOUND** — dinner / saturday 19:00 / Juniper and Ivy, both stores |
| 1.2 shellfish allergy | FOUND | FOUND |
| 1.3 Daniel book-table commitment | FOUND | FOUND |
| 1.4 Priya tickets commitment | FOUND | FOUND |
| 1.5 birthday | FOUND | FOUND |
| 1.6 mornings | FOUND | FOUND |
| 2.1 hike plan | MISSED as a plan | **PARTIAL-RECOVERED** — hike / sunday 09:00 / Torrey Pines, both stores; the Cowles Mountain correction sits in the same merged segment and does not supersede (B-20) |
| 2.2 Priya trailhead-pin commitment | MISATTRIBUTED | still inside the merged blob under Daniel (B-18) |
| 2.3 peanut allergy | FOUND-garbled | FOUND (allergy about Daniel) |
| 2.4 Priya parking-pass commitment | MISSED | still inside the merged blob (B-18) |
| 3.1 recital plan | MISSED (by design) | **LANDED** — tuesday 18:00 / Balboa Theatre, both stores (punctuated segment now classifies; label falls back to the time string, no activity word in the line) |
| 3.2 cilantro dislike | MISSED (by design) | **LANDED as `dislike:cilantro`, under Daniel** — machinery proven; person wrong because the only segment is Daniel-attributed (B-18) |
| 3.3 door code 4218 negative control | PASSED | PASSED (no fact; only inside the merged commitment blob text, as R25) |
| 3.4 Priya venue-call commitment | MISATTRIBUTED | still inside Daniel's blob (B-18) |
| Spanish plan (tomorrow 18:00, la biblioteca) | transcribed, ZERO landed | **FOUND**, both stores |
| Spanish commitment — Daniel (documentos) | ZERO | **FOUND** |
| Spanish commitment — Priya (café) | ZERO | **FOUND** (final run; missed in an earlier run whose Spanish import collapsed to 1 segment — B-21) |
| Long-call lunch plan | PARTIAL (day/place empty) | **FOUND** — wednesday 12:00 / Harbor Cafe |
| Long-call Priya booking commitment | FOUND | FOUND |
| F-3b overwrite (dinner relabeled lunch; saturday relabeled market) | PRESENT | **GONE** — dinner, lunch, market are separate rows |

## Latency (server-stamped totals, final Mac run; R25 run 2 in parentheses)

| Call | Audio | R26 total | R25 total |
|---|---|---|---|
| call1 WAV | 39.5s | 4,373 ms (transcription 1,557 / fold 2,788) | 5,078 ms |
| call2 MP3 | 25.7s | 1,202 ms | 1,738 ms |
| call3 M4A | 19.0s | 603 ms | 851 ms |
| spanish WAV | ~10s | 9,074 ms (LLM leg: per segment per account) | 1,246 ms (no LLM leg; zero extracted) |
| long WAV | 134.1s | 2,941 ms | 2,510 ms |
| silence | 3.0s | 178 ms, done, 0 segments | done, 0 segments |
| corrupt | — | **failed at decode in 128 ms observed** with ffmpeg's true reason | failed at Deepgram with its 400 |

## Battery (read from this wave's own logs)

- Migrations from empty: **125 x2** fresh DBs.
- Backend: **3,509 tests** (legs 822 + 838 + 508 + 1,216, extras 100, watchlist 25). Two failures, both timing-species in untouched SocialFlow suites (CompoundQuality fairness — MemoryStore GenServer shutdown mid-call; RealAdapters — Metrics process not alive in setup); both files pass standalone (21/0), and compound_quality also passed inside this battery's own watchlist leg. R25 baseline was 3,476; R26 adds 33 tests at battery time.
- API regression: **101/101 PASS**. Web: **2,333/0**, typecheck **0**. Mobile: untouched, carried.
- The battery ran at tip `00820fde`. Two small fixes landed after it (B-19 slice, function-word place guard, +2 tests); their delta suites were re-run green at the final tip: recording_imports + audio_decode **21/0**, intelligence + social_memory **200/0**, memory API **8/8** (+14/14 with the R24 step-up suite), controller imports **4/0**.

## New blind spots (register tradition)

- **B-18 — R25's F-1 probe compared masters, not decodes.** The shipped lossy dummies (raw-concatenated MP3; AAC M4A) irreversibly lose diarization on this material; decode-to-WAV is correct hygiene (uniform provider input, honest failures) but cannot recover speakers from these files. Any future diarization-recovery claim must probe decode-vs-encoded, not master-vs-encoded.
- **B-19 — FIXED in-wave.** `failure_reason` is varchar(255) but R25's `RecordingImports.fail/2` sliced reasons to 500 chars: any 256-500-char reason raised 22001 inside the worker, discarded the job (max_attempts 1), and stranded the import at `transcribing` forever. R25 never hit it (Deepgram's reason was short); R26's ffmpeg-excerpt reasons hit it on the first corrupt file. Fix: slice to 255 + regression test with a 720-char decode failure.
- **B-20 — a correction inside one merged segment cannot supersede.** Single-segment classification takes one place per segment: call2's plan keeps Torrey Pines although the same segment corrects it to Cowles Mountain. Only separable segments (or a within-segment correction pass) can fix this; it is a downstream cost of B-18 on these fixtures.
- **B-21 — Deepgram diarization is non-deterministic across runs on identical input.** The Spanish WAV collapsed to 1 segment in one live run and split into 4 in the next; three-speakers fully collapsed on the final run. Accuracy claims about diarized folds are therefore run-indexed, not file-indexed.
- Carried residuals, unchanged: bare `coffee` and `market` sketch rows from long-call chatter (no overwrite, but noisy); `Reasoner.time_label_from/1` prefers day over time for a combined map (fallback label only); LLM-path `time_entity` still cannot emit a combined day+clock map (ingest label fallbacks cover it); D-P3 place-consent contract still a founder/design decision; F-16 live transcription and W-5d in-call mount still founder-stepped.

## Founder items

Unchanged from R25, plus: merge of `muse/repair-26` is yours when ready. Note for the next walk: during this wave's Mac proof, a `pkill` for the proof server also matched other `mix phx.server` processes on the Mac — if the R24 walk stack was still running, it was stopped (its DB and worktree are untouched and it restarts from its own scripts).
