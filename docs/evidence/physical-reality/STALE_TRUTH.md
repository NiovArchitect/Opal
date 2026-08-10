# Stale truth & trust (runtime)

**Law:** Opal must know when its intelligence is no longer trustworthy.

## Principles

1. **Freshness is part of truth** — value alone is insufficient.
2. **Trust ≈ authority × freshness × scope** (`TrustFact`).
3. **High confidence can still be stale.**
4. **Plan version is a hard boundary** (`PlanVersion`) — late provider/outbox must not attach.
5. **Failure radius is bounded** — preserve still-valid dimensions (`RecoveryPreservation`).
6. **Trust before dopamine** — never surface exciting moments from weak/stale state.
7. **Trust failure tests required** — silence when untrustworthy.

## Modules

| Module | Role |
|--------|------|
| Freshness | Source-specific half-life |
| TrustFact | usable / must_not_surface_from |
| PlanVersion | reject old plan_version responses |
| Resurface | material vs noise |
| Incremental | recompute only dependents |
| StaleSuppression | fingerprint + quiet after surface |
| RecoveryPreservation | alignment dimensions kept |

## Chaos stale scenarios

Covered in ChaosHarness: old plan version provider, stale location, required decline after surface, version bump invalidate list, recovery preserve, trust silence, out-of-order provider, block.
