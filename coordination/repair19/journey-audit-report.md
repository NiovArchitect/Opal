# REPAIR #19 — WAVE W10: JOURNEY AUDIT + IDENTITY VERDICTS + WHOLENESS CERTIFICATION

- **Build audited:** worktree `wt-r19-audit`, branch `muse/r19-audit`,
  tip `09e587b2` — all 12 build waves + W18-FIX reconciliation + W15
  override sweep + W16 blind-spot hunt + W19-FIX-A/B merged.
- **Auditor's rule:** no application code was edited. Every finding
  below is a dispatch-ready FIX scope or a NAMED EXCEPTION.
- **Part 2 (capability totality trace, W5-24)** is its own delivery:
  `totality-trace.md` beside this file.

## How this audit ran (levels used, stated per journey below)

The full stack was run locally against **fresh-migrated databases**
(`opal_test_r19audit`, `opal_dev_r19audit`, created for this audit):

- **Migrations:** 113 files = 113 `schema_migrations` rows = 113
  distinct versions on a fresh DB. BS-01's duplicate-version defect
  is closed and re-proven, not inherited.
- **Backend targeted suites** (fresh test DB): **93 tests, 0
  failures** — opalchat scope, r19 graphs, call state, calls
  graphing, calls assist, quiet hours, human seed world, Opal
  conversations, memory wallet capsule, two-user plan lifecycle.
- **Web targeted suites: 155/155** (opalChatDoorway 39, unifyDrift
  27 incl. the glass registry, smSoulMemory 11, homeSocial 19,
  r19FixB 7, r19ChatsThread 14, r19ListenRail 7, r19Graphs 11,
  r19CallLog 12, familyOfStatus 8) **plus 39/39** (legacyRecreation,
  settingsArchitecture, c1ShellWiring).
- **API regression (real-path, `OPAL_SEED_MODE=1`): 101/101 PASS**
  on the audit tip.
- **Served-stack rendered walk:** the audit tip built with
  `vite build`, served by `vite preview`, driven in headless
  Chromium at **390×844 in both modes** against the dev server
  (pinned clock `2026-10-18T21:00:00Z`, human seed world). Frames:
  splash (early + settled), home, chats, calls, thread, profile,
  graphs, graphs-past, graphs-private, center deck, Opal chat,
  overflow menu, conversation rail, orbit log, You hub, Soul room,
  Memory room — dark + light. Kept in the audit scratch
  (`w10-scratch/rendered/`).
- **Pattern posture at tip:** TOTAL 118 (MP-2 81, MP-6 26, MP-11
  11) — unchanged from the retrospective's count at `7fa7dc98`; no
  rise through the W15/FIX merges. (The NC-6 reconciliation of this
  number against the ledger remains owed by the program, not by
  this wave.)
- **Typecheck floor:** `tsc` emits the known baseline (11 lines,
  "9 distinct") — but see JA-08: the canonical build command fails
  because of it.

Where a journey could not be walked at the rendered layer (a real
two-party WebRTC call between headless contexts), the level used is
stated on the journey and the claim is scoped to that level.

---

# PART 1 — THE JOURNEYS

## J1 — Open a plan → join → confirm → complete → remember it (Past)

**Level:** real-path API (served stack, two accounts) + ExUnit
two-user lifecycle + rendered Past view. **Verdict: PASS.**

- Two-account probe on the served stack: A creates a group plan
  (201); B sees it in B's list; B accepts (200) and the read-back
  carries `viewer_state: accepted` — join and confirm terminate in
  real state, not paint.
- Completion → Past is proven by the two-user plan-lifecycle
  ExUnit suite (in the 93/0 run) and the API regression's plan
  cases (101/101), and the rendered Graphs **Past** view shows the
  world's two completed plans under "COMPLETED AND PAST PLANS —
  Everything that already happened, in the order it settled," with
  full plan cards (both modes captured).
- The seed world's own distribution (agreed / tentative /
  completed) passed the seed gate with zero machine-speak hits on
  the served stack.

## J2 — Start Live

**Level:** rendered walk + source. **Verdict: EXCEPTION (named),
with a FIX rider (JA-06).**

- There is **no go-live affordance anywhere in the served C2/C1
  build**: no host surface, no viewer surface. W13 retired the
  legacy panels; the lives read exists (`/lives/visible`) and Home
  renders live cards when rooms exist, but a user cannot start or
  watch a Live from this build. **Blocker:** the C2 live host +
  viewer build is a separate wave that has not run. This is
  honestly absent — no surface pretends otherwise in copy.
- The rider is a defect, not an absence: when a live card (or any
  generic feed card) renders an action button such as **Watch**,
  the button is wired to a no-op (`feedAction: () => undefined`,
  `C2Shell.tsx:1065`). A dead control on the founder's Home is
  worse than an absent one. → **JA-06**.

## J3 — Open a graph → who's coming and how far (permission states honest)

**Level:** real-path API + rendered list/detail/past/private.
**Verdict: PASS**, with two carried items: the distance leg of
BS-06 remains its named exception (real check-in position only;
no position reads "unverified" and none is fabricated), and the
private-plan party-projection leg is **JA-02**.

- Graph detail carries Who (names + answers + location lines from
  the one PlanHistory projection), state, and history; permission
  states read honestly at every step this audit exercised
  (non-party detail = 403, re-proven under JA-02's probe).
- Location *sharing*: see JA-09 — the share itself is a one-shot
  snapshot still wearing "for the next 4 hours" copy; the FIX leg
  BS-06 named was never dispatched to either fix wave.

## J4 — Find a person → their profile → message them

**Level:** rendered walk + API. **Verdict: PASS.**

- Rendered: chats search field present; the thread header avatar
  opens the person profile sheet — "Maya Torres · @user-maya ·
  Next together ▲ Action needed · Plan with Ethan Walker ·
  tomorrow after 10 PM · **Message** · **What Opal remembers** ·
  Done" — and Message returns to the real thread, whose messages
  are the world's own human copy.
- The profile's "What Opal remembers" doorway opens the real
  Memory room filtered to that person (W13 wiring, suite-verified).

## J5 — Change a memory; forget something (two-step → hard delete)

**Level:** real-path HTTP API (served stack, two accounts) +
rendered Memory room. **Verdict: PASS for forget; EXCEPTION
(named) for "change."**

- Forget, end to end over HTTP: capsule created (201, with its
  because-line) → present in the wallet read → **cross-account
  DELETE returns 404** → owner DELETE 200 → absent from the next
  wallet read. The web flow is the two-step confirm into the same
  DELETE (W8/FIX-B suites; rendered room shows the capsules with
  provenance and the forget control).
- "Change a memory" has **no edit/correct control**: the Memory
  room offers forget (hard delete) only. **Named exception:** the
  capsule edit/correction surface is wallet-pipeline work
  (W-GAP-03 / HF-GAP-1); until it lands, correcting a memory means
  forget + re-tell. Stated, not painted over.

## J6 — The call journeys: miss → call back → row state changes; in-call pause graphing

**Level:** real-path API + ExUnit (call state, graphing, assist) +
rendered Chats/Calls tabs. The in-call leg is channel/state level —
no real WebRTC call was placed between headless contexts; the
claim is scoped to the state machine and its rendered surfaces.
**Verdict: PASS**, with the seed-binding defect **JA-04**.

- The seeded world carries a missed call with `missed_unresolved`
  state and a Call-back action; the call-state suite proves the
  row's state transitions on callback, and the call-log host
  renders server-returned status verbatim.
- In-call graphing pause: the calls/graphing suite proves pause →
  ingestion halts and is lineage-marked → resume; the standing
  control behind it was re-proven over HTTP in J8.
- Rendered: the Calls tab is a real destination in the Chats
  segment (both modes captured). On the rendered-walk account it
  read "No calls yet" — that is JA-04, a seed defect, not a
  surface defect: the first account to seed a fresh DB owns the
  seeded calls; the walk account seeded second.

## J7 — ORBITS

**Level:** real-path API (full manage set, served stack) +
rendered Center log / rail / chat chrome. **Verdict: PASS for the
orbit system; the private-unlock leg FAILS → JA-01.**

Proven over HTTP against the served stack: scoped chat birth
anchored to a person at birth (201, anchor on the create response);
orbit-private set + read-back; pin holds on read-back; rename
propagates to the sessions list; anchor **redirect** (target
clears) and **undo** (re-issue restores the anchor); **archive**
(read-back `user_archived=true`); **remove** (gone from the list);
split/accept machinery exercised by the 39-case doorway suite and
the opalchat scope ExUnit suite. Rendered: the Opal conversation's
overflow menu carries Rename / Pin / Archive / Share / Delete; the
rail opens from inside the conversation; **Escape closes both the
menu (focus returns to the overflow button) and the rail** —
BS-08's fixes re-proven at the rendered layer in both modes.

- **≤2 taps:** the log groups by orbit ("Filed by what they are
  about"), and the thread's index doorway ("Opal chats about
  Maya Torres") reaches the same filing from inside a person
  thread — both rendered in this walk.
- **Unlock a private orbit: FAILS end to end.** Wrong passcode and
  right passcode alike end at "That code did not open it." for any
  user who already has a passcode. → **JA-01** (the audit's most
  serious finding; BS-02 was reported closed and is not).
- The walk world's orbit log renders **empty of orbits** (only
  "Continuing"), because the seed world seeds no Opal
  conversations — the founder cannot see Orbits populated in the
  pack world. → **JA-10**.

## J8 — Settings: change a Soul choice → read-back; flip the call-graphing control → API truth

**Level:** real-path HTTP API + rendered Soul/Memory rooms.
**Verdict: PASS**, with the missing quiet-hours switch **JA-07**.

- Soul: PATCH quiet hours (21:30–07:30) + time zone → GET reads
  back exactly what was saved; the rendered Soul room shows every
  control labeled with its reason, quiet hours in 12-hour words.
- Graphing: PATCH `call_mode` → `never` → GET reads back `never`;
  PATCH `global_paused` → `true` → GET reads back `true`; restored
  after. The Memory room's rendered control carries the same four
  modes + Pause-all with its state line ("Graphing is not
  paused"). The flip is real at the API, not just in the room.
- But the Soul room has **no quiet-hours on/off control at all**,
  and the backend has no such field (`quiet_hours_enabled` exists
  nowhere) — W8's inventory claim of a toggle does not hold;
  FIX-A's resolver made start==end mean "off" without the room
  ever saying so. → **JA-07**.

## J9 — Share a plan (card); open a profile from a thread avatar

**Level:** rendered walk + suites. **Verdict: PASS.**

- Profile from a thread avatar: rendered in J4 — real sheet, real
  Next-together line, Message + What Opal remembers actions.
- The plan share card (W13) and the conversation share sheet
  (W19-FIX-B) share the item's own finished facts with exactly one
  Copy-details action and say in words what sharing does and does
  not do — no fabricated link, expiry, or audience (see the
  totality trace, DC-3). Invite/link sharing is real and
  rate-limited with an honest fallback note.

## J10 — The seed world itself: does it read as a real social account?

**Level:** rendered walk, both modes, all five destinations.
**Verdict: PASS** — with JA-03, JA-04, JA-10, JA-11 as the riders
that keep it from being unqualified.

The world reads as a person, not a fixture: a named cast (Maya
Torres, Jordan Ellis, Sabrina Nguyen, Chanelle Brooks, Alex
Rivera, Priya Shah, the Weekend Crew, the Sunday Table) with human
message copy ("Sorry I missed you earlier — can we talk tonight
about Saturday?", "Deal. I'll bring the blanket that actually
fits everyone."); real places (Oceanside Farmers Market,
Juniper & Ivy, Herb & Wood, Moonlight Beach, Tamarack Beach);
state variety everywhere at once — action / ready / forming /
happening / past on Home, Chats, Graphs and the Center deck in the
same session; story rail with new-story rings; no machine titles,
no "Regression A," no seed-speak anywhere (seed gate: 0 hits).
Both modes hold: dark is genuinely dark, light is genuinely light,
and the state system stays distinguishable in each.

Riders: the in-row Chats cards are squeezed to a 142px column
(**JA-03** — the one place the world does NOT read at the
founder's standard); a second seeded account gets an empty Calls
tab (**JA-04**); the orbit log is empty in this world (**JA-10**);
the story rail shows the viewer's own story twice (**JA-11**).

---

# PART 3 — IDENTITY VERDICTS (W5-28)

Question per surface: *could this be mistaken for a competitor's
screen with our logo on it?* A FAIL would be a finding with a
redesign scope. **There are no identity FAILs in this build.**

| Surface | Verdict | Basis (one line) |
|---|---|---|
| Splash | **PASS** | The full orb composition — stone, two rings, people as lit points — inside its own margin, stacked OPAL wordmark, "REAL PEOPLE. REAL PLANS."; rendered early + settled in this audit. (The W3 extended halo probe and the pack's mid-flight rider frames remain pack-owed process evidence, RW2-03 — the composition itself is proven.) |
| Home | **PASS** | Story rail + state-fired plan cards + the OPAL lockup header; the five-state border/fireline language exists on no competitor's feed. |
| Chats list | **PASS** | Rows carry YOUR MOVE fire-frame cards and state-tinted plan awareness inline — a list that shows plans living inside conversations is Opal's alone. (Layout squeeze is JA-03, a defect, not an identity failure.) |
| Thread | **PASS** | Next-together strip + "Talk to Opal about this plan" doorway + in-thread YOUR MOVE card — the founder's named standard surface. |
| Center log / orbits | **PASS** | "Filed by what they are about" — the orbit filing grammar and its copy are unmistakably Opal's; no competitor files chats by what they're about. |
| Opal conversation + chrome | **PASS** | Orb-anchored thread, glass overflow menu (Rename/Pin/Archive/Share/Delete), rail, anchor notices — one coherent, owned chrome. |
| Calls | **PASS** | Call rows speak in Opal's state language (missed-unresolved → Call back); the honest empty state is in the product's voice. |
| In-call | **PASS** (source level — not rendered-walked) | The graphing indicator + pause grammar ("Opal Graphing", pause/resume in words) is a surface no competitor has; verdict scoped to source + suites. |
| Graphs list | **PASS** | Lens chips with live counts (All 9 · Action 3 · Ready 4 · Past 2), state sections, intentions + Working toward + Someday shelf — a plans surface, not an events clone. |
| Graph detail | **PASS** | Who/History from the plan's own record, media well, food actions — the living-plan page. |
| Graphs Past | **PASS** | The thread-rail timeline of settled plans ("in the order it settled") is a memory surface in Opal's grammar; light mode frame is exemplary. |
| Graphs Private | **PASS** | The passcode zone states its own security truth in plain words ("checked by Opal's server — the code itself is never stored"). Identity passes; the unlock *interaction* is JA-01. |
| Share card | **PASS** | Carries the plan's own finished facts in card grammar; its refusal to fabricate link/expiry terms is itself the identity. |
| Profile | **PASS** | Next-together-led sheet (state first, then Message / What Opal remembers) — a relationship profile, not a contact card. |
| Settings hub (You) | **PASS** | Rooms grouped by how Opal works ("HOW OPAL WORKS FOR YOU / HOW OPAL HELPS / WHAT OPAL GRAPHS") — the settings IA itself is the product's thesis. |
| Soul room | **PASS** | Every control labeled with its reason in the product's voice. (Missing on/off is JA-07.) |
| Memory room | **PASS** | Call-graphing explainer + capsules with because-lines — memory as the user owns it, in Opal's words. |
| Activity / Connections / remaining rooms | **PASS** (source + suite level) | Same hub grammar, same glass, same voice; Activity reports Opal's work in plain words. |

---

# PART 4 — WHOLENESS / MAP-TRACE (W5-26)

**Certification: the merged build is ONE application.** The seams
found are defects at joints (JA-01, JA-02, JA-03), not fractures
in the whole. Detail:

- **Navigation:** five destinations, one dock, one order
  everywhere (phone + the wide sidebar, HA-A); every destination
  reached in the rendered walk renders its real surface; back
  paths land where their labels promise.
- **Chrome — glass token unity:** the glass registry
  (fix-report.md) holds at the tip — unifyDrift **27/27 green
  including GLASS_REGISTRY** (22 sanctioned glass sites); one
  material everywhere it should be, in both modes. The one
  off-system surface left is the legacy crash boundary → JA-05.
- **Ambient system:** the state canon is single-sourced
  (`familyOfStatus`, with W19-FIX-B's served-call-site fix pinned
  by its own 8-case suite); every ambient element's reason is
  findable on record — Home's in HOME_AMBIENT_ELEMENTS, the shell
  layout's in layoutContract L8, calls' in the calls register,
  the thread's in the W7 thread register, the deck's sections in
  the Center register. Nothing ambient was found in the walk that
  no register can explain.
- **Naming coherence:** `ORBITS_NAME = "Orbits"` is the single
  source; no rendered "Listen" control exists (one source comment
  only); no "Soul + Memory" compound appears on glass; no
  machine-speak strings in web source or in the seeded world
  (seed gate 0 hits).
- **Map-trace, build → catalog:** every shipped R19 surface
  traces to a WALK-5 catalog item or a wave charter; nothing
  untraceable was found beyond the JA register.
- **Map-trace, catalog → build:** the catalog items with nothing
  shipped are exactly: **W5-14** and **W5-24** — closed by this
  wave's two deliverables — and **mobile parity**, which stands
  as the BS-10 named exception (with JA-13's lockfile rider).
  W5's legacy structured-layout strip residual is **closed by
  retirement**: its only mount was the legacy app shell, which
  W15 unmounted for good (the served `App.tsx` returns the C2
  shell unconditionally; the files remain on disk, test-bound,
  per W15's corpus finding).

## Retrospective IN FLIGHT rows — closed

| Row | Disposition |
|---|---|
| W5-14 (journey audit) | **CLOSED by this report.** |
| W5-19 (W15 override sweep) | **LANDED** (`66aa797f`) and verified here: `?shell=r17` retired, legacy app unmounted, 2 corpses deleted, posture 118 → 118. Its crash-boundary leg was never in W15's scope — it is JA-05. |
| W5-20 (W16 blind-spot hunt) | **LANDED; fixes landed in W19-FIX** except: BS-06 distance = named exception (carried), BS-10 mobile = named exception (carried, + JA-13), **BS-02 = JA-01 — the fix landed but the seam between its two halves was never joined; NOT closed**, BS-07 leg 2 = JA-05. |
| W5-24 (totality trace) | **CLOSED by `totality-trace.md`.** |
| REC-4 (deckfix F1 slot-truth) + REC-5 (W5-03 call-log mount) | Recorded for ledger entry, charged to RW-03/RW-10 and RW-01/RW-11 respectively. W5-03 itself is closed (the log is mounted); its seed-side rider is JA-04. |
| The 36 widenings (RW-01…14, RW2-01…16, NC-1…6) | Not built this cycle — they are the gate-building backlog, named in the delivery per the status file's 04:55 PDT disposition. This audit manually exercised the key ones once: RW-01 (surface inventory — the rendered walk), RW-10 (claim-vs-mount spot checks — JA-01, JA-07 are its catches), RW2-03 (halo probe — still owed by the pack phase; W3's extended probe is committed but was never executed). |

For the record, the retrospective's headline stands unchallenged
by anything found here: 0 of 14 charged checks at full breadth;
15 full / 7 partial / 3 process repeats of 28 catalog items.

## FIX-A's named residual — ruled

**Ruling: FIX (JA-02), with one bounded named exception inside
it.** The full argument and scope are JA-02 below. In one line:
the residual projections are *live re-reads of the plan's current
row*, so anything the creator changes after privatizing leaks to
the very parties the flag exists to exclude — that is new
disclosure, not retained history, and it makes the BS-03
chokepoint incoherent. The exception covers only what carries no
identifying content: GraphPeople's counts-only holding counters
(the party's own history statistic) and the thread's own message
record (the parties' conversation history is not a plan
projection and must not be rewritten).

---

# FINDINGS REGISTER

Severity: **founder-visible** (the founder will see it in the
walk or the first real use), **coherence** (the whole is less
than its claims), **polish**.

## JA-01 — Private-orbit unlock is broken end to end (BS-02 not actually closed)
**Severity: founder-visible · Disposition: FIX**

The client and the server were each "fixed" in W19 and never
joined. The shipped client (`productClient.ts:5761`) POSTs
`/api/v1/product/opal/orbit-verify` with body `{code}` only. The
server's route is `POST /opal/conversations/orbit-verify`
(`router.ex:573`) and requires `{anchor_type, anchor_id, code}`;
its guard returns 422 without all three. The host
(`C1ShellHosts.tsx:1285`) passes only code + bearer — the anchor
sitting in its own prompt state is never sent. Runtime proof on
the served stack: the shipped client's call returns **404**; the
correct route behaves exactly as designed (wrong code 403, right
code 200, foreign user 404). First-time set-passcode works
(`setGraphLock`), so a user with no passcode can set one and
unlock; **anyone who already has a passcode can never unlock a
private orbit again.** Both halves' tests pass because FIX-B's
test mocks the client and FIX-A's tests call the endpoint
directly — an NC-2-class seam failure.
**FIX scope:** change `verifyOrbitLock(anchorType, anchorId,
code, bearer)` to POST `/opal/conversations/orbit-verify` with
the full body; thread the anchor from the host's prompt state;
update the r19FixB case to assert the real contract; add ONE
served-stack case (client function → real server) so the seam
itself is pinned.

## JA-02 — FIX-A residual ruled FIX: private-plan shadows in live projections
**Severity: founder-visible · Disposition: FIX, with a named exception inside**

FIX-A applied the creator-only `is_private` predicate at the list,
plan access, Artifacts, Checkin, JourneyAuthority, and
PlanExecution. It is NOT applied in NextPlan (direct SharedPlan
queries, `next_plan.ex:110,137`), Reveal (`reveal.ex:234`),
ConversationAlignment, HomeProjection, or GraphPeople. Runtime
proof (served stack, group plan with A + B + a cast member):
after A sets the plan private — B's list excludes it ✓, B's
journey detail = 403 ✓ (BS-03 holds) — **but B's conversation-row
`next_plan` still carries `{plan_id, title, when_label "Saturday
· 7:30 PM", where_label, state}` and B's alignment payload still
carries the plan's place projection.** Reveal and the home feed
did not carry it in this run, but their queries lack the filter
at source — same class, unproven instance.
**Argument:** these projections re-read the plan's *current* row
on every load. A time, place, or title the creator sets *after*
privatizing is disclosed to excluded parties who never saw it —
new disclosure, not the parties' retained history. A flag whose
list and detail are sealed while its live shadows keep updating
is incoherent, and the founder's own BS-03 standard ("parties
read nothing until the creator re-opens") is the law it breaks.
**FIX scope:** apply FIX-A's creator-only predicate at NextPlan,
ConversationAlignment's read outputs, Reveal's plan query, and
HomeProjection's plan feed; two-account regression in FIX-A's
established pattern (privatize → assert absence in all four).
**NAMED EXCEPTION (inside this ruling):** GraphPeople's
counts-only holding counters (no identifying content; the
party's own history statistic) and the thread's own message
record (the parties' conversation history is not a plan
projection and must not be rewritten) are NOT defects and are
not in scope.

## JA-03 — Chats in-row cards squeezed to 142px at served breadth (W5-06 class)
**Severity: founder-visible · Disposition: FIX**

W5-06 was proven fixed at component breadth; at served breadth
it is not. Measured on the served build (390×844, both modes,
identical): reveal card **142px** wide, its title **114px**
("Plan with / Ethan Walker" wraps mid-phrase; the YOUR MOVE
kicker itself wraps), inside a **350px** row composed of avatar
48px + a **102px** timestamp column + main column 142px. The card
is full-width *of its column* — the row's layout starves the
column. The PlanAwareness mini-card in the same list is squeezed
identically. By contrast, the same reveal card on the Center
deck renders full-width and meets the founder's standard —
proving the content is fine and the host column is the defect.
**FIX scope:** give the in-row block the row's full measure
(e.g. move the block out of the main column to span under the
title row, as the legacy PlanAwareness treatment did; or shrink
the time column to a short form and return the width); cover
both RevealListLine and the PlanAwareness row variant; pin with
a served-breadth rendered case in the real host (title ≥ 200px
at 390px), not a component mount.

## JA-04 — Seeded calls bind to the first seeding viewer; later walk accounts get an empty Calls tab
**Severity: founder-visible (conditional — it bites exactly when the pack DB is shared or re-seeded) · Disposition: FIX**

`HumanSeedWorld.ensure_call!` finds-or-creates by the GLOBAL
`correlation_id` (`seed-world-call-maya-missed`, …). The first
viewer to seed a fresh DB owns the three seeded calls; every
later seeded viewer gets the plans and stories but **zero calls**
— proven twice in this audit (fresh account seeded 200/200 →
17 plans, 0 calls; the rendered-walk account's Calls tab read
"No calls yet" while the first-seeded account shows the full
missed/answered/cancelled set). On a pack DB where a regression
account seeds first, the founder's walk account walks into an
empty Calls tab — the W5-03 surface.
**FIX scope:** key seeded calls per viewer (suffix the
correlation_id with the viewer id, or find-or-create on
correlation_id + party pair); add a two-viewer seed test.
**W11 hygiene (regardless):** the pack's walk account must be
the first seeder on its DB until this lands.

## JA-05 — Crash boundary is still legacy-faced, with a dead recovery path (BS-07 leg 2)
**Severity: founder-visible · Disposition: FIX**

BS-07 leg 1 closed (legacy routes retired, legacy app
unmounted — verified at source: the served entry returns the C2
shell unconditionally). Leg 2 never landed: `OpalErrorBoundary`
(`main.tsx:198ff`) still renders `app-futura` classes on a
hardcoded `#050816` background in both modes, in system-ui, and
its "Restart first run" goes to `/?opal_reset_first_run=1` — a
flag whose only consumer is the unmounted legacy app (grep-
verified). A crash in the served build strands the user on an
off-brand screen whose recovery button does nothing.
**FIX scope** (per BS-07): restyle the boundary on the
chrome-glass/token system in both modes; recovery reloads the
current shell preserving the session; delete the dead flag path.

## JA-06 — Home feed action buttons are dead controls (incl. Live's Watch)
**Severity: coherence · Disposition: FIX** (becomes founder-visible the day a live room exists)

The generic feed-card action button terminates in the shell's
`feedAction: () => undefined` (`C2Shell.tsx:1065`) — its only
production wiring. The seed world renders no live or actionable
feed cards, so the dead control is latent in the walk, but the
first real live room puts a **Watch** button on Home that does
nothing (MP-5 class). **FIX scope:** wire feedAction to real
outcomes per kind, or remove the action affordance from kinds
with no real outcome until a viewer exists. No dead button may
remain. (Starting/watching Live itself is J2's named exception.)

## JA-07 — Soul room has no quiet-hours on/off; the claimed toggle does not exist
**Severity: founder-visible · Disposition: FIX**

`quiet_hours_enabled` exists nowhere in backend or web. The
AssistancePreference carries only start/end; the Soul room
renders only start/end inputs. FIX-A unified the *consumers*
behind one resolver (start==end = off), but the room never tells
the user that, and W8's inventory claim of a toggle is false.
A founder who wants quiet hours OFF has no discoverable way to
do it. **FIX scope:** add the real on/off (field + resolver
leg), or teach the start==end semantics in the room's copy;
correct the inventory claim either way.

## JA-08 — The canonical build command fails at tip
**Severity: coherence · Disposition: FIX**

`npm run build` = `tsc --noEmit && vite build`; tsc fails on the
baseline errors, so the canonical command produces no bundle
(packs are built with bare `vite build`, which succeeds). One
baseline error is R19-introduced: a duplicate `planStateFamily`
import in the served `C1Surfaces.tsx` (the same import twice in
one block — a merge artifact). **FIX scope:** remove the
duplicate import (one line); disposition the remaining baseline
errors or decouple the build script — the "exactly 9" typecheck
floor must not silently mean "the build is broken."

## JA-09 — Location share is a one-shot snapshot wearing "next 4 hours" copy (BS-06 FIX leg never dispatched)
**Severity: coherence · Disposition: FIX**

There is no `watchPosition` anywhere in the web source; sharing
posts a single fix. Yet the confirmation copy reads "You are
sharing your location for this plan for the next 4 hours."
(`C2Shell.tsx:296`). BS-06's FIX leg (interval refresh while the
detail is open + an age label from `updated_at`, or snapshot
copy) was dispositioned but assigned to neither fix wave.
**FIX scope:** implement BS-06's leg as written. (BS-06's other
half — distance only from a real check-in — remains its named
exception and is not in scope.)

## JA-10 — The walk world seeds no Opal conversations; Orbits is invisible in the pack
**Severity: coherence · Disposition: FIX**

`human_seed_world.ex` contains zero Opal-conversation seeding.
The rendered orbit log and rail on the walk account show only
"Continuing — New chat": no orbit groups, no anchored chat, no
private orbit. The founder cannot see R19's flagship structure
populated anywhere in the review world. **FIX scope:** seed 2–3
anchored Opal conversations into HumanSeedWorld (one person
orbit with two chats, one plan orbit, one private orbit under
the world passcode), covered by the seed world's own
distribution test.

## JA-11 — Story rail shows the viewer's own story twice
**Severity: polish · Disposition: FIX**

Rendered in both modes: the rail shows "Your story · Add" AND
the viewer's own seeded story as a separate named circle
("Ethan Walker · New"). The self cell should carry the live
story (the adapter hardcodes `hasLiveStory: false` for self)
instead of duplicating the presence. **FIX scope:** feed the
self cell from the viewer's own story record; Add remains the
empty case.

## JA-12 — Plan-card media well collapses to zero height when its image fails to load
**Severity: polish · Disposition: FIX**

On Home, 8 of 9 plan cards mount media wells (provenance
`plan.image_url` — the data path is real), but a failed image
leaves a **0-height** well: PlanCardC2 has no error fallback, so
the card silently loses its media area instead of taking its
designed monogram treatment. (In this audit's split-origin
topology — preview origin ≠ API origin — the session cookie
cannot reach the media endpoint, so every well failed; in the
single-origin pack topology the images are expected to load.
The collapse-on-failure behavior is the defect regardless of
topology.) **FIX scope:** onError → monogram treatment, in
PlanCardC2 and the memory-card well. **W11 rider:** the pack
must include one frame with plan imagery actually rendered, on
the single-origin served build.

## JA-13 — Mobile lockfile still desynced (BS-10's in-cycle action not done)
**Severity: coherence · Disposition: FIX**

BS-10's exception named one in-cycle action: regenerate the
mobile lockfile so `expo-location` (required by
`apps/opal_mobile/package.json`) resolves. At tip the lockfile
still contains **0** `expo-location` entries. **FIX scope:**
regenerate + commit the lockfile (one command). Mobile parity
itself remains the BS-10 named exception (Mac-side EAS is the
blocker) and is not in scope.

---

## Audit totals

- **Journeys:** 6 PASS outright (J1, J3, J4, J8, J9, J10 with
  riders), J5 PASS + named exception leg, J6 PASS with JA-04,
  J7 PASS except the unlock leg (JA-01), J2 EXCEPTION with JA-06.
- **Findings: 13** — founder-visible 5 (JA-01, JA-02, JA-03,
  JA-05, JA-07; JA-04 founder-visible-conditional), coherence 5
  (JA-06, JA-08, JA-09, JA-10, JA-13), polish 2 (JA-11, JA-12).
  All FIX; the only exceptions granted are inside JA-02
  (GraphPeople counts + thread record), J2 (start-Live), J5
  (memory edit), and the carried BS-06-distance / BS-10-mobile
  exceptions.
- **Identity:** no FAILs (Part 3).
- **Wholeness:** certified as ONE application, with the JA
  register as its defect list (Part 4).

*FOUNDER_ACCEPTED = NO · FREEZE = HOLD · PASS2 = NO — unchanged.
W11 (final battery + pack v2 + push) runs after this register is
dispositioned.*
