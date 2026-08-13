# Intelligence Constitution Enforcement Pass

**Date:** 2026-08-13  
**Branch:** `build/v2-coded-experience-closure`  
**Canon base:** `fbaabed` (constitution establishment)  
**Mode:** Enforcement / discoverability / regression wiring  
**V2 merge:** **HOLD**

---

## Purpose

Make the established constitution operationally unavoidable for future agents without rewriting product intelligence or inventing a second governance system.

---

## Delivered

| Piece | Path |
|-------|------|
| Preflight | `scripts/intelligence_preflight.mjs` |
| Validate | `scripts/intelligence_validate.mjs` |
| Impact | `scripts/intelligence_impact.mjs` |
| Shared lib | `scripts/intelligence_lib.mjs` |
| One command | `scripts/intelligence_check.sh` |
| Enforcement config | `config/intelligence_enforcement.json` |
| Change template | `docs/intelligence/INTELLIGENCE_CHANGE_TEMPLATE.md` |
| Enforcement law | `docs/intelligence/ENFORCEMENT.md` |
| Golden bridge | `apps/opal_core/test/intelligence/golden_episode_bridge_test.exs` |

---

## Explicit non-goals

- No SocialReality / AvailabilityComposition semantic rewrite  
- No harness rewrite  
- No brand touch  
- No V2 merge  
- No second constitution  

---

## Verification

```bash
./scripts/intelligence_check.sh --with-tests
```

| Stage | Result |
|-------|--------|
| Preflight | PASS — constitution 1.0.0 MATCH, 28 caps, 10 inv, 8 episodes |
| Validate | PASS — no dangling IDs |
| `mix test test/intelligence/` | **26 pass / 0 fail** (invariants + golden bridge) |
| social_reality + matrix | **21 pass / 0 fail** |
| V2 merge | **HOLD** |
| Brand / harness / SocialReality semantics | **untouched** |

Impact sample (`INT-PLACE-001` + `social_reality.ex`) correctly expands dependents and lists episodes/invariants at risk.
