# Repair #17 — Failure Ledger

Every item: founder-visible symptom → root cause → fix → proving gate.
Track reports: TRACK_W1_CLOCK.md, TRACK_W2_SEEDKILL.md, TRACK_W3_UI.md,
TRACK_W4_FLOWS.md, TRACK_W5_SURFACES.md, TRACK_W6_CHARACTER.md,
TRACK_W7_SPLASH_TESTFLIGHT.md (all in this folder).

## F17-01 (P0, META) — Scripted seed behavior layer on the walk path
With `opal_founder_seed=1`, sends to `seed-chat-*` conversations were
answered by a local script (`seedThreadIntelligence.ts`, 412 lines): fake
replies under real people's names, sticky "you mentioned Maya" lines,
scripted Nighthawk resurrection. `openPersonChat` minted `seed-chat-*`
ids from person names, dropping the user into the scripted universe.
A second scripted responder (`planFromLocalConfirm`, graphSurfaceInterop)
painted fabricated "Done. … is on your Graph." replies in Center —
including on send failure. **Fix:** both responders deleted; send path has
exactly one authenticated network path; open-person resolves only to real
backend conversations; the seed flag now provisions REAL backend
users/conversations/plans via the existing server-gated seed endpoints
and then changes nothing. **Proof:** `seedKillGuard.test.ts` (15),
`openPersonChat.test.ts` adversarial matrix (11),
`OpalCenterChat.planSurface.test.tsx` (2, mocked client boundary).

## F17-02 — Clock-dependent test failures (3 named + sweep)
Quiet-hours gates read the real wall clock; ColdStart, Phase23 inbox
fanout, and celebration-milestone tests (plus 5 more swept) failed only
in the 22:00–08:00 Pacific window. **Fix:** every wall-clock read on the
notification/quiet-hours path routed through the existing injectable
`SocialFlow.Clock` (freeze > app env > `OPAL_CLOCK_OVERRIDE` > real);
tests pin explicit scenario times; `quiet_hours_clock_test.exs` (5)
proves gate semantics under pinned clocks. Production behavior with
nothing set is byte-identical. **Proof:** full suite 0 failures unpinned
and pinned to 02:00 LA and 14:00 LA (see TEST_REPORT.md).

## F17-03 — Add Story composer behind the Home screen
The composer rendered inline inside the `.app` member shell, so its
z-index competed only within that stacking context and Home surfaces
painted over it. **Fix:** `StoryCreateFlow` renders through
`createPortal(..., document.body)` with `data-top-layer="portal-body"`.
**Proof:** repair17UiIntegrity tests assert the node is a direct child of
document.body, outside any app shell.

## F17-04 — Chat-list pill text overflow ("coast" outside its pill)
`.chats-plan-pill` was `inline-flex`; its bare text label was an
anonymous flex item that ellipsis can never truncate, and `flex-shrink: 0`
defeated the max-width. **Fix:** label in a real truncating span; pill
`flex: 0 1 auto; min-width: 0`. Same-class audit covered connection
labels, unread badge, Calls-surface labels.

## F17-05 — Chat-list status color diverged from thread
Two causes: four hand-rolled `planSurfaceState` derivations, and a
missing projection field — `HomeProjection` did not project who proposed
a pending change, so the list mapped every pending change to "forming"
(violet) while the thread showed "action" (red #FF4D5E). **Fix:** backend
projects `pending_proposal_by_user_id` (+2 ExUnit tests); one derivation
`planProjectionSurfaceState` now feeds list, Graphs, and thread; colors
resolve via the canonical `planStateColors` tokens (action #FF4D5E,
ready #FFC86B, past white, forming #8B5CF6, happening #00E5FF).

## F17-06 — Composer chevron, text clash, ghost card
(a) The stray "›" inside the composer was the voice button's idle text
glyph — replaced with an SVG mic icon; a test asserts the glyph exists
nowhere in OpalApp.tsx. (b) Typed text ran under the voice button —
composer input padding corrected. (c) The NEXT TOGETHER/alignment card
was `rgba(11,18,38,0.94)` sticky-docked over bubbles — now fully opaque.

## F17-07 — Change-time two-party flow (Chanelle / Juniper & Ivy)
Five compounding defects (full detail in TRACK_W4_FLOWS.md item 1):
the change-time regex required the clock immediately after the verb, so
"change the time for Juniper and Ivy at 8pm" matched nothing; "confirm
8 PM" matched no confirm pattern; "8pm" normalized to "8: PM"; the
executor's active-plan ordering diverged from alignment's, so change and
confirm could land on different rows; non-lead changes dead-ended with
no revision fallback; pending revisions were invisible to projections,
so surfaces kept claiming "Sat 7:30 PM is locked". **Fix:** patterns and
normalization corrected; single active-plan ordering; non-lead changes
fall back to a real revision proposal with truthful copy ("Proposing
8:00 PM — … It stays at <current> until they confirm."); confirm copy
reads the mutated row; pending revisions are surfaced in alignment and
`sync_for_user` (`pending_revision`, `superseded_by_pending_revision`),
so no surface can present the old time as locked truth while a proposal
is outstanding. **Proof:** two-user distinct-session flow in
`repair17_w4_flows_test.exs` — proposal row created, plan unchanged until
the other party confirms, then plan + all projections read 8:00 PM;
Maya-style lead direct-change regression retained.

## F17-08 — Center continuity: Opal's own question not consumed
No component recorded that Opal had asked a question; the category
question ("food, outdoors, or nightlife?") was never stored, so the
answer "Food" was classified fresh and the sticky re-engagement guard
fired ("You mentioned Maya earlier…"). **Fix:** outstanding-question
state in the persisted planning context; asking branches record their
question; an answer turn is routed to the in-flow answer handler ahead
of the sticky guard, provider search, and templates. **Proof:** the
founder's exact sequence is a regression test (Maya birthday → category
question → "Food" → flow continues, no re-engagement line).

## F17-09 — Stale resurrection ("Done. nighthawk with Maya is set up")
`OpalIntent.pending_plan_create/1` walked ALL history newest-first, so a
bare "Yes" could bind to a plan ask from an earlier derailed flow.
**Fix:** an intervening non-confirm opal turn closes the ask; a bare yes
can no longer resurrect it (failed-confirm retry law preserved).
**Proof:** derailment-sequence test creates no plan and no "is set up"
copy.

## F17-10 — Date-night request answered as an update
The when-correction branch fired for any turn with a time while a sticky
plan_id was fresh, so a NEW "Schedule a date night…" request got
"Updated — tonight · 5 PM. Same plan, same people." **Fix:** the branch
now excludes new-plan requests (create verb, no change verb); new
requests run plan_create and `PlanCompletion.drive` on a NEW plan row.
**Proof:** founder's exact text with a fresh sticky plan: old plan
unchanged, new plan created with completion steps persisted.

## F17-11 — Fuzzy named-venue search blocked ("Dave & Busters near me")
"Let's do X near me" matched no venue pattern; plan_create ran before
named-venue and parked the turn at the location gate, which asked the
category question. **Fix:** let's-do/go-to venue extraction (near-me
flag, no locality required), plan_create defers to named-venue for that
shape, restaurant-search readiness accepts exact + near_me, fuzzy name
normalization ("Dave & Busters" ≡ "Dave & Buster's"), and honest
by-name copy when ranking by distance is impossible. **Proof:** unit +
end-to-end Center tests assert an `exact_entity` places-search job with
the requested name and no category question.

## F17-12 — Center header strip rendered fixtures ("3:30 / 7:30")
`CalendarController.today` returned only linked-calendar events (empty
when unlinked); the web layer fell back to hardcoded sample data.
**Fix:** new `Center.NowStrip` projects the user's real plans for today
from the single plan store (registered in the PlanProjection registry);
the API always answers from live plan state; the web strip renders
calendar events → real plans → honest empty state ("Nothing on your
day yet."). **Proof:** NowStrip + controller tests; web strip tests incl.
empty state.

## F17-13 — No Opal chat sessions (new / clear / list)
Backend was one-conversation-per-user (unique index); "new chat" deleted
messages on the same row. **Fix:** additive migration (`archived_at` +
partial unique index = exactly one active session per user);
`start_new_chat` archives and retains; list/switch/clear-by-id are
owner-scoped with cross-account 404s. Web: sessions drawer (New chat /
All chats / Clear this chat) with server-first clear and honest failure
copy; surface renamed "Opal chat center" (labels only). Integration
reconciled the web client to the real routes (see TEST_REPORT).
**Proof:** context + HTTP tests incl. cross-account probes
(`repair17_w4_api_test.exs`, extended at integration with the
last-message-preview contract); `opalChatSessions.test.tsx` (14).

## F17-14 — Splash 1 carried no canon logo text
Both web splash-1 paths painted only the character-sheet crop (with
stray text fragments at its edges) and no logo text. **Fix:** both paint
the single canon lockup `opal-logo` (character + "Opal" letterforms).
Splash-2 law pinned by test: zero "Enter Opal" on Splash 1; exactly one
live "Enter Opal" + one "I already have an account" on the Promise page.
Native splash was already canon (icon md5-identical to shots/brand).

## F17-15 — Center character read as static; presence states could stick
The living-character machine existed but idle motion was imperceptible
(1.5% scale), thinking moved only a border, composer/rest mics were not
wired to the character, provider work after the first reply showed as
idle, and three reducer paths could pin listening/processing forever.
**Fix:** presence quartet (idle/listening/thinking/responding) purely
derived from real signals (`opalPresence.ts`); mic unwinding repaired;
calm perceptible motion; `prefers-reduced-motion` coverage. **Proof:**
`opalPresence.test.tsx` (20) incl. a fuzz proving taps/timers cannot
manufacture a state. Remaining asset work (per-state poses, Lottie/sprite
decision) is an art task documented in TRACK_W6_CHARACTER.md §3.

## F17-16 — Mobile TestFlight blockers (repo-side)
`expo-notifications` was not statically declared in app.json (the
long-standing mobile failure); no EAS `testflight` profile existed.
**Fix:** static declaration (per-profile effective config proven
identical), `testflight` profile added; mobile suite 105/105.
`TESTFLIGHT_STEPS.md` documents the API base-URL strategy and the
founder-only steps; the 503-suspended prod host is the first blocker
and is founder-only (see Blocked).

## Filed open (evidence-backed, not half-fixed)
- **Seed-gated Home display fixtures** (`FOUNDER_HOME_FEED`,
  `FOUNDER_LIVE_FEED`, `FOUNDER_STORIES`, calls-continuity rows, trip
  seed data): display DATA under the founder-seed flag only. After
  F17-01 they cannot mint, open, send, or answer anything — every
  interactive path is real — but the rows themselves are still painted
  fixtures rather than backend-seeded data. Flagged by both W2 and W5.
- **CelebrationReminderWorker** counts a budget-denied reminder as sent
  (found by W1; policy-adjacent, not redesigned this cycle).
- **YOU "QR" button** routes to Linked devices, where QR itself is
  blocked; kept because a founder protect-list test asserts its presence
  — needs a founder call.
- **Metrics day semantics:** Metrics now reads the shared Clock's day
  (was silently zeroing counts across the UTC/local date line); deeper
  local-vs-UTC aggregation semantics flagged in TRACK_W1_CLOCK.md.
- **Thread header strip** still reads live `alignment` for
  reservation-approval state the projection does not carry (W3); its
  change-proposal term is now identical in shape and source plan state.
