# STOP — PHYSICAL IPHONE CHROME — FOUNDER CORRECTION #2

**Date:** 2026-09-10  
**Branch:** `build/v2-coded-experience-closure`  
**Starting HEAD:** `2828ca4`  
**Auth design:** UNCHANGED / FOUNDER APPROVED

## NEW PHYSICAL EVIDENCE

- Raw capture class: **1125×2436 → 375×812 @3x**
- Viewport class tested in proof: **375×812 · 390×844 · 393×852 · 430×932**

## ROOT CAUSE #1 — 375×812

- **What failed:** Prior matrix omitted the shorter/narrower class; fixed 358-wide dock + absolute slots assumed 390.
- **Fix:** Mandatory 375×812 in contract + geometry proof; dock `left/right: 16px`; slots scale from Figma 358 reference.

## ROOT CAUSE #2 — SAFE TOP

- **Home owner:** `.gsh-top` / `.gsh-top-spectral` (`padding-top: 8px + --opal-safe-top`)
- **You owner (failing):** App `.topbar` with **Opal Graph** wordmark still rendered on You hub (hidden for Chats/Graphs/settings only)
- **Settings owner:** `.you-settings-top|title|lede|body` absolute Y + `--opal-safe-top`; pane `bottom: --opal-primary-viewport-inset`
- **Fix:** Hide/collapse You hub topbar (`display:none` on native); keep shared settings safe-top; hub header uses pane safe-top.

## ROOT CAUSE #3 — DOCK WIDTH

- **Before:** `min(358px, 100%-32)` centered → capped skinny pill on ≥393; visually under-built
- **After:** `left:16; right:16; width:auto` → viewport−32
- **Approved relation:** 16pt side margins (~91.8% at 390)

| Viewport | left | right | width |
|----------|------|-------|-------|
| 375×812 | 16 | 16 | **343** |
| 390×844 | 16 | 16 | **358** |
| 393×852 | 16 | 16 | **361** |
| 430×932 | 16 | 16 | **398** |

## ROOT CAUSE #4 — DOCK HEIGHT / BACKGROUND

- Outer composition: **86px + safe-bottom**
- Visible bar: y22 → through safe-bottom (labels inside dark field)
- Label containment: `LABEL_BOUNDS ⊂ VISIBLE_NAV_BACKGROUND` (proof GREEN)
- Slots/orb: proportional horizontal from 358 Figma; vertical Y preserved

## ROOT CAUSE #5 — CONTENT UNDER DOCK

- **Previous model:** full-height scroll + `padding-bottom: --dock-clearance` → mid-scroll cards still paint behind dock
- **New model:** `.app[data-member-nav]` **`padding-bottom: --opal-primary-viewport-inset`** reserves dock zone; pane/scroll fill the clipped region; trail pad **14px only** inside scrollport
- **Viewport owner:** shared primary shell (Home / Chats / Graphs / You / Search / Person / dock-owned fixed dests)
- **Proof:** `contentBehindDock = 0`, gap scroll→dock = **12px** on all four viewports

## TESTS

```text
cd apps/opal_web
npm test -- --run src/theme/iphoneLayoutSystem.test.ts src/opalUi/soloOpal1075.test.ts
# 18 passed

node scripts/iphone-chrome-geometry-proof.mjs
# GEOMETRY_PROOF = GREEN (home+you × 4 viewports)
```

Evidence: `docs/evidence/iphone-layout-2026-09-10/GEOMETRY_PROOF_CORRECTION_2.json`

## FINAL GATES

| Gate | Status |
|------|--------|
| R1B_COMPLETE | YES |
| AUTH_DESIGN | FOUNDER APPROVED / UNCHANGED |
| VIEWPORT_375x812 | GREEN |
| IPHONE_TOP_SAFE_AREA_SYSTEM | GREEN (code/proof; physical retest) |
| YOU_SETTINGS_SAFE_AREA | GREEN (code/proof; physical retest) |
| BOTTOM_NAV_WIDTH | GREEN |
| BOTTOM_NAV_VISUAL_GEOMETRY | GREEN |
| BOTTOM_NAV_LABEL_CONTAINMENT | GREEN |
| BOTTOM_NAV_CONTENT_OCCLUSION | GREEN |
| PRIMARY_SCROLL_VIEWPORT | GREEN |
| PRIMARY_TAB_IPHONE_CHROME | GREEN (code/proof) |
| SOLO_OPAL_FOUNDER_APPROVED | YES |
| STORE_READY | NO |
| R3 | NO |
| TURN | NO |
| PUSH | NO |
| MERGE | NO |
| LIVE | NO |
| PHYSICAL_FOUNDER_RETEST | **READY** |

### Physical retest (small)

A. Home @375 — top chrome clears status; Memory cards never slide under dock  
B. Graphs — lower cards clip above dock; last card fully reachable  
C. You hub — **no Opal Graph topbar under clock**; “You” clears status  
D. Privacy / Notifications — header clears status; list clips above dock  
E. Dock — ~full width with 16pt margins; labels inside bar; one object  

**STOP.**
