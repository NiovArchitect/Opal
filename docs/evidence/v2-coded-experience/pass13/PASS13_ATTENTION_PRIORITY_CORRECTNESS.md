# PASS 13 — Attention Priority Correctness

**Date:** 2026-08-14  
**Branch:** `build/v2-coded-experience-closure`  
**HOLD. DO NOT MERGE.**

---

## EXECUTIVE STATE

Pass 12 accepted the sparse Home experience. Pass 13 closes the remaining **ranking correctness** gap:

> A later Friends Saturday place-open must not beat Jordan tonight place-open by Map/insertion order or settled-peer pollution.

**Result:** unit matrix A–G green · Elixir priority tests green · live 390 Home awaken = **Jordan Lee** (one CHOOSE, large void).

---

## INTELLIGENCE PREFLIGHT

```text
INTELLIGENCE CONTEXT LOADED
TARGET: INT-ATTN-001 / attention ranking only
CURRENT RANKING FUNCTION:
  evaluateAttention → scoreAttention (class + temporal + cost_of_delay + deadlines)
  → reality collapse → sort priority → band caps
  selectHomeAwaken: one CHOOSE by consequence urgency (not Map order)
INPUT FEATURES:
  next_gap, lifecycle_stage, requires_user_action, sufficiency
  minutes_until (explicit) OR inferred from when / leave_by labels
  action_deadline_minutes / external_deadline_minutes
  leave_by_relevant, personal_reality
  when labels: Tonight/Today/Tomorrow/weekday/clock
WEIGHTS / ORDERING (internal, never product copy):
  class base (action_required 40, time_sensitive 55, useful_now 30, …)
  + temporal proximity (≤1h 50 · ≤6h 30 · ≤24h 18 · …)
  + cost_of_delay (place open before imminent event 28–35; far weekday 5–6)
  + external deadline (≤15m 70 · ≤60m 45)
  + actionability/gap bonuses
TIEBREAKERS: stable conversation_id localeCompare
CAPS: maxNow/maxLater/maxQuiet after rank (unchanged Pass 11 law)
EXPECTED NON-CHANGES:
  filament budget, one-awaken presentation, SocialReality, brand,
  OS push unbuilt, no personal planner, no providers
```

---

## CURRENT RANKING ROOT CAUSE (before repair)

1. **Awaken selection used `filter(isConsequentialNeed).slice(0,1)`** on Map insertion order — not AttentionAuthority priority.  
2. **Temporal boost only when `minutes_until` was set** — live ProductSignals usually only have human `when` strings.  
3. **Peer collapse preferred stage `set` (rank 50) over actionable `still_open` (40)** — multi-seed Jordan pollution hid fresh place-open behind older settled dinners.  
4. **`isConsequentialNeed` ignored place-open on stage `set`** — live Jordan signals often arrive as `set` + `next_gap: place`.

---

## SCENARIO MATRIX

| ID | Case | Expected | Result |
|----|------|----------|--------|
| A | Tonight place-open vs Saturday place-open | Tonight | **PASS** |
| B | Tonight settled vs Saturday place-open | Saturday | **PASS** |
| C | Saturday external deadline 8m vs tonight place-open | Saturday may win | **PASS** |
| D | Personal leave-now vs social later | Personal may win | **PASS** |
| E | Insertion order reversed | Same winner | **PASS** |
| F | Recompute no delta | Stable winner | **PASS** |
| G | Winner place resolved | Next reality takes over | **PASS** |

Identity-bias: arbitrary labels same semantics — **PASS**.

---

## JORDAN REASONS (internal explain)

Typical tonight place-open score reasons:

- `class:action_required` / `base:next_gap_action`
- `temporal_within_6h` or `temporal_within_24h` (from Tonight / bare 6:30 clock)
- `delay_cost_high_event_within_6h` or `delay_cost_high_event_tonight_or_today`
- `actionability_bonus` · `gap:place`

## FRIENDS REASONS (internal explain)

- `class:action_required`
- `temporal_within_3d` / far weekday
- `delay_cost_low_later` or `delay_cost_moderate_within_2d`
- Same gap actionability — **lower delay + temporal** than tonight

**Winner:** Jordan tonight.

---

## LIVE MULTI-SEED RESULT

Harness: `scripts/pass13_attention_priority.mjs`

```text
PASS seed jordan=ce95c3f0 friends=446d1872 order=jordan_first
PASS login
PASS live_awaken_jordan — CHOOSE Where should dinner be? Jordan Lee · …
PASS home_one_awaken — awaken=1 presence≈0
PASS 5 / PRODUCT_FAIL 0
```

Screenshot: `docs/evidence/v2-coded-experience/pass13/shots/HOME_PRIORITY.png`

---

## HOME 390 RESULT

| | |
|--|--|
| Awaken | **Jordan Lee** — Where should dinner be? |
| Visible count | **1** CHOOSE + Living Void |
| Friends Saturday | Recedes (Plans horizon) |
| Residue | Not expanded — ranking only |

---

## REPAIRS MADE

1. `scoreAttention` / `selectHomeAwaken` — consequence urgency + explain reasons  
2. Infer `minutes_until` from human `when` / leave labels when explicit missing  
3. Cost-of-delay + external deadline features  
4. Wire Home awaken to `selectHomeAwaken` (not Map slice)  
5. `isConsequentialNeed`: actionable gaps including place-open on `set`  
6. Peer collapse `signalRank`: actionable unresolved > settled set; nearer when wins same peer  
7. Backend `AttentionAuthority.priority_score`: cost_of_delay + when-tonight labels + deadlines  
8. Live harness + evidence  

**Did not:** add attention system, OS push, planner UI, brand work, density expansion.

---

## INTELLIGENCE DIFF

| | |
|--|--|
| **IMPROVED** | Ranking correctness; awaken selection; peer collapse for multi-seed |
| **UNCHANGED** | Rank-before-cap pipeline; one awaken law; filament budget; SocialReality authority |
| **REGRESSED** | none |

---

## TESTS

- vitest attentionAuthority + sharedReality + opalUi: **87 passed**  
- ExUnit attention_authority (+ Pass 13 cases) + density proof: **26 passed**  
- intelligence_check --with-tests: **PASS**  
- pass13 live: **5/0**

---

## KNOWN GAPS

1. Awaken **meta copy** can still stack awkward when fragments (`6:3 · 6:30 PM`) — presentation polish, not ranking.  
2. ProductSignals still emit many residual multi-seed Jordan rows; ranking now picks correctly but fixture hygiene remains.  
3. `when` inference for bare clocks assumes evening social default — edge cases (true 6:30 AM) remain.  
4. OS push still blocked.  
5. Founder eyes still gate V2 merge.

---

## V2 MERGE VERDICT

**HOLD — DO NOT MERGE.**

Core attention model is now mature enough to stop touching unless live use exposes a failure. Next lanes (when ready): notifications policy · careful personal flow · providers/execution.
