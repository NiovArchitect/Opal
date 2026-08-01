# Social Flow 5 — Agency Agent Assignments

**Branch:** `build/social-flow-5-contextual-discovery`  
**Baseline:** `cbf226fa1626caf212a4a262f7e295153389f645`  
**Orchestrator:** Agent Zero

| Role | Mission | Primary files | Completion |
|------|---------|---------------|------------|
| Agent Zero | Integration, CI, merge, commercial integrity | full slice | PASS |
| Product Manager | Journey resolution vs marketplace | evidence, journeys | PASS |
| Marketplace Integrity (composite) | Organic/sponsored separation | Discovery rank + labels | PASS |
| Recommendation Architect | Hard/soft constraints, diversity | Discovery, discovery_rank.py | PASS |
| Relationship UX | Group option language | explanations | PASS |
| Behavioral Ethicist | No scarcity/emotional targeting | mobile copy filters | PASS |
| Elixir Architect | Intent gate, providers, selection, handoff | discovery.ex, synthetic_providers.ex | PASS |
| Python AI Architect | Ranking proposals only | discovery_rank.py | PASS |
| Contract Architect | discovery_rank capability | contracts schemas | PASS |
| Privacy | Min disclosure, no raw messages | provider_disclosure audit | PASS |
| Security | URL validation, Taylor denial | handoff validation | PASS |
| Mobile | Option helpers, a11y sponsorship | discoveryOptions.ts | PASS |
| Test Architect | Journeys A–E | discovery_test.exs | PASS |
| UI Finish | Plan resolution not ad feed | copy review | PASS |

## Catalog gap

**Marketplace Integrity Specialist** — composite of Product Manager + Behavioral Ethicist + Privacy + UX + ranking.

## Disagreements

None. Integration decisions:

1. Intent required before any provider call.
2. Hard constraints never overridden by sponsorship.
3. Synthetic providers only; allowed handoff hosts only.
4. Budget disclosed only as price band, never exact private ceiling.
