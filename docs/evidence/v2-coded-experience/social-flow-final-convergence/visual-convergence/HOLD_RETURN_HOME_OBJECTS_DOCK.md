# HOLD RETURN — Home object grammar + Option B dock

**HOLD. DO NOT MERGE. DO NOT START LIVE.**

## Status correction (accepted)

| Surface | Status |
|---|---|
| **Home overall** | **MAJOR_DIFF** |
| Stories 287:20 | **EXACT — FROZEN** (did not regress) |
| Header 287:7 | **EXACT — FROZEN** |
| Conversation 289:2 | **CONVERGING** (structure/grammar implemented; not claiming EXACT) |
| Memory 289:24 | **CONVERGING** |
| Graph 289:39 | **CONVERGING** |
| Discovery 289:72 | **CONVERGING** |
| Carousel 289:84 | **PARTIAL** (carousel track/dots present; fixture mediaSrcs sparse) |
| Live 289:97 | **CONVERGING** (visual projection only; Host≠Broadcaster preserved) |
| Dock 433:2 | **CONVERGING** (dip SVG + floating Opal Rest; ~356×86 @ bottom) |
| Chats / Direct / Graphs / Opal / Journey / You | **NOT AUDITED** |

**Home remains MAJOR_DIFF** until object grammars + dock are EXACT vs Figma side-by-side.

---

## What this pass did

1. Corrected matrix: Home overall ≠ MINOR while objects/dock MAJOR.
2. Froze Stories one-row + header (browser-asserted again).
3. Rebuilt Conversation→Graph card to Figma 289:2 grammar (turns, cyan trajectory, shared history, CONVERSATION badge, Open Graph).
4. Rebuilt Memory / Graph / Discovery / Live card shells toward Figma nodes (distinct badges, headers, trajectory for Graph, Follow≠Connection for Discovery, Live attribution).
5. Rebuilt Option B dock to 433:2: floating-bar dip asset, Figma icons, floating Opal Rest orb (no Listening unless explicit).
6. Did **not** expand Live lifecycle.

## Proof

- `scripts/visual_home_objects_dock_proof.mjs` → **failed: 0** / `HOLD_HOME_OBJECTS_DOCK_PROGRESS`
- Stories still: `data-stories-rows=1`, height 122
- Conversation geometry ≈ 366×372 at y≈194
- Dock ≈ 356×86, `data-figma-dock=433:2`, dip asset present, Opal Rest
- Vitest Home: 19 passed
- Pre-Live zero-trust ExUnit: 5 passed (preserved)

## Founder walk

`http://127.0.0.1:5173/?opal_reset_first_run=1`

1. Home header + **one** Stories row (frozen)
2. Conversation card vs Figma `289:2`
3. Memory / Graph / Discovery / Live vs references in `visual-convergence/references/`
4. Dock cradle + floating Opal Rest vs `FIGMA_433_2_DOCK.png`
5. Tap Open Graph / social actions — not dead

Ask: **“Does this finally look like the Home I approved in Figma?”**  
This return’s honest answer: **Not yet EXACT — but Stories stay correct and core grammars/dock are converging.**

## Checklist (abbrev)

1. Branch: `build/v2-coded-experience-closure`
2. Functional baseline: `7078cd7`
3. Pre-Live repairs: preserved uncommitted
4–5. Visual SHA: uncommitted / HEAD tip dirty
6. Dirty tree: yes
7. Figma audited: 287:6/7/20, 289:2/24/39/72/84/97, 433:2
8–12. Home MAJOR_DIFF; Stories EXACT; objects CONVERGING; dock CONVERGING
40. Home overall: **MAJOR_DIFF**
44. Story single-row: PASS (frozen)
46–49. Vitest 19; ExUnit zero-trust 5; browser objects/dock proof 0 fail
63. product SHA: still `7078cd7` baseline
65. Reset URL: `http://127.0.0.1:5173/?opal_reset_first_run=1`
69. HOLD
70. **permissionToStartLive = NO**

STOP after Home + dock. Return to founder.
