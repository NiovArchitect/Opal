# Repair #18 regression suite - case index

Generated from the regression catalog by lib/generate-case-index.mjs. Do not edit by hand.

Total permanent cases: 105. Automatable at the real path: 101. Phone-checklist only: 4.

| Case | Title (founder symptom, short) | Theme | Automatable | Phone checklist |
|---|---|---|---|---|
| FR-05-01 | Center send leaked into a human chat; Center plan bounced him into Chats | No scripted responders, no seed impersonation, no fake success | yes | no |
| FR-11-01 | Messages appeared, moved, then vanished after leaving and re-entering a thread; Opal suggestions vanished too (F01, F02) | No scripted responders, no seed impersonation, no fake success | yes | no |
| FR-17-01 | Center painted "Done. X is on your Graph." replies that were fabricated, even when the send failed (F17-01 second responder) | No scripted responders, no seed impersonation, no fake success | yes | no |
| FR-12-01 | Fixture rows painted as if real: "Sadeil + 3 are here", "Maya is on the way - 8 min", sample ideas, hollow error states, seed banner missing on some shells (F12-12, F12-57, F12-09, F17 filed-open Home fixtures, F14-17) | No scripted responders, no seed impersonation, no fake success | yes | no |
| FR-13-01 | Fake success on dead plans: proposing or accepting a change on a cancelled/completed plan "worked"; accepting an old superseded revision silently rolled the plan back (F13-01, F13-02, F12-62) | No scripted responders, no seed impersonation, no fake success | yes | no |
| FR-15-01 | Story share announced "shared" before the backend answered; "Post" never persisted at all - it wrote to state nobody read (F15-05, F15-08) | No scripted responders, no seed impersonation, no fake success | yes | no |
| FR-11-02 | Opal claimed things that never happened: free-floating "Locked in!", reminders it cannot set, bookings it never made (F14-03 stale-claim contract, F13-12, F13-04 fictional Graph confirm destination) | No scripted responders, no seed impersonation, no fake success | yes | no |
| FR-11-03 | "Cancel" behaved like a sentiment, not a state change; no authority check, no participant handling (F04) | Plan authority: change time, confirm, cancel, duplicates | yes | no |
| FR-11-04 | Confirming repeatedly dead-ended; the plan never advanced and the UI kept asking (F05, H2) | Plan authority: change time, confirm, cancel, duplicates | yes | no |
| FR-12-02 | "Change dinner to 8 PM" produced copy but the plan never moved - or moved, then reverted to Thursday 7:30 on other surfaces (F12-02, F12-02c, F12-13, R6 time-correction dead, F17-07, F18-02) | Plan authority: change time, confirm, cancel, duplicates | yes | no |
| FR-17-02 | Change-time phrasing failed silently: verb not immediately followed by the clock matched nothing; "8pm" normalized to "8: PM" (F17-07 sub-defects) | Plan authority: change time, confirm, cancel, duplicates | yes | no |
| FR-13-02 | "Cancel the dinner plan" and "cancel all plans" started a creation flow; "move dinner to Saturday" dead-ended (F13-05, F13-08) | Plan authority: change time, confirm, cancel, duplicates | yes | no |
| FR-14-01 | "Any upcoming plans?" created a plan instead of answering (F14-02; noted unfixed in R13) | Plan authority: change time, confirm, cancel, duplicates | yes | no |
| FR-12-03 | A days-old or cancelled plan_id in context hijacked unrelated utterances (F12-13, F12-53) | Plan authority: change time, confirm, cancel, duplicates | yes | no |
| FR-12-04 | A change proposal sat at "Waiting on one response." forever (F12-58; R11 W4 expiry partial) | Plan authority: change time, confirm, cancel, duplicates | yes | no |
| FR-11-05 | Double-accept / repeated opportunity taps created two plans or re-formed a pending plan (R11 W3, R6 re-walk "repeated opportunity taps") | Plan authority: change time, confirm, cancel, duplicates | yes | no |
| FR-18-01 | Eight duplicate forming plans for the same intent; merely opening a conversation minted a plan (F18-06) | Plan authority: change time, confirm, cancel, duplicates | yes | no |
| FR-18-02 | Double-booking was never flagged; "change dinner to 8 PM" with several candidate plans picked one silently (F18-03) | Plan authority: change time, confirm, cancel, duplicates | yes | no |
| FR-12-05 | Garbage or invented schedules persisted: labels with no time signal stored verbatim; "Saturday after 10" invented PM; parse defaults invented (F12-54, F12-49, F13-06) | Plan authority: change time, confirm, cancel, duplicates | yes | no |
| FR-06-01 | Plan leadership was invisible - nobody could tell who leads or controls a plan (R6 re-walk; R11 Layer D; FL-R6-PASS non-organizer protection) | Plan authority: change time, confirm, cancel, duplicates | yes | no |
| FR-06-02 | A generic Friday dinner inherited Maya; a birthday inherited Coronado and Night Hawk (R6 re-walk, FL-R8-01, R5 stale-WHO) | Center routing, sticky context, continuity | yes | no |
| FR-08-01 | An explicit time was softened: "The Henry, Sunday 10 AM" became 7:30 (FL-R8-02) | Center routing, sticky context, continuity | yes | no |
| FR-10-01 | Center kept re-engaging an old person/topic after he changed subject: "Remind me what Opal can do" got a Maya nudge; direct questions got "You mentioned X earlier" (F06, FL-R10-01, F13-10, F17-08 partial) | Center routing, sticky context, continuity | yes | no |
| FR-17-03 | Opal asked "food, outdoors, or nightlife?", he typed "Food", and it lost continuity and re-engaged Maya (F17-08) | Center routing, sticky context, continuity | yes | no |
| FR-17-04 | A bare "yes" resurrected a dead flow: "Done. Nighthawk with Maya is set up" when he never asked (F17-09; also R5 double "set this up?", F13-07 "yes" twice made two plans) | Center routing, sticky context, continuity | yes | no |
| FR-17-05 | A NEW request was answered as an update: "Schedule a date night with Chanelle tonight 5 PM" got "Updated - tonight 5 PM. Same plan, same people." and no completion (F17-10) | Center routing, sticky context, continuity | yes | no |
| FR-09-01 | A stuck search captured the thread: Chanelle messages triggered venue searches; "cancel the search" was ignored; stale results painted after New Chat (FL-R9-01, FL-R9-04, FL-R9-05, FL-R8-03) | Center routing, sticky context, continuity | yes | no |
| FR-09-02 | Recall answered the wrong topic: a Maya/birthday question got the sticky Henry venue (FL-R9-08; F14-12 Maya-trigger recall) | Center routing, sticky context, continuity | yes | no |
| FR-13-03 | "Who's coming?" and "Where is dinner?" dead-ended at "Tell me more" (F13-11; F12-04a "where is The Henry" incoherence; F12-31 birthday copy claimed a private thread) | Center routing, sticky context, continuity | yes | no |
| FR-18-03 | Center never actually thought: "what city am I currently in?" got a template deflection, both replies were stored templates with llm_called false, and stale entities (who=Maya, what=Nighthawk) hijacked the parse (F18-08) | Center routing, sticky context, continuity | yes | no |
| FR-12-06 | Extraction invented people and places: "The Henry in Coronado on Sunday at 10 AM" surfaced Henry, Coronado and "AM" as people; "Los Angeles" truncated to "Los"; the same search job ran twice on case variants (F12-30, F12-40, F12-42, F12-43) | Center routing, sticky context, continuity | yes | no |
| FR-12-07 | Plans created in Center were invisible in Graphs, Timeline and the peer's chat (F12-06, F12-07) | Center routing, sticky context, continuity | yes | no |
| FR-07-01 | "Find Nighthawk in Coronado" returned Crown Bistro / Night & Day Cafe / Clayton's - anything but the real Night Hawk, 1315 Orange Ave (R6 re-walk, FL-R7-001, F12-03) | Venue search and provider honesty | yes | no |
| FR-07-02 | "Find three Mediterranean restaurants" returned the same exact-venue leftovers and invented a day: "Got it - Friday night in Coronado", "dinner Friday Friday" (FL-R7-002, FL-R7-007, FL-R7-008, FL-R10-05) | Venue search and provider honesty | yes | no |
| FR-17-06 | "Dave & Busters near me" was blocked because the name was not perfect and no locality was given (F17-11) | Venue search and provider honesty | yes | no |
| FR-10-02 | Unresolved venues: The Henry Geoapify lookup never resolved - the product must stay honest, keep the requested identity, and never fabricate a match (FL-R10-04, FL-R9-03 partial, F15-11 generic place-lock) | Venue search and provider honesty | yes | no |
| FR-12-08 | "Near me" never worked: no coords left the client, GPS coords 422'd or were silently dropped on write, and a hardcoded travel_minutes: 18 was persisted as if computed (F07, FL-R10-06, F12-11 a-f, F12-41, F12-63) | Location | yes | no |
| FR-12-09 | "Three things near me" without permission must ask honestly; with coords it must actually search (F07 residual, F12-11d, F12-11e) | Location | yes | no |
| FR-18-04 | Attendance disagreed with itself: graph said 4 of 4 going, chat said 3 of 4, and the chat never updated (F18-01) | Cross-surface consistency and projections | yes | no |
| FR-17-07 | "All the colors are the same" and the chat-log color did not change when the status changed inside the thread (F17-05, walk item 4; re-found as F18-07) | Cross-surface consistency and projections | yes | also |
| FR-12-10 | The Next Together strip kept showing 7:30 after the plan moved to 8:00, rendered duplicates, and the Center Now card showed a time with no who and no where (F12-08, F12-32, F18-09) | Cross-surface consistency and projections | yes | no |
| FR-17-08 | The Center header strip showed fixture times "3:30 / 7:30" instead of his real day (F17-12, walk item 13) | Cross-surface consistency and projections | yes | no |
| FR-07-03 | Chat - plan - Back landed on Graphs instead of back in the chat (FL-R7-004) | Cross-surface consistency and projections | yes | no |
| FR-07-04 | New messages appeared above older ones in a human thread (FL-R7-005) | Cross-surface consistency and projections | yes | no |
| FR-11-06 | Plan signals never arrived: proposal and revision broadcasts were dropped by the channel filter for every user (R11 H1); broadcasts could also fire before commit, painting ghost plans (R11 W2) | Cross-surface consistency and projections | yes | no |
| FR-12-11 | "Schedule date night" stalled after creation: no calendar entry, no restaurant proposal, no next steps; chat-born plans got none of it either (F12-05, F16-11) | Cross-surface consistency and projections | yes | no |
| FR-05-02 | Keyboard sat wrong: huge gap above the keyboard, dock stole space, composer under the dock mark (R5 board; R10 phone checklist; Reality Repair KEYBOARD_SAFE = PARTIAL) | Composer, scroll, layering, visual containment | no | only |
| FR-07-05 | Multiline text escaped the composer shell (FL-R7-003, R6 re-walk) | Composer, scroll, layering, visual containment | yes | no |
| FR-09-03 | Scroll misbehaved three ways: forced to bottom on every update; Jump-to-latest clicked and snapped back to the top; late send timers re-pinned after reading history (FL-R9-06, FL-R10-02, FL-R10-03) | Composer, scroll, layering, visual containment | yes | no |
| FR-08-02 | Things rendered behind other things: graph detail painted under chat chrome; the story composer sat behind the whole social screen; the Next Together card rendered over / behind thread content (FL-R8-07, F17-03, F17-06c, F18-05) | Composer, scroll, layering, visual containment | yes | also |
| FR-17-09 | Chat-list pill text hung outside its pill: "farmers market plus coast" and "coast" outside the pill (F17-04) | Composer, scroll, layering, visual containment | yes | no |
| FR-17-10 | The composer had a stray arrow inside it and typed text clashed under the voice button (F17-06 a/b) | Composer, scroll, layering, visual containment | yes | no |
| FR-11-07 | The "Confirm" button overflowed the right edge of the message area on his phone (F03) | Composer, scroll, layering, visual containment | no | only |
| FR-06-03 | Visual artifacts on the plan-detail / graph surface (R6 re-walk FAIL, R11 "graph visual artifacts remain BLOCKED") | Composer, scroll, layering, visual containment | no | only |
| FR-12-12 | Rendering polish failures he screenshotted: times with no AM/PM, "What is taking shape" grammar, blank time lines on dateless plans, word-boundary wrapping breaks (F12-10, F12-01, F12-45, F12-15) | Composer, scroll, layering, visual containment | yes | no |
| FR-17-11 | "If I wanted to clear the chat with Opal how come it's not clearing - we should have new chats the same way Muse has" (F17-13; earlier FL-R9-07 no escape from a contaminated thread) | Chat sessions, Center IA, account isolation | yes | no |
| FR-18-05 | Center chat switching went insane: 47 conversation switches in one session, chats blended into each other, one giant 135-message thread held everything (F18-08 IA + thrash) | Chat sessions, Center IA, account isolation | yes | no |
| FR-08-03 | Center blocked after the first send; double-tapping Send duplicated the message and re-ran the pipeline (FL-R8-04, F13-09) | Chat sessions, Center IA, account isolation | yes | no |
| FR-12-13 | Switching accounts leaked the other account's plans and travel state through globally-keyed local storage; a name lookup could attach a plan to a same-named stranger on another account (F12-51, F12-52, F12-56) | Chat sessions, Center IA, account isolation | yes | no |
| FR-15-02 | His verification code could not be autofilled - iOS never offered it; the code had to be typed by hand (F15-01) | Onboarding, OTP, permissions | no | only |
| FR-16-01 | "Skip for now" on phone verification was a dead control for every real user - it only answered "Phone verification is required" (F16-05) | Onboarding, OTP, permissions | yes | no |
| FR-16-02 | Unreachable onboarding screens (fr08-fr10) duplicated live asks and one promised a photo upload that does not exist; a deleted orphan flow (ActivationFlow) duplicated the real one (F16-06, F16-07) | Onboarding, OTP, permissions | yes | no |
| FR-16-03 | PermissionBootstrap forced all three permission decisions before any payoff - Continue was gated on every row (F16-08) | Onboarding, OTP, permissions | yes | also |
| FR-15-03 | Close-circle stories reached NOBODY - the default audience's eligibility was literally author == viewer (F15-02) | Stories, posts, graph-create durability | yes | no |
| FR-15-04 | Stories broke on real inputs: a string ttl crashed with a 500, a non-positive ttl "succeeded" born-expired, real captured media (data: URLs) silently rendered as nothing, captions could not be added (F15-03, F15-04, F15-06, F15-07, F16-17) | Stories, posts, graph-create durability | yes | no |
| FR-15-05 | Publish accepted ANY media ids - nonexistent ones, and other users' media, whose bytes then served to your audience; empty posts persisted; the form was prefilled with fiction (F15-09, F15-10, F16-03 graph-mode prefill) | Stories, posts, graph-create durability | yes | no |
| FR-16-04 | Graph-create completions ("Add to graph", Repeat, plan-from-chat) vanished on navigation - same write-only-state disease as the Post bug (F16-01, F16-02) | Stories, posts, graph-create durability | yes | no |
| FR-18-06 | The story composer was buried - not reachable from the home / social entry point (F18-04) | Stories, posts, graph-create durability | yes | no |
| FR-13-04 | Settings lied: the YOU screen showed a fabricated "1 active session" and "No active blocks"; two whole settings screens were dead (one note, zero controls, unreachable) (F13-13, F13-14; F15-14 connected-sources; F17 walk item 14 hub search + "last checked") | Settings, profile, proactivity | yes | no |
| FR-16-05 | Profile facts were all-or-nothing at onboarding; the ask-once mechanism existed but could never fire in a real flow (F15-16, F16-10) | Settings, profile, proactivity | yes | no |
| FR-16-06 | Proactive machinery was dead or lying: two mechanisms had zero production producers, Home "recent changes" was permanently empty, TFT loop kinds never fired, and proactive opt-out silently never saved (F15-12, F16-12, F16-13, F16-14, F16-15, F16-16) | Settings, profile, proactivity | yes | no |
| FR-14-02 | The product only understood HIS circle and HIS places: person extraction knew only Maya/Jordan/Chanelle/Alex, place extraction only 7 venues (F14-06, F14-07) | Person-agnostic behavior, hardcodes, gyroscope | yes | no |
| FR-14-03 | New users saw the founder's friends and the founder's copy: a who-picker fabricated 9 people with founder-circle avatars; trip templates, fallbacks and defaults named Chanelle, Maya, Jordan, Juniper & Ivy (F14-08 to F14-12; also F14-15 first-run "Sadeil" persona - design-frozen, see coordinator section) | Person-agnostic behavior, hardcodes, gyroscope | yes | no |
| FR-14-04 | Coordination behaved differently (or was untested) across relationship types; family was one flat type (F14-13, F15-15) | Person-agnostic behavior, hardcodes, gyroscope | yes | no |
| FR-11-08 | Structural disease behind half the ledger: two authority systems mutated the same plan rows, expiry fields nothing read, LLM output could become state, nil/junk ids crashed public entry points with 500s (R11 W1, W4, W5; F12-59, F12-61, F16-04, F13 gyroscope) | Person-agnostic behavior, hardcodes, gyroscope | yes | no |
| FR-14-05 | The founder seed itself was corrupt: transposed stable ids renamed Alex to "Nina" and collided on the unique handle (F14-05); seed re-runs also re-fired repeatedly in one session (F18 Mac evidence: 5 seed POSTs in one walk) | Person-agnostic behavior, hardcodes, gyroscope | yes | no |
| FR-17-12 | Tests themselves failed depending on the time of day - quiet-hours gates read the real wall clock, so the suite went red in the 22:00-08:00 Pacific window (F17-02, walk item 1) | Clock, bucketing, misc rendering truth | yes | no |
| FR-12-14 | Dateless plans were bucketed to "next week"; a missing graph rendered a hollow sheet; load errors showed raw exception text (F12-47, F12-46, F12-44) | Clock, bucketing, misc rendering truth | yes | no |
| FR-14-06 | Every voice / listen / transcribe path CRASHED on a non-macOS host because an unguarded launchctl call raised instead of returning "disabled" (F14-01) | Clock, bucketing, misc rendering truth | yes | no |
| FR-17-13 | Splash 1 carried no canon logo text - just a character crop with stray text fragments (F17-14, walk item 16; splash-2 boundary law) | Splash, brand, character, TestFlight | yes | also |
| FR-17-14 | The Center character read as a static image; presence states could stick on listening/processing forever (F17-15, walk item 15) | Splash, brand, character, TestFlight | yes | also |
| FR-17-15 | TestFlight was blocked repo-side: expo-notifications undeclared, no testflight profile (F17-16, walk item 17) | Splash, brand, character, TestFlight | yes | no |
| B1-S1 | Create virtual plan end to end: explicit place type, honest join, no physical machinery | virtual-place | yes | no |
| B1-S2 | Convert physical dinner to virtual (propose, hold, accept) and back, venue restored | virtual-place | yes | no |
| B1-S3 | Virtual and physical plans at the same stage agree on every surface; only the affordance differs | virtual-place | yes | no |
| B1-S4 | Physical plans unchanged: in_person defaults, maps/leave intact, completion machinery intact, plus the additive place object | virtual-place | yes | no |
| B1-S5 | Refusals and honesty: no split physical+virtual record, terminal/cross-account/bogus conversions refused, no fabricated URL | virtual-place | yes | no |
| FR-18-02-revision | Revision read-back: a confirmed change to 8 PM must read 8 PM on every surface | revision | yes | no |
| FR-18-B2-01 | Virtual dinner completes at home: join + per-person food handoff, no physical steps, no fake order | home-completion | yes | no |
| FR-18-B2-02 | Food step honesty: handoff only, no fabricated order/confirmation/status, no slug-guessed store URL | home-completion-honesty | yes | no |
| FR-18-B2-03 | Solo at-home shape, standup gets no food step, physical completion unchanged, zero addresses anywhere | home-completion | yes | no |
| FR-18-B4 | Care rotation: siblings rotate a daily parent check-in; a miss surfaces once to exactly the set | care-rotation | yes | no |
| FR-18-B5A | Household pod: declared + accepted only; supply plan and home defaults serve the whole pod | household-pod | yes | no |
| FR-18-B5B | Solo context: silence without opt-in; a 7-day check-in rhythm with it; bias exits with the first contact | solo-context | yes | no |
| FR-18-W4-01a | W4-01a: 'Schedule 7 am church at Awaken' in a dinner thread creates a new plan (or ASKs) - never a change_proposal on dinner | send-intent | yes | no |
| FR-18-W4-01b | W4-01b: rapid duplicate sends (same key x5, no-key identical x5, cross-account key collision) apply state exactly once | send-intent | yes | no |
| FR-18-W4-01c | W4-01c: Division A revision guards hold; two-candidate ambiguity and the 'Schedule dinner' smuggle ASK with named candidates | send-intent | yes | no |
| FR-B3-01 | Check-in sweep: family circle, answers roll into one summary, unanswered stays visible | checkin-sweep | yes | no |
| FR-B3-02 | Check-in sweep: group circle marker, group replies never count, nag attack re-notifies nobody | checkin-sweep | yes | no |
| FR-B3-03 | Check-in sweep: plan participants source, frozen plan label, one open sweep per plan | checkin-sweep | yes | no |
| W4-04a | Plan title edit read back on every surface in both parties' sessions (3 varied shapes) | plan-editing | yes | no |
| W4-04b | Plan edit authority: non-participant and non-lead participant edits rejected, title unchanged | plan-editing | yes | no |
| W4-04c | Plan edit input contract: blank/whitespace/over-length rejected, schedule fields refused, terminal plans uneditable, racing revision uncorrupted, duplicate saves idempotent | plan-editing | yes | no |
| W4-02 | Thread composition: Next Together overlap, pill over bubbles, banner through header, clipped fragment | rendered-layering | yes | no |
| W4-03 | Card integrity: attendance line cut off, title losing its first letter, stray background shape | rendered-card-integrity | yes | no |

Phone-checklist only cases stay on the founder phone checklist by name in the handover; they are never silently dropped from the suite.
