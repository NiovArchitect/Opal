# Opal Continuity — Mobile Chrome + Center V2 (2026-09-10)

This document is the GitHub-facing continuity record for the founder correction that:

1. **Rejected** Center review `1086:2` (neural/dashboard composition).  
2. **Approved** wide frosted navigation + composer `1094:2`.  
3. **Approved** Center V2 Life Graph / Solo-First `1094:161` (+ `1105:*` behavioral states).

## Do not implement

- `1086:2` Center UI, neural-field-as-product, six permanent context boxes as the resting Center.

## Implement / preserve

| Surface | Authority | Status in code |
|---------|-----------|----------------|
| Shared dock | `1094:2` live geometry (6pt / 378×92 @390) | Implemented in `styles.css` native host + Option B |
| Composer | `1094:146` / 1086:156 lineage | Spectral edge, h54, viewport−32 |
| Home / Chats / Graphs / You content | Existing approved screens | Preserved; chrome only |
| Solo Center | `1094:161` | `OpalCenterLifeGraph.tsx` (Today → Conversation → Accepted → Week → Family) |
| Global Center | `618:902` | Still `OpalAmbient` when `?opal_global_opal=1` |
| Sticky Chats/Calls + Graphs filters | Founder chrome law | Native sticky CSS on `.comm-mode-bar`, `.calls-filter-bar`, `.graphs-lenses` |

## Product law (customer-facing)

Reward is **clarity + consequence**, not endless conversation:

Talk → Align → Go → Graph changes → Act with authority → Report truth → Stop talking.

Solo first. Relationships compound the same life graph. Privacy protects trust.

## Mapping detail

See `OPAL_CENTER_LIFE_GRAPH_1094_MAPPING.md`.

## Competitive intelligence (docs only)

External agents validate “open and talk.” Opal does not encode competitor product names into runtime identifiers. Architecture must stand if any competitor disappeared tomorrow.

## Proof

- `apps/opal_web/scripts/iphone-chrome-geometry-proof.mjs` — 375/390/393/430  
- Evidence: `docs/evidence/iphone-layout-2026-09-10/`
