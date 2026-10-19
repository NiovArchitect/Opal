# Repair #18 — WALK ACCEPTANCE (machine-proven assembly, close-out phase 9)

**FOUNDER_ACCEPTED = NO.** Everything below is machine-proven (or
honestly not yet proven), pending the founder's phone walk. Direction
was approved 2026-10-18 05:54 PDT; direction is not acceptance.

- **Build traced:** integrated tip `fa3f0912` on `muse/repair-18`
  (tree `9f56b5d4`, mirror-verified on GitHub as `ad927478`, 6,840
  entries entry-by-entry — status file, Mirror Push Complete
  2026-10-18 ~17:22 PDT). This acceptance branch
  `muse/r18-acceptance` is docs-only off that tip; no product code.
- **Governing check:** the map-trace coherence pass (founder,
  2026-10-18 14:27–14:29 PDT). Full trace, verdict tables, W-GAP
  dispositions and the complete numbered findings list (MT-01…)
  live in `coordination/repair18/maptrace-report.md`. Any item
  below that cannot be traced to the surface map or the wallet map
  is named there as a finding, not footnoted here.
- **Final battery (the battery every proof below ultimately rests
  on):** `coordination/repair18/final-battery-report.md`, on
  `891ebf32` (test repairs only) merged as `fa3f0912`:
  backend pinned 02:00 LA **3,170/0**, pinned 14:00 LA **3,170/0**;
  backend unpinned 3,170/1 (one proven contention flake, see
  §7); web **23 failed / 16 files, 1,483 passed — exact baseline**;
  typecheck **exactly 9** pre-existing errors; mobile **105/105**;
  API regression **101/101 PASS in-suite**; posture **118 explained**
  (see §6).

---

## 1. F18 items — the FALSE register (F-01…F-16)

Source register: `shots/repair18/COMPLAINT_LEDGER.md` Section F;
classification sweep `coordination/repair18/classification-sweep.md`.

| Item | Disposition at `fa3f0912` | Proof |
|---|---|---|
| F-01 OpenTable query-echo | ELIMINATED — HONESTLY ABSENT (disabled keyed or not) | Ledger §F; falsefix report; merge `fa98d6c3` |
| F-02 Opportunity fixture default | ELIMINATED — TRUE (explicit opt-in, provenance on every response) | Ledger §F; falsefix report |
| F-03 FCM dead endpoint / false-ready | ELIMINATED — HONESTLY ABSENT (`fcm_not_configured`; must not be listed as a capability until a real HTTP v1 sender is built and proven) | Ledger §F; falsefix report |
| F-04 Legacy Live fixture fallbacks | ELIMINATED — TRUE (real data or honest partial/empty) | Ledger §F; falsefix report |
| F-05 Calls continuity fabricated signal | ELIMINATED, then RECURRED in part (REC-1: fabricated recent-calls history on the same destination), recurrence FIXED | Ledger §F + Recurrences; huntfix-web report B-02 (FIXED → real or absent) |
| F-06 Center sticky re-engagement (RF-2) | FIXED; integrated confirmation now discharged | Merge `34519b59`; final battery API 101/101 |
| F-07 Center confirmation drops explicit time (RF-3) | FIXED; confirmation discharged | Merge `34519b59`; final battery API 101/101 |
| F-08 "Where is dinner?" unanswered (RF-4) | FIXED; confirmation discharged | Merge `34519b59`; final battery API 101/101 |
| F-09 Plan execution 500, Center-born plans (RF-1) | FIXED; confirmation discharged | Merge `34519b59`; final battery API 101/101 |
| F-10 Founder seed resurrection | ELIMINATED — TRUE (logged `:seed_restore` gate exception only) | Ledger §F; merge `fa98d6c3` |
| F-11 Silent travel-minute defaults (register sites) | ELIMINATED — TRUE (`Feasibility.TravelEstimate` labels measured vs assumed) | Ledger §F; merge `fa98d6c3` |
| F-11 follow-up site (OPEN-9, `ambient/execution_compose.ex`) | **CLOSED since the ledger was written** — FIXED → TRUE | huntfix-be report, OPEN-9 section |
| F-12 Mexico City seed on a product route | ELIMINATED — HONESTLY ABSENT; recurrence REC-3 (unreachable real-trip path, hardcoded `seed-trip-mexico-city` mounts) FIXED | Ledger §F; huntfix-web report B-09 |
| F-13 Attention ingest ungated | ELIMINATED — TRUE (403 gate when off) | Ledger §F; merge `fa98d6c3` |
| F-14 `Release.seed` phantom gate claim | ELIMINATED — TRUE (`OPAL_RUN_SEEDS` enforced in `Release.seed`) | Ledger §F; merge `fa98d6c3` |
| F-15 Call channel silent catch-all | ELIMINATED — TRUE (unknown events reply `{:error, unknown_event}`) | Ledger §F; merge `fa98d6c3` |
| **F-16 Live call transcription not wired** | **STAYS OPEN — top-tier FALSE class, honestly gated.** No live call has ever exercised the Deepgram grant + websocket path; the key's presence is not wiring. Call surfaces must say what they can and cannot do until wired. | Ledger §F (top-tier item, founder 2026-10-18 04:15 PDT); connections-verification report, Deepgram-live row: ABSENT (function) |

**F-count at the traced tip: 15 of 16 eliminated/fixed with proof;
1 open class (F-16), named, gated, and carried as MT-02 in the
map-trace findings.**

## 2. Walk #4 catalog — W4-01…W4-06

Source: ledger Section B.

| Item | Status (machine-proven) | Proof |
|---|---|---|
| W4-01 Send spam / no lock + intent misroute ("Schedule 7 am church" folded into a dinner change proposal) | **GREEN** | Three-layer fix (client send lock + idempotency key + backend intent guard), `muse/r18-w4-send` `0534aea4`; `coordination/repair18/phase2-w4-send-report.md`; cases FR-18-W4-01a/b/c in the API suite, 101/101 at final battery |
| W4-02 Layering in the real client (Next Together overlap, pill over bubbles, banner bleed, clipped fragment) | **PARTIALLY PROVEN — named exception.** Rendered case exists with geometry + hit-test assertions and failed as designed on the pre-redesign base (teeth proven). No wave report records a full W4-02 rendered-case run against the integrated shell at `fa3f0912`; the unify / harmony2 packs give rendered geometry proof for the chats/thread/Home surfaces it touches, which is partial, not the case run. | Ledger §B/OPEN-3; `shots/regression/rendered/cases/w4-02-*.case.mjs`; packs: `shots/repair18/unify-pack/`, `shots/repair18/harmony2-pack/`. Finding MT-10 |
| W4-03 Graphs card clipping (attendance cut off, "omething", stray shape) | **PARTIALLY PROVEN — named exception**, same shape as W4-02: rendered case exists (base run: 36 failures, cards held at 90px vs 134–178px content — the founder's screenshot reproduced by measurement); integrated-shell case run not recorded in any wave report at this tip. Harmony2 deck-fold/geometry proof (0/0 probes on its surfaces) is partial cover only. | Ledger §B/OPEN-3; harmony2 report §2(c). Finding MT-10 |
| W4-04 Nothing editable | **GREEN** | W4-04a/b/c: `PATCH /opal/plans/:id` through the PlanTransition gate, read-back on every surface for both parties; cases in suite, 101/101. Named contract exception stands: schedule fields are refused by the edit contract on purpose (schedule changes go through the revision system, W4-04c pins the refusal); graph titles / plan details beyond title are not yet editable — ledger sweep (d) |
| W4-05 Dead controls (Story open, Grow your circle, Add story, Go live did nothing) | **PARTIALLY PROVEN.** The named controls were wired or honestly removed (`muse/r18-w4-controls` `2ef18331`); the hunt-fix wave then fixed the C2 dead-control family it found (B-10 story viewer, B-13 chat-for-plan, B-14 forget confirm — huntfix-web report). The class-level sweep over *every* tappable element in the served integrated app is still not recorded as a single completed inventory at this tip. | Ledger §B/E-b. Finding MT-11 |
| W4-06 What he liked (Center, chats structure, call thread) | **SUPERSEDED — recorded, not a freeze.** Founder's design escalation 2026-10-17 23:27 PDT overrode this as a protected list; those surfaces were redesigned to the higher standard (unify wave for the ChatsHome family). | Ledger §B; status file, Founder Design Escalation |

## 3. DIR items and the founder refinement rulings

Source: status file, Founder Direction Verdict 2026-10-18 05:54 PDT
(DIR-1…DIR-6) plus the 2026-10-18 refinement sequence.

| Item | Status (machine-proven) | Proof |
|---|---|---|
| **DIR-1** Event in conversation — chats list, thread, and call log surface the actual shared upcoming plan (real record, never painted) | **GREEN — closed at 101/101.** Cases FR-18-DIR1-01 (17 checks) and FR-18-DIR1-02 (14 checks) pass **in-suite** at the final battery, no isolation workaround. The earlier suite-order failures were a case-isolation defect (sibling-case plan binding), repaired with **zero assertions changed**. | `coordination/repair18/dir1-report.md`; `dir1-casefix-report.md` (standalone, in-suite-order, back-to-back, and poisoned-DB runs all PASS); final-battery report Leg 7 |
| **DIR-2 / Connections** — Settings built to the architecture spec (findable, every control TRUE) + nav-pad evaluation; and the Connections verification (each connection split to its true rows) | **Settings: BUILT in the form traced in the map-trace §1/§5** (You hub, grouped sections, search, HA-A wide sidebar at ≥900px). **Connections: VERIFIED with split rows** — Twilio Verify TRUE; Twilio Messaging HONESTLY GATED (no sender exists on the account — live probe: 0 numbers, 0 Messaging Services; founder step F-1); Deepgram batch TRUE, Deepgram live ABSENT (= F-16); Twilio Voice/NTS ABSENT as a user-facing connection (never exercised); Google Calendar HONESTLY GATED (app credential verified, no user grant ever completed; founder step F-3). Pairing, capture and other honestly-absent legs are named in MT-14/MT-15. | `coordination/repair18/settings-build-report.md`; `connections-verification-report.md` Parts 2–5 (cases FR-18-11/12/13); surface-map entries 11/12; harmony2 report §3 (HA-A) |
| **DIR-3** Home clarity + plain-language surface map in the pack | **Map: DELIVERED** (`coordination/repair18/surface-map.md`, entries 1–19 + findability register). **Home legibility: BUILT + pack-proven in part** (home-clarity treatment in the harmony/unify packs); Home's full intended form remains decomposed — see DIR-Home below and MT-01. | `home-clarity-spec.md`; surface-map entry 6 today-notes (superseded in part by huntfix B-11/B-10, see map-trace §1) |
| **DIR-4** Proactive reveal presentation (timed, elegant, inside QUIET; L8 presence discipline) | **BUILT for the in-scope family; register-held forms stay unbuilt by design sequence.** One derivation (`OpalCore.SocialFlow.Reveal`), one endpoint, permanent persisted dismissal, QUIET ceilings in the derivation. Surfaces: Center deck, thread (at most one, in-flow), chats list (P1 line takeover only). Cases FR-18-DIR4-01…06 (backend) + 12 web tests (14/14 after the ambient correction). | `coordination/repair18/dir4-report.md` §§1–6 |
| DIR-4 held forms (the register) | **OPEN-DEFERRED, each with its recorded dependency:** push forms — D-4 (no truthful push transport); mode picker + consequences — D-8 (no operational-mode object, = W-GAP-19); call-surface forms — D-2 (no Calls place in the C2 shell, F-GAP-9) + D-6 (no per-conversation call review); Activity-trail / Opal's Home full forms — D-3 (trail/Home unbuilt; P6 ships in limited form only); composed basis lines — D-5; quiet-hours copy — D-7; Home-feed / Graphs / plan-page reveal forms — not in this wave's buildable family. | dir4 report §4. Findings MT-04/MT-05 |
| DIR-4 founder refinement: **P3 stall window** | **NAMED SIMPLIFICATION, still in the shipped build.** Spec §5.1's stall condition has no readable record at this tip, so P3 earns on the one-named-thing + actionable clauses only; a young plan with exactly one missing slot can earn a P3. | dir4 report §4, last item. Finding MT-03 |
| DIR-5 Logo / wordmark refinement (keep the interesting, remove the weird) | **PACK-PROVEN, founder-judged.** Orb system + logo refinement + harmony0 lockup work shipped; the refined mark is judged in the packs, deliberately not pre-claimed green. | `orb-system-report.md`; `logo-refinement-report.md`; harmony0 report; packs in §5 below |
| DIR-6 Graphs at full pack standards | **BUILT + pack-proven in part** (harmony2 essence audit covers Graphs; goal link/unlink picker completed with real API + read-back). The D5 grouped-list projection the design calls for still does not exist behind the scenes — grouping is a client-side stand-in that never invents a plan's state (surface-map entry 9 today-note; W-GAP-29). | harmony2 report §§1/6; surface-map entry 9. Finding MT-08 |
| **Anchor ruling** — the orb is the anchor; the app moves to fit it, never the reverse; one opal stone, every color, two gyroscope rings, people as points | **HELD in the shipped build.** Orb master is the source for splash, dock, wordmark lockups, app icon + favicon (harmony2 icon pass: derived from the orb master, byte-proven in the served slots, interim references retired). | Status file, Brand Essence Law + Orb Anchor 2026-10-18 06:03–06:07 PDT; harmony0 report; harmony2 report §5 |
| **Lockup law** — wordmark and orb stack vertically, or either appears alone; never side-by-side as a competing pair | **HELD, pack-proven per surface** (harmony0 per-surface verdicts record the lockup form on each: stacked on splash-1, single-element elsewhere, none where no pairing belongs). | Status file, Lockup Law 2026-10-18 12:54 PDT; harmony0 report, per-surface verdicts |
| **Theme unification** — legacy surfaces (call log, chats list, chat thread) change face into the new theme; functional layout/flows stay; dark genuinely dark; borders only when they say something (state color or entity tint at ambient intensity); saturated neon outline retired | **MERGED + pack-proven.** ChatsHome family themed; purposeless borders removed (test-pinned); indicator drift pinned in code (`unifyDrift` 13/13) and rendered-identical across surfaces; DIR-1 proof stayed green through the redesign (web 13/13 + API 2/2 at that merge). Residue: R17-only chrome stays off-theme on the fallback path only — founder call, exact files named (MT-13). | Merge `4de1c73c`; `unify-report.md`; pack `shots/repair18/unify-pack/` (16 side-by-side pairs, both modes) |
| **Halo defect** — dock border must break cleanly around the raised orb; never slice through the transparent halo | **FIXED, both shells, both modes, measured.** Border segments terminate at the disc edge; BEFORE both shells crossed. | Status file 2026-10-18 13:46 PDT; unify report Scope 0; unify-pack halo PASS |
| **Splash orders** — Splash 1 is the full master composition (not the orb shrunk into a badge); small margin of its own field, no ring/light bleeding off the edge; rings animate slowly and continuously; Splash 2 boundary (`Enter Opal` exactly once, there; never twice) | **BUILT + pack-proven.** Living-rings system (two gyroscope axes + precessing arc + people-points), reduced-motion rest, night field in both modes; unjustified `OrbGemPattern` backdrop cut under the ambient rule. Exactly-once is a rendered-count proof owed to the walk pack, not a code fact (wallet map §DC marks it UNPROVEN-render). | `splash-report.md` §§1–7; pack `shots/repair18/splash-pack/` (incl. motion `.webm`, reduced-motion capture). Finding MT-17 (render-count leg) |

## 4. Opal's Home — exactly as decomposed (founder brief, 2026-10-18 14:30 PDT)

The designed Opal's Home (surface-map entry 18; wallet map §DC
DC-GAP-5 / W-GAP-12) is **decomposed**, and the decomposition is the
acceptance statement — no other reading is offered:

| Component | State at `fa3f0912` |
|---|---|
| **Doorway** (tap the Center character / orb → lands on You with Soul + Memory open; dock orb → Center → character, two taps from anywhere) | **SHIPPED** — SM scoped build; testids `c2-center-orb-doorway`, `c2-opening-soul-memory` |
| **Soul card + Memory cards** (Soul edits the real `AssistancePreference` truth — how forward, quiet hours, time zone, per-day cap, feedback; Memory lists every capsule with provenance; per-capsule forget hard-deletes via the owner path, two-step confirm) | **SHIPPED (first form)** — SM scoped build; `smSoulMemory` web tests + SM backend/isolation suites |
| Presence / status (what Opal is doing right now) | **DEFERRED — not built.** (Center deck presence is a separate, earlier surface; wallet map §DC records deck presence as a constant on one path — MT-08 family.) |
| Activity trail (what Opal did / looked at, and why, newest first) | **DEFERRED — not built** as Opal's Home / Settings 12.5. Partial relatives exist and are not this trail: DIR-4 P6 limited form (one visit-scoped report line, last 24h, deck/feed only) and adopt2's account-activity entries for credential use / device revoke / deletion. |
| Upcoming (what Opal has coming up or is watching) | **DEFERRED — not built** as an Opal's Home component. (The Center deck's Next together / Coming up plan sections are the user's plans, not this component.) |
| Approvals (anything awaiting the user's approval, answerable in one tap, in this place) | **DEFERRED — not built** as a place. Approvals still happen where the work happens (plan page, check-in), exactly as surface-map 12.5 recorded. Adopt1's holding counters name approvals waiting as a count with links in chat payload — a counter, not the queue. |

Finding **MT-01**. FOUNDER_ACCEPTED for Opal's Home as a whole: NO —
two components shipped, four deferred, by the recorded scoped-build
decision (status file, SM Build Decision 2026-10-18 ~11:40 PDT).

## 5. Rendered packs (the rendered-layer proof that exists)

| Pack | Path | What it proves |
|---|---|---|
| Delta pack (step-0 / harmony slice) | `shots/repair18/delta-pack/` | Splash 1/2, Center, Home, chats list, thread, call log, You, Settings — both modes, with manifests |
| Splash pack | `shots/repair18/splash-pack/` | Splash 1 full composition both modes + motion + reduced motion; dock closeups; master side-by-sides |
| Unify pack | `shots/repair18/unify-pack/` | Theme unification before/after, 16 pairs, both modes; halo PASS both shells both modes; drift gate |
| Harmony2 pack | `shots/repair18/harmony2-pack/` | Essence remainder before/after, both modes; wide-viewport HA-A pair; icon byte-proof; interaction proofs; served preview tree-gated to the harmony2 tip |

No pack in this list is a phone walk. Pack proof is machine-side
rendered proof; the founder's walk is the acceptance event and has
not happened.

## 6. Posture 118 — tied to the register

Final battery, `node scripts/pattern_posture.mjs` on the traced tip:

| Pattern | Count | Explanation |
|---|---|---|
| MP-1 scripted responder reachable | 0 | — |
| MP-2 fixture-painted surfaces | 81 | 19 web seed-flow sites across 8 files + 62 inline `"seed-*"` literals; backend 0. Unchanged at this tip; these are the seed-mode sites, inventoried in wallet map §M (MP-2 is the largest remaining contamination class — MT-19) |
| MP-3 per-surface re-derivation (C2) | 0 | — |
| MP-4 canned provider output | 0 | — |
| **MP-6 unscoped personal-memory reads** | **26** | `memory.ex` 4, `continuity.ex` 1, `durable_preference_memory.ex` **12**, `follow_through.ex` 7, `memory_intelligence.ex` 2 |
| **MP-11 indicator drift** | **11 files** | Allowlist files still carrying canon-hex / drift sites |
| MP-5/7/8/9/10 | n/a | Per their labelled bounds in the posture script |
| **TOTAL countable** | **118** | — |

**Reconciliation (the register tie the trace required):**
117 (teeth-2 baseline) **+2 MP-6 −1 MP-11 = 118.**
- MP-6 24 → 26: both additions are in `durable_preference_memory.ex`
  (10 → 12) and both were annotated when they landed — adopt2's
  `erase_all_for_owner/1` (10 → 11, commit `014848fa`) and SM's
  `erase_one_for_owner/2` (11 → 12, commit `5e51ccea`). Both are
  owner-module erasure functions: routing erasure *through* the
  owner raises the counted site total while tightening scoping —
  the MP-6 gate counts the owner/facade too (FIX-9). This is the
  wallet map §M MP-6 row's "remaining" family in counted form: the
  conversion of MP-6 as a pattern *is* the wallet build
  (W-GAP-05/09, GYRO-01/06), of which the SM scoped build is the
  first form for the capsule class only.
- MP-11 12 → 11: harmony2 retired `main.tsx` from the allowlist
  (commit `3021e663`) after its one canon-hex use (the error
  screen's `#00e5ff`) was replaced with the sampled accent.
- The final-battery brief's expected 119 omitted the MP-11
  retirement; 118 is the explained number. No unexplained growth;
  MP-1/MP-3/MP-4 remain 0, MP-2 unchanged at 81.

## 7. Replay / drill rows

| Row | Status |
|---|---|
| Mac replay of the integrated close-out tip | **DONE** (`coordination/repair18/replay-drill-report.md`): preview mirrored to `fa3f0912`, TREE GATE PASS (Mac tree = `9f56b5d4` exactly, mirror commit `095978d5`), BEAM start postdates the mirror, health ok + `synthetic_development`, LAN 192.168.0.33, badge `seed - 095978d` both modes; migrations 110 up / 0 down through `20261029050001`. Live API suite on the Mac stack: **97/101** — the 4 failures are environment-classified, not silent: FR-18-02-revision (1/29; a pinned-clock expectation under the real clock — passes 29/29 in the pinned battery on this identical tree), FR-18-B2-01 (5/20; shared long-lived DB residue — passes on the battery's fresh synthetic DB), FR-18-B5B (5/64; solo-context rhythm under real clock + shared DB), FR-18-W4-01c (1/27; with live provider keys the fold carried a "7 PM" label where the check requires canonical "7:00 PM" — the plan landed correctly with no ASK; named here as the one Mac-stack result with a product-side lesson: canonical label enforcement at the fold). Rendered proof on the replayed build via the waves' capture harness: 20 screenshots, both modes, all stamped `095978d5`, icons 5/5, docOverflow 0 (`run-rendered.mjs` itself could not run on the Mac — seed 429 + chromium-1248 not cached; harness limits, recorded). |
| Revert drill (Repair #17 kept untouched as the drill-tested revert spot) | **DONE — DRILL PASSED BOTH DIRECTIONS** (same report): `opal-fallback` worktree created at R17 tip `1892e5d6`, served on the preview ports (health ok), badge proven **`seed · 1892e5d`** in both modes through the real OTP sign-in flow in Chromium (the R17 shell rejects seeded-storage sessions, so the drill walked the real flow); switch back complete — preview restarted on the integrated tree, health ok, badge `seed - 095978d` re-proven both modes, preview left RUNNING the integrated build. The founder's `opal-walk` was never touched (HEAD `808c7bd6` and its Oct 17 server processes verified unchanged at the end). |

Findings MT-21 (both rows).

## 8. Suite scorecard at the traced tip (final battery)

| Leg | Result |
|---|---|
| Backend pinned 02:00 LA | **3,170 tests, 0 failures** |
| Backend pinned 14:00 LA | **3,170 tests, 0 failures** |
| Backend unpinned | 3,170 tests, 1 failure — `CompoundQualityTest` dyad maturity, 5s GenServer timeout under a load spike (16.6 on 2 schedulers), no assertion involved; isolated 12/12 in 0.2s; same test green inside both full pinned runs. Recorded as a proven contention flake, **not re-run away** (final-battery report Leg 1) |
| Web | 23 failed / 16 files, 1,483 passed (1,506) — **exact baseline** |
| Typecheck | **exactly 9** pre-existing errors, none new |
| Mobile | **105/105**, 22/22 suites — see MT-06 for the lockfile wart on how this run was provisioned |
| API regression | **101/101 PASS** in-suite (99 casefix-era + DIR1-01 17 checks + DIR1-02 14 checks + FR-18-02-revision 29/29) |
| Adopt2 repaired file | 13/13 (test-only repairs at `891ebf32`, merged in `fa3f0912`) |
| Posture | **118 explained** (§6) |

## 9. Complaint-ledger rows

Every complaint-ledger row is mapped to its proof in the refreshed
ledger itself: `shots/repair18/COMPLAINT_LEDGER.md`, Refresh section
(phase 9, this branch) — which re-derives every row's status from
the evidence above, closes the casefix row and the DIR-1 rows,
keeps F-16 as the named top-tier open FALSE, and lists every
remaining non-green row as a declared exception. This file does
not duplicate that table; the ledger is the row-level record and
this assembly incorporates it by that reference, as the ledger's
own gate rule requires.

**Declared non-green at handover (no surprises):** F-16 (MT-02);
full Opal's Home deferral (MT-01); DIR-4 register-held forms
(MT-04); W4-02/W4-03 integrated rendered-case runs (MT-10); W4-05
whole-app dead-control inventory (MT-11); replay + revert-drill
rows pending coordinator (MT-21); mobile lockfile desync (MT-06);
plus the remaining findings MT-03, MT-05…MT-09, MT-12…MT-20,
MT-22, MT-23 in the map-trace report.

FOUNDER_ACCEPTED = NO.
