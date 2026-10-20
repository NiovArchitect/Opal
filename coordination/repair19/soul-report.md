# Repair #19 — Wave W8: Soul and Memory, each its own room

**Branch:** `muse/r19-soul` (worktree `wt-r19-soul`, base `f2981dbf` on
`muse/repair-19`). Not pushed. `FOUNDER_ACCEPTED` stays NO.
**Verdict answered:** the founder reviewed R18's combined "Soul +
Memory" page and said it "doesn't make any sense whatsoever" — the
Soul section rendered RAW VALUES as unlabeled boxes ("22:00", "08:00",
"America/Los_Angeles", "3", "standard") and a big unlabeled white
pill. This wave splits the page into two separately malleable rooms,
each its own complete thing in Settings, in the Muse-modeled
Settings standard — and, per the later founder riders, built under
the Apple design brain, the settings-sharpening dispositions, and
the identity bar: functional parity, experiential invention.

## 1. What shipped

- **Settings > Soul** — its own room: "How Opal is with you."
- **Settings > Memory** — its own room: "What Opal holds for you."
- The You hub group that holds them is labeled **"How Opal works for
  you"**; the Center deck doorway carries the same first-time-clear
  copy (see §4).
- **Settings > Activity** — a new room built under the settings
  sharpening (see §6): the real account-activity trail, in plain
  language. Approvals is dispositioned ADOPTED-DEFERRED to its owner
  (Opal's Home, MT-01) and the room says so in plain words — nothing
  is painted as a queue that does not exist.
- **Call graphing standing permission** (scope item 16) — a labeled
  control in the Memory room, wired to the real pre-existing
  `GraphingPolicy` truth (see §3). No fake wiring: where a read
  fails, the control is honestly absent rather than decorative.
- One backend change, a single user-facing string (§7).

The legacy combined key `soul-memory` remains as an alias that lands
in the Soul room, so older links and pins keep working; internal
code names are unchanged, per the commission.

## 2. Soul room inventory (Settings > Soul)

Lede on the room: *"How Opal is with you. Every setting here is one
Opal already follows — change it and the saved setting is what Opal
uses."* Every control below edits the REAL existing truth through
PATCH `/api/v1/product/memory-wallet/soul`, and the form re-reads
the saved record (the SM build's save + read-back contracts hold;
coverage in §8). Raw soul fields exist only as value-row seeds for
the form — they are never rendered as rows.

| Control | Truth (field) | Label on glass | Reason copy on glass |
|---|---|---|---|
| How forward Opal may be | `assistance_level` (AssistancePreference) | "How forward may Opal be?" — three choices: "Only when I ask" / "Balanced" / "More forward" | Group reason: "This is the main dial for how Opal is with you. It changes how often Opal offers help on its own — it never changes what your people can send you." Per-choice reason under the control, e.g. Balanced: "Opal offers help as things come up, and waits for your say-so before it acts." |
| Quiet hours on/off + start/end | `quiet_hours_enabled`, `quiet_hours_start`, `quiet_hours_end` | "Quiet hours" | The sentence, generated from the saved values: "Opal holds non-urgent things from 10:00 PM to 8:00 AM. People can still reach you — this only holds what Opal itself brings you." Inputs are labeled in words: "Quiet hours start — Opal starts holding non-urgent things at 10:00 PM" / "Quiet hours end — Opal can bring things to you again at 8:00 AM", and the inputs themselves show 12-hour values ("10:00 PM"), never "22:00". |
| Home time zone | `timezone` | "Home time zone" | "Opal reads your quiet hours and plan times in this time zone." The value reads human-first: "Los Angeles (America/Los_Angeles)" — the exact zone stays visible in parentheses because it is the value Opal actually saves. |
| Per-day cap | `proactive_daily_cap` | "Notes Opal starts on its own, per day" | "At most N notes a day from Opal on its own" (N = the saved value, in the sentence). |
| Feedback style | `completion_feedback` | "When something is done" — two choices: "Tell me when things are done" / "Keep it brief — a short note when something is done" | The enum never reaches glass: `standard` and `reduced` exist only in the save mapping. |

Save is one explicit action ("Save Soul settings") with a plain
confirmation: "Saved. This is how Opal will be with you now."
Errors are plain words. A failed load shows one honest line, not a
half-painted form.

## 3. Memory room inventory (Settings > Memory)

Lede: *"What Opal holds for you — yours to read and to forget."*

**The memories.** The capsule list (GET
`/api/v1/product/memory-wallet/capsules`, the mediated wallet read)
is grouped, never a flat dump:

- **About you** (scope kinds user / personal)
- **Tied to a person** (relationship / conversation / group)
- **From your plans and activities** (everything else)

Each item shows: what it is (its summary), where it came from in
plain language (provenance), when it was saved ("Saved Oct 18,
2026"), and a because line. **Forget** is per item: the first tap
arms the shell's two-step confirm; the second performs the hard
delete through the owner path (DELETE
`/api/v1/product/memory-wallet/capsules/:id`), and the room says
what forgetting means before the tap: forgetting deletes it — it is
not just hidden. Cross-account discipline is unchanged: another
account's capsule id reads as not-found (404), proven in §8.
**Empty state teaches:** it says what will appear here and why
there is nothing yet — it never blanks.

**Call graphing (item 16).** First field group in the room, above
the memories, because it decides what calls may become.

| Control | Truth | Label | Reason copy |
|---|---|---|---|
| Standing mode | `GraphingPolicy.call_mode` (GET/PATCH `/api/v1/product/relationship-access/graphing`) | "Call graphing" — four choices: "Never" / "Ask me each time" / "On, when a call can be graphed" / "Only people I choose" | "Graphing a call means the call becomes part of your graph — who was on it, what was decided, and what to follow up — so your plans and memories stay connected. It is not a recording kept for listening back, and the other people on a call are always told." Per-choice reason under the control, e.g. Ask me each time: "Opal asks before graphing a call, every time." |
| Pause all graphing | `GraphingPolicy.global_paused` | "Pause all graphing" — state reads "Graphing is paused" / "Graphing is not paused" | "Pauses graphing for every call until you turn this off. This wins over the choice above — and pausing during one call, for that call only, is on the call itself." |

Wiring notes, honestly: the truth pre-exists this wave (the same
record the legacy standing-permission section writes and the
backend's graphing decision consults on every call) — this room is
its Settings home, not a new store. A save writes through
`C2Shell.updateGraphingPolicy`; the PATCH response is the read-back
and re-seeds the control. A failed save restores the projected
value and shows one plain error line. A failed read leaves the
control absent — an unwired toggle would be a W4-05 violation.
**W12 integration note:** when checked, `wt-r19-incall` was still
at base and `coordination/repair19/incall-report.md` did not exist,
so no W12-specific new field exists yet. If W12 lands a new
standing field, it integrates into this control; the in-call
moment-of-need pause is W12's, and the room's reason copy already
points at it ("on the call itself").

**Per-person memory controls:** per-item forget exists (above).
A per-person pause ("stop learning about this person") has no truth
behind it anywhere in the backend — it is honestly absent, not
papered over (disposition row 48, §6).

## 4. The doorway rename

The Center deck doorway's visible copy is now **"How Opal works for
you"** (aria-label: "How Opal works for you — open your Soul and
Memory settings"). It still lands the user in the rooms: it opens
You with the Soul room open, Memory one tap back. Any other
user-facing "Soul + Memory" compound in the family got the same
treatment (the hub group label; "How Opal helps" and Quiet notes
now point to the Soul room instead of claiming the control is not
built). Testids `c2-center-orb-doorway` / `c2-opening-soul-memory`
were checked before renaming: pack tooling and `WALK_ACCEPTANCE.md`
pin them, so the ids and the internal event name (`openSoulMemory`)
stayed; only the words a person reads changed. Proven rendered in
the Center frame (§9): the doorway line sits under the orb on the
real deck — "How Opal works for you".

## 5. The white pill — identity and fate

The founder's "big unlabeled white pill" is the legacy combined
page's full-width `.c2s-field` boxes / segmented pills that carried
only raw placeholder values with no label and no reason. In the two
rooms that form element no longer exists: every control sits in a
labeled group (persistent label + reason + control), and choices
render as labeled choices. (Identification is from the legacy
source; the R18 pack frame that prompted the verdict was not in
this worktree.)

**The class came back once, in my own new control — and the
rendered capture caught it.** The Call graphing choices used
`.c2s-chip[data-active="1"]`, whose selected style paired an ink
background (`var(--ink-1)`) with a canvas text color
(`var(--canvas)`). But the unlayered global button reset
(`styles.css`: `button, input { color: inherit; }`) owns `color`
for buttons and beats every `@layer c2` rule — so the selected
chip's label computed to the pill's own ink: a solid white pill
with an invisible label in dark mode, a solid black pill in light
mode. Component tests cannot see this (jsdom does not compute that
cascade); the served capture showed it in both modes, and a
computed-style probe pinned it (active chip: color rgb(28, 25, 23)
on background rgb(28, 25, 23)).

Fate: the selected treatment now follows the family's working
segmented pattern — surface-1 background, ink-2 border, card
shadow; the label stays ink and readable (probe after fix: dark —
rgb(250, 247, 242) text on rgb(32, 26, 39) active vs rgb(42, 35,
51) inactive; light — rgb(28, 25, 23) on rgb(250, 247, 242) vs
rgb(241, 236, 228)). The same fix repairs the R18 support-form
chips, which share the class. A source-level guard test now pins
the stylesheet block itself (no text-color declaration in the
active-chip rule; surface-1 background required), because the
cascade that caused it is invisible to jsdom. This is the breadth
rule working as intended: the raw-value/blank class was scanned
across the whole Settings family, not just the Soul form (§8).

## 6. Dispositions (settings sharpening, founder 2026-10-18 23:34 PDT)

The disposition table in `coordination/repair18/muse-settings-audit.md`
was refreshed asset by asset against the founder's Muse settings
screenshots INCLUDING the opened sub-asset windows, and appended to
that doc as its §8 (the full refreshed table: assets 1–57, every
asset exactly one disposition, plus the sub-asset windows index
C04–C22 / C45–C54). Custody caveat, stated plainly: the
coordination tree is not inside any git worktree, so the refresh
cannot be branch-committed — it is recorded in the canonical shared
doc and reproduced in full here, as that doc's §8 note promises.

(Rows: # · asset · disposition · Opal form / location / reason —
verbatim from the audit refresh.)

| # | Asset | Disposition | Opal form / location / reason |
|---|---|---|---|
| 1 | Grouped settings sheet (C04–C06) | ALREADY PRESENT | You hub, grouped + searchable, HA-A wide sidebar (harmony2) |
| 2 | Plan/subscription card (C04) | FOUNDER-GATED | Founder sets the commercial model; no card may render before that |
| 3 | Agent states its own usage (C25) | ALREADY PRESENT | Center holding line (DIR-4 counters, same projections) |
| 4 | Connector catalog, categorized (C07–C09) | ADOPTED | Connections section (DIR-2): categorized catalog, server-verbatim states, live-verified |
| 5 | Connector row states Connect/View (C07–C09) | ALREADY PRESENT | Connections + Connected sources rows render the payload's own status_label verbatim |
| 6 | Custom connectors (C09) | FOUNDER-GATED | Trust model for user-supplied endpoints; the catalog slot is reserved in words only |
| 7 | Your-device sources as connectors (C09) | ADOPTED-DEFERRED | Owner: ingestion/connections track. Today's honest form: What Opal hears names each source with its real state |
| 8 | Devices roster (C10) | ALREADY PRESENT | Linked devices (real session store) |
| 9 | Pair a device / revoke a session (C10) | ALREADY PRESENT (revoke) / honestly absent (pairing) | Revoke ships in Linked devices and writes an Activity entry; adding is sign-in on the device, stated in the section |
| 10 | Developer mode (C10) | NOT APPLICABLE | Consumer relationships product; opposite access posture |
| 11 | Wallet / agent payments (C04) | FOUNDER-GATED | Stripe keys + legal review; loads stay OFF |
| 12 | Secure credentials store (C11) | ADOPTED | Saved logins: hosts only, add/remove, every use writes an Activity entry |
| 13 | One permission posture for actions (C12) | ADOPTED-DEFERRED | Owner: consent-lineage build. Pieces today: Soul how-forward, Call graphing (W8), Assist toggles — no single posture record exists, none painted |
| 14 | Outside-Opal actions posture (C12) | ADOPTED-DEFERRED | Owner: consent-lineage build; the call-graphing standing permission (W8) is its first form for calls |
| 15 | Manage permissions, counted (C12) | ADOPTED-DEFERRED | Owner: consent-lineage build; counts exist on the Center holding line, a counted Settings drill-in does not |
| 16 | Messaging channels (C13) | ADOPTED-DEFERRED + FOUNDER-GATED sub-step | Provision Opal's sending number (Connections gate names it: Twilio sender missing); no channel renders connected before round-trip |
| 17 | Notifications master toggle (C14) | ADOPTED | Quiet: "Pause everything" master switch over the per-kind switches (audit A2) |
| 18 | Appearance live preview (C15) | ADOPTED | Appearance preview drawn by the real OrbMark + PlanCardC2 in the chosen mode (audit A3) |
| 19 | Chat theme swatches (C15) | NOT APPLICABLE | Color carries shared state meaning between people |
| 20 | Avatar size selector (C15) | NOT APPLICABLE | Shared recognition system; density belongs to OS accessibility |
| 21 | Mode System/Light/Dark (C15) | ALREADY PRESENT | Appearance segmented control, applies immediately |
| 22 | Redeem referral code (C16) | ADOPTED | Your invite code: redeem in Settings; copy promises the connection only, never a reward |
| 23 | Privacy explainer card (C17) | ADOPTED | Privacy opens with the plain-language card; every named control exists on the page (audit A4) |
| 24 | Training-use consent toggle (C17) | ADOPTED-DEFERRED | Owner: the improvement pipeline itself. No pipeline, no toggle — the row stays absent |
| 25 | Import memory doorway (C17) | ADOPTED-DEFERRED | Owner: Track SM import machinery; no import surface exists yet |
| 26 | Import memory flow + import chats (C18) | ADOPTED-DEFERRED | Owner: Track SM import machinery (claims-tray form per 4.B6) |
| 27 | Download your data + confirm dialog (C17, C19) | ADOPTED-DEFERRED | Owner: wallet export build; the Activity room's export note names the absence in plain words |
| 28 | Reset / delete agent data (C17) | ADOPTED | Delete my data or account: self-serve, shared-truth copy, receipt with reference (4.C6) |
| 29 | Report an issue (C20) | ADOPTED | Report a problem: categories, payload disclosure, reference returned (audit A5) |
| 30 | Help & support doorway (C21) | ADOPTED | Help & support rows open the real report/feedback pages (audit A6) |
| 31 | Shake phone to report (C21) | ADOPTED-DEFERRED | Owner: native shell; on web the same intake is two taps via You > Help & support |
| 32 | About AI messages card (C22) | ADOPTED | Privacy card A7: generated messages, provenance, uncertainty said out loud |
| 33 | Privacy Policy / Terms rows (C22) | ADOPTED | Rows open Opal's published documents bundled with the app (/privacy.html, /terms.html) |
| 34 | Parent-company legal stack (C22) | NOT APPLICABLE | Opal has no parent company |
| 35 | Accounts Center (C06) | FOUNDER-GATED | Founder approves identity expansion (passwords / second factor / sign-in activity) |
| 36 | Log out (C06) | ALREADY PRESENT | Sign out, wired to the real signOut API |
| 37 | App version in Settings (C06) | ADOPTED (surpassed) | You hub footer shows the SERVED build from the one injected stamp (audit A9) |
| 38 | Agent profile page (C45–C49) | ADOPTED-DEFERRED | Owner: Opal's Home build (MT-01). First form shipped: the Center orb doorway ("How Opal works for you", W8) lands on the rooms |
| 39 | Five-lens structure (C45–C49) | ADOPTED-DEFERRED | Owner: Opal's Home build (MT-01). The Settings face of the same stores is built: Soul, Memory, Activity (W8) |
| 40 | Activity log window (C45) | ADOPTED | Settings > Activity (W8): the real account-activity trail (adopt2 entries: saved-login use, device sign-out), plain kinds, human times, no machine strings. NOT the DIR-4 P6 one-line deck report, and not the deferred Home lens (4.B10/MT-01) |
| 41 | Approvals history window (C46) | ADOPTED-DEFERRED | Owner: Opal's Home build (MT-01) — approvals live where the work happens (plan page, check-in). Settings carries the plain gate note; no queue store exists to list |
| 42 | Live view window (C47) | ADOPTED-DEFERRED | Owner: W12 in-call surfaces (for calls); no watchable provider sessions exist yet |
| 43 | Scheduled / upcoming window (C48) | ADOPTED-DEFERRED | Owner: scheduler surface. Upcoming plans live on the Center deck (Coming up) today; a scheduled-actions viewer does not exist yet |
| 44 | Identity: name the agent (C49) | ADOPTED-DEFERRED | Owner: Soul naming store — no truth exists for a user-chosen name for Opal, so no control is painted |
| 45 | SOUL card (C49) | ADOPTED | Settings > Soul (W8): its own room. Named gap: a card-level last-changed date has no change-record truth, so none is shown |
| 46 | MEMORY card (C49) | ADOPTED | Settings > Memory (W8): its own room; every item carries its own saved date |
| 47 | SOUL viewer/editor + About explainer (C50, C51) | ADOPTED | The Soul room IS the editor over the real AssistancePreference truth; every control labeled with its reason (W8). Opal-initiated refinement-as-approval (4.B15 surpass) stays ADOPTED-DEFERRED, owner Track SM |
| 48 | MEMORY viewer + About explainer, grouped (C52–C54) | ADOPTED | The Memory room (W8): grouped (About you / Tied to a person / From your plans and activities), provenance + because line + saved date per item, per-item forget = hard delete through the owner path. Named gap: per-person pause has no truth — honestly absent |
| 49 | Reorderable tabs (C23) | NOT APPLICABLE | The dock is a shared findability contract |
| 50 | Side chats (C23) | ALREADY PRESENT | Chats list + open chat |
| 51 | Drawer bundle: search/compose/settings (C23) | ALREADY PRESENT | In Opal's form: hub search, Home search, new-chat |
| 52 | Chat-with-agent surface (C25) | ALREADY PRESENT | Opal chat (W14 owns its R19 structure work) |
| 53 | Feed, agent-curated editorial (C27) | ADOPTED-DEFERRED | Owner: proactive presentation / Home (W9 shipped the social form; the agent-editorial briefing is not built) |
| 54 | Ideas: proposals inbox (C28) | ADOPTED-DEFERRED | Owner: proactive track; intentions + shelf ship in Graphs (adopt1), a durable proposals inbox does not |
| 55 | Goals with kept status (C29) | ALREADY PRESENT | Graphs "Working toward" goals (adopt1) |
| 56 | Library: artifacts + media (C30) | ADOPTED | Your library destination (adopt3) |
| 57 | Voice input in composer (C25) | ALREADY PRESENT | Voice notes / talk-to-Opal (Deepgram + ElevenLabs) |

Sub-asset windows index (nothing skipped): Settings sheet windows
C04–C06 → rows 1, 2, 11, 35–37; Connectors windows C07–C09 → rows
4–7; Devices window C10 → rows 8–10; Credentials window C11 → row
12; Permissions window C12 → rows 13–15; Channels window C13 → row
16; Notifications window C14 → row 17; Appearance window C15 →
rows 18–21; Redeem window C16 → row 22; Data controls window C17 →
rows 23–28; Import window C18 → rows 25–26; Download dialog C19 →
row 27; Report window C20 → row 29; Help window C21 → rows 30–31;
Legal window C22 → rows 32–34; Activity window C45 → row 40;
Approvals window C46 → row 41; Live window C47 → row 42; Scheduled
window C48 → row 43; Identity window C49 → rows 44–46; SOUL viewer
C50–C51 → row 47; MEMORY viewer C52–C54 → row 48.

**The Activity room itself** (row 40's build): Settings > Activity
reads the real adopt2 account-activity trail (GET
`/api/v1/product/settings/activity`). Entries render with plain-kind
titles ("Opal used a saved login", "A device was signed out"),
subjects only when human-readable (UUID-shaped subjects are
suppressed, never shown), and human times ("Oct 18, 2026 at 3:49
PM"). The empty state teaches what will be listed; a failed read
shows one honest line. Inside the same room, two honest notes: the
approvals paragraph (approvals appear where the work happens; a
single Settings queue is not built, so nothing is listed as if it
were) and the export paragraph (getting your data out is not built
yet; "there is no export button here, because a button that does
not export would be a lie"). The rendered frame (§9) shows this
room on a fresh account — the teaching empty state is its real
state there.


## 7. Files changed (branch `muse/r19-soul`, base `f2981dbf`)

Web (`apps/opal_web`):

- `src/c2/shell/shellData.ts` (the largest change): the two rooms'
  section builders; plain-language helpers (`formatClockTime`,
  `quietHoursSentence`, `humanTimezoneLabel`, `feedbackStyleLabel`,
  `SOUL_LEVEL_COPY` with per-choice reasons, `capsuleSavedLabel`,
  `capsuleGroupOf`, `CALL_GRAPHING_MODES`,
  `CALL_GRAPHING_REASON`, `activityKindLabel`); hub index split
  into Soul / Memory; hub group label "How Opal works for you";
  legacy `soul-memory` key kept as an alias into Soul.
- `src/c2/shell/C2You.tsx`: the two room surfaces + Memory-room
  call-graphing control (mode radios with per-mode reason,
  pause toggle with its own reason); optimistic save with
  failure-restore + one plain error line.
- `src/c2/shell/C2Shell.tsx`: soul save through the real PATCH
  with re-read; `updateGraphingPolicy` (PATCH response is the
  read-back); doorway opens You with the Soul room open.
- `src/c2/shell/C2CenterOpening.tsx`: doorway copy renamed to
  "How Opal works for you" (testids unchanged, checked first);
  other "Soul + Memory" compounds in the family renamed.
- `src/c2/shell/c2shell.css`: Soul room field-group grammar
  (label + reason + control); the active-chip fix (§5).
- `src/api/productClient.ts`: graphing GET/PATCH client calls.
- `shots/regression/rendered/r19soul-capture.mjs`: the wave's
  rendered-evidence driver (committed): shell=c2 entry, real
  session provisioning, real API setup (soul PATCH, capsule
  create), both modes, room settle waits, raw-leak text probes,
  manifest.json.

Backend (`apps/opal_core`), additive-only: one string —
`soul_memory_controller.ex` load-error message now reads
"Your Soul and Memory settings could not load." No behavior change.

Tests: `smSoulMemory.test.tsx` (11: labels+reasons on every
control, no raw values on glass, edit+read-back for each soul
control incl. the feedback enum, grouped Memory with provenance
and teaching empty state, two-step forget + cross-account 404,
legacy alias, doorway copy, graphing seed/save/restore/absent-on-
failure); `settingsArchitecture.test.tsx` (20: + the family-wide
raw-value breadth scan over hub + soul/memory/activity/quiet/
appearance/privacy/connections/how-opal-helps/calls-assist, +
the active-chip cascade guard from §5, + the Activity room build).

## 8. Results (verbatim)

- Web full suite, `apps/opal_web`: **Test Files 16 failed | 179
  passed (195); Tests 23 failed | 1,507 passed (1,530)** —
  the failing set is EXACTLY the stated baseline (23 failed /
  16 failed files): activation, availability, designTokens,
  onboarding/firstRun, authorityRejectedStates, grammar,
  graphCalendaring, graphDetail, graphScroll, graphSpine,
  liveJourneyProof, pasteW4DeviceFixes, waveBChatsExact,
  waveBGraphsExact, waveBHomeExact, theme/technicolorProduction
  — none in a file this wave touches. Passed
  count = baseline 1,497 + my 10 new tests, exact.
- Typecheck (`tsc -p tsconfig.json --noEmit`): **exactly 9** —
  the baseline, unchanged after the chip fix and test edits.
- Backend, targeted (soul + isolation + graphing +
  adopt2-activity, 5 files, 81 tests): **81/81, 0 failures** on
  this branch.
- Backend, FULL suite (`mix test`, private PG cluster on 5445,
  OTP 27.3.4.2 + `+fnu`): **3,170 tests, 0 failures** — the
  stated baseline, held exactly (finished in 484.6 seconds).

## 9. Rendered evidence (the breadth rule)

Served stack from THIS branch: backend dev server
(`wt-r19-soul/apps/opal_core`, `mix phx.server`, port 4000,
dev DB `opal_dev_r19soul` on the wave's PG cluster) + built
web bundle (`vite build` at commit 35d0a427, `vite preview`
port 5173). Capture driver:
`shots/regression/rendered/r19soul-capture.mjs`. All records
through the real APIs; setup named in the manifest (soul PATCH
→ 200, capsule create → 201).

Frames (390×844, both modes, all with zero raw-leak probe hits
and zero failures) in `coordination/repair19/soul-captures/`:

- `center-{dark,light}.png` — the Center deck; the renamed
  doorway reads "How Opal works for you" under the orb.
- `you-hub-{dark,light}.png` — the You hub; the group reads
  "HOW OPAL WORKS FOR YOU" with the Soul and Memory rooms.
- `soul-{dark,light}.png` — the Soul room: labeled groups,
  reasons, quiet-hours sentence, labeled 12-hour inputs,
  segmented how-forward. (The capture account's soul was PATCHed
  first — status 200 in the manifest — to cap 3 and the
  America/New_York zone; the cap and time-zone rows sit below
  the frame's fold and are proven by the component suite and
  the label formatters' tests.)
- `memory-as-found-{dark,light}.png` — the Memory room empty:
  the teaching empty state.
- `memory-{dark,light}.png` — the Memory room populated: the
  labeled Call graphing control (fixed selected state, §5),
  the pause toggle, grouped memories with provenance +
  saved dates.
- `activity-{dark,light}.png` — the Activity room: the teaching
  empty state with the honest approvals/export notes.
- `manifest-r19soul.json` — build tag, sessions, setup statuses,
  per-surface probes.

This rendered pass is what caught the blank selected chip (§5)
— and why the task's breadth rule exists: the class was not in
the Soul form from the screenshot; it was in my own new
control, and only the served surface showed it.

## 10. Design notes — the standards these decisions answer to

- **Apple design brain (journey-first, restraint, hierarchy,
  typography as voice, nothing decorative without a job).**
  The rooms are journeys, not forms: Soul opens with its one
  sentence of orientation, then the single main dial (how
  forward), then the constraints on that dial (quiet hours,
  daily cap), then the context (time zone, feedback style) —
  the order is the order a person reasons, most-deciding first.
  Memory opens with the one decision that governs what gets
  into it (call graphing), then what is already in it. Every
  group is label + reason + control, in type hierarchy — no
  iconography, no badges, no motion was added in this wave at
  all. The one ambient choice in the rooms: none added. The
  doorway deliberately carries no new animation or glow — the
  orb's existing living rings already say "this is Opal", and a
  pulse would ask for attention the doorway has not earned
  (QUIET).
- **Functional parity, experiential invention (23:53 key).**
  Substance is at full parity with the Muse screenshots: every
  setting class has its Opal form with real truth behind it
  (§6's table). The experience is not the incumbent's form:
  rooms named in Opal's language (Soul / Memory as places you
  go, not files you edit), reasons written as Opal speaking in
  first person ("Opal holds non-urgent things…"), grouping by
  the user's life ("About you / Tied to a person / From your
  plans and activities") instead of by data kind. Where
  invention would have harmed clarity — the quiet-hours
  sentence, the plain kind titles in Activity — clarity won
  and the invention moved to the feel: the orb-mark header,
  the room's voice, the calm density. Nothing here is a Muse
  clone with Opal colors; nothing here ignores what the
  screenshots taught.
- **Identity bar.** Muse supplies substance and structure, Apple
  supplies discipline, the face is Opal's alone. The rooms use
  only orb-language tokens (no hex, no z-index, no radius
  outside the system — and the one CSS repair in this wave,
  §5, stayed inside those tokens); the ambient register is
  restraint. A person holding these rooms should not be able to
  mistake them for Anthropic's or Meta's settings.
- **Design-to-code law.** Nothing in this report is a mockup:
  every room, control, and line of copy above exists in the
  shipped build of this branch, proven by the served captures
  in §9.

## 11. Caveats, open questions, follow-ups

- Backend FULL suite ran green on this branch (3,170/0, §8);
  the API regression suite (101 cases) is the final battery's
  leg at merge — the only backend change here is one
  user-facing string in an error message, exercised by the
  isolation/API tests in the targeted 81/81.
- The audit refresh (§6) is recorded in the canonical shared
  doc; it cannot be branch-committed because the coordination
  tree is not inside a worktree — reproduced here in full, as
  the doc's own note promises.
- `wt-r19-incall` was at base when checked; if W12 lands a new
  standing graphing field, the coordinator's tracked
  integration task picks it up (§3).
- Approvals (row 41) belongs to Opal's Home (MT-01); the
  Settings gate note says exactly this, with the named owner.
- Per-person memory pause has no truth; per-item forget of a
  person's capsules is the control that exists (row 48).
- Nothing was pushed; `FOUNDER_ACCEPTED` stays NO; no merge,
  no production, no Pass 2, no user-data deletion.

---
*Committed on `muse/r19-soul` (9 commits, latest `35d0a427`).
Report deliverable: this file. Captures:
`soul-captures/` (12 frames + manifest) in this directory.*
