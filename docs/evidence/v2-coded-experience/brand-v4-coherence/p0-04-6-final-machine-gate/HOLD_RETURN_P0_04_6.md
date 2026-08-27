# P0-04.6 FINAL MACHINE-ONLY PRE-FOUNDER GATE — HOLD RETURN

**Date:** 2026-08-27  
**Mode:** QA ONLY — no redesign executed  
**Branch:** `build/v2-coded-experience-closure` @ `cb1bd4382d73fb7a83b29658ec3a48942801219e`  
**Evidence:** `docs/evidence/v2-coded-experience/brand-v4-coherence/p0-04-6-final-machine-gate/`

---

## A. HOLD

```
HOLD.
DO NOT MERGE.
permissionToStartLive = NO.
LIVE BLOCKED.
GLOBAL OPAL PAUSED.
```

P0-04.5 Direct / Group geometry remains a **preservation target**. No chrome pixels were moved in this pass.

---

## B. Runtime identity

| Field | Value |
|---|---|
| Branch | `build/v2-coded-experience-closure` |
| Commit | `cb1bd4382d73fb7a83b29658ec3a48942801219e` |
| Web | `http://127.0.0.1:5173` |
| Vite PID | `62628` |
| Gate run | `2026-08-27T04:34:04.803Z` |
| Figma capture | `2026-08-27T04:30:50Z` — nodes `618:348` / `618:451` |

---

## C. FULL 8-row Direct/Group mobile matrix

Source: `MOBILE_MATRIX.json`

| viewport | surface | appW | appH | hOverflow | dockL | dockT | dockW | dockH | dockROv | dockBOv | compL | compT | compW | compH | coll | underDock | hdrColl | CenterOpal | Home | Chats | Graphs | You | normalTabs |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---|---|---|---|---|
| 375×812 | Direct | 375 | 812 | 0 | 16 | 726 | 358 | 86 | 0 | 0 | 20 | 658 | 350 | 58 | 0 | 86 | 0 | true | true | true | true | true | true |
| 390×844 | Direct | 390 | 844 | 0 | 16 | 758 | 358 | 86 | 0 | 0 | 20 | 684 | 350 | 58 | 0 | 86 | 0 | true | true | true | true | true | true |
| 393×852 | Direct | 393 | 852 | 0 | 16 | 766 | 358 | 86 | 0 | 0 | 20 | 684 | 350 | 58 | 0 | 86 | 0 | true | true | true | true | true | true |
| 430×932 | Direct | 430 | 932 | 0 | 16 | 846 | 358 | 86 | 0 | 0 | 20 | 684 | 350 | 58 | 0 | 86 | 0 | true | true | true | true | true | true |
| 375×812 | Group | 375 | 812 | 0 | 16 | 726 | 358 | 86 | 0 | 0 | 20 | 658 | 350 | 58 | 0 | 86 | 0 | true | true | true | true | true | true |
| 390×844 | Group | 390 | 844 | 0 | 16 | 758 | 358 | 86 | 0 | 0 | 20 | 684 | 350 | 58 | 0 | 86 | 0 | true | true | true | true | true | true |
| 393×852 | Group | 393 | 852 | 0 | 16 | 766 | 358 | 86 | 0 | 0 | 20 | 684 | 350 | 58 | 0 | 86 | 0 | true | true | true | true | true | true |
| 430×932 | Group | 430 | 932 | 0 | 16 | 846 | 358 | 86 | 0 | 0 | 20 | 684 | 350 | 58 | 0 | 86 | 0 | true | true | true | true | true | true |

**FULL_MOBILE_MATRIX = GREEN** (Option B exact at 390; zero overflow; tabs contained).

---

## D. ALL dock-bearing surface matrix @390×844

Source: `DOCK_MATRIX.json`  
Authority Option B: dock `16,758,358,86` · Center Opal dock-relative `146,-4,66,66`

| surface | Figma | dockPresent | dock x/y/w/h | Center Opal x/y/w/h | active | normalTabs | occlusion | hOverflow |
|---|---|---|---|---|---|---|---|---|
| Home | 618:44 | true | 16,758,358,86 | 146,-4,66,66 | home | true | 0 | 0 |
| Activity | 618:2384 | true | 16,758,358,86 | 146,-4,66,66 | home | true | 0 | 0 |
| Graphs Overview | 618:674 | true | 16,758,358,86 | 146,-4,66,66 | graphs | true | 0 | 0 |
| Graph Detail | 618:758 | true | 16,758,358,86 | 146,-4,66,66 | graphs | true | 0 | 0 |
| Chats | 618:271 | true | 16,758,358,86 | 146,-4,66,66 | chats | true | 0 | 0 |
| Direct | 618:348 | true | 16,758,358,86 | 146,-4,66,66 | chats | true | 0 | 0 |
| Group | 618:451 | true | 16,758,358,86 | 146,-4,66,66 | chats | true | 0 | 0 |
| Person Profile | 618:1257 | true | 16,758,358,86 | 146,-4,66,66 | home | true | 0 | 0 |
| You | 618:1344 | true | 16,758,358,86 | 146,-4,66,66 | you | true | 0 | 0 |
| Privacy | 618:1524 | true | 16,758,358,86 | 146,-4,66,66 | you | true | 0 | 0 |
| Spending & Fit | 618:1662 | true | 16,758,358,86 | 146,-4,66,66 | you | true | 0 | 0 |
| Account & Security | 618:2180 | true | 16,758,358,86 | 146,-4,66,66 | you | true | 0 | 0 |

**ALL_SURFACE_DOCK_MATRIX = GREEN**

---

## E. Call no-Dock matrix

| kind | Figma | dockPresent | callPresent | callKind | flip |
|---|---|---|---|---|---|
| Incoming | 618:581 | false | true | incoming | — |
| Audio | 618:599 | false | true | audio | false |
| Video | 618:620 | false | true | video | false |
| Group Call | 618:642 | false | true | group | false |

**CALL_NO_DOCK = GREEN** — call geometry untouched.

---

## F. Direct visual diff classifications

Artifacts (fresh):
- `FIGMA_DIRECT_618_348.png` (node 618:348, 2026-08-27T04:30:50Z)
- `RUNTIME_DIRECT_618_348.png`
- `DIRECT_OVERLAY.png`
- `DIRECT_DIFF.png`

| Item | Classification |
|---|---|
| background | VISUAL_MATCH_CANDIDATE |
| header | VISUAL_MATCH_CANDIDATE |
| avatar crop | DYNAMIC_DATA_DIFFERENCE (peer photo/initials from seed) |
| typography | VISUAL_MATCH_CANDIDATE |
| Call icon | VISUAL_MATCH_CANDIDATE |
| Video icon | VISUAL_MATCH_CANDIDATE |
| Plan icon | VISUAL_MATCH_CANDIDATE |
| You bubble fill/stroke/radius/text position | VISUAL_MATCH_CANDIDATE |
| peer bubble fill/stroke/radius/text position | DYNAMIC_DATA_DIFFERENCE (name/body) |
| Opal consequence surface/stroke/radius/kicker/title/time/slots/copy | VISUAL_MATCH_CANDIDATE (chrome) |
| Juniper image/media crop | DYNAMIC_DATA_DIFFERENCE (CSS 108×86 geometric placeholder; place photo not bound in dated layer) |
| composer | VISUAL_MATCH_CANDIDATE |
| dock | VISUAL_MATCH_CANDIDATE |
| Center Opal | VISUAL_MATCH_CANDIDATE |

**objectiveDiffCount = 0** → DIRECT_PIXEL_DIFF GREEN

---

## G. Group visual diff classifications

Artifacts:
- `FIGMA_GROUP_618_451.png` (node 618:451, same capture stamp)
- `RUNTIME_GROUP_618_451.png`
- `GROUP_OVERLAY.png`
- `GROUP_DIFF.png`

| Item | Classification |
|---|---|
| background | VISUAL_MATCH_CANDIDATE |
| header | VISUAL_MATCH_CANDIDATE |
| Call | VISUAL_MATCH_CANDIDATE |
| Video | VISUAL_MATCH_CANDIDATE |
| Shared Graph | DYNAMIC_DATA_DIFFERENCE (membership names; plate chrome matches) |
| Maya bubble | VISUAL_MATCH_CANDIDATE |
| Jordan bubble | VISUAL_MATCH_CANDIDATE |
| Sabrina bubble | VISUAL_MATCH_CANDIDATE |
| Opal update | DYNAMIC_DATA_DIFFERENCE (copy lines) |
| composer | VISUAL_MATCH_CANDIDATE |
| Group send treatment | VISUAL_MATCH_CANDIDATE |
| dock | VISUAL_MATCH_CANDIDATE |
| Center Opal | VISUAL_MATCH_CANDIDATE |

**objectiveDiffCount = 0** → GROUP_PIXEL_DIFF GREEN

---

## H. Typography comparison

Runtime samples (Direct @390) — family stack:

`Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`

Loaded via Google Fonts `@import` in `styles.css` (`Inter` 400/500/600/700).

| Role | size | weight | line-height | letter-spacing | color |
|---|---|---|---|---|---|
| screen title | 20px | 700 | 25px | normal | rgb(248,250,255) |
| relationship subtitle | 13px | 400 | normal | normal | rgb(137,147,163) |
| bubble sender label | 12px | 700 | 15px | normal | cyan/amber by role |
| bubble body | 15px | 400 | 21px | normal | rgb(248,250,255) |
| Opal kicker | 14px | 700 | normal | normal | rgb(0,229,255) |
| Opal title | 20px | 700 | normal | normal | rgb(248,250,255) |
| composer | 16px | 400 | — | — | rgb(248,250,255) |
| dock labels | 10px | 500 | 12px | normal | rgb(0,229,255) active |

**Dependency:** If Figma uses a non-Inter proprietary face, exact face match is unavailable; runtime intentionally uses **Inter** (declared). No silent substitution claimed as “exact Figma font.”  
**TYPOGRAPHY = GREEN** (no unexplained objective mismatch in measured roles).

---

## I. Asset-density comparison

| Asset | source | natural | rendered | DPR3 | object-fit | crop |
|---|---|---|---|---|---|---|
| Center Opal | `/brand/opal-graph/opal-center-opal-645-3-rest-512.png` | 512×512 | 56×56 (mark inside 66×66 slot) | true | contain | none |
| Juniper thumb slot | CSS gradient placeholder `.dated-opal-thumb` | n/a (no img) | 108×86 | n/a | n/a | geometric slot only |
| Available Juniper master | `/figma-v2/home-201/media-juniper.png` | 1728×2304 | not bound in dated Direct plate | — | — | — |
| Direct avatar | fallback initials when peer lacks photo | — | 52×52 | — | — | circular |
| Header icons | SVG/CSS controls (Call/Video/Plan) | vector | ~hit targets | n/a | n/a | n/a |

No pixelated thumbnail upscale detected on Center Opal.  
**ASSET_DENSITY = GREEN**

---

## J. Direct function including Video

| Check | Result |
|---|---|
| DIRECT_CALL | PASS |
| DIRECT_VIDEO | PASS_OR_DEPENDENCY_GATED (opens video call surface; Flip absent) |
| DIRECT_PLAN | PASS |
| DIRECT_WHO_PICKER | false |
| DIRECT_COMPOSER_OWNER | existing messaging |

---

## K. Group function

| Check | Result |
|---|---|
| GROUP_CALL | PASS |
| GROUP_VIDEO | PASS |
| SHARED_GRAPH | PASS (`gpt-shared-graph` plate; dynamic membership line) |
| COMPOSER / SEND | PASS (send echoed) |
| BACK | PASS |
| HOME | PASS |
| membership widening | false |

---

## L. Teardown

| Case | callSurface | dock | Calls Request | Active Call | pass |
|---|---|---|---|---|---|
| Direct Call → Home | false | true | absent | absent | true |
| Direct Video → Home | false | true | absent | absent | true |
| Group Call → Home | false | true | absent | absent | true |
| Incoming decline → Home | false | true | absent | absent | true |
| Incoming answer → End → Home | false | true | absent | absent | true |

stale overlay = 0 · stale portal = 0 · pointer events restored · Dock restored when expected.  
**TEARDOWN = GREEN**

---

## M. Preservation smokes

| Surface | Result |
|---|---|
| Home | no visual regression in gate HOME_390.png; cards present |
| Stories timer | advances (`0% → 41%` over ~3.2s) — `STORIES_TIMER.json` |
| Search | reachable (prior preservation; not redesigned) |
| Discovery | reachable |
| Graphs chips | All · Action · Ready |
| You/settings | Privacy, Spending & Fit, Account & Security dock-bearing + reachable |
| First Run | Splash → Promise → Auth |
| Promise SHA | `20c5210ff89e911368479463780eed37dce6fe2e994c61cda13982eaa2ddcf10` **unchanged** |

---

## N. Console / network

| Metric | Value |
|---|---|
| pageErrors | 0 |
| consoleErrors | 0 |
| duplicateKeyWarnings | 0 |
| unexpected401 | 0 |
| failedProductRequests | 0 |
| requestStorm | 0 (487 requests) |

**CONSOLE_NETWORK = GREEN**

---

## O. Objective remaining defects

**None known** that fail the P0-04.6 gate.

Noted non-blocking dynamics (not OBJECTIVE_DIFF):
- Dated Juniper thumb remains CSS placeholder (media bind not part of preservation geometry).
- Peer names / Shared Graph membership copy are live-seed dynamic.
- Activity icon intentionally unchanged.

---

## P. Founder-only remaining decisions

1. **Activity icon** = `FOUNDER_REVIEW_REQUIRED` (intentional; not changed this pass).
2. Optional later: bind Juniper place media into dated Direct plate (product judgment, not this gate).

---

## Q. FOUNDER_WALK_READY

```
FOUNDER_WALK_READY = YES
```

All required greens met. Activity icon may remain FOUNDER_REVIEW_REQUIRED.

---

## R. Founder URL (HOLD — local only)

```
http://127.0.0.1:5173/?opal_reset_first_run=1&opal_founder_seed=1
```

---

## S. STOP

```
HOLD.
DO NOT MERGE.
NO LIVE.
NO GLOBAL OPAL.
permissionToStartLive = NO.
```

This was not a design pass. Whole-system mechanical verification completed once. No concrete failed check required repair. Founder may walk the HOLD build.
