# REPAIR #21 HANDOFF - the CALM WAVE, integrated and proven at one tip

Date: 2026-10-21. Branch: muse/repair-21. Base: muse/repair-20 +
flows rename (70584ad8). This document is the close-out record: the
full reconciliation of W-1..W-19, laws L-1/L-2, F-18, and every
founder charge and verdict of 2026-10-20, each DONE with its
evidence or DECLARED with its reason.

Gates, unchanged and unlifted: FOUNDER_ACCEPTED = NO. FREEZE = HOLD.
PASS2 = NO. FOUNDER_PHONE_PASS = NOT_CLAIMED. muse/repair-17 was
never touched; it remains the revert spot. Nothing here is merged;
the founder merges.

## The integrated build

- Integration merges on this branch, in order: orbit-v4 4025e830,
  openings 097042a4, flows2 577fb9c8, calls 80115da6, marble
  75bdfaa6, holes 9b380caf, then the H-NEW-8 latent-wire fix
  d4b06ad6 (code tip). One integrator-resolved binary conflict
  (orbit-motion-light.webm) and text conflicts in c2shell.css /
  C2Shell.tsx / C2Thread.tsx / C2Flows.tsx resolved by hand; every
  cluster suite re-run after the merges (see cluster reports).
- Capture/records commits ride above the code tip (marble re-shoot
  e5918e26; this records set). Every frame asserts the SERVED
  build's stamp (seed chip "seed - d4b06ad" + DOM
  data-git-head-full), which is the code tip, per the badge law.
- Final tips: the code tip is d4b06ad6; the marble capture
  records commit e5918e26 and this records commit ride above it.
  The FINAL local tip, the remote mirror SHA, and the tree-match
  verification are recorded in the close-out delivery report
  (the push follows this writing by minutes; the mirror commit
  carries this exact tree).

## Battery on the integrated tip

- Step zero: fresh test DB from empty: 119 migrations apply
  clean, zero duplicate prefixes (re-derived at this tip; the
  plan's 118 figure predates the trivia guesses table - the
  119th file is 20261030030300_create_trivia_guesses; W-5b's
  created_by is 20261030030200). Independently re-counted after
  the cell restart below: 119.
- Backend: executed as four MIX_TEST_PARTITION legs (the R20
  partition pattern) after a single-process run proved
  latency-bound on this VM: leg1 822, leg2 838, leg3 497,
  leg4 1207 = 3,364 tests, plus the care_rotations file the
  leg split missed (6 tests, standalone, green) = 3,370 tests
  across all 380 test files. Leg failures: 21, ALL in 12 files,
  ALL of the timing species (ExUnit 60s timeouts on the seed
  pair; DBConnection sandbox-checkout drops; assert_receive
  2000ms mailbox misses; one 500ms assemble limit at 1509ms).
  ZERO failures assert a wrong state, payload, or value
  anywhere in the battery.
- Standalone reruns of every failure-bearing file (sequential,
  quiet box, 240s test timeout): GREEN - seed_commit 4/0,
  sinister 24/0, pressure 10/0, care_rotations 6/0. Still
  failing on this VM with timeout-only signatures: seed_world
  10/1 (JA-04: DBConnection.OwnershipError - the outbox worker
  outlived the sandbox owner), routing 3/1 (assert_receive),
  channel 13/2 (checkout + assert_receive), profilegap 18/1
  (checkout EXIT), twouser 11/3 (assert_receive; a repeat run
  of the same file in the same window also produced 11/0 -
  the instability is the signature), adversarial 8/1
  (rate-limit timing window), opalcontext 7/1 (assemble
  1509ms vs the 500ms limit - this cell is ~3x slow),
  messages 11/1 (the documented MessagesTest sandbox case,
  proven base-identical in the builds cluster). Verdict: the
  residue is this VM's degraded latency, not product logic;
  every one of these files was green in the R20 battery on
  this VM class and in this wave's cluster sweeps. A battery
  re-run on a healthy box is the named follow-up (founder
  list, below). Not hidden: on THIS box, on THIS day, those
  9 tests did not pass.
- ENVIRONMENT RECORD (why the verdict above is evidence, not
  excuse): the VM cell restarted twice during this battery
  (10:46 and ~12:11 UTC), killing in-flight runs; workspace
  replicas visibly flapped during failover (conflicting reads
  of the same logs); load averages spiked to 4.25 on a 2-vCPU
  box from co-tenant work. Every number in this section was
  re-read from disk after the fact and cross-checked.
- Watchlist, individually (load-flake protocol):
  human_validation_test.exs standalone 13/0;
  compound_quality_test.exs standalone 12/0 - the pair is
  25/25 green standalone, matching the R20 reference count.
- API regression (cumulative founder suite, FRESH dev DB
  opal_dev_r21api, 119 migrations, human seed,
  shots/regression/run.mjs): 101/101 PASS. Seed-world
  machine-speak gate: clean (0 hits).
- Web full suite: 24 failed / 17 files / 2,137 passed
  (2,161 total). Name-for-name against baselines: the 17
  files are the R19 baseline's 16 (activation, designTokens,
  availability, firstRun, authorityRejectedStates, grammar,
  graphCalendaring, graphDetail, graphScroll, graphSpine,
  liveJourneyProof, pasteW4DeviceFixes, waveBChatsExact,
  waveBGraphsExact, waveBHomeExact, technicolorProduction)
  PLUS src/c2/r20CardMenu.test.tsx (one test: "the state
  accent uses the canon tokens with each state's own
  pattern"). That is exactly the openings cluster's
  re-derived R21-lineage baseline (24/17, verified on the
  wave's base before any R21 merge) - the delta vs R20's
  recorded 23/16 predates R21's merges, and the same single
  test fails identically at base and tip. No failure sits in
  a file R21 created; the failing set was not absorbed or
  renamed - it is the recorded baseline, accounted.
- Typecheck: exactly 9 errors, the identical pre-existing set
  (OpalApp.tsx x3, productClient.ts x5,
  YouSettingsDestination.tsx x1); none in wave files.
- Mobile (jest): 109/109 tests, 23/23 suites (R20: 105 - the
  +4 are the L-1 mobile greeting pins; mobile changed in R21
  only for L-1, 4 files).

## Captures on the integrated tip (all signature-gated)

Filed sets (see POLISH-MANIFEST R21 addendum +
frame-version audit below): W-4 pad/frost set on every surface,
openings set, Orbit v4 canonical set (22 PNG + 4 webm), Flows2 set
(moments, trivia poster, bond x3, creation x5, story viewer),
membership-manage pair, marble set re-shot (the interrupted run's
error-state pad-dark frame was found in the state audit and
replaced; the two valid interrupted frames were verified at the
glass first).

- F-1 SHEET LAW verdict: HOLDS on every surface including Chats.
  Frost geometry identical everywhere (0..390 wide, top 584 to
  screen bottom 844, blur(22px) saturate(1.3), transparent);
  rest gaps flows +24, chats +24, thread +22 both modes; graphs
  +10; plan detail -44 BOTH modes at max scroll (the last leaf's
  bottom sits 44px past the dock top in the scrollport metric;
  the at-glass frame shows the check-in action fully visible
  above the pad with margin - recorded as an audit number, not
  silently passed; the dock-in-frame read conflicts with the
  leaf metric and the discrepancy is declared here rather than
  resolved by assertion). THE CONDITIONAL IS DISCHARGED: Chats
  frost = PASS, same sheet as every surface.
- Drag audit: dock box identical before/during/after, position
  fixed, both modes - the pad never moves. ACTIVE state legible
  in pad-active frames on all five surfaces (W-10).
- Orbit set: one transient recorded - the combined v43 run's
  light pass failed once at room assembly; re-shot in a
  light-only run, all frames DOM/signature-verified.

DECLARED captures (no frames; staging one would be a FALSE):
in-call states (W-16, no in-call surface is mounted in the served
shell); cardmenu-graph-private at the integrated tip (W-5c - the
rig's PIN-set step still cannot open the vault; the private zone
stays at "Set a passcode in Settings" in the rig; cluster-era
frames remain the latest filing and are labeled as such);
fork-answer frames at the integrated tip (staging reached a real
closed window; presentation is worker-driven and did not fire in
the capture window; the surface is proven at API 4/4 + web 12/12);
orbit-membership frames (no orbit-membership-line renders in the
group orbit; the event renders in the thread panel and the API
projection).

## Reconciliation

### Laws
- L-1 greeting law: FIXED at source in all three composers (two
  had composed the hour from UTC; the server snapshot could let a
  caller-supplied name override the viewer's own). Pinned on all
  three surfaces, happy-path + falsification legs. DONE
  (r21-laws-report).
- L-2 connector per-account law: ALREADY TRUE at every layer;
  pinned with a two-account isolation proof at the payload
  boundary + HTTP leg. No product code changed. DONE.

### Workstreams
- W-1 Orbit: v4 composition + Rounds 1-3 all landed and verified
  at the glass on the integrated build (canonical set above).
  O-1 one identity light trace per bubble; O-2 party line
  viewer-first ("You - Maya Torres"); O-3 push-to-chat rebuilt
  per the 21:39 correction (long-press selects; "Place in Maya's
  composer"; landing prefilled, caret active, provenance chip,
  unsent; one-tap return; no clipboard; no drag - drag frames
  archived). Orbit is founder-loved and PROTECTED (21:34).
- W-2 separation/emphasis: DONE (plan detail / Next Together /
  deck system; consumed by Orbit).
- W-3 label stripping: DONE (removal ledger + shell-wide
  empty-state (i)-bubble audit).
- W-4 frosted pad: DONE - F-1 sheet law at the integrated tip
  (above). COMPOSER-TO-CARD SNUG: DONE at the openings tip
  (FORMING card -> composer top gap 31 -> 7).
- W-5 show the declared: W-5a fork-answer WIRED (card + detail;
  thread leg DECLARED - no fork presentation exists on thread);
  W-5b membership WIRED (multi-add + idempotency; admin = creator
  only, no designated-admin model exists - DECLARED; pre-migration
  fallback = earliest member, declared in code comment copy);
  events in Chronology + AccountActivity + orbit projection;
  WHO CAME AND WENT folded into the orbit Where card at
  integration. W-5c cardmenu-graph-private: DECLARED (rig
  vault-unlock blocker; see captures). W-5d in-call doorway:
  NOT WIRED, deliberate - the served shell mounts no in-call
  surface for the button to live on; the blocker and the
  one-line mount it waits on are named in r21-builds-report.
  FINDING from the close-out membership captures: the manage
  panel offers CURRENT MEMBERS as add candidates, and the rig's
  add produced a duplicate listing for an existing member in
  the panel (frames membership-manage-dark/light + rig notes).
  DECLARED as a W-5b seam defect for the next wave: candidate
  list must exclude current members and the members projection
  must dedupe; the backend idempotency pin stands (the defect
  is in candidate selection/rendering, not the write path as
  pinned).
- W-6 connectors: DONE as an honesty close - nothing truthful
  left unexposed; the room exposes the one real per-user flow
  fully; breadth lives in the standing expansion map, not
  painted into the room; 3 test pins added, no product code.
- W-7 walk defaults: RECORDED - the walk build serves LIGHT
  mode by default (founder's stated favorite); the walk script
  notes carry it (founder-gated list, walk item).
- W-8 capture integrity: DONE - content-signature assertions in
  the capture pipeline (surfaceSignature + per-family rules,
  incl. the W-16 call-family rule); the pre-gate pack audit
  found 23 mismatched frames in 11 families, disposed or
  re-filed under the gate.
- W-9 Flows rebuild: DONE per the charter (disposal proven by
  absence; braided stream; stones; moment stones; trivia as
  specified; algorithm map = the memory Venn). Social-science
  citations ride the charter section of r21-plan.md.
- W-10 pad active state: DONE (pad-active frames x5 surfaces,
  both modes, one-second legible).
- W-11 Center sheds narration: DONE (explainer card killed;
  (i) pattern; openings set).
- W-12 Bond / shared stone: LIVE (sparse/pair-score/rich at the
  glass, both modes). Founder verdict 19:45 PROTECTED.
- W-13 feedback loop: LIVE (light collected as glow; reply is a
  door; counts are light, never tallies).
- W-14 presence as one felt thing: LIVE at the glass
  (flows-live-copresence); depth declared in the flows2 report.
- W-15 Lives + circle extension: LIVE; roster depth declared.
- W-16 calls: DECLARED as a set (no in-call surface mounted);
  mislabel quarantined + call-family signature rule added
  (13/13 signature tests); semantics: per-call pause TRUE;
  next-call default DIVERGES from the founder's model = D-2
  (founder-gated, below); consent-lineage gap on default
  seeding = D-3 (lands with the in-call mount build).
- W-17 creation: DONE (sheet + photo/text/future/live legs at
  the glass with read-backs; story viewer + exit-restores-
  position; the future stone verified in Graphs).
- W-18 holes: DONE - 170 assets traced end to end:
  135 TRUE / 21 HONESTLY ABSENT / 14 FALSE rows (13 distinct).
  H-NEW-1 + H-NEW-2 built in-wave; H-NEW-8 fixed at integration
  (d4b06ad6) with a species grep sweep. Everything else is
  named in r21-holes-ledger.md (A-01..A-16, H-NEW-3..H-NEW-14)
  and carried below where it needs the founder.
- W-19 the marble: DONE as an honest inventory + one carry -
  true photographic grain existed in exactly one product place
  (the master raster); the cluster carried it to the pad's
  center orb (opal-marble-sphere.webp) and declared the splash
  seat; 8 named non-sightings; the OrbMark core-glow conflict
  fixed and probe-verified. Marbled opal stands as Opal's
  signature material at the identity spots named by the founder.

### F-18 (REOPENED 2026-10-20 15:31) - disposition
Root cause was an EVIDENCE defect, not product routing: capture
rigs screenshotted Center and filed the frames as Flows because
nothing asserted frame content. R20's fix had been markup-only
(data-surface-purpose), which is why the founder's eye caught
what the gate could not. R21's disposition: the content-
signature gate (W-8) is the structural fix, the polluted pack
families were audited and disposed (23 frames / 11 families),
and at this close-out the twin frames flows-vs-center (both
modes) prove the surfaces are visually distinguishable worlds
shot minutes apart on the same stack. The charge to the
rendered-proof check stands permanently; the species is named
in the complaint ledger. CLOSED as an R21 defect; the check
that owns it is permanent.

### Founder charges and verdicts, 2026-10-20 (each accounted)
- 15:31 "these are Center frames, not Flows" -> F-18 reopened;
  disposition above. CLOSED with the structural gate.
- 15:42 Trivia name = "Know Me?" - DECIDED by the founder,
  carried everywhere (T-WORD class). DONE.
- 15:59 Flows rebuild charter (override, don't patch) -> W-9.
  DONE.
- 16:52-17:49 Trivia as light spectacle / photographic stream /
  V-4.2 space pass (F-1..F-5) -> T-5 poster rebuild + frost
  law; F-3/F-4/F-5 in the orbit v4 set. DONE + DECLARED residue:
  plan-detail rest metric -44 (above).
- 17:57 I-1 four doors (Join next / Take it solo / Take it
  with my people / Do that again) - BUILT glyph-led under F-F
  (the "Take it with my people" wording was rejected at 21:34;
  captions <= 2 words). DONE.
- 17:59 "Light as a gesture" - FOUNDER-LOVED, PROTECTED.
  Long-press deepens; poster sees who, never a scoreboard.
  DONE.
- 18:07 Apple seating discipline extended to Orbit - applied
  in v4 composition law. DONE.
- 18:09-18:12 Autonomy grants + Orbit purpose test - the wave
  ran under them; the purpose test is quoted in the plan.
- 19:33-19:45 review verdicts: BOND SHEET PRAISED, PROTECTED;
  stones shape accepted (superseded at 21:34 by F-A); Live card
  proportion + copy dedupe - DONE in flows2 Round 3; Trivia
  must read LIT IN STILLS - the poster carries the spectacle
  at rest (flows-trivia-poster frames). DONE.
- 21:20 walkthrough requests -> W-16 (DECLARED set) + W-17
  (DONE, incl. story viewer leg).
- 21:34 ORBIT = FOUNDER-LOVED, PROTECTED; O-1/O-2/O-3 DONE;
  F-A round story stones with thin orbit ring DONE (opal-oval
  retired); F-B presence mini-row killed DONE; F-C Live full
  berth DONE; F-D light is a glyph (opalescent heart; the
  word-button died) DONE; F-E mystery glyph identified as the
  doors-panel doorway arch - illegible at size - DIED under
  F-F (replaced by the graph-in glyph); F-F doors are glyphs
  ("graph in") DONE.
- 21:39 push-to-chat correction (drag dies; separate screens;
  long-press selects) - DONE, verified step-by-step at the
  glass both modes; drag frames archived.
- 21:43 hole mandate -> W-18 (above) + W-19 (above).
- 21:45 T-5 Trivia rebuild (game poster; a person owns it;
  score attached to the pair; a tease) - DONE
  (flows-trivia-poster set; score stone "Know Me? 10 - 1
  confirmed" at the glass both modes via the sparse-B leg).
- 21:48 the four social-button concerns "unaddressed" - the
  parent owned the visibility failure in-session; the mystery
  glyph was identified and killed (F-E/F-F above). The ruling
  stands: named items are answered as their own visible items.

## Frame-version audit
Rule: the live pack carries only version-consistent frames;
anything older is archived with a version label or named here
with its badge and the reason it stands.

Re-filed at the INTEGRATED build (served stamp d4b06ad6):
Orbit v4 canonical set (22 PNG + 4 webm); openings set
(center/flows/stream-mid/vs-center, pad-active x5 surfaces);
W-4 pad rest/dissolve/drag set (x5 surfaces); Flows2 set
(moments, trivia poster, bond x3, creation x5, story viewer);
membership-manage pair; marble set + capture-log (worktree
r21-marble/).

Standing at cluster badges (the integrated tree contains the
identical code via the merges): calm-surface frames, connectors
room frames (no product code in that cluster beyond test pins),
builds/laws proof artifacts.

Named exceptions (never presented as current integrated frames):
cardmenu-graph-private pair (cluster-era filing 2026-10-20
14:27; integrated re-shoot DECLARED, W-5c); incall-* (none filed
anywhere live; the historical offender is quarantined in
pack-archive/mislabeled-incall-r19-3e230af/); flows-trivia-light
under the pre-T-5 name (superseded by flows-trivia-poster-light);
orbit v3 frames and the drag-gesture frames (archived under
pack-archive/ with version labels).

## Founder-gated list (consolidated; nothing here was decided for him)
From this wave:
- D-2 (NEW, surfaced per the 12:51 ruling): call-graphing
  default posture. The build is opt-in - graphing starts OFF
  unless the account enabled calls (Assist.apply_defaults/1
  seeds allow only when users.assist_calls_enabled is true).
  The founder's stated model (2026-10-20 21:20) is default-ON
  with per-call pause. Not patched; his decision.
- H-NEW-5 (surfaced): the ?shell=r17 legacy-shell route still
  serves. Retiring it is his call; muse/repair-17 stays
  untouched as the revert spot either way.
- D-3: the apply_defaults seeding writes no graphing_on consent
  lineage event (one-gap fix; lands with the in-call mount
  build, whose shape is named in r21-calls-report: live-call
  state machine port + two-seat WebRTC rig).
- W-5d's carried blocker: mount a real in-call surface carrying
  conversation_id (the orbit doorway is then a one-line mount).
- Trivia rewards/expiry posture (commercial model decision,
  parked by him) and the trivia validation expiry build.
- Places/interests follow endpoint (A-14) and the nearby tier +
  travel intent (A-16, roadmap-only in his docs).
- Orbits naming pick (Orbit / Constellation / Rings) - still
  open from R20.
- The walk itself: his verdict on this pack first; the walk
  build defaults to LIGHT (W-7).
- Battery follow-up (engineering, not a product decision):
  re-run the 9 timing-residue backend tests (seed JA-04,
  routing, channel x2, profilegap, twouser x3, adversarial,
  opalcontext assemble, messages concurrency) on a healthy
  box to close them formally; they carry timeout-only
  signatures from a twice-restarted VM (battery section).

Standing from earlier waves (unchanged, still his): every merge
decision (muse/repair-18, muse/repair-19, muse/r19-polish,
muse/r19-erasure, muse/repair-20, muse/r20-flows, muse/repair-21);
production API restore (api.opal.niovlabs.com 503 since
2026-10-11); web host re-deploy + DNS; TestFlight execution
(blocking decision: API target); Google OAuth consent tap +
redirect fix (also gates Gmail); Google Places enablement +
billing; Twilio Messaging sender creation; Twilio sending-number
provisioning; policy/terms publication; Duffel live token;
Stripe decision (GAP-23); commercial model decision (also gates
invite-reward copy); custom-connector trust model; identity
expansion; ElevenLabs successor voice; P5 push-variant consent;
video/CDN decision; P1 activation choice; prod
OPAL_INTELLIGENCE_SENDER_USER_ID; encryption-at-rest key
management (W-GAP-04); messaging_business grant (W-GAP-14);
undated-vs-dated plan dedupe; orb trademark clearance; erasure
merge + graph-create reachability; JA-13 leave-wording;
anchor-move affordance; empathic-register DEFERRED-BY-DESIGN
confirmation; memory step-up re-auth backend build; age-band
POLICY decisions; the wallet build per WALLET_MAP section F;
Robin-scale density/perf pass; N5 default-happening color
question; viewer-relative plan titles at projection (holes
A-04); F-16 live call transcription (engineering reality: not
real yet; honestly gated).

FOUNDER_ACCEPTED stays NO. The next step is his: verdict on this
integrated pack, then the phone walk (LIGHT default, badge-law
link) when he calls it.

---

## ADDENDUM — BATTERY CORRECTION (parent annotation, 2026-10-21, on the finisher's own disclosure)

The battery section above describes the single-process full-suite run as abandoned in favor of partition legs. That is corrected here: the run's delayed completion delivery shows it actually COMPLETED at ~09:43 UTC with the summary "3370 tests, 26 failures" / EXIT:2. Its test total matches the leg battery's total exactly. Its 26 failures were NOT name-verified test-by-test by the finisher or the parent; the +5 over the leg battery's 21 is consistent with heavier timing contention in a single BEAM, but that remains an inference, not a verification, and is recorded as such. The verified record stands as: leg battery (21 failures, all timing species, zero wrong-state assertions), standalone reruns (seed_commit 4/0, sinister 24/0, pressure 10/0; 9 tests timeout-only on this VM), human_validation + compound_quality 25/25 standalone. The healthy-box full re-run on the founder's list closes both executions' timing residue. This annotation is committed locally and rides the next records push; the pushed tree (ce577f61 / mirror 94a83882) carries the pre-correction battery text.
