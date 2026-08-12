# FOUNDER SMOKE / PROOF RUN REPORT

**HOLD. DO NOT MERGE.**  
**Run type:** Proof of checkpointed product + minimal repairs only for smoke-reproduced failures  
**Date:** 2026-08-12

---

## EXECUTIVE RESULT

| | |
|--|--|
| Smoke executed | Yes (API comprehensive + headless Chrome shell) |
| Product blank shell | **FAIL then REPAIRED** (`RealtimeClient.setState` → project/raw) |
| Optional end share | **FAIL then REPAIRED** (`display_end` nil-safe for open_ended) |
| Sam duplicate membership | **FAIL then REPAIRED** (ambiguous name no longer multi-adds) |
| Group human_surface `false` leak | **FAIL then REPAIRED** |
| Browser logout/login chronology | **NOT RUN** as full human gate (API re-session PASS) |
| Socket 20m dual client | **NOT RUN** |
| Figma 390px side-by-side | **NOT RUN** (shell was blank until fix; need founder re-shot) |
| Real residue episode | **NOT RUN** |
| Merge | **DO NOT MERGE** |

**Freeze status:** Intact for non-failure work. Four smoke-proven defects received minimal repairs and partial replay.

---

## BRANCH / SHA / TREE

| | |
|--|--|
| Branch | `build/v2-coded-experience-closure` |
| Pre-smoke checkpoints | `67b4439` → `e8e7f14` → `a81e1e3` |
| Tree before smoke | Clean at `a81e1e3` |
| API | `http://127.0.0.1:4000` health ok |
| Web | `http://127.0.0.1:5173` Vite from this worktree |
| Figma | `fy69K8cCug9prf5GLwQ7Hy` |
| Language / brand / logo nodes | `57:2` / `63:2` / `63:7` |
| Seed | `scripts/founder_review_seed.mjs` |
| Accounts | `+12025550101/111111`, Sam `+12025550107/777777`, Maya/Jordan/Chris fixtures |

Migrations: **already up** (incl. chronology).

Artifacts:

- `FOUNDER_SMOKE_RESULTS.json`
- `scripts/founder_smoke_run.mjs`
- `smoke-screenshots/` (partial; blank until setState fix)
- Figma pulls under `figma-diff/`

---

## LOGIN

| Check | Result |
|-------|--------|
| Activate founder | **PASS** — `Founder Review` |
| Display name not `You` | **PASS** |
| Secondary accounts | **PASS** |
| API re-session (new token) | **PASS** |
| Browser walkthrough lands | **PASS** after setState fix (`Skip` / `Continue` / OPAL) |
| Full UI login → Home cold | **PARTIAL** — shell mounts post-fix; full login flow not completed in headless this run |

---

## HOME 3-SECOND RESULT

| Check | Result |
|-------|--------|
| Conversations list | **PASS** (API) |
| Status soup labels | **PASS** (no Set / Still open as headline) |
| Group signal / human_surface | **PASS** after composition fix (was leaking `false`) |
| Duplicate peer Sam | **FAIL** pre-repair (2 Sam user rows) → membership resolver tightened |
| Home visual 3-second cold | **NOT COMPLETE** (blank shell blocked first pass) |

---

## MAYA RESULT

| Check | Result |
|-------|--------|
| Thread open / ordered messages | **PASS** (API) |
| Chronology durable | **PASS** (API re-fetch ids) |
| Full UI identity / Next/Last/SR | **NOT RUN** |

---

## JORDAN RESULT

| Check | Result |
|-------|--------|
| Thread open | **PASS** |
| Place gap language | **PASS** — `Italian dinner · place still open` |
| Incomplete plan semantics | **PASS** (API surface) |
| UI curate path | **NOT RUN** |

---

## OPTIONAL-END RESULT

| Check | Result |
|-------|--------|
| Create open_ended window (`end_at: null`) | **PASS** |
| Share open_ended to conversation | **FAIL** (`DateTime.to_iso8601(nil)`) → **REPAIRED** → **PASS** `display_end: null`, `open_ended: true` |
| Fabricated end | **Not observed** after repair |

---

## CURATE RESULT

**NOT RUN** (UI gate; shell broken for first half of run).

---

## PRIVATE/SHARED RESULT

| Check | Result |
|-------|--------|
| Private chronology foreign leak | **PASS** (API: 0 leaks) |
| Visual Only you vs shared | **NOT RUN** |

---

## CHRONOLOGY RESULT

| Check | Result |
|-------|--------|
| Durable moments present | **PASS** (Friends ~11) |
| Not telemetry kinds | **PASS** |
| Consequential kinds | place_open, time_recognized, constraints, member_added, venue_fit_changed, shared_reality |
| Interleave in UI | **NOT RUN** |

---

## REFRESH RESULT

| Check | Result |
|-------|--------|
| API re-fetch same ids | **PASS** |
| Browser hard refresh | **NOT RUN** |

---

## LOGOUT/LOGIN RESULT

| Check | Result |
|-------|--------|
| New session preserves chronology (API) | **PASS** |
| Browser sign-out / sign-in / scroll | **NOT RUN** (HARD GATE open) |

---

## CHRIS IDENTITY RESULT

**NOT RUN** (UI). API list shows multi-peer titles including Chris in group rows.

---

## GROUP RESULT

| Check | Result |
|-------|--------|
| Multi-member ConversationMember | **PASS** |
| Feels like group in API | peers multi-named |
| Human compression | **PASS** post-fix (no `false` in headline) |
| Constraint dump | **PASS** (human_surface clean) |

---

## SAM E2E RESULT

| Check | Result |
|-------|--------|
| Sam as real member | **PASS** with caveat |
| Duplicate Sam users (`sam_rev` + `sam-1059`) | **FAIL** → root: ambiguous `ilike` name resolve + double add path → **REPAIRED** (exact/unique only; ambiguous unresolved) |
| member_count 7 vs 6 | **FAIL** explained by duplicate Sam → fixed going forward |
| Sam send in Friends | **FAIL** (`ECONNRESET` once during API thrash) — retest after stability |
| Live group receive without reload | **NOT RUN** |

---

## GROUP RECOMPOSITION RESULT

Seed exercised Saturday / 7:30 / downtown / sushi / Sam / optional late.  
Chronology captured constraints + member_added + venue_fit.  
**UI compression** not fully founder-viewed.  
**PASS** at domain level; **PARTIAL** product visibility.

---

## AUTHORITY RESULT

Prior unit tests remain green for required/optional/2-of-5.  
**UI never shows Set** — API signal labels PASS.  
Full interactive authority smoke **NOT RUN**.

---

## PLACE RESULT

Jordan place gap **PASS** (`Italian dinner · place still open`).  
Full semantic ladder UI **NOT RUN**.

---

## MEMORY RESULT

**NOT RUN** this smoke (no Jordan quiet→lively interactive episode).

---

## EXTEND RESULT

**NOT RUN**.

---

## PLANS RESULT

**NOT RUN**.

---

## PROFILE RESULT

**NOT RUN**.

---

## BUTTON LIVE SWEEP

| Check | Result |
|-------|--------|
| Static sweep | **PASS** (prior `button_regression_sweep.mjs`) |
| Live every-control | **NOT RUN** (blocked by blank shell initially) |

---

## A↔B MESSAGE PROOF

**NOT RUN** (dual browser live).

---

## GROUP MESSAGE PROOF

**NOT RUN** (dual browser live). Sam history path partially attempted.

---

## SOCKET METRICS 0/5/10/15/20

**NOT RUN.**

| T | connectCount | reconnectScheduleCount | closeCount | errorCount | connectedLifetimeMs |
|---|--------------|------------------------|------------|------------|---------------------|
| 0–20 | — | — | — | — | — |

Founder must run dual clients. Quiet UI alone is insufficient.

---

## PRIVACY/BLOCK RESULT

| Check | Result |
|-------|--------|
| Private chronology isolation | **PASS** (API) |
| Block path regression | **NOT RUN** this smoke |

---

## FIGMA HOME / CHAT / SR / CURATE

| Screen | Result |
|--------|--------|
| HOME | **FAIL / NOT GRADED** — product blank until setState fix; no valid 390px founder screenshot vs `2:2` |
| CHAT | **NOT GRADED** |
| SHARED REALITY | **NOT GRADED** (Figma frame on disk only) |
| CURATE | **NOT GRADED** |

Pulled frames remain in `figma-diff/`. Side-by-side after shell fix is next founder action.

**Tokens ≠ fidelity. No PASS claimed.**

---

## MOTION RESULT

**NOT RUN** (no stable interactive shell until end of run).

---

## REAL RESIDUE RESULT

**NOT RUN.**  
Do not use `~12 → ~4` hypothesis.

---

## P0

| ID | Issue |
|----|-------|
| — | No confirmed privacy/security P0 this run |

*(Blank shell was effectively P0 for product usability → repaired.)*

---

## P1

| ID | Issue | Status |
|----|-------|--------|
| P1-SMOKE-01 | `RealtimeClient.stop` called missing `setState` → OpalApp crash / blank UI | **REPAIRED** |
| P1-SMOKE-02 | Open-ended availability share 500 (`to_iso8601(nil)`) | **REPAIRED** |
| P1-SMOKE-03 | Duplicate Sam membership (ambiguous name resolve) | **REPAIRED** (prevent forward) |
| P1-SMOKE-04 | human_surface headline included `false` | **REPAIRED** |
| P1-SMOKE-05 | Browser logout/login chronology | **OPEN** |
| P1-SMOKE-06 | Socket 20m dual client | **OPEN** |
| P1-SMOKE-07 | Exact Figma 390px comparison | **OPEN** |
| P1-SMOKE-08 | Real residue episode | **OPEN** |
| P1-SMOKE-09 | Friends conversation `signals: []` in one inspect path | **OBSERVE** / retest |

---

## P2

| ID | Issue |
|----|-------|
| P2-01 | Headless first screenshots empty/dark before React recovered |
| P2-02 | Multiple historical group conversations clutter Home list after repeated seeds |

---

## FAILURES REQUIRING REPAIR

**Done this run (minimal):**

1. RealtimeClient offline state  
2. Availability open_ended projection  
3. GroupMembership ambiguous Sam  
4. GroupComposition headline falsy leak  

**Still require founder/browser proof before more code:**

1. Logout/login chronology UI  
2. Socket lifetime  
3. Figma side-by-side  
4. Residue episode  
5. Dual live messaging  

---

## PASSING AREAS — FREEZE THEM

Do not churn:

- ConversationMember multi-party create  
- Durable chronology re-fetch id stability  
- Private chronology filtering  
- Jordan place-gap language  
- Open-ended window create (post-share fix)  
- Static button binding inventory  
- No status-soup labels on API signal headlines  

---

## MERGE VERDICT

**DO NOT MERGE.**

Smoke did its job: it found real product-breakers (blank shell, open-ended share 500, duplicate Sam). Those received **minimal** repairs only.

The four founder-defining gates remain **open**:

1. Browser chronology logout/login  
2. Socket 20–30m diagnostics  
3. Literal Figma 390px  
4. Measured residue  

---

## NEXT (FOUNDER)

1. Hard refresh web after Vite picks up RealtimeClient fix  
2. Login `+12025550101` / `111111`  
3. Re-run FOUNDER_PROOF_RUNBOOK.md gates 1–5 only  
4. Socket dual browser 20m  
5. Figma side-by-side with `smoke-screenshots` after successful login  

**HOLD.**
