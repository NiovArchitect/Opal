# Repair #19 — WAVE W16: BLIND-SPOT HUNT (item 20, W5-20) — report

- **Tree traced:** `muse/r19-blindspot` at merged tip `7fa7dc98`
  (all 12 R19 build waves + W18-FIX). Read-only on application
  code; no commits, no edits outside this report.
- **Method:** R18 surface map (`coordination/repair18/surface-map.md`,
  entries 1–19 + §12 sub-entries) and the R19 catalog
  (W5-01…W5-28 in `coordination/repair19-status.md`) cross-checked
  against the merged build at source; one strongest claim per wave
  report (all 13 files in `coordination/repair19/`) spot-verified
  at source; dark-corner classes (a)–(g) swept explicitly.
- **FOUNDER_ACCEPTED = NO.** Nothing here is a walk claim. Backend
  suites could not be re-run in this worktree (no Elixir runtime
  in the VM — `mix` absent, Postgres not responding); every
  finding below is a file/line-level fact, and the one finding
  whose *runtime* effect depends on the runner is flagged as such.
- **Findings: 12 numbered (BS-01…BS-12)**, two of which carry a
  NAMED EXCEPTION as (part of) their disposition (BS-06 distance
  leg, BS-10 mobile). By severity: **founder-visible 6,
  coherence 5, polish 1.**

---

## 1. SURFACE COMPLETENESS — map vs build

Every R18-mapped surface exists in the merged build (the R18
map-trace, MT-01…MT-23, remains the governing register for its
carried gaps; R19 removed no mapped surface). Every R19 catalog
item was checked for code behind it:

| Item | Code behind it at `7fa7dc98` | Verdict |
|---|---|---|
| W5-01 human seed world | `human_seed_world.ex` + permanent gate `scanSeedWorld` wired in `shots/regression/lib/harness.mjs:369`, `run.mjs` | PRESENT — but see BS-05 |
| W5-02 Home social / imagery | `C2Home.tsx`, `shellData.planImageFromRecord` precedence chain | PRESENT as plumbing; imagery unexercised by any real record — BS-05 |
| W5-03 Calls in the design | `ChatsHome` calls mode + `Calls.CallState.derive/3` single derivation (`calls.ex:326` is the only call site) | PRESENT, claim verified |
| W5-04 halo geometry | `--dock-halo-gap: 3px` (`theme/c2Tokens.css:75`), consumed in `unifyChats.css:442/458`, `c2shell.css:161` | PRESENT, claim verified |
| W5-05 splash v2 | `OrbLivingRings.tsx`; settle test "settled DOM == reduced-motion DOM" (`orbLivingRings.test.tsx:238`); reduced-motion rules in `orb.css` | PRESENT, claim verified |
| W5-06 chats mini-card | merged W5 wave; state borders from single-source facts | PRESENT |
| W5-07 thread strip | solid `--canvas`, sticky (W5 wave) | PRESENT |
| W5-08 Listen rail killed | No rendered "Listen" control remains in web src (only an internal callback name `openMicAndListen` in the legacy character component and explanatory comments); `ReadAloudButton` in its own row | PRESENT, claim verified |
| W5-09 private graphs | `graph_lock.ex`, migration, `C2Graphs` Private area, server list exclusion `social_flow.ex:3087ff` | PRESENT — with BS-02/BS-03 |
| W5-10 living graph detail / location | `plan_location_share.ex` (4h expiry, coarse coords), `plan_history.ex:378ff` location fields | PRESENT but thin in practice — BS-06 |
| W5-11 Soul/Memory rooms | `C2You.tsx` Soul form (seeded from real preference rows), `shellData` plain-language helpers, captures in `coordination/repair19/soul-captures/` | PRESENT — with BS-04 |
| W5-12 Settings family | You hub + rooms, both modes captured (W8) | PRESENT |
| W5-13 state variety / ambient | seed distribution forming/ready/happening/past; W18-FIX `familyOfStatus` re-pin | PRESENT |
| W5-14 journey audit | — | NOT A CODE ITEM: owed by W10, not yet run at this tip (named, not silent) |
| W5-15/16 in-call + graphing light/pause | `CallSurfaces.tsx` orbit stage; `calls/graphing.ex` state machine; `call_channel.ex:64` broadcasts every graphing transition to **every joined participant**; pause halts ingestion in the gating path | PRESENT, strongest claim verified at source |
| W5-17 legacy inventory | W13 inventory + `EventShareCard.tsx`, `PersonProfile.tsx` recreations | PRESENT — with BS-07 |
| W5-18/22/23 Opal-chat separation + Orbits | `opal_conversations` scope/anchor migration, `OrbitSheet.tsx`, rail + Center log groups, doorway in thread plan-awareness | PRESENT — with BS-02 |
| W5-19 override sweep | — | W15 runs in parallel on this same tip; **not in this build** (named) |
| W5-20 blind-spot hunt | this report | — |
| W5-21 retrospective | — | W17 in parallel; not in this build (named) |
| W5-24 capability totality trace | — | Owed by W10/W11 delivery; no trace artifact exists yet at this tip (named) |
| W5-25 conversation chrome | overflow in `C1Surfaces.tsx:817ff` (Rename/Pin/Archive/Share/Delete all wired in `C1ShellHosts.tsx`) | PRESENT — with BS-11 |
| W5-26 wholeness gate / W5-28 identity verdicts | — | W10/W11 gates, pending by design (named) |
| W5-27 frosted glass | canonical tokens `--chrome-glass-blur: 18px` + per-mode tint (W3), consumed by pad/top chrome/rail (`c1-glass`) | PRESENT |

**Mapped-but-absent:** none new. **Claimed-but-thin:** W5-02
imagery (BS-05), W5-10 distance (BS-06), W5-11 quiet-hours
semantics (BS-04), W5-23(5) orbit privacy inheritance (BS-02).

## 2. CLAIM VERIFICATION — one strongest claim per wave, at source

| Wave | Strongest claim | Result |
|---|---|---|
| W1 seed | machine-speak gate fails the run | HOLDS (`scanSeedWorld` in harness + run) |
| W2 calls | `CallState.derive/3` is the single derivation; borders derive solely from it | HOLDS (single call site; W2 verifier concurred) |
| W3 halo/glass | 3px gap token, drift pin both directions | HOLDS (token + consumers cited above) |
| W4 splash | riders structurally cannot leave their rings; settle = DOM equality with the rest composition | HOLDS (test at `orbLivingRings.test.tsx:238`) |
| W5 chats/thread | mini-card substance line renders in the list; strip opaque at max scroll | HOLDS per merged-wave rendered measurements; not re-rendered here |
| W6 listen | rail structurally impossible; 22-site sweep | HOLDS (no rendered Listen control at source) |
| W7 graphs | "server-side exclusion — no other account ever receives the plan" | **OVERSTATED in effect** — true for *lists* only; direct detail/history reads ignore the flag (BS-03) |
| W8 soul | inventory row "Quiet hours **on/off** + start/end" | **DOES NOT HOLD** — no on/off field exists in schema, API, or the room (BS-04) |
| W9 home | imagery resolver with provenance; no placeholder ever painted | HOLDS as code; the world it renders still has no plan imagery (BS-05) |
| W12 in-call | graphing light tells *every participant* in real time; any participant can pause and ingestion actually stops | HOLDS (channel broadcast + gating state machine at source) |
| W13 legacy | share card recreated, no fabricated URL | HOLDS (`EventShareCard` + copy-details only) |
| W14 opalchat | orbit privacy behind a gate interface, "coordinator wires W7's real verification at integration" | **NOT WIRED at the merged tip** (BS-02) — the wave named the seam honestly; the status file's integration closure did not happen |
| W18-FIX | `familyOfStatus` live mis-coloring of AGREED plans fixed | HOLDS (mapping + pin at tip) |

## 3. DARK-CORNER SWEEP — what was checked and found clean

- **(a) Error/empty states:** Graphs (`listError` + retry,
  `C2Graphs.tsx:223`), Calls (`callsStatus: "error"` honest copy,
  `ChatsHome.tsx:363ff`), Chats list (error + retry, :558ff),
  Center/Orbits host (every action has a plain-language failure
  line, `C1ShellHosts.tsx:904ff`), Soul save errors, in-call
  accept error + capture note. New surfaces do **not** render
  blank on API failure. No finding.
- **(d) Long content:** session titles/previews, thread names,
  plan-card titles/lines all carry `nowrap + ellipsis` or
  `overflow-wrap: break-word` contracts (`c1.css:157/184/395`,
  `c2shell.css:467/580ff` — plan cards size to content per the
  Walk #4 law). Orbit anchor discs derive ≤2 initials safely.
  No overflow finding.
- **(g/f) Deep links:** push deep links are `opal://` mobile
  scheme (mobile track, BS-10); no web path routes a C2 user
  into an R17-faced surface *except* the two items in BS-07.

---

## 4. FINDINGS

### BS-01 — Duplicate migration version `20261030010001` on the merged tip
- **Surface:** backend schema (Orbits scope/anchor + Graphs
  private/location/lock — two different R19 migrations).
- **Evidence:** `apps/opal_core/priv/repo/migrations/` contains
  both `20261030010001_add_scope_and_anchor_to_opal_conversations.exs`
  (W14) and `20261030010001_r19_graphs_private_location_lock.exs`
  (W7) — the **only** duplicated version in the directory
  (`awk -F_ '{print $1}' | sort | uniq -d` → `20261030010001`).
  Ecto keys `schema_migrations` by version: on a fresh database
  one of the two legs is rejected/shadowed, so either the orbit
  columns or the private/location/lock tables silently never
  land. Each wave's backend battery ran on its own branch, where
  only one of the pair existed; **no merged-tip fresh-DB
  migration run exists yet** (W11 battery is the first) — and it
  could not be re-run here (no Elixir runtime in this VM), so
  the runtime failure mode is stated from Ecto's versioning
  contract, not from a local run.
- **Severity:** founder-visible (blocks or silently corrupts the
  W11 battery / any fresh deployment).
- **Disposition: FIX.** Renumber one migration to a fresh unique
  version (the later-merged W7 file is the natural move; nothing
  has shipped to production, gates unchanged), and make
  "fresh-DB `mix ecto.migrate` from empty" step zero of the W11
  battery, before any suite number is quoted.

### BS-02 — Private orbits unlock with NO verification at integration
- **Surface:** Center conversation log + rail (Orbits, W5-23(5)
  privacy inheritance from the item-9 gate).
- **Evidence:** `C1ShellHosts.tsx:913ff` — the production
  `orbitGate.requestUnlock` adds the key to a local
  `unlockedOrbits` set unconditionally and shows the notice
  *"Unlocked for this visit. (Passcode verification is not wired
  yet.)"* The code comment states the seam plainly; W14's own
  migration comment says "verification is wired by the
  coordinator." At `7fa7dc98` it is not: `verifyGraphLock` is
  consumed **only** by the Graphs Private area (`C2Shell.tsx:268`),
  never by the orbit gate. One tap on a locked orbit header
  (`C1Surfaces.tsx:399`) reveals its conversations' titles and
  latest lines to anyone holding the phone. The founder's
  catalog note recorded this seam as "verified/closed at
  integration" — it is open.
- **Severity:** founder-visible (a privacy gate that is theater
  in the shipped build, however honestly the code comment reads;
  the in-app notice discloses it but the *gate* still opens).
- **Disposition: FIX.** Wire `orbitGate.requestUnlock` to the
  existing W7 pattern: if a graph-lock passcode is set, prompt
  for it and call `verifyGraphLock` before adding to
  `unlockedOrbits`; reuse the Graphs area's unlock session so
  one verification opens both, and relock on unmount /
  `visibilitychange` exactly as `C2Graphs` already does. If no
  passcode is set, the header should say so and offer to set one
  instead of "unlocking."

### BS-03 — A plan made private stays fully readable by its participants through direct reads
- **Surface:** Graph detail + plan history (the other-viewer leg
  of W5-09).
- **Evidence:** W7's exclusion lives only in
  `list_plans_for_user/2` (`social_flow.ex:3087ff`: participants
  get `p.is_private == false` rows). But `get_plan_for_user/2`
  (`social_flow.ex:3599ff`) gates on `ensure_plan_access/2`
  (`:4414ff`), which checks creator/participant/conversation
  membership and **never looks at `is_private`**. `PlanHistory.for_plan`
  (the detail's Who/activity/history + location projection) rides
  the same access path. So the moment a creator makes a shared
  plan private, it vanishes from participants' *lists* — but any
  participant who kept the plan id (or opens it from the still-
  existing thread, whose plan-awareness reads the same plan)
  receives the full detail, roster, history, and shared
  locations. The W7 report's sentence "no other account ever
  receives the plan" is list-true and product-false.
- **Severity:** founder-visible (privacy semantics a user will
  feel: "I made it private and they can still open it").
- **Disposition: FIX.** One-line-class change with tests:
  in `ensure_plan_access/2` (or in `get_plan_for_user` /
  `PlanHistory.for_plan` before access is granted), a plan with
  `is_private == true` resolves access for its creator only;
  participants get the same `:not_found`/`:forbidden` the list
  already implies. Add the two-account regression case (creator
  makes shared plan private → participant detail + history read
  denied; list case already exists). *Related, honestly-scoped
  non-finding:* the owner's own list payload necessarily carries
  their private plans' titles to their own client (the gate is
  a casual-viewing barrier, as W7's report states plainly), and
  the locked Private section shows the **count** before unlock
  (`C2Graphs.tsx:347`) — accepted as designed; no change asked.

### BS-04 — The Soul room's quiet-hours promise is kept by only one of four consumers — and there is no off switch
- **Surface:** Settings → Soul (W5-11) × push, proactive, and
  follow-through engines (the time class).
- **Evidence:**
  1. **No on/off exists.** W8's inventory claims a "Quiet hours
     on/off + start/end" control; `AssistancePreference` has no
     `quiet_hours_enabled` field (schema fields are start/end
     only), and neither `C2You.tsx` nor `shellData.ts` renders a
     toggle. A user cannot turn quiet hours off in the room that
     owns them.
  2. **Push ignores the preference entirely:**
     `NotificationIntelligence.quiet_window(_)` returns a
     hardcoded `{22, 8}` (`notification_intelligence.ex:79ff`);
     the digest worker consumes the same function.
  3. **Proactive conversations ignore it too, with an inverted
     window:** `ProactiveConversation.within_quiet_hours?`
     (`proactive_conversation.ex:366ff`) uses compile-time
     `@quiet_start 8 / @quiet_end 22` in a hardcoded
     `America/Los_Angeles`, whatever the Soul timezone says.
  4. **Follow-through uses the preference but in UTC:**
     `FollowThrough.quiet_hours?` (`follow_through.ex:304ff`)
     compares the saved local window against `now` in UTC,
     ignoring the Soul room's own timezone field.
  5. **The one faithful consumer drops the minutes and flips
     the degenerate case:** `AttentionBudget.in_quiet_hours?`
     (`attention_budget.ex:405ff`) parses hours only (a 10:30 PM
     start behaves as 10:00 PM while the room's sentence says
     "10:30 PM"), and treats `start == end` as *quiet all day* —
     while `NotificationIntelligence.in_quiet_range?` with
     `start == end` is *never quiet*. The room lets a user save
     equal start/end with no validation, producing the sentence
     "Opal holds non-urgent things from 8:00 AM to 8:00 AM."
- **Severity:** founder-visible (the room's central sentence —
  "Opal holds non-urgent things from 10:00 PM to 8:00 AM" — is
  false for push and proactive delivery, the two places a user
  actually experiences quiet hours).
- **Disposition: FIX.** Make one backend quiet-window resolver
  the single derivation (preference start/end + the preference's
  timezone, minute precision, `start == end` = disabled) and
  point all four consumers at it; delete the two hardcoded
  windows. In the room: add the missing on/off (a real
  `quiet_hours_enabled` field, additive migration) or, if the
  window itself is the switch, validate `start != end` with a
  plain-language inline reason and say "set the same time to
  turn quiet hours off" nowhere — pick the field; it is the
  honest control the inventory already claims exists.

### BS-05 — The walk world's "real imagery" is a 1×1 pixel, and plan imagery is never exercised
- **Surface:** Home story rail + plan cards (W5-01/W5-02) in the
  seeded review world the founder will walk.
- **Evidence:** `human_seed_world.ex:95` defines
  `@png_1px "iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB…"` (a 1×1 PNG);
  `ensure_story!/3` (`:560ff`) uploads exactly those bytes as
  every seeded story's media through the real publishing path.
  The media record is real; the *image* is a single pixel — a
  story opened from the rail renders a blank/stretched nothing
  with a caption. Separately, the seed states its own limit
  (`:57ff`): SharedPlan/Catalog carry no photo field, so **no
  seeded plan has imagery under any of the five fields**
  `planImageFromRecord` reads — Home plan cards in the walk
  world render with no media well at all, i.e. W5-02's "real
  imagery in plan/story cards" is not visible anywhere in the
  world the founder reviews, despite the plumbing being correct.
- **Severity:** founder-visible (it is precisely the "Home
  doesn't feel social / imagery" complaint of Walk #4, returning
  in the corrected pack's own seed world).
- **Disposition: FIX.** Seed stories with real image bytes (a
  handful of small generated/stock JPEGs committed as seed
  fixtures, uploaded through the same owner path — bytes real,
  provenance seed), and give the plan-imagery chain one real
  producer: add an additive `image_url` on the plan contract
  populated for seeded venue plans from the place record (or a
  media-id→URL resolver on the client, retiring the deliberate
  `media_id` exclusion for plans that carry one). The gate
  should assert at least one story and one plan card in the
  review world render a non-1×1 image.

### BS-06 — Graph-detail location: distance is dead in practice; "sharing for 4 hours" is a one-shot snapshot
- **Surface:** Graph detail Who rows (W5-10).
- **Evidence:** (i) Distance requires `shared_plans.place_lat/
  place_lon`; W7's report names the gap itself — **no writer
  populates them** (places are label-only; no geocode step
  exists), so every real plan renders "distance unavailable"
  forever. (ii) The share action (`C2Shell.tsx:287ff`) takes
  **one** `getDeviceCoords()` fix at tap time and tells the
  sharer "You are sharing your location for this plan for the
  next 4 hours" — there is no `watchPosition`/interval refresh
  anywhere in the share path, so for 4 hours every other joiner
  sees a stale snapshot labelled "Sharing location." The
  viewer's line is honest about basis ("measured from the
  location they shared"), the sharer's copy is not.
- **Severity:** coherence (founder-visible when he tests it
  with two phones and walks across the room).
- **Disposition:** distance leg = **EXCEPTION** — blocker: no
  venue geocoding/place-resolution step exists in the plan
  flow; building one is its own item, and inventing coords from
  label strings was correctly refused. Snapshot leg = **FIX**:
  either refresh the share on an interval while the detail is
  open (and say "updated just now / 12 min ago" from
  `updated_at`, which the record already carries), or change
  the sharer + viewer copy to snapshot language ("shared their
  location at 6:42 PM"). Do not leave "sharing for the next
  4 hours" over a single fix.

### BS-07 — Legacy path residue: `?shell=r17` still serves the whole R17 shell, and the crash screen is legacy-faced with an R17 recovery
- **Surface:** app entry + runtime error boundary (legacy class).
- **Evidence:** (i) `theme/c2Shell.ts:45ff` — in the served C2
  build, any URL with `?shell=r17` renders the full R17 shell
  (`App.tsx:44ff` falls through to `OpalApp`), and visiting it
  also **deletes the device-local C2 marker**, so the user's
  later plain visits keep landing in the legacy shell until
  something re-sets it. W13 flagged this seam (S-1) and the
  coordinator's recorded recommendation was RETIRE; at this tip
  it is still live. (ii) The one error fallback every user can
  hit, `OpalErrorBoundary` (`main.tsx:198ff`), is legacy-faced:
  `app-futura` classes, hardcoded dark-only colors (`#050816`
  background in both modes), and its sole recovery button
  "Restart first run" navigates to `/?opal_reset_first_run=1` —
  a flag consumed by the **R17** shell's boot logic
  (`OpalApp.tsx:610ff`); the C2 shell never reads it, so a crash
  in C2 recovers into a first-run reset flow that isn't C2's.
- **Severity:** founder-visible (a shared link or a single
  crash puts a user in the old product / a dark-only reset
  screen, in the build whose catalog item 17/19 says nothing
  legacy survives by a side door).
- **Disposition: FIX** (aligns with the coordinator's existing
  S-1 recommendation; if W15 lands it first, this closes
  there). Retire the `?shell=r17` branch from the served build
  (the drill fallback lives at branch level: `muse/repair-17`
  untouched + preview worktree). Restyle the boundary on the
  chrome-glass/token system in both modes, and make its
  recovery reload the current shell (`location.reload()` /
  link to `/`) preserving session — never the first-run reset.

### BS-08 — New chrome (rail, orbit sheet, overflow menu) has no keyboard dismissal or focus management
- **Surface:** conversation rail, OrbitSheet, conversation
  overflow menu (W5-23/25/27 chrome; accessibility class).
- **Evidence:** the only `Escape` handler in the new chrome is
  one input-level handler in `OpalCenterChat.tsx:1436`. The
  rail (`C1Surfaces.tsx:511ff`, `role="dialog"`) and OrbitSheet
  (`OrbitSheet.tsx:69ff`, `role="dialog"`) close only via
  scrim click or their Close buttons — no Escape listener, no
  initial focus, no focus return, no trap. The overflow menu
  (`C1Surfaces.tsx:816ff`, `role="menu"`, `aria-expanded`
  correctly set) closes only by toggling the button or picking
  an item — no Escape, no outside-click dismissal. A keyboard
  user can open all three and cannot dismiss any of them the
  standard way.
- **Severity:** coherence.
- **Disposition: FIX.** One shared dismissal hook for the three
  surfaces: Escape closes (and returns focus to the invoking
  button), the menu also closes on outside pointer-down; on
  open, focus moves to the dialog's first control / Close
  button. Add the keyboard legs to the existing doorway tests
  (open → Escape → closed → focus back on the trigger).

### BS-09 — Center session list is unbounded, and its preview query loads every message body
- **Surface:** Center log / rail / orbit index at account scale
  (the "200 conversations" leg).
- **Evidence:** `OpalConversations.list_sessions/2`
  (`opal_conversations.ex:73ff`) has **no limit**; its previews
  query selects `m.body` for **all messages in all of the
  user's conversations**, ordered, then reduces in memory to
  the first per conversation (`:100ff`). A user with 200
  conversations and long histories pays a full-history body
  scan on every Center/rail open, and receives every session
  row in one payload for the client to group. (The plan list
  by contrast is capped at 100, `social_flow.ex:3110ff`.)
- **Severity:** coherence (performance; will present as Center
  getting slower exactly as a real user's graph grows).
- **Disposition: FIX.** Push the latest-message-per-conversation
  selection into SQL (lateral join / distinct-on) so one row
  per conversation crosses the wire, cap the sessions payload
  (e.g. most-recent 200 with the orbit groups' counts computed
  server-side), and keep the client grouping unchanged. Add a
  scale fixture to the scope tests (200 sessions × 50 messages)
  asserting payload size, not just contents.

### BS-10 — Mobile parity: none of R19 exists on mobile — EXCEPTION (own track)
- **Surface:** `apps/opal_mobile` (class g).
- **Evidence:** **0 of the 62 commits** in `f2981dbf..7fa7dc98`
  touch `apps/opal_mobile`. Orbits, private graphs, graphing
  pause/light, Soul/Memory rooms, the Calls redesign, splash
  v2, the human seed world: none has a mobile counterpart; the
  mobile app remains at its Repair #17 state, and push deep
  links (`opal://attention`, `notification_intelligence.ex:151`)
  land in that older face. The R18 lockfile desync also persists
  at this tip: `package.json:24` requires `expo-location ~18.1.6`
  and `package-lock.json` still has no `expo-location` entry,
  so `npm ci` in `apps/opal_mobile` remains unreproducible
  (MT-06, carried).
- **Severity:** coherence (stated honestly: no R19 report claims
  mobile parity — this is the catalog entry that keeps the
  divergence named rather than discovered).
- **Disposition: EXCEPTION.** Blocker: mobile rebuild is its
  own track by the program's standing scope; the founder
  reviews the corrected pack on web. The two actions that
  belong to *this* cycle: (1) regenerate/commit the mobile
  lockfile so the track is at least installable; (2) record in
  the pack handoff that every R19 surface is web-only today.

### BS-11 — Conversation Share (overflow) sends a reference that resolves to nothing
- **Surface:** Center chat overflow → Share (W5-25).
- **Evidence:** `C1ShellHosts.tsx:864ff` — Share invokes the
  platform share sheet / clipboard with the text
  `Opal chat: <title> (<anchor label>)`. No link, no id, no
  share artifact: whoever receives it cannot open anything.
  The code comment scopes this honestly ("no conversation
  share-card surface exists at this base (W13 owns it)"), but
  W13's share work shipped for **plans** (`EventShareCard`);
  the conversation leg still terminates in unresolvable text —
  a dead end for the recipient, wearing a working control.
- **Severity:** coherence.
- **Disposition: FIX.** Smallest honest form: extend W13's
  share-card pattern to conversations (card = title + anchor +
  finished latest-line-free summary, Copy details as the one
  action, no fabricated URL — the plan card's exact law). Until
  that lands, rename the menu item's outcome honestly in the
  notice it already shows ("Copied the chat reference" is
  accurate; the platform-share path's bare "Shared." is not).

### BS-12 — Seed brunch: the stored instant and the spoken time disagree by the timezone offset
- **Surface:** Human seed world (time class, review world only).
- **Evidence:** `human_seed_world.ex:298ff` seeds "Sunday brunch
  at Herb & Wood" with `start_at: next_sunday_late_morning()`
  = next Sunday **11:00 UTC** (`:715ff`, `Etc/UTC`) and
  `time_label: "Sunday · 11:00 AM"`. Cards render the label, so
  the glass reads correctly; anything deriving from the instant
  (state timing, timeline ordering, "happening" windows) places
  brunch at 4:00 AM PDT / 7:00 AM EDT. In a world built to be
  believed, the one dated plan's instant should be the local
  11:00 AM it claims.
- **Severity:** polish.
- **Disposition: FIX.** Build the seed instant in the world's
  home zone (`America/Los_Angeles`, 11:00 local → UTC) so
  instant and label agree; the machine-speak gate's sibling — a
  seed assertion that each dated plan's label hour matches its
  instant in the home zone — would pin the class.

---

## 5. THE FOUNDER'S QUESTIONS — five first surfaces, asked cold

1. **Splash 1/2** — *What is this for?* The product's identity
   and the door in. Every control terminates: Enter Opal /
   sign-in reach onboarding (verified in App/C2Shell routing).
   No dead end found.
2. **Onboarding** — three steps, all five buttons wired to the
   real Verify-backed flow (R18-traced). No dead end found.
3. **Center (deck + Opal chat)** — *What can I do here?* Talk
   to Opal, open the rail, manage any conversation end to end
   from the overflow. Dead ends: Share (BS-11) and the private
   orbit gate (BS-02).
4. **Home** — feed cards' actions all route through
   `events.feedAction`; live cards, story rail, create sheet
   terminate in real outcomes. The gap is not dead controls —
   it is that the imagery the surface was redesigned around
   never appears in the review world (BS-05).
5. **Chats / Calls** — mode switch, filters, new-call/new-chat
   sheet all wired; calls carry honest error/empty states.
   No dead end found.

## 6. CATALOG-READY SUMMARY TABLE

| # | Finding (one line) | Surface | Severity | Disposition |
|---|---|---|---|---|
| BS-01 | Two migrations share version `20261030010001`; one schema leg can silently never land on a fresh DB | Backend schema (W14 × W7) | founder-visible | FIX — renumber one; fresh-DB migrate = W11 battery step zero |
| BS-02 | Private orbit gate unlocks on tap with no passcode verification (integration seam never wired) | Center log / rail (Orbits) | founder-visible | FIX — wire `verifyGraphLock` into `orbitGate`, shared session + relock with Graphs |
| BS-03 | Plan made private remains fully readable by participants via detail/history direct reads | Graph detail (other-viewer) | founder-visible | FIX — `is_private` check in the access path + two-account regression |
| BS-04 | Quiet hours: no off switch exists; push + proactive consumers ignore the Soul settings (hardcoded windows); follow-through reads them in UTC; `start == end` means opposite things in two consumers | Soul room × engines | founder-visible | FIX — one resolver, all consumers; add the claimed on/off field |
| BS-05 | Seeded story media is a 1×1 PNG; no seeded plan carries imagery, so W5-02 imagery is invisible in the walk world | Home / seed world | founder-visible | FIX — real seed image bytes + one real plan-imagery producer + gate assertion |
| BS-06 | Location distance never appears (no `place_lat/lon` writer); "sharing for 4 hours" is a single snapshot | Graph detail Who | coherence | EXCEPTION (distance — no geocode step exists) + FIX (snapshot copy/refresh + age label) |
| BS-07 | `?shell=r17` still serves the legacy shell (and clears the C2 marker); crash boundary is legacy-faced, dark-only, and recovers into the R17 first-run reset | Entry / error fallback | founder-visible | FIX — retire the flag in the served build; boundary on tokens, recovery reloads current shell |
| BS-08 | Rail, orbit sheet, and overflow menu: no Escape, no focus management; menu has no outside-click close | New chrome (a11y) | coherence | FIX — shared dismissal/focus hook + keyboard test legs |
| BS-09 | Session list unbounded; preview query loads every message body in the account | Center log / rail (scale) | coherence | FIX — SQL latest-per-conversation, payload cap, scale fixture |
| BS-10 | Zero R19 surfaces exist on mobile; mobile lockfile still desynced (`expo-location`) | Mobile app | coherence | EXCEPTION — mobile is its own track; fix the lockfile in-cycle, name web-only in the handoff |
| BS-11 | Conversation Share sends title text with no link/id — resolves nowhere for the recipient | Center chat overflow | coherence | FIX — conversation share card on W13's plan-card law, or honest copy until it lands |
| BS-12 | Seed brunch instant is 11:00 UTC while its label says 11:00 AM (4 AM PDT by the instant) | Seed world | polish | FIX — build the instant in the home zone; pin with a label↔instant seed assertion |

*End of report. No application code was changed; no commits made.*
