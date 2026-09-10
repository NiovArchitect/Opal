# STOP — PHYSICAL IPHONE CHROME CORRECTION #3

**Figma:** `1114:2` FOUNDER DIRECTION — Compact Floating Chrome + Home Signal Icons  
**Center:** `1094:161` UNCHANGED / FOUNDER APPROVED  
**Rejected physically:** 92pt + safe-bottom frost slab

## DOCK (live 1114:2)

| Viewport | L/R | width | outer h | field | float |
|----------|-----|-------|---------|-------|-------|
| 375×812 | 10 | **355** | **74** | 60 @ y10 r26 | above safe+8 |
| 390×844 | 10 | **370** | **74** | 60 | above safe+8 |
| 393×852 | 10 | **373** | **74** | 60 | above safe+8 |
| 430×932 | 10 | **410** | **74** | 60 | above safe+8 |

`bottom: calc(safe-bottom + 8)` · `height: 74` · **NOT** `74+safe`  
Opal 86×64 @ 142,0 · spectral Cyan→Gold→Magenta · labels inside material  
CONTENT_BEHIND_DOCK = 0 · soft pane fade · ambient may continue

## STICKY

- Chats/Calls: **one** `.comm-sticky-chrome` owner (title + Chats|Calls + All|Missed)  
- Graphs: **one** `.graphs-sticky-chrome` owner (Your Graphs + Add + All|Action|Ready)  
- Same Midnight plane + soft lower fade — no page-on-page card  
- Calls row content **preserved** (no visual redesign)

## HOME CONTROLS

- Opal Lens → Search (`opal-lens-search.svg`)  
- Opal Signal → Needs You (`opal-signal-needs-you.svg`)  
- 40pt frosted circular hits

## PROOF

```text
npm test — 23 passed (layout + sticky + icons)
node scripts/iphone-chrome-geometry-proof.mjs — GEOMETRY_PROOF = GREEN
# dockHeight=74 on all sizes; floats above safe+8
```

## FLAGS

```text
COMPACT_FLOATING_DOCK = GREEN
UNIFIED_STICKY_CHROME = GREEN (code)
HOME_SIGNAL_ICONS = GREEN
OPAL_CENTER_CONTENT = UNCHANGED
CALL_ROW_VISUAL_REDESIGN = NO
PHYSICAL_FOUNDER_RETEST = READY
STORE_READY = NO · MERGE = NO · LIVE = NO
```
