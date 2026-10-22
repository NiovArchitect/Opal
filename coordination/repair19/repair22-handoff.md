# REPAIR #22 HANDOFF - the founder review wave, integrated and proven at one tip

Date: 2026-10-21. Branch: muse/repair-22. Base: muse/repair-21
tip fd1d34d3. This document is the close-out record: the full
reconciliation of WS-1..WS-11, each DONE with its evidence or
DECLARED with its reason, and every cluster declaration carried
forward verbatim in substance.

Gates, unchanged and unlifted: FOUNDER_ACCEPTED = NO. FREEZE =
HOLD. PASS2 = NO. FOUNDER_PHONE_PASS = NOT_CLAIMED. muse/repair-17
was never touched; it remains the revert spot. Nothing here is
merged to any other branch; the founder merges.

## The integrated build

- Eight cluster branches, each verified at its exact tip before
  merging (stories f1498418, storytime e40f0bb7, stream 738298b6,
  places 5ad18dc5, create b65a1b0c, trivia cb589e1b, orbitfix
  3056613a, dock 1589b4ab), merged in that order into
  muse/repair-22. Code tip: bf64f4cc (the dock merge).
- CONFLICTS: zero textual conflicts across all eight merges.
  Every named conflict zone (c2shell.css touched by five
  clusters, C2Home.tsx by three, shellData.ts and projections.ts
  and c2Tokens.css by two each, OrbitScreen.css) auto-merged
  because the cluster hunks are disjoint. Because an auto-merge
  can still interleave CSS cascade order silently, the semantic
  check was run, not assumed: the full ten-file cluster test set
  re-run on the fully integrated tree (85/85 PASS, including the
  CSS contract suites - stream rhythm tokens, dock contract,
  stories grammar), then the Phase 2 captures at the glass, then
  the full battery. No conflict forced a semantic choice between
  two clusters' intents; there is no integration finding of that
  species to report.
- Records commits ride above the code tip (phase checkpoints
  ec9f5caa, e5bdf05d, and this records set). The served capture
  build was stamped ec9f5caa (code tip + the phase 1 records
  file only); every frame asserts that stamp.
- Final tips: code tip bf64f4cc. The FINAL local tip, the remote
  mirror SHA, and the tree-match verification are recorded in
  the close-out delivery report (the push follows this writing
  by minutes; the mirror commit carries this exact tree).

## Battery on the integrated tip

- Migrations from empty: 120 apply clean, verified on THREE
  fresh databases (opal_dev_r22int, opal_dev_r22api,
  opal_dev_r22cap). File count on disk 120, zero duplicate
  prefixes; the 120th file is the WS-7 migration
  20261030030400_add_trivia_correction. R21 was 119; the count
  was re-derived, not assumed.
- Backend: four MIX_TEST_PARTITION legs in the R21 composition:
  leg1 822, leg2 838, leg3 497, leg4 1210 = 3,367 tests, ZERO
  failures; plus the two files the leg lists do not carry run
  standalone (r22_orbit_scope + care_rotations schedule, 13/0)
  = 3,380 tests across all 381 test files, zero failures
  anywhere. (R21 reference: 3,370 tests with 21 leg failures,
  all timing species. This run had NO timing-species failures,
  so no failure protocol was needed and nothing was absorbed;
  leg4 is +3 over R21 = the WS-7 trivia correction tests, and
  the file count is +1 = r22_orbit_scope_test.exs.)
- Watchlist, individually: human_validation_test.exs
  standalone 13/0; compound_quality_test.exs standalone 12/0 -
  the pair 25/25 green, matching the R20 reference counts.
- API regression (fresh DB opal_dev_r22api, 120 migrations,
  founder seed, shots/regression/run.mjs): 101/101 PASS.
  Seed-world machine-speak gate: clean (0 hits).
- Web full suite: 25 failed / 18 files / 2,212 passed
  (2,237 total). Name-for-name against the R21 baseline
  (24 failed / 17 files / 2,137 passed): every one of the 24
  baseline failures fails identically - same test names, same
  files - and exactly ONE new failure appears, named and
  caused in INTEGRATION FINDING IF-1 below. It fails
  deterministically in isolation (1 failed / 13 passed in
  its file); it is a real code delta, not a flake, and
  neither side of it was changed by the integrator. The
  suite grew 2,161 -> 2,237 tests (+76: the R22 cluster
  suites and the expanded creation suite). No other
  differences; nothing was absorbed or renamed.
- Typecheck: exactly 9 errors, the identical pre-existing set
  (OpalApp.tsx x3, productClient.ts x5,
  YouSettingsDestination.tsx x1); none in R22 files.
- Mobile (jest): 109/109 tests, 23/23 suites, run from a
  scratch copy of the integrated mobile tree (the tree is
  byte-identical to the base - no R22 cluster touched mobile;
  the copy exists because the mobile lockfile is out of sync
  with its manifest, pre-existing, and installing in-tree
  would dirty a tracked file).

## Captures on the integrated tip (all badge-gated)

Filed under shots/repair22/integrated/ - 20 frames, both modes,
every context asserting data-git-head-full == ec9f5caa (the
seed chip in frame reads "seed - ec9f5ca"), flows and center
frames content-signature-gated before filing:

- flows-firstpaint-{dark,light}: the story rail unified -
  round stones, thin orbit rings with dots riding the rings,
  ONE caption grammar (Your moment "Live", Maya Torres
  "Loved"); place stones lead the stream below the rail.
- stream-scroll-{1,2,3}-{dark,light}: the stream at
  0/520/1040px - one continuous rhythm, glow contained.
- place-stone-{dark,light}: Oceanside Farmers Market stone
  in viewport, audit-measured (energy level "lit", top 208,
  bottom 350, both modes).
- pad-center-{dark,light} and pad-flows-{dark,light}: pad
  active states - the active slot lit, NO selection dot
  anywhere (WS-8 at the glass).
- orbit-select-{dark,light}: the Orbit (Maya) select /
  recommendation state; containment audit on the served
  build: panel 20..370 of 390 wide, ZERO out-of-bounds
  children in both modes (WS-9 at the glass).
- create-sheet-{dark,light}: the three marble tense buttons
  (DOM audit: c2s-create-tense-btn x3 - Now / Forecast /
  Memories) over Photo or video / Text / Go live / Cancel.
  Truthful-path note: in the seeded world session A's self
  stone is "happening" (a live story with media) and its tap
  opens the story viewer by design (openSelf, Hunt-fix
  B-10 + JA-11, pre-R22 law); the create sheet is the same
  door's no-live-story branch. These frames were captured on
  a bare stack (fresh DB opal_dev_r22cap, founder seed never
  applied, self stone audited "quiet" before the tap) - the
  create cluster's own capture discipline, same served dist.
- trivia-validation-{dark,light}: the Know Me? - Maya card
  carrying both pending guesses with their "That is right" /
  "Not quite" doors. Staged through the real product
  endpoints exactly as the trivia cluster staged
  (relationship upserts 200/200; guesses 201 x2), after two
  earlier runs proved the card honestly absent from an
  unstaged world - an unstaged world has no game, and no
  card was ever faked to fill the frame.

DECLARED captures: none outstanding - every surface in the
canonical set was captured truthfully on the integrated build.


## INTEGRATION FINDING IF-1 - the happening story ring's glow (named, not resolved)

The one place integration produced a genuine semantic
collision. The R20 F-10 PIN (src/c2/shell/r20Connect.test.tsx,
founder 2026-10-20) protects the pressed/ring treatment of
Home's lead, including the rule .c2s-stone[data-state=
"happening"] .c2s-stone-ring { box-shadow: 0 0 14px
var(--orb-indicator-happening-glow) }. WS-4's glow-
containment sweep tokenized that one rule to box-shadow:
0 0 var(--stream-glow-room) - and --stream-glow-room is
calc(--stream-gap / 2) = 8px. Attribution is exact: the
stream tip carries the token; the base and every other
cluster tip carry the 14px literal. WS-4's law (no stream
surface's light reaches past the token) and the PIN (the
ring's 14px treatment) cannot both hold for a rule that
sits in both scopes - the story rail rides at the stream's
head, so the sweep took the ring with the cards.

Why it surfaced only here: the stories cluster's own delta
accounting was clean (on its tip the literal was intact),
the stream cluster's scoped suite pins only its token law,
and the stream cluster's full-suite runs carried the
timeout flakes its accounting records - this name drowned
in them. The integrated full suite, run on a quiet box and
matched name-for-name, is what caught it.

The integrator changed NEITHER side, per the commissioning
rule for semantic choices. The founder's options:
(a) exempt the story ring from the glow-room token (the
    WS-4 charge was about stream CARDS - too far apart or
    stacked, their lighting leaking; the rail ring is not
    a stream card) - the PIN then passes unamended;
(b) amend the PIN to the token and accept 8px as the
    ring's new glow - the integrated capture set was shot
    with the 8px value in place and the happening ring
    reads correctly at the glass (flows-firstpaint, both
    modes), so the pack is itself the evidence for (b).
Either is a one-rule change; the wave ships with the
collision named rather than papered over.

## Reconciliation WS-1..WS-11

- WS-1 story caption grammar (stories): DONE. One grammar
  (Live / Loved / New / Seen / Add), one size and balance
  across the rail. Evidence: r22Stories 3/3 at cluster and
  integrated tips; integrated flows-firstpaint frames.
- WS-2 ring motion (stories): DONE. The orbital ring tracks
  by state; dots ride the rings. Evidence: as WS-1, plus the
  cluster's ring-orbit-dark.webm motion proof and reduced-
  motion stills. DECLARED (carried from the cluster record):
  the reduced-motion animation-name cascade fragility -
  c2shell's reduced rule (.c2s-stone-orbit { animation:
  none }, specificity 0-1-0) loses the name cascade to the
  per-state orbit rules (0-3-0). The functional spec is met
  and was proven by probe: the global styles.css rule
  (animation-duration 0.01ms !important, iteration-count 1
  !important) collapses the orbit to one instant pass and
  the computed transform is static. The residual is latent
  only (if the global rule were ever removed, the c2shell
  rule alone would not rest the orbit); recorded for a
  future hardening pass, not an R22 failure.
- WS-3 story temporality (storytime): DONE. One playback law
  shared by both viewers (legacy viewer imports the shared
  module; its private copy died): image dwell 7s, video by
  real duration / the ended event, rail-order auto-advance,
  clean exit at the rail end, per-story progress segments,
  expiry from the record's own expires_at enforced at rail
  compose, at viewer open, and in live resolution (the
  expired-while-open gap closed). Evidence: r22StoryTime
  7/7, storyPlayback 9/9, storyViewerTemporality 2/2 at
  cluster and integrated tips; cluster viewer captures
  (mid-story fill 54/53%, advance frame segment states).
  DECLARED (carried): graph-story POSTING has no server
  path - TemporaryStory has no graph reference and its
  contract asserts "not_graph" => true
  (temporary_story.ex:66). Graph stories in the viewer play
  under the same law (pinned by test); building posting
  needs a server contract change, out of this wave's scope.
- WS-4 stream rhythm (stream): DONE. One rhythm law for
  Flows: --stream-gap / --stream-inset / --stream-stagger /
  --stream-glow-room tokens in c2Tokens.css, block rhythm,
  glow containment, and the legacy .c2s-feed cascade
  override fixed. Evidence: r22StreamRhythm 10/10 at cluster
  and integrated tips; integrated stream-scroll sequence.
  Carried accounting: the cluster's own full web-suite runs
  on this VM carried timeout flakes under load (its scoped
  suite is a CSS-text suite, green throughout); the
  integrated web suite above is the accounting of record,
  matched name-for-name to the R21 baseline with every
  difference named and caused there - nothing about the
  stream cluster's timeouts was absorbed into it silently.
- WS-5 place energy (places): DONE as the designed slice.
  placeStones builder over real signals only; place stones
  in the stream carrying differing real activity levels; the
  place view on tap with its real doors (graph detail per
  plan; start-a-plan-here only where a lawful seed source
  exists). The design's own token law: the place fire rests
  at past, glows at ember - heat is never fabricated.
  Evidence: r22Places 16/16 at cluster and integrated tips;
  cluster frames (places-stream, places-view-market,
  places-view-pier, both modes); integrated place-stone
  frames + the place stones leading the integrated stream.
  DECLARED (carried, design record section 8, verbatim in
  substance): D-P1 place identity (today the grouping key
  is the display string; the full build joins on the place
  record id); D-P2 public energy layer (energy from people
  outside the viewer's graph needs a place-level visibility
  and consent contract - the stone shows the viewer's graph
  only and says so: "your people", never "everyone"); D-P3
  check-in presence (no lawful place-level read exists
  today); D-P4 the live-only start door (a live-only place
  offers no Start a plan here in this slice - a live room
  is not a flows2 seed source); D-P5 place page depth
  (hours, place-record imagery, energy history - no place-
  record read is wired into Home yet); D-P6 feed window
  (the moment signal reads the home feed's first page,
  limit 20; a place whose moments sit beyond it is
  under-read, honestly); D-P7 backend projection (this
  slice's builder is the one client derivation, over
  finished backend contracts; the full build promotes it
  into a backend place-energy projection so every client
  renders the same stone).
- WS-6 create marble buttons (create): DONE. The opal-stone
  (avocado) shapes are dead; the three tenses are marble
  buttons (Now / Forecast / Memories) carrying the pad
  orb's own iris, each ringed by its state fire; choosing a
  tense opens that tense's creation panel inside the sheet.
  Evidence: r21Creation suite green at cluster and
  integrated tips (51/51 cumulative with the neighboring
  suites at its merge); cluster capture set; integrated
  create-sheet frames + tense DOM audit. DECLARED
  (carried): moment-tense is not persisted - the server's
  moment record carries NO tense field, so a photo or text
  post made from inside Forecast or Memories is a present-
  tense moment by the server's own model; the tense scopes
  the panel, and persists only on the graph-create path
  (entry + When label, as in W-17). No fake tense exists.
- WS-7 trivia correction (trivia): DONE. "Not quite" opens
  an in-place edit; submitting fixes the record with
  provenance (the original claim is kept; corrected_guess /
  corrected_fact + corrected_by + corrected_at), writes the
  corrected fact to the subject's wallet as a
  trivia_correction capsule, scores corrected as corrected
  (no points, never validated), and the guesser reads the
  correction back on their own card. Evidence: migration
  20261030030400 (integrated count 120, re-derived from
  empty three times); backend trivia tests inside leg4;
  r22TriviaCorrection 7/7; cluster journey frames (edit,
  corrected subject, corrected guesser); integrated
  trivia-validation frames.
- WS-8 pad dot (dock): DONE. The selection dot under the
  pad item is dead; lighting alone carries selection.
  Evidence: r22DockContract at cluster and integrated tips;
  cluster pad set (5 active states x 2 modes); integrated
  pad frames. DECLARED (carried): the V2Dock dead CSS rule
  - technicolorProduction.css carries an 18x3 cyan bar rule
  for .tab.active::after whose only matching component,
  V2Dock in v2Primitives.tsx, is exported but never rendered
  anywhere in src; the rule is a bar, not the pad dot, on an
  unrendered component. Recorded, not fixed - out of WS-8
  scope (the pad is one component, C2Shell's dock), and no
  test pins that rule.
- WS-9 orbit containment (orbitfix): DONE. In the long-
  press select panel, every element sits inside its pill -
  the composer/unsent wording and the another-take /
  dismiss actions carry elemental balance, nothing hangs
  outside. Evidence: r22OrbitContainment 7/7 at cluster and
  integrated tips; cluster orbitfix-select frames;
  integrated orbit-select frames with the containment audit
  (ZERO out-of-bounds children, both modes).
- WS-10 scoped generation (orbitfix): DONE. Suggestion
  generation is scoped to the orbit's own anchored
  conversation at the context builder - the scoped
  conversation is the only conversation in context, so a
  pill suggesting work in another conversation (the Maya
  pill inside Maya's orbit) cannot be composed. Evidence:
  backend r22_orbit_scope 7/0 standalone at the integrated
  tip (within extras 13/0); cluster affected suites.
  DECLARED (carried, from the cluster's own test record,
  verbatim in substance): the scoped-draft REMAINDER SHAPES
  - cross-conversation content can still appear in exactly
  three shapes: (1) a verb-less shared-plan reference
  (title only, <= 8 words, whole-payload equality, only
  when the scoped conversation is a party to that plan);
  (2) the seeded opener (a server-fixed string, pinned
  verbatim by the suite); (3) greet-early returns (the
  flow's own action classes, fixed strings, asserted as
  set membership). And the FRESH-UNSCOPED-SESSION
  OBSERVATION: the scoped context builder runs for EVERY
  Opal call (the widget-draft path in opal_response.ex),
  and the pin's session was a FRESH UNSCOPED session -
  scoped suggestions never fired there because the fallback
  draft carries no conversation_id; with the scoping flag
  off the same fresh session still drafts (the kill switch
  changes nothing for unscoped sessions), and with the flag
  on the fallback is suppressed as designed. Recorded so
  the next wave does not mistake the unscoped path for a
  scoping leak.
- WS-11 composer dock (dock): DONE. The Opal chat composer
  is docked above the pad (it was scrolling away with the
  content); per-surface verdicts in the cluster report
  (thread / orbit / opalchat scrolled frames, both modes).
  Evidence: r22DockContract at cluster and integrated tips;
  cluster scrolled-content set (6 frames). Carried
  accounting: the dock cluster's full web-suite run
  (26 failed / 19 files on its tip) differed from its own
  compiled baseline list (26 names) by a swapped pair - the
  full run failed dir4Reveal and planEditControls, the
  baseline list failed AT-08 and FA-02 instead; the
  finisher re-ran all four in isolation and all pass
  (17/17, 4/4, 1/1, 18/18), and no test failed both in the
  full run and in isolation, and none of the four touches
  the pad dot or the composer wrapper. Verdict recorded by
  the cluster: run-to-run flake under full-suite load, no
  new failure attributable to the commit. The integrated
  web suite above is reconciled against the R21 baseline
  on the same discipline.

## Complaint ledger and frame-version audit

- Complaint ledger: the R22 round is appended to
  shots/repair19/COMPLAINT_LEDGER.md - every 2026-10-21
  charge answered as its own row with its evidence, in the
  F-18 disposition pattern (status on the integrated tip,
  proof named, declarations carried). F-18 itself: the
  standing check ran on this close-out (signature-gated
  capture pipeline; badge asserted per context) and stays
  CLOSED.
- Frame-version audit: the live pack is version-consistent
  at the integrated badge. Re-filed at the INTEGRATED build
  (served stamp ec9f5caa): the 20-frame integrated set under
  shots/repair22/integrated/. Standing at cluster badges
  (the integrated tree contains the identical code via the
  merges, and the integrated set re-proves each surface):
  the eight cluster sets under shots/repair22/{stories,
  storytime, stream, places, create, trivia, orbitfix,
  dock}. No cluster frame is presented as an integrated
  frame; no integrated frame carries a cluster badge.

## Process record (carried, per the commissioning brief)

- The drain deaths and the ordinal misattribution are
  recorded here as named process events of this wave's
  worker management, carried from the parent orchestrator's
  record: cluster worker runs died during their drain phase
  and one workstream ordinal was misattributed in dispatch.
  Their underlying logs live with the parent, not in-tree;
  nothing in the integrated tree depends on either event -
  every cluster tip was re-verified by SHA at integration
  time (all eight exact), which is the control that makes a
  dispatch-layer error unable to reach the build.
- This close-out's own environment record: the box had
  restarted before the wave's close (uptime ~1:41 at stack-
  up); the healed Postgres cluster carries only the
  postgres role, so the R21-era opal-role DSNs failed until
  re-pointed (the R22 cluster stacks had already adapted;
  the close-out stacks and battery use the postgres role).
  The shared deps copy of credo lacks its compile-time
  template file, so fresh build paths cannot compile it;
  the close-out reused the R21 integrated build paths
  (deps beams intact, app recompiled) - the same reuse the
  clusters practiced. Phase checkpoints were committed at
  each phase end, so a restart costs minutes, never a phase.

## Founder-gated list (consolidated; nothing here was decided for him)

From this wave:
- Every merge decision, now including muse/repair-22 (and
  standing: muse/repair-18, muse/repair-19, muse/r19-polish,
  muse/r19-erasure, muse/repair-20, muse/r20-flows,
  muse/repair-21).
- D-2: call-graphing default posture (the build is opt-in;
  the founder's stated model is default-ON with per-call
  pause). Not patched; his decision.
- H-NEW-5: the ?shell=r17 legacy-shell route still serves;
  retiring it is his call; muse/repair-17 stays untouched
  as the revert spot either way.
- D-3: the apply_defaults seeding writes no graphing_on
  consent lineage event (lands with the in-call mount
  build, whose shape is named in r21-calls-report).
- W-5d's carried blocker: mount a real in-call surface
  carrying conversation_id (the orbit doorway is then a
  one-line mount).
- WS-3's declared remainder: the graph-story posting server
  contract (TemporaryStory graph reference) - a build
  decision for a future wave.
- WS-5's D-P1..D-P7: the place-energy full build (identity
  join, the public/stranger layer with its consent
  contract, check-in presence, the live-only start door,
  place page depth, the feed window, the backend
  projection).
- WS-6's declared remainder: persisting moment-tense needs
  a server field on the moment record - his call whether
  moments should carry tense at all.
- WS-2's declared residue: the reduced-motion cascade
  hardening (raise the c2shell reduced rule above the per-
  state rules) - a one-line CSS fix whenever he wants it;
  the functional spec is already met.
- WS-8's declared nuance: retiring the dead V2Dock /
  technicolor .tab.active::after rule with the legacy
  tabbar's own disposition.
- Trivia rewards/expiry posture (commercial model decision,
  parked by him) and the trivia validation expiry build.
- Places/interests follow endpoint (A-14) and the nearby
  tier + travel intent (A-16, roadmap-only in his docs).
- Orbits naming pick (Orbit / Constellation / Rings) -
  still open from R20.
- The walk itself: his verdict on this integrated pack
  first; the walk build defaults to LIGHT (W-7).

Standing from earlier waves (unchanged, still his):
production API restore (api.opal.niovlabs.com 503 since
2026-10-11); web host re-deploy + DNS; TestFlight execution
(blocking decision: API target); Google OAuth consent tap +
redirect fix (also gates Gmail); Google Places enablement +
billing; Twilio Messaging sender creation; Twilio sending-
number provisioning; policy/terms publication; Duffel live
token; Stripe decision (GAP-23); commercial model decision
(also gates invite-reward copy); custom-connector trust
model; identity expansion; ElevenLabs successor voice; P5
push-variant consent; video/CDN decision; P1 activation
choice; prod OPAL_INTELLIGENCE_SENDER_USER_ID; encryption-
at-rest key management (W-GAP-04); messaging_business grant
(W-GAP-14); undated-vs-dated plan dedupe; orb trademark
clearance; erasure merge + graph-create reachability; JA-13
leave-wording; anchor-move affordance; empathic-register
DEFERRED-BY-DESIGN confirmation; memory step-up re-auth
backend build; age-band POLICY decisions; the wallet build
per WALLET_MAP section F; Robin-scale density/perf pass;
N5 default-happening color question; viewer-relative plan
titles at projection (holes A-04); F-16 live call
transcription (engineering reality: not real yet; honestly
gated). R21's battery follow-up is DISCHARGED by this
battery: the 9 timing-residue backend tests named there
(seed JA-04, routing, channel x2, profilegap, twouser x3,
adversarial, opalcontext assemble, messages concurrency)
all sit inside legs that ran 0-failure here.

FOUNDER_ACCEPTED stays NO. The next step is his: verdict on
this integrated pack, then the phone walk (LIGHT default,
badge-law link) when he calls it.
