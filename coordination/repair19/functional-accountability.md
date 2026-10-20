# Repair #19 — W22: THE FUNCTIONAL ACCOUNTABILITY STATEMENT

**Directive:** founder W5-29, 2026-10-19 10:28 PDT. **Law executed:**
for every primary journey, the whole pipe proven on the SERVED build —
UI action → API/contract → state transition through the single gate →
projection → rendered result → read-back IDENTICAL on every surface
that shows the object. A break anywhere is a charged finding with a
do-not-ship ruling for that link.

**Build:** worktree `wt-r19-account`, branch `muse/r19-account`, tip
`9a0a1be4ca892cb66957cab94156d154994e8a39` (= pushed `muse/repair-19`
mirror `e1154696a583c46f84bc48b48a96984af598ce50`, tree
`832a3604e10fd0803f5b30750a56d1c983869e15`, tree-verified by W21).
No application code was edited in this wave.

**Stack (this wave's runs):** the tip built and served locally —
Phoenix on :4000 from `wt-r19-account`, `vite build` + `vite preview`
on :5173, fresh Postgres 16 DB `opal_dev_r19w22` (**113 migration
files = 113 `schema_migrations` rows = 113 distinct versions**, max
`20261030010002`, re-proven on this DB), pinned app clock
`2026-10-18T21:00:00Z`, synthetic-provisioned review accounts
A = Ethan Walker (+12025550101), B = Maya Torres (+12025550102),
C = foreign account (+12025550103), human seed world on A, headless
Chromium at **390×844, dark mode** for the rendered legs (both-mode
rendered proof on this tip is Pack V2's, cited where used).
Environment note, for the record: the VM reaped the first stack
mid-wave (Postgres, `/tmp` deps/build, server processes — the same
reap the W11 battery recorded); everything below is from the rebuilt
stack on the fresh DB, never from the reaped one.

**Evidence artifacts:** `~/workspace/opal-graph/w22-scratch/` —
`chain-w22-api.json` + `api-probe.log` (pass 1), `chain-w22-api2.json`
+ `api2-probe.log` (pass 2), `chain-w22-ui.json` / `chain-w22-ui2.json`
/ `chain-w22-ui3.json` / `chain-w22-ui4.json` + `ui*-probe.log`
(rendered passes), and the `w22-*.png` frames named per journey.
W21 citations were verified to resolve before use (every file,
frame, test, and the FUNCTIONAL CHAIN section itself:
`packfix-report.md:183ff`, `packfix-scratch/chain-probe.json`,
`packfix-scratch/chain-rail-current-dark.png`, pack-v2 manifest +
frames — all present on disk).

---

## J1 — Plan lifecycle: create → join/accept → confirm → complete → Past

**Verdict: PROVEN.**

- **Create (gate):** A creates a plan in the A–B direct conversation
  (`POST /conversations/:id/plans` → 201, status `tentative`,
  B `viewer_state: pending`). B's list carries it before accepting.
- **Join/accept (single gate):** B `POST /journeys/:id/accept-going`
  → 200 `{current_user_accepted: true, going_count: 2,
  participation_phase: "going", lock_in_label: "Saturday 7:30 PM"}`.
  The alignment-confirm endpoint afterwards honestly refuses with
  422 `nothing_to_confirm` — there is no pending proposal left to
  confirm; accept-going is the terminus that lands in real state,
  and no surface fabricates a second confirmation.
- **Read-back identical (API):** A's and B's `GET /opal/plans`
  entries are byte-identical in the shown fields (title
  "Dinner at Juniper and Ivy", status `tentative`,
  `viewer_state: accepted`, time "Saturday", place
  "Juniper and Ivy"); `GET /opal/plans/:id/history` returns the
  identical payload to both (counts going 2 / total 2; lines
  "Created by Ethan Walker." / "Maya Torres said they are going.");
  both chats rows carry the identical `next_plan`
  `{plan_id, state: "forming", status: "tentative"}`; the thread's
  `next_plan` carries the same title/when/where.
- **Read-back identical (rendered, 390×844):** Home card —
  "○ Forming · Dinner at Juniper and Ivy · Saturday · Juniper and
  Ivy · 2 of 2 going"; Chats row — full-width in-row card with the
  same four facts (`w22-chats-dark.png`); thread strip —
  "NEXT TOGETHER ○ Forming Dinner at Juniper and Ivy - Saturday -
  Juniper and Ivy"; graph detail — "○ Forming … 2 of 2 going ·
  When Saturday · Where Juniper and Ivy · Who: Ethan Walker Going,
  Maya Torres Going" (`w22-graph-detail-dark.png`).
- **Complete → Past:** the seed world's completed plans read back
  with status `completed` in the plans list; one's History
  projection (counts + answered/created lines) returns 200 and
  agrees; the rendered Graphs **Past** lens shows "Past 2" with the
  completed cards (`w22-graphs-past-dark.png`). The `:complete`
  transition itself is the PlanTransition gate's
  (`{:plan, "agreed", :complete} => "completed"`), exercised by the
  two-user lifecycle suite in the W10/W11 evidence.
- **Scope notes (not breaks):** `GET /journeys/:id` refuses
  conversation-born plans with 409 `not_journey` for both parties —
  their detail surface is the PlanHistory projection above, which
  is the W10 J3 design. The plan does not appear in `GET /home/feed`
  (the moments feed); Home's plan cards render from the
  `/opal/plans` contract, which agrees.
- **Observation (recorded, not charged):** the conversation
  alignment payload carries `canonical_start_at:
  2026-10-03T19:00:00Z` / `temporal_state: "past"` alongside a null
  proposal (detail/commitment/prompt all null), while every surface
  that shows the plan says Forming/Saturday. Both viewers read
  identical alignment bytes and no rendered surface presents those
  fields as the plan's state, so the J1 pipe does not break; the
  stale-looking canonical fields are named here for the founder to
  overrule if he weighs them differently.

## J2 — Live

**Verdict: EXCEPTION (stands), absence verified honest.**

The C2 live host + viewer build remains an unbuilt wave — carried
exception from W10/closing handoff. This wave re-verified the
absence is honest on the served build: a rendered Home scan found
**zero** live controls (no button reading Watch / Go Live / Start
Live, no `[data-testid*="live"]` element); the buttons present
(Confirm / Dismiss / View plan) all have real handlers. The JA-06
dead-Watch class stays closed (`jafix-report.md` JA-06: `feedAction`
is optional and renders only with a real handler).

## J3 — Graph detail: permission states, distance honesty, private seal

**Verdict: PROVEN** (BS-06 distance exception carried, see below).

- **Permission states:** foreign account C — journey 403, history
  403, plan absent from C's list. Parties read detail/history 200.
- **Distance honesty (BS-06):** the History projection carries
  `distance_label: null`, `distance_basis: null` — nulls, never a
  fabricated number; the rendered detail's Who section reads
  "Going · Not sharing location" for both participants. No
  current-position/distance writer exists; none is faked. The
  BS-06 exception stands exactly as named.
- **Private seal, end to end (JA-02 re-run at served level):** A
  sets the plan private (`POST /opal/plans/:id/private
  {is_private: true}` → 200). B then reads: plans list — absent;
  journey — 403; history — 403; chats row — `next_plan: null`;
  thread messages — `next_plan: null` **while B's own message
  record remains intact** (the JA-02 named exception, honored);
  alignment — sealed to the unknown-field shape; home feed — plan
  id absent. A still reads the plan everywhere. Re-open
  (`is_private: false` → 200) restores B's read exactly.
- **Rendered private zone (graph-lock leg):** Graphs Private with
  the passcode set — wrong code → "That code did not open it.",
  zone stays locked; right code → zone unlocks and honestly shows
  empty (A holds no private plans at that moment)
  (`chain-w22-ui.json: j3_private_zone_*`).

## J4 — Find a person → profile → message

**Verdict: CHARGED FINDING — FA-01** (the find leg's search control
is dead; every other leg proven).

Proven legs:
- **Message in context:** A posts in the A–B thread (201); B's
  chats row preview becomes the message text with `unread_count:
  1`; both threads read the message back.
- **Profile:** thread-header avatar opens the person sheet —
  "Maya Torres · @mayatorres · Next together ○ Forming Dinner at
  Juniper and Ivy · Saturday · Message · What Opal remembers ·
  Done" (`w22-profile-dark.png`) — the same facts as the thread;
  **Message** returns to the real thread.
- **Find by scrolling** works; the person is reachable in ≤2 taps.

The break:
- **FA-01 — the served Chats search is a dead control.** The
  "Search people or conversations" input on the served Chats list
  (`PeopleChatsList`, `apps/opal_web/src/opalUi/c1/C1Surfaces.tsx:
  1175`) is rendered with **no `value`, no `onChange`, and no
  filter anywhere in the component** (its props are only
  chats/onNewChat/onOpen/onShowCalls). Rendered proof: typing
  "Jordan" leaves the full unfiltered list on screen — Maya
  Torres ×2, Jordan Ellis, Weekend Crew, Alex Rivera, Priya Shah,
  Chanelle Brooks (`w22-chats-search-dark.png`,
  `chain-w22-ui2.json: search_jordan_rows`). The sibling searches
  are wired (Center log "Search your chats" filters — proven in
  J7 below; Calls "Search calls" carries `value`/`onChange` and a
  no-match empty state), so this is a single-surface omission,
  JA-06-class: a control that accepts input and does nothing.
  W10 recorded this field as "present"; presence was never
  function until this wave exercised it. **Ruling: do not ship
  the Chats surface with this control in this state** — wire it
  to the list filter (the Center log's pattern) or remove the
  field until it works.

## J5 — Memory: forget end to end

**Verdict: PROVEN for forget; EXCEPTION (named) for edit** —
the capsule edit/correction surface remains W-GAP-03 wallet
pipeline work (carried from W10/closing handoff); correcting a
memory is forget + re-tell until it lands.

- **API chain:** capsule created (201, with its because-line) →
  present in `GET /memory-wallet` → foreign DELETE → 404 → owner
  DELETE → 200 `{forgotten: true, source: "capsule"}` → absent
  from the next wallet read (count 1 → 0). `/memory/facts` never
  carried the capsule before or after — a different record class,
  stated so the absence claim is scoped to the surfaces that show
  the object (wallet + both rooms that render it).
- **Rendered chain (the room itself):** a second capsule created
  via API → Memory room shows its forget row
  (`c2-setting-row-forget-capsule-<id>` present,
  `w22-memory-dark.png`) → tapping it arms the two-step confirm
  (`c2-forget-confirm`) → "Forget it" → row gone from the room →
  API read-back: wallet count 0, capsule text absent everywhere in
  the wallet payload (`chain-w22-ui.json: j5_*`).

## J6 — Calls: missed → call back → state changes; in-call graphing pause

**Verdict: PROVEN** at the levels stated per link — and the voice
leg is **FOUNDER-PROVEN** (below), which supersedes the F5
headless ceiling for that leg. The remaining J6 gap is exactly
one: **live graphing/transcription of calls into memory** (see
INGESTION below).

- **FOUNDER-VERIFIED voice calling (2026-10-19) — top of the
  evidence hierarchy (founder phone > runtime > automation):**
  the founder personally completed a real Opal call today —
  computer and phone in separate rooms, **two different
  accounts**. The calling path works end to end on real devices.
  This supersedes W11's F5 headless ceiling **for the voice
  leg**: the F5 exception now covers only rendered in-call
  *frames* for the pack, not whether calling works. Batch
  transcription works (connections verification,
  `coordination/repair18/connections-verification-report.md`:
  Deepgram batch STT TRUE on recorded function evidence); the
  unwired leg is **live** per-call transcription (F-16) —
  graphing's live ingestion into memory is the named remaining
  gap, declared in INGESTION chain (a).

- **Missed → row state (served API):** B calls A in their
  conversation (201) and cancels → A's log row:
  `call_state {state: "action", reason: "missed_unresolved",
  label: "Call back"}`; the caller's own row for the same record
  reads `past / settled` — one record, viewer-correct states.
- **Call back → resolution:** A calls B back in the same
  conversation; B answers; media connects; after hangup, A's
  original missed row reads `{state: "past", reason: "settled",
  label: "Settled"}` and the callback row reads the same settled
  state with `ended_reason: hangup`. The thread's call facts
  agree: the thread renders both records ("Missed call · 7:31 PM",
  "Audio call · 3s · 7:31 PM", `w22-thread-dark.png`), and the
  conversation + call outcomes endpoints agree with each other
  (both empty — no outcome proposals were generated by these
  segments; neither surface invents one).
- **Rendered log:** before — a row carries the "Call back" state
  label; clicking Call back creates the outgoing call and the log
  re-renders with a new top row in state **"Live now"**
  (`w22-calls-dark.png` → `w22-calls-after-callback-dark.png`;
  `chain-w22-ui.json: j6_calls_*`). Headless ceiling (W11/F5): the
  ringing surface is the log row, not a connected in-call frame —
  for the voice path itself, the founder verification above is
  the governing evidence.
- **In-call graphing pause → ingestion stops → lineage → resume
  (served API + served-DB read-back):** on the connected call,
  A allows → `graphing: waiting_for_other`; B allows →
  `graphing: graphing`, and A's and B's assist read-backs are
  identical (`assist: active`). A final transcript segment
  persists (`persisted: true`, segment id returned). B pauses →
  both read-backs flip to `graphing: paused` (B:
  `self_paused: true`); a segment submitted during the pause →
  **409 `assist_inactive`, and the served DB holds no such
  segment**. B resumes → `graphing: graphing`; a new segment
  persists. The consent lineage in the served DB records the
  whole arc in order: `graphing_on → graphing_on →
  graphing_paused → graphing_resumed`, each with its resulting
  state — and the transcript table holds exactly the two
  non-pause segments. Level stated honestly: this leg is
  API + DB read-back on the served stack (the state machine and
  its projections), not a WebRTC media session between headless
  contexts; the ExUnit graphing suite (W10/W12) proves the same
  gate at unit level.

## J7 — Orbits: the full manage set as one chain per action

**Verdict: CHARGED FINDING — FA-02** (the unlock gate's rendered
presentation; every other chain proven, including unlock itself
at API level and via keyboard submit at rendered level).

Proven chains (each: UI/API action → gate → read-back on every
surface showing the object):
- **Birth:** scoped create anchored to the person at birth (201;
  anchor on the create response and in the sessions list).
- **Rename:** `PATCH /opal/conversations/:id` {title: "Saturday
  dinner decisions"} → response and sessions list carry the new
  title → rendered Center log shows the renamed row (after
  unarchive, below) → rail search "Saturday dinner" filters to
  exactly that row (`chain-w22-ui3.json: j7_log_search_renamed`).
- **Pin holds against recency:** pin → `pinned: true` with a
  `pinned_at` stamp; a newer session then takes fresh activity —
  the rendered log keeps the renamed session in its own **PINNED**
  section above ORBITS (`w22-orbit-gate3-dark.png`,
  `center-log-pinned` present).
- **Archive:** archive → read-back `user_archived: true`,
  `active: false`, session leaves the log's rows; the **person
  thread is untouched** (200, 3 messages, its `next_plan` intact).
  Unarchive restores it to the log under its renamed title.
- **Delete:** remove a second session → `{removed: true,
  deleted_messages: 2}` → gone from the list and the person
  index; the person thread and plan untouched (W14-04 pattern,
  re-proven in pass 1).
- **Make-private:** `POST /opal/conversations/orbit-private` on the
  person anchor → `{ok: true, updated: 1}` → sessions read-back
  `anchor.private: true`. (The sheet-click leg of make-private is
  W21's proven chain, cited, not re-run.)
- **Unlock (API + client contract):** with the graph-lock passcode
  set (200, `passcode_set: true`), `orbit-verify` — wrong code →
  403 `wrong_code`; right code → 200 `{unlocked: true}`;
  foreign account → 404. The JA-01 joint contract holds at served
  level.
- **Unlock (rendered, keyboard path):** tapping the locked
  "Jordan Ellis · Private" group header mounts the passcode
  prompt; typing the right code and submitting with Enter →
  prompt closes, the group header re-renders unlocked —
  "Jordan Ellis — Keep this one between us: a surprise for
  Jordan. · 1" (`w22-orbit-enter-submit-dark.png`). The verify
  pipe itself works in the served UI.

The break:
- **FA-02 — the orbit unlock prompt renders broken at the served
  layer; its submit button cannot be tapped.** The prompt's root
  (`.c1-rail-scrim`, `data-testid="orbit-unlock-prompt"`) computes
  to `position: static`, rect **y=681, h=163** at 390×844 — laid
  out in flow at the bottom of an `overflow: hidden` body and
  painted under the rail, instead of the fixed modal its design
  specifies. It is invisible in captures taken while it is open
  (`w22-orbit-gate3-dark.png`). Hit-testing agrees:
  `elementFromPoint` at the code input's and the submit button's
  centers is **not** those elements, and a Playwright tap on
  "Open this orbit" times out on actionability in two separate
  runs (`chain-w22-ui3.json: gate_geometry, gate_submit_error`).
  Neither a wrong code (no error line can be produced by tapping)
  nor a right code can be submitted by tap; only keyboard
  form-submit completes the flow (above). **Root cause, exact:**
  the only `.c1-rail-scrim` rule in the shipped CSS is scoped
  `[data-design="r18"] .c1-rail-scrim { position: fixed; inset: 0;
  … }` (`apps/opal_web/src/opalUi/c1/c1.css:339`), and
  `data-design="r18"` exists only on the C1 host wrappers
  (`C1ShellHosts.tsx:1050,1731`). `TopLayer` portals the prompt
  to body level — outside both wrappers — so the rule never
  matches it; `.opal-top-layer` itself is `display: contents`
  by design and supplies no positioning. The in-place rail is
  inside the wrapper and renders correctly; only the portaled
  prompt escapes. This is also why W11's `orbit-private-gate`
  capture failed identically on the pre-W21 build — a capture
  gap then, a characterized defect now. **Ruling: do not ship
  the private-orbit unlock in this state.** FIX scope: give the
  prompt's scrim/panel positioning that does not depend on the
  host wrapper (unscoped rule or a layer-token fixed overlay,
  the pattern the Graphs Private zone — which renders correctly
  — already uses), plus one served-breadth rendered case:
  header tap → prompt visible and hittable → wrong code shows
  the error → right code unlocks and the group expands.

## J8 — Settings: Soul choice → behavior; call-graphing standing control

**Verdict: PROVEN.**

- **Soul → PATCH → read-back:** PATCH quiet hours + timezone →
  GET reads back exactly what was saved, label included
  (pass 1: 21:30-style window edits and the 00:00–23:59/UTC and
  restored 22:00–08:00/America/Los_Angeles states).
- **Behavior changes (the resolver's consumers):** against the
  served DB at the fixed instant 2026-10-18T21:00:00Z — window
  00:00–23:59 UTC (instant inside) →
  `QuietHours.quiet_now?(A) = true`; PATCH off (start == end) →
  read-back label "Quiet hours are off" and
  `quiet_now?(A) = false` **at the same instant**; restored
  22:00–08:00 America/Los_Angeles (instant = 14:00 PDT, outside)
  → `false`. Level stated: the behavior leg is evaluated through
  the one resolver module every consumer calls (push
  `notification_intelligence.ex:81`, check-in suggestion
  `checkin_suggestion.ex:277`, follow-through
  `follow_through.ex:309` — source-verified single gate), against
  the same served DB the HTTP PATCH wrote.
- **Rendered Soul leg:** the room's quiet-hours toggle flips the
  sentence to "Quiet hours are off. …" and the API read-back
  agrees (`quiet_hours_start == quiet_hours_end == 22:00`,
  label "Quiet hours are off") — UI → API → resolver semantics
  in one chain (`chain-w22-ui.json: j8_soul_*`).
- **Call-graphing standing control:** PATCH
  `/relationship-access/graphing` `call_mode → never` → GET
  reads back `never` → the decision consumer
  (`POST …/graphing/decide`) flips from `{allowed: true,
  mode: "ask"}` to `{allowed: false, reason: "never"}`; PATCH
  `global_paused → true` (mode restored) → decide flips to
  `{allowed: false, reason: "global_paused"}`; restore →
  read-back `ask_each / global_paused: false`. The in-call
  default respects the same policy record the room edits — API
  truth and consumer behavior move together.

## J9 — Share; profile from avatar

**Verdict: PROVEN.**

- **Card facts == detail facts:** graph detail (rendered) —
  "○ Forming · Dinner at Juniper and Ivy · Saturday · Juniper
  and Ivy · 2 of 2 going · Who: Ethan Walker Going, Maya Torres
  Going". Share sheet opened from that detail —
  "Share this plan · ○ Forming · Dinner at Juniper and Ivy ·
  Saturday · Juniper and Ivy · With Ethan Walker, Maya Torres ·
  2 of 2 going · Copy details · Done" (`w22-share-card-dark.png`).
  Title, state, day, place, people, and count are the plan's own
  finished facts, identical on card, detail, Home, and thread
  (J1 read-backs); exactly one Copy-details action; nothing
  fabricated (no link, expiry, or audience invented).
- **Profile from avatar == thread facts:** J4's sheet — same
  Next-together line as the thread strip, same people, Message
  returning to the real thread.

## F1 / F7 — cited, not re-run (per wave instruction)

- **F1 imagery: PROVEN by citation** — `packfix-report.md`
  FUNCTIONAL CHAIN §F1: seed record → contract (media URLs on
  `/opal/plans`, `media_ref` on `/stories`) → bearer gate
  (401 plain → 200 with bearer, JPEG magic, octet-stream retype)
  → `AuthedImage` → rendered pixels 10/10 loaded in both modes,
  story viewer rect equality. Artifacts verified on disk:
  `packfix-scratch/chain-probe.json`, pack-v2
  `home-{dark,light}.png`, `story-viewer-{dark,light}.png`.
- **F7 mode chain: PROVEN by citation** — `packfix-report.md`
  §F7 + `f7ServedModePin.test.ts`: preference → unconditional
  boot stamp → plain-entry probe (dark `rgb(13, 11, 18)` /
  light `rgb(255, 254, 251)`). Corroborated incidentally by this
  wave's own flagless served build: the shell stamped dark mode
  and the build chip read "seed - 9a0a1be" with no query flag
  (`chain-w22-ui.json: shell`).

---

## INGESTION — the two conversation chains (founder update, 2026-10-19 12:26 PDT)

**LLM layer (applies to both chains):** the provider is
**swappable by config** — `OpalCore.Intelligence.LlmAdapter`
reads `OPAL_LLM_PROVIDER` (default `deepseek`; `openai`
implemented on the same OpenAI-compatible shape; `anthropic`
declared but honestly `{:disabled, :anthropic_not_implemented}`)
and `OPAL_LLM_MODEL`. **DeepSeek is today's provider.** The
response-quality north star is **Claude-grade conversational
behavior** — ingest → perceive → respond. Readiness is honest:
no key → `{:disabled, :api_key_missing}`, and `LlmRespond`
falls back to templates with the fallback logged, never
synthesizing model text.

### Chain (a) — call → recording/transcript → memory store → scoped context assembly → LLM perception

1. **Call (voice transport): FOUNDER-PROVEN** (2026-10-19,
   two accounts, separate rooms — see J6). In code: WebRTC with
   Twilio **NTS** TURN only (`calls/twilio_nts.ex`,
   `calls/turn_credentials.ex`); no PSTN dial-in/out exists.
2. **Recording / transcript: PROVEN for batch; DECLARED for
   live.** Batch: `Intelligence.CallTranscription` (per-call
   transcription consent required — no consent, no Deepgram
   call) → `DeepgramClient.transcribe_batch/2` → diarized key
   moments → thread surface; voice notes take the same batch
   path via `Intelligence.AudioIngestor` and persist as a
   `voice_transcript` message. Batch STT is **TRUE** on
   recorded function evidence
   (`coordination/repair18/connections-verification-report.md`,
   Deepgram rows). Live: the in-call path is consent-gated
   machinery — `Calls.Assist.accept_transcript/3` is the ONLY
   entry that can persist a segment, the Deepgram grant
   refuses unless the assist state is `:active` for both
   participants, and W22's J6 run proved the gate end to end
   at API + served-DB level (segments persist, pause halts
   ingestion with `assist_inactive`, the lineage records
   `graphing_on → graphing_paused → graphing_resumed`). But
   the live provider session itself (grant + device-mic
   websocket on a real call) has **never been exercised in
   evidence — DECLARED, blocker F-16**: live graphing /
   transcription of calls into memory is the one remaining
   J6/ingestion gap.
3. **Memory store: PROVEN as implemented (see "where it sits"
   below).** What a call leaves behind today: transcript
   segments on the call record (ephemeral class — deleted
   with the call), and the graph fold that runs only inside
   `Assist.store_final` after a segment insert —
   `VoiceAlignment.record/2`, `Outcomes.record_proposal/3`,
   commitment / open-question / waiting-on extraction →
   `call_outcomes` and proposals. Memory write-back from
   conversation exists as direct table writes (candidates →
   `shared_memories` pending consent; person-memory updates),
   **not** as capsule proposals with policy attached
   (WALLET_MAP §D-ING 7-step trace; A2/A14 gaps).
4. **Scoped context assembly: PROVEN for the capsule class;
   PARTIAL as a whole (W-GAP-09).** `PromptBuilder.build/4`
   assembles the LLM prompt for one explicit scoped account
   and appends personal-memory capsules **only** through
   `MemoryWallet.ScopedContext.prompt_section/2` →
   `CapsuleRead.list_for_owner/2` (owner + scope + purpose +
   expiry, fail closed) — the builder never reads a capsule
   store directly (GYRO-01 guard, in-code). The wider Center
   packet is a separate assembler (`OpalContext.assemble/3`).
5. **LLM perception: PROVEN at code/contract level.**
   `LlmRespond` → `PromptBuilder` package → `LlmAdapter.chat`
   → provider response; unconfigured/unready provider degrades
   honestly (above). No served-build live-LLM turn was run in
   this wave (no provider key in the review stack) — stated
   plainly: this link is proven as the wired path with honest
   disabled behavior, not as a live model conversation.

### Chain (b) — chat → message store → scoped context assembly → LLM perception

1. **Message store: PROVEN on the served build** (W22 J4:
   send → thread read-back → chats-row preview + unread on the
   other account). In code: person/group threads persist as
   `Messaging.Message` rows on `conversations`/`messages`;
   Center (Opal) conversations persist separately as
   `opal_conversations`/`opal_messages` (the dual-system
   residue is GYRO-11, named in the map).
2. **Ingestion into intelligence: PROVEN (validated trace +
   code).** Message persisted → `Intelligence.EventIngestor`
   writes `intelligence_events` **persist-first** (idempotent
   on the message id) → Extractor / Reasoner / Executor →
   proposals and plan options through the PlanTransition gate
   (WALLET_MAP §D-ING 7-step trace, validated; module set
   present at the tip: `event_ingestor.ex`, `extractor.ex`,
   `reasoner.ex`, `executor.ex`, `pipeline.ex`). Voice notes
   enter the same pipeline through `AudioIngestor` (batch
   transcript → `voice_transcript` message → `message.received`
   event).
3. **Scoped context assembly: PROVEN, same assembly as (a)4**
   — one scoped account per package; conversation history
   window (last 10 Center messages, role + body) from
   `OpalContext`; capsules only via the `ScopedContext` →
   `CapsuleRead` facade with `scope_kind: "conversation"`.
4. **LLM perception: PROVEN, same as (a)5** —
   `LlmRespond`/`LlmAdapter`, DeepSeek by config today,
   honest-disabled fallback.

### Where the memory actually sits today — IN CODE (the founder's question, part 1)

- **Messages** sit in Postgres: `messages` (person/group
  threads) and `opal_messages` (Center), under
  `conversations` / `opal_conversations`.
- **The signal stream** sits in `intelligence_events`
  (`EventIngestor`, persist-first) — every ingested message
  and call outcome lands there before extraction runs.
- **Personal memory** sits in the **memory wallet**: one
  `memory_wallets` row per account (`MemoryWallet.Wallet`,
  W-GAP-01 first form) owning `MemoryCapsule` rows; the ONE
  object every consumer receives is
  `MemoryWallet.PersonalMemoryCapsule` (payload + plain-words
  provenance + scope policy as data across 8 dimensions).
  Older durable-preference fragments still live in
  `personal_relationship_memories` and are surfaced through
  the same capsule facade with no data rewrite (`source:
  :durable_preference`). The only read path is
  `CapsuleRead.list_for_owner/2`.
- **Everything else Opal "knows"** still sits as extracted
  rows across ~10 tables (shared memories, person memory,
  outcomes, proposals — WALLET_MAP §D-ING: "messages +
  extracted rows in ~10 tables"), plus the older
  `OpalCore.Memory` explicit-facts facade. Context assembly
  today is therefore **3+ builders** (`OpalContext`,
  `PromptBuilder`, the Memory facade's recall); only the
  capsule class has its single scoped builder
  (`ScopedContext`).

### What the WALLET BUILD adds — per the map (the founder's question, part 2 — plan, not code)

Per `shots/repair18/WALLET_MAP.md` §D-ING and the §F gap
register, the wallet build changes the destinations, not the
transports: conversation sources stay REAL as they are, but
an ingested conversation becomes an **ephemeral session →
admitted capsules** in the one capsule store, replacing the
~10-table extracted-row sprawl and the direct-write memory
write-back (W-GAP-02 full form, W-GAP-18 feedback capsules).
It adds: the wallet entity completed (W-GAP-01), encryption
at rest for capsule payloads (W-GAP-04), the full scope-policy
graph with time + purpose enforcement (W-GAP-05/06 — today
recorded, partially enforced), **one SCB + one package type**
for ALL context assembly (W-GAP-09 full form — today only the
capsule leg has it), the decision-trace record (W-GAP-10),
the per-capsule signed audit chain (W-GAP-13, GYRO-02), the
consent-lineage chain + viewer (W-GAP-15 — also HF-GAP-8, a
per-conversation "what Opal took from this" view), and the
two-account isolation proof suite as a standing gate
(W-GAP-32 — its capsule-class first form already runs). The
§D-ING rows for **inbound SMS, in-room capture, and Zoom
ingestion stay ABSENT** until that build — links/handling
exist; nothing said there becomes memory today.

---

## Totals

| Journey | Verdict |
|---|---|
| J1 plan lifecycle | **PROVEN** (one non-charged observation: alignment canonical fields) |
| J2 Live | **EXCEPTION** (host/viewer wave unbuilt; absence honest, re-verified) |
| J3 graph detail | **PROVEN** (BS-06 distance exception carried inside it) |
| J4 find → profile → message | **CHARGED — FA-01** (Chats search dead; other legs proven) |
| J5 memory | **PROVEN** for forget; **EXCEPTION** leg for edit (W-GAP-03) |
| J6 calls | **PROVEN** — voice leg **FOUNDER-PROVEN** 2026-10-19; remaining gap = live graphing/transcription only (INGESTION) |
| INGESTION (a) call chain | **PROVEN** except the live-transcription link — **DECLARED (F-16)** |
| INGESTION (b) chat chain | **PROVEN** (LLM link at code/contract level, honest-disabled) |
| J7 orbits | **CHARGED — FA-02** (unlock prompt presentation/button; all other chains proven) |
| J8 settings | **PROVEN** |
| J9 share / profile | **PROVEN** |
| F1 / F7 | **PROVEN by W21 citation** (citations verified to resolve) |

**Charged findings: 2** — FA-01 (Chats search dead control, J4),
FA-02 (orbit unlock prompt unrendered/untappable, J7). Both are
entered as permanent rows in `shots/repair19/COMPLAINT_LEDGER.md`
§P. Each carries a do-not-ship ruling for its link; neither
touches the proven chains around it.

**Exceptions carried:** J2 Live host/viewer build wave; J5
capsule edit = W-GAP-03; BS-06 distance writer absent; F5
connected in-call *frames* still owed to the pack (the voice
path itself is founder-proven 2026-10-19 — F5's scope narrowed
by the founder update); F-16 live transcription not wired
(J6's segments rode the API ingestion path, not a live
provider session) — now the single named remaining gap for
calls ingestion; BS-10/JA-13 mobile lockfile; the 36
retrospective widenings.

**FOUNDER_ACCEPTED = NO · FREEZE = HOLD · PASS2 = NO — unchanged.**

---

## RESOLUTION ADDENDUM (W28-CLOSE, 2026-10-19) - the delivery's current truth = the statement above + this addendum

The statement's verdicts stand as the pre-fix record. The two charged
findings are now resolved, and the ambient findings charged after the
statement (W26) are resolved or dispositioned:

- **FA-01 (J4, Chats search dead control) - FIXED by W25-FAFIX**
  (commit `7254caab`, merged into `muse/repair-19`). Proofs in
  `coordination/repair19/fafix-report.md`: the served-breadth
  input-exercise pin `fa01ChatsSearchExercise.test.tsx` renders the
  REAL served `PeopleChatsList` and types into the field - "Jordan"
  narrows to exactly [Jordan Ellis]; "Juniper" narrows to [Maya
  Torres] with her plan-awareness card intact; "cabin" narrows to
  [Weekend Crew]; a no-match query yields 0 rows + the honest empty
  line "No chat matches that search."; clearing restores all rows.
  The widening W22 named was executed: a three-layer sibling sweep of
  every input/textarea in the served C1/C2 trees (87 elements) found
  exactly ONE unwired input - the FA-01 field itself. W28 pack
  frames: `pack-v2/chats-list-dark.png` + `chats-list-light.png`
  (search field visible, list populated) and
  `pack-v2/chats-list-filtered-dark.png` +
  `chats-list-filtered-light.png` (the "Jordan" query narrowing the
  list in place, final tip `95319bd7`).
- **FA-02 (J7, orbit unlock prompt unrendered/untappable) - FIXED by
  W25-FAFIX** (commit `66c84ed4`, merged). Proofs in
  `fafix-report.md`: the prompt now carries its own positioning
  (`c1-orbit-unlock-scrim`), independent of the `[data-design="r18"]`
  host wrappers its only CSS rule used to hide behind; the
  served-breadth pin exercises header tap -> prompt visible and
  hittable -> wrong code shows the error line -> right code unlocks.
  W28 pack frames on the final tip: `pack-v2/orbit-private-gate-dark.png`
  + `orbit-private-gate-light.png` - manifest gate probes record the
  prompt rect at y=0, h=844 (full fixed overlay) with
  `elementFromPoint` hittability input=true and submit=true in both
  modes. (This also closes the statement's note that FA-02 explained
  W11's uncapturable orbit-private-gate frames: the frames now exist.)
- **Ambient findings (W26 audit, AT series) - fixed by W27-ATFIX**
  (merged; commits cited per item in
  `coordination/repair19/atfix-report.md`): AT-02 token convergence
  (`f9740cfb` + legibility follow `fdab3504`), AT-03 live repaint
  (backend wire `4361d3ae`, web `1095f93e`), AT-04 ignition
  (`cf302240`), AT-05 dock echo + AT-06 dock orb state-keying,
  AT-08 fire reserved for lit items (`f6b33f97`), AT-09 decorative
  canon removed (`d1e053b6`), AT-10 Home lit coalescence
  (`791013cd`), AT-12 signature intent keys (`b2e03947`), AT-13 graph
  card state edge (`8ce50fae`), AT-14 StateStone pattern channel
  (`0f34bf64`), AT-15/AT-18 pulse leg (`f1b9b483`). AT-11 is declared
  (legacy unmounted loops - erasure-pass scope); AT-16/AT-17/AT-18
  carry rulebook dispositions (red scarce + verb-paired, verified;
  ready-gold claim downgraded; happening hue reframed, urgency by
  pulse + words). Full per-item dispositions:
  `shots/repair19/COMPLAINT_LEDGER.md` §AT and the W28 closing block
  in `shots/repair19/WALK_ACCEPTANCE.md`.

The exceptions the statement carried are unchanged by this addendum:
J2 Live host/viewer build wave; J5 capsule edit = W-GAP-03; BS-06
distance writer absent; F5 connected in-call frames owed to a device
walk; F-16 live transcription not wired; BS-10/JA-13 mobile lockfile;
the 36 retrospective widenings. The W24 differentiation remainders
join them: DL-05 first-run step, DL-09 close-circle write leg, DL-10
People hub, DL-11 inference serving leg (see the ledger's §DL).

**FOUNDER_ACCEPTED = NO - FREEZE = HOLD - PASS2 = NO - unchanged.**
