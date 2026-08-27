# B2-01 — HEADER COLLISION ROOT CAUSE

**Authority:** 287:7  
**HOLD · DO NOT MERGE**

## Measured defect (before)

| Viewport | atRest headerCollision | scrolled headerCollision | Notes |
|---|---:|---:|---|
| 375×812 | **1** | 1 | header `right=391` > `vw+2`; `.gsh` locked to **390px** while `.pane` = **373px** |
| 390×844 | 0 | 1 | static header scrolled out of view (`top < -1`) |
| 393×852 | 0 | 1 | same |
| 430×932 | 0 | 1 | same |

### Geometry at 390 (healthy band)

| Object | Runtime | Figma approx |
|---|---|---|
| Header | h=58 · sticky after fix | 390×58 |
| Profile visual | 34×34 | 34×34 |
| Profile hit | 44×44 | touch ≥ visual |
| Search / Needs hit | 44×44 | visual control 36; hit may be ~44 |
| Search/Needs overlap | none | — |

## Root cause (exact — not guessed)

1. **375 overflow:** `.gsh.scroll` is a flex child with default `min-width: auto`. Intrinsic content kept Home at **390px** even when the parent `.pane` was **373px** on a 375 viewport. Header `getBoundingClientRect().right` exceeded the viewport → B.1 `headerCollision=1`.
2. **Scroll false collision / non-sticky:** `.gsh-top` was `position: static`, so mid-feed scroll moved the header above the viewport (`top ≈ -12` in B.1). Probe flagged collision on all widths after scroll. Product Home 287:7 expects the header to remain available.

**Not the cause:** hit targets being 44px (they fit inside 58px header; no Search↔Needs overlap). Header did not need to grow taller.

## Repair (surgical)

- `.gsh`: `width: 100%`; `min-width: 0` (allow flex shrink); keep `max-width: 390px`
- `.gsh-top` / `.gsh-top-spectral`: `width/max-width: 100%`; `position: sticky; top: 0; z-index: 30`; keep **height 58**
- Visual avatar **34** and hit **44** unchanged
- Header **not** made taller
- Layout not redesigned

## After proof

| Viewport | atRest | scrolled | horizontalOverflow | stickyTop when scrolled | StoriesRows |
|---|---:|---:|---:|---:|---:|
| 375×812 | **0** | **0** | 0 | 0 | 1 |
| 390×844 | **0** | **0** | 0 | 0 | 1 |
| 393×852 | **0** | **0** | 0 | 0 | 1 |
| 430×932 | **0** | **0** | 0 | 0 | 1 |

Evidence: `HEADER_COLLISION_MEASURE_BEFORE.json`, `HEADER_COLLISION_MEASURE_AFTER.json`

**FROZEN_AFTER_PHASE_B2:** header containment + sticky behavior (do not repaint 287:7 structure unless regression).
