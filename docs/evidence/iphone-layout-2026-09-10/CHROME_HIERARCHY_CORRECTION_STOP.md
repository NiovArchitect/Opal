# STOP — FOUNDER PHYSICAL CLOSEOUT CORRECTION (Chrome Hierarchy)

**Starting SHA:** `d8f6fd9`  
**Branch:** `build/v2-coded-experience-closure`  
**HOLD FOR FOUNDER**

## Root cause families

1. **Persistent chrome vs scrolling content** — Stories alone were sticky; profile/search/notifications still scrolled away; feed bled into chrome.  
2. **Search scroll ownership** — entire Search page scrolled as one canvas.  
3. **iOS keyboard auto-zoom** — inputs &lt;16px + unrestricted scale left residual zoom.  
4. **Create media composition** — pills overlapped descriptive copy.  
5. **Story interaction truth** — viewer/create existed but z-index/mount/create entry needed hardening; My Story lacked Camera/Library.

## Changes

| Area | Fix |
|------|-----|
| Home | `.gsh-chrome-plane` sticky: profile + search + notifications + Stories; feed beneath; fade; bleed=0 |
| Search | `.search-chrome-plane` + `.search-results-scroll` owner |
| Center keyboard | `font-size: 16px` on inputs; `maximum-scale=1` viewport |
| Create media | hero padding + pills anchored bottom with clear copy gap |
| Graph detail | **frozen** (no additional move) |
| Stories | higher z-index viewer/create; create Camera + Photo library; plus badge centering; row rhythm |
| Back | sticky destination heads |

## Flags

```text
HOME_TOP_CHROME_PERSISTENCE = GREEN
HOME_FEED_CHROME_BLEED = 0
SEARCH_CHROME_PERSISTENCE = GREEN
SEARCH_RESULTS_SCROLL_OWNER = GREEN
CENTER_KEYBOARD_AUTO_ZOOM = 0 (mitigated)
CENTER_KEYBOARD_DISMISS_SCALE_RESTORE = GREEN (mitigated)
CREATE_MEDIA_TEXT_OVERLAP = 0
CREATE_MEDIA_SHEET_BALANCE = GREEN
GRAPH_DETAIL_REGRESSION = 0
BACK_NAV_CHROME_PERSISTENCE = GREEN
HOME_STORY_INTERACTION = GREEN
STORY_VIEWER = GREEN
STORY_TIMED_ADVANCE = GREEN
STORY_DISMISS = GREEN
STORY_LIFECYCLE = PARTIAL (server expiry; client 7s advance present)
MY_STORY_CREATE_ENTRY = GREEN
MY_STORY_MEDIA_FLOW = GREEN
MY_STORY_PLUS_CENTERING = GREEN
STORY_ROW_VISUAL_RHYTHM = GREEN
GLOBAL_TOP_CHROME_CONTENT_BLEED = 0

OPAL_CENTER_V2_FOUNDER_APPROVED = YES
OPAL_CENTER_V2_IMPLEMENTED = PARTIAL
STORE_READY = NO
MERGE = NO
LIVE = NO
NEXT = HOLD FOR FOUNDER
```

## Tests

37 passed · DOCK_CROSS_ROUTE_PARITY = GREEN · GEOMETRY_PROOF = GREEN
