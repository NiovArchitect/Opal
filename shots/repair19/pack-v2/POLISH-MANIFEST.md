# Polish wave - by-name capture manifest (pack-v2 additions)

Stack: Phoenix :4000 (wt-polish tip ad17cafdadd366825c2e1bd03f2163fe661da7f7,
DB opal_dev_polish, synthetic sessions, OPAL_CLOCK_OVERRIDE=2026-10-20T02:30:00Z)
+ vite preview :5173 (VITE_OPAL_SHELL=c2). Viewport 390x844, dark AND light.
Entry law held on every frame: opal_founder_seed=1&opal_native_host=1&opal_dev=1;
the page git stamp read ad17cafdadd366825c2e1bd03f2163fe661da7f7 in every shot
frame - correct build. The in-app dev badge "seed - ad17caf" is VISIBLE in 20
of the 26 shot frames; the 6 search frames (E26-E28) were taken on the
full-screen search surface, which does not render the chip (chip probe read
null there) - their provenance rests on the git stamp.
Sessions: synthetic provisioning via shots/regression harness
(+12025550101 Ethan Walker / +12025550102 Maya Torres); founder seed applied
once through the backend seed endpoints (runFounderSeed). Graph-lock passcode
2468 VERIFIED against the seed code path (orbitVerifyContract.test.ts and
r19Graphs.test.tsx both pin the founder-seed account passcode as "2468").

STOP CONDITION (read first): midway through the campaign the backend began
returning 429 rate_limited (retry_after 3600) on product API calls, including
/opal/plans. From that point the Graphs surface renders its honest error state
("Graphs did not load") in the browser. Capture stopped at the 429 per the
hard-stop rule; every group not SHOT below is DECLARED with that blocker where
it applies. Frames shot before the throttle bit are unaffected (Home, Center,
Chats, Thread, Search all render live data).

## A. Ambient / at-rest
1. home-rest - SHOT home-rest-dark.png / home-rest-light.png. Center opening
   at rest: orb, NEEDS YOU cards with state borders, "Opal's pick" micro-label
   visible on the lit card. NOTE: Home and Center render the same opening
   surface in this build (home-rest and center-deck-rest are near-identical).
2. center-deck-rest - SHOT center-deck-rest-dark.png / -light.png.
3. at04-ignition-before / -after - DECLARED. The open-session push could not
   be staged headlessly (single review account in the browser; the second
   account is API-only), and the fallback two-load staging (change the plan
   state via API between loads) was cut off by the 429 stop before it ran.
   Unblocks: re-run after the rate-limit window with session B accepting a
   responding plan via POST /journeys/:id/accept-going between two loads of
   session A's deck; declare that staging in the manifest when used.
4. transition-forming / transition-ready - DECLARED. Same staging dependency
   as AT-04 (a second-party state change between frames); blocked by the 429
   stop. The seed world does carry both forming-shaped and agreed plans, but
   a same-card forming -> ready pair was not honestly stageable in-session.
5. toggle-ambience-on / -off - DECLARED. The calls-assist / notifications
   settings surfaces were not reached: the You hub rows are testid-driven
   (c2-you-nav-row-*) and the text-tap path used in this pass did not open
   the filed settings panes before the 429 stop. Unblocks: navigate via
   c2-you-nav-row-* testids on a fresh (unthrottled) session.
6. callog-toggle-glow-dark (+light) - DECLARED. Call log surface not reached
   in this pass (Center orbits log path not completed before the 429 stop).
   The pre-existing pack-v2 calls-log-dark/light.png frames from the R19 pack
   remain the current call-log evidence.

## B. Thread
7. thread-opal-doorway - SHOT thread-opal-doorway-dark.png / -light.png.
   Chanelle Brooks thread: Partner tie in header, Opal orb control top-right,
   NEXT TOGETHER strip with the Action needed plan pill.
8. thread-opal-scoped - SHOT thread-opal-scoped-dark.png / -light.png.
   Frame taken after tapping the doorway control; the scoped Opal surface
   opened (dark frame differs materially from the thread frame).
9. composer-resting - SHOT composer-resting-dark.png / -light.png (the
   thread frame: composer input with the person placeholder, "Record a voice
   note" affordance above it). composer-with-text - DECLARED: the retry pass
   that located the composer input was cut off by the 429 stop; the input is
   present in the resting frame. composer-voice-note - DECLARED: the
   voice-note control is a text affordance ("Record a voice note", visible in
   the resting frame); its recording/stop state was not captured before the
   stop.
10. callog-closeup - DECLARED with group 6 (call log not reached).

## C. Cards lane (P1 + P5)
11. deck-lane - DECLARED (dark + light). No reveal-change-request lane
    button renders on the Center deck NEEDS YOU cards in the seed world.
    The cards show Confirm / Dismiss only. Per polish-cards-report.md the
    lane requires a responding-state card whose confirmed parties carry
    availability windows; no such card exists in the founder-seed world and
    arranging one via the API was cut off by the 429 stop. The P5 half IS
    proven in frame 2: "Opal's pick" micro-label on the lit card.
12. thread-lane - DECLARED. No lane button on the Chanelle thread Your-move
    strip; same arrangement blocker as 11.
13. chats-lane - DECLARED. No lane button on chats-row cards (47 rows
    probed); same arrangement blocker. The sender-fixed absence reading is
    what the captured chats/thread/deck frames show.
14. lane-doorway - DECLARED. Downstream of the lane button's existence;
    blocked by 11-13.

## D. Vault + orbit + picker
15. private-graphs-gate - SHOT private-graphs-gate-dark.png / -light.png.
    The gate is inline on Graphs: "PRIVATE GRAPHS" heading, the line
    "Private graphs show only here, and stay hidden from your other lists.",
    "Enter your passcode to open this area.", passcode field, "Open Private
    graphs" button. NOTE: no literal "Private graphs" page title separate
    from the Graphs title, and the word passcode is used in the helper line.
16. private-graphs-open - SHOT private-graphs-open-dark.png / -light.png
    with a caveat: the frames were taken after entering passcode 2468 and
    tapping "Open Private graphs"; the unlock did not visibly complete in
    the captured state (the frame still shows the gate area - the unlock
    guess probe read false). Treat as DECLARED-pending: the inside state
    (private cards + Close at the bottom) is NOT proven by these frames.
17. vault-absence-chats - DECLARED. Requires a known vaulted plan plus the
    unlock in 16; blocked upstream (and by the 429 stop).
18. vault-absence-home - DECLARED. Same upstream dependency as 17.
19. longpress-menu - DECLARED (dark + light). The real gesture was driven
    (pointer hold 850ms against LONG_PRESS_MS=500 in CardContextMenu.tsx),
    but the Graphs list carried zero c2-plan-card elements in the throttled
    state ("Graphs did not load"), so there was no card to press. Unblocks
    on an unthrottled session: the gesture path itself is implemented and
    ready.
20. longpress-menu-private - DECLARED. No plan card visible inside Private
    graphs (unlock did not complete; see 16).
21. graph-detail-overflow - DECLARED. Graph detail never opened: the list
    was in the throttled error state with no cards. Earlier pack-v2
    graph-detail-dark/light.png frames (R19 pack) remain the detail
    evidence.
22. orbit-sheet - DECLARED for this pass. The center navigator orbit path
    was not completed before the 429 stop. Earlier pack-v2
    orbit-sheet-dark/light.png frames remain the current evidence.
23. orbit-sheet-options - DECLARED with 22.
24. orbit-hidden-subtitle - DECLARED. Requires the D23 hide toggle ON for a
    group; not staged (would mutate the shared seed account for other
    frames) and blocked by 22 upstream.
25. picker-family-accordion (+collapsed) - DECLARED. The Jordan Ellis
    profile -> identify -> Family path (proven in the R19 pack's
    person-identify-family frames) did not complete in this pass before
    the 429 stop (thread open raced in the retry pass).

## E. Surfaces
26. search-empty - SHOT search-empty-dark.png / -light.png.
27. search-results - SHOT search-results-dark.png / -light.png (query
    "Maya").
28. search-nomatch - SHOT search-nomatch-dark.png / -light.png (query
    "zzzzqqq").
29. create-plan - DECLARED. Create entry on the Center opening was not
    completed before the 429 stop.
30. create-trip / create-idea - DECLARED with 29.
31. create-chat - DECLARED. chats-new-chat control not completed before
    the stop; the R19 pack's chats-new-picker frames remain the evidence.
32. create-call - DECLARED. Call setup surface not reached (downstream of
    the thread call control; see Section F).
33. create-story (+create-post-open) - DECLARED. Story composer entry on
    the You surface not completed before the stop.
34. share-plan - DECLARED. Downstream of graph detail (21).
35. share-chat-dark - DECLARED. Chat share sheet not reached.
36. share-invite-dark - DECLARED. Invite landing requires opening an invite
    link as a non-Opal recipient; not staged in this pass.
37. settings-connections - DECLARED. Hub reached (settings-hub frames
    below), the filed Connections pane did not open via the text-tap path
    before the stop. The R19 pack's settings-connections frames remain
    the current evidence.
38. settings-connection-detail - DECLARED with 37.
39. settings-reads-from - DECLARED with 37 (no separate destination was
    confirmed in this pass; frame 37's section would stand if reached).
40. your-moments (+manage, home-moment-view) - DECLARED. The Your moments
    hub row (c2-you-nav-row-your-moments) exists per the hub probe; the
    pane did not open before the stop.
41. settings-memory (+settings-memory-add) - DECLARED. The hub carries
    c2-you-nav-row-memory and c2-you-nav-row-what-opal-remembers rows per
    the probe; the panes did not open before the stop.
42. settings-hub - SHOT settings-hub-dark.png / settings-hub-light.png.

## F. In-call
43. call-connected-graphing-dark - DECLARED. The two-context call attempt
    (Section F of the capture script) never ran: the 429 stop hit first.
    Unblocks: re-run the calls cluster rig (incall-report.md path) on an
    unthrottled stack; never faked.
44. call-graphing-paused-dark - DECLARED with 43.
45. call-graphing-off-dark - DECLARED with 43.
46. call-video-dark - DECLARED with 43.
47. call-plan-context-dark - DECLARED with 43.
48. call-reduced-motion-dark - DECLARED with 43 (also needs a
    prefers-reduced-motion emulated context once connected state exists).

## G. Leave-by
49. leaveby-plan-detail - DECLARED. Graph detail never opened (throttled
    list state, see 21), so the leave-by estimate line and its honesty
    label could not be framed.
50. leaveby-leave-now - DECLARED with 49; additionally needs a plan inside
    its leave-by window at the stack clock.
51. leaveby-no-location - DECLARED with 49; the honest frame needs a
    no-location-grant account, which was not provisioned before the stop.

## H. Density + horizon - FIXTURE-FED DECLARATION
This section is declared fixture-fed by the registry (heavyPersona fixture
through the real projection builders; no Robin sign-in exists). No fixture
harness page was built in this pass: the campaign was stopped by the 429
before the harness work, and the real-seed frames that were taken
(density-graphs-all, density-graphs-past) show the throttled error state,
NOT density proof - they are retained in pack-v2 under those names as
evidence of the load failure and must not be read as density frames.
52. density-graphs-all - DECLARED (frames on disk show "Graphs did not
    load" - see defect D-1 in the report).
53. density-graphs-past - DECLARED (same error-state caveat).
54. density-past-pill - DECLARED. The Past lens in the throttled state
    carries no pills (counts read Past 0).
55. density-past-expanded - DECLARED with 54.
56. density-settled-line - DECLARED with 54 (no settled line reachable).
57. density-horizon - DECLARED. No c2-horizon-row / c2-graphs-horizon
    element rendered; the list never loaded.
58. density-spine - DECLARED. Needs the fixture-fed substantial plan;
    harness not built (see section header).
59. density-migrated - DECLARED. Needs the same plan under a second clock;
    the stack clock is fixed by env and was not restarted mid-campaign.

## I. Etiquette
Staging note: NO etiquette plan was created. The API staging step (create a
conversation plan with a short response window via
POST /conversations/:id/plans) was scheduled in the third capture pass,
which never ran because of the 429 stop. Nothing in this section was faked
and no DB rows were edited by hand.
60. limbo-sender - DECLARED (staging never ran; see note).
61. limbo-recipient - DECLARED (same).
62. fork-moment - DECLARED. Job-driven stage: fires at window expiry on
    real intervals; not reachable inside a capture session even when
    staged, without waiting the window. Unblocks: stage the plan, wait out
    the 1h window on the stack clock, re-capture.
63. closure-notice - DECLARED. Job-driven, downstream of 62.
64. window-control - DECLARED. The response-window control lives on plan
    detail; detail never opened (21).
65. window-circle-refusal - DECLARED. Downstream of 60-64 staging.

## J. Alignment shapes - coverage note
- SOLO: partially covered - settings-hub (42) and the memory surfaces are
  declared (41); Private graphs gate (15) is shot but the intentions use
  inside (16) is not proven.
- 1-TO-1: covered where shot - thread doorway + scoped (7-8), composer
  resting (9); the 1:1 call shape (43-48) is declared, vault absence on a
  1:1 plan (17-18) is declared.
- 1-TO-MANY: the deck NEEDS YOU group cards are visible in frames 1-2;
  group lane (11), limbo/fork on a group plan (60-63), crew remembers
  (41) and the density heavy world (52+) are all declared.
- Shape degradation found: none attributable to a shape; the one systemic
  degradation is the throttled Graphs load failure (defect D-1), which
  hits every shape's Graphs surface equally.

## CAMPAIGN 2 (integrator re-run, 2026-10-20, same tip ad17cafd)
Staging declarations (all synthetic, dev DB only):
- A real 1-to-1 conversation was created between the two synthetic accounts
  (Ethan Walker A, Maya Torres B) through the app's own conversation
  machinery; B joined A's world by redeeming A's personal invite code.
- P1 lane arranged for real: B created "Dinner at Bar Ama" in that
  conversation and shared her own availability window into it; A's reveal
  feed then carried the lane (GET /reveals 200, "Request a change" present).
  After the lane frames, the share was revoked through the API and the
  lane's disappearance was verified in A's feed and on the deck (0 lane
  buttons) before lane-disappearance-dark was shot.
- Density frames (16) are FIXTURE-FED: a scratch harness build renders the
  real C2Graphs/C2GraphDetail components fed by the heavy-persona fixture
  through the real list/detail projection builders, served locally. They
  prove component behavior under the 142-plan fixture; they are not the
  founder-seed account (a heavy-persona ACCOUNT in the seed world remains
  unbuilt - the fixture is the persona). Declared as such.
- Etiquette staging: B created "Coffee at Blue Bottle" inviting A inside
  the same conversation; the response window was set afterward through
  POST /opal/plans/:id/response-window (window_seconds 3600) - the create
  call's response_window_hours field does not take; recorded as an API
  finding. NOTE: the same plan also carries the P1 lane on A's deck card
  (the availability window is shared into the shared conversation).

SHOT AND INTEGRATOR-INSPECTED (campaign 2):
- deck-lane / thread-lane / chats-lane (both modes): exactly one
  "Request a change" control per surface; the deck frame shows the lane
  card beside lane-less cards (absence reads in the same frame).
- lane-doorway (both modes): lands on the scoped Opal conversation.
- lane-disappearance-dark: post-revocation deck; lane gone.
- home-rest / center-deck-rest / composer-resting / thread doorway +
  scoped: refreshed on the healthy stack.
- private-graphs-open (both modes): the UNLOCKED vault area renders
  ("No private graphs yet... it stays fully intact, and everyone else on
  it keeps their own view" + Close) - the campaign-1 D-7 suspicion is
  RESOLVED: the unlock works; campaign 1's failure was throttle collateral.
- private-graphs-gate re-shot (both modes).
- longpress-menu (both modes): Open graph / Make private / Cancel over
  the graphs list. Minor: the dev badge overlaps the Make private row
  (D-4) - the row text remains legible and the menu contents are
  DOM-verified by the capture probes.
- share-plan (both modes): the share sheet with Copy details.
- composer-with-text / composer-voice-note (both modes): SHOT in
  campaign 2 (superseding campaign 1's declarations).
- picker-family-accordion (both modes); chats-list; chats-new-picker.
- leaveby-no-location (both modes; renamed from leaveby-plan-detail):
  the plan detail's WHEN TO LEAVE section honestly reads "Leave-by is not
  available - this place has no location yet" on a seed plan without
  coordinates; the same frame proves the P12 preparation spine on a real
  served plan detail.
- density set (16, fixture-fed, declared above): past pills, horizon
  band, settled-invitation lines, past-expanded ledger rows, spine view.
- vault-absence-home (both modes).

STALE FRAME WARNING: orbit-sheet-dark.png / orbit-sheet-light.png in this
pack predate the polish build (their dev badge reads the base build
95319bd and the sheet still shows the removed prominent make-private row).
They are NOT polish evidence and are replaced or removed at finalization.

DEFECT D-8 (new, campaign 2): a Graphs error state under throttle renders
lens counts "All 0 / Past 0" (see D-1) - and Chats under throttle renders
c2-chats-error with no segment controls; both are honest error surfaces,
but the zero counts can misread as an empty account on a skim.

## CAMPAIGN 2 - ETIQUETTE TAIL (final disposition)
SHOT: etiquette-window-recipient-dark / etiquette-window-sender-dark
(mid-window, both seats); limbo-recipient-dark/light and
limbo-sender-dark/light (post-close cooling stage, both seats).
API truth at the limbo stage: recipient reveal = plan_state "action",
reveal_key "...:needs-answer"; creator reveal = "forming" /
"missing-time". The participant row carries response_window_seconds
3600, response_window_closes_at 2026-10-20 03:30:00 (app-clock basis).
DECLARED: fork-moment, closure-notice (both seats, both modes).
Blocker, precisely: the chain's stage jobs exist and are correctly
queued (Oban, events queue) but are WALL-CLOCK scheduled -
NonResponseEtiquetteWorker jobs 58 and 60 sit in state "scheduled" for
2026-10-21 02:30:00 wall time (the app-clock-derived fire time read as
a wall-clock schedule). Freezing/bumping OPAL_CLOCK_OVERRIDE moves the
app's sense of now but not Oban's scheduler, so the fork and
auto-decline cannot be rendered inside a capture session without
waiting ~19 wall hours or editing job rows in the database (refused:
staging is API/UI/clock-override only). In production app time IS wall
time and the schedule is coherent; the lifecycle transitions themselves
are pin-proven in the backend battery (3,306 tests, 0 failures, three
clocks). The five frames shot under fork/closure names during the tail
show the continued limbo state and were MOVED OUT of the pack to
polish-scratch/declared-frames/ so no frame in this pack carries a name
its pixels do not prove.
Also recorded: GET /opal/plans/:id is not a route in this build
(NoRouteError) - plan reads flow through the reveal/graph projections;
not a defect.
DEFECT D-9 (staging-environment interaction, not product logic): the
frozen dev clock and Oban's wall-clock scheduler disagree about when
etiquette stages fire; any future rendered proof of fork/closure needs
either a wall-clock wait, an Oban test-mode drain in a harness stack,
or jobs scheduled on app-clock-aware triggers.

## CAMPAIGN 2 - SEARCH VERDICT + CALLS (final)
SEARCH SETTLED on the healthy stack (final-3, network-observed UI):
queries Chanelle, Coffee, and Maya ALL return real results.
search-results-light.png (re-shot) shows "Chanelle" -> CHATS row with a
live message preview + PEOPLE row. search-results-maya-light.png shows
"Maya" -> CHATS rows (a call thread and a message thread) + PEOPLE rows.
The campaign-1/2 "Maya - No match" frames were throttle-era artifacts:
DEFECT D-10 - when the search request fails, the surface renders
"No match" rather than an error state; a failed search is
indistinguishable from a true empty result on a skim (same family as
D-1's zero counts under throttle). search-nomatch remains honestly
shot for a nonsense query on the healthy stack (capture-results).
Observation (not a defect): the seed world and the real second account
both project a "Maya Torres" person row, so people lists show her
twice (Friend / Close friend) in this staging world.
CALLS: the outgoing path is rendered-proven up to initiation - the
calls rig drove A: Chats -> Calls -> new call -> Maya Torres -> call
placed, A status read "Calling Maya Torres - ringing." The people
picker is framed as create-call-picker-dark.png. DECLARED:
call-connected-graphing, call-graphing-paused, call-graphing-off,
call-video, call-plan-context (both modes) - the rig's second seat
never surfaced the incoming-call answer control in the capture
environment, so the connected surface was not reached; the connected
call surface is built and contract-pinned (P10a cluster) and the
founder has previously proven a real two-account call end to end on
his own path (R19). This closes the W5-15 debt only up to initiation;
the connected-state frames remain the named remainder.

## CAMPAIGN 2 - FINAL DISPOSITIONS (vault, settings, leave-by, rest)
VAULT CYCLE (real UI, final-4): long-press on the "Dinner at Juniper &
Ivy" graphs card opened card-context-menu; "Make private" clicked;
the plan then ABSENT from A's Graphs list (DOM-text verified in the
run) - vault-absence-home-dark and vault-absence-chats-dark were shot
in that hidden state. DECLARED: private-graphs-filled (the vault's
inside WITH the card) and longpress-menu-private - in the capture
environment the passcode unlock did not complete from the scripted
fill (campaign 2's earlier session DID render the unlocked vault:
private-graphs-open, empty state; the unlock is also contract-pinned).
The cycle's remaining steps are test-pinned (VaultFilters sweep) and
the per-viewer rule held in every probe: B's view never changed.
SETTINGS ROOMS SHOT (dark; light declared - rooms are mode-invariant
in structure and the hub is shot in both): settings-connections-dark
(the ONE Connections room: quiet rows, "never a guess" header, Twilio
honestly "Simulated - not a real connection", Gmail/Calendar "Waiting
on you"); your-moments-room-dark (N2 clarity copy + the moment card
with "Story - live until Oct 21, 5:37 AM - Friends");
settings-memory-room-dark (N7: "Facts Opal keeps from your chats and
plans. You control them - forget any of them, for real." + the honest
short-form/fuller-form explanation + the "Memory - add what Opal
should remember" doorway). DECLARED: connections detail, reads-from
section frame, moments Manage sheet, memory Add sheet, Calls room +
toggle-ambience pair (nav races in the capture rig; AR-18 is
test-pinned and the toggle ships in the Calls room + call-log header).
CALLOG: callog-closeup-dark SHOT on the real stack - every
plan-awareness pill sits INSIDE its row's geometry ("Action needed /
Happening" pills contained at phone width, A2), state-colored rows,
varied call states.
LEAVE-BY: leaveby-no-location (both modes) + leaveby-no-start-time-dark
prove the two honest absent states on real served plan details.
DECLARED: the estimate and leave-now frames - through the public plan
create call, two field spellings (starts_at, start_at) both produced
plans whose details honestly read "No start time yet", so a timed,
coordinate-carrying plan could not be staged in the capture world;
the estimate/leave-now states are API-pin-proven (focused leave-by
suite 36/36 incl. both states, Geoapify approximated-traffic copy
"Estimate - typical traffic, not live"). A's location write itself is
proven (POST /opal/location {lat, lon} -> 200).
TRANSITION PAIR + AT-04 IGNITION PAIR: DECLARED. The forming->ready
pair needs a cross-account invite resolved to a person id; GET /people
in this build is the relationship-requests projection (connected /
incoming / outgoing), not a directory, and the staging never obtained
the id through a sanctioned read. AT-04's ignition legibility is
in-frame in home-rest (lit card + "Opal's pick" beside unlit cards);
a dedicated before/after ignition pair is declared with the same
state-change staging blocker.
ORBIT SHEET (polish build): DECLARED. The pre-polish frames were
removed from this pack (badge read the base build). The capture rig
could not open the sheet from Center in the session (the orb doorway
opens the scoped conversation, not the management sheet); the sheet
itself is contract-pinned (P4 cluster: labeled PLANS vs YOUR CHATS
WITH OPAL blocks, Orbit options, passcode-hide toggle).
LIGHT-MODE NOTE: campaign 2 shot both modes for the primary surfaces
(home, deck, thread, composer, lane set, density set, vault
gate/open, search set, settings hub, limbo set). The final-session
rooms and tail frames are dark-primary; their light counterparts are
declared above where applicable rather than silently absent.
