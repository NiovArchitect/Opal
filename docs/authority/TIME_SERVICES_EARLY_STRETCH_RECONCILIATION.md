# Time Services — Early Stretch Reconciliation

**HEAD basis:** `5fcefb0` + surgical `peer_ready` media fix (this proof pass)  
**Classification:** EARLY_STRETCH_IMPLEMENTATION — not production time authority  
**Date:** 2026-09-08

## Law

```
REALITY CHANGED → OPAL KNOWS → MATERIALITY → USER VALUE CHANGED?
  NO  → SILENCE
  YES → ONE PRECISE CONSEQUENCE
```

A normal app says what time it is.  
Opal says only when time changes what you should do.

Not: `17 minutes remaining` (clock anxiety).  
Yes: silence for 17 minutes, then once — `Leave soon.`

## Inventory

| Service | Implementation | Source of time truth | Travel/ETA truth | Materiality | Event owner | Phoenix | Persistence | UI | Reduced motion | Notification dep | Production |
|---------|----------------|----------------------|------------------|-------------|-------------|---------|-------------|-----|----------------|------------------|------------|
| LeaveByMateriality | YES (`LeaveByMateriality`) | commitment `leave_by` / `scheduled_for` | **PARTIAL** — travel minutes often static/default in `LeaveBy` (not live traffic) | YES — window + already_notified silence | Outbox `action.leave_by_due` | user inbox `time:material` stub path | Outbox row when emitted | MaterialMomentChip (client) | Chip is static (no infinite pulse) | ReminderDelivery notify gate | NOT READY |
| MaterialTime gate | YES | delegates per kind | n/a | YES — silence default | classifier only | n/a | n/a | feeds chip | n/a | n/a | NOT READY |
| availability:overlap | YES (controller broadcast) | strongest_common_start | n/a | compressed one-suggestion | conversation channel | `availability:overlap` | share/window tables | refresh + optional chip | existing moment CSS | none | LOCAL only |
| Shared-now | classifier YES | shared window start | n/a | roster forbidden | MaterialTime | not wired to push | none | none yet | n/a | none | NOT BUILT delivery |
| MaterialMomentChip | YES | client evaluateMaterialMoment | n/a | alreadyShown set | client | listens overlap | memory only | calm chip once | no infinite anim | none | LOCAL only |
| ReminderDelivery leave-by gate | YES | scheduled_for as leave_by | PARTIAL | notify only when material | transport | n/a | delivery records in-memory shape | none | n/a | in_app transport | NOT READY |

## Leave-by law check (behavioral)

| Check | Result |
|-------|--------|
| Countdown / minute tick UI | **ABSENT** in MaterialTime / LeaveByMateriality |
| Silence when too early | **PROVEN** (ExUnit + vitest) |
| Material inside window | **PROVEN** |
| Already notified → silence | **PROVEN** |
| Origin coordinates exposed | **FALSE** in payload contract |
| Live traffic routing | **NOT** — `LEAVE_BY_WORLD_TRUTH = PARTIAL` |
| Background push delivery | **NOT_BUILT** |

## Proof commands (this pass)

- `mix test test/opal_core/social_flow/leave_by_materiality_test.exs test/opal_core/social_flow/material_time_test.exs` → 8/0  
- `npm test -- --run src/time/materialTime.test.ts` → 4/0  

## Claims not made

- Production leave-by push  
- Live ETA/traffic  
- `TIME_PRODUCTION_READY`  
- R3 complete via time services  
