# HISTORY RECONCILIATION — Repair #11

**Purpose:** the founder pasted extensive session history (Repair #5 → #10 cycles, founder re-walks, directives, continuity handoff) noting it "may not have been pushed to GitHub." This document cross-references every durable item in that history against the repo and preserves what was missing. Distilled knowledge only — no raw chat logs.

**Branch:** `muse/repair-11` · **Baseline:** `c474d95f` · **Date:** 2026-10-15
**Release authority:** `FOUNDER_ACCEPTED = NO` · `FREEZE = HOLD` · `PASS2 = NO` · `FOUNDER_PHONE_PASS = NOT_CLAIMED`

---

## 1. Repair lineage (SHAs verified against repo)

| Repair | Product SHA | Stamp / ship | Baseline | Report in repo |
|---|---|---|---|---|
| #5 (Center screenshot evidence) | `4dfa8d35` | ship (pushed, no merge) | `e2f8e1ba` | PARTIAL — `shots/repair5_center/RETURN_BOARD.md` + screenshots; no `REPAIR5_REPORT.md` |
| Founder Reality Repair (12-phase) | `bf674242` | ship (pushed, no merge) | — | YES — `docs/evidence/founder_reality_repair/FOUNDER_REALITY_REPAIR_REPORT.md` |
| #6 (exact intent, plan authority) | `6c744119` | — | `4dfa8d35` | PARTIAL — `shots/repair6/COVERAGE_GAP_MAP.md` + `REPAIR6_BOARD.json`; no report |
| #7 (runtime truth) | `281718f7` | stamp `f5183725` | — | YES — `shots/repair7/REPAIR7_REPORT.md` + `VERIFY.json` |
| #8 (conversational truth) | `3944906f` | ship `b67a7b70`, tip `0d6d9a8d` | rejected `f5183725` | YES — `shots/repair8/FAILURE_LEDGER.md` + `VERIFY.json` (no `REPAIR8_REPORT.md`; ledger is the record) |
| #9 (conversation owns routing) | `7eb3e48b` | stamp `f8b94294` | rejected `0d6d9a8d` | YES — `shots/repair9/REPAIR9_REPORT.md` + `FAILURE_LEDGER.md` + `VERIFY.json` |
| #10 (behavioral reliability) | `5e7a7b4a` | stamp `c474d95f` | `f8b94294` | YES — `shots/repair10/REPAIR10_REPORT.md` + `FAILURE_LEDGER.md` + `VERIFY.json` |

---

## 2. Founder re-walk findings → dispositions (Repair #5 re-walk → Repair #6)

From the pasted founder verdict; dispositions verified against repo evidence:

| Finding | Verdict | Disposition |
|---|---|---|
| Keyboard position above keyboard | PASS | Preserved (Reality Repair dock fix) |
| Birthday planning copy | Acceptable, needs refinement | Copy iteration; not a P0 |
| **Exact Nighthawk lookup** (returned Crown Bistro / Night & Day Cafe / Clayton's instead of the real Night Hawk, 1315 Orange Ave, Coronado) | FAIL | Repair #6 P0-A: exact named-venue resolution; Repair #7 FL-R7-001/002 |
| **Generic Friday dinner inherited Maya** | FAIL | Repair #6 P0-B: intent context isolation; Repair #8 FL-R8-01 |
| **Composer multiline overflow** (text escapes composer) | FAIL | Repair #6 P0-C; Repair #7 FL-R7-003 |
| Double-tap Center no longer opens Chats | PASS | Preserved |
| No synthetic Maya rows / malformed metadata | PASS | Preserved |
| **Plan time/date correction dead** ("change time to 8 PM" did nothing) | FAIL | Repair #6 P0-D; Repair #7 P0-G (API `plan_patched` PROVEN, same plan_id; Graph Detail picker chrome not separately browser-proven) |
| **Plan leadership not visible** (who leads/controls a plan) | FAIL | Repair #6 P0-D; Repair #11 Layer D (no organizer concept in conversation track) |
| **Graph visual artifacts** on plan-detail open | FAIL | Repair #6 P0-E; needs phone screenshot — do not redesign on guess |
| Repeated opportunity taps re-form pending plan | FAIL (suspect stale state) | Repair #11: idempotent opportunity handling (resume, don't duplicate) |

---

## 3. Durable product laws — cross-reference

| Law (from pasted history) | Status | Location |
|---|---|---|
| PRESERVE → EXTEND → COMPOUND; non-regression absolute (`CAPABILITY_LOSS=0`, `PRIOR_GREEN_REGRESSIONS=0`, `DEAD_ACTIONS=0`, `FAKE_SUCCESS=0`) | IN REPO | `docs/authority/OPAL_NON_REGRESSION_PRESERVE_EXTEND_COMPOUND.md` (updated 2026-10-14) |
| New systems consume existing domain events/state; no parallel truth stores | IN REPO | same doc ("Hard invariant" + examples) |
| **Evidence hierarchy: founder phone reality > runtime evidence > automation > comments/docs** | **WAS MISSING → ADDED 2026-10-15** | `docs/authority/OPAL_NON_REGRESSION_PRESERVE_EXTEND_COMPOUND.md` ("Evidence hierarchy" section) |
| Per-subsystem `BEFORE_CAPABILITY → AFTER_CAPABILITY → REGRESSION_TEST → RESULT` | IN REPO | same doc ("Per modified subsystem") |
| Canonical distinctions (Follow≠Connection, Interested≠Going, Going≠Committed, Proposal≠Confirmation, Withdrawal≠Cancellation, Draft≠Delivered, Suggested venue≠Verified reservation, Personal memory≠Current intent, USE≠DISCLOSE, GRAPHING≠PUBLISHING, PLAN_MEMBERSHIP≠CONVERSATION_HISTORY_ACCESS) | IN REPO | `docs/authority/PRODUCT_INVARIANTS.md`, `OPAL_PERMISSION_ARCHITECTURE.md`, `OPAL_PERSONAL_FEED_PROJECTION_LAW.md`, `shots/repair11/STATE_AUTHORITY.md` |
| Person-agnostic law (no hardcoded fixture names in production behavior) | IN REPO | `docs/authority/OPAL_UNDERSTANDING_LAW.md`; Repair #10 M13 test |
| State→language contract (LLM may not invent surprise/booking/confirmation/provider results) | IN REPO | `docs/authority/OPAL_STATE_LANGUAGE_CONTRACT.md` |
| Question economy (one narrow question max; safe assumptions) | IN REPO | `docs/authority/OPAL_QUESTION_ECONOMY_AND_ASSUMPTION_LAW.md`, `docs/architecture/MINIMUM_QUESTION_ENGINE.md` |
| Python proposes / Elixir authorizes / Phoenix propagates / Postgres preserves | IN REPO | architecture docs; `shots/repair11/STATE_AUTHORITY.md` |
| Out-of-scope until P0 clean: Group E2E, Home projection, Call-log projection, realtime convergence, trace, visual polish (`STILL_MISSING_E2E`) | IN REPO | `docs/authority/CURRENT_OPAL_STATE.md:410`, `OPAL_STATE_LANGUAGE_CONTRACT.md:71-73`, `OPAL_PERSONAL_FEED_PROJECTION_LAW.md:46` |
| `KEYBOARD_SAFE = PARTIAL` (viewport-shrink only; device keyboard HOLD) | IN REPO | `docs/evidence/founder_reality_repair/FOUNDER_REALITY_REPAIR_REPORT.md:109` |
| Investor-touch acceptance checklist exists | IN REPO (STALE TIP) | `docs/evidence/founder_walk/INVESTOR_TOUCH_ACCEPTANCE.md` — checklist tip `eedf3c69` predates current baseline; update tip on each push |

---

## 4. Failure ledger consolidation

The central ledger (`docs/evidence/failure_ledger/FAILURE_LEDGER.md`) stopped at Repair #7 (FL-R7-001…008 + FL-R6-PASS). Repairs #8/#9/#10 kept per-repair ledgers under `shots/repair{8,9,10}/` but were never consolidated. **Consolidated 2026-10-15:** FL-R8-01…08, FL-R9-01…08, FL-R10-01…07 appended to the central ledger with dispositions and SHAs. The founder's Repair #10 live failures (F01–F07) are recorded in `shots/repair11/ROOT_CAUSE_MAP.md` and will enter the ledger with their Repair #11 dispositions.

---

## 5. Read-first docs from the continuity handoff — verified present

`MASTER_PRODUCTION_CONTINUITY_HANDOFF.md` ✓ · `CURRENT_OPAL_STATE.md` ✓ (addendum 2026-10-15 appended; checkpoint body dated 2026-10-13) · `PRODUCT_INVARIANTS.md` ✓ · `OPAL_UNDERSTANDING_LAW.md` ✓ · `OPAL_CONTEXT_ALIGNMENT_ENGINE.md` ✓ · `DYNAMIC_RELATIONSHIP_ALIGNMENT_MATRIX.md` ✓ · `OPAL_TEMPORAL_CONTEXT_ALIGNMENT_FOUNDATION.md` ✓ · `USER_VS_CONTROL_LAW.md` ✓ · `OPAL_COMPLEXITY_LAW.md` ✓ · `OPAL_RELATIONSHIP_ACCESS_MODEL.md` ✓ · `OPAL_DYNAMIC_RELATIONSHIP_CLARIFICATION.md` ✓ · `OPAL_PERMISSION_ARCHITECTURE.md` ✓ (continuous permission/graphing substance covered here; no standalone `CONTINUOUS_PERMISSION_LAW.md` exists) · `MINIMUM_QUESTION_ENGINE.md` ✓ (under `docs/architecture/`) · `OPAL_NON_REGRESSION_PRESERVE_EXTEND_COMPOUND.md` ✓ · `OPAL_PERSONAL_FEED_PROJECTION_LAW.md` ✓ · `OPAL_TEMPORAL_FOLLOW_THROUGH_AND_CONTEXTUAL_VALUE.md` ✓.

---

## 6. Contradictions / supersessions flagged (not resolved)

1. **The pasted continuity handoff's walk specimen is `e2f8e1ba`; the repo is at `c474d95f`** — five repair cycles later. Its "PRODUCT EDITS = STOPPED / do not let Grok make any more product changes" instruction was superseded by subsequent founder-authorized repairs #6–#10. The handoff must not be read as current authority; the repair lineage table (§1) is the current record.
2. **Repair #8's sessionStorage mirroring** for Chanelle message persistence was flagged *in its own contemporary review* as "not a substitute for durable server-side messaging" and "must not be represented as production-grade." Repair #11's `STATE_AUTHORITY.md` now requires durable per-participant delivery. The sessionStorage approach is superseded — do not build on it.
3. **"I'm thing" copy corruption** (Repair #5 era): root cause was byte/grapheme `capture_after` + unsanitized interpolation (`shots/repair5_center/RETURN_BOARD.md`). It does not appear in the Repair #10 failure list — treat as fixed pending the Repair #11 non-regression sweep, not as an open item.
4. **Founder Reality Repair claimed `DOCK_FIXED=YES` etc. as GREEN** while flagging `KEYBOARD_SAFE=PARTIAL`. Per the evidence hierarchy (now codified), the PARTIAL stands until a phone walk proves otherwise; the GREEN claims are subject to the Repair #11 verification sweep, not taken on trust.
5. **Nighthawk specimen consistency:** the pasted history verifies the real venue as Restaurante Night Hawk / Night Hawk, 1315 Orange Avenue, Coronado CA 92118 (Greek/Mediterranean, inside The Baby Grand) via OpenTable. Repair #7 evidence (`shots/repair7/02_nighthawk.png`) is consistent. No contradiction — this is the canonical test specimen for exact-venue resolution.
