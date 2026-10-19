# Repair #18 — COMPLAINT LEDGER (founder directive, 2026-10-18 03:43 PDT)

Founder's words: "I have complained about many things in this entire chat —
be sure I don't run into any of those generic problems."

**The standard, in the founder's words (2026-10-18 04:15 PDT):** "You have
to actually test everything that a real user would do… every time you tell
me all these tests passed, I open the app and right away it's broken."

Operational form: the acceptance unit is the **served artifact** exercised
through the exact path a user's finger takes — same entry, same client
shape, verified build — at the **rendered layer**, with **read-backs on
every surface**. Component and test-suite green is evidence ABOUT the
build, never a claim the build works. The case inventory covers the full
**real-user action inventory** per surface — every tap a real user would
make — which the dead-control sweep and the journey audits enumerate.

**Testing unity law (founder, 2026-10-18 04:17 PDT):** back-end and API
suites stay — they are valued evidence. The DECISIVE gate is
whole-application testing: the integrated stack served as one build and
exercised through the real client at the rendered layer (stacking,
clipping, layout contract, full user-action inventory, cross-surface
read-backs) as **one big application, not multiple pieces** — because the
historical failures lived at the seams between pieces that each "passed."
Reporting discipline: a verdict is stated for the WHOLE application or
explicitly labeled partial, naming the untested remainder — a pieces-green
result must never read as an app-green result.

**Mistake patterns (founder contamination audit, 2026-10-18 04:35
PDT):** every complaint in this ledger is an instance of a pattern in
the Mistake-Pattern Catalog (coordination/repair18/
mistake-pattern-catalog.md, MP-1..MP-10), each with a detection
fingerprint and a standing check. If a cataloged mistake recurs after
its check exists, the failure is charged to the CHECK, the check is
fixed, and the recurrence is reported to the founder by name.

**Totality of testing (founder, 2026-10-18 04:27 PDT):** "You will treat
and test every aspect of Opal, big and small." The acceptance inventory is
exhaustive by construction — the big flows AND the small details are all
test surface: a stray glyph, a clipped character, a misaligned pill, one
wrong word of copy, one state color off by meaning. His walks died on
small things as often as big ones. The rendered sweep, the copy sweep,
and the dead-control inventory exist to catch the small mechanically —
and no item is too minor to enter this ledger when he reports it. A check
that only exercises the happy shape of a surface has not tested the
surface.

This ledger is a HANDOVER GATE. Every complaint the founder has raised across
the whole program is listed here, mapped to a permanent check, with its status
ON THE INTEGRATED TIP and the evidence for that status. No complaint without a
mapped check. No check marked green without evidence.

**REFRESHED 2026-10-18 (close-out phase 9, map-trace pass, branch
`muse/r18-acceptance` off `fa3f0912`):** the tip of record is now
`muse/repair-18` @ `fa3f0912` (tree `9f56b5d4`, mirror-verified on
GitHub as `ad927478`). Every row's status below has been re-derived
from current evidence in the Refresh section immediately following
the Gate rule; where the Refresh section and an older row body
disagree, **the Refresh section governs** (older bodies are kept as
the historical record of what was true when they were written).
FOUNDER_ACCEPTED stays NO.


---

## Refresh — phase 9 re-derivation (2026-10-18, tip `fa3f0912`) — GOVERNS

**Evidence base for every re-derivation below:**
final-battery-report.md (backend pinned 02:00 LA **3,170/0**,
pinned 14:00 LA **3,170/0**; unpinned 3,170/1 = one proven
contention flake, isolated 12/12 and green in both pinned runs,
reported not re-run away; web exact baseline 23/16 files, 1,483
passed; typecheck exactly 9; mobile 105/105; **API regression
101/101 PASS in-suite**; posture 118 explained), casefix-report.md,
dir1-casefix-report.md, dir1-report.md, dir4-report.md,
adopt1/2/3-report.md, sm-report.md, hardening-report.md,
harmony0/unify/splash/harmony2 reports + packs, huntfix-be/web
reports. Map-trace: coordination/repair18/maptrace-report.md
(findings MT-01…MT-23).

### What the final battery changes, as a rule

The old bodies' dominant statuses — PENDING-RUN ("the full API
suite has not yet completed a run on the integrated tip") and
CARRIED ("proven on Division A tip `808c7bd6`; integrated re-run
owed") — rested on one missing proof: the integrated-tip
real-path run. **That run now exists and is 101/101 in-suite.**
Therefore every Section A/B row whose check is an automatable
case in that suite, and whose status was PENDING-RUN, CARRIED, or
"PASS on muse/r18-api-fix (clean run)" **for that reason**, is
re-derived **GREEN** below. Rows whose blocker was never the
suite run keep their honest status by name. Nothing is marked
green without the pointer in the right-hand column.

### Section A rows — re-derived

| Rows | New status | Closing / governing evidence |
|---|---|---|
| FR-05-01, FR-11-01, FR-17-01, FR-12-01, FR-15-01, FR-11-02, FR-11-03, FR-13-02, FR-14-01, FR-12-03, FR-11-05, FR-17-02, FR-12-06, FR-12-07, FR-07-01, FR-07-02, FR-17-06, FR-10-02, FR-12-08, FR-12-09, FR-17-08, FR-07-03, FR-07-04, FR-11-06, FR-12-11, FR-07-05, FR-09-03, FR-08-02 (case leg), FR-17-09, FR-17-10, FR-12-12, FR-12-13, FR-16-01, FR-16-02, FR-16-03, FR-15-04, FR-15-05, FR-16-04, FR-18-06, FR-13-04, FR-16-05, FR-16-06, FR-14-02, FR-14-03, FR-14-04, FR-14-05, FR-12-14, FR-14-06, FR-17-15, FR-09-01, FR-09-02 | **GREEN** (was PENDING-RUN) | Case in the permanent suite; API regression **101/101 PASS in-suite** at `fa3f0912` (final-battery Leg 7). FR-07-01's live-Places caveat is unchanged: live results still depend on founder-side Places enablement/billing |
| FR-13-01, FR-11-04, FR-12-04, FR-12-05, FR-06-01, FR-17-05, FR-15-03, FR-11-08, FR-18-B2-01, FR-18-B2-03, FR-B3-01 | **GREEN** (was PASS on muse/r18-api-fix) | Apifix clean-run proof (bodies below) **plus** in-suite confirmation at 101/101 — the confirmation those rows were owed is discharged |
| FR-12-02, FR-18-01, FR-18-02, FR-18-04, FR-12-10 | **GREEN** (was CARRIED) | Division A + Mac replay #4 proof (bodies below) **plus** in-suite 101/101 at the integrated tip — the CARRIED caveat ("integrated re-run still owed") is discharged |
| FR-18-03 | **GREEN in its suite leg; the capability residue is F-16-adjacent and stays named** (was CARRIED + OPEN) | RF-1/RF-3 fixed (`34519b59`) + 101/101. "Center never actually thought" as a *live-LLM* claim still rests on keyed/provider exercise, which no battery leg claims — stated here so GREEN is not over-read |
| FR-06-02, FR-08-01, FR-10-01, FR-17-03, FR-13-03, FR-17-04 | **GREEN** (was PENDING-RUN with RF fixes landed) | RF-2/RF-3/RF-4 fixed (`34519b59`) + 101/101 in-suite confirmation — OPEN-1's remaining leg, discharged (see below) |
| FR-17-07 | **GREEN at suite level; rendered leg pack-proven in part** (was PENDING-RUN) | Case re-pinned to Division C state hues, in-suite at 101/101; unify drift pins (13/13) + rendered-identical captures (unify pack). The full rendered sweep leg remains MT-10/MT-11 in the map-trace — named, not hidden |
| FR-17-11, FR-18-05, FR-08-03, FR-17-12 | **GREEN — unchanged** | Bodies below already GREEN; final battery is consistent (pinned-clock runs are now the battery's own legs 2–3) |
| FR-05-02, FR-11-07, FR-06-03, FR-15-02 | **PHONE — unchanged, by design** | Phone-checklist only; no refresh evidence can or should move them |
| FR-17-13, FR-17-14 | **PACK-PROVEN, FOUNDER-JUDGED — not machine-GREEN** (was OPEN) | Splash/wordmark/character were replaced wholesale (orb system, splash rebuild, harmony0/2); their proof is the packs (delta / splash / harmony2) and the founder's judgment of them. Deliberately not pre-claimed green, per the original rows' own terms |
| FR-18-02-revision | **GREEN — CLOSED** (was STANDING CASE-DEFECT) | Row body above rewritten: casefix isolation repair + final battery in-suite 29/29 |
| B1-S1..S5, FR-18-B4, FR-18-B5A, FR-18-B5B, W4-04a..c | **GREEN — unchanged/confirmed** | Branch proofs below + suite inclusion at 101/101; B2-02 and B3-02/B3-03 (already passing in full runs) confirmed in-suite |
| **FR-18-DIR1-01 / FR-18-DIR1-02** (new rows, added by this refresh — the DIR-1 cases postdate the ledger's first writing) | **GREEN — CLOSED at 101/101** | dir1-report.md (build); dir1-casefix-report.md (isolation repair, **zero assertions changed**: standalone 17/17 + 14/14, in-suite-order 2/2, back-to-back 2/2, poisoned-DB 2/2 + 2/2; pinned-clock flake confirm ×3 PASS); final-battery Leg 7 (both pass **in-suite**, no workaround) |

### Section B rows (Walk #4) — re-derived

| Item | New status | Evidence |
|---|---|---|
| W4-01 | **GREEN — unchanged, now in-suite** | Body below + 101/101 |
| W4-02 | **PARTIALLY PROVEN — stays a declared exception** | Rendered case has teeth (failed as designed on the pre-redesign base); no recorded integrated-shell case run at `fa3f0912`; unify/harmony2 pack geometry is partial cover. Map-trace MT-10 |
| W4-03 | **PARTIALLY PROVEN — stays a declared exception** | Same shape as W4-02. Map-trace MT-10 |
| W4-04 | **GREEN — unchanged** | Body below (W4-04a..c) |
| W4-05 | **PARTIALLY PROVEN** (was PENDING-RUN) | Named controls wired/removed (`2ef18331`); C2 dead-control family fixed (huntfix-web B-10/B-13/B-14). Whole-app tappable inventory as a single completed sweep is still not recorded. Map-trace MT-11 |
| W4-06 | **SUPERSEDED — unchanged** | Founder escalation 2026-10-17 23:27 PDT; body below |

### Section C rows — re-derived

| Complaint | New status | Evidence |
|---|---|---|
| OTP autofill | **PHONE — unchanged** | FR-15-02 |
| Fake toggles / settings that don't change anything | **GREEN at suite level** | BS honesty fixes + settings build (every rendered control TRUE or HIDDEN, wallet map §S verdict) + 101/101; classification confirmation is the battery itself |
| Seed fixtures painted on real surfaces | **PARTIALLY PROVEN — residue named** | C2 face: BS-4 deleted, huntfix B-01…B-09 legs fixed/gated. Residue: MP-2 posture count is still **81** seed-flow sites (seed mode) — the largest remaining contamination class, map-trace MT-19. Not rounded to green |
| Internal states leaking into UI copy | **GREEN at suite level; L12 gate leg partial** | RF-3 + L12 contract; HB-17/18/19 violations fixed (huntfix-web). The rendered/copy *gate run* as a single sweep is MT-11 |
| Location claimed wired when it was not | **GREEN** (was PENDING-RUN) | FR-12-08/09 in-suite at 101/101; the standing evidence discipline (pipeline report, not code path) is unchanged |
| QUIET law violations | **GREEN — unchanged, extended** | Body below + DIR-4 ceilings/dismissal-permanence cases (FR-18-DIR4-04/05) at the final battery |
| UX bar (2026-10-18 03:48) | **PARTIALLY PROVEN** (was PENDING-RUN) | Spec + L12 encoded; DIR-4 §9 copy audit against the Home brief passed with no copy changes; rendered/copy sweep run remains MT-11 |

### Section D — meta-complaints and the OPEN items

- M-1…M-6: **RULE ACTIVE — unchanged.** M-5's "GREEN at branch
  level" is upgraded to **GREEN at tip level** by the final
  battery + refreshed Section F below.
- **OPEN-1 — CLOSED.** RF-1..RF-4 fixed and merged (`34519b59`),
  RF-5 refuted with DB evidence, and the only remaining leg —
  integrated full-suite + API confirmation — is discharged:
  backend 3,170/0 at both pins, API 101/101 in-suite.
- **OPEN-2 — CLOSED.** HTTP cancel route landed (`34519b59`) and
  the Drop-it web wiring merged (status file, ~04:50 PDT:
  drop-it merged; wallet map W-GAP-28 CONVERTED: real POST +
  droppable derivation + read-back). The adapter's
  `droppable: false` interim state no longer describes the tip.
- **OPEN-9 — CLOSED.** The `ambient/execution_compose.ex`
  silent-default site was FIXED → TRUE by huntfix-be (its report,
  OPEN-9 section).
- **OPEN-4 — CLOSED in its DIR-1 leg; residue renamed.** The two
  contract gaps (people-row plan pill; shell-thread Next
  Together strip) were made mandatory product by DIR-1 and
  built + API-proven (101/101). What remains of this family is
  the wider W-GAP-29 set (dock-unread, D5 grouped list, care
  name directory) — carried as map-trace MT-08/MT-12, not as
  this item.
- **OPEN-3 — STAYS OPEN, narrowed.** Pack-phase rendered proof
  now exists for the principal surfaces (delta / unify / splash /
  harmony2 packs), but W4-02/W4-03's own rendered-case runs
  against the integrated shell are still not recorded (MT-10),
  and sweeps (a)/(b)/(e) as single full runs are MT-11.

### Section E sweeps — re-derived

| Sweep | New status |
|---|---|
| (a) Rendered overlap/clipping/off-box | **PARTIAL** — machinery + teeth (base run) + pack geometry proof on principal surfaces (unify halo PASS, harmony2 0/0 probes on its surfaces); full integrated rendered-suite run still owed (MT-10/MT-11) |
| (b) Dead-control + journey (L11) | **PARTIAL** — huntfix B-10…B-16 were this sweep enforced piecemeal; whole-app inventory + journey audit as one run still owed (MT-11) |
| (c) Send/idempotency | **GREEN — unchanged, widened:** Center + thread composers (body below); hardening wave added the same pattern to support intake (idempotency key, 6 permanent tests) |
| (d) Editability | **PARTIAL — unchanged in shape:** plan titles GREEN (W4-04); named exceptions stand verbatim in the body below (schedule via revision system on purpose; graph titles / beyond-title details not yet editable) |
| (e) Rendered-copy (L12-extended) | **PARTIAL** — W4-03 case + pack captures; full run owed (MT-11) |
| (f) Handover-integrity | **ACTIVE — unchanged; exercised by this refresh** | This refresh + WALK_ACCEPTANCE list every non-green row up front (below) |

### Section F — re-derived at `fa3f0912`

- F-01…F-05, F-10…F-15: **ELIMINATED — as recorded in the bodies
  below** (merges `fa98d6c3` / `34519b59`), with the three
  recurrences (REC-1/2/3) each subsequently **fixed and cited**:
  REC-1 → huntfix-web B-02; REC-2's boundary leg (HA-06) remains
  **contested C-2** — no later report settles its reachability,
  so this refresh does **not** mark the HA-06 leg closed
  (map-trace MT-22); REC-3 → huntfix-web B-09; OPEN-9 (the F-11
  follow-up site) → huntfix-be, closed above.
- F-06…F-09: **FIXED + CONFIRMED** — the integrated confirmation
  those rows carried as PENDING-RUN is discharged at 101/101.
- **F-16 (TOP-TIER) — STAYS OPEN, unchanged, and stays the
  named top-tier open FALSE.** Live call transcription is not
  wired; no live call has ever exercised the Deepgram grant +
  websocket path (connections-verification report: Deepgram-live
  ABSENT as a function, batch TRUE — the two rows must never be
  merged). Call surfaces remain honestly gated until it is
  wired. This row does not move on any evidence in this refresh.
- Classification counts: the sweep-era counts (38 TRUE / 43
  HONESTLY ABSENT / 15 FALSE / 41 UNPROVEN, 137 items) are
  **not restated as current** — the FALSE count at this tip is
  **1 open class (F-16)** per the dispositions above, and the
  UNPROVEN concentration (integrated runs) has materially
  shrunk because those runs now exist; a fresh whole-app
  classification sweep was not part of this refresh and no new
  counts are claimed.

### Declared exceptions at this refresh (supersedes the list below)

The "Declared exceptions" list further down is the
pre-refresh record and is **superseded by this list**:

1. **F-16** — live call transcription not wired; honestly gated
   (map-trace MT-02).
2. **Full Opal's Home deferred** — doorway + Soul/Memory cards
   shipped; presence/status, trail, upcoming, approvals
   deferred (MT-01).
3. **W4-02 / W4-03** integrated rendered-case runs not recorded;
   **W4-05** whole-app inventory partial; sweeps (a)/(b)/(e)
   partial (MT-10/MT-11).
4. **DIR-4 register-held forms** unbuilt by design sequence
   (push D-4, modes D-8, call forms D-2/D-6, trail/Home D-3,
   basis lines D-5, quiet-hours copy D-7) + the P3 stall-window
   simplification in the shipped build (MT-04/MT-03).
5. **Replay + revert-drill rows PENDING-COORDINATOR** — no
   replay-drill report existed at refresh time (MT-21).
6. **Mobile lockfile desync** — `npm ci` fails at this tip
   (pre-existing `expo-location` lock gap); 105/105 was run via
   the identical tip's installed modules (MT-06).
7. **Backend unpinned leg 3,170/1** — proven contention flake,
   reported, not re-run away (MT-23).
8. FR-17-13 / FR-17-14 — pack-proven, **founder-judged**, not
   machine-green (above).
9. Remaining bounded residues, each with its cover specified in
   the map-trace findings: MT-05, MT-07…MT-09, MT-12…MT-20,
   MT-22.

FOUNDER_ACCEPTED = NO. FREEZE = HOLD. PASS2 = NO.

---

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
| FR-13-01 | Fake success on dead plans; accepting a superseded revision rolled the plan back | PASS on muse/r18-api-fix (clean run): REAL DEFECT fixed - the fold change gate missed API-born plans (fold current nil vs row clock), so spoken changes silently overwrote the row; the gate now fires against the committed row clock. | Case in suite (reg-A theme 1: no-fake-success) |
| FR-15-01 | Story share announced "shared" before the backend answered; Post wrote to state nobody read | PENDING-RUN | Case in suite |
| FR-11-02 | Opal claimed things that never happened ("Locked in!", bookings never made) | PENDING-RUN | Case in suite; banned-claim contract in B2 honesty case FR-18-B2-02 |
| FR-11-03 | "Cancel" behaved like a sentiment, not a state change (F04) | PENDING-RUN | Case in suite; HTTP cancel route LANDED on integrated tip (merge 34519b59); Drop-it web wiring in flight on muse/r18-dropit (Section D, OPEN-2) |
| FR-11-04 | Confirming repeatedly dead-ended; plan never advanced (F05) | PASS on muse/r18-api-fix (clean run): shared ownThread case defect repaired; underlying real defects fixed in the Center cluster (see FR-12-04/13-01 rows). | Case in suite |
| FR-12-02 | "Change dinner to 8 PM" produced copy but the plan never moved — or reverted to Thursday 7:30 on other surfaces (F18-02) | CARRIED | Division A fix; Mac replay #4 green on `808c7bd6`; revision read-back case FR-18-02-revision also in suite |
| FR-17-02 | Change-time phrasing failed silently; "8pm" normalized to "8: PM" | PENDING-RUN | Case in suite |
| FR-13-02 | "Cancel the dinner plan" / "cancel all plans" started a creation flow | PENDING-RUN | Case in suite |
| FR-14-01 | "Any upcoming plans?" created a plan instead of answering | PENDING-RUN | Case in suite |
| FR-12-03 | A days-old/cancelled plan_id hijacked unrelated utterances | PENDING-RUN | Case in suite |
| FR-12-04 | A change proposal sat at "Waiting on one response." forever | PASS on muse/r18-api-fix (clean run): REAL DEFECTS fixed - proposal expiry was dropped at the presentation seam; accepted proposals never retired into proposal_history. | Case in suite; deferred-execution item in the fix wave plan |
| FR-11-05 | Double-accept / repeated taps created two plans | PENDING-RUN | Case in suite; W4-01 idempotency cases FR-18-W4-01b GREEN at branch level (Section B) |
| FR-18-01 | Eight duplicate forming plans; merely opening a conversation minted a plan (F18-06) | CARRIED | Division A dedupe fix; Mac replay #4 green |
| FR-18-02 | Double-booking never flagged; ambiguous "change dinner" picked a plan silently (F18-03) | CARRIED | Division A conflict/disambiguation fix; Mac replay #4 green |
| FR-12-05 | Garbage/invented schedules persisted; parse defaults invented times | PASS on muse/r18-api-fix (clean run): REAL DEFECTS fixed - retarget_time invented a meridiem (now steps aside); window-only changes now pend through the fold gate. The 429 leg adjudicated as throttle behavior + shared-thread accumulation, no product change. | Case in suite |
| FR-06-01 | Plan leadership invisible — nobody could tell who controls a plan | PASS on muse/r18-api-fix (clean run 2026-10-18): CASE DEFECT (409s were lawful for a tentative plan; case read the wrong key) + REAL DEFECT fixed - JourneyAuthority.activate enrolled only the activator, leaving members pending-but-unanswerable. | Case in suite |
| FR-06-02 | A generic Friday dinner inherited Maya; a birthday inherited Coronado/Night Hawk | PENDING-RUN | Case in suite; RF-2 FIXED on integrated tip (merge 34519b59); integrated API-suite confirmation PENDING-RUN |
| FR-08-01 | Explicit time softened: "The Henry, Sunday 10 AM" became 7:30 | PENDING-RUN | Case in suite; RF-3 FIXED on integrated tip (merge 34519b59); integrated confirmation PENDING-RUN |
| FR-10-01 | Center kept re-engaging an old person/topic after he changed subject | PENDING-RUN | Case in suite; RF-2 FIXED on integrated tip (merge 34519b59); integrated confirmation PENDING-RUN |
| FR-17-03 | He typed "Food" and Center lost continuity and re-engaged Maya | PENDING-RUN | Case in suite; RF-2 FIXED on integrated tip (merge 34519b59); integrated confirmation PENDING-RUN |
| FR-17-04 | A bare "yes" resurrected a dead flow ("Done. Nighthawk with Maya is set up") | PENDING-RUN | Case in suite |
| FR-17-05 | A NEW request answered as an update ("Same plan, same people.") with no completion | PASS on muse/r18-api-fix (clean run): REAL DEFECTS fixed - the confirm affirmation missed "yes, set it up"; extract_what annihilated article-led whats ("a date night"). Fixed in OpalIntent. | Case in suite; W4-01 intent cases cover the class |
| FR-09-01 | A stuck search captured the thread; "cancel the search" ignored | PENDING-RUN | Case in suite |
| FR-09-02 | Recall answered the wrong topic (sticky Henry venue) | PENDING-RUN | Case in suite |
| FR-13-03 | "Who's coming?" / "Where is dinner?" dead-ended at "Tell me more" | PENDING-RUN | Case in suite; RF-4 FIXED on integrated tip (merge 34519b59); integrated confirmation PENDING-RUN |
| FR-18-03 | Center never actually thought: template deflection, `llm_called: false`, stale entities hijacked the parse (F18-08) | CARRIED + OPEN | Real-LLM path proven in Division A; Mac replay #4 green. RF-1 and RF-3 FIXED on integrated tip (merge 34519b59); integrated confirmation PENDING-RUN |
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
| FR-15-03 | Close-circle stories reached NOBODY (eligibility was literally author == viewer) | PASS on muse/r18-api-fix (clean run): CASE DEFECT twice over - close-circle enforcement was NEVER broken (the "unrelated" viewer is family-typed to the author, a close type by law; a later leg counted other cases lawfully-visible stories via the shared run tag). Assertions unchanged; the privacy scare was a case artifact, stated plainly. | Case in suite |
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
| FR-11-08 | Structural disease: two authority systems mutated the same plan rows; LLM output could become state; junk ids 500'd public entry points | PASS on muse/r18-api-fix (clean run): REAL DEFECT fixed - OpalCore.IdShape guard at every id-addressed authority entry; junk ids answer honestly, never a CastError. | Case in suite; single change authority in Division A |
| FR-14-05 | Founder seed corrupt: transposed ids renamed Alex to "Nina"; seed re-fired 5× in one walk session | PENDING-RUN | Case in suite |
| FR-17-12 | Tests failed depending on time of day (quiet-hours read the real wall clock) | GREEN | Clock-pinned suite runs (02:00 / 14:00 America/Los_Angeles) are part of the verification battery; suite made clock-deterministic in R17/R18 |
| FR-12-14 | Dateless plans bucketed to "next week"; missing graph rendered a hollow sheet; errors showed raw exception text | PENDING-RUN | Case in suite |
| FR-14-06 | Every voice/transcribe path crashed on non-macOS hosts (unguarded launchctl) | PENDING-RUN | Case in suite |
| FR-17-13 | Splash 1 carried no canon logo text — character crop with stray text fragments | OPEN | Division C identity redesign replaces splash/wordmark wholesale; rendered proof is the screenshot pack itself — judged by the founder, not pre-claimed |
| FR-17-14 | Center character read as a static image; presence states could stick forever | OPEN | New character + presence in Division C; founder-judged via the pack |
| FR-17-15 | TestFlight blocked repo-side (expo-notifications undeclared, no testflight profile) | PENDING-RUN | Case in suite; TestFlight execution itself remains founder-side |
| B1-S1..S5 | Virtual place first-class: create, convert both ways, surface agreement, physical unchanged, honesty refusals | GREEN | B1 branch proof (24/24 targeted incl. post-seam-fix); cases in suite; integrated-tip API run still owed (suite-level status PENDING-RUN) |
| FR-18-02-revision | A confirmed change to 8 PM must read 8 PM on every surface | **CLOSED (phase-9 refresh) — GREEN at the final battery.** The isolation repair landed (casefix wave: fresh-pair provisioning, own thread per run, plan binding by id-set difference, assertions unchanged — casefix-report.md) and the case passes **in-suite 29/29** at the final battery on `fa3f0912` (final-battery-report.md Leg 7, 101/101). The former STANDING CASE-DEFECT verdict is superseded by that battery proof; it is retained in git history, not in this row. | casefix-report.md; final-battery-report.md Leg 7 (101/101, FR-18-02-revision 29 checks) |
| FR-18-B2-01..03 | Virtual dinner completes at home: join + per-person food handoff; no fake order; no addresses anywhere | MIXED ON THE INTEGRATED TIP: B2-02 passes in the full API runs; **B2-01 + B2-03 PASS on muse/r18-api-fix (clean run)**: REAL seam defect fixed - entities_from_pending dropped food_at_home/food_question so confirm-born plans lost the food signal; FoodHandoff 422-for-no-restaurant became the honest no-rail 200 fact. Case defects also repaired (confirm turn sent; plans targeted by id-set difference) | B2 branch proof (16/16 post-seam); FoodStepPanel mounted by wiring `b5e5a824`; full-run logs /tmp/r18-api-clean.log |
| FR-18-B4 | Care rotation: siblings rotate a parent check-in; a miss surfaces once to exactly the set | GREEN | B45 branch proof; CareRotationView mounted in YOU hub by wiring |
| FR-18-B5A | Household pod: declared + accepted only; pod supply plan + home defaults | GREEN | B45 branch proof; HouseholdPodView mounted by wiring |
| FR-18-B5B | Solo context: silence without opt-in; 7-day rhythm with it | GREEN | B45 branch proof (gate stack unmodified) |
| FR-B3-01..03 | Check-in sweep: answers roll into one summary, unanswered visible, no nag re-notify | MIXED ON THE INTEGRATED TIP: B3-02 + B3-03 pass in the full API runs; **B3-01 PASS on muse/r18-api-fix (clean run)**: CASE DEFECT - fixture name collision; the waiting line correctly uses the server-known display name | B3 branch proof; CheckinCircleRow + summary mounted by wiring; full-run logs /tmp/r18-api-clean.log |
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
| Internal states leaking into UI copy (system labels, raw errors, template text shown as replies) | FR-12-14, FR-17-01, FR-18-03 | CARRIED | Division A fixes + Mac replay #4; RF-3 FIXED on integrated tip (merge 34519b59) |
| Location claimed wired when it was not | FR-12-08, FR-12-09 | PENDING-RUN | Location pipeline reports (shots/repair11, repair12) are the standing evidence discipline: a claim of "wired" requires the pipeline report, not a code path |
| QUIET law violations: noisy / hyper-pressy UI, guilt chips, nag loops | Copy audit in C1 design (guilt chips banned by name) + B3 no-nag case FR-B3-02 | GREEN | C1 design record bans the "Still waiting on one" class by name; sweep design: declines permanent, unchased; proactive triggers inside the unmodified gate stack |
| UX bar (2026-10-18 03:48): experience must be "very pleasing"; Muse's capability, polish, proactivity, and communication are the baseline | Communication Model spec (`coordination/repair18/communication-model.md`) encoded as Layout Contract L12; rendered/copy sweep extension (sweep (e)) fails internal-state text, unactionable statuses, and bare spinners, and requires mid-operation checkpoint captures | PENDING-RUN | Spec + contract + gate encoded 2026-10-18; evidence is the integrated-shell rendered run, owed (OPEN-3) |

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

- **OPEN-1 (RF-1..RF-4, RF-5 verify) — CLOSED on the code, confirmation
  PENDING-RUN:** RF-1..RF-4 FIXED and merged (34519b59, fixwave
  88bbe909; each case reproduced failing pre-fix and passing post-fix
  on the branch); RF-5 REFUTED with DB-level evidence (no code change —
  see the fixwave report). What remains open is only the integrated
  full-suite + API-suite confirmation run on the merged tip.
- **OPEN-2 (Drop-it / HTTP plan cancel) — route landed, wiring in
  flight:** the HTTP cancel route is on the integrated tip (merge
  34519b59: POST /opal/plans/:id/cancel). The web wire-up (droppable
  derivation from real capability, real request, server-truth read-back,
  plain-language failure) is in flight on `muse/r18-dropit`. Until it
  merges, the adapter keeps `droppable: false` — honestly absent, not
  dead. Affects FR-11-03 at the HTTP layer.
- **OPEN-9 (F-11 follow-up site):** `ambient/execution_compose.ex`
  carries the same silent `travel_minutes || 20` shape outside the
  F-11 register's five sites (named by the FALSE-fix worker). Same
  remedy owed: route through Feasibility.TravelEstimate labeling.
  Until then it is a named, bounded instance of a class the register
  otherwise closed — declared here, not hidden.
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
| (e) Rendered-copy sweep | No truncated or misspelled titles visible on any surface; no title losing characters ("omething"). EXTENDED by the Communication Model (2026-10-18 03:48, Layout Contract L12): a capture also FAILS on internal-state text, enum values, machine jargon, or raw error text anywhere user-visible; on a status the user cannot act on; or on a long-running operation shown as a bare spinner with no checkpoint words — and long-running operations must be captured mid-operation in a checkpoint state, not only at the end | PENDING-RUN — W4-03 rendered case + rendered README requirements 5 is the check; integrated run owed (OPEN-3) |
| (f) Handover-integrity checks | Badge target verified server-side; link carries `opal_dev=1`; build contents match the handover message's claims | ACTIVE as process rule (M-1/M-2/M-3); exercised at the next handover — the first-look tranche delivery must list this ledger's non-green rows up front |

## Section F — TRUE / HONESTLY ABSENT / FALSE classification (capstone)

Whole-app classification sweep COMPLETED 2026-10-18 (full inventory:
`coordination/repair18/classification-sweep.md`, 137 items audited on the
integrated tip, including inherited surfaces not touched this cycle):

| Class | Count |
|---|---|
| TRUE | 38 |
| HONESTLY ABSENT | 43 |
| FALSE | **15 — gate failures under the capstone rule** |
| UNPROVEN (no honest evidence yet; never rounded up) | 41 |
| Total | 137 |

The 41 UNPROVEN items concentrate in six missing proofs: the integrated-tip
suite/rendered runs not yet executed; keyed Mac deciding runs; live provider
exercises (Deepgram-keyed paths, calls/TURN, ElevenLabs, Duffel, Expo);
never-rechecked domains (trips, Lives, opal_ai staging, the whole mobile
app); founder-judged splash/presence; one product decision (the
`messaging_business` grant offering).

### FALSE register (each item is a declared gate exception until fixed)

| ID | Item | Disposition |
|---|---|---|
| F-01 | OpenTable search returns the caller's query echoed as the result row when keyed; makes no HTTP call. Inert only because the key is absent. (The backend audit said "fixed in R18" — it was not.) | ELIMINATED on integrated tip (merge fa98d6c3): query-echo branch deleted; search returns disabled keyed or not - HONESTLY ABSENT. Worker proof: 243 backend tests, 0 failures (falsefix report). |
| F-02 | Opportunity evaluate route defaults `use_dinner_fixture=true`, unlabeled in the response | ELIMINATED on integrated tip (merge fa98d6c3): fixture is explicit opt-in; every response carries provenance - TRUE. Worker proof: opportunity/durable suites green. |
| F-03 | FCM push adapter posts to Google's shut-down legacy endpoint; reports credentials-present for a credential the send path never uses (false-ready). Inert only while creds absent | ELIMINATED on integrated tip (merge fa98d6c3): adapter retired; sends return fcm_not_configured, credentials_present? always false - HONESTLY ABSENT. Must not be listed as a capability until a real HTTP v1 sender is built and proven. |
| F-04 | Legacy Live panel: hardcoded fallbacks on real live cards (place "Rooftop jazz", host "Jordan", broadcaster "Sabrina", figma media) + seed-mode lines ("Sadeil + 3 are here", "Maya is on the way · 8 min") | ELIMINATED on integrated tip (merge fa98d6c3): invented place/host/broadcaster/media defaults and seed presence lines removed; real data or honest partial/empty - TRUE. |
| F-05 | Legacy Calls continuity signal: any group gets "3 of 4 aligned · Saturday 7:30" + a seed graph id unconditionally; 1:1 variant keys a signal off a `/chanelle/i` name test | ELIMINATED on integrated tip (merge fa98d6c3): unconditional/seed/name-keyed signals removed; signal only from the row's own data - HONESTLY ABSENT where no real signal exists. |
| F-06 | Center sticky re-engagement line (RF-2) — canned "You mentioned Maya earlier…" | FIXED on integrated tip (merge 34519b59, fixwave 88bbe909): state-layer consumption + emitter answer-shape guard; FR-17-03 case FAIL to PASS pre-merge on the branch; integrated full-suite confirmation PENDING-RUN. |
| F-07 | Center confirmation drops explicit time (RF-3) | FIXED on integrated tip (merge 34519b59): when_time + venue carried end to end; FR-08-01 case FAIL to PASS pre-merge; integrated confirmation PENDING-RUN. |
| F-08 | "Where is dinner?" unanswered from real rows (RF-4) | FIXED on integrated tip (merge 34519b59): Oracle answers from real plan rows incl. honest dead-ends; FR-13-03 case FAIL to PASS pre-merge; integrated confirmation PENDING-RUN. |
| F-09 | Plan execution 500 for Center-born plans (RF-1) — root cause code-confirmed on tip | FIXED on integrated tip (merge 34519b59): membership via creator/participant for conversation-less plans; FR-12-11 case FAIL to PASS pre-merge; creator 200 / stranger 403 / unknown 404; integrated confirmation PENDING-RUN. |
| F-10 | Founder seed resurrection: seed rewrites cancelled/completed plans back to "agreed" with no transition gate | ELIMINATED on integrated tip (merge fa98d6c3): seed restore only via explicit logged PlanTransition :seed_restore exception; product transitions from terminal still illegal - TRUE. |
| F-11 | Silent travel-minute defaults (`travel_minutes \|\| 20/30`) across feasibility/leave-by/prepare paths — measured vs assumed indistinguishable | ELIMINATED on integrated tip (merge fa98d6c3): Feasibility.TravelEstimate is the single fallback point; all five register sites label estimates at the contract boundary - TRUE. One same-shape site outside the register (ambient/execution_compose.ex) is named in the falsefix report as a follow-up - tracked as OPEN-9. |
| F-12 | Mexico City seed endpoint on a permanent product route, wired into the shipping client | ELIMINATED on integrated tip (merge fa98d6c3): controller gated on the founder-seed flag (403 when off), client helper deleted, TripCanvasView loads the real trip - HONESTLY ABSENT. (Canvas seed-mode initial fixture remains as seed-mode canvas only - named in the falsefix report.) |
| F-13 | Attention ingest documented dev/test-only but has no gate — any authenticated user can ingest | ELIMINATED on integrated tip (merge fa98d6c3): FounderSeed-pattern gate added (403 attention_ingest_disabled when off); doc and code agree - TRUE. |
| F-14 | `Release.seed` claims an `OPAL_RUN_SEEDS` gate that does not exist — seeds eval whenever the file exists | ELIMINATED on integrated tip (merge fa98d6c3): OPAL_RUN_SEEDS enforced in Release.seed itself; ops list with write defaults in the moduledoc - TRUE. |
| F-15 | Call channel silent catch-all: unknown events get `{:noreply}` — a client typo during a live call fails silently for everyone | ELIMINATED on integrated tip (merge fa98d6c3): catch-all replies {:error, unknown_event} - TRUE. |

Also named by the sweep (not counted FALSE, kept exact): booking-cancel
test seam still forwarded on tip (production fake effect unproven);
dead modules still present; OSM gateway "available: true" registry entry
nothing can route to; Serper dead config; group/family plans still
outside PlanTransition (UNPROVEN).

### Top-tier item added by founder directive (2026-10-18 04:15 PDT)

**F-16 (TOP-TIER) — live call transcription is not wired.** The canned
transcript artifact itself (BS-4) was deleted and that deletion is
grep-verified on the tip; what the founder reclassifies as a top-tier
FALSE-class defect is the remaining gap it papered over: phone-call
ingestion with LIVE transcription (Twilio Voice + Deepgram) does not
exist yet, so any call surface that implies transcription/understanding
is claiming a capability the product does not have. Rule until wired:
call surfaces are **honestly gated** (they say what they can and cannot
do, in human words); wiring live transcription is a build priority of
this program under the ingestion doctrine (Track SM design §7). The
Deepgram key's presence in the staging env is not wiring and is never
reported as such.

## Declared exceptions (non-green rows, for the delivery message — no surprises)

1. OPEN-1 (updated): RF-1..RF-4 FIXED and merged (34519b59); RF-5
   refuted with DB evidence. Remaining: integrated full-suite + API
   confirmation runs (PENDING-RUN at ledger level).
2. OPEN-2 (updated): HTTP cancel route LANDED (merge 34519b59);
   Drop-it web wiring in flight on `muse/r18-dropit`; until it merges
   the control remains honestly absent (`droppable: false`).
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
7. Section F classification — UPDATED 2026-10-18 post-merge: of the 15
   FALSE items in the register, **all 15 are now eliminated on the
   integrated tip** — F-06..F-09 fixed (merge 34519b59), F-01..F-05 and
   F-10..F-15 eliminated TRUE or HONESTLY ABSENT (merge fa98d6c3), each
   with worker test evidence in the fixwave/falsefix reports. What
   remains declared: **F-16 (top-tier)** — live call transcription is
   not wired, call surfaces honestly gated until it is; the
   classification counts on the merged tip are therefore 38+ TRUE /
   43+ HONESTLY ABSENT with the FALSE count at **1 open class (F-16)**
   plus OPEN-9's one named follow-up site; a fresh whole-app
   classification confirmation belongs to the verification battery.
   41 further items are UNPROVEN (no honest evidence yet), concentrated
   in the not-yet-run integrated suites and never-rechecked domains
   (trips, Lives, mobile).

FOUNDER_ACCEPTED = NO. FREEZE = HOLD. PASS2 = NO. Everything above is
machine-proven (or honestly not yet proven), pending the founder.

### Recurrences — charged to the check (founder recurrence rule, 2026-10-18)

The independent blind-spot hunts (method law: two hunters, no shared
notes; coordinator spot-verified every headline at the source) found
that three covers from the FALSE-fix wave were INCOMPLETE. The code is
being fixed in the hunt-fix waves; the failures below are charged to
the CHECK that verified the covers — the classification sweep's
cover-verification standard — and that check is hereby fixed:

- **REC-1 (F-05 cover incomplete):** the fix removed the fabricated
  continuity SIGNAL on CallContinuityDestination but missed the
  fabricated recent-calls HISTORY on the same destination (Hunt B-02).
  Check fixed: cover verification inventories the WHOLE surface's
  data set, not the named line.
- **REC-2 (F-11 cover defeated at a boundary):** the five register
  sites were labeled, but the DeviceMoment boundary pre-defaults
  `travel_minutes || 20` before calling the fixed LeaveBy, so the
  assumed value is labeled "measured" and the provenance fields are
  stripped (Hunt HA-06). Check fixed: cover verification includes
  every caller boundary of a fixed function.
- **REC-3 (F-12 cover unreachable):** the controller gate + client
  removal were real, but OpalApp mounts the canvas with a hardcoded
  `tripId="seed-trip-mexico-city"` (two mounts), so the real-trip path
  the fix built is unreachable from the product (Hunt B-09). Check
  fixed: cover verification includes reachability from the product's
  actual mounts.

The pattern under all three: a cover verified at the line the report
named, in a codebase where the same disease lived one step away. This
is exactly what the migration ledger's ZERO-REACHABLE verification
(catalog §3) exists to prevent; that check did not exist when the
covers were verified, and its absence is the lesson, recorded — the
hunt-fix waves + teeth + validator now carry it.

### Hunt finds (2026-10-18, both hunts complete; fixes in flight)

- Hunt A (back end): HA-01..HA-11 — incl. HA-02 invented "around 8:20"
  arrival persisted/broadcast as user-stated (FALSE); HA-03 channel
  revision default times "7:30 PM"/"8:00 PM" (FALSE); HA-01 simulate
  connector erasing its simulated flag (GATE-GAP + FALSE); HA-04
  Center challenge path rewriting plan time by direct Repo.update,
  bypassing PlanTransition (axis bypass); HA-05 Households writers
  unguarded; HA-07 Executor push errors mapped to "queued"
  (SILENT-FAILURE); HA-08 Twilio probe ungated. Angles 4 (cross-
  account) and 6 (lockdown back end) explicitly EMPTY.
- Hunt B (glass): 23 finds — incl. B-01 legacy Search 100% fixture;
  B-03/B-04 painted calls; B-05 Global Opal fixture best-fit; B-06
  fixture venue fallback on server failure; B-07 seed extras merged
  into live data unlabeled; B-08 unbadged intel mock mode; B-10 C2
  story viewer empty stage; B-11 Home feed never reads back a
  published post; B-12 loadPlans swallowing failures (outages paint
  as empty accounts; "Try again" miswired); B-13 C2 "Open the chat"
  structurally unreachable; B-15/B-16 lockdown glass gaps (no
  conversion caller anywhere; virtual plans rendered as physical).
  L8/L10 angles: no new confirmed finds.
- Dispositions: hunt-fix waves muse/r18-huntfix-be and
  muse/r18-huntfix-web (in flight); every find ends TRUE or HONESTLY
  ABSENT/GATED or a named residual — none parked.

## Founder direction verdict (2026-10-18 05:54 PDT) — DIRECTION APPROVED

On the first-look tranche (badge seed - 3b34052): "Yeah, it clears the
bar... I think you're spot on. I really do." Division C direction is
APPROVED. FOUNDER_ACCEPTED remains NO (direction is not acceptance;
the phone walk decides). Six refinements are mandatory before the
walk and are tracked in the status file as DIR-1..DIR-6: event-in-
conversation on chats list/thread/call log (with permanent cases +
rendered proof), Settings built to spec + nav-pad evaluation, Home
legibility + a plain-language surface map in the pack, proactive
reveal presentation under QUIET + L8, one logo/wordmark refinement
pass (keep the interesting, remove the weird; refined mark judged in
the full pack), and Graphs at full pack standards.
