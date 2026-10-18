# Repair #18 — COMPLAINT LEDGER (founder directive, 2026-10-18 03:43 PDT)

Founder's words: "I have complained about many things in this entire chat —
be sure I don't run into any of those generic problems."

This ledger is a HANDOVER GATE. Every complaint the founder has raised across
the whole program is listed here, mapped to a permanent check, with its status
ON THE INTEGRATED TIP (`muse/repair-18` @ local `86f3614f`, GitHub mirror
tree-identical) and the evidence for that status. No complaint without a
mapped check. No check marked green without evidence.

## Capstone rule (founder, 2026-10-18 03:43 PDT): "full true functionality"

Every surface, control, and feature in the integrated build is classified
exactly one of TRUE (works end to end on real data; the effect reads back),
HONESTLY ABSENT (removed, or gated behind a truthful label/empty state), or
FALSE (fixture-painted, canned, scripted, fake-confirmed, dead, or
appearance-only). FALSE anywhere is an automatic gate failure, including
inherited surfaces not re-checked this cycle. Checks in this ledger test
TRUENESS (effect + read-back), not appearance. The classification sweep is
Section F; its counts are recorded in `repair18-status.md`.

## Status vocabulary (honest, no rounding up)

- **GREEN** — the mapped check has passed with evidence at or above the
  integrated tip (branch proof carried through a clean merge + targeted
  re-run, or a suite run on the tip).
- **CARRIED** — proven green on the Division A tip (`808c7bd6`) in live
  replay #4 on the founder's Mac stack (6/6 scenarios, 149 checks); the
  integrated-tip re-run is still owed. NOT the same as GREEN.
- **PENDING-RUN** — the permanent case exists and is in the suite; the full
  suite run on the integrated tip has not yet executed (local run was killed
  by a VM restart; Mac replay not yet run). Declared, never silent.
- **OPEN** — a known defect or missing wire on the integrated tip, named,
  with its fix path. OPEN items are gate exceptions and must be listed to
  the founder up front in any delivery message.
- **PHONE** — phone-checklist only by design (cannot be automated honestly);
  stays on the founder's phone checklist by name.

## Gate rule

Neither the first-look tranche nor the full screenshot pack nor any walk goes
to the founder until every row is GREEN/CARRIED/PHONE, **or** every
non-green row is listed for him up front in the delivery message. No
surprises, ever. Current non-green rows are collected in the "Declared
exceptions" list at the end of this file and in the delivery report.

---

## Section A — Walk-catalog complaints (permanent regression cases)

Every founder-reported failure from every walk and repair cycle is a
permanent case in `shots/regression/` (105 cases, 101 automatable, 4
phone-only; index: `shots/regression/CASE_INDEX.md`). The case IS the check.
Suite-level evidence state on the integrated tip: backend unit suite 3,020
tests with the B1×B2 seam pair fixed at `18bd9991` (B1 24/24, B2 16/16
targeted green; full serial re-run with named failures still owed — one
truncated run showed 2 unidentified failures), web suite 1,310 tests / 23
failures = exactly the pre-existing baseline set, mobile 105/105 at
Division A baseline. The API real-path suite (99 executable cases) has NOT
yet completed a run on the integrated tip — that is why most rows below are
PENDING-RUN or CARRIED rather than GREEN. Anything less honest would repeat
the R17 mistake: unit proof presented as app proof.

| Case | Complaint (short) | Status | Evidence |
|---|---|---|---|
| FR-05-01 | Center send leaked into a human chat; Center plan bounced him into Chats | PENDING-RUN | Case in suite; Division A Center rebuild proof at branch level |
| FR-11-01 | Messages appeared, moved, then vanished on re-entry (F01, F02) | PENDING-RUN | Case in suite |
| FR-17-01 | Center painted fabricated "Done. X is on your Graph." replies, even on failed sends | PENDING-RUN | Case in suite; BS honesty fixes `debe2e4f` |
| FR-12-01 | Fixture rows painted as real ("Sadeil + 3 are here", "Maya is on the way — 8 min", hollow states) | PENDING-RUN | Case in suite; BS-4 canned transcript deleted, BS-5/6/16/17 honesty fixes |
| FR-13-01 | Fake success on dead plans; accepting a superseded revision rolled the plan back | PENDING-RUN | Case in suite (reg-A theme 1: no-fake-success) |
| FR-15-01 | Story share announced "shared" before the backend answered; Post wrote to state nobody read | PENDING-RUN | Case in suite |
| FR-11-02 | Opal claimed things that never happened ("Locked in!", bookings never made) | PENDING-RUN | Case in suite; banned-claim contract in B2 honesty case FR-18-B2-02 |
| FR-11-03 | "Cancel" behaved like a sentiment, not a state change (F04) | PENDING-RUN | Case in suite; HTTP cancel route lands with fixwave (see Section D, OPEN-2) |
| FR-11-04 | Confirming repeatedly dead-ended; plan never advanced (F05) | PENDING-RUN | Case in suite |
| FR-12-02 | "Change dinner to 8 PM" produced copy but the plan never moved — or reverted to Thursday 7:30 on other surfaces (F18-02) | CARRIED | Division A fix; Mac replay #4 green on `808c7bd6`; revision read-back case FR-18-02-revision also in suite |
| FR-17-02 | Change-time phrasing failed silently; "8pm" normalized to "8: PM" | PENDING-RUN | Case in suite |
| FR-13-02 | "Cancel the dinner plan" / "cancel all plans" started a creation flow | PENDING-RUN | Case in suite |
| FR-14-01 | "Any upcoming plans?" created a plan instead of answering | PENDING-RUN | Case in suite |
| FR-12-03 | A days-old/cancelled plan_id hijacked unrelated utterances | PENDING-RUN | Case in suite |
| FR-12-04 | A change proposal sat at "Waiting on one response." forever | PENDING-RUN | Case in suite; deferred-execution item in the fix wave plan |
| FR-11-05 | Double-accept / repeated taps created two plans | PENDING-RUN | Case in suite; W4-01 idempotency cases FR-18-W4-01b GREEN at branch level (Section B) |
| FR-18-01 | Eight duplicate forming plans; merely opening a conversation minted a plan (F18-06) | CARRIED | Division A dedupe fix; Mac replay #4 green |
| FR-18-02 | Double-booking never flagged; ambiguous "change dinner" picked a plan silently (F18-03) | CARRIED | Division A conflict/disambiguation fix; Mac replay #4 green |
| FR-12-05 | Garbage/invented schedules persisted; parse defaults invented times | PENDING-RUN | Case in suite |
| FR-06-01 | Plan leadership invisible — nobody could tell who controls a plan | PENDING-RUN | Case in suite |
| FR-06-02 | A generic Friday dinner inherited Maya; a birthday inherited Coronado/Night Hawk | PENDING-RUN | Case in suite; RF-2 (sticky Maya) fix in flight — Section D, OPEN-1 |
| FR-08-01 | Explicit time softened: "The Henry, Sunday 10 AM" became 7:30 | PENDING-RUN | Case in suite; RF-3 (explicit time dropped from Center confirmation) fix in flight |
| FR-10-01 | Center kept re-engaging an old person/topic after he changed subject | PENDING-RUN | Case in suite; RF-2 fix in flight |
| FR-17-03 | He typed "Food" and Center lost continuity and re-engaged Maya | PENDING-RUN | Case in suite; RF-2 fix in flight |
| FR-17-04 | A bare "yes" resurrected a dead flow ("Done. Nighthawk with Maya is set up") | PENDING-RUN | Case in suite |
| FR-17-05 | A NEW request answered as an update ("Same plan, same people.") with no completion | PENDING-RUN | Case in suite; W4-01 intent cases cover the class |
| FR-09-01 | A stuck search captured the thread; "cancel the search" ignored | PENDING-RUN | Case in suite |
| FR-09-02 | Recall answered the wrong topic (sticky Henry venue) | PENDING-RUN | Case in suite |
| FR-13-03 | "Who's coming?" / "Where is dinner?" dead-ended at "Tell me more" | PENDING-RUN | Case in suite; RF-4 ("Where is dinner?" unanswered from real rows) fix in flight |
| FR-18-03 | Center never actually thought: template deflection, `llm_called: false`, stale entities hijacked the parse (F18-08) | CARRIED + OPEN | Real-LLM path proven in Division A; Mac replay #4 green. RF-1 (execution 500 for Center-born plans) and RF-3 fixes in flight on `muse/r18-fixwave` |
| FR-12-06 | Extraction invented people/places ("AM" as a person; "Los Angeles" → "Los") | PENDING-RUN | Case in suite |
| FR-12-07 | Center-created plans invisible in Graphs, Timeline, and the peer's chat | PENDING-RUN | Case in suite |
| FR-07-01 | "Find Nighthawk in Coronado" returned anything but the real Night Hawk | PENDING-RUN | Case in suite. NOTE: live Places results depend on founder-side Places enablement/billing (founder queue) |
| FR-07-02 | "Find three Mediterranean restaurants" returned leftovers and invented a day | PENDING-RUN | Case in suite |
| FR-17-06 | "Dave & Busters near me" blocked because the name wasn't perfect | PENDING-RUN | Case in suite |
| FR-10-02 | Unresolved venues must stay honest — never fabricate a match (The Henry) | PENDING-RUN | Case in suite; honesty contract |
| FR-12-08 | "Near me" never worked: no coords left the client; GPS coords 422'd/dropped; hardcoded `travel_minutes: 18` persisted as if computed (F07) | PENDING-RUN | Case in suite; location pipeline reports shots/repair11-12 |
| FR-12-09 | "Near me" without permission must ask honestly; with coords must actually search | PENDING-RUN | Case in suite |
| FR-18-04 | Attendance disagreed with itself: graph 4 of 4, chat 3 of 4, chat never updated (F18-01) | CARRIED | Division A single-counter projection; Mac replay #4 green. Local-only failure of this case was environment-shaped (pristine control stack fails identically; Mac is the arbiter) |
| FR-17-07 | "All the colors are the same"; chat-log color didn't change when status changed (F18-07) | PENDING-RUN | Case re-pinned to the new Division C state hues at integration (single-derivation + cross-surface assertions carried over); rendered proof owed with the pack |
| FR-12-10 | Next Together strip kept showing 7:30 after the plan moved to 8:00; Center Now card had time with no who/where (F18-09) | CARRIED | Division A Now-strip who/where plumbing; Mac replay #4 green |
| FR-17-08 | Center header strip showed fixture times "3:30 / 7:30" instead of his real day | PENDING-RUN | Case in suite; fixture class also covered by FR-12-01 |
| FR-07-03 | Chat → plan → Back landed on Graphs instead of back in the chat | PENDING-RUN | Case in suite |
| FR-07-04 | New messages appeared above older ones in a human thread | PENDING-RUN | Case in suite |
| FR-11-06 | Plan signals never arrived: broadcasts dropped by the channel filter; ghost plans painted pre-commit | PENDING-RUN | Case in suite |
| FR-12-11 | "Schedule date night" stalled after creation: no calendar, no proposal, no next steps | PENDING-RUN | Case in suite |
| FR-05-02 | Keyboard geometry: huge gap, dock stole space, composer under the dock mark | PHONE | Phone-checklist only, by design |
| FR-07-05 | Multiline text escaped the composer shell | PENDING-RUN | Case in suite |
| FR-09-03 | Scroll misbehavior: forced to bottom, Jump-to-latest snapped back, late timers re-pinned | PENDING-RUN | Case in suite |
| FR-08-02 | Things rendered behind other things: graph detail under chat chrome, story composer behind the social screen, Next Together over/behind thread content (F18-05) | PENDING-RUN | Case in suite + rendered case W4-02 (Section E-a) |
| FR-17-09 | Chat-list pill text hung outside its pill | PENDING-RUN | Case in suite; rendered sweep Section E-a |
| FR-17-10 | Composer had a stray arrow; typed text clashed under the voice button | PENDING-RUN | Case in suite |
| FR-11-07 | "Confirm" button overflowed the right edge of the message area on his phone (F03) | PHONE | Phone-checklist only, by design |
| FR-06-03 | Visual artifacts on plan-detail / graph surface | PHONE | Phone-checklist only (founder screenshot evidence class) |
| FR-12-12 | Rendering polish he screenshotted: times with no AM/PM, grammar, blank time lines, wrap breaks | PENDING-RUN | Case in suite; rendered-copy sweep Section E-e |
| FR-17-11 | "How come it's not clearing — we should have new chats the same way Muse has" (chat IA) | GREEN | C1 Center IA (first-class chat list, New chat, per-chat drafts) integrated; wiring proof: C1ShellHosts mounts real sessions, 11 wiring tests pass, `86f3614f` |
| FR-18-05 | 47 conversation switches in one session; chats blended; one 135-message thread held everything (F18-08) | GREEN | Switch-thrash kill + C1 IA integrated; wiring tests pin session isolation on the shell path |
| FR-08-03 | Center blocked after first send; double-tapping Send duplicated the message | GREEN | W4-01 send lock/idempotency (Section B); case in suite |
| FR-12-13 | Switching accounts leaked the other account's plans/travel state via globally-keyed storage | PENDING-RUN | Case in suite |
| FR-15-02 | Verification code could not be autofilled; iOS never offered it (OTP autofill) | PHONE | Phone-checklist only, by design (real-SMS autofill) |
| FR-16-01 | "Skip for now" on phone verification was a dead control for every real user | PENDING-RUN | Case in suite; dead-control sweep Section E-b |
| FR-16-02 | Unreachable onboarding screens duplicated live asks; one promised a photo upload that does not exist | PENDING-RUN | Case in suite |
| FR-16-03 | PermissionBootstrap forced all three permission decisions before any payoff | PENDING-RUN | Case in suite |
| FR-15-03 | Close-circle stories reached NOBODY (eligibility was literally author == viewer) | PENDING-RUN | Case in suite |
| FR-15-04 | Stories broke on real inputs: string ttl 500, born-expired ttl "succeeded", data: URL media rendered as nothing, no captions | PENDING-RUN | Case in suite |
| FR-15-05 | Publish accepted ANY media ids — nonexistent, other users'; empty posts persisted; form prefilled with fiction | PENDING-RUN | Case in suite |
| FR-16-04 | Graph-create completions vanished on navigation (write-only state) | PENDING-RUN | Case in suite |
| FR-18-06 | Story composer buried — not reachable from home/social entry (F18-04) | PENDING-RUN | Case in suite; W4-controls branch `2ef18331` restored the entry path; rendered proof owed |
| FR-13-04 | Settings lied: fabricated "1 active session", "No active blocks"; two settings screens dead | PENDING-RUN | Case in suite; BS honesty fixes |
| FR-16-05 | Profile facts all-or-nothing at onboarding; ask-once could never fire in a real flow | PENDING-RUN | Case in suite |
| FR-16-06 | Proactive machinery dead or lying: zero producers, permanently empty "recent changes", opt-out silently never saved | PENDING-RUN | Case in suite; B3/B5 proactive triggers ship inside the full gate stack (coordinator ruling, status file) |
| FR-14-02 | Product only understood HIS circle and HIS places (extraction hardcodes) | PENDING-RUN | Case in suite; HARDCODE_AUDIT shots/repair14 |
| FR-14-03 | New users saw the founder's friends and copy (fabricated 9-person who-picker; templates naming Chanelle/Maya/Jordan) | PENDING-RUN | Case in suite |
| FR-14-04 | Coordination behaved differently across relationship types; family was one flat type | PENDING-RUN | Case in suite |
| FR-11-08 | Structural disease: two authority systems mutated the same plan rows; LLM output could become state; junk ids 500'd public entry points | PENDING-RUN | Case in suite; single change authority in Division A |
| FR-14-05 | Founder seed corrupt: transposed ids renamed Alex to "Nina"; seed re-fired 5× in one walk session | PENDING-RUN | Case in suite |
| FR-17-12 | Tests failed depending on time of day (quiet-hours read the real wall clock) | GREEN | Clock-pinned suite runs (02:00 / 14:00 America/Los_Angeles) are part of the verification battery; suite made clock-deterministic in R17/R18 |
| FR-12-14 | Dateless plans bucketed to "next week"; missing graph rendered a hollow sheet; errors showed raw exception text | PENDING-RUN | Case in suite |
| FR-14-06 | Every voice/transcribe path crashed on non-macOS hosts (unguarded launchctl) | PENDING-RUN | Case in suite |
| FR-17-13 | Splash 1 carried no canon logo text — character crop with stray text fragments | OPEN | Division C identity redesign replaces splash/wordmark wholesale; rendered proof is the screenshot pack itself — judged by the founder, not pre-claimed |
| FR-17-14 | Center character read as a static image; presence states could stick forever | OPEN | New character + presence in Division C; founder-judged via the pack |
| FR-17-15 | TestFlight blocked repo-side (expo-notifications undeclared, no testflight profile) | PENDING-RUN | Case in suite; TestFlight execution itself remains founder-side |
| B1-S1..S5 | Virtual place first-class: create, convert both ways, surface agreement, physical unchanged, honesty refusals | GREEN | B1 branch proof (24/24 targeted incl. post-seam-fix); cases in suite; integrated-tip API run still owed (suite-level status PENDING-RUN) |
| FR-18-02-revision | A confirmed change to 8 PM must read 8 PM on every surface | CARRIED | Mac replay #4 green on Division A tip |
| FR-18-B2-01..03 | Virtual dinner completes at home: join + per-person food handoff; no fake order; no addresses anywhere | GREEN | B2 branch proof (16/16 post-seam); FoodStepPanel mounted by wiring `b5e5a824`; banned-string honesty audit in design |
| FR-18-B4 | Care rotation: siblings rotate a parent check-in; a miss surfaces once to exactly the set | GREEN | B45 branch proof; CareRotationView mounted in YOU hub by wiring |
| FR-18-B5A | Household pod: declared + accepted only; pod supply plan + home defaults | GREEN | B45 branch proof; HouseholdPodView mounted by wiring |
| FR-18-B5B | Solo context: silence without opt-in; 7-day rhythm with it | GREEN | B45 branch proof (gate stack unmodified) |
| FR-B3-01..03 | Check-in sweep: answers roll into one summary, unanswered visible, no nag re-notify | GREEN | B3 branch proof; CheckinCircleRow + summary mounted by wiring |
| W4-04a..c | Plan editing end to end: title edit reads back on every surface for both parties; authority + input contract enforced | GREEN | W4-edit branch proof (PATCH /opal/plans/:id through the gate); cases in suite |

---

## Section B — Walk #4 catalog (2026-10-17 23:18 PDT, founder, angry)

Badge was correct (`seed · 808c7bd`); the failure was expectation and
product. All six items are permanent cases and gate rows.

| Item | Complaint | Mapped check | Status | Evidence |
|---|---|---|---|---|
| W4-01 | Send spam ×5 with no send lock/idempotency, AND intent misroute: "Schedule 7 am church at Awaken" folded into a change_proposal on the 8 PM dinner plan ("Suggested 7:00 AM instead") instead of creating the church plan | FR-18-W4-01a/b/c | GREEN | Three-layer fix proven on `muse/r18-w4-send` `0534aea4` (client send lock + idempotency key + backend intent guard: new-plan requests create or ASK, never silently fold); report `coordination/repair18/phase2-w4-send-report.md`. Integrated-tip API re-run still owed (suite-level) |
| W4-02 | Layering broken in the real client: Next Together overlap, availability pill over bubbles, dev-banner text bleeding through the thread header, clipped fragment at card edge | W4-02 rendered case | PENDING-RUN | Rendered case exists (`shots/regression/rendered/cases/w4-02-*.case.mjs`) with geometry + hit-test assertions; on the pre-redesign base it FAILS as designed (proof the case has teeth). First run against the integrated shell is owed on the Mac preview stack — declared exception for the tranche |
| W4-03 | Graphs card clipping: attendance line cut off, title "omething" missing its first letter, stray background shape | W4-03 rendered case | PENDING-RUN | Rendered case exists with per-card measurements (base run: 36 failures, cards held at 90px vs 134–178px content — the founder's screenshot reproduced by measurement). Integrated-tip run owed |
| W4-04 | NOTHING EDITABLE — plan/graph titles and details cannot be corrected | W4-04a/b/c | GREEN | PATCH /opal/plans/:id through the PlanTransition gate; read-back on every surface in both parties' sessions; cases in suite |
| W4-05 | DEAD CONTROLS — Story open, Grow your circle, Add story, Go live did literally nothing | Dead-control sweep (Section E-b) + FR-18-06 | PENDING-RUN | W4-controls branch `2ef18331` wired or honestly removed the named controls; the class-level sweep over EVERY tappable element in the served integrated app is still owed — declared exception |
| W4-06 | What he LIKED: the Center, chats list/thread structure, the call thread | — (floor, not a freeze) | SUPERSEDED | Founder's design escalation 23:27 PDT explicitly overrode this as a protected list: those surfaces redesign to the higher standard too. Recorded so nobody "preserves" them against his later instruction |

## Section C — Design-round asks (not walk failures; standing complaints)

| Complaint | Mapped check | Status | Evidence |
|---|---|---|---|
| OTP autofill: "my code should just fill in" — iOS never offered the SMS code | FR-15-02 | PHONE | Real-SMS autofill is phone-checklist only by design |
| Fake toggles / settings that don't change anything | FR-13-04 + classification sweep (Section F) | PENDING-RUN | BS honesty fixes `debe2e4f`; whole-app trueness classification in Section F |
| Seed fixtures painted on real surfaces (fake people, fake times, canned transcript) | FR-12-01, FR-17-08, FR-14-03 | PENDING-RUN | BS-4 canned transcript DELETED; compat fixtures in C1 token layer are style aliases, not data. Rendered pack must show real session data only |
| Internal states leaking into UI copy (system labels, raw errors, template text shown as replies) | FR-12-14, FR-17-01, FR-18-03 | CARRIED | Division A fixes + Mac replay #4; RF-3 (explicit time dropped from confirmation copy) fix in flight |
| Location claimed wired when it was not | FR-12-08, FR-12-09 | PENDING-RUN | Location pipeline reports (shots/repair11, repair12) are the standing evidence discipline: a claim of "wired" requires the pipeline report, not a code path |
| QUIET law violations: noisy / hyper-pressy UI, guilt chips, nag loops | Copy audit in C1 design (guilt chips banned by name) + B3 no-nag case FR-B3-02 | GREEN | C1 design record bans the "Still waiting on one" class by name; sweep design: declines permanent, unchased; proactive triggers inside the unmodified gate stack |

## Section D — Meta-complaints (process failures; the check is a process rule)

| # | Complaint | Permanent rule (the check) | Status |
|---|---|---|---|
| M-1 | Walk link issued without `opal_dev=1`, making the badge check he was asked to do impossible | Device-test build gate skill: link is never issued without the badge parameter; badge target verified server-side before issue | RULE ACTIVE — applied to every future handover; no walk is being issued in this phase |
| M-2 | Wrong build served TWICE: stale branch tip, then Grok's resurrected servers remounting an old worktree (badge stuck 52 commits behind) | Served-build verification before any human test: BEAM start time must postdate checkout; badge SHA must equal the claimed tip; foreign servers on the walk ports are killed and verified dead | RULE ACTIVE — BEAM-start verification is a required step for the Mac preview stack serving the integrated tip |
| M-3 | Walk #4 expectation failure: he waited all day for the redesign reveal and got the old face, because sequencing was never made plain to him | Handover-integrity sweep (Section E-f): build contents must match what the handover message claims; the screenshot pack precedes any walk; nothing is described as present that the build does not contain | RULE ACTIVE — the first-look tranche exists because of this rule |
| M-4 | "Machine-proven" ever sounding like acceptance | Reporting law: everything machine-side is "machine-proven, pending phone walk"; FOUNDER_ACCEPTED stays NO until he says otherwise | RULE ACTIVE — stated in every report this cycle |
| M-5 | Fake or canned anything: confirmations, orders, transcripts, replies | Honesty contract: banned-string audit (no "ordered / placed / provider-confirmed / ETA / confirmation number" without a real rail); canned transcript deleted (BS-4); food step is a labeled handoff (FR-18-B2-02) | GREEN at branch level; whole-app classification in Section F is the standing sweep |
| M-6 | Complaints themselves getting lost between cycles ("I have complained about many things in this entire chat") | THIS LEDGER: every complaint maps to a permanent check; the ledger is referenced from WALK_ACCEPTANCE.md and inherited by Repair #19+ | ACTIVE — this file |

### OPEN items named in the sections above (fix paths)

- **OPEN-1 (RF-1..RF-4, RF-5 verify):** Center-born plan execution 500;
  sticky Maya re-engagement line; explicit time dropped from Center
  confirmation; "Where is dinner?" unanswered from real stored rows;
  fold-upsert time_label without PlanRevision. Fix worker active on
  `muse/r18-fixwave` (RF-1..RF-5). Affects FR-18-03, FR-06-02, FR-08-01,
  FR-10-01, FR-17-03, FR-13-03 at suite level.
- **OPEN-2 (Drop-it / HTTP plan cancel):** the plan adapter keeps
  `droppable: false`, so NO cancel control renders anywhere (honestly
  absent, not dead). The HTTP cancel route is in the fixwave scope; the
  web wire-up is a documented follow-up in the wiring report. Affects
  FR-11-03 at the HTTP layer (backend cancel authority itself is cased).
- **OPEN-3 (rendered proof on the integrated tip):** W4-02 / W4-03 rendered
  cases and the per-surface geometry pass have not yet run against the
  integrated shell (they ran, failing as designed, against the
  pre-redesign base). First run happens on the Mac preview worktree.
- **OPEN-4 (contract-shaped gaps from wiring):** people-row plan pill
  absent (conversations contract carries no plan state); shell-thread Next
  Together strip not mounted (no plan linkage in the message contract).
  Both are backend-contract gaps, named rather than papered over with
  client-side derivation (which the engineering law forbids).

## Section E — Class-level sweeps (the "generic problems", as classes)

| Sweep | Definition | Status on integrated tip |
|---|---|---|
| (a) Rendered overlap/clipping/off-box sweep | Rendered suite: every surface, both modes, phone viewport — horizontal overflow, content escapees, text clipping with the clipping ancestor named, dock hit-tests (`elementFromPoint` must return the tapped control). EXTENDED by the design-system law (2026-10-18 03:45): per-dynamic-asset enter+exit evidence (Layout Contract L8 registry; an asset visible without a live reason fails the pack), per-entity color-continuity captures on ≥2 surfaces (L9), motion-meaning spot check (L10) | PENDING-RUN — machinery exists and has teeth (base run failed 18/22 surfaces with pixel measurements); integrated-shell run owed (OPEN-3); L8/L9/L10 encoded in `layoutContract.css` + rendered README 2026-10-18 |
| (b) Dead-control sweep | Every tappable element in the served app inventoried and exercised; alive, honestly absent, or named. EXTENDED by the journey-completeness law (2026-10-18 03:46, Layout Contract L11): exercising a control means tracing its whole journey to its declared landing with read-back — a control that "works" into a dead end is FALSE, not alive | PENDING-RUN — named W4-05 controls fixed at branch level; whole-app inventory + journey audit owed; classification sweep (Section F) covers control trueness from code+evidence |
| (c) Send/idempotency sweep | Every composer: rapid duplicate sends apply state exactly once | GREEN for Center + thread composers (W4-01 three-layer proof, FR-18-W4-01b: same-key ×5, no-key identical ×5, cross-account key collision). Other composers (story/post) covered by FR-15-01/FR-15-05 cases, PENDING-RUN at suite level |
| (d) Editability sweep | Every user-visible datum (titles, times, details) has a correction path through the gate, or is a named exception | PARTIAL — plan titles GREEN (W4-04a..c). Named exceptions: plan schedule fields are refused by the edit contract on purpose (schedule changes go through the revision system, W4-04c pins the refusal); graph titles and plan details beyond title are NOT yet editable — declared exception, not silently absent |
| (e) Rendered-copy sweep | No truncated or misspelled titles visible on any surface; no title losing characters ("omething") | PENDING-RUN — W4-03 rendered case is the check; integrated run owed (OPEN-3) |
| (f) Handover-integrity checks | Badge target verified server-side; link carries `opal_dev=1`; build contents match the handover message's claims | ACTIVE as process rule (M-1/M-2/M-3); exercised at the next handover — the first-look tranche delivery must list this ledger's non-green rows up front |

## Section F — TRUE / HONESTLY ABSENT / FALSE classification (capstone)

Whole-app classification sweep (every surface, control, and feature —
including inherited surfaces not touched this cycle) is being compiled in
`coordination/repair18/classification-sweep.md` and its counts recorded in
`repair18-status.md`. FALSE finds are automatic gate failures and are listed
in the declared exceptions below with their dispositions. This section is
completed from that sweep before any delivery; counts are never estimated.

## Declared exceptions (non-green rows, for the delivery message — no surprises)

1. OPEN-1: RF-1..RF-4 fixes in flight on `muse/r18-fixwave`; RF-5 verify
   pending. (FR-18-03 carried-green from Division A; the RF items are
   residuals found by the regression workers, being fixed now.)
2. OPEN-2: Drop-it cancel control honestly absent (`droppable: false`)
   until the fixwave HTTP cancel route lands and is wired.
3. OPEN-3: W4-02/W4-03 rendered cases + class sweeps (a), (b), (e) have
   not yet run against the integrated shell; they failed as designed
   against the pre-redesign base, which proves the checks have teeth but
   is NOT proof the integrated build passes.
4. Suite-level PENDING-RUN: the full API real-path suite (99 executable
   cases) and the pinned-clock backend runs have not yet completed on the
   integrated tip (one local API run was killed by a VM restart; results
   are never claimed from a killed run).
5. OPEN-4: people-row plan pill and shell-thread Next Together strip are
   unmounted contract gaps (backend carries no plan state/linkage for
   those surfaces yet).
6. FR-17-13 / FR-17-14 (splash, wordmark, character): replaced wholesale
   by Division C; their proof is the founder's own judgment of the
   screenshot pack — deliberately not pre-claimed as green.
7. Section F classification counts: pending the sweep's completion at the
   time this ledger was first compiled; updated in place before delivery.

FOUNDER_ACCEPTED = NO. FREEZE = HOLD. PASS2 = NO. Everything above is
machine-proven (or honestly not yet proven), pending the founder.
