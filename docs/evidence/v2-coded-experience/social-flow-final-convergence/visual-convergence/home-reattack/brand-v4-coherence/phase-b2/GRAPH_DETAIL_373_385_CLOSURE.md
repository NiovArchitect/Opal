# GRAPH DETAIL 373:385 CLOSURE — B2-05 ONLY

**HOLD · DO NOT MERGE · permissionToStartLive = NO**

## A–C Identity / Authority

| Field | Value |
|---|---|
| Branch | `build/v2-coded-experience-closure` |
| HEAD | `cb1bd43` |
| Vite | PID **5197** · cwd `.../opal-grok-real-people/apps/opal_web` |
| API | PID **5148** · cwd `.../opal-grok-real-people/apps/opal_core` |
| URL | http://127.0.0.1:5173 |
| Figma | `373:385` · coherence `570:7` · recovery `562:162` · brand `528:25` |

## D. Before root cause

Runtime used a **bottom-sheet-like / relative** presentation because:

1. Unlayered `.app > * { position: relative }` competed with destination `position: fixed`.
2. `left: 50%` + `transform: translateX(-50%)` produced off-column geometry (same class of bug as Search B2-03).

Measured before: `position:relative`, `y≈152`, transform offset — not full-screen 373:385.

## E. Domain owner

**Single owner:** `GraphDetailSheet` ← `FOUNDER_HOME_FEED` card id via `graphDetailCardId` in `OpalApp`.

- Home: `onOpenGraphDetail(cardId)` → same sheet  
- Graphs: `onOpenGraph(cardId)` → same sheet  
- Journey: `onEnterJourney` → existing `activateJourney` / SharedPlan path (not embedded Journey UI)

```
NEW_GRAPH_OWNER = 0
NEW_GRAPH_DETAIL_DOMAIN_OBJECT = 0
LOCAL_ONLY_GRAPH_COPY = 0
PARALLEL_GRAPH = NO
PARALLEL_JOURNEY = NO
```

## F. Lineage

| Entry | Card id | Reality |
|---|---|---|
| Home Open Graph | `seed-consequence-chanelle` | Juniper & Ivy · Chanelle · 7:30 PM |
| Graphs Open | `seed-chanelle-juniper` | Juniper & Ivy · Chanelle · 7:30 PM |

Same **GraphDetailSheet** owner and Juniper Reality projection. Feed card ids differ (consequence vs graph kind) — not a second domain. Journey commit uses conversation + card place/time into existing SharedPlan activator.

## G–H Assets / measurements

See `GRAPH_DETAIL_373_385_ASSETS.md` · `GRAPH_DETAIL_373_385_MEASUREMENTS.md`  
UNRESOLVED_MATERIAL_ASSETS = 0 · major geometry resolved for shell/card/CTA.

## I. Visual repair

- Unlayered `.app .ogsn-graph-detail.social-dest-373-385` full-column fixed shell (z=62, dock z=70).
- `data-presentation="full-column"`.
- Truthful travel/provider copy; Maps deep link; entrySource for Back copy.
- No new Graph/Journey system.

## J. Runtime truth

See `GRAPH_DETAIL_373_385_RUNTIME_TRUTH.md`.

## K. Navigation

| Action | Result |
|---|---|
| Back from Home entry | Home · PASS |
| Back from Graphs entry | Graphs · PASS |
| Home tab from detail | Home root · PASS |

## L. Mobile

All four widths: overflow 0 · dockOcclusion 0 · fixedOverlayBlowout 0 · headerCollision 0.  
See `GRAPH_DETAIL_373_385_MOBILE.json`.

## Q. Visual status

| | |
|---|---|
| Before | **MAJOR_DIFF** |
| After | **MINOR_DIFF** |
| Freeze | **GRAPH_DETAIL_373_385 = FREEZE_CANDIDATE** |

### Residuals (honest)

- Back chevron additive vs Figma brand-only header (required for Back≠Home law).
- Brand mark size sm vs Figma 30×30 lockup.
- Home vs Graphs feed card ids differ while Reality matches (documented).
- Segments toggle is extra vs Figma primary Ready layout (collapsed by default).
- Exact letter-spacing / ambient ellipse not claimed EXACT.

## R. Freeze status

**FREEZE_CANDIDATE** — do not revisit during Opal/Journey unless shared regression proven.

## S. Evidence

`phase-b2/GRAPH_DETAIL_373_385_*.md|json` · `figma/FIGMA_373_385.png` · `runtime/RUNTIME_373_385_HOME_ENTRY.png` · `runtime/RUNTIME_373_385_GRAPHS_ENTRY.png`

## T. Founder walk

1. Open http://127.0.0.1:5173  
2. Home → Open Graph → full-screen Juniper Ready  
3. Back → Home  
4. Graphs → Open Graph → full-screen Juniper  
5. Confirm no “traffic included” / no “Reserved”  
6. Open directions → external Maps  

**STOP. Do not start B2-06 Opal.**
