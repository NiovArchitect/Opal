# Repair #18 - FULL SCREENSHOT PACK (close-out phase 10)

The founder-facing rendered proof of the whole integrated build.
Branch `muse/r18-fullpack`. **No walk link is issued - this pack is
the delivery.** FOUNDER_ACCEPTED: NO (unchanged).

## Build identification

- App tip: `db701d4d` on `muse/repair-18` ("R18 WALK_ACCEPTANCE:
  replay + revert-drill rows filled..."). Its tree, computed locally:
  `e16d767d4f6b43d830f79b10e885a1dec03be318`.
- Served from the Mac preview stack (`opal-r18-preview` worktree,
  Phoenix :4100 r1a1.env synthetic mode, Vite :5174
  `VITE_OPAL_SHELL=c2`, LAN 192.168.0.33), re-mirrored for this pack:
  mirror commit **`18dc95d8`** (2026-10-18 18:33:55 PDT, "preview
  mirror: integrated @ db701d4d (Repair #18 full-pack)").
- TREE GATE: the mirror's `HEAD^{tree}` =
  `e16d767d4f6b43d830f79b10e885a1dec03be318` - exact match with
  `db701d4d^{tree}`. (The bulk rsync broke on the SSH bridge; the two
  files that differ between fa3f0912 and db701d4d -
  `shots/repair18/WALK_ACCEPTANCE.md`, `COMPLAINT_LEDGER.md` - were
  transferred directly and md5-verified, and the tree gate proves
  the end state byte-exactly.) The preview's only uncommitted change
  remains the preserved `vite.config.ts` proxy patch.
- Restart verification: BEAM pid 51585 started 18:34:26 PDT, 31s
  AFTER the mirror commit; `GET /health` = ok / db up /
  synthetic_development; migrations 110 up / 0 down.
- Every capture is stamped by the served build itself: the in-frame
  chip reads `seed - 18dc95d`, and every manifest entry records
  `data-git-head-full = 18dc95d8458412b7537076bd25d3da6a1e600dd7`.
- Captures: Chromium headless-shell 1217 (the Mac's cached shell;
  `run-rendered.mjs`'s chromium-1248 is not cached on this Mac) at
  390x844, DSF 2, dark AND light for every phone item, via the waves'
  harness pattern (`lib/browser.mjs` sessions + geometry probes).

## DECKFIX AMENDMENT (2026-10-18, post-pack quality loop)

Findings F1, F2, F3 and F7 below were repaired at source on branch
`muse/r18-deckfix` (code tip `1c3f7eb5`, tree
`6e0b0d147baa78494fffaf5f9887989bd29b5cc6`) and the affected frames
were RE-CAPTURED from the Mac preview stack re-mirrored from that
tip: mirror commit **`09b1e6f2`** (2026-10-18 21:57:57 PDT), TREE
GATE PASS (staged tree == code tip tree; the vite proxy patch
remains the only uncommitted change). Preview restarted after the
mirror (BEAM 58366 / Vite 58367, 21:58:04 PDT); opal-walk untouched
(HEAD 808c7bd6, original PIDs/start times); opal-fallback still
stopped at 1892e5d6. The re-capture
(`shots/regression/rendered/deckfix-capture.mjs`, same session/data
pattern, ONE provision + ONE seed call set) found the pack's F1
setup still live in the served DB - `GET /reveals` for viewer A
returns the lit P1 and the pack plan's reveal - so nothing was
recreated. Replaced frames: `center-deck-*`, `center-deck-scrolled-*`,
`thread-*`, `thread-lit-reveal-*`, `fireframe-element-*` (now cropped
from the deck's lit reveal), `you-hub-*`; new frames:
`center-deck-lit-reveal-*`. Amended manifest records carry
`stamp = 09b1e6f2...` and a `deckfix` note naming the superseded
18dc95d8 values; see the manifest's top-level `deckfix` block and
`reprobes.deckfix`. **F5 is unchanged** (declared MT-07, not a
defect). FOUNDER_ACCEPTED: NO (unchanged).

## Capture setup - real records only, named

One session provision + ONE founder-seed call set for the whole
pack (the seed endpoint throttles; see the incident note below).
Sessions: synthetic A `+12025550101` / B `+12025550102` through the
real activation APIs. Founder seed (comm + graph): 200 / 200.

Created through the real APIs by this pack, named:

- Direct conversation B<->A `39692baf-bb36-41e0-ba22-3b70fddf69d4`
  (the pair's existing direct thread), with two human messages:
  B: "Saturday works for me - 7:30 at Juniper and Ivy?" and
  A: "Let me check my evening and I will answer here." (both 201).
- Plan **`d39df6d7-2626-4143-93ed-85427b910dbd`** - "Dinner at Juniper
  and Ivy", Juniper and Ivy, "Saturday 7:30 PM", created by B through
  `POST /conversations/:id/plans` (201). A's answer is left pending
  on purpose: it earns the DIR-4 P1 reveal (in the thread, below).
- One real call `POST /calls` on that conversation (201) - it is the
  7:03 PM "No answer" row at the top of the call log.
- Celebration `9fbc1990-ad2d-46b0-9f18-8482632c8aa6` - "Regression B",
  birthday, Nov 2 (201, via `POST /celebrations`). A saved
  celebration inside the 60-day window derives the Someday-shelf
  starter at read time: "Plan something for Regression B / You saved
  Regression B's birthday - it is coming up on Nov 2."
- The Working-toward goal in frame ("Harmony proof goal", 1 plan
  linked) is a pre-existing real record from the harmony2 wave; this
  pack created no goal.

Everything else on screen is the founder-seed + accumulated real
regression data of the long-lived preview DB (107 plans in motion
for viewer A). Nothing was painted, fixture-fed, or composited.

## Gates (per capture, in manifest.json)

- **Badge stamp**: every PNG record carries the served mirror hash
  `18dc95d8...` - no exceptions.
- **LOCKUP GATE: PASS.** Zero `[data-orb-lockup="full"]` side-by-side
  mark+wordmark lockups on any probed surface in any pass. The
  lockups that appear are the stacked splash lockup (probe: stacked,
  center delta 0px) and wordmark-alone (Home header, wide sidebar).
- **Geometry**: `docOverflow` 0 on every phone capture. Clipped-text
  counts are recorded per surface; the non-zero cases are findings
  F3 (deck rest fold) and the wide-You pair (2 each, below).
- **Dock halo**: on the verified dock close-ups, the orb mark sits
  fully inside the raised disc (markInsideDisc true, both modes),
  living rings present, and no border crosses the mark's halo - the
  disc's own 1px ring (45% warm tone) sits outside the halo with a
  clean gap.

## Re-probes (replay asymmetries - artifact vs real)

- **center-deck clippedCount**: replay saw dark 1 / light 0. This
  pack: **1 in BOTH modes** at deck rest, sample "Expiry macreplay1"
  (the third Taking-shape card's title at the rest fold), and 0 in
  both modes once scrolled. Verdict: the clipped element is REAL and
  present in both modes; the replay's light=0 did not reproduce.
- **you-soul-memory soulForm**: replay saw true dark / false light.
  This pack: **true in BOTH modes** - but only after the section
  finishes loading (it first paints "Loading."; the dark capture
  needed a 60s-budget wait). Verdict: **ARTIFACT** (load timing) in
  both the replay and this pack's first passes.
- **center-chat opened**: replay saw true dark / false light. This
  pack: **true in BOTH modes**. Verdict: **ARTIFACT**; the replay's
  light=false did not reproduce.

## Per-surface readings

1. **splash-1** (dark/light): the full master composition inset by
   the 14px safe margin on the continuous night field, rings whole,
   wordmark stacked beneath (never beside), one Continue, zero
   "Enter Opal". **Presented choice, stated plainly: light mode
   keeps the night field.** The light splash is the same night
   composition (probe: `data-splash-field="night-master"`, root
   background rgb(5, 3, 15) in both modes) - light mode does not get
   a daylight splash; the choice is presented here for the founder
   to accept or send back.
2. **splash-2-entry**: exactly one live "Enter Opal" (probe: 1) over
   the entry frame, both modes.
3. **splash-1-motion videos**: carried into this pack from
   `shots/repair18/splash-pack/` per instructions (their own
   provenance - mirror d0bcc998 of the same tree lineage - is
   recorded in the manifest; the stills above are this pack's own).
4. **Home** (`home-`, `home-scrolled-`): header (own avatar, OPAL
   wordmark alone, search, people), the story rail (Your story +
   people's stories in state rings), then the moment feed. **What
   Home IS, sayable from the capture: Home is the living feed of
   your people and your plans coming together - stories on top,
   moment cards below, each card carrying what is happening with it
   ("place decided", who it is with).** Against the Home brief
   (surface, prepare, live, remember): surfacing and living read
   clearly; preparation/anticipation does not appear in the Home
   frame itself - the "what needs you" preparation lives one tap
   away in Center, and in this data most Home cards are other
   people's moments rather than the viewer's next thing being
   prepared. The scrolled frame (native scroll; see F6) shows the
   feed continuing in the same grammar.
5. **Center deck** (`center-deck-`, `-scrolled-`): the orb hero,
   "Good evening, Regression.", Make something happen / Talk to
   Opal / Soul + Memory doors, then Taking shape plan cards with
   dashed forming fire lines. Fold check passes when scrolled
   (last card clears the dock). See F1 - the deck's largest gap.
6. **Center chat** (`center-chat-`, `center-chat-exchange-`): opens
   in both modes; the pack's real exchange - "What are you holding
   for me?" - answered with the holding chips rendered from live
   counts: "107 plans in motion", "7 waiting on your answer",
   "0 memories held", "0 sources connected" (4 chips dark; the
   light pass shows the same exchange's history, 8 chip elements).
7. **Chats list** (`chats-list-`): DIR-1 plan-awareness rows render
   (state pill + shared-plan line per row; manifest records the
   variants found).
8. **Thread** (`thread-`, `thread-lit-reveal-`): Next Together strip
   present, and **the lit DIR-4 P1 reveal IS in frame here**: the
   FireFrame card for the pack's own setup plan - "YOUR MOVE /
   action / Dinner at Juniper and Ivy / Saturday 7:30 PM - Juniper
   and Ivy / Confirm / Dismiss" - `data-lit="true"`, one FireFrame,
   both modes. See F2 for what else this frame shows.
9. **Call log** (`call-log-`): the R17-path ChatsHome calls mode, as
   served (the C2 chats route carries no calls control on this
   build). DIR-1 call elements present: per-peer plan pills
   ("Happening - Dinner macreplay...", "Ready - Saturday opens like
   ...") on real rows, 8 rows, the pack's own 7:03 PM call on top.
   The surface still wears the legacy face (old dock, glossy mark)
   against the C2 surfaces - the known legacy-face friction, shown
   as served.
10. **Graphs main** (`graphs-`): 100 plan cards in their states
    (Forming pills lead the list) in grouped sections.
11. **Plan detail** (`plan-detail-`): WHO with per-person truth
    (Going / Waiting to answer), WHEN, and History expanded -
    "User A set the day to 7 PM." / "Created by User A." - plus the
    check-in action.
12. **Intentions** (`graphs-intentions-`): the rhythm section -
    "The rhythm you are keeping with your people, in your words. It
    tracks your plans only - never anyone else." + New intention.
13. **Someday shelf** (`graphs-someday-shelf-`): after the named
    celebration above, the shelf carries its starter WITH basis
    line: "Plan something for Regression B - You saved Regression
    B's birthday - it is coming up on Nov 2." + "Start a plan".
    (Before that record existed the shelf honestly read "Nothing on
    the shelf yet.")
14. **Working toward** (`graphs-working-toward-`,
    `graphs-goal-picker-`): the goal row ("Harmony proof goal",
    next-up line, "1 linked - change") and the picker open with the
    owner's real plans listed as link choices (100 link buttons).
15. **You hub + all 22 sections** (`you-hub-`, `you-<section>-`):
    every hub row captured per section in both modes; the section
    title was recorded per capture in the manifest (youfix pass) so
    each frame is verifiably its own section. Notable readings:
    Profile (Edit profile) holds name/username; **Connections** is
    the real ledger with honest server-checked statuses ("Not
    verified yet / Never checked" for DeepSeek thinking, Deepgram
    listening, ElevenLabs voice - never shown as working);
    **Soul + Memory** renders the Soul form (proactivity: Only when
    I ask / Balanced / More forward; quiet 22:00-08:00;
    America/Los_Angeles; 3 per day; standard) above "What Opal
    remembers - Opal is not keeping any memories for you yet";
    **What Opal remembers** is honestly empty for this account ("Opal
    is not keeping any facts yet.") - there are no capsules with
    provenance to show because this viewer has none, and none were
    invented; **Delete account** is captured in its ARMED state
    ("The first tap only arms the confirmation") with the confirm
    control visible - **the confirm was NOT clicked; nothing was
    deleted**; Help & support, Saved logins, Invite code, Linked
    devices, Quiet (notifications), Appearance, Your library, and
    Your moments (13 kept moments) all render their real content.
16. **Wide pair** (`wide-home-`, `wide-you-`, 1280x800): HA-A
    sidebar composition - 232px sidebar, dock hidden, wordmark
    alone at the top of the rail; wide You shows the three-column
    settings composition (rail / section index / hub column).
17. **Search** (`search-`): query "Regression" (chosen because it
    hits all three groups; "dinner" was also run and is in the
    manifest) - grouped results open: PLANS (2), CHATS (6), PEOPLE
    (6 rows; the People group heading sits below the fold of the
    still, its presence and rows are probe-recorded).

## Findings (named honestly - these ship with the pack)

- **F1 - FIXED (deckfix, mirror 09b1e6f2).** Was: the lit DIR-4
  reveal does NOT render on the Center deck. The derivation serves
  it: `GET /reveals` returns a lit P1
  (`plan:6e3b03bf...:needs-answer`, lit: true, "Your move"), plus two
  more P1s including this pack's own setup plan. But the deck as
  served shows NO "Needs you" section and zero FireFrames (probe:
  0 `[data-testid="reveal-fire-frame"]` on the deck, both modes):
  its only reveal-cards are the unlit P5 (Coming up) and the unlit
  P6 report line. The deck replaces plan cards with reveal cards by
  plan id, and none of the deck's three capped Taking-shape cards
  matches a feed plan - so the strongest waiting item in the
  product never reaches the deck. **After:** the deck's slot logic
  is reconciled with the reveal feed - a plan reveal takes its slot
  in its category's section by right of the reveal (replacing its
  plan card wherever it would render, or standing in the section
  when its plan is outside the deck's capped card set), claims its
  plan so it never also renders as a plain card, and every section
  stays capped at 3. The re-captured `center-deck-*` frames show
  the Needs-you section at rest with the lit P1
  (`plan:6e3b03bf...`) inside its FireFrame, plus the pack plan's
  own P1 - the frame that did not exist on the pack build now
  exists in both modes (`center-deck-lit-reveal-*`,
  `fireframe-element-*` cropped from the deck's lit card;
  manifest `center-deck-fireframes` records are non-empty).
  Regression: three new DIR-4 deck tests reproduce the pack's exact
  setup (lit P1 outside the capped card set) - they fail on the
  pre-fix deck (proven by run against base) and pass after.
- **F2 - FIXED (deckfix, mirror 09b1e6f2).** Was: thread top -
  strip/message overlap + a raw call id bubble. In
  `thread-lit-reveal-*` the Next Together strip and its plan pill
  render OVER the thread's first message bubble (texts
  superimposed), and a system record renders as a raw bubble -
  `call:47f28413-1edd-4e5e-bd25-...` (the pack's own POST /calls
  record) - instead of a human call line. **After:** (a) the strip
  is in flow at the head of the thread's scroll column (its sticky
  positioning is removed), and the re-capture's geometry probe
  reads strip 76-128 vs first bubble 144-191 - no intersection, in
  both modes; (b) the in-thread call record renders as a centered
  system line carrying the call record's own human history line -
  the same derivation the call log uses (`history_label` + local
  time): the re-captured `thread-lit-reveal-*` frames show
  "No answer - 7:03 PM" between the pack's two messages and the lit
  Juniper reveal, and the probe finds no `call:<uuid>` text
  anywhere in the thread. An unmatched record falls back to plain
  "Call" - the raw id can never render. Unit-tested in
  `deckfix.test.tsx`.
- **F3 - FIXED (deckfix, mirror 09b1e6f2).** Was: deck rest fold
  clips a card title in both modes (see re-probes): at rest, the
  third Taking-shape card's title ("Expiry macreplay1") is cut at
  the fold in dark AND light; it clears when scrolled (fold check
  ok). **After:** with the post-F1 deck content (Needs-you reveals
  lead), the rest rhythm is pinned by the hero's min-height floor
  so the 844 fold lands in the text-free window between the last
  Needs-you card (bottom 837, measured on the served build) and
  the Coming-up section heading (top 865); the deck's end-of-scroll
  clearance gained one breathing step so the scrolled deck probes
  clean too. Re-capture: **clippedCount 0 AT REST in both modes**,
  scrolled fold ok (last card bottom 734 <= dock top 772),
  scrolled clippedCount 0. (An inset scrollport was tried first
  and rejected: the pack's probe adjudicates against the viewport
  bottom, so content below an inset port counted as clipped even
  when nothing was cut - the port stays full-height and the rhythm
  carries the fix.)
- **F4 - Wide You clipped text (2 per mode)**: the wide hub column
  wraps the profile name ("Regress / A") and two text elements
  probe as clipped in the 1280 composition (manifest samples);
  the middle of the wide layout also carries a large empty column
  between the rail and the settings index.
- **F5 - Call log still wears the legacy face** (capture 9): the
  R17-path surface renders with the old dock/marks against the
  redesigned C2 surfaces. As served; already a named founder
  friction, evidenced here on the final build.
- **F6 - Home scroll quirk (harness-observed, product-adjacent):**
  programmatic `scrollTop` on the shell column is reset by the app
  (reads back 0); native scrolling (scrollIntoView / user scroll)
  works - the scrolled Home frame was captured natively. Flagged
  in case it also affects in-app scroll restoration.
- **F7 - FIXED (deckfix, mirror 09b1e6f2).** Was: hub rows can
  sit under the dock: the You hub's "Opal Assist and calls" row,
  when scrolled into view, lands where the dock's raised orb
  intercepts taps (Playwright hit-test evidence, both modes,
  repeatedly). Root cause found by live probe: the hub root was an
  unconstrained block that grew to its full content height
  (2032px), so its inner `.c2s-scroll` never scrolled
  (scrollHeight == clientHeight), the DOCUMENT became the scroller,
  and the dock-clearance bottom padding the scroll class carries
  never applied. **After:** the hub (and the settings sections,
  same pattern) are contained in their route slot
  (`.c2s-you-surface`, the C1-host pattern), so their own scroller
  is real; rows carry the deck's scroll-margin discipline and the
  scroller scroll-padding, so a row scrolled into view stops fully
  above the dock. Re-capture probe (both modes): hub height 844,
  scroller scrollHeight 2032 > clientHeight 844; the calls-assist
  row scrolled into view rests at 574-640 (dock top 772),
  hit-test lands on the row (trapped: false); at max scroll the
  last row's bottom is 709, clear of the dock. See manifest
  records `you-hub` / `you-hub-orb-clearance`.
- **F8 - Soul form save pill label:** in the Soul + Memory frame
  the form's primary save control renders as a large paper pill
  whose label is not legible in the capture; recorded as observed,
  not asserted as a defect.

## Incidents / provenance notes

- **Seed throttle (429)**: the pack's first two launch attempts hit
  429 on the founder-seed calls. Root cause, found in code: the
  global per-user API limit (1000 req/hour, `ApiRateLimit`) - viewer
  A's bucket had been burned by the replay drill's API suite and
  blocked for one hour from trip time. Blocked hits do not extend
  the block. The pack waited it out (~18:44 -> 19:02 PDT) and then
  ran with exactly ONE provision + ONE seed call set. No limits
  were bypassed or buckets edited.
- **Capture passes**: main run + small top-up passes (all against
  the same served 18dc95d8 mirror, sessions only - the seed was
  never re-called). The main run's You-section loop got stuck on
  the Your-moments archive (that view has no dock/settings-back),
  which silently repeated one frame across later sections; this was
  caught by hash audit, and every You section was re-captured with
  fresh navigation and per-section title verification. Two
  main-run frames (`dock-full-*`) were found to be stuck-state
  frames and are EXCLUDED (see manifest `excluded`); the dock
  evidence in this pack is the re-captured verified close-ups.
- **Stack discipline**: only the preview pair was restarted.
  opal-walk was never touched (verified again at close-out:
  HEAD 808c7bd6, BEAM 15915 / Vite 16004 with their original start
  times); opal-fallback remains stopped at 1892e5d6.
