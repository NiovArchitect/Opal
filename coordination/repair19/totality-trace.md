# REPAIR #19 — WAVE W10: CAPABILITY TOTALITY TRACE (W5-24)

- **Build traced:** `muse/r19-audit` at tip `09e587b2` (all 12 R19
  build waves + W18-FIX reconciliation + W15 override sweep + W16
  blind-spot fixes W19-FIX-A/B merged).
- **Inventory walked:** the generalized Muse harvest table,
  `coordination/repair18/muse-harvest-audit.md` §1–§10 — all 43
  rows (CM/PR/SM/NV/SD/DC/VO/FT/CH/ER), one by one. Nothing skipped.
- **Method:** each row re-verified against the merged build at
  source and, where a served path exists, against the live stack
  run for this audit (fresh-migrated DB, 113/113 migrations; API
  regression 101 cases; targeted backend 93/0; targeted web suites;
  headless-Chromium rendered walk at 390×844, both modes — see
  `journey-audit-report.md` for the run record). The harvest's own
  R18-era status is NOT inherited: several rows it marked ABSENT
  shipped in R18's adopt waves or in R19, and the trace says so.
- **Disposition classes (the founder's three, nothing else):**
  **PRESENT** — the capability exists in Opal's own form (named
  where). **PIPELINE** — not in this build; it is in the
  wallet-build pipeline with its WALLET_MAP §F gap-register row
  (`shots/repair18/WALLET_MAP.md` §F). **GATED/ABSENT** —
  founder-gated, or absent with the reason stated. No row is
  silently missing; a row whose form is partial says which leg is
  which class.

## The trace

### §1 Communication patterns (CM)

| ID | Capability | Disposition | Where / gap row |
|---|---|---|---|
| CM-1 | Checkpoint narration in long work | **PRESENT** | Law (L12 r3) + Center holding line states Opal's own counters in plain words (the DIR-4 counters, same projections). Residual: mid-operation checkpoint *captures* remain pack-owed evidence, not a missing capability. |
| CM-2 | Single-tap answerable options | **PRESENT** | Opal's form is the reveal card, not a chip row: DIR-4 reveals render inside Opal chats (`CenterChat` → `RevealCard`), the chats list (mini-card form, W5) and the thread (YOUR MOVE fire-frame), each with Confirm/Dismiss answering through the real plan path and an outcome read-back. The harvest's literal chip-row grammar (DIR-4-A) was superseded by this form; free typing is never gated. |
| CM-3 | Rich in-chat objects | **PRESENT** (plan/place legs split) | Plan cards in chats: PRESENT (single projection). Place/map cards: **ABSENT with reason** — the place projection's field half has no producer (WALLET_MAP §DC DC-GAP-1); painting a place card from label strings would be fabrication. List cards exist as feed/list objects on Home/Chats, not in-chat. |
| CM-4 | Errors in plain words + one next step | **PRESENT** | L12 r4 law; the registered violations (HB-12 empty-on-failure, HB-19 raw strings) were fixed in R18 hunt-fixes, and the R19 blind-spot sweep re-verified error/empty states on every new surface (Graphs/Calls/Chats/Center/Soul/in-call) — no blank-on-failure found. The generalized failure-observability gate is retrospective item RW-12 (a check, not a capability). |
| CM-5 | Read-back before claiming | **PRESENT** | Honesty contract + projection re-read discipline across plans, settings, calls (server-returned status rendered verbatim). Exercised throughout this audit's probes: every write below was verified by a second read. |
| CM-6 | Register matching (terse/warm/playful by topic) | **PIPELINE** | No register selection exists in Center assembly. Depends on the Soul capsule set: WALLET_MAP **W-GAP-31** (Soul/Memory surfaces — the R19 Soul room is its first form) + **W-GAP-02** (capsule as one object). |

### §2 Proactivity patterns (PR)

| ID | Capability | Disposition | Where / gap row |
|---|---|---|---|
| PR-1 | Preparation before the ask | **PRESENT** (mode-object leg PIPELINE) | The gate stack is real (opt-in default off, opt-out hard gate, budget, quiet hours — the last re-verified as ONE resolver in W19-FIX-A) and prepared substance is real (DIR-1/DIR-4 reveals carry finished plan substance). The operational-mode object it should hang on: **W-GAP-19** (operational modes ABSENT as object). |
| PR-2 | Background work delivers itself | **PRESENT** (first form) / **PIPELINE** (full form) | First form shipped: Settings > Activity (W8, on the adopt2 trail) — finished account activity reports itself in plain words. The full form (Opal's Home: trail + approval queue + P6 report-back) is **W-GAP-12** (approvals queue / Opal's Home ABSENT surface). |
| PR-3 | Event-driven firing | **PRESENT** | Proactive triggers are live-condition rows evaluated on projection refresh (presentation spec §5.1); proactive conversations + check-in suggestions run on real conditions in the backend, now including the one quiet-hours truth. |
| PR-4 | Initiative inside permission; refusal permanent | **PRESENT** | QUIET law + opt-out hard gate + recorded suppression (map D7/B.5); dismissal permanence is pinned by the DIR-4 suite. The strongest-held row in the inventory. |

### §3 Soul / memory behavior (SM)

| ID | Capability | Disposition | Where / gap row |
|---|---|---|---|
| SM-1 | Memory explains itself (provenance) | **PRESENT** (first form) / **PIPELINE** (depth) | R19 Memory room (W8): every capsule carries provenance in plain words, a because line, and its saved date — shipped, captured, and re-verified in this audit's rendered walk. Full per-capsule provenance chains: **W-GAP-03** (user-visible capsule provenance PARTIAL) + **W-GAP-13** (per-capsule audit chain ABSENT). |
| SM-2 | Corrections visibly learned | **PIPELINE** | Correction acknowledgements exist in Center/thread flows; the durable *learning record* (trail entry opening the corrected fact) does not. Rows: **W-GAP-18** (feedback capsules PARTIAL) + **W-GAP-12** (the trail's Home). |
| SM-3 | User-owned persona document (Soul) | **PRESENT** (room) / **PIPELINE** (document leg) | R19 Soul room (W8) is a real editor over the real AssistancePreference truth — how-forward, quiet hours, time zone, daily cap, feedback style — each labeled with its reason, save + read-back proven (this audit, probe P3). The free-text Soul *document* and naming-correction store: **W-GAP-31**. Register/naming legs ride **W-GAP-02**. |
| SM-4 | One consolidated page per person | **PRESENT** | Memory room grouped (About you / Tied to a person / From your plans and activities, W8) + per-person memory governed from the person profile's "What Opal remembers" doorway (W13) into the real room. |
| SM-5 | Forgetting is total | **PRESENT** (forget leg) / **PIPELINE** (assembly leg) | Forget is real and hard: two-step confirm → DELETE through the owner path; this audit re-proved it end to end (capsule created → listed → deleted → absent from list; cross-account reads 404 — probe P5 + W8 suite). Withdrawal propagation through every later *assembly*: **W-GAP-09** (one SCB + one package type PARTIAL). |
| SM-6 | Two-tier memory (raw trail + curated set) | **PRESENT** (first form) / **PIPELINE** (ledger glass) | Curated tier: Memory room. Raw tier first form: Settings > Activity trail. The signed audit ledger's own glass: **GYRO-02** (audit rows unsigned/unlinked) + **W-GAP-13**. |

### §4 Navigation + tab architecture (NV)

| ID | Capability | Disposition | Where / gap row |
|---|---|---|---|
| NV-1 | Feed as a first-class tab | **PRESENT** | Home (C2) — R19 W9 gave it the social form: stories rail, Live cards from the real lives read, plan cards across all five states, moments with record imagery. (Its scheduled-edition leg is SD-3.) One honesty rider from this audit: Home feed *action buttons* currently terminate in a no-op host handler — see journey-audit finding JA-06; the feed itself is present and truthful. |
| NV-2 | Goals as a first-class surface | **PRESENT** | Graphs carries durable intentions + the "Working toward" goals (adopt1), progress read from real plans, no people-scoring (guardrail in the spec, honored in the build). |
| NV-3 | Ideas as a first-class surface | **PRESENT** | The Idea create type ("Just the spark. Plan it later.") + Graphs' Someday shelf (adopt1/W7), promotable to a plan. Starters are drawn only from the user's own truth (celebrations/plans) with a basis line or not at all. |
| NV-4 | Library as a documents library | **ABSENT — by design** | Opal holds no user documents; importing a document library would import a foreign object. Stated in the harvest and re-affirmed here. The findability property underneath it is NV-5. |
| NV-5 | Everything made is findable in one archive | **PRESENT** | Settings > Your library (adopt3 `LibraryDestination` + moments archive) — the user's own moments/stories/posts browsable after the fact, rendering the same records the feed does. |
| NV-6 | Wide-screen sidebar | **PRESENT** | HA-A (harmony2): at wide geometry the five destinations become a persistent left sidebar (`c2s-sidebar` in `C2Shell`) in the same order, and Settings gains its sidebar — same surfaces, same projections. (Phone-width audits cannot render it; verified at source + harmony2 captures.) |
| NV-7 | One search over everything | **PRESENT** (product kinds) / **PIPELINE** (memory leg) | C2 Search reaches plans, chats and people, results openable to their real surfaces (the R18 entry-13 chat limitation closed with the C1 host wiring). Intentions ride the plans/graphs kinds. The memory-facts group waits on the Memory browser's search leg: **W-GAP-31**. |

### §5 Scheduled + proactive delivery (SD)

| ID | Capability | Disposition | Where / gap row |
|---|---|---|---|
| SD-1 | Scheduled things visible + governable | **PIPELINE** | No surface lists "what Opal will surface, and when." Sources exist (celebration lead times B.12, check-in cadences B.13, intentions); the governor surface is Opal's Home Upcoming: **W-GAP-12**. Until it lands, each scheduled thing is governable only at its source — named, not painted over. |
| SD-2 | Arrival batched + calm | **PRESENT** | Presentation spec §5.2/5.4 ceilings are product law in the gate stack (≤1 proactive push/day, 3/7 days; no catch-up storms), and the Soul room's per-day cap is a real control over a real field (W8; read-back proven in this audit). |
| SD-3 | The digest is a finite, steerable EDITION | **ABSENT with reason** | No digest object exists; Home is a live feed, not an edition, and no plain-words steering of what Opal leads with exists. Specced as DIR-4-B; its steering leg depends on the Soul capsule set (**W-GAP-31**). Not silently missing — unbuilt, with its dependency named. |
| SD-4 | Proactive delivery outside the app (push) | **FOUNDER-GATED** | The push rail itself: FCM adapter posts to a dead endpoint (**GYRO-09**). Founder-only step: working provider credentials + APNs/FCM configuration. Until it lands no surface may claim push delivery — and none in R19 does. |

### §6 Document / artifact handling (DC)

| ID | Capability | Disposition | Where / gap row |
|---|---|---|---|
| DC-1 | A created thing has one durable home | **PRESENT** | The plan page (graph detail) is the single home; every surface renders the same single projection. |
| DC-2 | Artifacts evolve in place, never fork | **PRESENT** | Single projection + tracked revision discipline (PlanTransition); revisions are responded to in place (respond-revision path exercised by the API suite). |
| DC-3 | Sharing carries its terms visibly | **PRESENT** (honest form) / **ABSENT** (expiry leg, with reason) | Opal's form refuses fabrication: the plan share card (W13) and the conversation share sheet (W19-FIX-B) carry the thing's own finished facts and exactly one Copy-details action, and say in words what sharing does and does not do — because no share URL, expiry, or revocation exists on these contracts to disclose. The expiry/revocation leg (ST-F) is **absent with reason**: it ships only when the share backend grows real expiry/revocation truth. Invite/link sharing itself is real (rate-limited, honest fallback note). |
| DC-4 | The artifact carries its own history | **PRESENT** | Graph detail (W7 living plan): Who (names + answers + location lines), Activity/History from the plan's own transition record — one projection, finished strings. Re-verified at API level in this audit (journey detail reads) and by the r19 graphs suites. |

### §7 Voice (VO)

| ID | Capability | Disposition | Where / gap row |
|---|---|---|---|
| VO-1 | Voice notes inside the conversation | **PRESENT** | Thread composer records/sends/plays voice notes (`voiceNoteRecorder` + C1 thread wiring; transcription configuration-gated and honestly disabled when unconfigured — F-16 discipline). |
| VO-2 | Dictation never blocked | **PRESENT** | Platform dictation in every text field; no Opal composer replaces or disables it. |
| VO-3 | The agent can speak back | **PRESENT** (Opal answers) / **ABSENT** (plan summaries, with reason) | R19 W6: ReadAloudButton on Opal messages in Center — the displayed words spoken verbatim, iris mark pulsing while speaking, honestly absent when TTS is unconfigured. The plan-card summary leg (ST-I's second surface) is not built; named here so the row is not read as fully closed. |

### §8 Initiative + follow-through (FT)

| ID | Capability | Disposition | Where / gap row |
|---|---|---|---|
| FT-1 | Commitments tracked to completion, one place | **PRESENT** (in-place form) / **PIPELINE** (queue) | Follow-through is real machinery (FollowThrough engine, suppression reasons, quiet-hours truth after W19-FIX-A) and approvals happen where the work happens; the Activity room is the trail's first form. The unified open-items queue: **W-GAP-12**. |
| FT-2 | Consequential acts pass an approval card | **PRESENT** | Consent lineage at glass for provider actions + in-place plan/check-in approvals; the YOUR MOVE card is the pattern's flagship. |
| FT-3 | Named intent → full package prepared | **PRESENT** | L12 r1 + DIR-1/DIR-4 prepared-substance reveals: the next plan per person is assembled before the ask, with its missing slot named. |

### §9 Checkpoint honesty (CH)

| ID | Capability | Disposition | Where / gap row |
|---|---|---|---|
| CH-1 | Long work checkpoints in words | **PRESENT** | Same leg as CM-1: law + holding line; checkpoints are acceptance evidence per the Communication Model §4 gate (pack-owed captures named there). |
| CH-2 | No predicted completion / invented ETAs | **ABSENT with reason** (as a gated rule) | DIR-4-C was specced as a copy-gate rule; the gate was never built, so the *rule* is unenforced — stated plainly. No live violation was found in this audit: the one estimate-shaped surface (leave-by/travel) carries F-11 provenance labels ("measured" vs "assumed_default") instead of predictions. Building the sweep is retrospective item RW2/DIR-4-C, a check — not a capability the user is missing today. |
| CH-3 | Partial progress delivered per-part | **ABSENT with reason** | No multi-part job surface renders per-source progress in words. Per-source ingestion truth exists in the backend (D-ING statuses); the form (SF-A, for the What-Opal-graphs page) is unbuilt. |

### §10 Error recovery (ER)

| ID | Capability | Disposition | Where / gap row |
|---|---|---|---|
| ER-1 | Failure owned where it happened | **PRESENT** | L12 r4; R19 surfaces carry plain-language error states (verified in the blind-spot sweep and this audit's walk). One counter-instance found by this audit: the app-level crash boundary is still legacy-faced with a dead recovery path — journey-audit finding JA-05. The pattern is present; that one surface is a named defect, not a missing capability. |
| ER-2 | Retry retries the failed thing | **PRESENT** (R19 surfaces) | Graphs, Calls, Chats lists and Center/Orbits host actions carry in-place error + retry that re-runs the failed read (blind-spot sweep §3a). The whole-app forced-failure sweep that would prove it on every legacy-adjacent surface remains retrospective RW-11/HA-B — a check, named. |
| ER-3 | Degradation converts/continues/honestly cannot | **PRESENT** | Lockdown doctrine (WALLET_MAP §L) + the R19 honest gates (in-call capture note, graphs distance states, orbit gate) all take the next honest form or state the inability. |

## Counts

- **Rows walked: 43. Silently missing: 0.** Arithmetic: 24 + 11 +
  3 + 1 + 4 = 43.
- **PRESENT** (in full, in Opal's form): **24** — CM-1, CM-2, CM-4,
  CM-5, PR-3, PR-4, SM-4, NV-1, NV-2, NV-3, NV-5, NV-6, SD-2, DC-1,
  DC-2, DC-4, VO-1, VO-2, FT-2, FT-3, CH-1, ER-1, ER-2, ER-3.
- **MIXED — a PRESENT leg plus a named PIPELINE or ABSENT leg:
  11** — CM-3 (place cards absent, DC-GAP-1), PR-1 (mode object,
  W-GAP-19), PR-2 (full form, W-GAP-12), SM-1 (depth, W-GAP-03/13),
  SM-3 (document leg, W-GAP-31), SM-5 (assembly leg, W-GAP-09),
  SM-6 (ledger glass, GYRO-02/W-GAP-13), NV-7 (memory leg,
  W-GAP-31), DC-3 (expiry/revocation truth absent), VO-3
  (plan-summary read-aloud absent), FT-1 (queue, W-GAP-12).
- **PIPELINE only: 3** — CM-6 (W-GAP-31/02), SM-2 (W-GAP-18/12),
  SD-1 (W-GAP-12).
- **FOUNDER-GATED: 1** — SD-4 (push rail, GYRO-09).
- **ABSENT with stated reason: 4** — NV-4 (by design), SD-3
  (unbuilt edition; dependency W-GAP-31), CH-2 (rule ungated; no
  live violation), CH-3 (per-part progress form unbuilt).

Every PIPELINE row names its WALLET_MAP §F register row; every
ABSENT row names its reason; the one FOUNDER-GATED row names the
founder's exact step. The trace's standing form going forward is
retrospective item RW2-14: this file is re-walked at each
delivery, and a disposition that regresses fails that delivery's
assembly.

*FOUNDER_ACCEPTED = NO. This trace certifies capability presence,
not acceptance.*
