# REPAIR #19 — WAVE W17: THE RETROSPECTIVE (item W5-21)

Founder, 2026-10-18 23:27 PDT: "Learn from your mistakes and improve —
go back and make sure that any mistakes you did, things that keep
repeating themselves, don't happen again."

- **Worktree / branch:** `~/workspace/opal-graph/wt-r19-retro` on
  `muse/r19-retro`, off merged tip `7fa7dc98`. Analysis only: no
  application code was edited, nothing is committed by this wave.
- **Evidence base (all read at source for this report):**
  `shots/repair18/COMPLAINT_LEDGER.md` (incl. its phase-9 Refresh and
  the Recurrences section), `shots/repair18/MISTAKE_PATTERN_CATALOG.md`
  §5 (teeth-2 ledger), `shots/repair18/WALLET_MAP.md` §M/§BS,
  `coordination/repair18/maptrace-report.md`,
  `coordination/repair18/enforcement-teeth-report.md`,
  `coordination/repair18/unify-report.md`,
  `coordination/repair18/deckfix-report.md`,
  `coordination/repair18/dir4-report.md`,
  `coordination/repair19-status.md` (WALK-5 catalog W5-01..W5-28 +
  heartbeats), and the R19 wave reports W1–W9, W12–W14, W18-FIX.
  The posture script was re-run on this tip for §1C.
- **Method:** for every registered recurrence and every standing
  check, the check was located in code or in process, and its
  scanned breadth was compared against the breadth of the lesson
  that charged it — line vs surface vs boundary vs mount, per the
  breadth rule broadcast 2026-10-18 ~23:27 PDT. A check that covers
  less than its lesson is a widening item, specified dispatch-ready:
  what it scans, at what layer, what it fails on.

## Verdict, stated plainly

**Of the 14 charged checks audited in §1 (the 3 recurrence checks
REC-1..REC-3 and the 11 standing pattern checks MP-1..MP-11),
zero — 0 — are verified at the full breadth of their lesson.**
Every one is labeled PARTIAL or HOPE in the program's own teeth-2
ledger, and this re-walk confirms those labels at source. The code
fixes for REC-1/REC-2/REC-3 landed; the *checks* that were "fixed"
in response are prose standards in the ledger, not machine gates at
surface / boundary / mount breadth. That is why the same shape kept
recurring inside R19 itself (§2, §3).

**Of the 28 WALK-5 catalog items, 15 are full repeats of an earlier
failure class, 7 are partial repeats, and 3 are process-level
repeats of the same lesson restated as method (W5-19/20/26).
Two are not repeats (W5-16, W5-27); W5-21 is this item itself.**

**Dispatch-ready widening / new-check specs in this report: 14 in
§1 (RW-01..RW-14), 16 still-owed widenings named in §2, and 6 new
checks in §3 (NC-1..NC-6) — 36 in total.** R19 also *built* several
correct widenings (the W1 seed gate, the W2 single call-state
derivation, the W3 chord-geometry pin, the W4 settle-equality test,
the W18-FIX glass registry); each is credited in §2 with its
remaining breadth gap, because a built widening with a residual gap
is not a closed lesson either.

FOUNDER_ACCEPTED stays NO. Nothing in this report is a pass claim.

---

## §1 — RE-WALK OF THE RECURRENCE REGISTER

### 1A. The registered recurrences: REC-1, REC-2, REC-3

The register lives in `COMPLAINT_LEDGER.md`, "Recurrences — charged
to the check" (founder recurrence rule, 2026-10-18). The three
recurrences were found by the independent blind-spot hunts after
the FALSE-fix wave's covers had been verified. The ledger's own
summary of the pattern under all three governs this whole report:

> "A cover verified at the line the report named, in a codebase
> where the same disease lived one step away."

| ID | Lesson (what recurred) | Check charged with preventing it | Breadth verdict | Widening spec (dispatch-ready) |
|---|---|---|---|---|
| **REC-1** (F-05 cover incomplete; Hunt HB-02) | The F-05 fix removed the fabricated continuity **signal** on `CallContinuityDestination` but missed the fabricated recent-calls **history** on the *same destination*. Lesson breadth: **surface** — a cover must inventory the whole surface's data set, not the named line. | The classification sweep's cover-verification standard, "fixed" in the ledger to: *cover verification inventories the WHOLE surface's data set, not the named line.* Plus MP-2's teeth (seed-data import baseline). | **NOT FULL BREADTH.** The "fixed" check is a sentence in the ledger. No machine check inventories a surface's rendered data set. The teeth gate what a file *imports*, not what a destination *renders*: HB-02's constants lived in the destination itself, reachable without any new seed import. The code fix landed (huntfix-web B-02, `PERSON_RECENT`/`GROUP_RECENT` deleted), verified by 10 component tests in `huntFixWeb.test.tsx` — component breadth, again, not served-surface breadth. Posture at this tip still counts **81 MP-2 sites** (§1C). | **RW-01 — Surface data-set inventory gate.** For every destination named in a FALSE/F- register row, a rendered-suite case (served build, seed-off session) that enumerates *every* data-bearing element on the destination (list rows, sections, headers, empty states) and asserts each one's provenance: real contract field or honest absence. **Scans:** the served surface's DOM at phone size, both modes. **Fails on:** any rendered string/count/row that cannot be traced to the surface's one projection in the same run. **Lives in:** `shots/regression/rendered/` as a per-destination case family, run at pack time; a register row cannot close without its case. |
| **REC-2** (F-11 cover defeated at a boundary; Hunt HA-06) | The five F-11 register sites were labeled, but the `DeviceMoment` **boundary** pre-defaulted `travel_minutes \|\| 20` *before* calling the fixed `LeaveBy`, so the assumed value was labeled "measured" and the provenance fields were stripped. Lesson breadth: **boundary** — every caller boundary of a fixed function is part of the cover. | Cover verification "fixed" to include *every caller boundary of a fixed function*; the F-11 suite owned the five register sites. | **NOT FULL BREADTH — and the leg is still not settled.** The code fix landed (huntfix-be HA-06 + OPEN-9, commit `2f75c526`), but the ledger's own phase-9 Refresh refuses to close it: *"REC-2's boundary leg (HA-06) remains contested C-2 — no later report settles its reachability"* (map-trace MT-22, wallet §V.4 C-2: HA-06/HA-10 reachability unresolved). A check whose subject's reachability is contested has not verified anything at boundary breadth. No static registry of callers-of-a-fixed-function exists to diff against; the F-11 suite covers the sites it was told about, which is the original narrowness. | **RW-02 — Caller-boundary closure check.** When any function is fixed under a register row, the fix commit must include a generated caller inventory (compiler/grep-derived call graph for that function, all callers, all callers-of-callers one level up) checked in beside the fix, and a test per caller asserting the fixed contract survives the boundary (provenance fields present, no pre-defaulting: callers pass raw maybe-nil, never a defaulted value). **Scans:** backend `lib/` call sites of the named function + the inventory file. **Fails on:** a caller not in the inventory; a caller applying `\|\| <number>`, `|| <number>`, or any default to a governed value before the call. **First application:** `LeaveBy`/`TravelEstimate` — settle C-2 by running it and recording the reachability verdict in the ledger. |
| **REC-3** (F-12 cover unreachable; Hunt HB-09) | The F-12 controller gate + client removal were real, but `OpalApp` mounted the trip canvas with a hardcoded `tripId="seed-trip-mexico-city"` (two mounts), so the real-trip path the fix built was **unreachable from the product**. Lesson breadth: **mount** — a cover that cannot be reached from the product's actual mounts is not a cover. | Cover verification "fixed" to include *reachability from the product's actual mounts*; the migration ledger's zero-reachable rule (catalog §3) is named as its standing form. | **NOT FULL BREADTH.** The code fix landed (huntfix-web B-09), but zero-reachable verification exists only as the wallet map's §M inventory — a document, refreshed by hand, not a gate that runs when a mount changes. The teeth suite contains no mount-reachability check for any pattern. The same lesson recurred *inside R19's own scope* before this report was written: the DIR-4 lit reveal was present in the API and unreachable on the Center deck until the deckfix (see §2, W5-13 note and the deckfix F1 record) — a mount-breadth failure on a surface the register never listed. | **RW-03 — Mount-reachability gate.** A static + rendered pair: (a) static — for every surface/destination in the surface map, the test walks the served shell's mount tree (`C2Shell` + hosts) and fails on any hardcoded entity id (`tripId=`, `planId=`, `conversationId=` string literals) in a mount, and on any mapped surface with no mount path from the served shell; (b) rendered — each mapped surface is opened through the real navigation path in the pack run, not deep-linked. **Scans:** `apps/opal_web/src` mount sites + the surface map. **Fails on:** literal-id mounts, unmounted mapped surfaces, mapped surfaces reachable only via `?shell=`/`?review=` overrides. **Note:** W13's S-1 finding (the `?shell=r17` override renders the entire legacy shell inside the served build) is exactly a mount this gate exists to adjudicate — it must be decided by ruling, not survive undecided. |

**Successors note.** No REC-4+ was ever registered. Two later events
meet the register's own definition of a recurrence (a cataloged
mistake recurring after its check exists) and were never charged:
**(S-1)** the deckfix F1 event — DIR-4's lit reveal present in
`GET /reveals`, absent on the glass because the Center deck's slot
logic used a different truth (plan-status family + capped card
sets) than the reveal derivation, and DIR-4's unit fixtures always
placed the plan inside the deck (deckfix-report.md §F1); and
**(S-2)** the call log remaining in the legacy face after the
unification wave (see §2, W5-03). Both are audited as repeats in
§2. This report recommends they be entered in the ledger as
REC-4 and REC-5 respectively, charged to RW-03 and RW-10 below —
the register only works if new recurrences are added to it, and
the fact that neither was is itself a finding (see NC-6's sibling
point in §3: counts and registers that are not gated drift).

### 1B. The standing pattern checks: MP-1..MP-11 (the pattern catalog tooling)

The catalog's standing checks are the enforcement teeth
(`mistakePatternEnforcement.test.ts` web,
`repair18_pattern_enforcement_test.exs` backend,
`scripts/pattern_posture.mjs` measurement), red-teamed once
(teeth-2, FIX-1..FIX-12). Each row below takes the check's breadth
from catalog §5 and the gate files at this tip — in every case the
narrowness is admitted in the check's own header, which is honest,
but honesty about a bound is not coverage of the class.

| Pattern / lesson | Charged check (at this tip) | Breadth verdict | Widening spec (dispatch-ready) |
|---|---|---|---|
| **MP-1** Scripted/local layer answers instead of the real back end (SP-1 one answering path) | Web + backend teeth: responder symbols banned, responder filename families banned, canned-reply *shape* (service-free module, `Record<string,string>` table, ≥2 sentence-like values) fails. Real-path acceptance is the named durable closure. | **PARTIAL (catalog's own label).** A renamed responder without the canned-table shape — inline conditionals, arrays, a service-importing file, split construction — is statically invisible. The lesson's breadth is *any* local answering path; the check's breadth is one shape of one. | **RW-04 — MP-1 behavioral leg made permanent.** Add to the API regression suite a standing case family: for each answering surface (Center, thread assist, oracle/recall paths), a corpus of questions whose correct answers are *derived from seeded stored truth unique to the run* (run-specific names/times/places), asserting the answer contains the run-unique truth and none of a banned canned-signature set. **Fails on:** template-identical answers across two runs with different seeded truth. This is the closure the catalog already names; it is specified here as a suite family with an owner, not a hope. |
| **MP-2** Fixture-painted surfaces (SP-2 projection-or-honest-empty) | Web teeth per-SITE seed-import baseline (19 flow sites / 8 files) + inline `"seed-*"` literal counts (62 sites / 8 files) + discovery registry for seed-named modules; backend provenance writes + fragment-minting bans. | **PARTIAL.** Two named gaps stand: **GAP MP-2-INLINE** (inline data copied with non-`"seed-*"` ids is not statically decidable) and **GAP MP-2-PROV** (`shared_plans`/`messages`/`users` rows carry no provenance field, so "projections exclude seed records" cannot be proven from the rows). Posture at this tip: **81 sites — the largest contamination class, unchanged in kind since the teeth-2 baseline.** The check gates *growth*; the class itself is unconverted in the legacy shell that still ships via `?shell=r17`. | **RW-05 — MP-2 provenance + seed-off rendered proof.** (a) Land the additive provenance marking GAP MP-2-PROV names (a `provenance` field or namespaced-id convention on `shared_plans`/`messages`/`users`, stamped at creation, additive-only migration) and a projection-level test: with seed mode off, no seed-provenance record appears in any list/detail projection. (b) Until (a) lands, the interim gate is behavioral and must actually run: seed-off rendered captures for every people/places/counts surface in the pack, failing on any person/place/count not present in the session's real records. **Fails on:** provenance-free rows in (a); unaccounted rendered entities in (b). |
| **MP-3** Per-surface shadow state / re-derivation (SP-3 one projection per surface) | Web teeth: whole `c2/` directory minus a named adapter/host registry takes reader/derivation bans; duplicate status→family literal detection under any name; `FAMILY_BY_STATUS` exactly once (`shellData.ts`). | **PARTIAL.** Named bound: arithmetic/comparison derivation from props with no status-keyed literal is behavioral-only. **GAP MP-3b:** legacy (non-C2) surfaces are not gated at all. And the check verifies the map is *unique*, not that it is *complete* — the exact gap R19's `familyOfStatus` defect lived in (see NC-4, §3): governed statuses `tentative`/`agreed`/`changed` fell through to `forming` in a map that passed every MP-3 pin. | **RW-06 — MP-3 completeness + legacy extension.** (a) The vocabulary-completeness check specified as NC-4 in §3 (every governed backend status has an explicit row in every web status→family map; fall-through to a default family on a governed value fails). (b) Extend the reader/derivation bans file-by-file to the legacy surfaces W13's census lists as still reachable (via `?shell=r17` or the Calls/ChatsHome path), each addition recorded as a baseline shrink/growth event in the gate file. **Fails on:** unmapped governed values; derivation imports in newly covered legacy files. |
| **MP-4** Canned provider output presented as live (SP-4 honest provider contract) | Backend teeth: the deleted `stub_transcript` signature is banned from `lib/`. BS honesty suite owns the general shape. | **PARTIAL.** One signature is not the class. **GAP MP-4b:** the general unkeyed-`{:ok, ...}` provider shape is not grep-decidable and no per-provider unkeyed-path test inventory exists as a single gate. F-16 (live call transcription not wired) remains the one open FALSE class in the ledger — the class is alive at the top tier while its check covers a deleted string. | **RW-07 — MP-4 provider-contract inventory test.** A checked-in registry of every provider module (Deepgram, ElevenLabs, Twilio Verify/Voice/Messaging, Geoapify, Google Places, Brave, Duffel, Expo/APNs/FCM-successors, OpenTable, Stripe) with, per provider, one automated unkeyed-path test asserting the honest tuple (`{:error, :disabled}`-family / gated shape) and a ban on any success-shaped payload. **Scans:** the registry vs `lib/` provider modules (a provider module with no registry row fails). **Fails on:** unkeyed success shapes; unregistered providers. F-16 stays named OPEN until its own wiring lands — this check prevents the *next* canned shape, it does not close F-16. |
| **MP-5** Fake toggles and controls (SP-5 controls with receipts) | **No machine check.** GAP MP-5: no static fingerprint separates a dead control from a wired one; the dead-control rendered sweep owns the count. | **HOPE (catalog's own label).** The lesson recurred in every walk cycle (R13 toggles, W4-05 dead controls, Drop-it's painted no-op `dropPlan: () => undefined`). At the R18 refresh, sweep (b) was still PARTIAL: the whole-app tappable inventory as a single completed run was not recorded. R19 added W5-25 (conversation chrome) precisely because management affordances were absent/mixed — the class is current. | **RW-08 — Tappable-inventory manifest + receipt sweep.** Build the manifest the gap names: a generated inventory of every tappable element in the served build (testid/role/label, surface, handler target), diffed in CI against a checked-in registry where each entry is classified WIRED (with its read-back assertion id) / HONESTLY ABSENT (not rendered) / FOUNDER-GATED. The rendered sweep then exercises each WIRED entry and asserts its receipt (stored truth changed + read back on a second surface where the law requires one). **Fails on:** unregistered tappables; registered-wired controls with no passing receipt run. Seed the registry from W13's census + W4-05/W5-25 lists. |
| **MP-6** Unscoped / wholesale data reads (SP-6 scoped reads only) | Backend teeth: direct `personal_relationship_memories` query patterns as per-file SITE counts, facade/owner counted with no path exemption (24 sites at teeth-2). Two-account isolation proofs are the behavioral guard. | **PARTIAL, with a count regression nobody gated.** Named residuals stand: GAP MP-6b (indirect queries, raw SQL) and MP-6c (variable-held schema — grep-invisible). Worse, the posture re-run on this tip counts **26 sites** (`durable_preference_memory.ex` 10 → 12) against the teeth-2 ledger's 24: the count the catalog's §4.3 law says must "trend to zero / stay zero" *moved the wrong way* and nothing failed, because the posture script is a measurement that always exits 0 (see NC-6). The fingerprint also proves *where* reads happen, not that their predicates carry scope/purpose/expiry (GYRO-01's actual defect). | **RW-09 — MP-6 predicate + count gate.** (a) Promote the posture count into the backend teeth test as an exact per-file site-count assertion (the test already keeps per-site baselines for MP-6 — reconcile the 24-vs-26 discrepancy at source as the first act of this widening: either the two new owner sites are registered with reason, or they are a finding). (b) For each baselined reader file, an isolation test pair (the SM-ISO-01/02 pattern) asserting the read's result for account B contains none of account A's rows *through that reader's own entry point*, so predicate scope is proven per reader, not assumed from the facade. **Fails on:** count drift in either direction without a registry edit; any cross-account row through any baselined reader. |
| **MP-7** Handover claims not verified against the served build (SP-7 verified handover) | **No machine check.** Owned by the `device_test_build_gate` skill — a prose process (badge SHA / BEAM start / foreign servers dead). | **HOPE (catalog's own label).** Red-team artifact M7 proved a false handover claim is uncatchable today. FIX-11 (served build-info payload + `scripts/verify_handover.mjs`) was **not built** in teeth-2 because no served build-info payload exists. The lesson's breadth is *every claim in every handover message*; the check's breadth is a human remembering a skill. R18 still shipped two stale-build incidents and the Walk #4 expectation failure under this "check." | **RW-10 — Build FIX-11.** (a) Serve a build-info payload from the app itself (tip SHA, tree hash, build time, shell, mode) at a fixed route, rendered in the dev badge. (b) `scripts/verify_handover.mjs`: takes a handover claim file (claimed SHA + claimed surface contents list) and the served stack's build-info + surface inventory, and fails on any mismatch — including the W5-03 shape: a claimed-unified surface that the served shell does not mount. (c) No pack or walk is issued without the script's green output attached to the delivery. **Fails on:** SHA/tree mismatch; claimed surfaces absent from the served mount inventory. |
| **MP-8** Component-green reported as app-green (SP-8 whole-app verdicts) | **No machine check.** GAP MP-8: reporting/process pattern; the whole-app rendered gate is the remedy. | **HOPE.** The ledger's Refresh upgraded most rows on the strength of the 101/101 API suite — good evidence, honestly labeled — while simultaneously recording sweeps (a)/(b)/(e) and W4-02/W4-03's rendered legs as PARTIAL (MT-10/MT-11). The pattern is not historical: R19's own wave reports repeatedly (and correctly) refuse rendered claims their suites cannot support, which means the *system* still produces component-green artifacts faster than app-green proof, and only worker discipline keeps the two apart. | **RW-11 — Verdict-shape lint on deliveries.** A delivery/pack cannot be assembled unless its manifest carries, per claimed surface, a rendered-proof entry (served build SHA + both modes + capture/probe id) or an explicit PARTIAL label with the untested remainder named — enforced by the pack assembler failing on a claim row with neither. **Scans:** the pack manifest vs the claims list. **Fails on:** any surface claimed without rendered evidence or an explicit partial label. (W11 owns pack assembly; this check is specified for its gate.) |
| **MP-9** Silent failure (SP-9 failures surface) | **No machine check.** GAP MP-9: catch-all shapes are also legitimate, so a grep count would be fiction; failure-path tests own it, per surface, unevenly. | **HOPE.** Instances kept arriving after the catalog: HB-12 (`loadPlans` swallowing failures — outages painted as empty accounts), HB-19 (machine error strings rendered verbatim), HA-07 (push errors mapped to "queued"). Each was fixed as found; nothing prevents the next one, because there is no failure-observability convention to assert against — the gap itself names this precondition. | **RW-12 — Failure-observability convention + gate.** (a) Adopt the convention the gap requires: every product-path failure produces exactly one of {a plain-language user error state rendered by the surface, a named operator log/metric event from a closed list}. (b) Gate: a rendered/API case family that *induces* failure per surface (server 500, network drop, provider disabled) and asserts the surface renders its error state — never an empty list, never raw exception text, never a success shape. Seed the family with the HB-12/HB-19/HA-07 shapes as regression pins. **Fails on:** empty-on-failure renders; raw error strings on glass; success-shaped failure responses. |
| **MP-10** Stale state revived over live state (SP-10 governed writes only) | No new teeth check; owned by the existing PlanTransition gate + FR-17-03 / FR-08-01 regression cases. GAP MP-10b: no static registry of `SharedPlan` status writers exists to diff against the gate. | **HOPE at structural breadth (behavioral ownership is real).** The gate covers the writers that use it; the catalog's own audits found the exceptions after the fact: group/family plans entirely outside PlanTransition (BS-9/GAP-10), HA-04 (Center challenge rewriting plan time by direct `Repo.update`), HA-05 (Households writers unguarded), V-01. Each was found by a hunt, not by the check — the definition of a check narrower than its lesson. | **RW-13 — Writer-registry gate (close GAP MP-10b).** A backend structural test in the R13 gyroscope shape: enumerate every module that writes a governed status field (`SharedPlan.status`, proposal/revision status, group/family plan status) via changeset/`Repo.update`/`update_all`, as an exact registry whose only lawful entries are PlanTransition itself and named, logged gate exceptions (the `seed_restore` pattern). **Scans:** all of `lib/`. **Fails on:** any unregistered status writer; any registered exception whose log/transition record is absent in its test. Group/family plans enter the registry as named exceptions with their disposition, or are brought under the gate — either is a ruling; silence is the failure. |
| **MP-11** Indicator drift (SP-11 one indicator language) | Web teeth FIX-12: canon hexes read from the single token source (`theme/planStateColors.ts` `PLAN_STATE_HEX`) may appear in code only there or in an exact decorative-legacy allowlist (12 files at teeth-2). | **PARTIAL.** Bounds admitted in the gate itself: CSS files are **not walked** (the layer where most indicator color actually ships), and past-white `#FFFFFF` is excluded as unfingerprintable. Posture at this tip still lists **11 allowlisted files** using canon hexes outside the token source — inventoried migration items, not conversions. R19 then demonstrated the adjacent failure the check cannot see: correct tokens, wrong *family* — `familyOfStatus` mis-mapped governed statuses (NC-4) and the DIR-4/chatsthread work had to re-pin border sources surface by surface. Color presence is gated; color *meaning* is not. | **RW-14 — MP-11 rendered meaning sweep, enforced.** Promote the catalog's own standing check (rendered sweep: same state → same color/pattern, every surface, both modes) from pack-gate prose to a pack-blocking automated leg: the drift probe samples the computed indicator (border/fill/label) for each of the 5 states on every surface that renders plan state, in both modes, on the served build, and fails on any deviation from the token — *including* CSS-shipped color (closing the not-walked bound at the layer that matters, the rendered one). The 11-file allowlist becomes a shrink-only migration list with a per-build count in the pack manifest. **Fails on:** any state rendered off-token on any surface/mode; allowlist growth. |

### 1C. Quantified posture at this tip (re-run for this report)

`node scripts/pattern_posture.mjs` on `wt-r19-retro` @ `7fa7dc98`:

| MP | Sites at this tip | Teeth-2 ledger | Note |
|---|---|---|---|
| MP-1 | 0 | 0 | Shape-bound only (RW-04) |
| MP-2 | **81** (19 web flow + 62 inline literals) | 81 | Unconverted class; largest in the codebase |
| MP-3 (C2) | 0 | 0 | Legacy ungated (GAP MP-3b); completeness ungated (NC-4) |
| MP-4 | 0 | 0 | Signature only (GAP MP-4b) |
| MP-5 | n/a | n/a | No check exists (RW-08) |
| MP-6 | **26** | 24 | **Regressed +2 with no gate failure** (NC-6) |
| MP-7 | n/a | n/a | FIX-11 unbuilt (RW-10) |
| MP-8 | n/a | n/a | No check exists (RW-11) |
| MP-9 | n/a | n/a | No check exists (RW-12) |
| MP-10 | n/a | n/a | No writer registry (RW-13) |
| MP-11 | **11 files** | 12 files | −1 (a conversion landed); CSS unwalked (RW-14) |
| **TOTAL countable** | **118** | 117 | Catalog §4.3 direction law: trend to zero / stay zero. It did neither, and no gate fired. |

**§1 conclusion.** The register's three lessons were all the same
lesson at three breadths — line (REC-1), boundary (REC-2), mount
(REC-3) — and the response each time was to widen the *prose* of
cover verification while the *machine* checks stayed at import /
signature / C2-only breadth, or did not exist. 14 widenings are
specified above (RW-01..RW-14), one per charged check. None of
them requires new doctrine; every one builds a gate the catalog
or the ledger already names as owed.

---

## §2 — REPEAT AUDIT: WALK-5 CATALOG W5-01..W5-28

Each item was asked: *is this a repeat of an earlier failure class?*
For every repeat: the root lesson, the check that existed, why it
didn't fire, and the widening — marked **BUILT in R19** (with its
remaining gap) or **STILL OWED** (dispatch-ready). Verdicts:
**REPEAT** (15) · **PARTIAL REPEAT** (7) · **PROCESS REPEAT** (3) ·
**NOT A REPEAT** (2) · **SELF** (1).

| Item | Verdict | Root lesson / earlier class | Check that existed — and why it didn't fire | Widening |
|---|---|---|---|---|
| **W5-01** Human seed world: machine-speak personas/titles/spam on the glass ("Regression A", "User A" ×3, "macreplay1", "R18REG … order 0 / persistence one") | **REPEAT** | MP-2 fixture-painted surfaces + MP-1's seed-as-behavior family; FR-12-01, FR-14-03, FR-17-08 (fixture rows painted as real people/times). The disease moved layers: the machine-speak came from the *regression harness's* provisioning (display names, run tags in titles, `ctx.marker` messages) — scaffolding the founder was shown as the world. | MP-2 teeth scan product `src/` and backend `lib/` only. The harness lives in `shots/regression/` — outside both walks — so no fingerprint ever saw "Regression A". The classification sweep classified *product* surfaces; the capture provisioning path was not a classified surface. | **BUILT in R19 (W1):** the permanent `scanSeedWorld` gate (`shots/regression/lib/harness.mjs`) — scans served API output (session, conversations, plans, Center, messages in up to 30 conversations) and fails the run on any hit; runners treat hits as harness error, never a silent pass. **Remaining gap — STILL OWED (RW2-01):** the gate is a 12-token exact-string list (`MACHINE_SPEAK_TOKENS`), i.e. line breadth for a class-breadth lesson. Widen it to (a) patterns: run-tag-shaped suffixes in titles (`/\b(mac)?replay\w*\|\br\d+[a-z0-9]{4,}\b/i`-family), `R\d+REG`, "order \d+", scaffolding ordinals ("persistence one/two"); (b) provenance: harness-provisioned display strings must come from a checked-in human-cast registry — any display name/title not in the registry and not user-authored in the run fails. Owner: harness + W11 pack gate. |
| **W5-02** Home feels social: real imagery, people variety, Live present, moments + Graphs woven | **REPEAT** | Coded-but-hollow Home: wallet map §DC **DC-GAP-2** (story viewer is an empty stage; the feed does not contain the designed Live kind) + HB-10/HB-11. W9 found the same shape again at source: the Live feed kind existed in the projection *type* and the review fixture but was **never produced by the real adapter**; the moment card rendered caption text inside the image well. | The fidelity trace *named* DC-GAP-2 — and nothing failed. A named gap with no gate is the MP-8 shape: the review pack could show a fixture Live card while member Home was honestly absent, and no check compared adapter output kinds against the projection type's kind set. | **BUILT in R19 (W9)** for imagery provenance (record-field → render, `data-media-provenance`, no guessed images; `media_id` deliberately never promoted). **STILL OWED (RW2-02) — adapter-produces-every-kind contract check:** for each projection type with a closed kind/state set (feed kinds, card kinds), a test feeds the adapter a session containing one real record of every kind and asserts every kind survives to render output; a kind producible only by fixtures fails. **Scans:** web adapters vs their projection types. This is DC-GAP-1/DC-GAP-2 as a gate instead of a trace note. |
| **W5-03** Calls fully in the design (C2 Calls surface, state-coded ambient borders) — *suspected repeat (a), CONFIRMED* | **REPEAT** | **The unification claimed the shell; the served shell had no call log at all.** The R18 unify wave themed the ChatsHome family *in the legacy scope* and stated, in its own Scope 4, that "the call log exists ONLY in `ChatsHome`, which mounts ONLY in the legacy shell (R17) via the `?shell=r17` QA override. The C2 shell has no call-log surface." Root lesson: **REC-3's mount lesson + MP-7** — a claim's breadth ("shell unification") exceeded the served mount's breadth, and a disclosure buried in a wave report's scope section functioned as a cover. The founder rejected the resulting declared state (F5/MT-07) outright. | The surface map even had the hole named (**F-GAP-9**: "the Chats/Calls words at the top of Chats name a place that does not open"). Nothing fired because no check compares *handover/unification claims* against the *served shell's mount inventory* — MP-7's check is prose (RW-10), and the map-trace classified the missing surface as a declared exception rather than a failed claim. | **BUILT in R19 (W2):** the Calls tab inside the C2 Chats surface, one server-side derivation (`Calls.CallState.derive/3` on every `GET /calls` row), borders rendering that fact only (test-pinned: no hex, no `.missed`/`history_label` reads in the component). **STILL OWED:** RW-10 (claim-vs-mount verification) is the check that prevents the *class*; W2 fixed the instance. Until RW-10 exists, any future "unified / complete" claim about a surface set is unverified by construction. |
| **W5-04** Nav pad halo geometry: segments terminate at a consistent small gap, never crossing, never floating | **REPEAT** | MP-7/MP-8 at measurement breadth: R18's rendered gate **passed** the halo — "segments stop at the disc edge" — because the probe measured to the wrong edge (the disc's bounding box / the 86px hit zone). W3 quantified the founder's eye: the actual visual gap was **20.0px** (C2) and up to **39.9px** to the visible mark (legacy). The check was green; its *measurement definition* was the defect. | The unify drift probe existed and ran. It didn't fire because a probe cannot catch its own wrong definition — nothing in the gate required the measured edge to be the edge the eye sees (the chord at the border line), and no second measurement (independent geometry derivation) cross-checked it. | **BUILT in R19 (W3):** `--dock-halo-gap: 3px`; segments terminate at the device edge *at the top border line* (C2: chord √(28²−23²)=15.97px; legacy: the visible 46px mark); the drift pin now fails in **both** directions (crossing *or* floating). **Remaining gap — STILL OWED (RW2-03):** W3's extended probe was committed but, per the status record, **not yet executed** against the served stack — the pack phase owes the rendered run, and until it runs this widening is in the same state as the original: a pin whose proof is pending. Rule going forward: a measurement-definition change is a check change under catalog §4.4 change control, recorded with its derivation (W3 did this; make it mandatory). |
| **W5-05** Splash animation v2: rings rotate, points ride ON their rings, settles into the exact still | **REPEAT** | MP-8 for motion: the *proof artifact* was certified instead of the *experienced artifact*. V1's defects (W4 report §1): SMIL main-thread jank; travelers that were not the rest composition's points; laps indefinite so no settle was ever visible; and the capture itself aliased (~25fps VP8 made correct motion read steppy). A stills-based pack plus a low-fidelity video "proved" a motion claim neither could see. | The splash pack gate checked composition stills and the presence of a motion file. No fidelity floor existed for motion proof (frame rate / capture method), and no test asserted the traveler set equals the rest set, or that the animation's final frame equals the still composition. | **BUILT in R19 (W4):** riders are children of the ring rotor / parametric CSS keyframes (leaving the ring is structurally impossible); the 15s arc settles into the rest branch itself, pinned by a **DOM-equality test**; capture v2 at screencast cadence with a fidelity gate (recordVideo fallback = failed gate). **Remaining gap:** pack phase still owes rider mid-flight rendered proof (stated caveat in the W4 merge note) — owed, named, and it blocks any "motion proven" wording until captured. |
| **W5-06** Chats list: in-row reveal/plan block as an attractive card (no stacked single-word column, no floating Dismiss) | **REPEAT** | The layering/width-contract class: F18-04 (chooser clipped by `overflow:hidden` ancestors), W4-03 (card clipping, title "omething"), ledger sweeps (a)/(e). DIR-4's list form flattened the reveal into one text run with **no width contract anywhere in the flex chain**, inside a button-in-button nest — the founder's screenshot is the component's own string, one word per line. The defect is structural, and it shipped because DIR-4's tests rendered the line without the row's real flex chain at phone width. | DIR-4 suite (17 tests) — component breadth, jsdom, no stylesheet cascade against the real row. The rendered sweep (a) that owns this class was PARTIAL/owed at the R18 refresh (MT-10/MT-11). A check that exists but has not run is indistinguishable from no check; that is the recurring meta-lesson of this table. | **BUILT in R19 (W5)** for the surface: mini-card grammar, width contract pinned in tests, rows de-buttoned, state borders from existing single-source facts only; rendered probe measured the fix (title 207px wide vs the ~60px word column; borders at canon hex @52% both modes). **STILL OWED (RW2-04):** the W5 probe is scratch (`w5-scratch/probe.mjs`), not a suite case. Promote it: a rendered case per list surface asserting (i) no text element's rendered width collapses below a stated fraction of its container at 390/430px, (ii) no button-in-button in the DOM, (iii) actions sit inside their card's box. **Fails on:** min-content column collapse geometry, invalid nesting. Until promoted, the next flattened line ships the same way. |
| **W5-07** Thread: Next Together strip solid/anchored, no translucency bleed on scroll | **REPEAT** | F18-05 / W4-02 layering class — and a *cover-narrowness repeat in miniature*: deckfix F2b "fixed" the strip overlap by un-anchoring it in-flow, leaving `.c1-next-strip` with **no background at all** while the element it carries paints toward transparent. The cover was verified against *overlap*; the founder's complaint class is *see-through on scroll*, which the fix preserved in a new form. (Pre-R19, so it is counted here, not in §3.) | The deckfix pin asserted position (`static`, no intersection) — a true statement about a different property than solidity. No check asserted the strip's computed background opacity or hit-test cleanliness *in the scrolled state*. | **BUILT in R19 (W5):** strip sticky-anchored on solid `--canvas` (deliberately NOT frosted — the founder's glass-vs-ghost distinction), measured at max scroll in both modes (opaque `rgb()`, hit test returns the strip). **STILL OWED (RW2-05):** promote the scrolled-state assertion into the rendered suite: for every sticky/anchored chrome or strip, at max scroll, computed background is fully opaque (or registered glass per RW2/W5-27's registry) and `elementFromPoint` at its center returns the element itself. One residual W5 itself flagged: the legacy structured-layout strip remains in-flow (opaque since F12-08, cannot bleed, not anchored) — a layout-contract ruling owed to W10's audit, named here so it is not lost. |
| **W5-08** Listen rail killed: no "Listen" rail/metaphor on any surface | **REPEAT** | Two stacked repeats. (1) *Layout:* MT-13 already named "the C1 'Listen' button wraps vertically at 390px (harmony2 §1, named layout defect)" — a named finding that shipped anyway because findings without gates are advisory. The button had **no CSS rule at all**; at 390px it was crushed into a vertical rail inside every Opal bubble. (2) *Language/identity:* a TTS playback control labeled "Listen" taught the exact metaphor the founder rejects ("Opal doesn't listen — it graphs") — the L12/copy class (HB-17/18/19) on a control's label. | The rendered sweep that would have measured the wrap was PARTIAL (MT-11); MT-13's disposition was an inventory line, not a gate. No copy check scanned control labels against the product's banned-metaphor list (the list existed as founder statements, not as a gate input). | **BUILT in R19 (W6):** `ListenButton` → `ReadAloudButton` in its own horizontal action row (rail structurally impossible), presence copy rewritten to graph language, 22-site sweep, backend ingestion copy aligned. **STILL OWED (RW2-06) — finding-to-gate rule:** no named finding (MT-*, HB-*, HA-*, BS-*) may ship in a delivery as "named" more than once: on its second appearance in a status/ledger record it must either have a failing-then-passing gate case or be escalated as a founder-named exception in the delivery message itself. MT-13 appeared in the maptrace and the harmony record and still shipped; this rule is the check that finding lacked. Plus a label lint: control labels/aria in a checked-in banned-metaphor list ("listen" as a surface metaphor) fail the web suite. |
| **W5-09** Graphs as futures: state-legible plans, PAST/COMPLETED view, PRIVATE GRAPHS behind a real gate | **PARTIAL REPEAT** | The Past-view leg is a repeat of the *derivation-default* class (§3, NC-4) one wave early: W7 found the adapter's status→family map had **no rows for the backend's terminal statuses `completed`/`expired`**, so a completed plan fell through to **forming** and could never appear in Past. Same fingerprint as `familyOfStatus`: a status map whose completeness nobody checked against the backend vocabulary, with a plausible-looking default absorbing the miss. The private-graphs leg is **new scope**, not a repeat (no private concept existed to fail). | MP-3's pin verified the status map exists **exactly once** — uniqueness, not completeness. No check enumerated the backend's governed statuses (`SharedPlan.@statuses`) against any web map's rows. | **BUILT in R19 (W7):** `completed`/`expired` → `past` mapped; Past lens as a named view; private graphs with server-side exclusion (other participants' lists never contain the plan — the real privacy, not a hidden render) + server-verified gate. **STILL OWED:** the class check is NC-4 (§3) — vocabulary completeness for *every* status→family map, of which W7's adapter map and W18-FIX's `shellData` map are the two known instances. Until NC-4 lands, a third map can repeat this a third time. |
| **W5-10** Graph detail = living plan: joiners with granted location show position + distance; not-sharing reads as not-sharing | **REPEAT** | Adapter-fidelity class: wallet §DC **DC-GAP-1** (projection fields with no producer — the C2 detail adapter dropped the place-kind half of its contract, HB-16) + the location class FR-12-08/09 ("near me" claimed wired when it was not). W7 built the detail's who/distance truthfully and named the residue itself: **the positions writer is absent** — there is no real record for the detail to read, so distance is honestly absent. The repeat is that a "living plan" surface was again specified against fields the back end does not produce. | The fidelity trace named DC-GAP-1 as a gap; no producer-existence check gates a surface build. Location claims were governed by the pipeline-report discipline for the *Center* path; no equivalent discipline covered plan-detail location. | **STILL OWED (RW2-07) — producer-existence gate:** every field a surface's design names must trace to a producing writer + a contract field + a test record exercising it, checked at wave review (the DC trace, mechanized): a field with a contract slot but no writer fails the wave report's completeness claim and must be listed as honestly absent *in the report's first section*, as W7 in fact did. The positions writer itself is a backend build item for the coordinator to schedule; until it exists, "living plan" claims must carry W7's named absence. |
| **W5-11** Soul and Memory each its own Settings room: no raw values ("22:00" / "3" / "standard" / unlabeled white pill); every control labeled with its reason | **REPEAT** | L12 rendered-copy class, verbatim: the Communication Model bans internal-state text, enum values, and machine vocabulary on glass (HB-17/18/19 were the same defect on other surfaces). The combined Soul+Memory page rendered raw stored values as unlabeled boxes — `"22:00"`, `"3"`, `"standard"` are an enum, a bare count, and a 24-hour clock value reaching the glass untranslated, which is precisely what L12 exists to forbid. Also FR-13-04's settings-truth family. | L12 was encoded as a layout-contract *spec*; its rendered/copy **gate run** was PENDING-RUN at the R18 refresh (MT-11) and the ledger's Section C refresh still calls the L12 gate leg partial. The SM build's own save/read-back contracts were tested — at API breadth. Nobody rendered the room and read it as a first-time user, which is the founder's test ("doesn't make any sense whatsoever"). | **BUILT in R19 (W8):** two rooms, every control labeled with its reason, values human-first ("10:00 PM", "Los Angeles (America/Los_Angeles)"), enums never reaching glass, save + read-back through the real PATCH contract. **STILL OWED (RW2-08):** run the L12 rendered/copy sweep as **one gate** over every Settings room and every surface the sweep (e) definition covers: fail on raw enum values, 24-hour clock strings, bare numeric settings, and any control without a visible label + reason. This is the same owed run as MT-11; W8 fixed the named rooms, the sweep is what keeps the *next* room honest. |
| **W5-12** Settings family leads pack v2: You hub/sidebar, Connections (live-verified states), Soul, Memory, privacy, notifications, appearance | **PARTIAL REPEAT** | Two classes. (1) *Architecture incompleteness:* DIR-2 ordered the Muse-modeled settings architecture in R18 and a settings build landed — yet the founder's review still found the family short of the architecture (findability, rooms, sub-asset windows). Pieces-green vs architecture-green is MP-8 again. (2) *Connection-status truth:* HA-01 (a simulate connector minting a fake Google connection whose public status erased "simulated") is the standing warning for Connections: a status displayed without a live exercise is MP-4 on a settings surface. | The settings build was verified control-by-control (every control TRUE) — control breadth, not architecture breadth (can a user *find* everything, are the Muse-harvest dispositions complete?). Connections verification existed as a one-off R18 report, not a standing per-release gate. | **BUILT in R19 (W8):** rooms + Activity room built from the founder's Muse-settings screenshots with a refreshed per-asset disposition table (ADOPTED / ALREADY PRESENT / NOT APPLICABLE with reasons); the graphing standing control wired to the real pre-existing `GraphingPolicy` API. **STILL OWED (RW2-09):** Connections live-verification as a *standing* gate: per pack, each listed connection's status must carry a live-exercise timestamp from the Mac side (VM DNS is synthetic — never verify from the VM, per AGENTS.md) or render its founder-gated state with the exact step; a status older than the pack or asserted from code presence fails the pack manifest (extends RW-11). |
| **W5-13** State variety + ambient sweep: no surface reads all-Forming when the world varies; every ambient element carries its recorded reason | **REPEAT** | Seed-composition monotony was *disclosed* in R18 and shipped anyway: the unify report states Home's feed was three forming cards because "the monotony is in the seed's composition, not in the treatment system" — a true sentence that functioned as a waiver. The founder reads the served world, not the disclaimer. Same family as W5-01 (the review world is part of the product he judges) and as the ambient-justification rule's enforcement gap (reasons recorded per wave, no sweep re-audits them as one run). | No check asserted anything about the served world's *state distribution*; ambient registers were per-wave documents, never re-verified as a single sweep (ledger sweep status: PARTIAL). A disclosure in a wave report was accepted as a disposition — the W5-03 mechanism again (named-in-a-report ≠ covered). | **BUILT in R19 (W1 + W9):** the human seed world carries a forming/ready/happening/past distribution by construction, and W9's ambient sweep recorded a reason per element. **STILL OWED (RW2-10) — served-world distribution assertion:** the seed gate gains a distribution leg — `scanSeedWorld` (or its successor) also asserts the review world's plans span ≥ the four states and that no primary surface's rendered cards are all one state when the world varies. **Fails on:** an all-one-state primary surface against a varied world. Without it, the next thin seed re-creates W5-13 silently. |
| **W5-14** Journey audit: primary journeys walked end to end as the founder clicks them; each terminates in a real outcome or is honestly absent | **REPEAT (of the owed check itself)** | Ledger sweep (b) — dead-control + journey (L11) — was PARTIAL at the R18 refresh: "whole-app inventory + journey audit as one run still owed (MT-11)." W4-05's whole-app inventory was likewise a declared exception. W5-14 is the founder demanding, again, the run that two cycles recorded as owed. The repeat is not a product defect; it is a *check that stayed owed across a delivery boundary*, which is how owed checks die. | The check existed as a named obligation in three places (ledger §E-b, MT-11, W4-05 exception). It didn't fire because obligations recorded in documents have no owner-locked deadline inside the program: R18 closed with it partial and R19 opened with it as a founder item rather than as a carried gate debt. | **IN FLIGHT:** W10 owns the journey audit (+ totality trace + identity verdicts + S-1 ruling) on the post-integration tip; it had not landed when this report was written. **STILL OWED as a standing rule (RW2-11):** any sweep/audit recorded PARTIAL at a cycle's close is entered as a *gate debt* in the next cycle's status file with a named owner and wave, and the next delivery may not be assembled while a gate debt is unrun and unlisted. (This is RW2-06's finding-to-gate rule applied to audits.) |
| **W5-15** In-call surfaces first-class: live voice + video call windows reimagined in the new design | **PARTIAL REPEAT** | The in-call experience existed only in the legacy face (W13 census: `ActiveCallOverlay`, `IncomingCallFallback`, call stage — R17-only imports), and Hunt B had already found the legacy call stage's painted form (HB-04, Figma call stage reachable). F-16 stands over the whole item: no simulated transcription/assist, ever. The repeat leg is legacy-only survival of a primary surface (the W5-03/W5-17 class); the redesign itself is new work. | The classification sweep classified call surfaces as honestly gated (F-16) — a truth classification, not a design-completeness check. No inventory compared *primary surfaces in the legacy shell* against *surfaces in the served shell* until W13 built that census in this cycle. | **BUILT in R19 (W12):** in-call orbit stage + video window in the new design, F-16 honesty pins (surfaces state what is real today; no simulated transcription). **STILL OWED:** the census-as-standing-check is RW2-12 (under W5-17); F-16 remains OPEN by name until live transcription is wired and exercised — W12 correctly does not move it. |
| **W5-16** Graphing light + per-call pause: ambient light tells every participant a call is being graphed; any participant can pause it for that call | **NOT A REPEAT** | No earlier failure class: per-call graphing state, its visibility, and per-participant pause did not exist in any form to fail. It *extends* F-16's honesty law (a call surface must not imply capture it isn't doing — here, must not capture without showing it), but an extension of a law to a new capability is new scope, not a recurrence. Recorded as not-a-repeat so the register stays honest. | No check existed, correctly — there was nothing to check. W12 built the machinery with the check inside it: one derivation (`calls/graphing.ex`), lineage records for both states, broadcast to all participants, pause halting capture (tested), standing permission in Settings wired to the real `GraphingPolicy` truth (W8/W12 integration note in the status file). | No widening owed. The standing risk to record: if a second capture class (e.g. in-room recording) is built, it must enter through the same light/pause/lineage machinery — one capture-visibility pattern (SP-family), not a second invention. |
| **W5-17** Legacy inventory + recreation: every pre-redesign surface/window/asset dispositioned RECREATED / MERGED / HONESTLY RETIRED | **REPEAT** | Legacy survival by neglect is MP-2/MP-7's long tail: R18's classification sweep inventoried 137 items, but surfaces *outside* the integrated build were dispositioned by scope statements ("out of this wave's named scope", unify Scope 4) rather than inventoried for recreation. W13's census then found, mechanically, what scope statements had missed: **event share cards and user profiles were simply absent in the new design** — no surface, no gap row, until the census traced every legacy surface's importers. | No importer-trace census existed. The surface map described what should exist; nothing mechanically compared the legacy shell's reachable surfaces against the served shell's, so an absent surface produced no signal anywhere. | **BUILT in R19 (W13):** the full census (437 files, importer traces, reachability defined by the served `shell=c2` build) with per-surface dispositions, plus the two recreations W13 owned (share cards, profiles). **STILL OWED (RW2-12) — census as a standing gate:** re-run the importer-trace census at each cycle's integration; any surface reachable in *any* shipped shell (including `?shell=r17` while it exists) with no disposition row fails integration. Includes the S-1 decision W13 routed: retire the `?shell=r17` flag from the served build (coordinator recommendation on record) or name it a founder exception — undecided is the failure this gate exists to prevent. |
| **W5-18** Opal-chat structure: Opal conversations never blend into person threads; contextual doorway from a thread; both directions navigable | **REPEAT** | F18-08's blending class, one surface over. R18 fixed blending at **Center breadth**: switch-thrash killed, per-chat isolation GREEN (FR-18-05), one 135-message thread split into sessions. But Opal-authored messages still rendered *inside person threads* — `ThreadShell` carried them, with the read-aloud control attached — because the separation law had never been stated for the thread surface. The check passed on the surface it was written for and the disease lived on the adjacent one: REC-1's shape, again (line/surface breadth). | FR-18-05's case exercises Center sessions. No case asserted anything about Opal content in person threads; the thread's contract carried Opal messages and the shell rendered what it was given — no separation predicate existed to test against. | **BUILT in R19 (W14):** the separation law as code — `messagesForSurface("person-thread", …)` filters Opal-authored messages out of person threads entirely, pinned **39/39** (`opalChatDoorway.test.tsx`), plus the scoped doorway (presence derived only from DIR-1/DIR-4 facts; ready/happening/complete = no doorway, honest absence) and backend fail-closed scoping (a doorway in thread A cannot scope to plan B). **Remaining gap:** rendered proof of separation on the served build is pack-owed; and the W18-FIX collision (§3, NC-2) showed the law's first casualty was another wave's fixture — evidence the law is real and that cross-wave law changes need the trial-merge gate. |
| **W5-19** Override, don't patch: broken things are overridden — wiring removed, dead paths/orphans/stale sites deleted, absence proven | **PROCESS REPEAT** | This item *is* the recurrence lesson restated as method by the founder: patching = verifying the named line (REC-1/2/3); overriding = removing the pattern and proving absence (catalog §3 zero-reachable). Its presence in the catalog is an admission that R18's fix waves, hunt-fixes included, still worked patch-first in places (the ledger's FALSE register was closed item-by-item while MP-2's 81 sites stood). | The migration rule (repair into successor patterns, zero reachable sites) existed since 2026-10-18 04:37 PDT. It didn't govern because per-item closure is what the ledger's rows reward; pattern-level conversion had counts (posture) but no gate (NC-6). | **IN FLIGHT:** W15 owns the override sweep on the merged tip (incl. `?shell=r17` retirement per the S-1 recommendation); it had not landed when this report was written. **STILL OWED:** NC-6 (posture counts as a gate) is the mechanism that makes "override" measurable per pattern instead of per item. |
| **W5-20** Blind-spot ownership: this pass runs its own cross-check hunt against the surface map + scope | **PROCESS REPEAT** | R18's hunts worked — they found REC-1/2/3 and 34 further finds — and were still *episodic*: commissioned mid-cycle, with MT-22's contested items (C-2..C-7) never settled by any later report. A hunt that runs once per crisis is a patch-shaped process; the founder's item makes it a standing organ of the pass. | No standing rule required a hunt per cycle or a settlement pass over the previous hunt's contested register. MT-22 records the consequence verbatim: items "remain WATCH, named" — named being, once again, where the process stopped. | **IN FLIGHT:** W16 owns this cycle's hunt; it had not landed when this report was written. **STILL OWED (RW2-13) — contested-register settlement:** each cycle's hunt must open by adjudicating the previous register's WATCH/CONTESTED items to a verdict (confirmed / refuted / founder exception) at source, starting with C-2 (HA-06/HA-10 reachability — the same item RW-02 needs) — a contested item may not be carried twice without a founder-visible note in the delivery. |
| **W5-21** Retrospective (this item) | **SELF** | — | — | This report. Its own widenings are §1/§3; its ship vehicle is pack v2 (W11). |
| **W5-22** Person-scoped Opal chats, quick-draw both ways (index of Opal chats per person; start new; clear out) | **PARTIAL REPEAT** | Design debt from the F18-08 fix's breadth: Center chats were *isolated* (FR-18-05) but *filed by time* — a flat recency list with no anchor in the graph. Isolation fixed blending; it did not give a conversation a *place*, so finding "the chat about Chanelle" still meant scanning a list. The repeat leg is real but second-order: the original defect (blending) does not recur; its fix's narrowness (sessions, not anchors) is what this item corrects. | FR-17-11/FR-18-05 checks assert list existence, titles, isolation — nothing about findability by person/plan, because the anchor concept did not exist in the contract (no anchor field on the conversation record). | **BUILT in R19 (W14, as superseded by W5-23):** person/plan-scoped chats with quick-draw both ways, multiple chats per person, start-new and clear-out as real data operations with scoping proofs (X's chats never surface in Y's index; clearing removes it everywhere listed; the person thread untouched). Clear-out correctness rides the same separation machinery as W5-18. **Remaining gap:** the ≤2-tap find-a-conversation journey is W10's audit leg — owed at this writing. |
| **W5-23** Orbits: every Opal conversation has a primary anchor; Center's log is orbit-organized, collapsed by default; anchoring proposed, never silently filed | **PARTIAL REPEAT** | Same root as W5-22 (filing by time), plus one *new* risk the item itself legislates against: silent auto-filing would be MP-10's shape (the system asserting a stale/wrong fact over the user's live intent) — hence proposed-never-filed, one primary anchor, undoable, split-offered-never-moved. Recorded here so the design's own anti-recurrence terms are on the record. | No check existed for anchor correctness because anchors didn't exist; W14 built the guards as part of the feature (accept/redirect, undo, drift offers a split and never moves silently). The privacy seam (orbits inherit W5-09's gate) was flagged by W14 and wired at integration, per the status record. | No widening owed beyond W10's journey audit (find-a-conversation-about-X in ≤2 taps from Center *and* from the thread, both directions). If that audit finds >2 taps anywhere, it is a W5-23 defect, not a new item. |
| **W5-24** Capability Totality Law: Opal does everything Meta Muse can do, and greater; nothing silently missing | **REPEAT** | The ask-registry lesson: R18's Audit 5 found **16 asks that were never carried into any repair** (ASK-20/28/29/30/42/51/66/84/85/87/88 family) and 74 gaps — *named* in `BACKEND_AUDIT.md` and then not gated, so capability loss between cycles produced no signal. "Named, not absorbed" was the honest disposition; it was also, structurally, how capabilities get lost: a list nobody re-walks at delivery time. | The BACKEND_AUDIT gaps register + the Muse harvest audit existed as documents. No delivery gate walked the capability inventory line by line against the shipped build — the totality *trace* the founder ordered did not exist as an artifact until this item created it. | **IN FLIGHT:** the Capability Totality Trace is assigned to W10 (audit) + W11 (delivery assembly) and ships as a section of the corrected delivery; it had not landed when this report was written. **STILL OWED as standing form (RW2-14):** the trace becomes a per-delivery gate artifact — every harvest-table line carries PRESENT / IN-PIPELINE (with its WALLET_MAP §F row) / FOUNDER-GATED-or-absent-with-reason, and a line whose disposition *regresses* between deliveries fails the later delivery's assembly. |
| **W5-25** Conversation chrome: top-right overflow (rename / pin / archive / share / delete — every action real) + top-left navigator expanding the orbit rail | **PARTIAL REPEAT** | MP-5's inverse: not fake controls, but *missing* standard controls — conversation management existed only in fragments (rename was built for Center sessions in R18's A-gaps work; pin/archive/share/delete had no wired path from a conversation screen). The class is the same: a control surface whose truth is not established end-to-end (present-but-dead in earlier cycles; absent-but-expected here). | The dead-control sweep inventories controls that *exist*; it cannot see an affordance that should exist and doesn't. No pattern-expectation inventory (what management actions a conversation screen must offer) existed to diff against. | **BUILT in R19 (W14):** overflow + navigator in orb glass language, every action wired to its real operation (rename edits everywhere it lists; archive = the orbit archive; delete = the clear-out path with honest confirmation), journey-audited per the item's terms. **STILL OWED:** RW-08's tappable-inventory manifest gains a *pattern-expectation* section (per surface class, the standard affordances and their dispositions) so absence becomes detectable by the same gate that detects deadness. |
| **W5-26** Wholeness gate: everything ships as ONE coherent application; the map-trace coherence pass certifies the whole | **PROCESS REPEAT** | MP-8 at program scale. R18 *had* a map-trace coherence pass — and its findings (MT-10/11 partial sweeps, MT-13, MT-19's 81 MP-2 sites, MT-22's unsettled register) were carried as named exceptions while the delivery proceeded. The founder's closing word rejects exceptions-as-coherence: an addition that cannot integrate cleanly is redesigned until it does. The repeat is the *gate's verdict shape*, not the gate's existence. | The map-trace existed and ran. It didn't fire because its output was a findings list with dispositions, not a pass/fail the delivery was blocked on — the same reason MT-13 shipped (RW2-06). | **STILL OWED (RW2-15) — wholeness verdict rule:** the coherence pass for pack v2 (W10/W11) must return a single verdict per surface (COHERENT / NOT SHIPPED) rather than a findings list; a surface with an open MT-class finding ships only under a founder-named exception printed in the delivery message, per the catalog's own exception rule. This report's §1C table and §2 verdicts are inputs to that pass, not substitutes for it. |
| **W5-27** Frosted glass chrome: one glass token (blur + tint per mode) behind the nav pad and top chrome; readability surfaces stay solid | **NOT A REPEAT** | New design law, precisely stated by the founder with its own anti-confusion clause (frost on chrome; the Next Together strip and cards stay SOLID — blur-dissolve vs ghost-through, the W5-07 distinction). No earlier failure class: glass existed in the product, but no law governed where it may live, so nothing "failed" — the absence of a law is not a recurrence. | Correctly, no check existed. W3 built the law as tokens (`--chrome-glass-blur: 18px`, per-mode `--chrome-glass-tint`) and W14's chrome was unified to them at merge. The *budget* check that then went stale is an R19-internal event — audited in §3 as NC-3, where it belongs. | No widening owed here. The sanctioned-sites registry built by W18-FIX (NC-3) is the standing check for this law's breadth: any new backdrop-blur site, in any stylesheet, fails until registered with its reason. |
| **W5-28** Identity bar: in the hand, the app must feel like a NEW object — never a reskin of an incumbent | **PARTIAL REPEAT** | FR-17-13/FR-17-14's lesson: identity is **founder-judged, not machine-green** — the ledger's Refresh states it deliberately ("pack-proven, FOUNDER-JUDGED — not machine-GREEN"). R18 replaced identity wholesale and the packs proved the assets; the founder's closing bar says the *in-hand feel* still risks reading as an incumbent's screen with Opal's logo. The repeat leg: a second cycle where identity proof was pack captures, while the property the founder cares about (physics: frosted glass, melting content, orb presence, orbit structure) is experiential and only he can certify it. | No machine check can exist for this property, and pretending otherwise would be MP-8. The check that existed — the pack — is the right *evidence* vehicle and the wrong *verdict* vehicle. | **STILL OWED (RW2-16) — verdict discipline, not a new check:** W10 records a per-surface identity verdict and W11's pack gate must not ship a surface as a pass on identity without the founder's judgment recorded against *this* pack — prior-cycle approval of the orb/wordmark does not transfer. Any surface W10 finds mistakable for a competitor's screen is redesigned or listed as a founder-named exception in the delivery, by name. |

**§2 totals.** Full repeats (15): W5-01, 02, 03, 04, 05, 06, 07,
08, 10, 11, 13, 14, 17, 18, 24. Partial repeats (7): W5-09, 12,
15, 22, 23, 25, 28. Process repeats (3): W5-19, 20, 26. Not
repeats (2): W5-16, 27. Self (1): W5-21.

**The two suspected repeats from the brief are both CONFIRMED:**
(a) W5-03 — the call log's legacy face after unification
"claimed" the shell is REC-3's mount lesson plus MP-7: the check
that should have caught it is claim-vs-served-mount verification
(RW-10), which does not exist; a scope-section disclosure was
allowed to stand in for it. (b) The DIR-4 lit reveal present in
the API but absent on the glass until the deckfix is the
rendered-layer lesson (MP-8) compounded by REC-1's slot-truth
split: DIR-4's derivation was true, its unit fixtures always
placed the plan inside the deck, and the deck's independent slot
logic (status-family groups + caps of 3) silently dropped every
lit item in the pack's actual configuration — zero action-family
plans existed, so no Needs-you section existed. The deckfix's fix
(reconcile the reveal feed with the slots at the source; a reveal
claims its plan's slot by right) plus its 3 regression tests are
the correct widening for the deck; the *class* widening is RW-01
+ RW-11: no surface's rendered content may be governed by a
second truth beside its projection, and no claim about it ships
without rendered proof.

---

## §3 — NEW LESSONS FROM R19 ITSELF

R19 generated its own recurrences-in-miniature. The four from the
brief are NC-1..NC-4; this audit found two more in the same record
(NC-5, NC-6). Each check below is specified dispatch-ready: what
it scans, at what layer, what it fails on, where it lives.

### NC-1 — Restart drains strand uncommitted work (three times)

**Evidence.** (1) 2026-10-19 ~00:05 PDT: a runtime restart drain
errored three workers at handoff; W7 and W9 had completed (commits
+ clean trees — verified at source), but **W12 incall had 12
modified files uncommitted and zero commits**; the work survived
only because the worktree persisted, and the wave had to be
re-dispatched with adoption instructions. (2) ~00:35 PDT: a second
drain hit W14 + the W12 re-dispatch — W14's web half was committed
but its **backend half sat uncommitted in 6 files**; W12's diff had
*grown to 14 files, still zero commits*, and the third dispatch
carried "a hard commit-in-increments requirement." (3) ~02:05 PDT:
W2 calls "drained pre-battery: both commits + the full report
landed; suite numbers never ran" — the mildest form (work safe,
verification stranded), closed by a separate verifier worker.
The status file records the lesson as prose: "commit early and
often; a drain must never strand more than minutes of work." R18
had already taught the sibling lesson twice (the API run killed
6m26s in — "nothing is claimed from a killed run"; deckfix lost
suite logs twice when VM `/tmp` was wiped).

**Class.** Process MP-7/MP-8 family: the *state of the work* was
unverified at the moment it mattered. Prose lessons did not
prevent the second or third occurrence in the same night.

**NEW CHECK — Commit-in-increments gate (dispatch-ready).**
- **Rule:** a wave's work exists only as commits. Every green
  sub-step (a passing targeted suite, a completed file group) is
  committed before the next begins. A wave report may only
  describe committed work.
- **Machine leg (merge/handoff verifier):** the coordinator's
  merge script (or a `scripts/wave_handoff_check.sh` it calls)
  refuses a wave handoff when, for that wave's worktree:
  `git status --porcelain` is non-empty, OR `git log base..HEAD`
  is empty while the report claims file changes, OR the report
  file itself is uncommitted. **Fails on:** any dirty tree at
  handoff, regardless of the report's contents.
- **Drain-recovery leg (standing coordinator procedure, in the
  status file, not in memory):** on any worker error/drain, the
  first action is source inspection (`git status` + `git log` in
  the wave's worktree) *before* any re-dispatch, and the
  re-dispatch brief must state the adoption state found (files,
  commit count) — this was improvised correctly twice in R19;
  NC-1 makes it the written first step.
- **Evidence leg:** suite logs and scratch evidence live under
  `~/workspace/…` scratch directories, never `/tmp` (R18's deckfix
  lost its first baseline/after logs to two `/tmp` wipes). A wave
  report citing a `/tmp` log path fails review.

### NC-2 — Merge-era semantic collision between two correct waves (W6 fixture vs W14 separation law)

**Evidence.** W18-FIX item 1 (fix-report.md §1): the merged tip's
web suite measured **25 failed / 18 files** against the exact
23/16 baseline. The extra failure was `r19ListenRail.test.tsx`'s
ThreadShell leg: W6's fixture fed an Opal-authored message to
`ThreadShell` and expected its read-aloud control; W14's
separation law (`messagesForSurface("person-thread", …)` filters
Opal-authored messages out of person threads entirely) made that
rendering *forbidden* — the control legitimately never renders.
Both waves were correct on their own branches, against their own
briefs. The fixture was re-pinned to the law (strictly stronger
assertions: the absence is now the pinned behavior, with TTS
mocked *configured* so the absence is the filter's doing); no
assertion was weakened and the law was not touched.

**Class.** A *law change in one wave invalidating another wave's
fixture semantics* — invisible to per-branch suites by
construction, because each branch's baseline predates the other
wave's law. The merged-tip exact-floor suite caught it (the floor
did its job), but only *after* both waves were declared complete
and merged in sequence — the most expensive moment to learn it.

**NEW CHECK — Trial-merge semantic gate (dispatch-ready).**
- **Trigger:** any two waves in a program whose diffs touch the
  same surface, component, or named law (the coordinator's wave
  briefs already declare surfaces; a wave that *creates or
  changes a law* — a filter, a derivation, a separation, a
  vocabulary map — must declare the law by name in its report).
- **Mechanism:** before either wave is accepted as complete, the
  coordinator (or an integration worker) creates a scratch
  trial merge of the two branches and runs **the union of both
  waves' new/changed test files** plus the exact-floor diff.
  **Fails on:** any test in the union failing on the trial merge
  that passes on its own branch — that set difference *is* the
  semantic collision, surfaced at trial time, not at integration.
- **Disposition rule (from the W18-FIX precedent, now standing):**
  when a fixture and a law collide, the *law* wins if the law is
  the founder's newer stated intent; the fixture is re-pinned to
  assert the law's behavior at equal or greater strength, with the
  re-pin and its reason recorded in the fixture file's header. A
  re-pin that weakens an assertion to pass is a failed gate.
- **Scope note:** W18-FIX's other two items were resolved by
  keeping both sides of additive conflicts; NC-2 covers the
  *semantic* residue that textual merging cannot see.

### NC-3 — A budget check made stale by a later wave's legitimate addition (W3 glass count vs W13 share card)

**Evidence.** W18-FIX item 2 (fix-report.md §2):
`unifyDrift.test.ts` asserted glass backdrop "lives on the C2 dock
only" as a **raw count of 3**; W13's share card (a sanctioned,
founder-ruled use of the one glass material — the object that
leaves the app, frosted over the state field) plus a pre-existing
scrim brought the count to 5 and the test failed on *legitimate*
work. The resolution is the model answer: the share card was
tokenized to the one material (`blur(var(--chrome-glass-blur))`),
scrims were tokenized as their own material (`--scrim-blur`, with
the divergence reasoned in the token comment), and the raw count
was replaced by the **GLASS_REGISTRY** — every backdrop-blur site
in **every `.css` file under `src/`** (the test walks the tree
recursively, so a new stylesheet is covered), each entry carrying
sheet, exact selector, exact declaration, count, and a one-line
reason. It fails on unlisted sites, missing sites, and drifted
declarations; strength was mutation-verified (a planted stray
blur failed the test). 22 sanctioned sites at the fix.

**Class.** A count over an *open set* (stylesheets, surfaces,
providers, statuses) encodes "the world as of this wave" as if it
were the law. The law was never "3"; the law is "one material,
sanctioned sites, reasons on record." Every raw-count check over
an open set is a future false failure — or worse, trains a future
worker to delete legitimate work to make the number fit.

**NEW CHECK — Registry-not-count rule (dispatch-ready).**
- **Standing rule (catalog §4 addition, change-controlled):** no
  test may assert an exact count/length over a set that other
  waves can legitimately extend (tree-walk results, stylesheet
  properties, provider lists, surface inventories) unless the same
  test file defines a **registry** for that set — enumerated
  entries with a reason each — and asserts set equality against
  the registry in both directions (unlisted fails, missing fails,
  drifted fails).
- **Audit leg:** grep the web and backend suites for the
  fingerprint — `toHaveLength(`, `length).toBe(`, `== <number>`
  assertions whose receiver is a collected/walked set — and
  disposition each hit: registry (cite it), closed-set (state
  why the set is closed by construction), or convert. The audit
  list ships with the next pack's evidence.
- **Template:** `GLASS_REGISTRY` in `unifyDrift.test.ts` is the
  reference implementation; the MP-2/MP-6 per-SITE baselines
  (teeth-2, FIX-8) already follow this shape and are the backend
  precedent. NC-3 generalizes what both learned separately.

### NC-4 — A derivation default quietly mis-colors agreed plans (W13's `familyOfStatus` finding)

**Evidence.** W18-FIX item 3 (fix-report.md §3) — ruled on
evidence as a **live defect on the merged build**: `shellData.ts`'s
`FAMILY_BY_STATUS` had **no rows for the governed statuses
`tentative` / `agreed` / `changed`**, so all three fell through to
`"forming"`. An **agreed** plan — the back end's own "ready" —
rendered forming violet / "Forming" instead of ready gold on every
card surface the adapter feeds. Reachability was proven, not
assumed: `list_plans_for_user` excludes only `cancelled`/`expired`
by default, so the three statuses reach the web adapter intact.
The ruling was taken from the back end's one derivation
(`NextPlan.indicator_state/3`: agreed → ready; tentative/changed →
forming, with `changed → action` and `changed → ready` both
considered and rejected *from the code*, on the record). W7 had
found the same fingerprint in the same pass in a second map (the
Graphs adapter missing `completed`/`expired` → fell through to
forming; §2 W5-09). **Two instances, one pass, one class** — and
every existing check passed throughout, because MP-3's pin
verifies a status map is *unique*, never that it is *complete*,
and a fall-through default converts every omission into a
plausible-looking answer (MP-9's silent failure, inside a
derivation).

**Class.** Incomplete vocabulary map + absorbing default. The
default is the defect's camouflage: nothing crashes, nothing
logs, one state simply wears another state's color — MP-11's
meaning layer failing while its presence layer passes.

**NEW CHECK — Vocabulary-completeness gate (dispatch-ready).**
This check is also RW-06(a) in §1; it is specified once, here.
- **Source of truth:** the back end's governed vocabularies,
  exported as checked-in contract fixtures generated from Elixir:
  `SharedPlan.@statuses` (tentative/agreed/changed/cancelled/
  completed/expired), `PlanParticipant` canonical response states
  (accepted/pending/declined), `NextPlan.indicator_state` outputs,
  and `Calls.CallState` states. The fixture is regenerated by a
  named mix task; a stale fixture fails the backend suite.
- **Web leg:** a test walks `apps/opal_web/src` for every
  status→family / status→label map (the `FAMILY_BY_STATUS` shape:
  an object literal whose keys intersect the governed vocabulary)
  and asserts **every governed value has an explicit row**; a
  governed value reaching a default/fall-through branch fails.
  Non-governed terminal values the product deliberately excludes
  (e.g. `cancelled` in `familyOfStatus`, per the fix report's
  recorded reasoning) must appear as *explicit exclusions with a
  reason in the test*, not as silent fall-through.
- **Derivation-default fingerprint (teeth extension, MP-3/MP-11):**
  any `?? "forming"` / `|| "forming"` / default-case returning a
  state family for an unrecognized governed-enum input, in any
  file, is a gated site — registered with reason or removed.
- **Backend leg:** the same completeness assertion in reverse for
  any Elixir map keyed by web/client state strings.
- **Fails on:** unmapped governed values, silent defaults on
  governed enums, stale vocabulary fixtures. First application:
  pin the two known maps (`shellData.ts`, the Graphs adapter) and
  record the `cancelled` exclusion reasoning in the test, where
  the next reader will find it.

### NC-5 — (Found by this audit) A fixed test-side clock violation recurred in the pinned legs

**Evidence.** FR-17-12's lesson — tests failed depending on time
of day because quiet-hours read the real wall clock — was fixed
by making the suite clock-deterministic and running pinned legs
(02:00 / 14:00 LA) as battery law. In R19, W2's verifier found the
pinned 14:00 leg failing on `FollowThroughTest`: the test builds
its quiet window from the **real** `DateTime.utc_now()` (+12h)
while the app clock is pinned by `OPAL_CLOCK_OVERRIDE` — at the
run's real hour (09 UTC) the window landed exactly on the pinned
21:00Z instant and the evaluator correctly answered
`quiet_hours` where the test expected `not_due`. It reproduces in
isolation; it is not W2-implicated; the R18 battery had already
fixed the *identical construction* in a P5 celebration test
(seeded from wall clock while the product reads the governed
`SocialFlow.Clock`). Same test-side shape, second file, second
cycle: the pinned runs *detect* it (as an expensive full-leg
failure), but nothing prevents the construction.

**NEW CHECK — Governed-clock test hygiene gate (dispatch-ready).**
- **Static leg:** a backend test (teeth file family) scans
  `apps/opal_core/test/**` for wall-clock reads
  (`DateTime.utc_now`, `DateTime.now`, `:os.system_time`,
  `System.system_time`) outside a checked-in allowlist whose
  entries state why the read cannot affect an assertion under a
  pinned app clock. **Fails on:** unlisted wall-clock reads in
  tests.
- **Rule for the allowlist:** tests that need a time relative to
  "now" derive it from the governed clock the product reads
  (`SocialFlow.Clock.utc_now` or the suite's pinned instant), so
  the construction is correct under *every* pin, not just today's.
- **First application:** disposition `FollowThroughTest`'s window
  construction onto the governed clock (the W11 forewarning in the
  status file already names this choice: fix the construction on
  the merged tip, or classify it in the battery report with its
  root cause — NC-5 takes the fix and makes the class gated).

### NC-6 — (Found by this audit) The quantified posture regressed and no gate fired

**Evidence.** Catalog §4.3: pattern-site counts "are measured per
build and must trend to zero / stay zero; a build that regresses
a count fails the gate." The posture script's own header says the
opposite about itself: "This script is the measurement, not a
gate: it always exits 0." Between the teeth-2 ledger (TOTAL 117)
and this report's re-run at `7fa7dc98`, the total rose to **118**
(MP-6: 24 → 26 sites) across a full repair cycle whose every
battery was green. Nothing failed, nothing was reported, and the
change may be entirely legitimate owner-module growth — the point
is that under the current wiring *nobody was asked*. A direction
law with a measurement that cannot fail is MP-8 in process form:
the number exists, the verdict doesn't.

**NEW CHECK — Posture-as-gate (dispatch-ready).**
- Promote `scripts/pattern_posture.mjs` counts into the suites
  that already hold the matching per-site baselines (web teeth
  for MP-2/MP-3/MP-11; backend teeth for MP-1/MP-4/MP-6): each
  pattern's site count becomes an exact assertion, so a count
  change in **either** direction without a same-commit registry
  edit fails the build (the teeth baselines already work this
  way per-file; NC-6 extends the assertion to the posture totals
  so cross-file drift cannot hide between baselines).
- The delivery evidence for every pack includes the posture table
  (per-MP counts, delta vs the previous delivery, and the registry
  edits that explain each delta). An unexplained delta blocks the
  pack under RW-11.
- **First application:** reconcile the MP-6 24 → 26 delta at
  source (also RW-09(a)): register the two new
  `durable_preference_memory.ex` sites with their reason, or
  record them as a finding. Either outcome closes the delta;
  silence is the failure NC-6 exists to end.

---

## Closing record

- **Checks verified at full breadth: 0 of 14** (§1). Widenings
  specified for all 14 (RW-01..RW-14).
- **WALK-5 repeats: 15 full, 7 partial, 3 process-level** (§2),
  including both suspected repeats the brief named — W5-03 (call
  log left legacy-faced after unification claimed the shell) and
  the DIR-4 lit reveal (API-present, glass-absent until the
  deckfix) — both confirmed, both traced to checks that verified
  at line/component breadth what their lessons charged at
  surface/mount breadth.
- **New checks from R19 itself: 6** (§3, NC-1..NC-6), each
  dispatch-ready. Two of the four briefed incidents (NC-3's glass
  registry, NC-4's `familyOfStatus` ruling) were already resolved
  correctly by W18-FIX; this report's work is to promote those
  resolutions into standing rules so the *class* dies, not only
  the instance.
- **Recommended register actions for the coordinator:** enter the
  deckfix F1 event and the W5-03 event into the complaint ledger
  as **REC-4** and **REC-5** (charged to RW-03/RW-10 and RW-01/
  RW-11 respectively); carry §2's still-owed widenings (RW2-01..
  RW2-16, minus those discharged by W10/W15/W16 when they land)
  and §3's NC-1..NC-6 into the pack v2 gate list, so none of them
  survives this delivery as prose only.
- **What this report does not claim:** W10 (journey audit +
  totality trace), W15 (override sweep), and W16 (blind-spot hunt)
  had not landed at the tip this report was written against;
  several §2 rows mark their widenings IN FLIGHT on those waves.
  If those waves' reports contradict any verdict here, the
  verdicts should be re-derived from their evidence, not defended
  from this one.
- No code was changed, no commit was made, no gate was weakened.
  FOUNDER_ACCEPTED = NO. FREEZE = HOLD. PASS2 = NO.
