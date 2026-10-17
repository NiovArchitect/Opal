# Repair #16 — FAILURE LEDGER (F16-*)

Founder order: "Fix everything you can except for video." Source list: Repair #15
BLOCKED items B2–B6 (shots/repair15/FAILURE_LEDGER.md), proactivity proposals
P1–P5 (shots/repair15/PROACTIVITY.md), onboarding deferred items
(shots/repair15/ONBOARDING_AUDIT.md), and Repair #14 filed-open items
(shots/repair14/HARDCODE_AUDIT.md). Branch `muse/repair-16` on Repair #15 tip
`0abf24a4`. Video (B1) untouched by design — honest refusal stands.

## Fixed — durable graph-create (B3)

- **F16-01 · Non-post GraphCreateFlow completions were write-only.** "Add to
  graph", Repeat, and plan-from-chat drafts landed in the never-read
  `createdGraphs` React state and vanished on navigation/re-login — the same
  disease as R15's Post bug, left behind because wiring drafts to post
  publishing would have been wrong. FIXED: drafts are now durable SharedPlans
  via the same authority Center uses (`SocialFlow.create_plan_from_graph_create/2`
  behind additive `POST /api/v1/product/opal/plans/graph-create`), read back
  through the owner-scoped plan readers, with server-side idempotency
  (`alignment["graph_create_key"]` — replay returns the existing plan).
  `createdGraphs` state deleted entirely.
- **F16-02 · The Graphs tab had no durable-plans caller.** `GET /opal/plans`
  existed with zero web callers, so durable plans could not render where
  graph-create lands the user. FIXED: web caller added; durable plan cards
  merged into the Graphs live list, deduped against chat projections,
  cancelled plans dropped. No optimistic local copy.
- **F16-03 · Graph mode prefilled fiction.** Graph-mode title/caption/when
  defaulted to "Beach at sunset" / "Golden hour at Moonlight. Needed this." /
  "Saturday · around 6:00 PM" (the R15 E9 disease in graph clothing). FIXED:
  only real host context prefills; otherwise blank.
- **F16-04 · `get_plan_for_user/2` crashed on junk ids** (`Ecto.Query.CastError`
  → 500-class crash on a guessable-input path). FIXED: returns `:not_found`.
  Found by W1's adversarial pass; contract unchanged for valid inputs.

## Fixed — onboarding (B4)

- **F16-05 · fr06 "Skip for now" was a dead control for every real user.** The
  button rendered unconditionally; on non-seed builds its only effect was the
  message "Phone verification is required to continue." FIXED: the affordance
  renders only on founder-seed builds, where it performs a real fixture
  challenge+verify; the dead branch is deleted; fr06 now carries a plain line
  explaining the phone number is the account key and there is no guest
  sign-in. (Decision D1/D-C2: an unverified session would be fake auth — no
  guest session constructor exists anywhere in the session model.)
- **F16-06 · fr08/fr09/fr10: unreachable screens duplicating live asks.**
  Profile (fr08) duplicated Meet Opal's name/handle ask and carried a photo
  affordance promising a durable upload that does not exist; Assist (fr09)
  and act-on-behalf (fr10) duplicated each other and the Repair #13 settings
  gates. FIXED: removed cleanly — render blocks, route-order entries, step
  plumbing, fr08-only helpers, and the orphaned `ActOnBehalfOptInStep`
  component. Every internal `setStep` into the removed range was traced:
  the two live ones (seed skip, verify fallback) rerouted to the parent
  handoff / verified-completion; persisted resume state pointing at removed
  steps is sanitized to fr06 by `lawfulResumeStep()`, never a blank screen.
- **F16-07 · `ActivationFlow.tsx` orphan.** Zero importers in src; a duplicate
  of the real first-run flow. FIXED: deleted (its R15 OTP-parity test block
  removed with it; the fr07 contract tests remain).
- **F16-08 · PermissionBootstrap Continue was gated on all three rows.**
  Front-loaded three decisions before any payoff, against the progressive
  law. FIXED: Continue enabled from the start; undecided rows persist as
  `"skipped"`; a row persists as granted only after a real grant result —
  never by default, never by Continue.
- **F16-09 · Native fallback copy was developer-toned** ("No founder seed. No
  synthetic shortcut on production SMS.", raw provider diagnostic). FIXED:
  plain user copy; zero behavior change.

## Fixed — progressive profile surface (B6)

- **F16-10 · ProfileGap mechanism had no endpoints and no live rendering.**
  The R15 ask-ledger could never fire in a real flow. FIXED: additive
  endpoints (`POST /api/v1/product/profile-gaps/{assess,answer,skip}`, owner
  always from the session bearer, fail-closed person validation) and the
  in-flow ask surface inside Opal Center chat — the live birthday-planning
  flow (the celebrations surface's "Plan this" itself routes into Center).
  Non-blocking (`blocking=false`), dismissible, skip permanent; `known` and
  `proceed_without` render nothing. Dismiss makes no API call and is not a
  skip (decision D-W3-4).

## Fixed — proactivity (B5 / P1–P5)

- **F16-11 · P2: chat-born plans never ran PlanCompletion.** A plan locked
  entirely in chat got no calendar projection, restaurant discovery, TFT
  loop, or coming-up row. FIXED: post-sync `drive/3` hook at both chat lock
  endpoints (`confirm_alignment`, `confirm_alignment_place`), strictly after
  the sync transaction commits — never inside the fold/projection.
- **F16-12 · P3: `ProductShell.record_recent_change/1` had zero producers.**
  Home's "recent changes" was permanently empty. FIXED: producer
  (`PlanRecentChanges`) hooked at the mutation functions post-commit —
  revision accepted, lead edit, journey material change, schedule change,
  direct cancel. Rejects, partial approvals, and non-material writes record
  nothing; copy is keyed to the change that actually happened.
- **F16-13 · P4: TFT kinds `waiting_on` / `open_question` / `execution` had
  zero producers.** FIXED, each from an explicit structured action only:
  `waiting_on` ← commitment confirmation (refused when no deadline exists);
  `open_question` ← revision proposals (one loop per required approver);
  `execution` ← reservation-execution status writes (cancelled/expired
  cancels the loop even after completion — the record must not claim a
  booking that no longer exists). Chat text registers nothing.
- **F16-14 · P5: celebration preparation stopped at a reminder.** FIXED
  pull-side: the celebration read path (`CelebrationCuration.curate_for/2`)
  now returns deterministic preparation (days-until band; full mode grounds
  one action in a real past plan with that person). No push, no notification,
  no Attention Center item; reads write nothing; non-owners get `:not_found`.
- **F16-15 · P1: ProactiveConversation had zero production callers.** FIXED
  in consent-gated form: a temporal-anchor caller in `PlanCompletion.drive/3`
  behind a new additive opt-in `users.proactive_threads_enabled` defaulting
  to **false** — zero behavior change until a user opts in. No existing
  setting covered proactive thread initiation (act-on-behalf covers provider
  actions; `proactive_opt_out` is an opt-out, not consent). All
  `maybe_initiate/5` laws preserved; opt-out dominates when both are set.
- **F16-16 · `proactive_opt_out` silently never landed.** `set_opt_out/2`
  used a schemaless `update_all` on `"users"` whose binary_id column could
  not bind, so user opt-outs were discarded without error. FIXED: schema-bound
  update, same as the new setter. Found during P1 consent investigation.

## Fixed — sweep (B2 + dead code)

- **F16-17 · B2: story media lived as inline `data:` URLs in DB rows.**
  No authorization boundary, LOCAL_DEV-grade rows. FIXED on the existing
  media store (no CDN, no new service): image captures upload via the
  existing media endpoint; the story stores `media:<id>`; create validates
  the media exists, is author-owned, live, and an image; byte serving gained
  a story path — `story_media_authorized?/3` requires a live story whose
  author owns the media and whose audience (`eligible?/2`, evaluated live per
  request) includes the viewer. Legacy `data:`/`https:` refs pass through
  untouched and keep rendering. Video story refs unchanged (out of scope).
- **F16-18 · `DatedConversationContent.tsx` dead component** (filed R14).
  Zero importers. FIXED: deleted, with the two tests that existed only for
  it; dated assertions stripped from one mixed test, all other assertions
  kept. Its inert `.dated-*` CSS remains in the shared stylesheet (noted,
  same disposition as W2's fr08–fr10 selectors: shared-file risk outweighs
  the cleanup).

## Integration find (coordinator)

- **F16-19 · `ProfileGapController` contained invalid Elixir syntax**
  (`[flow: "..." | base_opts]` — a keyword pair before the cons operator is
  a misplaced-operator compile error, two call sites). W3's branch had
  reported green runs, but its environment suffered VM corruption mid-track
  (dead beams, OOM kills) and its final numbers were produced against stale
  beams; the defect reached integration undetected by the worker. FIXED at
  integration (mechanical: `[{:flow, "..."} | base_opts]`, semantics
  unchanged) and the endpoint suite re-verified for real on the merged tree
  (38 tests, 0 failures). This is why every R16 gate below was re-run by
  the coordinator on the merged tree rather than inherited from worker
  reports.

## Assessed, deliberately not changed

- **Seed-keyed call-continuity literals** (filed R14): fixtures inside the
  founder-seed wiring, gated behind `isFounderSeedEnabled()` and never
  served to real users. Parameterizing/removing them would break the
  founder's phone-walk harness (`opal_founder_seed=1`). Disposition:
  dev-harness fixtures by design; left untouched (W5 assessment).
- **First-run "Sadeil" illustration persona** (filed R14): design-frozen
  asset decision. Left, per instructions.
- **Legacy fr01–fr05 demo blocks**: fr01 provably dead (`{false && …}`);
  fr02–fr05 unreachable on any production path but carry extensive
  source-assertion tests and founder demo copy. Left + noted (W2 D3) —
  removal is a copy/demo decision, not a correctness one.
- **P5 push variant** (preparation placed in the Attention Center): the
  consent question from R15 remains the founder's; pull-side shipped,
  push not built.
- **P1 activation**: the caller is live behind the opt-in; whether any user
  ever enables `proactive_threads_enabled` is a product/user choice, not
  code still owed.

## Still blocked (unchanged, stated precisely)

- **B1 · Video** (posts and stories): media store is image-only / LOCAL_DEV,
  no CDN. Honest refusal stands in both flows. Unblocking = a media-service
  decision (founder/infra) — explicitly excluded from this repair by the
  founder's order.
- **B2 remainder**: story media now sits on the media store with story-scoped
  authorization, but the store itself remains LOCAL_DEV (no CDN, no
  moderation pipeline) — that half still ships with the media-service
  decision above.
- Founder phone walk on this tip: NOT_CLAIMED. `FOUNDER_ACCEPTED = NO`,
  `FREEZE = HOLD`, `PASS2 = NO` — unchanged.
