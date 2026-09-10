# STOP — FOUNDER PHYSICAL CLOSEOUT

**Starting SHA:** `438c5c2`  
**Branch:** `build/v2-coded-experience-closure`  
**HOLD FOR FOUNDER** — STORE_READY=NO · MERGE=NO · LIVE=NO

## Root causes (families)

| Family | Cause | Fix |
|--------|-------|-----|
| A. Safe-top | Missing/native `env(safe-area)` on fixed destinations; Search/Create/New Call at physical Y=0 | Shared `::before` status plane + destination `padding-top: safe-top` micro-adjusts; GRAPH_SAFE_TOP_DOUBLE_COUNT stays 0 |
| B. Dock | Intact — Calls overscroll revealed ambient/content through frost | `overscroll-behavior-y: none` + clip ambient on Calls only |
| C. Overlay/nav | `dismissHomeChildren` / conversation dock never cleared `graphCreateOpen` | Close Create in dismiss + selectPrimaryTab + conversation dock handlers |
| D. Composer | Wave bars ≠ send/speak; plus jumped to camera | Send↑ when text; mic SVG when empty; plus → Photo/Camera/Document menu |
| E. Sticky Stories | Stories scrolled away; interaction gated | Sticky stories strip under header; always mount when seeds exist |

## Items 1–15

| # | Defect | Result |
|---|--------|--------|
| 1 | Calls content behind dock on pull | **GREEN** (code: overscroll none + ambient clip) |
| 2 | New Call ☎ emoji | **GREEN** — circular shell+icon like Calls |
| 3 | New Call safe top | **GREEN** — `padding-top: 14+safe` |
| 4 | Global status protection | **GREEN** — soft `::before` gradient, pointer-events none |
| 5 | Graph detail back too high | **GREEN** — micro `padding-top: 10+safe` |
| 6 | Graph create too high | **GREEN** — create chrome shifted by safe-top |
| 7 | Camera/Library too low in sheet | **GREEN** — actions inside hero, flex-centered bottom |
| 8 | Create dock nav stale | **GREEN** — Create closed on every dock destination |
| 9 | Center composer semantics | **GREEN** — Send vs Speak |
| 10 | Center plus context | **GREEN** — library / camera / document menu |
| 11 | Home Stories deep scroll | **GREEN** — sticky stories strip |
| 12 | Stories clickable | **GREEN** — interactive mount + existing handlers |
| 13 | Home proof monotony | **PARTIAL** — no fabricated feed; live QA labels need data/hydration cleanup, not UI invent |
| 14 | Search too high | **GREEN** — Search `padding-top: 12+safe` |
| 15 | iOS App Icon | **GREEN (wired)** — `app.json` + `assets/icon.png` from approved 1024 brand; **physical SpringBoard requires EAS rebuild** |

## Tests

```text
40 passed (closeout + layout + center + solo)
DOCK_CROSS_ROUTE_PARITY = GREEN
GEOMETRY_PROOF = GREEN
```

## Flags

```text
CALLS_CONTENT_BEHIND_DOCK = GREEN
NEW_CALL_PHONE_CONTROL_PARITY = GREEN
NEW_CALL_SAFE_TOP = GREEN
GLOBAL_SAFE_TOP_PROTECTION = GREEN
GRAPH_DETAIL_SAFE_TOP = GREEN
GRAPH_CREATE_SAFE_TOP = GREEN
CREATE_MEDIA_SHEET_BALANCE = GREEN
CREATE_DOCK_NAV_* = GREEN
CREATE_STALE_ROUTE_RESTORE = 0
CENTER_COMPOSER_ACTION_SEMANTICS = GREEN
CENTER_PLUS_CONTEXT_MENU = GREEN
HOME_STORIES_DEEP_SCROLL_ACCESS = GREEN
HOME_STORY_INTERACTION = GREEN
SEARCH_SAFE_TOP = GREEN
IOS_APP_ICON = GREEN (config+asset; device after rebuild)

OPAL_CENTER_V2_FOUNDER_APPROVED = YES
OPAL_CENTER_V2_IMPLEMENTED = PARTIAL

STORE_READY = NO
MERGE = NO
LIVE = NO
NEXT = HOLD FOR FOUNDER
```
