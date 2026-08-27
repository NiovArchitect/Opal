# SEARCH 373:261 CLOSURE — Phase B.2 B2-03

**HOLD · DO NOT MERGE**

## Before → After

| | Status |
|---|---|
| Before (B.1) | **MAJOR_DIFF** — `position: relative` sheet (y≈152) because unlayered `.app > * { position: relative }` beat `@layer` `position: fixed` |
| After | **MINOR_DIFF** — full mobile-column `position: fixed` 390×844; dock visible (z=70 > 62) |

## Root cause of sheet presentation

Search CSS lived in `@layer brand-v4-components`. Unlayered `.app > * { position: relative; z-index: 1 }` won cascade → Search became in-flow relative content, not a full-column destination.

## Repair

1. Unlayered `.app .search-dest-373-261` shell (beats `.app > *`) with `left/right: 0`, `transform: none`, `max-width: 480`, dock clearance padding.
2. Markup: brand emblem + wordmark row, Back for prior-context, field + magnifier chrome, pills Top/People/Places/Experiences/Graphs, people avatars, place rows.
3. Same owner: `SearchDestination` only.

## Routing

| Proof | Result |
|---|---|
| Home magnifier → 373:261 | PASS |
| Back → Home prior context | PASS |
| Home tab → Home root | PASS |
| Escape dismiss | PASS |

## Mobile (Search open)

| Viewport | overflow | searchOverflow | backInView | headerCollision | dockOcclusion |
|---|---:|---:|---:|---:|---:|
| 375×812 | 0 | 0 | true | 0 | 0 |
| 390×844 | 0 | 0 | true | 0 | 0 |
| 393×852 | 0 | 0 | true | 0 | 0 |
| 430×932 | 0 | 0 | true | 0 | 0 |

## Residuals (MINOR_DIFF — founder-reviewable)

- Back chevron is additive vs Figma brand-only header (required for Back≠Home-root law).
- Graphs pill retained per product modes (Figma metadata showed Top/People/Places/Experiences; Graphs mode kept live).
- Result avatars are initials placeholders (DYNAMIC_SLOT) vs Figma photo fills.
- Exact type/spacing Δ vs Figma not claimed EXACT.

## FROZEN_AFTER_PHASE_B2

Search 373:261 — do not repaint unless shared primitive regression.

Evidence: `SEARCH_373_261_PROOF.json`, `runtime/SEARCH_373_261.png`, `figma/SEARCH_373_261.png`
