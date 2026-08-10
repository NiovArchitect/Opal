# Adversarial Human Reality / Deep Collaboration Smoke

**Date:** 2026-08-10  
**Branch:** `build/adversarial-human-reality`  
**Standard:** No known P0/P1 across extensive matrix; bounded P2; soak stable; **not** “completely optimized for all humans.”

## Executive state

| Field | Value |
|-------|--------|
| Local matrix | CLEAN (after repair loop) |
| Hosted repeat | **NOT RUN** — Render API Unauthorized; do not fake |
| Pilot | **NOT READY** — hosted image still stale + migrations pending |
| Architecture invented | **None** by default |

## Modules

| Module | Role |
|--------|------|
| `AdversarialPersonas` | Operational behavior profiles (no moral labels) |
| `AdversarialConversation` | Natural corpus + weak-evidence discipline |
| `AdversarialJourneys` | Courtship / group / compound / privacy journeys + residue |
| `AdversarialSoak` | Seeded randomized soak + late-join×capacity×revision interaction |
| `AdversarialHumanReality` | Campaign orchestrator + defect severity + pilot honesty |

## Matrix executed (local)

| Suite | Result |
|-------|--------|
| Personas (14) + relationship types (8) | PASS |
| Natural conversation matrix | PASS |
| Weak evidence not over-upgraded | PASS |
| Courtship low-effort | PASS |
| Schedule withhold (no cause leak) | PASS |
| Location refused (no dead-end) | PASS |
| Venue failure preserve | PASS |
| Last-minute destination change | PASS |
| Contradiction current wins | PASS |
| Topic shift kills stale | PASS |
| Group partial 8 | PASS |
| Required person blocks majority | PASS |
| Organizer bias | PASS |
| Maturity mix 0–100% | PASS |
| Group scale 4/8/12/20 framing | PASS |
| Plan1→10 residue ↓ | PASS |
| Relationship scope isolation | PASS |
| Wrong memory correction | PASS |
| Privacy probe matrix | PASS |
| Prepare many / surface few | PASS |
| Popular irrelevant silence | PASS |
| Human solves first | PASS |
| Seeded soak (10 seeds) | PASS |
| Interaction: late join → capacity → revision | PASS |
| HumanValidation regression | PASS |

## Defects this campaign

| Severity | Discovered | Fixed | Open |
|----------|------------|-------|------|
| P0 | 0 | 0 | 0 |
| P1 | 1 | 1 | 0 |
| P2 | 0 | — | 0 |

### P1 fixed

1. **location_refused residue classification**  
   - **Layer:** residue taxonomy  
   - **Cause:** `open_maps` with `permission_denied` classified as `execution_limitation`  
   - **Repair:** `CoordinationResidue` prefers `missing_permission` when denied  
   - **Replay:** location_refused + full campaign green  

2. **natural phrase false-match**  
   - **Layer:** interpretation  
   - **Cause:** `~w` multi-word needles tokenized (`"you"` matched `"you guys…"`)  
   - **Repair:** full-phrase needle lists only  
   - **Replay:** phrase golden tests + matrix  

### Related minimal repairs

- `CorrectionLedger.propagate/1` for `venue_failure`, `destination_change`, `wrong_preference`  
  (was falling through generic dependent-only defaults — insufficient for preserve lists)

## Coordination residue

| Moment | Avoidable | Irreducible |
|--------|-----------|-------------|
| Plan 1 (proxy episode) | 6 | 1 |
| Plan 10 (proxy episode) | 0–1 | 1+ |
| Reduction | improved | agency preserved |

Target remains: **avoidable ↓**, not human involvement → 0.

## Privacy / authority

- Privacy probe matrix: PASS  
- Required person cannot be majority-overridden: PASS  
- Organizer 5× data does not expose scores/win-by-volume: PASS  

## Hosted

| Item | Truth |
|------|--------|
| GHCR image ready | `reality-closure-main-b29540b` (prior campaign) |
| Render deploy | Unauthorized API key |
| Hosted matrix | **Must re-run after founder key refresh** |

## Pilot

**NOT READY**

Exact blockers unchanged for hosted:

1. server_image_stale  
2. migrations_pending  

Local adversarial gate is necessary but **not sufficient**.

## Next executable action

1. Founder refreshes `RENDER_API_KEY` (GH secret + local).  
2. Deploy main durable image.  
3. **Repeat this exact campaign against hosted SHA.**  
4. Only then re-evaluate `PilotReadiness`.

## Machine entry

```elixir
OpalCore.SocialFlow.Execution.AdversarialHumanReality.run_all()
OpalCore.SocialFlow.Execution.AdversarialSoak.run(seeds: [1, 42, 99])
OpalCore.SocialFlow.Ambient.ChaosHarness.run("adversarial_human_reality_all")
```
