# THE EXHAUSTIVE MEMORY WALLET MAP — Opal (Repair #18, Track SM) — VALIDATED MAP

- **Status: VALIDATED (dual-pass + source adjudication). FOUNDER_ACCEPTED = NO.**
  This map changes no gate. It is the wallet track's build-plan input, not a build.
- **Validation date / tip:** 2026-10-18. Validated against branch
  `muse/repair-18` at `3a30c8f9` (validator's final read; HEAD advanced
  during validation from `672b1cc5` — the Drop-it wiring merge — to
  `3a30c8f9`, a ledger-only commit; both passes' tips are ancestors:
  Pass 1 tip `3a7b896f` ✓ ancestor, Pass 2 / hunt tip `e8f52123` /
  `64fe7199` ✓ ancestors). Where a claim was true at a pass's tip and
  false at the validation tip, the validated entry says so with the
  commit-level reason — a map that is stale on arrival is a defect.
- **The two passes:**
  - **Pass 1** — the prior text of this file (branch `muse/repair-18`,
    read at `3a7b896f`): 37 sections (§A.1–A.37), gap register
    W-GAP-01…36 + GYRO-01…12 (48 register entries).
  - **Pass 2** — `coordination/repair18/WALLET_MAP_PASS2.md`
    (independent; built without reading Pass 1; read at `e8f52123`):
    18 constructs + 6 capsule-field groups + 8 scope dimensions,
    defects G-01…G-26.
  - **Validator** — this rewrite. Every material discrepancy between
    the passes was adjudicated by returning to the sources (code at
    the validation tip + founder texts), never by vote, seniority,
    or averaging. Adjudication log: §V.2. Spot re-derivations: §V.3.
    Anything not resolvable at the source stays VISIBLE as
    CONTESTED (§V.4) — nothing was smoothed over.
- **Sources:** founder corpus `~/workspace/opal-graph/founder-docs/`
  (6 texts, 52,153 words — count verified by validator `wc -w`:
  v8-patent 11,889; dmw-v31 9,470; sovereign-wallets 8,546;
  social-flow-calendar 19,282; emma-story 2,253; otzar-architecture
  713); codebase `apps/opal_core` (788 `.ex` files — validator
  recount), `apps/opal_web/src` (403 files), `services/opal_ai`
  (21 `.py` files), 199 `create table` statements (validator recount,
  agrees with Pass 2); `track-soul-memory-design.md`;
  `MISTAKE_PATTERN_CATALOG.md`; `communication-model.md` + Division C
  specs (`track-c1-design-core.md`, `track-c2-design-shell.md`);
  `classification-sweep.md` (137 items); `BACKEND_AUDIT.md`
  (GAP-1…74, ASK-1…88); blind-spot hunts A and B
  (`blindspot-hunt-a.md` HA-01…11, `blindspot-hunt-b.md` HB-01…23 —
  cited below as HB to distinguish from §B subsystem numbers).
- **Classifications:** IMPLEMENTED / PARTIAL / ABSENT / CONFLICTING,
  per construct. A module exercised only by tests, or a pure
  map-in/map-out library with no product caller, is PARTIAL at best.
- **Dual sign-off convention:** every major section carries
  `Pass 1 ✓ / Pass 2 ✓ / Validator ✓` (or a named exception). A ✓
  means that pass's treatment of the section survives adjudication;
  where it does not, the mark is `✗ (see D-nn)` and the validated
  text governs.

---

## V. VALIDATION RECORD

### V.1 Counts (the headline reconciliation)

| Measure | Pass 1 | Pass 2 | VALIDATED |
|---|---|---|---|
| Patent constructs | "36 + sub-dimensions" (checklist) / 37 sections (§A.1–A.37) | 18 constructs + 6 field groups + 8 dimensions | **Canonical taxonomy (§V.5): 18 constructs; capsule decomposes into 6 field groups; scope policy into 8 dimensions = 32 mapped units.** Pass 1's extra sections are splits/folds of these units, preserved as sub-entries, not separate constructs. |
| Gap/defect register | 48 (W-GAP-01…36 + GYRO-01…12) | 26 (G-01…G-26) | **One register (§F): Pass 1 numbering canonical (finer grain), every Pass 2 G-id crosswalked onto it, plus hunt finds HA/HB and validator finds V-01…V-04. No defect from either pass was dropped; several Pass 2 G-ids map many-to-one onto Pass 1 entries and vice versa (crosswalk in §F.4).** |
| "capsule" in code | Implied absent (no capsule construct found) | **0 occurrences** (grep over lib/web/AI/contracts) | **0 — validator re-ran the grep at the validation tip: 0 hits in `apps/opal_core/lib`, `apps/opal_web/src`, `services/opal_ai`, `packages/contracts`. CONFIRMED. The patent's central noun exists in the product only as a docs UI metaphor (Pass 2 §A.2).** |
| Founder texts | 6 docs | 6 / 6, 52,153 words | 52,153 words — validator recount agrees exactly. |
| DB tables / core files | 787 Elixir files (header) | 199 tables, 788 files | 199 tables ✓; **788** `.ex` files (Pass 1's 787 is stale by one file at its own later tip — immaterial, corrected here). |

### V.2 Adjudication log — every material discrepancy, source evidence, ruling

| ID | Discrepancy | Source evidence (validator, at validation tip unless noted) | Ruling |
|---|---|---|---|
| D-01 | **Construct taxonomy itself:** 37 sections (P1) vs 18+6+8 (P2). | Founder texts: DMW v3.1 §II defines the capsule by its parts (header/payload/scope/audit/version); V8 names the system-level constructs (wallet, orchestration, SCB, ledger, modes…). P1 splits single constructs into sections (A.3–A.12 are capsule *parts* and scope *dimensions*; A.15–A.18 are one orchestration construct's facets). P2's grouping follows the texts' own grouping. | **P2 taxonomy ADOPTED as canonical (§V.5).** P1's splits survive as numbered sub-entries (they carry the finer code evidence). Neither count was "wrong"; they counted at different grain. The founder-facing number is 32 mapped units. |
| D-02 | Settings wire rows: P1 "21 rows: 20 GREEN, 1 HIDDEN" vs P2 "22 rows: 21 GREEN, 1 HIDDEN". | `settingsWireClass.ts` read directly: 21 `id:` entries; `grep -c 'class: "GREEN"'` = 20; HIDDEN = 1 (nearby-range). | **P1 HIT, P2 MISS (off by one).** Validated: 21 rows, 20 GREEN / 1 HIDDEN / 0 HONEST_GATE rendered. P2's §E substance (which controls are real) is unaffected and adopted. |
| D-03 | opal_ai size: P1 "23 Python files" vs P2 "23 contract capabilities". | `find services/opal_ai -name "*.py"` = 21 files (20 in `opal_ai/`). `contracts.py` `EXECUTABLE_CAPABILITIES` enumerated by validator = **23** capabilities. BACKEND_AUDIT's "22 executable capabilities" is stale by one. | **Split ruling: P2 HIT on capabilities (23); P1 MISS on file count (21, not 23).** Both numbers corrected in §B.16. |
| D-04 | Seed resurrection (F-10 / GYRO-08 first half): P1 "the terminal-plan resurrection branch is still verbatim on this tip" vs Hunt A spot-check "F-10 cover holds — `:seed_restore` exception is in the table". | `founder_graph_commitment_seed.ex:251-272` at validation tip: the old silent rewrite is commented as removed; cancelled/completed plans restore **only** via `PlanTransition.transition(:plan, status, :seed_restore)` (`plan_transition.ex:119-120`), with a logged line naming the exception, and a raise if the gate refuses. | **P1 MISS (stale — it repeated the classification sweep's finding from an earlier tip instead of re-reading the file); Hunt A / code govern.** GYRO-08 is SPLIT in §F: resurrection leg CONVERTED to a logged gate exception (the catalog's own prescribed disposition); the second leg (no "seed content never admitted as memory" gate at MemoryAdmission) remains OPEN. |
| D-05 | Plan cancel (W-GAP-28): P1 "cancel/'Drop it' ABSENT on glass, no HTTP plan-cancel route" vs the integrated tip the validator read. | Merge `672b1cc5` + `f4ae14e8`/`4d88e512` (Drop-it wiring, in the ancestry of the validation tip): `router.ex:482` `POST /opal/plans/:id/cancel`; `shellData.ts:132-162` derives `droppable` per plan from `can_edit` + legal statuses, real POST, server read-back removal. | **Both passes were right at their tips; the gap is CLOSED at the validation tip.** W-GAP-28 marked CONVERTED in §F (proof: the Drop-it wiring report + dropItWiring tests; rendered walk proof still owed — machine-proven, pending phone walk). A validated map must not carry a closed gap as open. |
| D-06 | Orchestration centre: P1 "`center/intelligence_orchestrator.ex` is DEAD (zero production references)" vs P2 listing it among orchestration code without the dead flag. | `grep -rn IntelligenceOrchestrator apps/opal_core/lib` = the module's own definition only. | **P1 HIT, P2 over-credit (minor).** Validated §A.15/B.3: dead shadow orchestrator, named. |
| D-07 | Audit ledger shape: P1 "plain Ecto row: mutable, unsigned, no hash link" vs P2 "insert-only shape (`updated_at: false`)". | `audit_event.ex` read: `timestamps(..., updated_at: false)` — there is no `updated_at` column; the schema is insert-shaped. No signature/hash fields exist (both passes agree). Rows remain deletable/updatable by direct Repo operations — nothing makes tampering *evident*. | **P2 precision ADOPTED; severity unchanged.** Validated wording: "append-only-shaped, unsigned, unchained, tamper-evidence nil." GYRO-02 stands as BLOCKER. |
| D-08 | Operational modes source sets: P1 attributes the five modes to DMW §VII and a V8 claim of "at minimum private + collaborative" vs P2 "v8 set of 4 (Private/Collaborative/Federated/Emergency Override); dmw-v31 set of 5". | Founder texts read directly: `v8-patent.txt:117-123` names exactly Private / Collaborative / Federated / Emergency Override modes, dynamically switchable, transitions logged. `dmw-v31.txt:1552-1781` names the five (Private/Scoped Agent/Federated/Cohort/Public Relay). | **Both HIT; P2's attribution is the more precise and is adopted.** No conflict of substance: two drafts, two mode sets; code has NEITHER (both passes agree, grep-verified by P2). |
| D-09 | Line counts: P1 `plan_transition.ex` 247 lines, `conversation_alignment.ex` 3,920, `memory_candidate.ex` 182, `durable_preference_memory.ex` 370, `memory_store.ex` 230, `memory_compose.ex` 337, `shared_plan.ex` 429, `plan_projection.ex` 153. | Validator `wc -l` at validation tip: plan_transition **263** (grew: the `:seed_restore` rows + registry), all others **exact** (3,920 / 182 / 370 / 230 / 337 / 429 / 153 ✓). | **P1 substantially HIT; one stale count, explained by D-04's fix landing between P1's read and validation.** Line counts in this map are as of the validation tip. |
| D-10 | SCB count: P1 "two real builders" (PromptBuilder, MemoryCompose) + OpalContext as a third, lesser assembler vs P2 "three assemblers = three context truths (G-05)". | Code: `prompt_builder.ex`, `execution/memory_compose.ex`, `opal_context.ex` (+ `center/planning_context.ex`, named by P2) all assemble context with different inclusion rules; none evaluates per-capsule policy; none ledger-logs delivery (SCB step 810). | **P2 framing ADOPTED (three+ assemblers, one defect); P1's per-builder analysis adopted as the detail.** Merged in §A.13. |
| D-11 | GroupTastes: P1 "hashing is a rare privacy-shaped touch" (favourable) vs P2 "centralized, identified-group learning; hash reversible by enumeration for small groups; min 3 plans". | `group_tastes.ex:16-17,92`: `@min_members 2`, `@min_plans_for_suggest 3`; `group_hash` = SHA-256 of sorted member ids joined by `\|`, first 16 hex chars (:23-33). A 16-hex truncated hash of a small known member set is enumerable. | **P2 HIT on both facts (min-3-plans confirmed verbatim; enumeration warning stands).** P1's "privacy-shaped" is downgraded to "hash-shaped, not anonymizing." §A.33/B.17 carry the corrected wording. |
| D-12 | Feedback inventory size: P1 §D = 15 rows (D1–D15, incl. two ABSENT signals) vs P2 §C.4 = 14 stores. | Both inventories re-walked against code by validator sampling (see SR checks): P1 counts *signals* (incl. D13 thumbs — absent, D14 implicit sentiment — absent, D12 check-in/care — excluded by ruling); P2 counts *stores that exist* (14). | **No conflict: different units.** Validated §D merges both: 14 existing stores + 3 named non-stores (absent/excluded) = 17 rows, each labelled. |
| D-13 | Ingestion — calls: P1 §B.17 "real signalling; no PSTN dial-out" (terse) vs P2 §D.1 detailed split (in-app WebRTC REAL; Twilio is NTS/TURN only; Deepgram config-gated honest; SMS outbound-only, inbound ABSENT; in-room ABSENT; Zoom links-only). | P2's splits match the track design §7 truth table and the code P2 cites; P1's own §S/§B fragments agree where they touch (Assist consent real; transcript canned text dead — BS-4). Neither pass contradicts the other; P1 simply under-mapped ingestion as a layer. | **P2's ingestion table ADOPTED wholesale as §D-ING of this map; P1 credited for the Assist/session analysis (§A.22) that P2 folds in.** |
| D-14 | Consent capabilities: both passes "3 product capabilities; `messaging_business` execution `:absent`". | `consent.ex:37-62` read: exactly `calls_outbound` / `bookings_reserve` (`:gated`) + `messaging_business` (`:absent`); ~30 schema tokens in `consent_proof.ex`. `expires_at` required — "no immortal grants" (`consent.ex:131,148-162`). | **AGREED — verified verbatim (SR-4).** |
| D-15 | F-register state: the classification sweep (both passes' shared source) lists F-01/F-02/F-03/F-10/F-12/F-14/F-15 as present on "this tip". Hunts + validator find several covers already landed. | Validator at validation tip: OpenTable `search/2` disabled in BOTH key states with the F-01 comment in code; opportunity controller now requires explicit `use_dinner_fixture in [true,"true","1",1]` (default OFF); `release.ex:47` reads `OPAL_RUN_SEEDS`; `call_channel.ex:59` replies `{:error, %{reason: "unknown_event"}}`. F-03 FCM dead endpoint still present (`fcm.ex:7` moduledoc names it). Executor push-swallow (HA-07) still verbatim. | **The sweep is STALE at the validation tip for F-01/F-02/F-14/F-15 (covers landed post-sweep); both passes inherit that staleness wherever they cite the sweep for current state.** §BS carries per-item current state, not sweep state. This is exactly the D-04 failure mode (citing a register instead of the code) and is recorded as validator find V-03. |
| D-16 | Households as plan writers: NEITHER pass names it. | Hunt A HA-05 + validator grep: `households.ex` has **0** `PlanTransition` references; `create_plan_from_context/2` (:325) and `accept_supply/1` (:504) insert `%SharedPlan{status: "tentative"}` directly. Contrast `trips.ex:408-412` guarding with `guard_changeset(:plan, :create)`. | **BOTH PASSES MISS; hunt find ADOPTED as validated defect V-01 (extends GYRO-05's family: the axis bypass is not only group/family plan *types* — a SharedPlan writer inside `households.ex` also bypasses the gate, invisible to the gate's own call-site registry).** |
| D-17 | Scope wildcard breadth: P1 "zone and user scopes match any context (`memory_scope.ex:112-113`)" vs P2 (scope = "a label, not an enforceable graph", no wildcard detail). | `memory_scope.ex` read: `scope_matches?("zone", _, _) -> true`, `("user", _, _) -> true`, **and the fall-through clause `scope_matches?(_, _, _) -> true`** — any unrecognized scope also matches everything. | **P1 HIT and UNDERSTATED; validator EXTENDS: the evaluator's default is allow-all (V-02).** GYRO-06 severity confirmed HIGH; its closing condition now includes deleting the allow-all fall-through. |
| D-18 | §0 claim status: both passes agree the granted parent is a transaction-logging patent and all DMW matter is draft/continuation matter; both failed to retrieve official texts. | Validator OG-1 attempt 3 (§0.2): two further `browser.search` queries (by number + "Google Patents", for each number) — neither surfaced the official Google Patents/USPTO record; results were unrelated patents. No URL guessed. | **AGREED, and OG-1 remains OPEN/CONTESTED (C-1).** §0.3's "beyond the granted claims" analysis stands on the drafts' own cross-references only, and is labelled as such wherever used. |

### V.3 Random spot re-derivations (validator, from raw sources)

Method: claims drawn across sections by lot (header counts, §0, §A,
§B, §D, §E/§S, register), each re-derived from the raw file/text
without reference to either pass's wording. HIT = source says what
the claim says; MISS = it does not (or no longer does, at the
validation tip); EXTENDED = true and worse/more than claimed.

| # | Claim (pass) | Re-derivation | Result |
|---|---|---|---|
| SR-1 | "capsule" occurs 0 times in code (P2) | `grep -ri capsule` over lib/web/AI/contracts at validation tip | **HIT** (0) |
| SR-2 | Only AEAD vault is for provider OAuth tokens; AES-256-GCM, 12-byte nonce (both) | `token_vault.ex:1-40`: AES-256-GCM, `strong_rand_bytes(12)`, AAD `opal.provider.token.v1`, used for provider tokens | **HIT** |
| SR-3 | Zone/user scopes match any context (P1, GYRO-06) | `memory_scope.ex` scope_matches? clauses | **HIT + EXTENDED** (fall-through allow-all, D-17) |
| SR-4 | Consent: expires_at required; 3 capabilities; messaging_business `:absent` (both) | `consent.ex:37-62,131,148-162` | **HIT** |
| SR-5 | PromptBuilder raises on cross-account fragments; "What you know…" header (both) | `prompt_builder.ex:152,183,192,366` | **HIT** |
| SR-6 | PlanTransition entities = `:plan \| :proposal \| :revision` only; no group/family entries (both) | `plan_transition.ex:74` type + transition table read in full | **HIT** |
| SR-7 | Settings: 21 wire rows, 20 GREEN / 1 HIDDEN (P1) vs 22 / 21 GREEN (P2) | `settingsWireClass.ts` direct count | **P1 HIT / P2 MISS** (D-02) |
| SR-8 | 23 opal_ai capabilities (P2) / 23 Python files (P1) | `contracts.py` enumeration = 23; `find` = 21 files | **P2 HIT / P1 MISS** (D-03) |
| SR-9 | Seed resurrection branch "still verbatim" (P1, via sweep) | `founder_graph_commitment_seed.ex:251-272` | **MISS — stale; gated exception now** (D-04) |
| SR-10 | AuditEvent insert-only shape (P2) vs "plain mutable row" (P1) | `audit_event.ex`: `updated_at: false`, no hash/signature fields | **P2 HIT (precision); P1 substance HIT** (D-07) |
| SR-11 | ProfileGap `@facts` contains exactly one fact: "birthday" (P1) | `profile_gap.ex:50-53` | **HIT** |
| SR-12 | Modes: V8 = 4 named modes; DMW = 5 named modes (P2 attribution) | `v8-patent.txt:117-123`; `dmw-v31.txt:1552-1781` | **HIT** |
| SR-13 | Social Score specified in Social Flow text; no score in code (P1 A.37) | `social-flow-calendar.txt:995-1049` (full Social Score System section); code side: care/solo "no scores" per sweep rows 62/64, no score module found by either pass | **HIT** (document CONFLICTING; code compliant) |
| SR-14 | GroupTastes min 3 plans before suggestions (P2) | `group_tastes.ex:17,92`: `@min_plans_for_suggest 3` | **HIT** |
| SR-15 | 43 `blockedReason` entries in legacy settings (P1 §S.4) | `grep -c blockedReason YouSettingsDestination.tsx` = 43 | **HIT** |

**Spot-check tally: 15 re-derivations — 12 clean HITs, 1 HIT+EXTENDED,
2 MISSes (SR-7 against P2; SR-8 file-count and SR-9 against P1 — three
miss instances across two claims), 0 unresolvable.** Both passes are
highly accurate on what they read directly; every miss came from
citing a secondary register (the sweep) or an arithmetic slip, never
from misreading code. That pattern is itself a finding (V-03).

### V.4 Contested-items register — unresolved, kept VISIBLE

No entry below is final. Each names the two claims (or the claim vs
the missing proof) and the source evidence that would settle it.

| ID | Contested item | Claim A | Claim B / missing proof | Evidence that would settle it |
|---|---|---|---|---|
| C-1 (= OG-1) | Granted/published claim scope of 12,164,537 B1 and US 2025/0335458 A1 | Drafts' cross-references: parent = transaction logging; publication = COSM+DMW for adaptive AI (both passes) | The official claim texts themselves — **unretrieved in 3 attempts** (P1: several search forms; P2: 5 queries; validator: 2 queries, §0.2) | A live-browser fetch of both records from Google Patents / USPTO by a parent/root session, reconciled against §0.3 line by line. Until then §0.3 is draft-evidenced only and no external representation may cite granted scope from this map. |
| C-2 | Reachability of the pure-layer default family at the DeviceMoment / ProviderVertical boundary (HA-06, HA-10; F-11 family) | Hunts: defaults (`\|\| 20`, fixture ids `jordan-1`/`conv-1`, `"Thursday · 6:30 PM"`) exist and HA-06 shows the "measured" label being laundered upstream of the F-11 fix | No HTTP/channel/Center caller into `DeviceMoment` / `MomentRealityBridge` / `ProviderVertical` was traced by either hunt — "one caller away" is not "reachable" | A complete caller trace (or a dead-code ruling with deletion) for `physical/device_moment.ex` and `social_flow/provider_vertical.ex`. Until settled these sites are inventoried in §M as LATENT (reachable-unproven), never counted converted and never counted live-FALSE. |
| C-3 | Call Assist two-sidedness (HB-20) | User copy: "Opal Assist can listen during this call to help with plans" | Code comment (`callAssist.tsx:19-20`): only this device's mic is transcribed; remote playback is never sent | The two-device exercise (sweep row 117, exercise 11) showing both sides' words in the read-back. Until then the copy over-promises by omission; §H records the human-form gap. |
| C-4 | Body-less voice note terminal state (HB-21) | Render: empty-body `voice_transcript` shows "Transcribing…" with no timeout/failure state | Post-BS-4 server refuses unkeyed transcription (503, nothing persisted) — so a *new* such row should be uncreatable via this API | A query/rendered check for persisted empty-body `voice_transcript` rows reachable on the integrated tip. |
| C-5 | Person tint: identity or rotation? (HB-22) | Design instinct (L9 continuity): a person's color should be stable | Projection spec calls the field a "rotation"; adapter derives tint from rail position (`shellData.ts:60-62,304`) | A design ruling from Division C, or a rendered pair (same person, rail + detail) — a ruling settles it; no code evidence can. |
| C-6 | Center "Next together" = soonest? (HB-23) | Copy promises "the soonest ready or happening moment" (`C2CenterOpening.tsx:17-20`) | Adapter takes first happening/ready in API order (`shellData.ts:227-229`); no start-instant comparison | The `/opal/plans` ordering contract, or a populated render with two ready plans at different times. |
| C-7 | Legacy-face render of the 43 blocked settings rows (P1 W-GAP-36) | C2 hub renders GREEN only (verified by sweep) | No rendered audit proves no blocked row paints as a live toggle on the legacy (R17) face | A rendered legacy-face pass over all 43 rows. |

### V.5 Canonical construct taxonomy (the D-01 ruling, stated once)

**18 constructs** (P2 numbering A1–A18, = P1 sections as crosswalked
in §A): DMW · capsules · SCB/packages · audit ledger · consent
lineage · scoped sessions · orchestration (incl. decomposition,
negotiation, human oversight — P1 A.16/A.17/A.18 as facets) ·
DBGI/domain binding · feedback capsules · operational modes ·
shared capsules · third-party pipeline · federation/DPS.
**Capsule decomposes into 6 field groups:** header · payload ·
scope policy graph · audit chain · version trail · (operations:
create/read/write/revoke/delegate/expire/merge — P1 A.29).
**Scope policy has 8 dimensions:** roles · relationships · time ·
purpose · consent · emergency overrides · jurisdiction ·
transformation/retention.
Plus three **non-construct entries** both passes carry and the
validator retains: Otzar boundary check (P1 A.34), Social Flow
behaviors (P1 A.35), Emma-story bundle (P1 A.36), and one
**CONFLICTING document construct**: Social Score (P1 A.37).

**Per-section dual sign-off:** §0 ✓✓✓ · §1 ✓✓✓ · §A ✓✓✓ (as
crosswalked) · §B ✓✓✓ · §C ✓✓✓ · §D ✓✓✓ (merged) · §D-ING —/✓/✓
(P2-originated) · §S ✓✓✓ (P1 grain + P2 corrections) · §F ✓✓✓
(merged register) · §H §P §L §BS §M §DC —/—/✓ (validator layers,
commissioned after both passes ran; the passes neither gain nor
lose credit for them).

---

## 0. Source hierarchy and the official-record finding

**Pass 1 ✓ / Pass 2 ✓ / Validator ✓** (with OG-1 contested, C-1).

### 0.1 What the founder corpus actually is

| Doc | Legal character (from its own text) |
|---|---|
| `v8-patent.txt` | Draft specification + claims for the COSMP/DMW federated multi-agent extension. Its Background states the parent, U.S. Patent No. **12,164,537 B1**, "introduced a transaction logging system for database and file operations" — i.e. the granted parent is a **transaction-logging** patent, not a memory-wallet patent. |
| `dmw-v31.txt` | Draft Continuation-in-Part of "Patent V4", itself a CIP of 12,164,537 B1. Contains its own claims section (CLAIMS at line 1892; system claim 1, method claim 9, CRM claim 15, with dependents — P2's citation verified by validator grep). |
| `sovereign-wallets.txt` | Draft Continuation-in-Part **of publication US 2025/0335458 A1**, adding DBGI, sovereign mobility, scoped sessions, cohort monetization, decision-trace system of record, hybrid Web2/ledger anchoring. |
| `otzar-architecture.txt` | Architecture note, not a patent text: the **professional** domain on the same baseline. Out of Opal's domain except as the contrast that defines Opal's relationship-only scope (SM design §0). |
| `social-flow-calendar.txt` | Product/behavior specification for Opal itself. Not a patent text. Contains one construct that **conflicts with standing product law** — Social Score (§A.37, SR-13 HIT). |
| `emma-story.txt` | User story (NIOV Wallet / DID / DPS / staking story). Aspirational product narrative; almost none of its mechanisms exist in code (§A.36). |

### 0.2 Official records — retrieval result (honest gap, three attempts)

- **Attempt 1 (Pass 1, 2026-10-18):** web search in several forms
  (`12164537`, `20250335458`, full titles). The index did not surface
  the Google Patents or USPTO full text for either number.
- **Attempt 2 (Pass 2, 2026-10-18):** five `browser.search` queries
  (by number, by formatted number, by the 12,164,537 title as given
  in the drafts). Same result: unrelated patents only.
- **Attempt 3 (Validator, 2026-10-18):** two further queries —
  "US Patent 12,164,537 B1 Google Patents" and "US 2025/0335458 A1
  patent publication Google Patents". Neither surfaced the official
  record for either number; results were unrelated patents and
  articles. No URL was guessed or constructed in any attempt.
- **COVERAGE GAP OG-1 (named, not silent; = contested item C-1):**
  the granted claims of 12,164,537 B1 and the published claims of
  US 2025/0335458 A1 were **not independently pulled**. A parent/root
  session with live-browser access should fetch both from Google
  Patents/USPTO and reconcile §0.3 before any external representation
  is made from this map. What can be stated from sources in hand:
  the founder drafts' own cross-references, and the claims sections
  embedded in `v8-patent.txt` and `dmw-v31.txt` — **draft claims in
  founder documents, not granted claims**.

### 0.3 Where the drafts go BEYOND the granted claims (draft-evidenced; see C-1)

1. **The granted parent (12,164,537 B1) is, by the V8 draft's own
   Background, a database/file transaction-tracking system.** Every
   COSMP/DMW construct in §A goes beyond that granted subject matter
   on the evidence in hand. None of it should be described as
   "granted".
2. **US 2025/0335458 A1 is a publication, not a grant.** Publication
   claims are pending claims. The sovereign draft itself lists what
   the parent publication did **not** yet contain: DBGI
   formalization, sovereign mobility, domain-sharded scaling, cohort
   monetization, hybrid Web2/ledger anchoring, decision traces as
   system of record. Those six are therefore, on the drafts' own
   account, **continuation-only** subject matter.
3. **DMW v3.1's additions beyond V8:** the five named operational
   modes as a wallet-level framework, DPS as a named federation
   layer, ephemeral/persistent dual-layer claims, emergency-access
   method claims, cross-jurisdiction governance claims. Draft claims only.
4. **Emma / Social Flow economics exceed all patent texts:** DID
   login, data staking, NIOV tokens, reward-based advertising, Aurora
   dormant-data lifecycle, ZKP ad targeting appear in **no** claims
   section in the corpus.

**Implementation consequence:** the map treats the patent corpus as
the founder's *architecture* (which governs the build regardless of
claim status) and flags claim status only where a construct's
protected form was asserted. Nothing in §F depends on a construct
being granted.

---

## 1. THE GYROSCOPE — the organizing frame

**Pass 1 ✓ / Pass 2 ✓ / Validator ✓.** (P2 states the same frame as
its §F.2 organizing principle; P1 drew it. No discrepancy of substance.)

```
                        THE AUDIT LEDGER  (fixed reference)
              every access / transition / grant verifies against it
   ┌────────────────────────────────────────────────────────────────┐
   │  AXIS — one governed state truth, back end only                │
   │  SharedPlan + PlanTransition (gate) + PlanProjection (registry)│
   │  Consent ledger · Memory admission/scope · Relationships       │
   │         ▲ write only through the gate ▲                        │
   │         │ scoped, minimized packages radiate out               │
   │  SCOPED CONTEXT BUILDER (the hub every spoke passes through)   │
   │   PromptBuilder (LLM) · PlanProjection (surfaces) ·            │
   │   OpalContext (Center) · ProviderAction payloads (external)    │
   └──────┬──────────┬──────────┬──────────┬──────────┬─────────────┘
        spoke     spoke      spoke      spoke      spoke
       Center    Threads/   Graphs/    YOU hub /   opal_ai +
       chat      Inbox      Home       Settings    provider APIs
       (glass)   (glass)    (glass)    (glass)     (agents)
   RULE: a spoke RECEIVES one explicit minimized projection.
   It never holds its own copy of the truth, never re-derives state,
   never reads the wallet unscoped. Violations = GYROSCOPE DEFECTS (§F).
```

**The deep rhyme:** a surface receiving ONE explicit minimized
projection **is** the Scoped Context Package pattern. `PlanProjection`
(`social_flow/plan_projection.ex`, 153 lines: registry of 25
sanctioned read files / 10 sanctioned read functions, one derived
projection `SocialMemory.Cache` with one invalidation choke point)
is the closest thing in the codebase to a *general* SCB output
contract, and `Intelligence.PromptBuilder` is the closest thing to
the SCB itself for the LLM consumer. The wallet build generalizes
these two from *plan/LLM* scope to *all memory* scope. (Both passes
state this independently — P2 §B1 in nearly the same words. This is
the strongest cross-pass agreement in the map.)

**Axis today:** SharedPlan state via `PlanTransition`
(`plan_transition.ex`, **263 lines at validation tip**, entities
`:plan | :proposal | :revision` only — SR-6 HIT; terminal states
refuse resurrection; the one logged exception is `:seed_restore`,
D-04); the consent ledger (`consent.ex` + `consent_proof.ex`);
relationship types; memory admission/scope as a *library* (the axis
exists but most consumers do not pass through it).

**Off-axis today (summary; register in §F):** group/family plan
family outside PlanTransition/PlanProjection **plus the Households
SharedPlan writers (V-01, missed by both passes)**; web surfaces
re-deriving plan state; in-memory (Agent) memory stores as a second,
volatile truth; per-surface fixture defaults in the pure library
layer; the money `wallets` table wearing the wallet name while no
memory wallet exists; three uncoordinated context assemblers (D-10).

---

## A. PATENT → CODE — every construct, file-level, full-stack (VALIDATED)

**Pass 1 ✓ / Pass 2 ✓ / Validator ✓** — presented in the canonical
taxonomy (§V.5): P2 construct number first, P1 section in brackets.
Path shorthand: `BE = apps/opal_core/lib/opal_core/`,
`FE = apps/opal_web/src/`, `AI = services/opal_ai/opal_ai/`.
"— none —" in a surface/control position is itself a registered gap.

### A1. Decentralized Memory Wallet [P1 A.1] — ABSENT as a construct
Per-entity, cryptographically controlled, sovereign memory store
(V8 Summary; DMW §I; sovereign §1.2). **No wallet entity, no per-user
wallet record, no wallet keys exist.** The only `wallets` in code are
the **money** wallet (`BE/wallets.ex`, `BE/wallets/wallet.ex`,
`wallet_transaction.ex`; tables `wallets`/`wallet_transactions` —
Stripe-load ledger, loads law-gated OFF). Memory is spread across at
least five unrelated stores (§B.4). The SM design's `opal_souls`
table does not exist. Surface/control: — none —. **→ W-GAP-01.**
Name collision registered as P2 G-23 (adopted, §F crosswalk).

### A2. Memory capsules [P1 A.2] — ABSENT as a type; PARTIAL analogues
Patent form: encrypted container = payload + schema/metadata +
embedded scope policy + audit/version references (V8 FIG. 7; DMW
§II.A; V8 claim 1(a)). **The word "capsule" occurs 0 times in code
(SR-1).** Three partial analogues, none a capsule:
1. `BE/social_flow/memory_candidate.ex` (182 lines; `personal_memory_candidates`) — richest analogue: confidence, uncertainty[], proposed_purpose, scope/scope_id, subject_user_id, value_key, polarity, sensitive, source_type, observation_count, first/last_observed_at, last_confirmed_at, confidence_components{}, provenance{}, context_dims{}, supersedes_candidate_id, contradiction_group_id, promoted_memory_id, consent_proof_id, ai_job_id, idempotency_key. Scope is a flat string pair, not a policy graph; payload is plaintext `candidate_summary`.
2. `BE/social_flow/relationship_memory.ex` (68 lines; `personal_relationship_memories`) — durable store: counterpart_user_id, summary, purpose, visibility (default `"private"`), review_at, expires_at, correction_state, deletion_state, handled_at, forgotten_at. Plaintext; purpose is a string, not a policy.
3. `BE/social_flow/shared_memory.ex` (77 lines; `shared_memories`) — see A16.
Surface: candidates — none directly; durable facts — Privacy "What
Opal remembers" (forget control). **→ W-GAP-02, W-GAP-03.**

**Capsule field groups (P2 A3–A7):**
- **Header/metadata [P1 A.3] — ABSENT.** Generic Ecto `id`+timestamps everywhere; `provenance{}`/`context_dims{}` fragments on MemoryCandidate; `schema_version "0.1.0"` on ConsentProof only. No author key, no schema-type registry, no parent/child links (supersession is nearest).
- **Encrypted payload / keys [P1 A.4] — ABSENT for memory.** All memory tables plaintext. The one real AEAD vault is for provider OAuth tokens: `BE/social_flow/real_world/token_vault.ex` (AES-256-GCM, 12-byte nonce — SR-2 HIT). No signed agent scope tokens; internal callers trusted in-process. **→ W-GAP-04.** (At Web2-first scale the honest first form is server-side encryption at rest + scope enforcement, per sovereign §5.1.)
- **Scope policy graph [P1 A.5] — ABSENT as a graph; PARTIAL as flat scoping.** `BE/social_flow/execution/memory_scope.ex` (142 lines) is the real scoping core: `@scopes ~w(user relationship conversation group plan activity_type zone time_horizon)`; `applicable?/2` intersects memory with context. It is a **pure library** — no capsule carries it; retrieval paths outside the execution library do not consult it (`OpalCore.Memory.recall/2` filters owner+visibility only). **Validator extension (D-17/V-02): `scope_matches?` returns `true` for zone, for user, AND as a fall-through for any unrecognized scope — the evaluator's default is allow-all.** Adjacent real policy objects (external, not embedded): `BE/relationships/access.ex`, graphing policy (`opal_graphing_policies`), `BE/relationship_access/` (Grant, GraphingPolicy, Templates). **→ W-GAP-05, GYRO-06.**
- **Audit chain (per-capsule) [P1 A.20] — ABSENT.** No hash chaining anywhere (P2 grep: no merkle/hash-chain; `:crypto.hash` only for IDs/group hashes/artifact canonical hash). Substitutes: supersession links, `memory_deletion_events`, chronology. "Who saw this memory, when" is unanswerable for any row. **→ part of W-GAP-13.**
- **Version trail [P2 A7] — PARTIAL.** Plans have a real revision trail (`plan_revisions`, family/group revision tables). Memory rows are mutated in place. `artifacts.ex` keeps prior versions `outdated_at` with signed URLs — closest rhyme outside plans.
- **Operations [P1 A.29]:** create IMPLEMENTED (admission/candidate/facade); read IMPLEMENTED but unscoped on several paths; write/version PARTIAL (supersession for durable prefs — `DurablePreferenceMemory.supersede/3` :133; ordinary memories edited in place); revoke PARTIAL (forget = delete, stronger than revoke; soft pause only on SharedMemory `paused_at`); delegate PARTIAL by substitution (consent grants capabilities, relationship access grants visibility; no capsule delegation); expire PARTIAL (fields exist, read-path enforcement absent); merge ABSENT; per-capsule audit ABSENT; federation withdrawal ABSENT. **→ W-GAP-23.**

**Scope-policy dimensions (both passes; P1 A.6–A.12 = P2 §A.3):**
| Dimension | Verdict (validated) |
|---|---|
| Roles | PARTIAL — relationship tiers; plan participant roles (`plan_participants`; PlanMemory `user_role` default `"participant"`); ConsentProof capabilities as agent roles. No capsule policy names allowed roles; agent "roles" are pipeline stages with code-level access. |
| Relationships | PARTIAL — **strongest dimension.** MemoryScope relationship scope keys on pair id; MemoryCandidate carries counterpart; `Relationships.Behavior` bounds per type. Durable RelationshipMemory reads have no relationship-scope enforcement (owner-wide recall). |
| Time | PARTIAL — candidate `suggested_expiry`/`expires_at`; memory `review_at` (+90d in facade), `expires_at`; ConsentProof `expires_at` **required** (SR-4). No read path evaluates memory expiry; decay is OutcomeLearning's 180-day half-life on *signals*. **→ W-GAP-06.** |
| Purpose | PARTIAL-as-metadata / ABSENT-as-enforcement — **both passes, verbatim agreement.** Purpose recorded (`purpose`/`proposed_purpose`; facade pipe-tag `"opal_center\|personal\|prefer"`); `purpose_bound_share.ex` states in its own moduledoc the durable write "still performs" without gating on the attached purpose metadata (validator read the moduledoc). No read path checks purpose. **→ W-GAP-06.** |
| Consent (embedded) | PARTIAL — candidate `consent_proof_id`; SharedMemory starts `pending_consent`. Ordinary memories carry no consent condition; the SM provenance contract (`learned_from_kind/confidence_basis`) is not yet in the schema. **→ W-GAP-07.** |
| Emergency overrides | ABSENT for memory (DMW form: multi-party authorization, graduated severity, time-limited credentials, tamper-evident logging, post-access review). Neighbours only: guardian authority/reviews, safety blocks, check-in welfare handling (never admitted to memory — the opposite flow). **→ W-GAP-08.** |
| Jurisdiction | ABSENT — no jurisdiction field or region-aware rule on any memory/grant object (only a money-wallet moduledoc warning). **→ W-GAP-08 (LOW for single-region launch; named so it is a decision).** |
| Transformation/retention | PARTIAL (P2's eighth dimension, adopted) — global habits only: call-transcript deletion-with-call, FreeBusy ≤1h cache, story TTLs. No per-object policy. |

### A8. Scoped Context Builder + Packages [P1 A.13/A.14] — PARTIAL
Patent steps 801–810 (query index → policies → filter → authenticate
→ decrypt portions → assemble → redact → deliver → **log delivery**).
**Three assemblers, no single SCB (D-10):**
1. `BE/intelligence/prompt_builder.ex` — the LLM SCB and strongest rhyme: `build/4` requires `%Scoped{}` ("scoped account required", :152); `assert_scope!` raises `"social_memory scope violation: person_memory account mismatch"` (and plan twin) on cross-account fragments (SR-5); minimized sections under "What you know (account-scoped; never reveal other accounts' private context)" (:366). Does not consult capsule scope/purpose; audit is a log line + in-payload map, **not a ledger entry (step 810 unmet)**.
2. `BE/social_flow/execution/memory_compose.ex` (337 lines) — alignment SCB: `remember/1`, `apply_to_alignment/2` (:89), and `shared_safe_summary/2` (:289) composing *without disclosure* (`"composition_not_disclosure" => true`) — the one place the code already implements "use without revealing". Pure library layer.
3. `BE/opal_context.ex` — `assemble/3` (:49) Center packet; per-user, not per-task scoped; not the ASK-66 per-turn packet (ABSENT, GAP-58). Plus `center/planning_context.ex` (P2).
Package forms: PromptBuilder parts+audit map; PlanProjection projections; AI-job envelope caps (5 items / 2,000 chars, schema-validated both ways). No shared package type across consumers. No user-visible "what Opal used" view; the SM `because:` contract is unbuilt. **→ W-GAP-09.**

### A9. Signed append-only audit ledger [P1 A.19] — PARTIAL
Patent form: hash-linked, signed, append-only; every access a
transaction entry (V8 claim 1(f); parent 537's logging core).
Code: `BE/social_flow/audit_event.ex` (`social_flow_audit_events`:
conversation_id, plan_id, actor_user_id, event_type, payload{},
trace_id; **insert-shaped, `updated_at: false` — D-07**);
`BE/intelligence/action_log.ex` (`intelligence_actions`);
`event_outbox`; `commitment_ledger`/`plan_commitments` (commitments,
not audit — P2 G-25 name collision, adopted). **Nothing is signed or
hash-linked; the only hash-linking is inside artifacts
(`artifacts.ex:289`). Coverage does not include memory reads (P2
G-13). This is the gyroscope's fixed reference, and today tampering
would be undetectable → GYRO-02 (BLOCKER).** Surface: — none —
(activity trail / Opal's Home unbuilt). **→ W-GAP-13 / GYRO-02.**

### A10. Consent lineage ledger [P1 A.21] — PARTIAL (strongest governance object)
`BE/consent.ex` + `BE/consent/consent_proof.ex` (`consent_proofs`):
~30 grantable schema tokens; exactly 3 product act-on-behalf
capabilities (`calls_outbound`, `bookings_reserve` — `:gated`;
`messaging_business` — `:absent` execution, SR-4); `grant/3` requires
`expires_at`; `revoke/2` owner-only; `validate_for_job/1` checks
expiry server-side on every governed job; every proof carries
evidence_type/reference, policy_version, granted_at, revoked_at.
What it does not do: gate memory reads; record per-capsule/class
consent; keep a lineage *chain* (proofs are current-state rows).
Four disconnected consent stores total (ConsentProofs,
AssistConsents, SharedMemoryConsents, RelationshipAccessGrants —
P2 G-14). Surface: YOU → Calls & Opal Assist grant/revoke (GREEN).
Lineage viewer: — none —. **→ W-GAP-14 (messaging_business decision),
W-GAP-15.**

### A11. Scoped sessions [P1 A.22] — PARTIAL (dimensions scattered, object absent)
Patent descriptor: WHO / WHERE / AS WHO / WHAT / CAN DO / UNTIL /
RULES / TRACE / VALUE, stored in domain record + wallet history.
Code: WHO/UNTIL — `BE/auth/product_session.ex` (device sessions,
issue/refresh/revoke, socket tickets; `device_sessions`,
`approved_devices`) — an *auth* session with no role/scope/capability
layering. AS WHO — plan participant roles + relationship types.
WHAT/CAN DO — ConsentProofs, not bound to a session. Travel sharing
is the one genuinely scoped-session-shaped feature: separate,
time-bounded precise-location session (ASK-41 PRESENT-AND-REAL) —
and its settings control is blocked (§S.4). Call rhyme (P2):
`calls/call_session.ex` + `turn_credentials.ex` (TURN tokens per call
session). No session descriptor stored wallet-side; session revoke
UI HIDDEN/unbuilt. **→ W-GAP-16.**

### A12. Orchestration engine + decomposition + negotiation + oversight [P1 A.15–A.18] — PARTIAL, fragmented
Four centres: `BE/center/action_orchestrator.ex` (`after_classify/4`
:41); `BE/intelligence/executor.ex` + `pipeline.ex` (Extractor →
Reasoner → Executor; `EventSubscriber` the only intelligence
GenServer in supervision); `BE/ai.ex` (durable AI-job orchestration,
consent-validated before a job exists); `ConversationAlignment.fold`
as plan-domain coordinator. **`BE/center/intelligence_orchestrator.ex`
is DEAD (D-06).** Decomposition: `center/dependency_planner.ex`,
PlanCompletion pipeline, DecisionIntelligence (P2 B15) — no auditable
decomposition record (part of W-GAP-10). Negotiation: ABSENT as a
protocol (human group alignment is the analogue: proposals, option
responses, mediation dismiss-7d). Human oversight: PARTIAL — revision
two-party hold, change proposals, check-in organizer summary; no
supervisor console, no memory-access risk pause, no safe mode; the
"Awaiting your approval" queue is unbuilt. No single engine mediates
*memory* access; modules read stores directly (**GYRO-01**).
**→ W-GAP-11 (negotiation — named, likely declined by design),
W-GAP-12 (approvals queue).**

### A13. Domain binding / DBGI [P1 A.23] — ABSENT as an instance; PARTIAL as a boundary
No DBGI object: no domain policy stack as data, no
domain-local-vs-wallet memory distinction (all memory is server-side
"domain" memory in patent terms — the inversion at the heart of
W-GAP-01), no decision-trace record. Opal *is* one domain
(relationships) by founder ruling, enforced at exactly one gate:
MemoryAdmission rejects professional/work content by kind (§B.4).
Fragments (P2): households/guardian/youth rhyme a household domain's
role/hierarchy; `real_world/calendar/decision_trace.ex` is a redacted
log-builder map (`authorizes_set: false`) — name collision with the
DBGI record (P2 G-26, adopted), not the record. **→ W-GAP-17.**

**Decision traces [P1 A.32] — PARTIAL fragments, ABSENT as a record:**
`decision_*` tables under `BE/decision_intelligence/` (WorldFactStore
dead; live wiring thin); calendar decision_trace (above); chronology
records what happened, not which rules fired. **→ W-GAP-10.**

### A14. Feedback capsules / Feedback Analyzer [P1 A.24] — PARTIAL
Signals are real, the capsule form is not. Full merged inventory in
§D (14 existing stores + 3 named non-stores). Headline:
`BE/intelligence/feedback.ex` (`intelligence_feedback`: accepted /
dismissed / ignored / counter_proposed) + `feedback_loop.ex`;
`BE/social_flow/feedback_event.ex`; outcome signals (§D). None is a
scoped memory object under A5 policy; two of the most patent-faithful
mechanisms (MemoryAdmission/MemoryKind authority; CorrectionLedger)
live in non-durable process state. **→ W-GAP-18.**

### A15. Operational modes [P1 A.25] — ABSENT as a wallet mode
Two draft sets (D-08/SR-12): V8 = Private / Collaborative / Federated
/ Emergency Override; DMW §VII = Private (Offline/Zero-Trust) /
Scoped Agent / Federated / Cohort / Public Relay. Mode propagates to
all capsules unless a capsule overrides; transitions authenticated +
logged. Code: **no mode enum, no `operational_mode`/`wallet_mode`, no
transition log (P2 greps = 0).** Scattered analogues: proactive
opt-in/opt-out + threads flags; AssistancePreference (quiet window,
maturity); graphing modes (`:global_paused/:never/:ask/:auto/
:selected`); relationship visibility. No Private mode (memory off),
no Cohort/Public Relay mode. **→ W-GAP-19 (core wallet-build item).**

### A16. Shared capsules + joint approval [P1 A.26] — IMPLEMENTED-in-form / PARTIAL-in-governance (closest patent construct in the codebase; both passes agree)
`BE/social_flow/shared_memory.ex` (`shared_memories`):
`participant_ids[]`, `required_participant_ids[]`, status lifecycle
default `"pending_consent"` (P2: pending_consent → active / paused /
archived / dissolved / deleted / declined), `visibility "shared"`,
`source_message_ids[]`, `memory_class "shared_relationship"`,
purpose, expires_at/review_at, pause/archive/delete timestamps,
idempotency key. `BE/social_flow/shared_memory_consent.ex`
(`shared_memory_consents`): per-participant `decision` (default
`"pending"`), `decided_at` — **joint approval is a real schema.**
Gaps to patent form: no multi-signature/crypto release; consent is
row status, not capsule-embedded policy; not a lineage entry (A10);
logging on one central DB, not both parties' ledgers; the SM §3.4
carve-out law (shared plan truth ≠ personal memory) is a design rule,
not yet a code gate. **Surface: — effectively none — the consent rows
have no glass. → W-GAP-20 (construct without a surface).**

### A17. Third-party privacy pipeline [P1 A.27] — PARTIAL
Patent: filter → tokenize/anonymize → re-encrypt → vet return.
Minimization exists per-integration; a pipeline does not. Real
points: Google Calendar is **free/busy only** (`calendar.freebusy`
scope; `free_busy_cache` holds busy intervals only, no titles, ≤1h
TTL; aggregation never exposes calendar names — P2, adopted as the
product's best minimization flow); OAuth tokens encrypted at rest
(A2/TokenVault); opal_ai envelopes bounded (5 items / 2,000 chars);
ProviderAction payloads bounded; `StructuredLogger.redact/1` /
`TokenVault.redact_for_log/1` redact for *logs*, not recipients.
**No tokenization/pseudonymization step, no re-identification on
return, no provenance-tagged re-encapsulation of results** (results
land in `bookings`, `provider_economic_events`, plan rows).
Provider returns *are* vetted (Elixir revalidates Python proposals)
— the return leg is the strongest leg. Surface: connected-sources
status shows *that* a third party is connected, never *what was
sent*. **→ W-GAP-21.**

### A18. Federated sharing / DPS / cohort intelligence / value attribution [P1 A.28/A.33] — ABSENT (partly by founder law)
Greps (P2, validator-consistent): `zero-knowledge` / `differential`
/ `homomorphic` = 0 hits; `federat*` = 0; `cohort` = 1 hit (a
pilot-readiness label string in `execution/pilot_readiness.ex`).
No DPS, no cohort definitions, no anonymized contribution path, no
value attribution/settlement, no synthetic feedback capsules. The SM
isolation law (§3.4: no aggregate leakage, no "people like you"
derivation from personal memory across accounts, in any form)
**forbids** the naive cohort — a patent-conformant cohort requires
the A10 lineage + A17 anonymization apparatus first. Registered as a
deliberate, gated absence. Nearest rhyme: GroupTastes (§B.17) —
identified-group learning, **not** anonymous (D-11). **→ W-GAP-25.**

### A.30–A.37 retained entries (P1 numbering, validated)
- **A.30 Cryptographic identity / DID / signed tokens — ABSENT (DID), PARTIAL (tokens).** Identity is phone-OTP (Twilio Verify, production SMS real — sweep row 98). No DID anywhere in `BE/` (P2 grep; validator-consistent). ConsentProofs are DB rows validated server-side — the sovereign draft's Web2 form expressly allows KMS/federated identity, so this is a *form* gap, not a law gap. **→ W-GAP-24 (LOW).**
- **A.31 Dual-layer memory — PARTIAL, internally split.** Persistent: DB stores. Ephemeral: in-process stores (`Execution.MemoryStore` 230 lines, MemoryMetrics, CorrectionLedger, `SocialMemory.Cache`) — server-process state, not session-scoped capsules; while the process lives they are a *second truth* beside the DB (**GYRO-03**). The backfill mix task (writes by default) is the unaudited bridge. P2's §C.3 shadow-truth inventory (two conversation systems, three assemblers, ETS cache, localStorage stores, fixture projections) is adopted into §C.
- **A.34 Otzar objects — ABSENT from Opal, correctly.** Work Graph, Communication Graph, Outcome Evidence, Digital Twins, Councils: out of domain (SM §0). `BE/work/` = two honest caller-less stub providers (GAP-52). Boundary risk is content, not structure: MemoryAdmission's work-value rejection is the gate. **No gap; boundary verified (both passes).**
- **A.35 Social Flow behaviors — PARTIAL** (§B): synchronicity/proximity PARTIAL; emotionally intelligent prompts/habit learning PARTIAL; granular privacy + circles PARTIAL; **immutable social proof ABSENT → W-GAP-26.**
- **A.36 Emma constructs — ABSENT bundle:** DID login, DPS insights, ZKP, data staking + NIOV tokens, reward-based advertising — all ABSENT, no surface claims them. Aurora lifecycle ABSENT as a named system (shape exists in decay/revalidation). **→ W-GAP-27.**
- **A.37 Social Score — CONFLICTING (document), compliant (code).** `social-flow-calendar.txt:995-1049` specifies a Social Score (attendance, contribution, reliability, influence) feeding rewards/advertiser offers (SR-13). **Standing product law: no people-scoring anywhere.** Code contains no social score (care rotations expressly carry "no per-member miss scores"; solo context "never stored, scored, or rendered"). The wallet build must not import the scoring sections. **→ W-GAP-34 (document conflict; code action: none, vigilance only).**

---

## B. CODE → PATENT — every Opal subsystem (VALIDATED)

**Pass 1 ✓ / Pass 2 ✓ / Validator ✓.** P1's 17 subsystems and P2's
15+4 name the same territory; the merged inventory below is the
union. Full-stack trace per subsystem (construct → projection →
surface → control); FE status words cite the classification sweep
at its tip, corrected by §BS where covers have since landed.

### B.1 Plans: SharedPlan + PlanTransition + PlanProjection — the axis, REAL for this family
`BE/social_flow/shared_plan.ex` (429), `plan_transition.ex` (263 at
validation tip; `transition/3`, `terminal?/2`, `legal_actions/2`,
`guard_changeset/3`; entities `:plan | :proposal | :revision` only —
SR-6), `plan_projection.ex` (153; registry :84-124,
`invalidate_derived/2` :145), `plan_completion.ex` (`drive/3`, 4 call
sites), `plan_revision.ex`, `plan_participant.ex`,
`plan_commitment.ex`; tables `shared_plans`, `plan_revisions`,
`plan_participants`, `plan_options(+responses)`, `commitment_ledger`.
Full-stack: registry projections → NowStrip/list/detail → Graph
Detail → PATCH edit via `:edit` gate (TRUE), revision flow (TRUE).
**Cancel: CONVERTED at validation tip (D-05)** — `POST
/opal/plans/:id/cancel` + C2 `droppable` derivation; W-GAP-28 closed.
Gyroscope defects: GYRO-05 (group/family family off-axis **+ V-01
Households writers**), GYRO-07 (web re-derivation, §BS for current
state).

### B.2 Conversation alignment fold + the dual conversation systems
`BE/social_flow/conversation_alignment.ex` (3,920 lines — largest
module in the tree), fed by `BE/messages.ex` + `BE/messaging/`
(server sequence under row lock, client idempotency), `messaging/inbox.ex`.
**Two conversation stores coexist** — `conversations`/`messages`
(peer) and `opal_conversations`/`opal_messages` (Center) — P2 G-02,
adopted as a shadow-truth entry (§C.3). Defects: two change systems
historically (GAP-2; Division A fix CARRIED); shell thread carries no
Next Together strip and no plan pill because the contract carries no
plan linkage (honestly absent) **→ W-GAP-29**.

### B.3 Center (OpalResponse, OpalIntent, ActionOrchestrator, Executor, PromptBuilder)
`BE/opal_intent.ex` (`classify/2` :37), `BE/opal_response.ex`
(`generate/2` :55), `BE/center/action_orchestrator.ex`
(`after_classify/4` :41), `BE/intelligence/executor.ex`,
`prompt_builder.ex` (§A8), `BE/opal_context.ex` (`assemble/3` :49),
`BE/opal_plan_confirm.ex`, `BE/oracle.ex` (membership-checked,
template-only; P2 notes Oracle's direct cross-store queries as a
re-deriving spoke, G-11 — adopted). `center/intelligence_orchestrator.ex`
DEAD (D-06). Center sessions real (`opal_conversations`); RF-2/RF-3/RF-4
were FALSE at the sweep's tip — **current state: RF fixes landed on
the integrated tip per the complaint ledger (merge `34519b59`),
integrated confirmation PENDING-RUN** (see §BS F-06…F-09). Sticky
context = GYRO-04 until the per-turn package replaces it.

### B.4 Memory pipeline — the wallet's intake + retrieval machinery in embryo
- `execution/memory_admission.ex` (270): `evaluate/1` (:42) builds scope identity, classifies kind, admits or routes ephemeral/discard; `from_python_proposal/1` (:77) — Python proposals pass the same gate. Durable only when `durable?` (:241): plan-scoped never durable. Work/professional values rejected by kind (the DBGI boundary gate, A.34).
- `execution/memory_scope.ex` (142) — §A2 scope group (incl. V-02 allow-all fall-through).
- `execution/memory_kind.ex` (85): authority order `explicit_correction > explicit_fact > native_commitment_history > repeated_behavior > provider_execution_outcome > inferred_preference / derived_context`; `may_be_durable?/1` true only for the first four + repeated_behavior. **This is the capsule authority model, already written.**
- `execution/memory_store.ex` (230): in-memory store (A.31, GYRO-03). `execution/memory_compose.ex` (337) — §A8. `execution/memory_fit.ex` (246): questions-eliminated measure as a library function, no live analytics loop (GAP-53). `execution/memory_metrics.ex` (116): volatile counters.
- `BE/memory.ex` (114): Center facade over `personal_relationship_memories`; `store/3` (:22) explicit facts, dedupe by normalized summary, +90d review; `recall/2` (:62) owner+private filter, substring, take 3 — **no scope/purpose/expiry check (GYRO-01 instance)**.
- `BE/social_memory.ex` + `social_memory/` (16 files + workers): `for_account/1` raises without an account; `%Scoped{}` type-level account binding; `ingest/5`, `recall_for_conversation/2`, `detect_conflicts/1`, `surface_nudges/1`; `person_memory.ex` (`person_memories`: known_facts{}, open_loops[], cadence, sentiment_trend, behavior_override), `plan_memory.ex`; hygiene workers.
- `BE/social_flow/durable_preference_memory.ex` (370): `remember_explicit/1`, `list_for_owners/1`, `to_preference_facts/1`, `supersede/3` (:133), `forget/2` (:161), `forget_with_candidates/2` (:188), `to_transparency_fact/1` (:266) — the seed of the SM `because:` contract.
Full-stack: no general projection — consumers read stores directly.
User-facing Memory card/list ABSENT **→ W-GAP-31**; two-account
isolation proof suite ABSENT **→ W-GAP-32**.

### B.5 Proactivity gates — operational-mode enforcement in embryo
`BE/intelligence/proactive_conversation.ex` (`threads_enabled?/1`
default false — opt-IN; `set_opt_out/2` schema-bound after the R16
fix; `classify_opt_out/1`; closed trigger list; 1/day cap; quiet
hours; 7-day activity gate; suppression recorded with reason);
`BE/intelligence/attention_budget.ex` (daily budget; quiet window
22:00–08:00 owner TZ, prefers AssistancePreference :404-428);
`BE/social_flow/attention_authority.ex` + `attention_center.ex`
(PRESENT-AND-REAL); TFT producers verified 5/5/9 call sites. P2 adds
the wallet reading: a proactive thread *is* an outbound scoped
session in patent form; today it is two booleans + logs (adopted).
Controls fragmented (§S.5); quiet hours have a backend preference but
no direct settings editor row. **→ part of W-GAP-19.**

*Presentation cross-reference: how anything approved by the gates above is allowed to appear - taxonomy, surface forms, color/pattern, timing, and the user-word modes of section 6 there - is specified in `coordination/repair18/proactive-presentation-system.md`; this map governs whether Opal may act, that spec governs how an approved act may present, and neither substitutes for the other.*

### B.6 ProfileGap / ask-ledger — progressive capsule seeding
`execution/profile_gap.ex`: `@facts` registry (:50) containing
**exactly one fact: `"birthday"` (SR-11 HIT)**; `assess/4`,
`answer/4` (admits via MemoryStore + writes the durable Celebrations
record), `skip/3` (permanent), `ledger_row/3`; table
`profile_gap_asks`; `WEB/controllers/profile_gap_controller.ex`;
`FE/opalUi/ProfileGapAsk.tsx`. Breadth gap **→ W-GAP-33**. This
registry is the designated seeding mechanism for Soul fields — no
soul facts are registered.

### B.7 Founder seed — anti-construct, posture CORRECTED at validation tip
`BE/social_flow/founder_communication_seed.ex`,
`founder_graph_commitment_seed.ex`, `seed_fixture_leak.ex`,
`ProductShell.seed_*` — behind flags. **Resurrection leg: CONVERTED
(D-04)** — restores now pass the PlanTransition `:seed_restore` gate
exception, logged. Still open: seed re-provisioning history (5× in
one walk session, GAP-12/BS-2 family) and **no code gate states
"seed content is never admitted as memory"** (P2 G-04: no
"synthetically derived" provenance marker). **→ GYRO-08 (residual
half only).** Seed-mode glass finds HB-07 (seed extras merged into
live data unlabeled) live in §BS.

### B.8 Location pipeline — the model citizen of scoping
`BE/center/device_location.ex`; `real_world/location/`
(approximate_store, grant, movement_mode, precision, retention);
`physical/location_context.ex`, `location_policy.ex`;
`ambient/location_confidence.ex`; ASK-40/41 PRESENT-AND-REAL
(coarsening to 3 decimals at both entry points, haversine from a
device origin only, 24h staleness). P2 reading adopted: textbook
*ephemeral memory* — session-bound, never persisted unless converted;
no policy object decides which derivations persist. Settings:
live-share control blocked (§S.4); travel-mode row GREEN. The wallet
build should copy this shape for memory. (Boundary defect at
DeviceMoment: HA-06, contested C-2, §M MP-10/MP-3 sites.)

### B.9 Relationships + RelationshipType + lead times — the embryonic scope graph's relationship axis
`BE/relationships.ex` (`set_type/4`, `set_family_subtype/4`,
`for_user/1`, `type_map_for/1`), `relationship_type.ex` (7 types),
`family_subtype.ex` (8 subtypes, family-only), `behavior.ex`
(`lead_time_hours/1,2` :151-159; style/planning/frequency per
type+subtype), `access.ex`, `inference.ex` (write side unreachable
live — PARTIAL; its confirm/correct/dismiss signal dies before glass,
§D D9), `broadcast_framing.ex` (DEAD in production). Tables:
`relationship_types`, `relationship_behavior_profiles`,
`relationship_contexts`, `relationship_establishments`. ASK-23/24
PRESENT-AND-REAL; reverse label withheld by construction.

### B.10 Media / stories / social moments — capsule payloads in waiting
`social_flow/social_moment*.ex` (publishing 535 lines + audience,
visibility, engagement, media, record), `temporary_story*.ex`,
`media_local_store.ex` (status `LOCAL_DEV`, `production_cdn?` false);
tables `social_moments(+media, likes, comments, saves, hides,
reports, reposts)`, `temporary_stories`. Media rows carry owner +
`exif_stripped: true` default + moderation state (P2) but **no scope
policy on the media object itself** — audience lives on the moment.
Backend persistence TRUE; media has no production home (GAP-41).
Audience selector (`MomentAudienceSelector.tsx`) is a genuine
per-item scope control — one of the few glass-level scope controls
in the app. Video honestly refused.

### B.11 Inbox fanout — delivery spoke, membership-scoped, content-bearing
`BE/messaging/inbox.ex`: `fanout_message/1` (:21), `fanout_read/3`
(:90), `fanout_plan/2` (:135); push enqueue on fanout. Messages
boundary: server sequence, row lock, idempotency (ASK-62 REAL).
**P2 G-09 adopted:** push previews (≤180 chars) leave the session
without tokenization/minimization policy — in wallet terms fanout
must become delivery of a scoped package *reference*, not content.
Badge casualty: C2 adapter returns `dockUnread: 0` always (no
finished dock-unread projection; correctly refuses to sum locally)
**→ W-GAP-29 family**.

### B.12 Celebrations — durable date capsules + lead-time scoped release
`BE/celebrations.ex` (owner-only CRUD, `next_occurrence`,
`already_reminded?/mark_reminded`), `celebrations/celebration.ex`,
`celebration_reminder_worker.ex` (daily cron through
AttentionBudget), `celebration_curation.ex` (template curation,
never real products). Settings section GREEN (§S.3 row 18).
Push/generative preparation half HONESTLY ABSENT by a Repair-16
consent decision — a *consent-gated* absence, the correct patent shape.

### B.13 Check-in sweeps (B3 track) — shared capsule in behavioural form
`social_flow/checkin_sweep.ex`, `checkin_response.ex`, `checkin.ex`
(1,469 lines), `checkin_suggestion.ex`; tables `checkin_sweeps`,
`checkin_responses`. TRUE (sweep row 59): real-path cases, QUIET law
(one open sweep/circle, 24h cooldown, zero reminders), summary is
the single server projection `Checkin.summary_for/2`. **Welfare
answers are never admitted to memory — an admission-policy precedent
the wallet inherits (§D D12).** Glass defects found post-map:
HB-18 (raw ISO cooldown timestamp; silent create failures) — §BS.

### B.14 Care rotations + households (B4/B5 tracks)
`social_flow/care_rotation.ex` + `care_rotations/`, `care_check_in.ex`;
tables `care_rotations`, `care_check_ins`. `households.ex`,
`household.ex`, `household_membership.ex`, `household_context.ex`;
tables `households`, `household_memberships`. TRUE (rows 62-64):
ledger occurrences, missed surfaces exactly once to exactly the set,
**no health fields, no miss scores** (A.37 law held); household
declared + accepted only, never inferred; solo context is a
read-time predicate, never stored. **Validator addition (V-01/D-16):
`households.ex:325,504` create SharedPlans with NO PlanTransition
guard — the B5 TRUE classification holds behaviourally ("tentative"
is today's legal `:create` target) while the structural bypass
stands.** Care contract carries no name directory **→ W-GAP-29 family**.

### B.15 Provider actions (external world) — the pipeline's execution leg
`BE/center/provider_action.ex` (+ job + worker), `BE/bookings/`
(`Service`, `Provider` behaviour; Duffel real key-gated; OpenTable
search now disabled in both key states — D-15; book/cancel always
refuse; MockProvider test-only); tables `provider_action_jobs`,
`provider_connections`, `provider_economic_events`, `bookings`,
`reservation_executions`, `external_handoffs`. Honesty verdict PASS
(BACKEND_AUDIT §6). Bookings routes have **no web client caller**
(GAP-45) → construct with a back end and no spoke **→ part of W-GAP-21.**

### B.16 opal_ai service (Python) — the cleanest scoped-package consumer
`AI/` **21 `.py` files in `services/opal_ai` (20 in `opal_ai/`) —
D-03 correction of P1's "23 files"**; `contracts.py` schema
validation + **23 executable capabilities (validator enumeration —
D-03)**, bounded inputs 5 items / 2,000 chars; `worker.py`, `main.py`
(FastAPI, no DB, no egress). Elixir job (consent pre-checked) →
envelope → proposal → **Elixir revalidation** (`MemoryAdmission.
from_python_proposal` is the memory leg) → state. This round trip is
the one place the SCB→agent→vet→store loop already closes.
`memory_extract` proposals are *candidate capsules in transit*.
Defects: `decision_intelligence_high_eval` dead on both sides of the
wire; `question_economy.py` orphan; Dockerfile debug ON (GAP-18 /
BS-11).

### B.17 Other subsystems inventoried (union of P1 §B.17 + P2 B10/B14/B15/B16/B17)
| Subsystem | Construct it serves / must become | Validated note |
|---|---|---|
| Trips (`BE/trips/`, 3,087 lines) | Multi-day shared capsules; P2: a temporary *domain* in embryo (own participants, time blocks, convoy, curator) | Real; UNPROVEN this cycle; trip legs DO pass the gate (`trips.ex:408-412` — the pattern V-01 lacks); Mexico City seed route: controller gated post-F-12 but mounts hardcode the seed id (HB-09, cover unreachable) |
| Lives (`BE/lives/`, 14 modules) | Time-boxed shared presence capsules; venue presence = ephemeral scoped session (P2) | Real; presence-claim flow + NFC honestly absent |
| Calls (`BE/calls.ex` + `calls/`, 12 modules) | Scoped session with dual-party consent (Assist) — best scoped-session analogue (A11) | Real signalling (WebRTC + Twilio NTS TURN + Deepgram grants); **no PSTN/Twilio Voice dial-out**; `call_outcomes` (594-line lineage) feeds §D; transcript disposition in §D-ING |
| Voice (`BE/voice/`) | Capsule payloads (audio) + TTS | Speak real + gated, mandatory text approval; listen disabled by design; storage local-disk only |
| Artifacts (`BE/artifacts.ex`) | Scoped *publication* of a plan capsule (30-day token expiry, hash-canonicalized) | Real; Public Relay mode's nearest ancestor (A15) |
| Group/family plans (`group_shared_plans, family_plans` + revisions) | Shared capsules for many-party domains | **Off-gyroscope** (GYRO-05) |
| Availability + native calendar | Time-scope dimension as data; native calendar = domain-local memory of commitments | PRESENT-AND-REAL (ASK-43/44); free/busy flow is the best minimization in the product (§A17); Google leg founder-gated |
| DSI (`BE/social_flow/dynamic_intelligence/`) | Scoped learning from social outcomes; `dsi_scoped_learnings` = closest table to a feedback-capsule store (P2) | Real silo; scope is a row attribute, not a policy graph |
| DecisionIntelligence (`BE/decision_intelligence/`) | Embryonic decision trace (per-decision, not per-domain) | §A13 |
| RealWorld connectors (`BE/social_flow/real_world/`) | Privacy pipeline's working half (A17) | Minimization + encrypted credentials + explicit connection consent; HA-01 simulate-route defect in §BS |
| GroupTastes (`BE/group_tastes.ex`) | Pseudo-cohort | Aggregate-only, min 3 plans (SR-14), opt-out honored; group key = truncated SHA-256 of member ids — **not anonymous (D-11)** |
| Search (`BE/search.ex`, Brave) | External retrieval under minimization | Working; Serper config dead (GAP-70); legacy Search *surface* is fixture-driven (HB-01, §BS) — subsystem ≠ surface |
| Push (`BE/push/`: Expo real, APNs/FCM partial) | Delivery spoke | APNs honestly unavailable post-BS-6; **FCM endpoint dead = F-03, still present at validation tip** → GYRO-09 |
| Email (`BE/email.ex`, Gmail read-only) | Third-party read under OAuth scope | Inbound only; no outbound mailer (GAP-59) |
| Wallets (money) | **Not** the memory wallet (A1) | Ledger real; loads law-gated OFF |
| Trust tiers / Taste / FinancialProfiles | Preference capsules | Real |
| World facts / Oracle | Domain-local reference memory | Template-only; ASK-20 relationship QA ABSENT |
| Safety (`safety_*`, trust_safety) | DBGI safety/override module fragment | Real reports/blocks; no memory interaction |

---

## C. AGGREGATION FLOWS — traced end to end, per data class (VALIDATED)

**Pass 1 ✓ / Pass 2 ✓ / Validator ✓.** P1 traced 7 classes in flow
diagrams (messages, plan state, preferences, person facts, locations,
media, corrections); P2 traced 10 in a table (adding availability,
provider/economic events, relationship facts, social moments). The
union is 10 classes; both passes' "today" descriptions agree on
every shared class. The summary below carries the validated "today"
and the scoped-assembly form per class.

| Data class | Aggregates TODAY (validated) | Under scoped assembly it would… |
|---|---|---|
| Messages (peer + Center) | Message → fold proposes plan state → (gate) → SharedPlan; message → extraction → MemoryCandidate → promotion → RelationshipMemory / PersonMemory.known_facts; sticky Center context carries stale who/what (GYRO-04) | Every extraction a candidate capsule with provenance {message ids} admitted only via MemoryAdmission; Center context assembled per-turn by the SCB — no sticky spoke-side context |
| Plan state | Single lineage for SharedPlan family ONLY; group/family on a parallel track (GYRO-05); Households writers bypass birth gate (V-01) | One gate for ALL plan families + writers; every read a named projection; revision = new capsule version with lineage |
| Availability | **Best flow in the product:** busy intervals only (no titles, ≤1h cache) → merge (busy-on-any ⇒ busy) → planning consumers | Already a true scoped package (time scope only); patent form adds purpose binding + delivery logging |
| Preferences | THREE truths coexist: durable DB facts, decayed outcome-learned prefs (180d half-life), browser-local fit slice gated by a share flag (GYRO-10) | Preferences as capsules under MemoryKind authority (explicit > repeated > inferred); fit slice becomes a delivered package, not a local store; group taste = group-scoped capsule, never averaged into an individual trait (ASK-18 law) |
| Person facts | Fragment across four stores with four read disciplines; group contexts strip depth (`access.ex:221`); durable recall owner-wide with no counterpart filter | Relationship-scoped capsules; group packages receive ONLY the `shared_safe_summary` composition (hints without disclosure) |
| Locations | Cleanest flow (ASK-40/41 REAL): coarsen → 24h-stale store → origin threaded through jobs; raw precise location never becomes long-term memory by default | Unchanged in shape; location becomes a capsule *class* with time-scope = session, so travel sharing and memory obey one policy language |
| Media | Persistence real, production home absent; moment never becomes a memory capsule, memory never references its moment | Moments as payload-bearing capsules; audience = the capsule's scope ceiling; shared history derivable by the SCB under owner scope |
| Corrections | Durable leg real for preference facts (supersede); ledger leg process-memory (dies on restart, GYRO-03); naming corrections ("call her Mom") have NO store (Soul does not exist) | A correction = feedback capsule (kind=explicit_correction) superseding by authority rank, ledgered; every consumer's next package reflects it because no consumer caches its own copy |
| Provider/economic events | Bookings/Stripe webhooks → `provider_economic_events`, `bookings`, money `wallet_transactions`; read by Oracle spend answers, PlanExecution | Provider-outcome memory (MemoryKind `provider_execution_outcome` exists in the in-process store only) with provenance "from External API X" (A17 gap) |
| Social moments/engagement | Likes/comments/saves/hides → Home feed projection, discovery ranking directly | Engagement as feedback-capsule raw material with a user-visible learning record; today it feeds ranking with none |

### C.3 Shadow truths and re-derivations (merged inventory, both passes)
1. Two conversation systems (`conversations` vs `opal_conversations`) — P2 G-02.
2. Three+ context assemblers with different inclusion rules — D-10 / P2 G-06.
3. In-process adaptive memory (`memory_store.ex`, `correction_ledger.ex` — BEAM Agents) parallel to durable tables — GYRO-03.
4. ETS recall cache (`social_memory/cache.ex`, 60s TTL) — **sanctioned** derived projection with wired invalidation (the correct pattern).
5. Web local stores: fit preferences in `localStorage` (share-gated slice read by Center), appearance in `localStorage` — GYRO-10 / P2 G-05.
6. Fixture projections: founder seed rows rendered through real projections — GYRO-08 residual + §BS HB-07.
7. Per-surface re-derivation outside plans (P2 G-11): Oracle's direct queries; web filament regex / adapter grouping (P1 GYRO-07; current glass state in §BS HB-12).

**C.8 (P1, retained verbatim in substance):** under scoped assembly
there is exactly **one aggregation verb**: *the SCB intersects
{relevant} ∩ {allowed by scope} ∩ {not expired, not revoked} and
emits one package per consumer per task.* Every flow above already
contains a fragment of that verb (PromptBuilder's raise, Compose's
shared-safe summary, Admission's durable? test, Kind's authority
rank, Location's coarsening). The wallet build is the *composition*
of those fragments into one path — and the deletion of every read
path that bypasses it (GYRO-01's closing condition).

---

## D. SELF-IMPROVEMENT MAP — every feedback / correction / preference signal (VALIDATED, merged)

**Pass 1 ✓ / Pass 2 ✓ / Validator ✓** (unit discrepancy resolved at
D-12: P1 counted signals incl. absent ones; P2 counted existing
stores). Merged inventory: **14 existing stores + 3 named
non-stores**. No path runs into a common feedback-capsule layer —
none exists (both passes agree; this is W-GAP-18).

| # | Signal | Store today | Becomes learning today? |
|---|---|---|---|
| D1 | Accept/dismiss/ignore/counter-propose | `intelligence_feedback` via `feedback_loop.ex` (`record/1` :19) | Yes — vibe confidence; dismiss-rate in `intelligence/metrics.ex` (warn ≥60%) |
| D2 | Plan outcomes (went / didn't / changed) | `outcome_signals` via `social_memory/outcome_signal.ex` | Yes — OutcomeLearning 180d half-life → learned preferences → PromptBuilder |
| D3 | Explicit fact correction | DurablePreferenceMemory.supersede; RelationshipMemory.correction_state | Yes for durable prefs; no propagation record |
| D4 | Preference correction in alignment (wrong_preference, scope_correction, venue_failure, destination_change, time_change) | `execution/correction_ledger.ex` (`record/1` :73, `propagate/2` :100-157) — **in-memory only** | Within the process only; **lost on restart** (GYRO-03) |
| D5 | Memory contradictions | MemoryCandidate.contradiction_group_id; SocialMemory.detect_conflicts | Partially — hygiene revalidation prompt asks the user |
| D6 | Ask-ledger answers + skips | `profile_gap_asks`; skip permanent | Yes — the fact; skip = a *negative* capsule already honoured (the model for all opt-out capsules) |
| D7 | Proactivity opt-out / dismissal | `users.proactive_opt_out`; ProactiveThreadLog; SurfacedNudge status | Yes — hard gate, recorded suppression reasons |
| D8 | Mediation dismissal (group) | `group_decision_states.mediation_dismissed_until` (7d) | Yes — time-boxed suppression |
| D9 | Relationship inference confirm/correct/dismiss | `relationships/inference.ex` (schema + functions) | **No — write side unreachable in production (1 caller); the missing glass is the entire gap** |
| D10 | Call outcomes / assist feedback | `call_outcomes` (594-line lineage; explicitly "execution lineage only… does not become SharedPlan authority" — P2), `assistance_feedback_events` | Partially — lineage exists; no path into memory admission |
| D11 | Fit / spending choices | Fit slice (browser localStorage); FinancialProfiles | Partially — fit toggle's own recommend-feedback store unbuilt (§S.4) (GYRO-10) |
| D12 | Check-in / care responses | `checkin_responses`, `care_check_ins` | **No — by ruling** (welfare answers never admitted). The wallet's admission policy must carry this exclusion by kind |
| D13 | Thumbs / explicit rating of Center answers | — | **ABSENT: no thumbs control exists anywhere** (P1 grep) — named non-store |
| D14 | Implicit sentiment (voice tone, facial) | — (person-level `sentiment_trend` column exists, updated opaquely by hygiene/recall workers — P2 row 14) | ABSENT as a feedback-capsule input (patent's implicit leg) — named non-store; not required for Opal's domain, a decision not a skip |
| D15 | Memory hygiene revalidation answers | MemoryHygiene flow (PromptBuilder-injected) | Yes — stale facts revalidated or aged |
| D16 (P2 rows 2/3/8/9) | Assistance feedback events; insight feedback events; availability corrections; experience reflections/completions | `assistance_feedback_events`; `insight_feedback_events`; `availability_correction.ex`; `dsi_reflections`, `dsi_experience_completions`, `experience_follow_ups` | Each inside its own silo only (assistance prefs / insight ranking / availability composition / DSI candidates) |
| D17 (P2 row 13) | Shadow evaluations | `shadow_evaluations` | No — by design offline |

**Net (both passes, same verdict):** Opal already *collects* most of
the feedback the patent names, in unconnected stores, two of them
volatile. The loop closes today only for D1/D2/D6. The
feedback-capsule layer is mostly **unification + persistence +
scoping**, not new signals — with three genuine gaps: D9's glass,
D13, and any user-visible feedback history. The only distillation
rhymes are `temporal_habit_miner.ex` → habits and GroupTastes →
group rows (P2; contrast Otzar's "Distill" loop step).

---

## D-ING. INGESTION — conversation sources (Pass 2-originated, validated)

**Pass 1 — (under-mapped; credited §A22/B.15 fragments) / Pass 2 ✓ /
Validator ✓.** Adopted from P2 §D per D-13, checked against the SM
design §7 truth table (which agrees on every row).

| Source | Transport | Truth status today (validated) | Capsule destination (patent form) / actual today |
|---|---|---|---|
| In-app chats (1:1 + group) | Phoenix channels/REST → `conversations`/`messages`; Center → `opal_conversations`/`opal_messages` | **REAL.** Message → Inbox fanout → EventIngestor → Extractor/Reasoner/Executor → proposals/plans; Python extracts behind contracts | Should be: ephemeral session → admitted capsules. Actual: messages + extracted rows in ~10 tables |
| Phone calls (in-app voice/video) | WebRTC; Twilio **NTS** only for TURN (`calls/twilio_nts.ex`, `turn_credentials.ex`); Deepgram grants | **REAL (in-app calls).** This is **not** Twilio Voice PSTN — no PSTN dial-in/out exists; outbound act-on-behalf calls are a separate consent-gated path | Call session (ephemeral) → final transcript segments (deleted with call) → alignment outcomes/proposals |
| Call transcription | Deepgram live + batch (`intelligence/deepgram_client.ex`, `live_transcription*.ex`, `audio_ingestor.ex`) | **REAL but configuration-gated, honestly:** unconfigured → `{:disabled, "transcription not configured"}`, persists nothing; no stub transcripts accepted (BS-4 note in moduledoc). **Live call transcription as a wired product path remains the F-16 open item** (ledger) | Transcript = ephemeral evidence; only outcomes persist |
| SMS via Twilio Messaging | Outbound only (`sms/twilio_sms_adapter.ex` invites; Twilio Verify for OTP); webhook validates Verify status callbacks only | **PARTIAL — outbound invites + OTP real-when-configured; inbound SMS ingestion ABSENT.** Readiness honestly reports disabled reasons; invites fall back to link-sharing with an honest note. Blocked on founder step: Twilio creds + From number / Messaging Service SID | Should be: inbound SMS → conversation → capsules. Actual: invitation delivery only; nothing said over SMS becomes memory |
| In-room capture | Lives rooms are broadcast/presence surfaces; `audio_ingestor.ex` covers voice notes, not room capture | **ABSENT as capture.** No ambient/in-room recording → transcription → memory path. SM design constraints stand for the build: user-initiated only, visibly active, consent lineage on resulting capsules or no capsule | Nothing |
| Zoom / meetings | Meeting *links* only (`meeting_links.ex` provider label from URL) | **ABSENT as ingestion; link-handling REAL.** No Zoom API, no recording/transcript import. Roadmap per design §7 | A plan may *point at* a Zoom room; nothing inside it returns |

**Conversation → proposed alignment (P2's 7-step trace, validated):**
message persisted → `Intelligence.EventIngestor` writes
`intelligence_events` (persist-first) → Extractor and/or Python
capabilities via `ai_jobs` (contract-validated) +
`ConversationAlignment.fold/4` → Proposal / plan options
(consequential bodies flagged; TTL on change proposals) →
PlanTransition gate on plan birth; consent gates consequential
execution → proposal renders via PlanProjection readers;
accept/dismiss/counter-propose = §D D1 → memory write-back exists
(candidates → shared_memories pending_consent; person-memory
updates) **as direct table writes, not capsule proposals with policy
attached (A2/A14 gaps).**

---

## S. SETTINGS — the sovereignty/control surface, inventoried whole (VALIDATED)

**Pass 1 ✓ / Pass 2 ✓ / Validator ✓** (row-count discrepancy
resolved at D-02/SR-7: **21 rows — 20 GREEN, 1 HIDDEN, 0 HONEST_GATE
rendered**; P1's per-row table adopted for grain, P2's §E construct
mapping adopted where it adds the backend-truth column).

### S.1 Surfaces
| Surface | File | Status |
|---|---|---|
| Legacy YOU / settings destination | `FE/opalUi/YouSettingsDestination.tsx` (3,330 lines; 12 destinations per P2: edit-profile, privacy, feed-discovery, location-travel, calls-assist, notifications, linked-devices, spending, fit, appearance, account-security, delete-account) | Reachable on the R17 face; rows classified by `settingsWireClass.ts` |
| Settings wire classification | `FE/opalUi/settingsWireClass.ts` (**21 rows: 20 GREEN, 1 HIDDEN**) | The R13 audit artefact; re-audit duty stated in its header |
| C2 YOU hub | `FE/c2/shell/C2You.tsx` (360 lines) | Renders **only** GREEN rows (`shellData.ts:15`); non-GREEN rows removed, not faked (sweep row 101) |
| C2 settings sections | `FE/c2/shell/shellData.ts` `buildSettingsSection/2` (:370) | Load failure = one honest error line, never stale toggles |
| Onboarding permission bootstrap | `FE/onboarding/PermissionBootstrapPage.tsx`, `TrustContractCard.tsx` | First-run consent surface; moment-of-need deferral per the 60-second law |
| Per-item scope controls outside settings | `MomentAudienceSelector.tsx`, `LocationPermissionSheet.tsx`, plan roster/approvals | Real controls at their moment — the wallet should keep this pattern |

### S.3 Every classified control → its wallet construct (validated; wire per the classification)
| # | Control (screen) | Class | Wallet construct / validated note |
|---|---|---|---|
| 1 | Save profile (edit-profile) | GREEN | Wallet identity record (A30's Web2 form; custodial — P2 gap note adopted) |
| 2 | Save home timezone (location-travel) | GREEN | Time-scope context for scoped sessions (A11) |
| 3 | Travel mode (location-travel) | GREEN | Read projection of home-tz active — expressly "not a fake toggle"; the model for honest mode display (both passes single it out) |
| 4 | Opal Assist on calls (calls-assist) | GREEN | Scoped-session consent for the call domain (A11/A10) |
| 5 | Messages & calls notifications | GREEN | Notification policy under QUIET (A15 mode fragment) |
| 6 | Read receipts | GREEN | Disclosure policy: *use ≠ disclose* at glass |
| 7 | This phone (linked-devices) | GREEN | Scoped-session roster, read leg (A11) |
| 8 | Linked devices (account-security) | GREEN | Session management (revoke leg missing on this row family — S.4) |
| 9 | Delete account (account-security) | GREEN* | Nav opens delete screen; **self-serve delete CTA hidden until API ships** — wallet destruction honestly absent at the last step (both passes) |
| 10 | Keep my account | GREEN | Honesty control (local dismiss, no fake delete) |
| 11 | Appearance (appearance) | GREEN | Presentation only — correctly *not* a wallet construct (localStorage → data-theme) |
| 12 | Nearby range (feed-discovery) | **HIDDEN** | "Discovery-distance preference API not shipped" — control correctly hidden; API is the gap → W-GAP-35 |
| 13 | Place calls / Make reservations (calls-assist) | GREEN | **Consent lineage at glass (A10)** — grant/revoke → Consent.grant/revoke → require_for_action gate. Covers 2 executable capabilities; `messaging_business` grantable in the registry with `:absent` execution (W-GAP-14) |
| 14 | Pause Graphing + call modes (calls-assist) | GREEN | Scope-policy control over relationship graphing (A2 scope group) — nearest thing to a scope-graph editor (P2) |
| 15 | Spending comfort save/remove (spending) | GREEN | Preference capsule with a trust gate (FinancialProfiles trusted+ → GroupTastes + curation budget note) |
| 16 | Fit preferences + share gate (fit) | GREEN* | Wire real but **store is the browser** (per-user localStorage → Center :fit slice, null when share off) — a genuine scope control trapped in a spoke-local store (GYRO-10) |
| 17 | What Opal remembers: forget / relationship types / trust (privacy) | GREEN | **The wallet's core user controls in embryo**: forget (A2 ops), per-person type, trust grant/revoke — fact-level only; no per-object policy, no audit view (P2) |
| 18 | Celebrations add/remove + curation (privacy) | GREEN | Date-capsule management (§B.12) — ordinary rows, no capsule provenance (P2) |
| 19 | Invite friends (feed-discovery) | GREEN | Wallet-to-wallet introduction (A18's in-product ancestor); rate-limited, honest SMS note |
| 20 | Google connection status/connect/disconnect (privacy) | GREEN | Third-party pipeline control (A17): shows connection, never payload. **Caveat added post-pass: HA-01 — a simulated connection reads back identically (§BS)** |
| 21 | Appearance theme picker | GREEN | Duplicate wire of row 11 (P1's note retained) |

**P2 §E additions adopted:** proactive-threads opt-in + opt-out
(two overlapping booleans — one lineage record would replace both);
group-taste opt-out (cohort contribution opt-out in embryo, §A18);
location rows sound as preferences with **no retention-policy
control** (wallet-required, absent); feed/discovery rows change
something real but unverifiable by the user (transparency gap, not
fake controls); privacy-screen toggles are per-surface fragments
with per-Graph visibility the strongest (policy per object —
capsule-like).

**Settings verdict (validated):** of 21 classified rows, 20 GREEN +
1 correctly HIDDEN; **zero classified fake toggles ship on the C2
hub** (GREEN-only rendering). On P2's fake-control audit the
validator concurs: **none currently rendered changes nothing** —
the negative finding is evidenced (wire classification), not
assumed. The FALSE risk lives in the legacy SCREENS data (S.4) and
in two GREEN rows whose *store* is wrong for a wallet (rows 9, 16),
plus the HA-01 provenance erasure behind row 20.

### S.4 Blocked / unwired control families (legacy SCREENS data)
**43 `blockedReason` entries (SR-15 HIT)** in
`YouSettingsDestination.tsx`, grouped (P1): privacy/scope (per-Graph
visibility, exact-location-after-join, public engagement counts,
join requests, blocked & muted lists); discovery (people-you-know-
first, local discovery, nearby range = row 12, suggested people,
suggested experiences); location/travel (use-location-for-timing,
share live location — the A11 session's glass, home area, map
handoff); calls/assist (ask-on-every-call, post-call Graph
suggestions, remember-call-signals, call privacy/retention);
notifications (four push-category rows blocked on Expo/APNs +
preference APIs — and the FCM rail behind them is F-03);
devices/security (desktop QR session, session revoke, phone number
change, two-step security, sign-in activity, bio field); learning
("Learn from my choices" — blocked: "needs recommend feedback
store", §D D11; spending sub-toggles).
Classification: **HONESTLY ABSENT as controls** (rows removed on C2)
— *provided* no legacy path renders them as live toggles; the
legacy-face render audit of all 43 is still owed (**→ W-GAP-36**,
contested C-7). Collective proof: **the app has designed more scope
controls than the back end has policy objects for** — S.5 is the
build consequence.

### S.5 Wallet settings the architecture REQUIRES that do not exist (merged P1 §S.5 + P2 §E.1 — the two lists agree almost item-for-item; independent convergence is itself validation evidence)
| Required control | Construct | Nearest fragment |
|---|---|---|
| Wallet operational-mode selector with per-capsule override | A15 | Graphing modes + proactive flags, fragmented |
| Soul editor (tone, naming, proactivity style, quiet hours, custom notes) | SM §2; A11/A15 | AssistancePreference backend (quiet window + maturity) — **no Soul surface, no quiet-hours editor row** |
| Memory browser by group with per-item view/edit/forget + provenance ("learned when, from what") | A2, SM §3 | Row 17's flat forget list only |
| Per-person memory controls (view + pause learning about this person) | Scope: relationships | Type + trust only |
| Per-circle memory controls | A16/§B.13 | SharedMemory has no surface at all (W-GAP-20) |
| Consent lineage viewer (grants, evidence, expiry, revocation history) | A10 | Grant/revoke toggles (row 13) without history |
| Activity/audit trail viewer ("what Opal did and why", with `because:`) | A9, SM §3 | — none — (ActionLog has no glass) |
| Approvals queue (counts read from the real queues) | A12/A16 | Items answerable in-place in thread; no queue |
| Emergency-access contacts + override policy + post-access review inbox | Scope: emergency | Guardian reviews (family domain) only |
| Cohort/DPS participation controls + contribution history + value attribution | A18 | One opt-out boolean only (correctly minimal until A18 is lawful) |
| Wallet export / portability | A1 sovereignty | — none — (the `opal.export_outbox` mix task exports the *event outbox*, an ops tool — P2, adopted) |
| Scoped-session roster with revoke (devices + active shares + travel shares) | A11 | Row 7 read-only projection; revoke HIDDEN (S.4) |
| Capsule time controls (review dates, expiry, "forget after") | Scope: time | `review_at` exists in data; no control |
| Purpose controls ("use this only for planning") | Scope: purpose | — none — |
| Retention controls per data class | Scope: transformation | Calls hard-code theirs; chats/media/memory have none (P2) |

---

## F. GAP REGISTER — the wallet track's build-plan input (VALIDATED, merged)

**Pass 1 ✓ / Pass 2 ✓ / Validator ✓.** Severity: **BLOCKER** = wallet
cannot be truthful without it · **HIGH** = works but leaks/misstates
· **MED** = construct incomplete · **LOW** = named decision/deferral.
**Status at validation tip** is the validator's addition: OPEN /
CONVERTED (with evidence) / PARTIAL-CONVERTED. Pass 1 numbering is
canonical; Pass 2 G-ids crosswalked in §F.4. Hunt/validator additions
are marked (HA/HB/V).

### F.1 Gyroscope defects
| ID | Defect | Severity | Status at validation tip |
|---|---|---|---|
| GYRO-01 | No single mediated read path for memory: modules read stores directly; facade recall checks owner+visibility only, never scope/purpose/expiry (`memory.ex:62-89`) [= P2 G-07] | BLOCKER | OPEN |
| GYRO-02 | Audit reference cannot detect tampering: audit/action rows unsigned, unlinked, insert-shaped only (D-07) [= P2 G-12 + G-13 coverage] | BLOCKER | OPEN |
| GYRO-03 | Second, volatile truth: in-memory MemoryStore/Metrics/CorrectionLedger beside DB stores; corrections die on restart [= P2 G-03] | HIGH | OPEN |
| GYRO-04 | Center spoke holds sticky truth: stale who/what carried into answers + confirmations (RF-2/3/4 family) | HIGH | PARTIAL-CONVERTED — RF fixes landed on the integrated tip (ledger, merge `34519b59`); integrated confirmation PENDING-RUN; closes only when the per-turn SCB package replaces sticky context |
| GYRO-05 | Group/family plan family spins on its own axis: outside PlanTransition + PlanProjection [= P2 axis framing; BS-9] **+ V-01: Households SharedPlan writers bypass the gate at birth (D-16)** | HIGH | OPEN (extended by V-01) |
| GYRO-06 | Scope matching has allow-all legs: zone, user, **and the unrecognized-scope fall-through** all match any context (D-17/V-02); durable recall ignores relationship scope | HIGH | OPEN (extended) |
| GYRO-07 | Web re-derives state: thread filament regex on label text; adapter grouping substituting for the missing D5 projection; fixture pills (legacy) | HIGH | OPEN — current glass instances enumerated in §BS (HB-01…HB-13 family); the *pattern* remains the defect |
| GYRO-08 | ~~Founder seed resurrects terminal plans~~ **CONVERTED (D-04)** — restores now pass the logged `:seed_restore` gate exception. Residual: seed content has no "never admit as memory" gate / no synthetic provenance class [= P2 G-04] | HIGH → MED (residual) | PARTIAL-CONVERTED |
| GYRO-09 | Push spoke: FCM adapter posts to a dead endpoint (F-03) while settings promise categories | MED | OPEN — FCM still present at validation tip (D-15) |
| GYRO-10 | A preference truth lives in the browser: fit slice in localStorage, read into Center context [= P2 G-05] | MED | OPEN |
| GYRO-11 | Split lineage residue: two change systems + two calendar systems + two messaging systems (P2 G-02 dual conversations folds in here and in §C.3) | MED | OPEN |
| GYRO-12 | Fixture defaults inside the pure library speak as defaults: silent 20/30-minute travel/leave-by fallbacks feed composed context (F-11 family) | MED | PARTIAL-CONVERTED — F-11 register sites now label via `TravelEstimate` ("measured" vs "assumed_default"); the DeviceMoment boundary defeats the label (HA-06, contested C-2); ProviderVertical sites unlabelled (HA-10, C-2) |

### F.2 Construct gaps (from §A–§B; P2 crosswalk in §F.4)
| ID | Construct | State | Severity | Status |
|---|---|---|---|---|
| W-GAP-01 | Wallet entity (A1) | ABSENT | BLOCKER | OPEN |
| W-GAP-02 | Capsule as one object (A2) | PARTIAL (3 fragments) | BLOCKER | OPEN |
| W-GAP-03 | User-visible capsule provenance | PARTIAL | HIGH | OPEN |
| W-GAP-04 | Encryption at rest for memory (A2 payload) | ABSENT | HIGH | OPEN |
| W-GAP-05 | Scope policy graph (A2/8 dims) | PARTIAL (flat scopes) | BLOCKER | OPEN |
| W-GAP-06 | Time + purpose enforcement | PARTIAL (recorded, unenforced) [= P2 G-08] | HIGH | OPEN |
| W-GAP-07 | Consent condition on ordinary memories | PARTIAL | MED | OPEN |
| W-GAP-08 | Emergency override + jurisdiction | ABSENT | LOW (override MED for family) | OPEN |
| W-GAP-09 | One SCB + one package type (A8) [= P2 G-06] | PARTIAL (3+ builders) | BLOCKER | OPEN |
| W-GAP-10 | Decision-trace record (A13) [= P2 G-15] | ABSENT as a record | HIGH | OPEN |
| W-GAP-11 | Agent negotiation (A12) | ABSENT | LOW | OPEN (recorded decision likely: decline for Opal's domain) |
| W-GAP-12 | Approvals queue / Opal's Home (A12) | ABSENT surface | HIGH | OPEN |
| W-GAP-13 | Per-capsule audit chain (A2/A9) | ABSENT | HIGH | OPEN |
| W-GAP-14 | Grant offered for non-executable capability (`messaging_business`) | CONFLICTING-ish | MED | OPEN — founder product decision (sweep's one named product decision) |
| W-GAP-15 | Consent lineage chain + viewer (A10) [= P2 G-14] | PARTIAL | MED | OPEN |
| W-GAP-16 | Scoped-session object (A11) [= P2 G-18 half] | PARTIAL (scattered) | HIGH | OPEN |
| W-GAP-17 | DBGI as policy stack data (A13) [= P2 G-18 half] | PARTIAL (boundary only) | MED | OPEN |
| W-GAP-18 | Feedback capsules (A14, §D) | PARTIAL | HIGH | OPEN |
| W-GAP-19 | Operational modes (A15) [= P2 G-16] | ABSENT as object | HIGH | OPEN |
| W-GAP-20 | SharedMemory has no surface (A16) | Back end IMPLEMENTED, glass ABSENT | HIGH | OPEN |
| W-GAP-21 | Third-party pipeline as a pipeline (A17) [= P2 G-10] | PARTIAL | MED | OPEN |
| W-GAP-22 | Federation (A18) [= P2 G-19 half] | ABSENT | LOW | OPEN (deferred by topology) |
| W-GAP-23 | Capsule ops: merge, delegate, soft-revoke/pause for personal memories | PARTIAL | MED | OPEN |
| W-GAP-24 | DID / signed tokens (A.30) [= P2 G-20] | ABSENT | LOW | OPEN (Web2 form accepted) |
| W-GAP-25 | Cohort/DPS (A18) [= P2 G-19 half] | ABSENT, law-gated | LOW | OPEN (stays absent until A10+A17 make an opt-in cohort lawful) |
| W-GAP-26 | Immutable social proof (A.35) | ABSENT | LOW | OPEN |
| W-GAP-27 | Emma constructs (A.36) | ABSENT bundle | LOW | OPEN (product-story only; no build implied) |
| W-GAP-28 | Plan cancel control + route (§B.1) | — | HIGH | **CONVERTED at validation tip (D-05)** — POST route + C2 droppable derivation + read-back; rendered walk proof still owed |
| W-GAP-29 | Missing projections: thread plan linkage, dock-unread, D5 grouped list, care name directory | ABSENT contracts | MED | OPEN |
| W-GAP-30 | Center execution read 500 for conversation-less plans (RF-1) | FALSE/broken at sweep tip | HIGH | PARTIAL-CONVERTED — RF-1 fixed on integrated tip per ledger (merge `34519b59`); integrated confirmation PENDING-RUN |
| W-GAP-31 | Soul + Memory card surfaces; naming-correction store | ABSENT | BLOCKER (it is the track) | OPEN |
| W-GAP-32 | Two-account isolation proof suite (SM-ISO-01…04, SM-TRU-01…03) | ABSENT | BLOCKER | OPEN |
| W-GAP-33 | ProfileGap breadth: one fact (§B.6) | PARTIAL | MED | OPEN |
| W-GAP-34 | Social Score in the Social Flow text vs the no-people-scoring law (A.37) | CONFLICTING (doc) | MED | OPEN (doc-side quarantine from build inputs; code compliant) |
| W-GAP-35 | Discovery-distance preference API (§S.3 row 12) | ABSENT back end | LOW | OPEN (control stays HIDDEN until it exists) |
| W-GAP-36 | Legacy-face render audit of the 43 blocked settings rows (§S.4) | UNPROVEN | MED | OPEN — contested C-7 |

### F.3 Validator-added defects (from the hunts, folded — full treatment in §BS)
V-01 Households gate bypass (= GYRO-05 extension, D-16) · V-02
scope allow-all fall-through (= GYRO-06 extension, D-17) ·
HA-01…HA-11 and HB-01…HB-23 are registered in §BS with their
cover / honest gate / named residual each; the ones that are wallet
constructs (not just surfaces) cross-reference here: HA-04 (axis
bypass — a second schedule writer; joins GYRO-05's family as a
*write-path* instance), HA-07 (silent failure in the executor —
§M MP-9), HB-15/HB-16 (lockdown glass breaks — §L).

### F.4 Pass 2 → validated crosswalk (no G-id dropped)
G-01 → W-GAP-01/02 (no capsule axis) · G-02 → §C.3.1 + GYRO-11 ·
G-03 → GYRO-03 · G-04 → GYRO-08 residual · G-05 → GYRO-10 ·
G-06 → W-GAP-09 · G-07 → GYRO-01 · G-08 → W-GAP-06 · G-09 → §B.11
(push previews) · G-10 → W-GAP-21 · G-11 → §B.3 (Oracle spoke) ·
G-12 → GYRO-02 · G-13 → GYRO-02 (coverage half) · G-14 → W-GAP-15 ·
G-15 → W-GAP-10 · G-16 → W-GAP-19 (+ emergency half → W-GAP-08) ·
G-17 → W-GAP-08 · G-18 → W-GAP-16/17 · G-19 → W-GAP-22/25 ·
G-20 → W-GAP-04/24 · G-21 → §D-ING (inbound SMS / in-room / Zoom) ·
G-22 → §S.5 (missing viewers/selector/export) · G-23 → §A1 (name
collision) · G-24 → §A2 preamble (capsule-as-chip metaphor in docs) ·
G-25 → §A9 (commitment_ledger naming) · G-26 → §A13 (decision-trace
naming).

### F.5 Top of the register (validated ordering)
1. **GYRO-01 + W-GAP-05 + W-GAP-09** — one mediated, scope-checked read path. Everything else in the wallet is decoration until consumers stop reading stores directly.
2. **GYRO-02 + W-GAP-13** — the ledger must become tamper-evident; the parent patent's own contribution is exactly this.
3. **W-GAP-01/02/31/32** — the SM track's named build (wallet record, capsule form, Soul/Memory surfaces, isolation proofs).
4. **GYRO-05 (incl. V-01)** — group/family plans *and every SharedPlan writer* onto the axis; the gate's registry must be able to prove "every writer wired" (HA-04/HA-05 show it currently cannot).
5. **W-GAP-19/16** — modes + scoped sessions: the two patent objects that turn scattered flags into governable state.

---

## H. HUMAN-FORM LAYER (validator layer — commissioned after both passes)

**Pass 1 — / Pass 2 — / Validator ✓.** Starting claim set: SM design
§8 table (9 constructs). Each claim verified against real surfaces
at the validation tip. **Law: a construct with no human form in the
shipped product is a named gap; no construct ever surfaces in machine
vocabulary (L12).**

| # | Patent construct | Design §8 claimed human form | Verified surface today | Verdict |
|---|---|---|---|---|
| H-1 | Memory capsules | "What Opal remembers about your people" — readable, correctable, forgettable | Privacy/C2 You row 17: a flat fact list with forget — facts, not capsules; no grouping by person/place/rhythm, no correct/edit, no provenance line. PersonMemoryView (legacy) renders per-person facts but paints machine error strings verbatim (HB-19) | **PARTIAL human form** — the forget leg exists; read/correct/provenance legs are W-GAP-03/31. Named gap: **HF-GAP-1 (no capsule-shaped human form)** |
| H-2 | Scope policy graph | Plain-language permissions the user controls | Graphing pause + call modes (row 14) and per-moment audience selector are real plain-language policy controls — for graphing and moments, not for memory. No per-memory permission exists to give a human form to | **PARTIAL** — form exists for two neighbouring constructs; for memory itself: **HF-GAP-2 (= W-GAP-05's glass half)** |
| H-3 | SCB / Packages | Opal knowing the right thing at the right moment, able to say why ("because you told me…") | Knowing: real but uneven (RF family, GYRO-04). Saying why: `to_transparency_fact/1` exists in the durable-preference layer only; no `because:` line ships on any surface; Opal's Home (the designed home of the why) is unbuilt | **PARTIAL (knowing) / ABSENT (why)** — **HF-GAP-3 (= W-GAP-03/12)** |
| H-4 | Audit ledger | Activity trail in Opal's Home, in human words | — none —. ActionLog/AuditEvent have no glass on any surface (both passes agree) | **ABSENT — HF-GAP-4 (= W-GAP-12/13 glass half). The ledger has no human form at all today** |
| H-5 | Shared capsules + consent lineage | "We planned this together" — joint facts both parties can see, who agreed to what | Shared *plans* deliver this form genuinely (plan surfaces, revision holds). Shared *memories* (A16) have no surface and their consent has no glass (W-GAP-20); lineage (who agreed, when) is visible nowhere | **PARTIAL** — plan half HUMAN-FORMED; memory half **HF-GAP-5 (= W-GAP-20)** |
| H-6 | Feedback capsules | Opal visibly learning: "Got it — I'll remember it that way" | Correction acknowledgements exist in Center/thread flows; learning itself is invisible — no surface shows what changed because of a correction; D9's inference corrections die before glass (§D) | **PARTIAL** — the acknowledgement form exists; the *visible learning record* does not: **HF-GAP-6 (= W-GAP-18 glass half)** |
| H-7 | Operational modes | How proactive Opal is, in the user's words ("check with me first" / "handle the small things") | Proactivity is controlled by scattered toggles/booleans (§B.5, §S) in system-adjacent words; no mode object exists to humanize (A15) | **ABSENT as a form — HF-GAP-7 (= W-GAP-19)**. The fragments' words are plain; the *construct's* form is missing |
| H-8 | Domain binding (DBGI) | Felt as focus, never announced as architecture | Verified in the negative: no surface announces domains/architecture; the boundary is felt only when admission rejects work content — which happens silently inside the pipeline, not as a user experience | **CONFORMS BY ABSENCE** — no gap; the one place the boundary could leak into vocabulary (error copy) shows none in either pass's evidence |
| H-9 | Ingestion | "Opal listened, with permission" — consent visible | Call Assist consent copy is honest and visible (§D-ING; but see contested C-3 on whose voice). In-app chats need no separate form (they are the conversation). SMS/in-room/Zoom have no ingestion, hence no form to judge | **PARTIAL** — call leg formed with the C-3 caveat; **HF-GAP-8: no human form exists for reviewing what an ingested conversation became** (no per-conversation "what Opal took from this" view; = W-GAP-03 applied to ingestion) |

**Human-form tally: 9 constructs — 1 conforms by absence (H-8),
5 PARTIAL, 3 ABSENT-as-form (H-4, H-7, and H-3's why-leg). 8 named
HF gaps, all cross-referenced to the register (none is a new
construct gap; each is the glass half of an existing one — which is
precisely the §8 law's point: the invention exists in fragments and
the user meets almost none of it as a *someone*).** Machine-vocabulary
leaks found on live surfaces are copy defects, registered in §BS
(HB-17 raw `close_friend` slug, HB-18 raw ISO timestamp, HB-19 raw
error strings) — each is an L12 violation of this layer, not of §A.

---

## P. PERFORMANCE — where the costs live (validator layer)

**Pass 1 — / Pass 2 — / Validator ✓.** Per SM design §9: performance
is a gated dimension; budgets are fixed from the first measured
baseline on the served stack (recorded in WALK_ACCEPTANCE.md) and
treated as regression gates. **This map names where the architecture's
costs live; it asserts no timings (none were measured in any pass —
any number here would be fabrication).**

| Cost centre | Where it lives in code today | Scaling shape today | Patent reference answer | Wallet-build consequence |
|---|---|---|---|---|
| **Scoped-context assembly** | Per assembler, per turn: PromptBuilder section assembly (group decision, learned preferences via OutcomeLearning, environment, maturity, travel) + OpalContext packet + PlanningContext. Every Center turn pays full assembly; there is no package cache keyed by (account, scope, capsule-version) | Assembly cost grows with memory size per account; the ETS recall cache (60s, §C.3.4) is the only reuse, and it caches recall, not packages | SCB assembles the intersection once per task; minimization bounds package size by construction (the AI boundary already caps 5 items / 2,000 chars) | The generalized SCB (W-GAP-09) must ship with package-level caching + invalidation on capsule version change (the PlanProjection/`invalidate_derived` choke-point pattern is the in-repo template), or the wallet makes Center *slower* as it makes it *truer* |
| **Ledger writes** | Today: cheap because the ledger is thin (audit rows for plan/conversation actions; action log; outbox). Memory reads write nothing | Write cost is trivially low *because coverage is absent* (GYRO-02/G-13) | The parent patent's own core is transaction logging — the ledger is designed as the write path, not an afterthought; hash-linking makes each append O(1) (prev-hash + sign) | Closing GYRO-02/W-GAP-13 adds a signed append on every SCB delivery + memory write. Budget implication named now: append must be a single indexed insert on the delivery path, batched where the consumer is a surface fanout, never a per-row chain-verification at read time (verify lazily / on audit view) |
| **Projection fanout** | PlanProjection registry → per-surface projections + `SocialMemory.Cache` rebuild on `invalidate_derived`; Inbox fanout broadcasts per message to all members + push enqueue | Fanout is per-event, per-member; cache invalidation is coarse (derived cache rebuilt, not incrementally patched) | Non-bottleneck design (sovereign draft): no single coordinator through which all packages pass synchronously; domain sharding keeps one domain's fanout off another's path | The two named risks: (1) capsule-version changes invalidating *packages* the way plan changes invalidate the cache — needs the same single choke point, or staleness becomes GYRO-04 at wallet scale; (2) group plans/shared capsules fan out to N wallets' assemblies — assembly must be per-viewer-package (already the PlanProjection shape), never per-group recomputation per member |
| **Speed to alignment** (the product metric) | Fold (3,920-line module) + gate + projection + fanout per proposal round-trip; measured nowhere as an end-to-end number in any pass | Unknown — unmeasured is the finding | — (product metric, not a patent construct) | §9's baseline must be taken on the served stack *before* the wallet build changes the assembly path, or the build cannot prove it did not regress the core metric |
| **Ingestion throughput** | EventIngestor persist-first → extraction (Elixir heuristics + Python jobs, Oban) — async by design; call transcription is the only real-time leg (Deepgram streaming) | Job-shaped; retries currently broken as a mechanism (HA-09: `retryable` written then discarded — §BS) | Third-party pipeline is a pipeline: stages must not back-pressure the conversation path | HA-09 matters here, not just as honesty: a discarded retry flag means transient worker failures surface as user-visible dead ends under load |

**Patent scaling answers, as reference (draft-evidenced, §0):**
non-bottleneck orchestration (no central synchronous chokepoint —
note the tension, named not smoothed: GYRO-01 demands one mediated
*read path* as a **contract**, which the patent answers with a
logical SCB + physically distributed assembly; the build must hold
both: one contract, no single synchronous bottleneck) and
domain-sharded scaling (sovereign draft: per-domain instances —
Opal's single-domain launch makes sharding a later axis; the
household/pod structures in §B.14 are the in-product shard shape).

---

## L. LOCKDOWN LAYER — per core journey: converts / continues / honestly cannot (validator layer)

**Pass 1 — / Pass 2 — / Validator ✓.** Lockdown = the founder's
degradation law: when the preferred form of a journey becomes
impossible, the product **converts** it to the next honest form,
**continues** it in reduced form, or **honestly says it cannot** —
it never pretends. (Hunt A's angle 6 verified the back-end half
EMPTY of new breaks; Hunt B found the glass half broken — both are
carried here, which is why this layer exists: a journey is only as
locked-down as its weakest layer.)

| Core journey | Converts | Continues | Honestly cannot | Validated state |
|---|---|---|---|---|
| Plan can't be physical → virtual | **Back end CONVERTS:** B1 conversion exists server-side (sweep row 53 TRUE); virtual plans skip physical discovery with explicit `skipped_virtual` step; join step reports `link_missing` with honest copy instead of fabricating a URL (`plan_completion.ex:134-135,250-285`) | Virtual plan triggers a check-in suggestion through the proactive gate (`:530-536`) | — | **GLASS BREAK (HB-15): no client function calls the conversion endpoint; the can't-make-it sheet offers only Keep going / Hand off lead / Leave.** The conversion exists as an API and ends there. Cover: build the glass action; until then this journey's lockdown verdict is **CONVERTS (back end) / CANNOT (glass)** — a named residual, not a pass |
| Plan detail for a virtual plan | C1 adapter converts correctly (`C1ShellHosts.tsx:117-135`: virtual → `{kind: "virtual"}`); legacy sheet renders Join when `online && joinAvailable && meetingLink` | — | — | **C2 BREAK (HB-16): C2 adapter renders every plan's `where` as `kind: "place"` unconditionally; Join exists only inside a food-step panel.** Same contract, two shells, opposite lockdown behaviour — the C2 leg is the defect |
| Participant can't make it | `JourneyAuthority.cant_make_it/3` withdraws only that participant and re-fans the attendance count — the plan continues for everyone else | Lead-driven conversion path exists (B1) for the group form | Does not auto-convert (correctly — conversion is a lead decision, not a side effect) | **CONTINUES ✓** (back end, Hunt A verified). Glass: the sheet's leave path has no `.catch` — a failed leave is silent (HB-15 tail; §M MP-9) |
| Provider unconfigured / unkeyed | — | Honest disabled tuples propagate (OpenTable both-states disabled, D-15; transcription disabled + persists nothing; SMS readiness disabled-reasons) | **Honestly cannot ✓** — the codebase's strongest lockdown habit (BACKEND_AUDIT §6 PASS) | **HOLDS**, with two named exceptions: FCM claims a dead rail (F-03/GYRO-09) and the simulate-connector can *fake the configured state itself* (HA-01, §BS) |
| No live transcription (F-16) | — | Call surfaces gate honestly; canned transcript dead and stays dead (BS-4) | **Honestly cannot ✓** (top-tier open item, named in the ledger, not hidden) | **HOLDS as honesty; the capability itself is the founder-visible gap** |
| Load failure on a surface | Designed escape hatch exists (`GraphListProjection.listError` + error block in C2Graphs) | — | Should say "couldn't load, try again" | **BREAK (HB-12): `loadPlans`/`refreshConversations` swallow every failure into `[]` — an outage paints as an empty account; the error branch is unreachable and its retry mis-wired (navigates away).** Lockdown verdict: **pretends-empty — the one dishonest degradation shape in the C2 shell** |
| Seed / demo data unavailable or off | Seed mode is badged (C2 DevChip); seed-off captures are the classification standard | — | First-run fixtures are honestly labelled on screen ("Demo only. Nothing is sent." — Hunt B verified) | **PARTIAL:** legacy surfaces paint fixtures with no badge at all (HB-01/02/03/05) and seed extras merge into live data unlabelled in the mixed branch (HB-07) — §BS |
| Money movement (wallet loads) | — | — | **Honestly cannot ✓** — loads law-gated OFF on keys + legal review; no surface claims otherwise | **HOLDS** (standing gate, not this map's to move) |

**Lockdown tally: 8 journeys — 3 hold end-to-end, 2 hold at the back
end and break at the glass (virtual conversion, C2 virtual detail),
1 pretends (load failure → empty account), 1 partial (seed), 1
holds-as-honest-inability (transcription). The pattern is the map's
pattern: the back end converts/continues/refuses honestly; the glass
is where lockdown goes to die. Division C owns the glass covers;
none requires a back-end change.**

---

## BS. BLIND-SPOT LAYER — BS-1…18 + F-register + hunt finds HA/HB (validator layer)

**Pass 1 — / Pass 2 — / Validator ✓.** Every item folded to one of:
**COVER** (a fix/gate exists and the validator verified it at the
validation tip), **HONEST GATE** (the surface says what it cannot do),
or **NAMED RESIDUAL** (open, named, with its cover specified). States
are as of the **validation tip**, not the sweep's tip (D-15 — several
sweep-era FALSE items have since been covered; carrying them as open
would be its own falsehood). Sources: status-file BS register,
BACKEND_AUDIT §4.2, classification sweep F-register, phase2-bs
report (as cited by the sweep), hunts A/B, validator greps.

### BS.1 The BS register (BS-1…BS-18)
| ID | Item (one line) | Fold |
|---|---|---|
| BS-1 | TimelineAdjustSheet Save performed no API call (fake mutation) | **COVER** — component CUT by name in C1 design; deleted (status file: "closed by removal"). Removal is a conversion to SP-2/SP-5 (§M) |
| BS-2 | Seed re-provisioned 5× in one walk session (non-idempotent) | **NAMED RESIDUAL** — seed idempotency is Division A seed work; effect-idempotency itself proven (sweep row 86 TRUE) but provisioning-count behaviour not re-verified at validation tip; rides GYRO-08's residual |
| BS-3 | Fold-born plans took `created_by` from first row of an unordered query (nondeterministic ownership) | **COVER** — fixed in Division A plan-identity work (status file: earliest *speaking member* + real PlanParticipant rows) |
| BS-4 | Deepgram canned transcript persisted as real user speech (HIGH) | **COVER (verified by validator's sources)** — canned string + `stub_transcript` deleted; unkeyed path returns disabled and persists nothing; sweep grep 0 hits; AudioIngestor moduledoc carries the R18 BS-4 note (P2 §D read it) |
| BS-5 | Sentry stub returned `{:ok, :queued}` even with a DSN (fake success) | **COVER (validator-verified)** — `sentry.ex:53` `capture/2` can never return `:ok` (`:not_configured` / `:reporting_not_wired`); reporting itself remains HONESTLY ABSENT (no SDK — founder step) |
| BS-6 | APNs adapter raised with credentials-but-no-signer, crashing the Oban job | **COVER** — returns `{:error, :jwt_not_configured}`; direct APNs remains HONEST GATE (no ES256 signer; Expo is the working rail) |
| BS-7 | `Release.seed` did not enforce the `OPAL_RUN_SEEDS` gate its comment claimed | **COVER (validator-verified, D-15)** — `release.ex:47` reads the env var. The 4 mix tasks' inconsistent write defaults (BackfillMemory writes by default) remain a named hygiene residual under §M MP-1 |
| BS-8 | Opportunity evaluate defaulted `use_dinner_fixture` true, unlabelled (= F-02) | **COVER (validator-verified, D-15)** — controller now requires explicit true; fixture default OFF on the product route. Its curate sibling was always labelled `fixture_catalog` in the response — but its *glass* provenance is HB-06 (open) |
| BS-9 | Group/family plans entirely outside PlanTransition/PlanProjection | **NAMED RESIDUAL** = GYRO-05 (extended by V-01). No cover landed |
| BS-10 | Fake travel-minutes class surviving in the pure layer (= F-11) | **PARTIAL COVER** = GYRO-12: register sites labelled via TravelEstimate; boundary/laundering sites (HA-06/HA-10) contested C-2 |
| BS-11 | opal_ai Dockerfile ships debug flag ON | **NAMED RESIDUAL** — not re-verified at validation tip; one-line cover (GAP-18 family); named so it is not lost |
| BS-12 | Seed resurrection (= F-10) | **COVER (validator-verified, D-04)** — gated `:seed_restore` exception, logged |
| BS-13 | Test seams on product routes (booking `allow_test_mock` ungated; voice stub passthrough) | **PARTIAL COVER** — voice leg closed by BS-4's deletion; booking `allow_test_mock` gating not re-verified at validation tip → residual half named |
| BS-14 | Mexico City seed on a permanent product route + attention ingest ungated (= F-12/F-13) | **PARTIAL COVER, COVER-BROKEN at the glass** — controller/route gating landed post-sweep (Hunt A spot-checks + falsefix report), but HB-09: both product mounts hardcode `seed-trip-mexico-city`, so the real-trip load the F-12 fix built is unreachable from the product (REC-3 recurrence, §M). Attention-ingest gate: F-13's fix is recorded in the ledger's hunt summary as landed (`attention_center_controller.ex:31` 403 gate, Hunt A verified) → **COVER** for F-13 |
| BS-15 | OpenTable search echoes the query as a fake result when keyed (= F-01) | **COVER (validator-verified, D-15)** — search disabled in BOTH key states, F-01 comment in code |
| BS-16 | Stripe webhook accepted unsigned JSON on dev-mode builds (security) | **COVER** — unsigned-acceptance branch deleted (no secret → 400 in EVERY environment), 5-minute timestamp tolerance, raw-body caching (sweep §F + phase2-bs report). Loads stay OFF |
| BS-17 | Twilio Verify `check_challenge/3` always errored (onboarding worked only via bypass); FCM half → F-03 | **COVER (Verify half)** — real VerificationCheck performed (21 BS honesty tests). **FCM half: NAMED RESIDUAL** = F-03/GYRO-09, still verbatim at validation tip |
| BS-18 | Founder seed burned the viewer's entire non-contact spam bucket at provisioning (first real message hit 429) | **COVER** — fixed by the A-center scoping change (status file disposition; a 429 on that path reopens BS-18 by its own terms) |

**BS tally: 18 items — 10 COVER, 4 PARTIAL COVER, 4 NAMED RESIDUAL
(BS-2, BS-9, BS-11, BS-17/FCM half). No BS item is unaccounted;
none was closed on assertion — each COVER cites its verifying source.**

### BS.2 The F-register (F-01…F-16, classification sweep) — current state
F-01 **COVER** (BS-15) · F-02 **COVER** (BS-8; glass half HB-06) ·
F-03 **RESIDUAL** (FCM dead endpoint, GYRO-09) · F-04 **RESIDUAL**
(legacy Live panel fixture fallbacks — legacy surface; HB family
extends the same class) · F-05 **PARTIAL COVER, RECURRED** — signal
removed, but the same destination's recent-calls *history* is still
fabricated (HB-02 = recurrence REC-1, charged to the cover-
verification check per the catalog's recurrence rule) · F-06/F-07/
F-08/F-09 (RF-2/3/4/1) **PARTIAL COVER** — fixes landed on the
integrated tip (ledger merge `34519b59`), integrated confirmation
PENDING-RUN (GYRO-04 / W-GAP-30) · F-10 **COVER** (BS-12) · F-11
**PARTIAL COVER** (BS-10) · F-12 **PARTIAL COVER, cover unreachable
at the glass** (BS-14/HB-09 = REC-3) · F-13 **COVER** (BS-14) ·
F-14 **COVER** (BS-7) · F-15 **COVER (validator-verified)** —
`call_channel.ex:59` error reply for unknown events · F-16 **HONEST
GATE / TOP-TIER OPEN** — live call transcription not wired; canned
transcript dead; every call surface must say what it can and cannot
do until wired (ledger F-16; §L).

**F tally: 16 — 6 COVER, 5 PARTIAL COVER, 2 RESIDUAL, 1 RECURRED-
partial (F-05), 1 honest-gate open (F-16), plus F-04 residual.
(The sweep's own gate statement — "FALSE anywhere = gate failure" —
is a sweep-time verdict; this layer reports state, it does not
re-issue the gate.)**

### BS.3 Hunt A finds (HA-01…HA-11, back-end truth) — folded
| ID | Find | Fold |
|---|---|---|
| HA-01 | `google_calendar/simulate` mints a fake "connected" Google account; every read-back erases the `simulated` provenance (gate = a config flag reachable in prod-shaped serves) | **NAMED RESIDUAL** (GATE-GAP + FALSE-class). Cover specified: gate on `Mix.env() in [:dev, :test]` + carry `connected_simulated` in `public_status/2`/`list_for_user/1`, or delete the route. Until then row 20 of §S.3 carries the caveat. Pattern: MP-4/MP-2 (§M) |
| HA-02 | Late notice with no arrival label persists/broadcasts invented "around 8:20" as the user's `explicit` statement | **NAMED RESIDUAL** (FALSE-class). Cover: `{:error, :arrival_label_required}` when sharing without a label; computed labels stamped computed, never "explicit". Strongest user-visible find in Hunt A. Pattern: MP-2/MP-10 |
| HA-03 | Channel revision proposals invent "7:30 PM" / "8:00 PM" when the client sends no time; the invented value becomes a real PlanRevision + group signal copy | **NAMED RESIDUAL** (FALSE-class). Cover: error reply `revision_changes_required`; no default times in channel payloads. Pattern: MP-2 |
| HA-04 | Center conversation-challenge path rewrites a plan's `time_label` directly — no PlanTransition, no revision, no terminal check, no recent-change entry; invisible to the gate's registry | **NAMED RESIDUAL** (axis bypass). Cover: route through the `change_plan_schedule` family (the lawful path exists in the same file) + registry row. Joins GYRO-05's family as a write-path instance (§F.3) |
| HA-05 | Households writers birth SharedPlans with no PlanTransition guard (registry's "every writer wired" claim false on this tip) | **NAMED RESIDUAL** = V-01 / GYRO-05 extension (D-16). Cover: `guard_changeset(:plan, :create)` at both sites + registry rows + gate test of the trips.ex kind |
| HA-06 | DeviceMoment launders the assumed 20 minutes into "measured" and strips the source label (F-11 cover broken at a boundary; REC-2) | **NAMED RESIDUAL + CONTESTED reachability (C-2)**. Cover: pass raw maybe-nil through; spread `TravelEstimate.fields/2`; delete both `\|\| 20` sites; extend the F-11 suite to this boundary |
| HA-07 | Intelligence pipeline push executor converts EVERY enqueue failure into `{:ok, %{"push" => "queued"}}` (incl. muted/in-app-only mislabelled "queued") | **NAMED RESIDUAL (validator-verified still verbatim at validation tip)** — `executor.ex` `other -> {:ok, %{"push" => "queued", "detail" => …}}` branch read directly. Cover: map outcomes distinctly; propagate `{:error, _}`. Pattern: MP-9 (the BS-5 shape surviving in a second module) |
| HA-08 | Twilio webhook probe bypass has no environment gate (only "no auth token configured"); handler currently log-only, comment already claims a mutation that does not exist | **NAMED RESIDUAL** (GATE-GAP, low, bounded). Cover: gate probe on `Mix.env() in [:dev, :test]`; correct the comment until the touch exists |
| HA-09 | AI-job `retryable: true` intent written then discarded (`fail_job/4` binds `_retryable`); worker maps `{:error,_} -> :ok` so Oban's `max_attempts: 3` is never spent. Failure itself is honest on the job row | **NAMED RESIDUAL (WATCH-grade)**. Cover: honour the flag or delete the annotations so the code stops claiming retry behaviour it does not have. Performance consequence in §P |
| HA-10 | ProviderVertical carries the F-11/F-05 default family verbatim + fixture identity defaults (`jordan-1`, `conv-1`, "Thursday · 6:30 PM") | **NAMED RESIDUAL + CONTESTED reachability (C-2)** — only in-lib caller is MomentRealityBridge; no product-path caller found. Cover: honest gate if reachable; named deletion if dead — silence is the one disallowed disposition |
| HA-11 | Channel `social_flow:sync` returns full success when the follow-through half failed | **NAMED RESIDUAL (WATCH-grade)**. Cover: `"follow_through" => "unavailable"` marker in the partial reply. Upgrades to SILENT-FAILURE if clients render the missing keys as "nothing needs you" (proof gap named by the hunt) |
| — | Hunt A angles 4 (cross-account reach) and 6 (lockdown, back end) | **EMPTY of new finds, stated explicitly by the hunt and adopted**: traced paths are scoped (ProductSurface account-keyed reads, Oracle participant joins, artifact creator/participant checks, channel visibility fails closed, convoy roster strips raw coordinates). §L carries the back-end half on this evidence |

### BS.4 Hunt B finds (HB-01…HB-23, glass + journey) — folded
| ID | Find | Fold |
|---|---|---|
| HB-01 | Legacy Search is entirely fixture-driven (Chanelle/Maya/Nina people, Juniper & Ivy place with hard-coded `authority_status: "GREEN"`, no seed gate, no banner) | **NAMED RESIDUAL** (FALSE-class). Cover: wire to the C2 search's real sources, or honest-gate the destination off the legacy shell. The client-side "GREEN" authority constant must go in either case. Pattern: MP-2 |
| HB-02 | Call Continuity paints a fabricated recent-calls list for every person/group (F-05 cover incomplete on its own destination; = REC-1) + residual `/chanelle/i` story-ring name test | **NAMED RESIDUAL / RECURRENCE charged to the check** (catalog rule). Cover: recent list from the real call log or no Recent section; delete both constants + the name test. Pattern: MP-2 |
| HB-03 | New Call roster/groups default to the founder's circle for every account; failure of `createCall` paints the same ringing surface as success; group calls never reach a back end | **NAMED RESIDUAL** (FALSE-class). Cover: roster from real connected-people data (the C2 ChatsHost picker already does this); failure → honest gate note, never the call surface. Pattern: MP-2/MP-4 |
| HB-04 | The painted call stage (Figma stage, fake "00:12" timer, Guest 1–3 participants, fixed "Opal Assist · preference on") is reachable from real surfaces with no live call behind it; sibling Call button in the same sheet honestly gates while Video does not | **NAMED RESIDUAL** (FALSE / DEAD-CONTROL). Cover: honest gate — no Figma stage when `view` is null and no live call exists. Pattern: MP-2/MP-5 |
| HB-05 | Global Opal (OpalAmbient) opens on a fixture "One best fit" answer + invented context counts (People "18", Places "96"…); context/refine notes claim decision effects never sent in the payload; voice toggle is disclosed paint (note is honest) | **NAMED RESIDUAL** (FALSE-class). Cover: honest no-pick state before a live decision exists (the `liveFailure` copy already exists in the file); real counts or none; controls ride the payload or lose their effect-claiming notes. Pattern: MP-2/MP-5 |
| HB-06 | Curate + thread place options fall back to fixture venues with invented scores when the server returns nothing — **failure routes to the fixture**; only provenance is an invisible DOM attribute; tapping one drafts a real share carrying an invented venue. (Settles the negative the sweep left open at row 71) | **NAMED RESIDUAL** (FALSE-class). Cover: honest no-options state; fixtures only in badged seed mode, labelled on screen, never into a share draft on a real account. Pattern: MP-2/MP-4 |
| HB-07 | Graphs timeline merges seed items into live data with the honesty label computed OFF in the mixed branch (incl. an invented "Flight prices to Tokyo dropped 20%" market claim with working actions) | **NAMED RESIDUAL** (FALSE-class, seed mode = the walk configuration). Cover: per-item source labelling (items already carry `source: "seed"`), or exclude seed extras whenever any live item exists. Pattern: MP-2 |
| HB-08 | Intelligence mock fallback paints Maya's exact facts onto ANY person + fake `{ok: true}` mediation success; mode forcible via URL/localStorage; **no surface renders the `_mock` flag** (contrast: seed mode is badged) | **NAMED RESIDUAL** (FALSE-class, conditional). Cover: visible "Demo data" badge on every intelligence surface in mock mode (the seed-chip pattern), or remove the override from the shipping build. Pattern: MP-1/MP-4 |
| HB-09 | Trip canvas mounts hardcode `seed-trip-mexico-city`, so F-12's real-trip load can never run from the product (= REC-3) | **NAMED RESIDUAL / RECURRENCE charged to the check**. Cover: mounts pass the real trip id; the fixture canvas stays only in badged seed mode, labelled. Pattern: MP-2/MP-7-class (a cover that cannot be reached is not a cover) |
| HB-10 | C2 story viewer is an empty stage ("Stories play here. Tap close any time to head back.") — the adapter's projection carries no media field, so it is unfixable from below; the sweep's TRUE row 20 covers the *legacy* viewer, a different component | **NAMED RESIDUAL** (DEAD-CONTROL / L11). Cover: mount the real story viewer for C2 rail taps + carry media in the rail projection; until then rail cells open nothing. Pattern: MP-5 |
| HB-11 | C2 Home feed never reads back what the user just shared (feed source is own plans only; `fetchHomeFeed` never called by the shell adapter) and its empty copy ("When your people move…") contradicts its contents | **NAMED RESIDUAL** (DEAD-CONTROL / L11). Cover: feed from `fetchHomeFeed` (moments) with plan cards as their own kind — the projection type already allows the kinds the adapter never emits. Pattern: MP-3/MP-5 |
| HB-12 | C2 shell load failures paint as empty accounts on Center/Graphs/Home/Chats; the designed `listError` branch is unreachable and its "Try again" navigates away instead of retrying | **NAMED RESIDUAL** (FALSE-class by effect; §L). Cover: `loadPlans` returns a result with an error leg; surfaces render the error state with a real retry. Pattern: MP-9 (successor: failure is a projection field, never an empty list) |
| HB-13 | C2 Graph Detail's "Open the chat for this plan" can never render — gated on `nextAction`, which the only adapter always sets null; the control is mounted and wired, then starved | **NAMED RESIDUAL** (DEAD-CONTROL). Cover: render the chat action on its own condition (a conversation exists), independent of `nextAction`. Distinct from OPEN-4/W-GAP-29 (this one is mounted-and-wired, not unmounted). Pattern: MP-5 |
| HB-14 | C2 You forget-a-memory: one tap, unconfirmed, silent on failure (the legacy two-step confirm regressed away on the C2 path); `google-connect` rejection is an unhandled promise (button appears dead) | **NAMED RESIDUAL** (DEAD-CONTROL/COPY). Cover: confirm-then-forget (the legacy pattern) + an error line on failure for every `runAction` branch. Pattern: MP-5/MP-9. Directly on the wallet's core control (§S.3 row 17) — the human-form layer's most consequential glass defect |
| HB-15 | B1 virtual conversion has no glass anywhere; can't-make-it offers stay-or-leave only; leave failure is silent | **NAMED RESIDUAL / LOCKDOWN-BREAK** (§L). Pattern: MP-5 |
| HB-16 | C2 Graph Detail renders a virtual plan as a physical place, no Join (except inside a food-step panel); "Join link ready" paints with no link and no action | **NAMED RESIDUAL / LOCKDOWN-BREAK** (§L). Pattern: MP-3 (adapter drops the contract's place-kind field the C1 adapter handles correctly) |
| HB-17 | C2 Chats circle headers render raw relationship-type slugs ("close_friend") | **NAMED RESIDUAL** (COPY / L12). Cover: label map in the adapter; unknown types → no header, never the slug. Pattern: MP-3-adjacent copy derivation at the glass |
| HB-18 | Check-in row: raw ISO timestamp as the cooldown line; create failures swallowed into silent reload (no error state) on a surface classified TRUE at the back end | **NAMED RESIDUAL** (COPY / L12 rule 4). Cover: format in the adapter (`timeLabelFor` is the in-repo pattern); one plain error line with retry. Pattern: MP-9 |
| HB-19 | PersonMemoryView renders machine error strings verbatim ("person_memory request failed (500)"); the sibling surface already ships the correct `consumerSafeIntelligenceError` pattern | **NAMED RESIDUAL** (COPY / L12). Cover: route all three error sites through the existing successor pattern one file over. Pattern: MP-9 |
| HB-20 | Call Assist copy implies whole-call listening; capture is own-mic only | **CONTESTED (C-3)** — WATCH. Named residual until the two-device proof lands |
| HB-21 | Body-less voice note renders "Transcribing…" forever, no terminal state | **CONTESTED (C-4)** — WATCH |
| HB-22 | Person tint assigned by story-rail position, not identity | **CONTESTED (C-5)** — WATCH; needs a design ruling, not code evidence |
| HB-23 | Center "Next together" = first in API order, not proven soonest | **CONTESTED (C-6)** — WATCH |
| — | Hunt B empty angles, stated explicitly | L8/L10: no new confirmed finds beyond registered presence (row 106). Angle 6: no new FALSE beyond F-16. Mobile native: no finds (AppShell DEMO constants are dead code by design — `App.tsx` never mounts it; the mobile product surface is the web app, so every web find applies). **First-run fixtures verified HONESTLY LABELLED on screen — the pattern HB-01/03 lack; recorded as the positive control** |

**Blind-spot layer tally: BS 18 + F 16 + HA 11 + HB 23 = 68 items
folded — 17 COVER, 11 PARTIAL COVER, 4 CONTESTED/WATCH (all in §V.4),
36 NAMED RESIDUAL with covers specified. Zero items dropped, zero
closed on assertion.**

---

## M. CONTAMINATION MIGRATION LEDGER — MP-1…MP-10 → SP-1…SP-10 (validator layer)

**Pass 1 — / Pass 2 — / Validator ✓.** Built from the
MISTAKE_PATTERN_CATALOG (canonical home: this repo,
`shots/repair18/MISTAKE_PATTERN_CATALOG.md`) + both passes + the
hunts + validator greps. **Founder rule (04:37 PDT): quarantine is
only an in-migration state; every site converts to the successor
pattern, or is removed where the surface is honestly absent, or
becomes a founder-named exception in the delivery — never a quiet
disposition.** No site below is marked converted without evidence
at the validation tip; "reachable" follows the catalog (dead code
that cannot be reached is inventoried as such, not counted
converted-by-neglect). Machine-enforcement state is per the
catalog §4: a rule without a machine check is labelled HOPE until
it has one.

| Pattern → Successor | Sites inventoried (file level) | Converted (evidence) | Remaining | Zero-reachable verification method |
|---|---|---|---|---|
| **MP-1** Scripted/local layer answers instead of the real back end → **SP-1 One answering path** | (a) R17 scripted seed layer impersonating Chanelle/Maya (historical, killed R17); (b) intelligence mock fallback answering as the server on API failure (`api/intelligenceClient.ts:213-377`, HB-08); (c) seed modules in production `lib/` behind flags (`founder_communication_seed.ex`, `founder_graph_commitment_seed.ex`, `ProductShell.seed_*` — sweep row 87 UNPROVEN as a serve-config audit); (d) canned Deepgram transcript (BS-4, converted) | (d) only: canned transcript DELETED, unkeyed path persists nothing (BS-4 COVER) | (b) mock mode reachable via URL/localStorage with no badge — **remaining, reachable**; (c) present-by-design in `lib/`, gated by flags — **in-migration**: requires the catalog §4.2 type-level seed-provenance rule (namespaced/typed synthetic data that CANNOT flow into real surfaces), not yet built; serve-config-by-config gate audit still owed | Banned-signature greps in the API suite (catalog standing check) + real-path acceptance cases run against the served stack WITH seed present + mock-mode badge-or-removal check (HB-08 cover) + seed provenance type rule (§4.2) once built. **Enforcement today: greps + acceptance cases (partial); type rule = HOPE** |
| **MP-2** Fixture-painted surfaces → **SP-2 Projection-or-honest-empty** | Legacy: Search (HB-01), Call Continuity recents (HB-02), New Call roster (HB-03), call stage (HB-04), Global Opal (HB-05), Curate/place fallback (HB-06), Graphs seed-mixed timeline (HB-07), Trip canvas mounts (HB-09), Live panel fallbacks (F-04), Calls signal (F-05, converted then recurred at HB-02); invented-value sites: HA-02 ("around 8:20"), HA-03 ("7:30/8:00 PM" defaults), HA-10 (ProviderVertical fixture defaults, contested reachability C-2); seed extras with working actions (HB-07) | F-05 signal leg only (then recurred on the same destination — REC-1); BS-1 surface removed (counts under MP-5) | **11 reachable legacy/glass sites + 2 back-end default sites (HA-02, HA-03) + 1 latent (HA-10). This is the largest remaining contamination class in the codebase.** None is quarantined-as-disposition: each carries its §BS cover (wire-to-real or honest-gate-off); the legacy shell's retirement is Division C's call, and until it retires these sites are the gate's FALSE list | Classification sweep re-run per pack (FALSE wherever found) + seed-off rendered captures + per-site covers in §BS. **Enforcement: sweep (process); no automated fixture-in-render-path check yet = HOPE at machine level** |
| **MP-3** Per-surface shadow state / re-derivation → **SP-3 One projection per surface** | Plan domain: CONVERTED (single counter/projection — Division A). Remaining: C2 shell adapters re-deriving/dropping contract fields (HB-16 place-kind, HB-13 nextAction starvation, HB-23 ordering), thread filament regex on label text + adapter grouping for missing D5 (GYRO-07/W-GAP-29), Oracle direct cross-store queries (P2 G-11), Center sticky context (GYRO-04, partial), dual conversation stores (GYRO-11 — two *stores*, adjudicated as different jobs by the audit; the defect is split lineage, not duplication per se) | Plan family (attendance/projection coherence) | 5 site families | Cross-surface read-back cases (change state once, read it on every surface, require identical truth) + interface law review. **Enforcement: cases exist for plans; wallet surfaces have no equivalent yet = partial** |
| **MP-4** Canned provider output presented as live → **SP-4 Honest provider contract** | OpenTable echo (F-01), Deepgram canned (BS-4), FCM false-ready (F-03), opportunity fixture default (F-02), simulate-connector fake "connected" (HA-01), New Call failure-paints-ringing (HB-03 tail), mock `{ok: true}` actions (HB-08 tail) | **F-01 CONVERTED** (disabled both key states, D-15) · **BS-4 CONVERTED** · **F-02 CONVERTED** (controller leg, D-15; glass provenance = HB-06 under MP-2) | F-03 (adapter still lists a dead rail as a capability — **remaining**), HA-01 (a *state*-faking provider path — remaining), HB-03/HB-08 tails (under their §BS covers) | Unkeyed-path tests asserting the honest tuple per provider + classification sweep provider rows. **Enforcement: BS honesty suite exists (21 tests on the BS branch family); HA-01 has no test yet = partial** |
| **MP-5** Fake toggles and controls → **SP-5 Controls with receipts** | Settings: 0 rendered fake toggles (§S verdict, evidenced). Dead controls: Drop-it (converted), C2 story viewer (HB-10), C2 chat-for-plan starvation (HB-13), C2 forget without confirm/receipt (HB-14), TimelineAdjustSheet (BS-1, removed), B1 conversion's missing glass (HB-15 — an *absent* control, the inverse shape: capability with no control), legacy SCREENS 43 blocked rows (honestly absent; legacy render audit owed, C-7) | **Drop-it CONVERTED** (D-05: real POST + derivation + read-back — the SP-5 shape exactly) · **BS-1 CONVERTED by removal** | HB-10, HB-13, HB-14, HB-15 | Dead-control sweep (every tappable inventoried + exercised with read-back) + settings law (every setting TRUE). **Enforcement: sweep is process; dropItWiring tests are the machine-check template = partial** |
| **MP-6** Unscoped / wholesale data reads → **SP-6 Scoped reads only** | Facade recall owner+visibility only (GYRO-01); MemoryScope allow-all fall-through (V-02/GYRO-06); durable recall ignoring relationship scope; push previews carrying content off-session (P2 G-09); Oracle membership-scoped-but-not-policy-scoped reads (G-11); three assemblers with no delivery logging (W-GAP-09) | **None at wallet scope.** (Plan domain's reader registry is SP-6 *for plans only* — the template, not the conversion) | All 6 site families — **this pattern IS the wallet build (W-GAP-05/09, GYRO-01/06). Every other pattern's conversion is local; this one's is the program** | Two-account isolation proofs (SM-ISO-01/02 incl. literal prompt-payload audits) in the regression suite — **not yet built (W-GAP-32) = HOPE until the suite exists** |
| **MP-7** Handover claims not verified against the served build → **SP-7 Verified handover** | Process pattern (no code sites): walk link without `opal_dev=1`; wrong build served twice; both passes in this very map carried stale register claims (D-04/D-15 — the validator's own evidence that this pattern also infects *documents*: P1 repeated the sweep's F-10 claim without re-reading the file) | The device_test_build_gate skill + badge law exist and were used in R18 walks | Recurrence in documentary form (V-03): any map/register claim citing another register instead of the code. **This validated map is the conversion for the wallet map itself: every load-bearing claim herein traces to a file read at the validation tip or is labelled with its evidence class** | `device_test_build_gate` (badge == claimed tip, BEAM start postdates checkout, foreign servers killed) + screenshot pack precedes any walk. For documents: the validator rule applied here — registers are leads, code is evidence. **Enforcement: gate skill (machine-assisted); document rule = process** |
| **MP-8** Component-green reported as app-green → **SP-8 Whole-app verdicts** | Process pattern: R17 jsdom-structure-as-rendered-proof failure mode; this cycle's own state (backend 3,020 tests / web 1,310 with 23 baseline failures / API real-path suite NOT yet completed on the integrated tip — ledger §A) | Reporting discipline adopted in the ledger (verdicts labelled partial with remainder named — the ledger's own §A does this correctly) | The API real-path suite's integrated-tip run is still owed; most wallet-map behavioural claims (both passes + this validation) rest on code reading, **named here as the untested remainder of this document** | Whole-app rendered testing on the served stack as the decisive gate (testing unity law). **Enforcement: gate definition exists; the deciding run is PENDING — any "app-green" sentence before it is an MP-8 instance by definition** |
| **MP-9** Silent failure → **SP-9 Failures surface** | Call channel catch-all (F-15, converted); executor push-swallow (HA-07, **validator-verified still present**); C2 load-swallows (HB-12); check-in create swallow (HB-18); C2 forget/google-connect unhandled rejections (HB-14); can't-make-it leave without `.catch` (HB-15 tail); sync partial-success (HA-11, WATCH); LLM fallback swallowing provider failure (F18-08 contributing cause — RF family, partial); Sentry fake-queued (BS-5, converted — and HA-07 is its shape recurring in a second module: the catalog's recurrence rule charges the *grep-level pin* the hunt recommends, which does not exist yet) | **F-15 CONVERTED** (`call_channel.ex:59`, D-15) · **BS-5 CONVERTED** | HA-07, HB-12, HB-18, HB-14, HB-15-tail, HA-11 — **6 sites, all glass/executor layer** | Unknown-input cases must surface the error shape; failure-path cases per surface. Recommended machine check (Hunt A): grep-level regression pin on `"queued"` success literals in executor-class modules. **Enforcement: per-surface cases partial; the `"queued"` pin = HOPE (does not exist)** |
| **MP-10** Stale state revived over live state → **SP-10 Governed writes only** | Seed resurrection (F-10/BS-12, converted); sticky Maya re-engagement (RF-2/F-06, fix landed, confirmation pending); fold/upsert time-label mutation (RF-5 — investigated, REFUTED with evidence: not a site); DeviceMoment upstream defaulting reviving assumed values under a "measured" label (HA-06 — stale *assumption* revived as live *measurement*, this pattern's newest shape); backfill mix task writing by default (BS-7 tail — an ungoverned writer class) | **F-10 CONVERTED** via the logged gate exception (the catalog's own prescribed disposition) · RF-2 fix landed (PARTIAL until integrated confirmation) | HA-06 (contested reachability C-2); backfill write-default hygiene | PlanTransition gate + terminal-state regression cases (FR-17-03 / FR-08-01 / seed-restore tests exist) + every writer enumerated in the gate registry — **HA-04/HA-05 prove the registry's enumeration is currently incomplete, so the verification method itself is part of the remaining work** |

### M.1 Migration summary (the reportable numbers)
- **Sites inventoried:** MP-1: 4 site groups · MP-2: 14 · MP-3: 6 ·
  MP-4: 7 · MP-5: 8 · MP-6: 6 · MP-7: 3 (process) · MP-8: 2 (process)
  · MP-9: 9 · MP-10: 5. (Groups, not lines: a "site" is a file-level
  locus from the passes/hunts/validator greps above.)
- **Converted (evidence at validation tip):** MP-1: 1/4 · MP-2: 1/14
  (+1 recurred) · MP-3: 1/6 · MP-4: 3/7 · MP-5: 2/8 · MP-6: 0/6
  (template exists in the plan domain) · MP-7: gate exists, document
  recurrence converted by this map · MP-8: discipline adopted,
  deciding run pending · MP-9: 2/9 · MP-10: 1/5 (+1 refuted, +1
  partial).
- **Remaining:** concentrated in three places — the legacy glass
  (MP-2/MP-5/MP-9: HB-01…HB-16), the wallet build itself (MP-6), and
  two back-end default sites (HA-02/HA-03). **No pattern is fully
  converted; no pattern is without at least one evidenced conversion
  except MP-6, whose conversion is the track's main build.**
- **Founder-named exceptions:** NONE claimed in this map. Every
  remaining site carries a specified cover in §BS/§F; a site whose
  cover the program later finds unbuildable must return here as a
  named exception in the delivery — it may not be quietly
  reclassified. Quarantine states used above ("in-migration",
  "HIDDEN", "honestly absent") are all paired with their conversion
  or their gate, per the founder rule.
- **Enforcement honesty (catalog §4):** machine teeth exist for
  MP-4 (BS honesty suite), MP-5 (dropItWiring template), MP-7 (build
  gate), MP-10 (gate + regression cases). MP-1's type-level seed
  rule, MP-2's render-path fixture check, MP-6's isolation suite,
  and MP-9's `"queued"` pin **do not exist yet and are labelled HOPE
  wherever this ledger relies on them.**

---

## DC. DESIGN-TO-CODE FIDELITY — Division C spec elements → components / served renders (validator layer)

**Pass 1 — / Pass 2 — / Validator ✓.** Direction per the task and
the fidelity law (communication-model §7): design elements named in
the Division C spec traced **forward** to components/served renders;
codeless elements are gap entries. **Scope note (a correction the
validator must state plainly):** the task names
`coordination/repair18/communication-model.md` as "the Division C
spec". That file is the Communication Model (L12) — it names
*rules*, not design elements. The Division C design elements live in
`track-c1-design-core.md` (C1: cards/pills/thread/Center) and
`track-c2-design-shell.md` (C2: identity/shell/modes/splashes),
with L12 encoded in `apps/opal_web/src/theme/layoutContract.css`.
This section traces the C2 spec's named elements (the shell is the
served face) + the L12 rules; C1 card internals trace through C2's
consumption of them. **Evidence class: code presence verified by the
validator (files/components exist at the validation tip); rendered
proof is the screenshot pack's job — where no rendered evidence was
in any pass's sources, the entry says UNPROVEN-render, which under
the fidelity law means "coded, not yet proven designed" (§7.2).**

| Design element (C2 spec) | Traced to code | Fidelity verdict |
|---|---|---|
| New wordmark "the Join" + lockups (hero/inline) as vector masters under `public/brand/c2/` + PNG 1x/2x/3x; old paths untouched | `apps/opal_web/public/brand/c2/`: `opal-c2-wordmark.svg` (+ @1x/2x/3x PNG), `opal-c2-lockup-hero.svg` (+ PNGs), `opal-c2-lockup-inline.svg` (+ PNGs), `opal-c2-mark.svg`, app icons — validator `ls` verified | **CODED** (asset set complete as specified). Render: UNPROVEN-render |
| Character (Loop) in five expressions, two mode variants; faceless mark | `opal-c2-character-{rest,listening,thinking,glad,sleep}.svg` (5 expressions ✓) + `opal-c2-mark.svg` | **CODED** (expression set complete). Mode-variant *art* variants: not separately filed (spec allows ground-matched variants; CSS token swap carries mode) — named as a minor trace ambiguity, not a gap |
| Token file D1: `theme/c2Tokens.css`, per-mode values, C1 consumes from it only | `apps/opal_web/src/theme/c2Tokens.css` exists (+ `c2Tokens.test.ts`, `c2Mode.ts`, `c2Mode.test.ts`) | **CODED** |
| Mode system D8: boot-time `data-mode` before first paint, persisted key, YOU Appearance 3-way control (System/Light/Dark), no flash | `theme/c2Mode.ts` + `appearanceTheme.ts` (+ tests); Appearance rows GREEN in §S (rows 11/21) | **CODED**. Night-path rendered pass (dark genuinely dark, no white frame) is a phone-checklist item by the spec's own §11 — UNPROVEN-render by design |
| State system §2.4: five states, hues shifted, four signals (hue+label+border+glyph), pill grammar, titles always surface ink | C1 pill grammar consumed by C2 (`C2Graphs`, `shellData` projections carry state); state *derivation* stays back-end (§3.3 of the spec) | **CODED as components; FIDELITY GAP (glass): HB-16 — the C2 detail adapter drops the place-kind half of the same contract, and HB-12/HB-13 show adapter fields (listError, nextAction) specified-but-never-supplied.** The design's projection fields exist in `projections.ts`; two adapters do not fill them → **DC-GAP-1 (adapter fidelity: projections.ts fields with no producer)** |
| Splash 1 (single implementation; Continue / I already have an account; Enter Opal count 0) + Splash 2 (Enter Opal exactly once, live text, art carries no text) | `C2Onboarding.tsx` in the C2 shell; legacy dual splash-1 implementations retired on the C2 path per spec | **CODED**. Exactly-once is a rendered-count proof — UNPROVEN-render (phone checklist + pack) |
| Onboarding 60-second law: Phone → Verify → Meet Opal, one field/choice + one primary per screen, deferrals one-tap dismissible with permanent skip | C2Onboarding + PermissionBootstrap/TrustContractCard (§S.1) | **CODED**. Timed run is an acceptance exercise (spec A4), not a code fact — UNPROVEN-render |
| Dock: 5 slots (Home/Chats/Center/Graphs/You), Center = faceless mark in raised circle, active-slot dot, no state hues in the dock | `C2Shell.tsx` + `c2shell.css` | **CODED**. Dock-unread badge: the adapter honestly returns 0 (no projection — W-GAP-29), so the spec's badge slot renders its honest-empty form; **the badge *element* is coded, its data is a named gap (not a fidelity failure — the design law prefers the honest 0 to a derived sum)** |
| Home: story rail + feed + ShareComposer | `C2Home.tsx` | **FIDELITY GAP: HB-10 (viewer is an empty stage — the designed element "story viewer" has a component but no media path) + HB-11 (feed does not contain the designed content kind).** → **DC-GAP-2 (Home: two designed elements coded-but-hollow)** |
| Graphs list + Graph Detail (destination band, back-to-origin, state pill + attendance as finished strings, food step, chat action) | `C2Graphs.tsx`, `shellData.ts` detail adapter, `FoodStepPanel` | **PARTIAL: HB-13 (chat action starved), HB-16 (virtual where/Join).** → part of DC-GAP-1 |
| Center opening deck (presence from real signals only; "Next together" = soonest) | `C2CenterOpening.tsx` + adapter | **PARTIAL: presence hardcoded `idle` on this path (sweep row 106 UNPROVEN) + HB-23 ordering contested (C-6).** → **DC-GAP-3 (Center deck: presence + next fields are constants, not projections)** |
| YOU hub groups (You / Privacy and safety / How Opal helps / Alerts and devices / Account), GREEN-only rendering | `C2You.tsx` + `shellData.ts` settings sections | **CODED** (and the GREEN-only rule verified in §S). HB-14 (forget flow) is a control-fidelity defect inside a coded surface → §BS |
| L12 Communication Model rules (plain-language state; checkpoint honesty; errors in plain words + one next step; single-tap-answerable offers; no machine vocabulary) | Encoded as Layout Contract L12 in `theme/layoutContract.css`; rendered/copy gate specified (communication-model §4) | **RULES CODED AS CONTRACT; GATE EVIDENCE PENDING-RUN** (the spec itself states this). Live violations found by Hunt B: HB-17/18/19 (machine vocabulary + silent failures on shipped surfaces) → the gate, when run, must fail those surfaces; until it runs, L12 fidelity is **UNPROVEN with three known violations** → **DC-GAP-4** |
| Proactive presentation system (DIR-4 reveals: taxonomy, per-surface forms, fire language, timing/QUIET presentation ceilings, presentation modes in the user's words) | Spec: `coordination/repair18/proactive-presentation-system.md` - presentation layer only; truth-side gates stay in section B.5 and S of this map | **SPECIFIED, CODELESS BY DESIGN SEQUENCE** - the presentation counterpart to B.5/S truth; becomes a fidelity failure only if a reveal ships without following it, or if its section 8 dependencies close and no build follows. HF-GAP-7's human form is defined there (its section 6). |
| Opal's Home (SM design §3 — Presence / Activity trail / Upcoming / Awaiting your approval / Soul+Memory cards) | — no components — | **CODELESS BY DESIGN SEQUENCE**: Opal's Home belongs to the SM build *after* this map (design §5 sequencing). Registered here so the trace is explicit: **DC-GAP-5 (= W-GAP-12/31 — designed, sequenced, not a fidelity failure; it becomes one only if the SM build ships without it)** |
| Care / Check-in destinations in C2 | `CareDestination.tsx`, CheckinAskCard/CircleRow/Summary mounts | **CODED**; HB-18 copy defects on the check-in row → §BS |

**Coordinator amendment (2026-10-18, DIR-4 merge):** the
proactive-presentation row above is no longer codeless — the
in-scope reveal family (deck / thread / chats list, per the
spec's section 8 dependency register) is BUILT and merged on
`muse/repair-18` (one `Reveal` derivation; see
`coordination/repair18/dir4-report.md`). The forms the register
holds back (push D-4, mode picker D-8, call forms D-2/D-6,
trail/Home full forms D-3, composed basis lines D-5,
quiet-hours copy D-7) remain unbuilt by design sequence. The
tally below is the validation-time count and is not restated
here.

**Fidelity tally: 13 traced element groups — 6 CODED, 3 PARTIAL,
2 coded-but-hollow (DC-GAP-2/3), 1 contract-coded/gate-pending
(DC-GAP-4), 1 codeless-by-sequence (DC-GAP-5), plus DC-GAP-1
(adapter fields without producers). No element was found painted
from a mockup in place of code; the failures are the inverse —
real components starved by their adapters, which is GYRO-07/MP-3
wearing design clothes.**

---

## E. COVERAGE CHECKLIST — the no-laziness evidence (VALIDATED)

### E.1 Patent constructs — 32 canonical units, all covered in §A
18 constructs (A1, A2, A8–A18 in canonical numbering) · capsule
6 field groups (header, payload, scope graph, audit chain, version
trail, operations) · scope 8 dimensions (roles, relationships, time,
purpose, consent, emergency, jurisdiction, transformation) ·
retained entries A.30/A.31/A.34/A.35/A.36/A.37.

### E.2 Opal subsystems — union of both passes' lists, all covered in §B
Plans/PlanTransition/PlanProjection · conversation fold + dual
conversation systems · Center · memory pipeline (admission/scope/
store/compose/fit/kind/metrics, facade, SocialMemory) · proactivity
gates · ProfileGap · founder seed · location · relationships/lead
times · media/stories · inbox fanout · celebrations · check-in
sweeps · care rotations + households · provider actions · opal_ai ·
trips · lives · calls · voice · artifacts · group/family plans ·
availability/calendar · DSI · DecisionIntelligence · RealWorld
connectors · GroupTastes · search · push · email · money wallets ·
trust/taste/financial profiles · world facts/Oracle · safety ·
settings (§S).

### E.3 Flows, ingestion, self-improvement
10 data classes (§C) · 6 ingestion sources (§D-ING) + the 7-step
conversation→alignment trace · 17-row self-improvement inventory
(§D: 14 stores + 3 named non-stores).

### E.4 Validator layers
Human-form (§H: 9 constructs, 8 named HF gaps) · Performance (§P:
5 cost centres) · Lockdown (§L: 8 journeys) · Blind spots (§BS:
68 items folded) · Contamination migration (§M: MP-1…10 → SP-1…10)
· Design fidelity (§DC: 13 element groups, DC-GAP-1…5).

### E.5 Named coverage gaps of this validated map (honest)
- **OG-1 / C-1** — official patent texts unretrieved in 3 attempts (§0.2).
- **OG-2** — `apps/opal_mobile` not independently inventoried (both passes scoped to web; Hunt B verified the native shell is dead code behind a WebView — adopted, not re-derived).
- **OG-3** — the 175 pure-library modules were mapped at family level via BACKEND_AUDIT, not re-read module-by-module (both passes; the validator re-read the memory/plan/consent families individually). HA-10 shows what this can hide; C-2 keeps the consequence visible.
- **OG-4** — no test suite was run by any pass or by the validator (per briefs). Behavioural claims rest on code reading + the suites' own recorded results as cited. This is MP-8's untested remainder, named.
- **OG-5** — rendered proof: neither pass captured surfaces; §DC's UNPROVEN-render marks carry the consequence.

### E.6 What is genuinely strong (both passes, independently — retained so reconciliation loses nothing)
1. **The plan domain already runs the gyroscope correctly** — one store, one transition gate, a mechanically enforced reader registry, derived caches only with wired invalidation. It is the template the wallet layer should be built as, not replaced by.
2. **Honesty gates are real code, not copy:** transcription refuses unconfigured stubs; SMS readiness reports disabled reasons; travel mode is a projection, not a fake toggle; unshipped settings are HIDDEN; `messaging_business` is `:absent` in the registry; delete is gated rather than faked; OpenTable now refuses in both key states.
3. **Minimization instincts predate the wallet framing:** free/busy-only calendar access with a no-title cache, final-only call transcripts deleted with the call, EXIF stripping, group-chat depth stripping, AI-job context caps (5 items / 2,000 chars).
4. **Consent expiration discipline:** immortal grants are rejected at validation time — a patent-grade rule already enforced.
5. **The two passes converged independently** on the map's load-bearing verdicts (no capsule, no mode object, no lineage chain, three assemblers, consent as the strongest object, SharedMemory as the closest construct, plan domain as the template). Independent convergence on this scale is the method law working as designed; the validator's disagreements were grain, arithmetic, and staleness — never direction.

*End of validated map. FOUNDER_ACCEPTED = NO. This document
describes the founder's patented IP and stays inside his private
workspace/repos. The validator signed every section above; the
contested items in §V.4 remain open by name until their settling
evidence exists.*

---

## ADDENDUM (2026-10-19) - Terms: the multi-agent coordination layer

Recorded by the founder 2026-10-19 13:36 PDT as product architecture (not a build item of Repair #19): Opal runs MULTIPLE AGENTS on the backend for each user - several working in parallel on that user's behalf - and agents of DIFFERENT PARTIES coordinate with each other to reach solutions/resolutions (agent-to-agent alignment over the graph). In this map's terms, all of it runs THROUGH the Memory Wallet: an agent acts only inside its own user's wallet scope and permissions (the Scoped Context Builder's intersection is the agent's whole world); cross-party coordination happens only on shared capsules/plans with consent lineage - never inside another user's private memory; every consequential agent action is ledgered (the signed audit ledger) and, where the user's mode requires, approval-gated; surfacing obeys QUIET (agents work silently; the user sees outcomes and what needs them, not machinery). This is the intelligence-phase architecture the wallet build serves; the sequencing law is unchanged (repairs pristine first).

---

## ADDENDUM (2026-10-19) - Terms: monetization model + value loop

Recorded by the founder 2026-10-19 13:44 PDT, stated precisely: users MONETIZE their own first-party data. Opal brokers sharing ON BEHALF of users, out of their memory wallets, only what is permissioned and only at the granted scope. The reward to the user is MONEY and/or experiences and access, calibrated to the data class and the incentive design. The user is the seller; Opal is their broker; the wallet is both vault and brokerage account. VALUE LOOP: the money users earn through wallet brokering is SPENDABLE - within the applications connected to Memory Wallets (the domain family: Opal, Otzar, and future wallet-connected apps) and to pay for things in the real world. The wallet is therefore also the person's portable value account across the federated domain system: earn in one domain, hold in the wallet, spend anywhere the wallet reaches. (Aligns with the Sovereign Wallets document in the corpus.)
