# REPAIR #24 HANDOFF - the declared-gap closure wave

Branch: muse/repair-24, based on the verified R23 close
(muse/repair-23 local tip c74adfe3, remote mirror 47ded4b6,
tree 12b2a02f). Worktree: ~/workspace/opal-graph/wt-repair24.
Founder directive (2026-10-22 02:12 PDT): every known-and-
declared gap gets solved now, not carried.

GATES HELD: FOUNDER_ACCEPTED = NO. No merge (the founder
merges), no production deployment, no Pass 2 unlock,
muse/repair-17 untouched, additive-only migrations, no
user-data deletion. Battery figures at close are READ FROM
THE RUN LOGS at the fixed tip (the R23 erratum lesson).

## WORKSTREAM MAP (cluster branches off c74adfe3)

- WS-1 D-M story-engagement record + story comments +
  mention/response glow trigger -> muse/r24-stories
- WS-2 graph-story posting server path -> muse/r24-graphstory
- WS-3 place-atlas drift -> muse/r24-atlas
- WS-4 lives write-path visibility -> muse/r24-liveswrite
- WS-5 memory step-up re-auth + WS-6 moment tense
  persistence -> muse/r24-backendfeat
- WS-7 reduced-motion hardening + V2Dock dead rule +
  WS-8 place-energy D-P1..D-P7 triage -> muse/r24-motionplaces
- WS-9 seed-world stageability -> muse/r24-seedworld
- WS-10 F-16 live transcription + W-5d in-call frames
  assessment -> muse/r24-incall

## DISPOSITION TABLE

(Filled at close from the cluster reports and the
coordinator's own re-runs - never from handoff prose.
Per-workstream detail lives in the phase checkpoints
below and in each cluster's committed report.)

- WS-1 D-M story-engagement record: FIXED. The record,
  story comments end to end, and the mention/response
  ATTENTION trigger are wired from server-computed flags.
  The interest trigger is DECLARED UNWIRED with its exact
  reason: no interest field or demonstrated-interest
  signal exists anywhere in the story path, and wiring
  it would fabricate one.
- WS-2 graph-story posting: FIXED. Real server path,
  party-only visibility, 24h law unchanged, composer
  door wired. (Integration finding IF-24-1 below.)
- WS-3 place-atlas drift: FIXED (atlas-side; the 5
  seeded places enter the catalog, the display-string
  join is owned by refers_to?/2, the gate stays honest).
  NAMED RESIDUAL, not fixed: the second catalog
  (RealWorld.Place.Catalog, the composition engines'
  source) drifted the same way; it is not the catalog
  graph-create validates against.
- WS-4 lives write-path visibility: FIXED (both write
  paths take the read path's 404 on a hidden room; no
  presence row, sticker, or wallet movement).
  list_live_at_venue/1: LEAVE (definition-only, unrouted;
  latent-risk note in the cluster report).
- WS-5 memory step-up re-auth: PARTIAL +
  FOUNDER-DECISION. Everything real without a password
  credential is built and pinned (fresh phone-code
  step-up on the account's own verified number, 5-minute
  session-bound elevation, gated mutations, timestamped
  audit rows, honest UI). The password check itself
  cannot exist yet - FOUNDER-DECISION, verbatim: "no
  password credential exists in the account model;
  adding one is a founder identity decision."
- WS-6 moment tense persistence: FIXED.
- WS-7 reduced-motion fragility: FIXED (motion by
  construction behind the no-preference gate;
  specificity-audit pin).
- V2Dock dead rule: FIXED (rule + dead export removed,
  over-deletion guard pin).
- WS-8 D-P1 place identity: FIXED, scope-exact
  (identity-first grouping + the feed projects the
  record's place_id). Named residuals: the signals tier
  is still computed per name (name-contracted API), and
  plans honestly carry no stable place id to project.
- WS-8 D-P2 public/stranger layer: DESIGN-STANDING
  (the no-stranger-layer law; not a defect, not built).
- WS-8 D-P3 check-in presence: NOT-FIXED - MISSING
  CONTRACT (a place-level consent contract must exist
  first; founder/design decision. The per-plan share ->
  nearby half was already closed by R23.)
- WS-8 D-P4 live-only start door: FIXED (place
  SeedSource, my-people only, no claimed lineage).
- WS-8 D-P5 place page depth: NOT-FIXED - MISSING
  CONTRACT (no place-record read wired for a stone;
  Venue carries no hours/imagery; no energy history is
  stored anywhere).
- WS-8 D-P6 feed window: NOT-FIXED - MISSING CONTRACT
  (the tier half was cured server-side by R23; the
  client builder still reads feed page one and no
  place-scoped moment read exists; silently widening
  the feed is the move the design record refuses).
- WS-8 D-P7 backend projection: CLOSED BY R23,
  confirmed this wave by code read + suite re-run.
- WS-9 seed-world stageability: FIXED (5 moments + 1
  live room through the real owners; the stageability
  proof composes 5 moment cards + 1 visible live at the
  API/feed-payload layer).
- WS-10 F-16 live call transcription: BLOCKED. The live
  chain is code-complete but never exercised in
  evidence; DEEPGRAM_API_KEY lives only in the Mac's
  ~/.opal/r1a1.env, DeepgramGrant has no transport seam,
  and no served surface can run hear() from this VM.
  Exact founder steps: r24-incall-assessment.md 1.5
  (incl. the D-2 call-graphing default and D-3 lineage
  decisions).
- WS-10 W-5d in-call frames: BLOCKED. The missing piece
  is the C2 in-call mount (the doorway exists;
  orbitConversationId has zero call sites); its proof
  needs a two-device media-connected walk on the served
  shell, not dischargeable on this VM. No credential
  needed; founder step = schedule the walk + D-2.
- IF-24-1 (integration finding, this wave): the WS-2
  graph picker read listOpalPlans directly in C2Home,
  tripping MP-3 (surfaces consume projections, never
  plan-state readers). Caught by the full web battery -
  identical failure on two runs, so not a load flake.
  FIXED at integration (410c422e): the picker renders
  loadStoryGraphOptions from shellData (the one
  derivation site; the MP-3 registry set is unchanged).

## BATTERY (coordinator-run at the fixed tip)

Every figure READ FROM ITS RUN LOG (r24int-scratch).
The backend legs ran at 9683ac76; the only later code
change is IF-24-1, which is web-only (two .tsx/.ts
files, no Elixir), and the web + typecheck figures
below were re-run at the final tip 410c422e.

- Migrations from empty: 124 (proven on a fresh test DB
  and again on the API leg's fresh dev DB).
- Backend: 3,461 tests, 0 failures - legs 822 + 838 +
  497 + 1,211, extras 68 (14 files: every R24-new suite
  rides here), watchlist 25; every leg EXIT 0.
- API: 101/101 PASS, run exit 0 (fresh compile - app
  build output deleted first - fresh DB, 124 migrations).
- Web: 2,333 passed / 0 failed / 0 skipped, 283 files
  (final run at 410c422e; the pre-fix run's single
  failure was IF-24-1 above).
- Typecheck: 0 errors (exit 0, empty log; re-verified
  after IF-24-1).
- Mobile: CARRIED - zero opal_mobile changes in the
  wave (diff-verified against c74adfe3); R22's 109/109
  stands as the last verified run of identical code.

Process record: a runtime service restart mid-battery
killed the first web re-run and the first API attempt,
and took Postgres 5433 down with it. Both were re-run
detached to completion; the API leg's first failure was
environmental (PG down), is recorded as such, and its
clean re-run is the figure above. Two migration-version
collisions from parallel clusters picking the base's
next timestamp (20261030030500 x3) were renumbered at
integration (step-up -> 20261030030700, graph anchor ->
20261030030800); the final sequence is unique and runs
from empty. One cluster filed its report uncommitted at
the top-level coordination dir; the coordinator
committed it onto its branch verbatim (noted in that
commit) to satisfy the artifact contract.

## FOUNDER-GATED / CARRIED FORWARD

Everything on the standing founder-gated list stands
(all merges incl. repair-22, repair-23, and now
repair-24; D-2; H-NEW-5; policy picks; the "Nearby"
caption word - untouched by this wave), plus this
wave's additions: the WS-5 founder-decision (verbatim
in the disposition table); D-P3's place-level consent
contract (a founder/design decision); the F-16 founder
steps and the W-5d walk scheduling (r24-incall-
assessment.md); the RealWorld.Place.Catalog drift
(WS-3 residual); and the two client callers of the
WS-5-gated endpoints (C2Trivia's confirm-a-fact save,
the legacy YouSettingsDestination fact forget) which
receive step_up_required with honest error lines until
their surfaces gain the step-up panel. FOUNDER_ACCEPTED
remains NO.

## PHASE CHECKPOINTS

- 2026-10-22 ~02:15 PDT: wave chartered. Base verified
  (wt-repair23 at c74adfe3, tree 12b2a02f; Postgres 5433
  cluster restarted from polish-scratch/pgdata2). All eight
  cluster worktrees dispatched in parallel with per-cluster
  artifact contracts (branch + committed report + targeted
  evidence + disposition line each).
- 2026-10-22 ~02:26 PDT: WS-10 (muse/r24-incall, b7a0b3bc)
  LANDED + coordinator-audited + merged. Assessment only,
  no product code: F-16 BLOCKED (the live Deepgram chain is
  code-complete - consent gate, grant, hear(), gated fold -
  but has never been exercised in evidence; DEEPGRAM_API_KEY
  lives only in the Mac's ~/.opal/r1a1.env, DeepgramGrant
  has no transport seam, and no served surface can run
  hear() from this VM; founder steps in the assessment
  section 1.5, incl. the D-2/D-3 decisions). W-5d BLOCKED
  (the C2 in-call mount is the missing piece - the doorway
  exists, orbitConversationId has zero call sites; its proof
  needs a two-device media-connected walk on the served
  shell, not dischargeable on this VM; no credential needed,
  founder step = schedule the walk + D-2). Coordinator spot
  checks held (not_wired seam state; zero CallSurface refs
  under src/c2). Doc: r24-incall-assessment.md (521 lines).
- 2026-10-22 ~03:18 PDT: WS-4 (muse/r24-liveswrite,
  3e63cc02 + c889c966 + 8312c463) LANDED + coordinator-
  audited + merged. FIXED: POST /lives/:id/report-presence
  and /stickers now gate on Lives.get_live/2 (the read
  path's own visible_to_viewer? enforcement) before any
  write runs - hidden or missing room takes the read path's
  exact 404 and no presence row, sticker row, or wallet
  movement happens; admitted viewers fall through to the
  pre-existing rules unchanged; the unknown-id sticker
  response deliberately moves 422 -> 404 so hidden ==
  missing. Failing-first suite was 4-red on base;
  coordinator re-run of the lives family (R24 write 5 +
  R23 show 5 + Paste K 18) = 28/28 green, matching the
  cluster's claim exactly. list_live_at_venue/1: LEAVE
  (definition-only in the tree, unrouted; latent-risk note
  in the cluster report). Zero migrations.
- 2026-10-22 ~03:22 PDT: WS-1 (muse/r24-stories, 6336dc56
  + 786b0245 + a007c412 + 46d9ec71) LANDED + coordinator-
  audited + merged. FIXED: the D-M story-engagement record
  exists - one additive table temporary_story_engagements
  (migration 20261030030500; count 120 -> 121) with comment
  / reply / mention kinds, all reads and writes gated
  through TemporaryStoryPublishing.get_for_viewer/2 (the
  moment-comments visibility law). Story comments are wired
  end to end (GET/POST /stories/:id/comments +
  C2StoryCommentsSheet + the viewer's comments door; Reply
  reglyphed as a labeled text button so the doors no longer
  share the bubble glyph). The rail's mention/response
  ATTENTION trigger is WIRED from server-computed
  viewer_mentioned / viewer_has_response flags. Interest
  trigger: DECLARED unwired with the exact reason (no
  interest field or demonstrated-interest signal exists
  anywhere in the story path; wiring it would fabricate
  one). No plan tables read - no registry entry applies;
  coherence suite green. Coordinator re-runs: backend
  engagement 7 + coherence 7 = 14/14; web targeted set
  (r24Stories, r22Stories, r22StoryTime, r21Flows2,
  r23FlowsVoice) 53/53 - both matching the cluster's
  claims exactly. Declared by the cluster: no glass
  capture leg this wave; the in-viewer reply composer and
  composer mention picker are founder surface decisions
  (API + client wrappers shipped).
- 2026-10-22 ~03:30 PDT: WS-7 + V2Dock + WS-8
  (muse/r24-motionplaces, e88b5f0d + b2d06559 + db9501a5
  + bcb5f727 + 86af1e0d) LANDED + coordinator-audited +
  merged. WS-7 FIXED: all four per-state orbit animations
  (byte-identical durations) moved behind a single
  prefers-reduced-motion: no-preference gate in
  c2shell.css, so under reduce no animation is ever
  assigned and the styles.css !important collapse is no
  longer load-bearing; pinned by a specificity audit test.
  V2Dock FIXED: the dead 18x3 cyan bar rule, its reduced
  companion, and the never-rendered export removed (with
  an over-deletion guard pin). WS-8 triage: D-P1 FIXED
  (identity-first place grouping - the feed now projects
  the moment record's place_id; two same-name venues stay
  two stones, pinned; named residuals: the signals tier is
  still computed per name and plans honestly carry no
  stable place id to project); D-P4 FIXED (flows2 gains a
  place SeedSource - my-people only, place-only prefill,
  no claimed lineage - so live-only places can start a
  plan); D-P7 confirmed CLOSED by R23 (suite re-run);
  D-P2 design-standing (no-stranger-layer law); D-P3,
  D-P5, D-P6 NOT-FIXED with the named reason MISSING
  CONTRACT (D-P3 needs a place-level consent contract -
  a founder/design decision; D-P5 has no place-record read
  or stored energy history; D-P6's tier half was cured by
  R23 server-side while the client builder still reads
  feed page one and no place-scoped moment read exists).
  Coordinator re-runs: reduced-motion pin 4/4, dead-dock
  pin 3/3, backend feed-id + place-signal 6/6 - all
  matching the cluster's claims (two initial count
  mismatches were the coordinator's own wrong test paths,
  resolved by re-running at the report's exact paths).
- 2026-10-22 ~03:38 PDT: WS-5 + WS-6 (muse/r24-backendfeat,
  e38ffd76 + 33ad72ce + 369c8507 + coordinator-committed
  report) LANDED + coordinator-audited + merged. WS-6
  FIXED: the moment record carries tense in the graph-
  create path's own vocabulary (present/future/past,
  migration 20261030030600), persisted on create, read
  back on detail/list/archive/feed, sent by the composer
  only when opened under a tense; unknown tense is a 422,
  never coerced; graph-create untouched (non-regression
  pin). WS-5 PARTIAL + FOUNDER-DECISION: the investigation
  proved no password credential exists anywhere in the
  account model (schema + repo-wide search evidence in the
  cluster report), so no password check was faked; what is
  built and pinned is everything real - a fresh phone-code
  step-up on the account's own verified number (fresh
  challenge, purpose sensitive_change, bound to the
  account; starting one on someone else's number refused),
  a 5-minute account+session-bound elevation token, gating
  on capsule create/forget + fact forget (403
  step_up_required without it), a timestamped AuditEvent
  per successful gated mutation, and the Memory room's
  real step-up panel with honest copy (every response
  states credential phone_code, password_credential_exists
  false). FOUNDER-DECISION carried verbatim: "no password
  credential exists in the account model; adding one is a
  founder identity decision." Named consequence: two other
  client callers of the gated endpoints (C2Trivia's
  confirm-a-fact save, the legacy YouSettingsDestination
  fact forget) now receive step_up_required with honest
  error lines until their surfaces gain the panel; the
  server-side trivia writes do not ride HTTP and are
  unaffected. The cluster self-caught a tsc error its
  piped check had masked and fixed it in 369c8507 with
  the incident disclosed in its report. Coordinator
  re-runs: backend set 27/27, adjacent set per report
  23/23 (cluster-run), web set 30/30, tsc exit 0 un-piped -
  all matching. INTEGRATION FIX: both WS-1 and WS-5 had
  picked migration version 20261030030500 from the same
  base; the step-up migration is renumbered 20261030030700
  in the integrated tree (it had only ever run on cluster
  scratch DBs). Migration count at this checkpoint: 123.
- 2026-10-22 ~03:47 PDT: WS-2 (muse/r24-graphstory,
  2d95edfe + 427784b2 + fd75b863 + 1bf2ab61 + 486c76e1)
  LANDED + coordinator-audited + merged (resolution
  1ba814b0). FIXED: graph-story posting is a real server
  path - the story record carries a graph anchor
  (graph_plan_id -> shared_plans, nilify-on-delete =
  fail-closed to author-only); create resolves the anchor
  before persisting (unknown id 404, non-party author 403,
  nothing persisted either way); the contract's not_graph
  is a real branch, not an assertion; visibility is
  exactly the graph's parties (the plan_media_authorized?
  precedent, evaluated live - the author's close friend
  who is not a party cannot read it, a non-friend party
  can; media bytes follow the same law); the 24h expiry
  law is unchanged; the composer carries a real graph
  picker with an honest empty state. Gyroscope:
  temporary_story_publishing.ex registered in
  PlanProjection.read_files. Coordinator re-runs on the
  cluster branch: backend graph-story 9 + coherence 7 =
  16/16, web r24GraphStory 7/7. MERGE RESOLUTION
  (coordinator, recorded in 1ba814b0): three conflicts
  against WS-1's merged work, all resolved as unions -
  the story contract (graph branch + attention defaults),
  the create path (mention validation AND anchor opts
  into one do_create), the post-insert block (mention
  rows AND the graph payload), productClient (both
  optional fields). Semantic check: WS-1's get_for_viewer
  gate routes through the same eligible?/2 that WS-2
  extended with the anchor clause, so graph-story
  engagement inherits party-only visibility. INTEGRATED
  CROSS-RUN on a fresh DB migrated from empty through
  20261030030800: engagement 7 + graph-story 9 +
  coherence 7 + story_post_repair15 + story_media_
  repair16 = 52/52; web r24Stories + r24GraphStory +
  r22Stories = 22/22. Second integration renumber: the
  graph anchor migration also took 20261030030500 from
  the base and is renumbered 20261030030800. Migration
  count at this checkpoint: 124. Cluster B also restored
  missing source files in the shared credo deps copy
  (outside the repo; copy-missing-only from an intact
  same-version copy) - cold build paths work again.
- 2026-10-22 ~03:55 PDT: WS-3 (muse/r24-atlas, 932caa4e +
  3dd15995 + c55b2512 + eb45932b) LANDED + coordinator-
  audited + merged. FIXED. The drift reconciles exactly:
  the seeded world holds 8 location-bearing plans over 7
  distinct places, and the 5 distinct places that failed
  graph-create's nomination path are the handoff's 5.
  Two root mechanisms: (1) the atlas (CandidateProvider,
  the catalog graph-create nomination validates against)
  was a hand-maintained 6-entry Repair #15-era list the
  R19 seed world never joined - 5 seeded places had no
  row at all and answered :unknown_place; (2) the D-P1
  display-string join - nomination resolved nominated
  strings by exact downcased equality, so "Herb & Wood,
  Little Italy" failed against the offered "Herb & Wood".
  Fix is atlas-side (zero seed files touched): the 5
  places are catalog entries with their seeded areas and
  honest activities; CandidateProvider.refers_to?/2 owns
  the display-string join (article / ", Area" forms);
  catalog_match's first-token shortcut now requires a
  distinctive token (as its doc already claimed). The
  gate stays honest - an unknown place still answers
  :unknown_place, a wrong activity still
  :activity_not_ready (pinned). Coordinator re-run: atlas
  pin 4 + conversation_alignment 20 = 24/24. FLAGGED by
  the cluster, not fixed: the second catalog
  (RealWorld.Place.Catalog, the composition engines'
  source) drifted the same way - carried into the
  disposition table as a named WS-3 residual (it is not
  the catalog graph-create validates against).
- 2026-10-22 ~03:55 PDT: WS-9 (muse/r24-seedworld,
  0c016003 + 602609b0 + 4b3c6e6c + 370d4d8a + e11022c1 +
  35264b01) LANDED + coordinator-audited + merged. FIXED.
  Diagnosis proven, not inferred: moment cards were
  ABSENT ENTIRELY (no seed path ever created a
  SocialMomentRecord - the world's stories are
  TemporaryStory rows, which feed the rail, never the
  stream) and live cards were ABSENT ENTIRELY (no seed
  created a LiveRoom or lives Venue). Enrichment, all
  inside the already-registered HumanSeedWorld through
  the real owners, existing cast/places/photos: 5 moments
  via SocialMomentPublishing (friends visibility; authors
  exactly the cast holding dyad conversations with the
  viewer, so A sees them and a stranger sees none -
  suite-pinned; one carries a viewer light + 2 comments =
  the comments-door card, one a comment, one a viewer
  repost, one viewer-saved) and 1 live room via
  Lives.go_live (Maya Torres at Oceanside Farmers Market,
  live at the seed clock). Stageability proof at the
  API/feed-payload layer (final braiding is client-side,
  stated precisely): HomeFeed composes 5 moment cards,
  Lives.list_visible_lives returns 1, stories still 2,
  plans untouched. Coordinator re-run: stageability 4 +
  human_seed_world 10 = 14/14. INTEGRATED CROSS-RUN
  (atlas + stageability + human_seed_world + place
  signal): 23/23. No migrations in either cluster.
  Mobile: zero opal_mobile changes in the whole wave
  (diff-verified) - mobile is CARRIED.
- 2026-10-22 ~04:55 PDT: CLOSE. All eight clusters
  integrated; integration finding IF-24-1 fixed at
  410c422e; full battery at the fixed tip read from its
  logs (see BATTERY above): backend 3,461/0, API
  101/101, web 2,333/0, typecheck 0, migrations 124,
  mobile carried. Disposition table filled; founder
  list carried forward. This handoff's close commit is
  the wave tip, mirror-pushed to muse/repair-24 with
  tree read-back verification (mirror sha reported to
  the founder by the parent, as in prior waves).
