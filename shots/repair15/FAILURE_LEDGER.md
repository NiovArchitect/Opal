# Repair #15 — FAILURE LEDGER (F15-*)

Branch: `muse/repair-15` · Base: Repair #14 tip `025a0289` · Date: 2026-10-16
Coordinator-verified on the integrated tree: backend **2,713 tests / 0 failures**
(2,655 baseline + 58 new); web **1,116 tests, 25 failures — name-identical to the
baseline set** (zero new); mobile **105 tests, 1 pre-existing failure** (unchanged).

## Fixed — onboarding (Track A)

- **F15-01 · Verification code could not be autofilled (founder-reported).**
  The OTP input on the surface the founder actually uses (web fr07 inside the
  native WKWebView shell) carried the correct attributes but was an INVISIBLE
  overlay (`opacity:0` bridge input mirroring six decorative span cells).
  WebKit never offers the Messages one-time-code suggestion for a hidden input.
  FIXED: the code input is now the visible field; bridge class deleted;
  native screen gained `autoComplete="sms-otp"`. Locked by 8 web + 3 mobile
  tests. Device proof = founder phone walk (not claimed).

## Fixed — story / post (Track E; full detail in STORY_POST_REPORT.md)

- **F15-02 · Close-circle stories reached NOBODY.** `close_circle` is the
  default audience; eligibility was literally `author == viewer`. FIXED:
  eligibility follows Lives law (mutual establishment + explicit close type).
- **F15-03 · `ttl_hours` crashed (string → 500) or lied (non-positive →
  born-expired "success").** FIXED: parsed, 1..72h enforced, nothing persists
  on rejection.
- **F15-04 · Real story media silently dropped.** The viewer kept only
  `/`-prefixed refs; every real capture is a `data:` URL, so stories rendered
  with no media. FIXED: `/`, `data:`, `https:` renderable; junk schemes rejected.
- **F15-05 · Fake success on story share.** UI announced "shared" and closed
  before the backend answered. FIXED: async; closes only on resolve; failure
  keeps the draft with an honest error.
- **F15-06 · No caption in the story flow** (schema + viewer supported it; the
  create flow never collected or passed it). FIXED end to end.
- **F15-07 · A created story was invisible until re-login** (Home hydration
  ran only on auth change). FIXED: post-create refresh reads the same backend
  state as every other surface; no optimistic local copy.
- **F15-08 · "Post" NEVER persisted (the post bug).** The Home Post flow wrote
  to write-only React state (`createdGraphs`, never read anywhere); the
  durable backend existed with zero web callers. FIXED end to end: media
  upload client → publish → Home read-back; real audience selector limited to
  visibilities the backend actually enforces.
- **F15-09 · Publish accepted ANY media ids** — nonexistent ids persisted, and
  ids owned by ANOTHER user persisted (their bytes then served to your
  audience). FIXED: existence + ownership + not-deleted validated at publish.
- **F15-10 · Empty posts persisted; the post form was prefilled with fiction**
  ("Beach at sunset" / "Golden hour at Moonlight. Needed this."). FIXED:
  backend rejects empty posts; post mode starts blank.

## Fixed — backend coherence (Tracks G/H; detail in CANONICAL_VENUE.md, PROACTIVITY.md)

- **F15-11 · Place-lock semantics gated on 3 hardcoded restaurants**
  ("Juniper & Ivy", "Herb & Wood", "Fort Oak"). A place now locks because
  participants confirmed it and a real pipeline produced it: catalog
  recognition moved to `CandidateProvider.catalog_match/1`, generic
  capitalized-phrase extraction after proposal cues, `nominate_place/3`
  resolves in authority order. Side-effect bug found and fixed: venues the
  UI offered (Bird Rock Coffee, Torrey Pines, Meditation Gardens) were
  un-lockable at the endpoint; locked non-catalog places silently vanished
  on resync. 21 regression tests cover all 6 former call sites.
- **F15-12 · Two proactive mechanisms had ZERO production producers**
  (test-only callers): temporal follow-through registration and coming-up
  Home projection. FIXED: both wired into the existing
  `PlanCompletion.drive/3` pipeline (consent = the plan the user already
  made; no notifications, no outbound contact, no new consent surface).

## Fixed — settings / social (Track D/F; detail in SETTINGS_MAP.md, SOCIAL_DIRECTION.md)

- **F15-13 · Home ranking carried an engagement term** flatly contradicting
  the founder's social direction (Moments anchored to plans/people/places,
  not attention). REMOVED, with guard tests so it cannot quietly return.
- **F15-14 · No connected-sources status in settings.** Calendar / contacts /
  location connection state now surfaces in YOU settings, wired to real
  backend state (13 tests). Every other control audited to the R13 standard:
  real or hidden.

## Implemented — founder design (Tracks B/C; detail in FAMILY_TAXONOMY.md, PROGRESSIVE_PROFILE.md)

- **F15-15 · Family was one flat type.** Family SUBTYPE dimension added
  (parent, child, sibling, grandparent, aunt_uncle, cousin, niece_nephew,
  co_parent) under the existing 7-type enum — additive migration, changeset
  fails closed. Coordination proven IDENTICAL across all subtypes (R14
  lifecycle yields one identical summary); tone/lead-time/nudge dials wired
  into the one existing Behavior engine. Minors: `family_minor` flag denies
  adult-pattern nudges, planning help never gated — linked to the existing
  SocialFlow.Family guardian law, not duplicated.
- **F15-16 · Profile facts were all-or-nothing at onboarding.** Progressive
  profile-building shipped as a general mechanism (`ProfileGap` + durable
  `profile_gap_asks` ledger): a flow missing a fact asks ONCE, in-context,
  non-blocking, dismissible; the answer lands through the real
  MemoryAdmission → MemoryStore path plus the durable Celebrations row;
  skip is permanent; known facts are used silently. Birthdays are the first
  wired fact. (Front-end rendering of the ask inside a live flow = follow-up
  integration step; no fake surface was built.)

## BLOCKED / founder decisions (not faked, not half-fixed)

- **B1 · Video posts and video stories.** Backend media store is image-only
  (LOCAL_DEV, no CDN; `media_status` honestly reports video as
  PARTIAL_FUTURE). Post flow refuses video honestly. Unblocking = a real
  media-service/CDN decision (founder/infra).
- **B2 · Story media storage is inline `data:` URLs** in the DB row
  (LOCAL_DEV-grade: works for the full audience, no moderation pipeline).
  Real fix ships with B1's media decision.
- **B3 · Non-post GraphCreateFlow completions** ("Add to graph", Repeat,
  plan-from-chat) still land in the same write-only `createdGraphs` state —
  graph drafts are not durable either. Needs its own durable graph-create
  endpoint decision; wiring it to post publishing would be wrong.
- **B4 · Onboarding deferred items** (ONBOARDING_AUDIT.md): PermissionBootstrap
  Continue gating, fr06 "Skip for now" dead on non-seed builds, unreachable
  fr08–fr10 with restore risks, orphaned ActivationFlow (route-or-delete) —
  founder product calls, inventoried, untouched.
- **B5 · Proactivity proposals P1–P5** (PROACTIVITY.md): wiring
  ProactiveConversation = new outbound contact (out of scope); chat-born
  plans don't run PlanCompletion; celebration preparation — each documented
  with its consent question for the founder.
- **B6 · Track C front-end surface** for the in-flow ask (see F15-16).
- Founder phone walk on this tip: NOT_CLAIMED. `FOUNDER_ACCEPTED = NO`,
  `FREEZE = HOLD`, `PASS2 = NO` — unchanged.
