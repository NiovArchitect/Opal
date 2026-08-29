# P0-05.7 — FOUNDER-APPROVED GRAPH COMMITMENT STATES — HOLD RETURN

**HOLD. DO NOT MERGE. permissionToStartLive = NO. NO LIVE.**

## A. HOLD
Confirmed.

## B. Start HEAD / clean tree
Started from `47fbd177a79517e3a9f6dd3d378c58608bf4b21b` (clean). Checkpoint created after this pass.

## C–G. Figma proof (618:2 universe)
- **618:2** only product universe
- **618:9** governance text: Home Graph participation authorities base `618:149` · lock-in `738:2` · committed/Journey-available `738:35` — founder approved 2026-08-27
- **738:2** CURRENT — GRAPH LOCK-IN COMMITMENT — FOUNDER APPROVED
- **738:35** CURRENT — GRAPH COMMITTED / JOURNEY AVAILABLE — FOUNDER APPROVED
- **618:3296** wiring: Interested → lock-in → I'm going → Going ✓; accepts only current participant; never forces navigation; Open Journey → Journey when available

Screenshots: `figma/618-149.png`, `figma/738-2.png`, `figma/738-35.png`

## H–J. Safe single-participant domain mutation
- Added `JourneyAuthority.accept_going/2` — updates ONLY existing current-user `PlanParticipant` → `accepted`
- Does **not** call `activate/1`, does **not** create SharedPlan, does **not** accept others
- Route: `POST /api/v1/product/journeys/:id/accept-going`
- ExUnit: current-only accept, others unchanged, no plan fabricate, stranger denied

## K–O. Runtime states
| Phase | Figma | Runtime |
|-------|-------|---------|
| soft_interest | 618:149 | I'm interested (violet) + Open Graph → |
| lock_in | 738:2 | I'm going (Alignment Gold #FFC86B) + Open Graph → |
| going / going_journey | 738:35 | Going ✓ (gold) + Open Graph or Open Journey → |

Smoke (`SMOKE_PROOF.json`):
- before: `lock_in` / `738:2` / `2 going · 4 interested` / I'm going gold
- afterCommit: `going_journey` / `738:35` / `3 going · 3 interested` / Going ✓ / Open Journey — **same URL, no forced nav**
- afterOpenJourney: Journey surface mounted (`618:816`)

## P–U. Guards
- GOING_COMMIT_FORCES_NAVIGATION = false ✓
- OPEN_JOURNEY nav-only via `getJourney` ✓
- Graph Detail no Enter Journey ✓
- Direct Leave not Journey ✓
- Production firewall: seed only with `?opal_founder_seed=1` ✓

## V–X. Authority durability
- `OPAL_CURRENT_AUTHORITY.yaml` — `home_graph_participation` FOUNDER_APPROVED_CURRENT 2026-08-27
- `FIGMA_RUNTIME_LEDGER.yaml` — 618:149 / 738:2 / 738:35 CURRENT (`is_current_authority: true`)
- Removed from FOUNDER_REVIEW_REQUIRED
- `opal-authority-check.mjs` GREEN with P0-05.7 guards

## Y–AA. Tests / mobile
- Vitest `graphParticipation.test.ts` + updated `authorityRejectedStates`
- ExUnit JourneyAuthority + FounderGraphCommitmentSeed
- Mobile 375/390/393/430 — no footer overflow

## Founder seed
`FounderGraphCommitmentSeed` via existing SharedPlan/PlanParticipant owners; `POST /dev/founder-graph-commitment-seed`; opt-in only.

## Remaining
- Soft-interest Home cards without SharedPlan remain presentation soft interest (correct)
- Activity icon still FOUNDER_REVIEW_REQUIRED
- Global Opal / Live still paused

## FOUNDER_WALK_READY
YES for Graph commitment states with `?opal_founder_seed=1`

## STOP
HOLD. DO NOT MERGE. permissionToStartLive = NO. NO LIVE.
