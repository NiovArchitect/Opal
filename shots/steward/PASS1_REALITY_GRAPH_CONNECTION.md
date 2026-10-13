# Pass 1 — Reality graph connection (steward audit)

**Date:** 2026-10-12  
**Tip:** (this commit)  
**Authority:** `MASTER_PRODUCTION_CONTINUITY_HANDOFF.md` · `STATE_SURFACE_CONTRACT.md`  
**Milestone:** whole-system coherence → production validation  
**Rule:** Intelligence expansion HOLD. Close contradictions; do not invent features.

## Chain under audit

```text
Conversation → Decision → Commitment → Plan → Graph → Home → Attention
(+ Notifications · History)
```

Completion law: a state change is incomplete until every representing surface agrees.

## Canonical owners (already in product)

| Concern | Owner module |
|---------|----------------|
| Agreement truth | `ConversationAlignment` / SharedPlan |
| Temporal lifecycle | `PlanStateArbitration` (+ Clock) |
| Follow-through / jobs | `TemporalFollowThrough` + Oban |
| Who to interrupt | `AttentionAuthority` / Attention Center |
| Where / how to project | `SurfaceProjection` (A8) |
| Home body (social) | `homeHydration` prefer-real / EMPTY |
| Strand UI mode | CSO (min) |

## Baseline proof (this pass)

| Suite | Result | Notes |
|-------|--------|-------|
| `plan_state_arbitration_test.exs` | **25 / 0** | Fort Oak time-travel; PAST ≠ Next Together / Ready / future exec; memory law; impossible combinations |
| `attention_center` + `temporal_follow_through` + alignment (batch) | **33 / 0** | Chain jobs + attention upsert paths |
| `surface_projection` + `attention_authority` + `conversation_alignment` | **56 / 0** | ONE TRUTH / ONE ACTION decision matrix |
| `homeHydration.test.ts` | **12 / 0** | Prefer-real; seed-off EMPTY |
| `scripts/a8_cross_surface_proof.mjs` | **PARTIAL** | Minted DeviceSessions unlock Walk A/B under `production_sms` (no SMS). Propose path was **500 MultipleResultsError** (6 SharedPlans on Fort Oak) → **fixed**. Remaining: fixture commitment not `aligned`/`execution_ready` → honest **422 not_committed** until Walk A/B plan lineage is restored to committed state. |

Local services during run: Phoenix `/health` 200 `production_sms`; Vite 200.

## Surface completeness matrix (restaurant-plan example)

| Surface | Domain owner | Automated proof today | Gap |
|---------|--------------|----------------------|-----|
| Conversation / Thread | Alignment + CSO | mix alignment + PSA | Browser A8 GATED under production_sms |
| Decision / Commitment | Alignment / SharedPlan | mix | — |
| Plan temporal | PlanStateArbitration | **PASS** Fort Oak matrix | — |
| Graph list / detail | SurfaceProjection + FE Graphs | mix SurfaceProjection; Past filter historically GREEN | Physical confirm still founder for some ledger PARTIAL rows |
| Home | homeHydration + consequence cards | prefer-real + EMPTY **PASS** | Real-account consequence projection from live plans needs end-to-end with minted sessions |
| Attention | AttentionAuthority + Center | mix **PASS** | Cross-surface browser GATED |
| Notifications | Push / Digest workers | code path; physical push GATED (TestFlight) | Prod API payment-blocked |
| History / Past | PSA + Graphs Past lens | mix + prior automation GREEN | — |

## Highest remaining coherence risks (not new features)

From `REGRESSION_LEDGER.md` still **PARTIAL** / pending physical:

| ID | Risk | Steward action |
|----|------|----------------|
| R-LAYER-COLLAPSE | Plan set vs execution approval collapsed in UI | Keep distinct projections; browser proof when sessions mintable |
| R-MEM-PRIV | Memory rendered as social post | Prefer-real Home must never promote private memory |
| R-GRAPH-CLIP | Status pill clip | Geometry only if re-broken; do not redesign |
| A8 browser under production_sms | Cross-surface Playwright blocked on fixture OTP | Add DeviceSession mint path for A8 (no SMS) — next compound fix |
| Seed auto-enable on LAN | Real accounts could still see seed if heuristic fires on TestFlight? | Audit production profile: seed must stay opt-in only |

## What Pass 1 will NOT do

- No Meta Muse–style capability race
- No deleting founder seed modules
- No Render rewrite while payment is down
- No random UI polish unrelated to state contradiction
- No claiming browser A8 PASS without evidence

## Coherence fix landed this pass

| Issue | Fix |
|-------|-----|
| `Repo.get_by(SharedPlan, conversation_id:)` → MultipleResultsError when 6 Fort Oak plans exist | `ConversationAlignment.active_plan_for_conversation/1` (newest active). Used by `lineage_id`, `upsert_plan`, moment bridge, call outcomes, Walk reset script. |
| Regression | `active_plan_for_conversation_test.exs` **PASS** |
| SMS gate for A8 | `founder_proof_fixture.activate` falls back to `/tmp/opal_minted_walk_sessions.json`; `scripts/mint_walk_sessions.exs` |

## Next autonomous compound steps (ordered)

1. ~~Unblock A8 auth without SMS~~ **Done** (mint path).
2. Restore Fort Oak Walk A/B **committed** alignment (place + time locked → `commitment` aligned/execution_ready) without inventing new intelligence — then re-run full A8 browser matrix.
3. Close any RED surface contradiction found (smallest fix + regression).
4. Only then Pass 2 relationship substrate (Observed→Candidate→Confirmed→Durable).
5. Pass 3 after founder restores Render payment.

## Settings three-state law (reinforced)

Every visible control: **Live** · **Honest roadmap gate** · **Not shown**. Never fake toggle. See `SETTINGS_WIRE_AUDIT.md`.
