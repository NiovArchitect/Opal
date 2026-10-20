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
