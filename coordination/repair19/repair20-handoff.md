# Repair #20 - founder delta-fix wave - completion handoff

Branch muse/repair-20, base muse/r19-polish @ 96db0187 (records
tip; code tip ad17cafd), integrated tip bff7a4d5 (seven cluster
merges + three integrator fixes, each charged below). Seven cluster branches, every worker SHA
verified in the object store AND `git show --stat` checked against
the worker's claimed file list before merge; cluster pins re-run in
the merged tree after every merge. Gates unchanged and absolute:
FOUNDER_ACCEPTED = NO, FREEZE = HOLD, PASS2 = NO,
FOUNDER_PHONE_PASS = NOT_CLAIMED. No merge to any protected branch;
the founder merges. muse/repair-17 untouched. No walk link issued -
the founder reviews this delta pack first. Everything below is
machine-proven, pending the founder's phone walk.

## Battery on the integrated tip (bff7a4d5)

- Backend full suite: 3,332 tests, 0 failures on THREE full runs
  (the tip carries one more test than 645edf19's 3,331 - the
  F-17b scheduling pin from integrator charge 3 below). Two
  further full runs each showed exactly ONE failure, the same
  one both times it could be identified: DeviceRealityTest's
  real-delivery-path reminder test ("time change cancels old
  scheduled reminder"), a timing assertion on a live delivery
  path, in a module the wave never touched. It passes 30/30
  three times standalone. Recorded as a load-sensitive flake
  with that evidence, not hidden: the failing runs executed
  while the capture stack and multiple browser rigs shared the
  same VM and Postgres cluster.
- Web full suite: exactly the pre-existing baseline - 16 failed
  files / 23 failed tests, 1,972 passed; the 16 failing files
  verified name-for-name against the polish baseline (all legacy
  opalUi files; no wave file among them).
- Typecheck: exactly 9 errors, the identical pre-existing set
  (OpalApp x3, productClient x5, YouSettingsDestination x1); none in
  wave files.
- Mobile (jest): 105/105, 22 suites; the wave contains zero mobile
  diff.
- Step zero (fresh empty DB): 117/117 migrations apply clean, zero
  duplicate prefixes; the wave adds exactly ONE migration
  (20261030030100, graph_locks.biometric_enabled, additive).
- API regression suite (the cumulative founder suite) against a
  FRESH dev DB seeded with the human seed: 101/101 PASS. (A first
  attempt on a reused DB failed late cases with 429s - the honest
  per-user rate-limit buckets pre-spent by earlier runs; the fresh
  DB is the suite's own recipe and passed clean.)

## Integration discipline + the three integrator charges

Merge order C1 -> C4 -> C2 -> C3 -> C5 -> C6 -> C7 with two true-
union conflicts resolved by hand (C2You.tsx: C2's vault section +
C4's Connectors entry; productClient.ts: a comment-only overlap).
Two integrator fixes, each charged to its check by name:

1. 767241ab - charged to the F-8a check. C3's people-ordering sort
   truncated last_talked_at to :second while the rest of the People
   module works at :microsecond; two people messaged within one
   second tied and fell back to name order. The merged-tree pin run
   exposed it (earlier isolated passes had straddled a second
   boundary under load). Sort now at :microsecond; the F-8a pin
   passed 3x consecutively after the fix.
2. 645edf19 - charged to the F-3 check's slice-to-EOF fragility.
   C1's card-menu pin slices c2shell.css from the F-3 marker to
   end-of-file and forbids raw state hexes in that span; the C3
   union appended the F-7 create-flow block after it, and that
   block's prose comment named a state hex literally. No CSS rule
   ever used a raw hex (the block runs through the state token).
   The comment was reworded; the pin is unchanged and passes.
3. bff7a4d5 - charged to the F-17b check (the etiquette suite
   pins the stage machine but never the stage JOB's timing).
   The F-17 capture campaign proved a real product defect on the
   served stack: a 1-hour response window set at 12:16:49Z left
   its NonResponseEtiquette stage job scheduled at 12:16:49Z THE
   NEXT DAY (oban_jobs gap 23:59:59.93, reproduced under a clean
   wall clock, no staging trickery involved). Root cause: the
   non-response lifecycle loop opens when the invitation is
   created - before any window exists - so its single stage job
   is enqueued at the 24-hour grace deadline. set_response_window
   later updated the loop metadata with the real closes_at but
   never rescheduled that job, so limbo never began and the fork
   never fired on window time; the lifecycle ran on the grace
   job regardless of the window a user set. This also explains,
   in part, the polish wave's D-9 fork-capture failure. Fix:
   set_response_window now enqueues the current stage's job at
   the due the fresh metadata computes (the same derivation
   advance/2 guards on; the worker entry is stage-guarded and
   due-guarded, so the stale grace job remains a harmless
   backstop), and schedule_stage's test skip now keys on Oban's
   effective testing mode (:inline) instead of Mix.env, which
   preserves the existing suite's behavior exactly while making
   the scheduling contract pinnable. Pin: "window set on an open
   loop enqueues the stage job at the nudge due" - a 2h window
   set on an open loop enqueues exactly one stage job at
   requested_at + 1h, not +24h. The fix landed mid-campaign; the
   full battery and the full rendered pack were re-run on the
   new tip, and the fork/closure/limbo frames in this pack are
   the real machinery firing on real short windows.

## Declarations up front

1. F-17a CONNECTED CALL FRAMES - DECLARED, not captured. Four
genuine rig attempts (frozen-era L4, probe-call, the
fresh-bucket L11 run in both modes, probe-call3 sheet
forensics). The Calls room's new-call sheet lists people as
plain rows; in the headless rig, tapping a person neither
placed a call nor surfaced a start control, and the second
seat never received an incoming overlay in any attempt. The
calling path itself is FOUNDER-PROVEN on real phones
(2026-10-19, two accounts, separate rooms); that stands as
the truth of the feature. Connected-call frames remain owed
to a device session.
2. F-17c LEAVE-BY ESTIMATE / LEAVE-NOW FRAMES - DECLARED for
this wave, with the full gate chain proven live instead (see
the F-17c disposition below): every gate state renders its
honest line in-frame or in the capture logs, and the chain's
last gate - the travel-time provider - does not answer in
the capture environment. The rendered estimate + leave-now
states were proven in the polish wave and are covered by the
leave-by pin suite.
3. F-16 DECK REMAINDER - a charged follow-up defect carried
to the gated list: deck reveal cards do not render the limbo
cooling treatment in this build (proven live; frames deleted
rather than misnamed). Graphs, plan detail, and the group
orbit carry the treatment.
4. FORK ANSWER CONTROLS - DECLARED: the fork's two answers
(decline / ask another time) were not found rendered on any
C2 web surface hunted during the finale (deck reveal card,
thread, plan detail body, detail overflow). The etiquette
projection carries the fork, the respond endpoint and its
client function exist and work (they closed the Campagnola
lifecycle in the finale), and the fork's presentation renders
on both parties' cards. The answer controls' rendered home
is a follow-up on the gated list.
5. F-3 HAPPENING MENU STATE - DECLARED: the pair was
deleted; a finale pill census found no Happening card in
either seat's world (Ready x4, Forming x9, the rest
tentative). The menu craft is proven on the forming / ready
/ action / private frames.
6. F-21a DEEP-LINK TAP-THROUGH - pin-proven only
(noticeRouting suite). The live tap could not be attempted:
no closure-notice surface was reachable in the rig (the
Activity room row exists - testid
c2-you-nav-row-approvals-activity - but the rig's clicks did
not mount the room within capture waits; recorded as a rig
limit, not a product claim).
7. FIXTURE-FED FRAMES (declared in the manifest): the
harness set (Horizon/Past cards, multi-day card, spine task
frames) renders the real components fed by fixtures - the
same components the live surfaces mount, proven live where
the finale's world allowed (limbo, fork, orbit, lane).
8. CONNECTORS COPY NIT (declared, not fixed): on the
expanded Gmail row, the STATUS line and the WHAT IS HOLDING
IT BACK line repeat one sentence verbatim. Cosmetic; not
worth a new tip.
9. GROUP THREAD LIMBO STRIP - DECLARED: a full hunt (scroll
both ways + plan-pill tap) found no cooling strip in the
group thread for a non-recipient viewer. Group limbo is
proven where the design puts it: the group orbit
(group-etiquette-limbo-orbit frames).
10. CAMPAIGN HONESTY: the capture rig exhausted the app's
own rate limiter four times (the app answered with its
honest "did not load" surfaces - the limiter working as
designed); the VM restarted five times; one rate-limit
bucket row for the synthetic capture account was deleted in
the staging DB to run the frozen-clock leave-by staging
(synthetic data only). Two finale frames were deleted for
misnaming (the first closure set, shot before the lifecycle
actually closed) and re-shot against verified state.

## What shipped, by founder item

F-1 LANE BUTTON BOXING - DONE. "Request a change" renders
as a boxed button with the same affordance language as
Confirm / Dismiss on deck, thread, and chats surfaces.
Frames: lane-button-deck-{dark,light},
lane-button-thread-{dark,light},
lane-button-chats-{dark,light} (a card without alternatives
honestly shows only Confirm / Dismiss). Pin: r20Actions /
lane suites.
F-2 COMPOSER FURNITURE - DONE with honest absences. The
bare "Record a voice note" text artifact is gone; the thread
composer carries real icon controls. ATTACH is honestly
absent in thread + Opal chat (no message-media model exists;
a pin asserts no attach control renders). The Opal-chat MIC
is honestly absent (no host-wired voice path there); the
thread voice-note flow is real (record / review states).
Frames: composer-thread-{dark,light},
composer-opalchat-{dark,light},
composer-voice-recording-{dark,light},
composer-voice-review-{dark,light}.
F-3 LONG-PRESS CARD CRAFT - DONE. The menu is a complete,
bordered, finished card in canon state color with real
presence. Frames: cardmenu-graph-forming-{dark,light},
cardmenu-graph-action-{dark,light},
cardmenu-graph-private-{dark,light},
cardmenu-detail-{dark,light}. Happening state declared
(Declarations 5).
F-4 VAULT GATE + CREDENTIAL HOME - DONE. The gate is
near-silent: title "Private graphs", the PIN pad in ring
language, no intentions essay, no set-passcode form on the
gate. PIN set/change lives in Settings (vault section).
Biometric unlock renders ONLY when the user enabled it, a
credential is registered, and the platform offers an
authenticator - device-local by design; server-verified
WebAuthn is NOT claimed. One migration
(20261030030100, graph_locks.biometric_enabled - the wave's
only migration, additive). Frames:
vault-gate-minimal-{dark,light},
settings-vault-section-{dark,light},
vault-open-enriched-{dark,light}. In the capture world no
biometric button renders - honest (no credential registered
there).
F-5 DOCK ORB OPACITY - DONE. The dock orb is a solid disc
in all states and modes (opaque --dock-orb-fill token).
Frames: dock-closeup-opaque-{dark,light} + pin. (The dock
BAR's translucency is shipped shell design; the orb disc
itself is opaque - the manifest notes the disc-level proof.)
F-6 DUPLICATE-PERSON INTEGRITY - DONE at the source.
Identity resolution via the backend People projection
(GET /product/people/projection): identity = account id;
an account-backed record wins; genuinely distinct same-name
people are never merged or blended. Frames:
search-people-once-{dark,light},
search-people-two-identities-{dark,light} - read with the
manifest's note: the two Maya Torres accounts are two
distinct real identities and both lawfully appear; the seed
cast retirement question is a founder policy call (gated
list), not silently implemented.
F-7 CREATE-PLAN WHO - DONE. The create flow carries
What / When / Where / Who at equal weight, on the real
graph-create participant contract; create screens received
the border/color enrichment; the primary Create action
carries the ambient treatment on press. Frames:
create-plan-enriched-{dark,light},
create-plan-who-{dark,light}.
F-8 START-A-CHAT FLOW - DONE. Ordering is real (recency /
volume from the backend projection, relationship shown);
the phone-number path starts a chat with a number not in
the list via POST /conversations/by-phone - active verified
identifiers only; an unknown number gets the honest
"That number isn't on Opal yet." Frames:
start-chat-ordered-{dark,light},
start-chat-number-{dark,light}.
F-9 CONNECTORS - DONE per the founder's order. The room is
"Connectors". Only user-facing tools with a real connect
flow or a real read surface render (Google Calendar +
Gmail under one Google OAuth grant, readonly scopes);
infrastructure providers are banned from the room by an
allowlist + pin (Twilio never appears). Tools without a
real flow are honestly absent and declared in the C4 report
with their enabling steps (Google consent is the founder
step). Permissions is built: it binds to Soul's real
assistance_level in plain words ("Only when I ask" /
"Balanced" / "More forward"). Frames:
settings-hub-connectors-{dark,light},
connectors-room-{dark,light},
connectors-category-{dark,light},
connectors-permissions-{dark,light}. Copy nit declared
(Declarations 8).
F-10 CENTER ASSETS - DONE. "Make something happen" and
"Talk to Opal" are real working assets; "How Opal works for
you" could not justify itself as an action and was restyled
honestly as what it is: the doorway row "Soul and Memory -
how Opal is with you, and what it holds". Pressed states are
a quiet ring, proven by computed-style capture. Frames:
home-vs-center-center-{dark,light} (resting),
center-asset-pressed-create-{dark,light},
center-asset-pressed-talk-{dark,light},
center-asset-pressed-doorway-{dark,light}.
F-11 HORIZON + PAST AS CARDS - DONE. Horizon contents are
individual purposeful cards with state color and quiet
orbit-ring section marks; Past stays collapsible with the
same card treatment inside. Frames (fixture-fed harness,
declared): graph-detail-horizon-cards-{dark,light},
graph-detail-past-collapsed-{dark,light},
graph-detail-past-expanded-{dark,light}.
F-12 SETTLED-DECLINED NOISE - DONE. Declined-by-me outcomes
fold into the one settled summary line on list surfaces; a
pin asserts "could not make it" appears nowhere on list /
Past surfaces; the past list shows plan cards. Frames:
graphs-past-quiet-{dark,light} + pins.
F-13 SPINE INTERACTIVITY - DONE per the F-20 constraint.
Food opens the real FoodStepPanel and the user's provider
choice is actually carried into the DoorDash / Uber Eats /
Grubhub handoff; restaurants open the plan-scoped Opal chat
(Geoapify discovery real; reservation execution honestly
absent - OpenTable create is partner-only, and slug-guessed
URLs were deliberately not wired); ride opens the plan chat
with the connector honestly absent (none exists). Declared
-static task types are listed in r20-actions-report.md.
Frames: spine-task-open-{dark,light},
spine-task-surface-{dark,light} (fixture-fed, declared).
F-14 MULTI-DAY DATES - DONE. A single planWhenLine source
renders start AND end on every surface that shows a plan's
range. Frame: plan-multiday-card-{dark,light} ("Sat, Jan 2,
7 PM - Mon Jan 4", fixture-fed harness).
F-15 REPEAT A PLAN - DONE. "Do that again" on settled/past
plans creates a NEW forming plan through the real
graph-create path (source_plan_id + entry "repeat"): title,
people, and place carried; a new time is REQUIRED (Create
stays disabled until one is given); conversation_id /
meeting_link are NOT carried; the original stays
byte-identical (pin). Frames: plan-repeat-entry-{dark,light},
plan-repeat-flow-{dark,light}.
F-16 LIMBO ON PLAN SURFACES - DONE on Graphs + detail +
orbit; deck remainder declared. A plan in limbo carries the
amber cooling-lines strip (pattern, not color alone), the
kind copy, and the remaining window on its Graphs card and
its detail hero: graphs-limbo-card-{dark,light},
plan-detail-limbo-{dark,light}. The group variant lives on
the group orbit (F-21b). Deck reveal cards do not carry the
treatment (Declarations 3).
F-17a CALLS - DECLARED (Declarations 1).
F-17b FORK + CLOSURE - DONE, and the campaign fixed the
defect that had made it uncapturable (integrator charge 3:
response-window stage jobs are now rescheduled when a window
is set; pin + live proof). Real 1-hour windows on the wall
clock: limbo began on the rescheduled job's fire (etiquette
read within minutes); Campagnola's window closed 15:19:18Z
and the fork was presented in the etiquette read at
15:19:41Z; A answered ask_another_time through the product
respond path (200, outcome "another_time",
lifecycle_open = false on both parties). Frames:
etiquette-fork-a-{dark,light}, etiquette-fork-b-{dark,light}
(the fork-stage cooling copy on both parties' Graphs cards;
the resolved Campagnola sits plain in the same frames),
etiquette-closure-a-{dark,light},
etiquette-closure-b-{dark,light} (both cards back to plain
Forming - closure is quiet by design). Fork answer controls
declared (Declarations 4).
F-17c LEAVE-BY - DECLARED with the gate chain proven live:
(1) no start instant - "No start time yet - leave-by needs
a set time." (in-frame, plan-detail-limbo-light); (2) start
set, place without coordinates - "Leave-by is not available
- this place has no location yet." (cap-l17 logs); (3) start
+ coordinates - "Share your location to see when to leave"
(leave-by-share-prompt-{dark,light}); (4) location shared
through the detail's own control - "Leave-by is unavailable
right now." in both modes (cap-l18 logs): the travel-time
provider does not answer in the capture environment, and
the estimate's last gate is that provider (founder's Google
enablement). Staging roots proven: conversation-create
never resolves a start instant from its label (three staged
plans, start_at null); graph-create's contract carries no
start field (code-read); PATCH refuses schedule fields
(422 schedule_field_requires_revision, by design).
F-18 D-5 - resolved by the lightest true change (section
below); deeper divergence carried to the gated list.
F-19 THE ORBIT SCREEN - DONE. The protected doorway opens
the scoped orbit: the ring of people as points of light
(every party member for a group), the thread's plans as
stones in canon state colors, pending members in the
dashed cooling ring, Opal's read as one quiet insight, the
conversation inside the field, the long arc (next together,
open windows, waiting lines, past Opal chats index), and
the one-tap return ("Back to your chat with..." / "Back to
the group chat"). Frames: orbit-screen-1to1-{dark,light},
orbit-screen-group-{dark,light},
orbit-screen-empty-{dark,light}, orbit-return-{dark,light}.
The doorway button itself is untouched.
F-20 CONNECTOR-POWERED SPINE - recorded (section below);
the constraint governed F-13.
F-21a DEEP-LINK LANDING - pin-proven (noticeRouting single
derivation wired into deck reveals, in-thread reveals, and
Activity fork/limbo cards; null when identity is
untrustworthy). Live tap declared (Declarations 6).
F-21b GROUP ETIQUETTE - DONE on the group orbit:
group-etiquette-limbo-orbit-{dark,light} (Weekend Crew
during Batiquitos' real limbo + its fork at 15:22:44Z on the
rescheduled job). Thread variant declared (Declarations 9).
F-21c COLD-USER LEGIBILITY - checked during the rendered
inspection: Connectors reads as a plain tools room (real
rows only, honest statuses, Permissions in plain words);
Private graphs reads as a title, a PIN pad, and nothing
else. Both rooms pass the persona lens; the one copy nit
found is declared (Declarations 8).

INSPECTION BAR: the wave's frames were judged as a judge
who has seen 10,000 noisy apps would judge them. Frames
that did not prove their names were deleted and declared
(the first closure set, the deck limbo pair, the happening
menu pair, the misnamed group-thread pair, the first fork
pair) - nothing noisy or overstated ships in the pack.

## F-20 - connector-powered spine (architecture record)

Recorded from C6's work and the founder's 2026-10-20 direction.
Spine tasks on a plan (find a place to eat, food for the group,
arrange a ride) are connector EXECUTION points: a tapped task
routes through the viewer's connected tools where a real connector
exists, and is honestly absent where none does. Today's truth:
food routes to the real food-step machinery with the provider the
user picks (DoorDash / Uber Eats / GrubHub) actually carried into
the handoff; restaurant discovery is real (Geoapify) while
reservation EXECUTION is honestly absent (OpenTable's create path
is partner-only; no guessed URLs were wired); no ride-hailing
connector exists in the product, so the ride task opens the
plan-scoped Opal conversation and says so. Two roadmap directions
recorded for the post-walk phase, per the founder: (a)
LOCATION-AWARE connector recommendation - when a user's location
implies a local service (his example: another country's local ride
app), Opal recommends it and helps connect it; (b) GROUP-PREFERENCE
recommendations inside a graph - suggestions weighed against every
party's scoped, consented preferences, not only the tapper's. The
intelligence build itself is post-walk; the constraint governed
F-13's implementation in this wave.

## F-18 - the D-5 decision (Home vs Center)

Resolved by the lightest true change, with the remainder named.
The two openings now declare different purposes in the served
markup and the shell's own structure: Home's opening carries
data-surface-purpose="people-and-moments" (the social/life
surface: people, stories, moments first), Center's opening
carries "opal-working" (Opal's working surface: the orb, its
three assets, and the needs-you deck of work waiting on you).
The rendered pair (home-vs-center frames) shows the divergence
that already existed in content now made explicit and testable.
The deeper divergence - different opening composition, not just
declared purpose - is a founder design call and is carried on the
gated list rather than improvised in a fix wave. The legacy
opalUi YouSettingsDestination "Connected sources" section was
left untouched by this wave (the C2 You surface is the shipped
one); retiring the legacy section is likewise carried.

## Founder-gated list

Carried (unchanged): merge decisions for every branch
(repair-18, repair-19, r19-polish, r19-erasure - plus the
graph-create reachability call the erasure waits on);
production API restore (api.opal.niovlabs.com 503 since
2026-10-11) + DNS; TestFlight execution (steps in
shots/repair17/TESTFLIGHT_STEPS.md; the mobile lockfile
desync MT-06 first); the Google OAuth consent tap + client
creation (unblocks the Connectors room's Google rows);
Google Places enablement + billing (403, GCP project
449126891803); Twilio Messaging sender creation +
sending-number provisioning; the Stripe decision (GAP-23);
the Duffel live token; the commercial model decision (gates
invite-reward + Trivia terms); P1 proactivity activation;
encryption-at-rest key management (W-GAP-04); the
messaging_business grant (W-GAP-14); the memory step-up
re-auth build; the age-band safety policy (the affordance
is built; the policy is yours); the Orbits naming pick
("Orbit" / "Constellation" / "Rings"); JA-13 leave-the-plan
wording; the anchor-move in-conversation affordance; the
empathic-register deferred-by-design confirmation;
trademark clearance for the orb identity.

This wave's deltas:
- F-16 DECK REMAINDER (charged follow-up defect, proven
live 2026-10-20): deck reveal cards do not carry the limbo
cooling treatment. Graphs, detail, and the group orbit do.
- FORK ANSWER CONTROLS (found in the F-17b finale): the
fork presents on both parties' cards and the respond path
works end to end, but the fork's two answer controls were
not found rendered on any C2 web surface (deck reveal,
thread, detail, overflow). Needs a build decision: where
the recipient answers a fork on the web shell.
- LEAVE-BY TRAVEL PROVIDER: with start + place coordinates
+ shared location all present, the detail honestly reads
"Leave-by is unavailable right now." in the capture
environment - the rendered estimate waits on the routing /
travel-time provider behind the Google enablement above.
- SEED-CAST RETIREMENT POLICY (from F-6): the seed cast and
real accounts are distinct identities and both lawfully
appear in People; retiring the seed cast once a real
account joins a world is a policy decision, not implemented.
- LEGACY "CONNECTED SOURCES" RETIREMENT: the legacy opalUi
YouSettingsDestination section was left untouched; the C2
Connectors room is the shipped surface.
- RESERVATION EXECUTION: restaurant discovery is real
(Geoapify); executing a reservation needs the partner/API
access step (OpenTable create is partner-only).
- A RIDE-HAILING CONNECTOR: none exists in the product;
the ride spine task is honestly absent until one is chosen.
- F-18 DEEPER DIVERGENCE: Home vs Center openings now
declare distinct purposes; a deeper compositional
divergence is a design call.
- CONNECTED-CALL FRAMES: owed to a device session (the
path is founder-proven on phones; the headless rig cannot
place the call - see Declarations 1). Scheduling, not a
product decision.

---

# AMENDMENT WAVE - founder redirect of 2026-10-20 (post-review)

The founder reviewed the interim preview on the morning of
2026-10-20 and redirected three builds, settled three open
designs, and added laws. This section is the amendment record.
Gates unchanged: FOUNDER_ACCEPTED = NO, FREEZE = HOLD,
PASS2 = NO, FOUNDER_PHONE_PASS = NOT_CLAIMED. Nothing merged;
the founder merges.

## Founder decisions recorded

- 07:01 PDT: the social page renamed "Social" - SUPERSEDED at
  07:06 by **Flow** ("the product's own name, ownable, the word
  users will say"). "Home" retires from the social surface.
- 07:07: the Flow glyph is a WATER icon - the squiggly up-down
  water-movement mark, drawn in Opal's line language and weight.
  The earlier "not a generic wave" caution was withdrawn by the
  founder himself. Scope: dock label, side-rail slot, page
  title/copy, icon. Timing: walk-prep build, folded into this
  wave under the containment clause because dock-bearing
  surfaces were being re-shot anyway (coordinator's call).
- 07:39: ACCEPTANCE LENS - MOVEMENT CONTINUITY, a named
  inspection criterion alongside the judges bar: every touched
  journey's transitions read as one intuitive motion, no dead
  jumps, no orphaned landings; breaking journeys named.
- 08:09-08:10: the R-1..R-6 redirect (Orbit v2, Connectors v2,
  composer model, dock anchoring, stray dots, limbo precision).
- 08:15 Orbit Law 2 (Sameness Test); 08:17 Push to Chat;
  08:25 density inheritance + the Orbit Ethics Constitution;
  08:30 sparse-orbit texture note; 08:31 bidirectional orbit;
  08:39 Orbit Law 3 (Truth of Misalignment); 10:48 Orbit Law 4
  (Two True Perspectives); 10:54 Orbit generality + reciprocity
  confirmed; 10:59 the system model (capsules as sets) mapping
  task; 11:05 R-7 group membership dynamics + the completion
  drive; 10:45-10:50 the validation amendments V-1..V-6.
- PROTECTED PRAISE recorded in the redirect: the answer-window
  card ("either answer is a kind one"), the boxed Confirm /
  Request a change / Dismiss lane + "Opal's pick", the
  long-press card (make private / make public / cancel), and
  the thread doorway button - none regressed; all re-proven in
  this wave's frames.
- Open question riding with the founder (no churn until his
  decision lands): dock label number agreement, Flow vs Flows;
  his lean is Flows, parent counsel sent.

## What shipped, by amendment cluster

All six clusters were built on the R20 tip (8bf9186b), SHA-
verified, and merged onto muse/repair-20; integrated tip before
validation fixes: 2a313be4.

- CA Rename (956ca43d, merged c1d3fe11): IconFlow (two stacked
  wave paths in the Glyph helper, stroke 1.8) in the C2 dock +
  wide sidebar; labels "Flow"; testIds and route keys unchanged;
  mobile tab label + a11y strings; pin asserts the dock's
  aria-labels are exactly [Flow, Chats, Graphs, You]. Deliberately
  left: legacy OpalApp.tsx TABS and opalUi V2Dock "Home" labels
  (legacy shells - founder-gated below).
- CB Orbit v2 frontend (697206d4, merged ea4f063c):
  OrbitScreen.tsx rewritten as the quiet card room - subject
  header (the TOPIC, never a person; Center Law), parties named
  plainly, "Where we're at" (state + next + open windows, the
  praised elements kept), "What we've done - and loved"
  (repeat-joy only from conversation-confirmed enjoyment),
  period-pill history index (density inheritance), the Opal
  conversation, one-tap return, call-doorway parity via the call
  log row. The people-as-lights ring composition is gone.
- CC Orbit backend (5cbc2faa, merged 78eaab34): orbit-v2-report.md
  (in tree) carries the Ethics Constitution verbatim, Laws 2-4,
  the bidirectional investigation, the self-mirror, and
  projection v2. THE SAMENESS TEST is a standing regression
  species (orbit_sameness_test.exs): two askers, same partner,
  demonstrably different scoped packages, literal substring
  isolation both ways, the partner's own capsules in neither.
  Its first run exposed a real gyroscope gap (marker ZX-A5):
  relationship-scoped capsules were admissible in NO prompt
  assembly - the exact capsules Law 2 names first never entered
  an Orbit answer. Fixed minimally (ScopedContext.assemble_many/2;
  PromptBuilder names the dyad relationship context; groups stay
  conversation-only; fail-closed otherwise). Projection v2 adds
  subject / where_lines / past_plans (loved ONLY from repeat
  provenance - the plan model carries no positive-signal field;
  checked, stated). Self-mirror built minimally: scoped-session
  birth records an owner-only activity entry (kind
  orbit_session_started, scope ids only, no content).
- CD Connectors v2 (9548e38d, merged 68792975): the room rebuilt
  to the founder's reference FORM, Opal-branded - near-textless
  rows (icon + name + Connect/View), his categories. Stripped by
  name: the entire Your-device group (device chats/calls/texts/
  room/location), linked devices, the in-room Permissions group,
  the essay lede. Final inventory is only what is real: Google
  Calendar + Gmail (Business; Connect only when the payload
  carries an enabled action, else View), Saved logins (Custom).
  Permissions sheds its essay (one lede, the real assistance-
  level control bound to the Soul setting, two doorways).
- CE Composer (0e76bd6a, merged 923655f8 with an integrator
  resolution): the mic lives INSIDE the composer in a reserved
  action slot; empty = mic (tap/long-press records, recording
  state inside the bar), text present = Send; the review surface
  is a pop-up anchored to the in-slot control; nothing floats
  outside. Opal-chat renders no control while empty (honestly
  empty reserved space - declared divergence, in code + test).
  Attach renders nowhere (pinned). The merge unified CB's and
  CE's independently built initialDraft seam into one prop -
  Push-to-chat's landing contract (a new non-empty draft applies
  once, never over user edits; null never wipes).
- CF Glass fixes (e85d8b78, merged 2a062c11): R-4's root cause
  found - the dock was position:absolute against a content-plane
  column AND the long-press menu was the one sheet-band surface
  not rendered through TopLayer. Dock is now position:fixed with
  identical phone geometry; the menu renders through TopLayer
  (its design byte-identical - protected). R-5: the stray dots
  were the preparation spine's unlabeled arc nodes - removed,
  replaced by labeled phase/state marker chips. R-6: the limbo
  derivation itself violated the law (cooling stamped from plan
  state with no window check) - fixed at the derivation with
  negative pins; the remaining-window text promoted to a legible
  body-size class on the plan card + Center strip.
- Integrator fix 2a313be4 (charged to the CB-CC seam): the
  frontend read loved_reason; the backend serves loved_evidence.
  Aligned; the orbit suite is 19/19 in the integrated tree.

## Validation fixes (V-1..V-6, 2026-10-20 10:45 PDT)

- V-1 CAPTURE-WORLD IDENTITY COHERENCE: the Flow greeting named
  the viewer while a plan card named the viewer as his own
  counterparty ("Plan with Ethan Walker"). Root cause traced,
  not papered: the seed Maya thread's missed-call open question
  folds into a plan from the question-owner's seat; born with no
  locked activity, the fold's people-fallback title named the
  other participant (the viewer) and the title is stored
  absolutely, so every seat reads it. Fix at the world source:
  HumanSeedWorld now carries that plan explicitly, titled by its
  subject in Maya's own words ("Talk tonight about Saturday"),
  lineage-stamped (the Juniper pattern), with a retitle branch
  for already-fold-born rows; pinned in human_seed_world_test.exs
  ("no seeded plan names the viewer as their own counterparty").
  Proven at the glass in both modes (flow-rest-*: greeting
  "Ethan", card "Talk tonight about Saturday"). The general
  remainder - fold-born people-titles are creator-relative but
  stored absolutely - is a named finding; viewer-relative titles
  at projection time are founder-gated below.
- V-2 PAD DISSOLVE + INSET AUDIT: scroll-sequence frames
  flow-dissolve-1/2/3-dark show content passing under the
  frosted pad. Inset audit measured on Graphs: dock top at
  772px of an 844px viewport; the list's last card rests fully
  above the pad with 148px clearance (graphs-inset-audit-dark),
  and the scroll range extends ~1,100px beyond the last card,
  so no item can be trapped behind the pad.
- V-3 DOCK POSITION INVARIANT: same family as R-4 - on the base
  build the dock was anchored to the content column, so on long
  or sheet routes it could render displaced or absent (the
  etiquette frames show the base defect: no pad in frame at
  all). The invariant now: position:fixed against the viewport
  on every served route, pinned by the r20aGlass CSS-contract
  tests; proven at the glass in 30+ amendment frames including
  sheets-open cardmenu frames, and the etiquette fork/closure
  set was re-shot on the amended build (etiquette-fork-a/b,
  etiquette-closure-a/b).
- V-4 PACK HYGIENE + ARCHIVE RULE: the live pack contains only
  version-consistent frames for every surface this wave touched.
  Superseded frames were NOT deleted: pack-archive/ holds
  v1-orbit-room-r20-base/ (10 frames, incl. the v1 group limbo
  orbit) and v1-connectors-r20-base/ (4 frames), with a README
  recording the version labels. Frame-version audit line: every
  connectors / orbit / composer / cardmenu / Flow / limbo / fork
  frame in pack-v2 was captured 2026-10-20 on the amendment
  build (dist chip 2a313be; the two late validation fixes were
  rebuilt into the same dist line before their re-shoots); the
  only frames not from the amendment build are surfaces the
  amendment did not touch, which stand from the R20 base build
  of the same branch.
- V-5 COPY: "Drop it" (the plan-cancel label) is retired -
  "Let it go" in all three render sites in C2Graphs.tsx, and the
  refusal copy aligned ("Only the plan's lead can let this plan
  go."). Pinned by dropItWiring + cancelOpalPlan (13/13).
  Proven at the glass (graphs-let-it-go-dark/light; "Drop it"
  absent). The rest of the etiquette/fork/limbo label audit:
  Confirm / Request a change / Dismiss (protected, unchanged),
  Decline / Ask for another time - plain kind words throughout.
- V-6 CONNECTORS DIRECTION VALIDATED by the founder
  ("fantastic"). Per-row status, A4 form:
  | Row | Class | Status |
  | --- | --- | --- |
  | Google Calendar (Business) | TRUE where the server carries the grant; View in the capture world | Live flow exists (start + revoke endpoints, readonly scopes); the capture world's server has OAuth unconfigured, so the row honestly reads View |
  | Gmail (Business) | HONESTLY GATED | Same single Google grant; enabling step is the founder's Google consent + client creation |
  | Saved logins (Custom) | TRUE | Real read surface (tap-to-view) |
  | Instagram / Spotify-class tools | HONESTLY ABSENT | No real connect flow exists today; they do not appear in the room; each lands when its connector wires |
  | Twilio and every infrastructure provider | ABSENT BY LAW | Never user-facing; removed permanently |

## Movement Continuity inspection (named criterion, 07:39)

- Doorway to Orbit to return: one motion - the thread's
  protected doorway opens the room; the room's first line is
  "Back to your chat with <Name>"; the return lands in the same
  thread. No dead jump. (orbit-screen-* + orbit-return-*)
- Push to chat: the recommendation's long-press menu carries
  the draft into the thread composer, populated and focused,
  NOT sent - the landing reads as the same sentence continuing.
  (orbit-push-to-chat-*)
- Lane to revision conversation: unchanged from R20, verified
  there; not re-opened by the amendment.
- Spine to action surface: unchanged from R20 (F-13/F-20);
  the spine's dots were replaced by labeled markers (R-5).
- Dock to Flow: the renamed slot lands on the same social
  surface, water glyph, one tap. (flow-rest-*)
- Named break (carried, already gated): the fork's answer
  controls have no rendered home on the C2 web shell - a user
  at the fork card cannot answer in place; the respond endpoint
  works and both closures were driven through it. Founder-gated
  below; not new in this wave.

## Amendment battery

- Backend: 3,340 tests, 0 failures on the integrated tip
  (2a313be4) BEFORE the validation fixes; after V-1's seed fix:
  3,341 tests with 2 failures, both CPU-ratio quality tests
  (HumanValidationTest longitudinal, CompoundQualityTest dyad
  maturity) that ran under parallel capture load - standalone
  25/25 green three times; recorded as load-flakes with the
  standalone evidence, the same species and protocol as the
  R20 DeviceReality flakes. The seed suite itself: 10/10
  including the new V-1 pin.
- API regression (fresh DB): see the final battery line in the
  close-out addendum below.
- Web: 23 failed / 16 files - the baseline set, name-for-name -
  2,007 passed on 2a313be4; re-run on the final tip after the
  V-5 rename (dropItWiring + cancelOpalPlan 13/13 targeted):
  see close-out addendum.
- Typecheck: exactly 9 (baseline). Mobile: 105/105.
- Step-zero: no new migrations in the amendment (none needed);
  the migration count stands at 117 from R20.

## Amendment declarations

- CB's in-call orbit doorway: the live in-call surface accepts
  the orbit props, but no current caller passes a conversation
  id into it - parity is live via the call LOG row; the in-call
  doorway renders once a caller wires both fields. Founder-gated.
- CC's bidirectional filing: there is no orbit-specific
  capsule-filing action (no CapsuleWrite door wired to the
  orbit) - deliberately not wired silently; the explicit user
  action (surface + endpoint) is intelligence-phase design,
  founder-gated. The room's composer language already invites
  "tell Opal where you're coming from" (bidirectional texture,
  rendered).
- Self-mirror scope: counts scoped-session births, not
  messages; message counting is designed, not built.
- Fading scaffold (Ethics article 4): intelligence-phase
  design, named, not built.
- Orbit Law 4's fuller bilateral rendering: the where-lines are
  built only from the shared record (Law-4-conformant
  sourcing); both-positions-with-the-gap-named rendering is
  intelligence-phase design, not claimed.
- R-7: membership events as orbit record entries, admin-rule
  removal surface, consent-edge wallet semantics, and
  born-knowing pairwise inheritance are recorded as model
  (orbit-v2-report.md section 10); no membership UI was faked.
- cardmenu-graph-private re-shoot: DECLARED - the private
  (Sunset picnic) card sits behind the vault gate on Graphs;
  the rig's unlock path did not surface the card in the list.
  The base-build frames stand; the menu component and the dock
  anchoring are proven by the forming/action re-shots on the
  identical component in this wave.
- Push-to-chat frame note: the landing frame's composer text
  is longer than the input field, so the draft's head is
  scrolled out of view inside the field; the state (thread,
  composer populated, focused, unsent) is what the frame proves,
  alongside the no-clipboard / no-auto-send source pins.
- The staged etiquette choreography in this wave (frozen app
  clock behind wall time so Oban stage jobs fire on schedule)
  is capture staging, not product behavior; the machinery
  itself (jobs enqueued at each transition, due-guarded
  advance) is the F-17b-proven machinery.

## Founder-gated list - amendment deltas (carried list stands)

1. Legacy shells' "Home" labels (OpalApp.tsx TABS, opalUi
   V2Dock) - rename to Flow there too, or retire the shells.
2. The orbit capsule-filing action (bidirectional write leg):
   surface + endpoint design, intelligence phase.
3. Fading scaffold (Ethics article 4) - intelligence phase.
4. The in-call orbit doorway caller wiring (one caller passing
   conversation id + handler into the live call surface).
5. Viewer-relative plan titles at projection time (the general
   form of the V-1 finding: fold-born titles that name a
   participant are creator-relative but stored absolutely).
6. Orbit Law 4's bilateral where-we're-at rendering
   (both positions + the named gap) - intelligence phase.
7. R-7 builds: membership events in the orbit record, the
   admin removal surface, consent-edge wallet semantics,
   born-knowing pairwise inheritance at group-orbit birth.
8. Dock label number agreement: Flow vs Flows (his lean:
   Flows) - no label churn until his decision lands.

## CLOSE-OUT ADDENDUM - final battery + reconciliation checklist

Final battery on the amendment tip (integrated 2a313be4 + the
V-1 seed fix + the V-5 label fix, committed as the final tip):

- Backend: 3,341 tests. Two failures in the loaded full run -
  HumanValidationTest (longitudinal compound) and
  CompoundQualityTest (dyad maturity), both CPU-ratio quality
  tests that ran while the capture rigs were driving the same
  box; standalone 25/25 green three consecutive times.
  Recorded as load-flakes with standalone evidence (the R20
  protocol). Every other suite green, including the new V-1
  seed pin and the Sameness/self-mirror species.
- API regression (fresh DB opal_dev_r20api3, virgin accounts):
  101 PASS / 0 FAIL.
- Web: 23 failed tests / 16 files - the exact pre-amendment
  baseline set, name-for-name (all legacy opalUi + activation/
  availability/designTokens/onboarding/technicolor files; zero
  amendment-touched files) - 2,007 passed.
- Typecheck: exactly 9 (baseline). Mobile: 105/105 (mobile
  sources untouched by the validation fixes; verified on the
  integrated tip). Step-zero: 117 migrations, none added.

### Reconciliation checklist - every founder item, 2026-10-20

Base wave (full record in the sections above):
- F-1 lane boxing - DONE (R20 base; protected praise re-proven).
- F-2 composer furniture - DONE as amended by R-3 (mic inside).
- F-3 long-press card - DONE (protected design; anchoring fixed
  under R-4/V-3, menu byte-identical).
- F-4 vault gate + Settings PIN - DONE (R20 base).
- F-5 dock orb opacity - DONE (re-proven in dock-closeup set).
- F-6 duplicate-person integrity - DONE (two distinct accounts,
  never blended; pinned).
- F-7 create-plan WHO - DONE (R20 base).
- F-8 start-a-chat ordering + by-phone - DONE (R20 base).
- F-9 connectors - DONE as rebuilt by R-2 (v1 rejected; v2 in
  the handoff's V-6 table).
- F-10 Center assets - DONE (R20 base).
- F-11 Horizon/Past as cards - DONE (R20 base).
- F-12 settled-declined noise - DONE (R20 base).
- F-13 spine interactivity - DONE (R-5 replaced its stray dots
  with labeled markers; taps unchanged).
- F-14 multi-day dates - DONE (R20 base).
- F-15 repeat a plan - DONE (R20 base).
- F-16 limbo on plan surfaces - DONE, refined by R-6
  (derivation fixed; legible countdown).
- F-17a connected calls - DONE (R20 base frames stand).
- F-17b fork + closure - DONE; the DEFECT it exposed (stage
  jobs never rescheduled at window-set) fixed and charged;
  frames re-shot on the amended build under V-3.
- F-17c leave-by - DECLARED (staging create path; R20 record).
- F-18 lightest-true-change - DONE (R20 record).
- F-19 orbit screen - DONE as rebuilt by R-1 (v1 rejected).
- F-20 connector-powered spine - DONE as architecture record
  (section above) + honesty at the taps.
- F-21a notification deep-links - DONE (pin; R20 record).
- F-21b group etiquette - DONE by frames in this wave
  (group limbo orbit + group orbit room).
- F-21c cold-user legibility - DONE at the rendered inspection
  (Connectors + Private graphs read cold; recorded in R20).

Amendment wave:
- R-1 Orbit v2 + Center Law + Calm Law + Voice Law - DONE
  (CB/CC; frames both modes).
- Orbit Law 2 (Sameness Test) - DONE; standing species; the
  ZX-A5 gap it exposed fixed and charged.
- Push to Chat - DONE (frames both modes; pins hold).
- R-1(g) density inheritance - DONE (period pills rendered).
- R-1(h) Ethics Constitution - DONE as recorded; self-mirror
  BUILT (minimal); articles 1/2/5 are law in the prompt/record;
  article 4 (fading scaffold) DECLARED intelligence-phase.
- Sparse-orbit texture (promise, not absence) - DONE (empty
  orbit frames: teaching line + first-question invitation).
- Bidirectional orbit - PARTIAL BY RECORD: composer language
  rendered; the capsule-filing ACTION DECLARED (no silent
  wiring) and founder-gated.
- Orbit Law 3 (Truth of Misalignment) - DONE as law in the
  report + prompt doctrine; escalation guard refined (kind
  delivery, undiluted content).
- Orbit Law 4 (Two True Perspectives) - DONE as record +
  sourcing discipline in the shipped projection; the fuller
  bilateral rendering DECLARED intelligence-phase.
- R-1 doorway parity (calls) - DONE via the call log row;
  the in-call doorway DECLARED (no caller wires it yet),
  founder-gated.
- R-2 Connectors v2 - DONE (founder-validated; V-6 table).
- R-3 Composer model - DONE (frames both modes).
- R-4 Dock anchoring - DONE (root cause fixed; CSS pins).
- R-5 Stray dots - DONE (labeled markers).
- R-6 Limbo precision - DONE (derivation + legibility).
- R-7 Membership dynamics - DONE as model record (report
  section 10); builds DECLARED + founder-gated; nothing faked.
- Rename: Home to Flow + water glyph - DONE (dock/rail/mobile;
  legacy shells' labels DECLARED founder-gated; Flow vs Flows
  untouched per the open question).
- V-1 identity coherence - DONE (seed fix + pin + glass proof).
- V-2 dissolve + inset audit - DONE (frames + measurements).
- V-3 dock position invariant - DONE (fixed + pinned + the
  etiquette set re-shot).
- V-4 pack hygiene + archive rule - DONE (live pack
  version-consistent for touched surfaces; pack-archive/ with
  version labels + README).
- V-5 "Drop it" to "Let it go" - DONE (3 sites + copy; pins;
  glass proof).
- V-6 connectors per-row table - DONE (above).
- System model (sets/likes-dislikes/nouns-verbs/truth-in-model/
  coherence) - DONE as records (WALLET_MAP addendum + orbit
  report section 11); the coherence pass's one contradiction
  (fold-born titles) named under V-1 with its fix + gated
  remainder.
- Movement Continuity lens - DONE (inspection section above;
  one carried break named: the fork's in-place answer controls,
  founder-gated since R20).

Nothing in the founder's 2026-10-20 conversation is silently
dropped: every item above is DONE with evidence or DECLARED
with its reason and its gate.

---

## POSTSCRIPT - Flows label micro-fix (founder decision 2026-10-20 12:51 PDT)

The open question left above ("Flow vs Flows untouched") is
RESOLVED by the founder: the social surface's navigation name is
**Flows** - the plural set Flows / Chats / Graphs / You (his
rationale: everything out there is many; the user is one).
Branch `muse/r20-flows` from 14ab0ecb; visible naming only -
route keys, testIds, the IconFlow water glyph, internal
identifiers, and the product concept "Social Flow" unchanged.

- Web: C2Shell dock slot + wide side-rail slot label Flow ->
  Flows; C2ShellReview dock label likewise; the slot-order
  comment updated to match.
- Mobile: PRIMARY_TABS home tab label + a11y ("Flows, social
  orientation"), HomeScreen accessibilityLabel, and the
  releaseReadiness checkLabel updated in step.
- Pins: c2ShellSurfaces.test.tsx now asserts "Flows" in dock +
  rail (text, aria-label, and both full label arrays). Results:
  web shell suite 36 files / 335 tests PASS (incl. the targeted
  45); mobile full suite 105/105 PASS.
- Glass proof (served wt-r20-flows dist via vite preview :5173,
  Phoenix :4000, phone 390x844, seat A): pack-v2 frames
  flows-rest-dark/light + flows-dock-dark/light; DOM assertion
  in both modes: dock = [Flows, Chats, Graphs, You], side =
  [Flows, Chats, Opal, Graphs, You]. Capture note: the on-frame
  badge reads the base tip (seed - 14ab0ec) because the tag is
  stack-configured; the rendered "Flows" label is itself the
  build proof - it cannot render from the pre-fix dist.
- Environment note: the capture Postgres (:5433) had died after
  the R20 close; restarted from polish-scratch/pgdata2, and the
  capture Phoenix was restarted on wall time (the recorded
  final state). No data touched - all staging data is synthetic.
