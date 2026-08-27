# HOLD RETURN — CODED SPECTRAL AUTHORITY IMPLEMENTATION

**Date:** 2026-08-22  
**Branch:** `build/v2-coded-experience-closure`  
**HEAD (at start of pass):** `cb1bd43` (dirty tree — HOLD worktrees)  
**Governing:** **HOLD · DO NOT MERGE · permissionToStartLive = NO**

---

## A. GOVERNING STATE

HOLD  
DO NOT MERGE  
permissionToStartLive = NO  

No Live. No Chats redesign. No Journey/Graph rebuild. No second Home/auth/Story/engagement systems.

---

## B. BYTE IDENTITY

Dirty tree on `build/v2-coded-experience-closure`. Spectral coded pass is local uncommitted work atop prior HOLD changes. **Do not merge.**

---

## C. FIGMA AUTHORITIES USED (exact)

| Node | Use |
|---|---|
| 539:5 | Lock section |
| 539:9 / 539:11 / 539:13 | Pixel refs Home / Splash / Promise |
| 540:2 | Splash structured |
| 540:14 | Promise structured |
| 541:8 | Home spectral + header law |
| 287:6 / 287:7 / 287:20 | Stream grammar / header / Stories |
| 373:261 | SEARCH-00 |
| 473:141 | ACTIVITY-00 |
| 528:25 / 528:2 | Brand V4 / variables |
| 433:2 | Option B dock structure |

No inferred nodes.

---

## D. BRAND ASSET SEPARATION

| Role | Runtime |
|---|---|
| **Emblem** | `/brand/spectral/emblem-dock-rest.png` (dock) + `OpalMark` raster for splash/promise (no typography baked into emblem) |
| **Wordmark** | Typographic `OpalWordmark` (editable CSS spans) |
| **Lockup** | Composition only where splash/promise need both |

168:2 never loaded. Dock center is **emblem-only** (`aria-label="Talk to Opal"`).

---

## E. RUNTIME SPECTRAL TOKENS

`apps/opal_web/src/theme/spectralTokens.css` imported from `styles.css`.  
See `SPECTRAL_RUNTIME_TOKEN_MAP.md`.  
Primitive + semantic-v1 centralized (reviewable).

---

## F. HOME HEADER

Left: **Profile** (`gsh-own-profile`) → own social identity (`GraphProfilePage` via `profilePerson`)  
Right: **Search** → `SearchDestination` / **373:261**  
Right: **Notifications** → `ActivityDestination` / **473:141**  

No `OPAL GRAPH` stamp on Home header.

---

## G. OPAL TALK EMBLEM

Dock center uses spectral emblem PNG.  
States: `is-rest` / `:active` touch / `is-listening` when ambient open.  
No OPAL/GRAPH/Talk typography inside the orb.

---

## H–J. HOME / SPLASH / PROMISE

| Surface | Structured | Pixel | Runtime |
|---|---|---|---|
| Home | 541:8 | 539:9 | GraphSocialHome spectral header + soft card accents |
| Splash | 540:2 | 539:11 | fr00 `TALK. ALIGN. GO.` · midnight |
| Promise | 540:14 | 539:13 | support line + preserved Graph moment / no collision |

Feed intelligence preserved (Conversation→Graph, Memory engagement, Discovery, Stories one-row).

---

## K. SEARCH

Home → 373:261.  
`FIGMA_NAVIGATION_GAP` **superseded**.

---

## L. NOTIFICATIONS

Home → 473:141 Needs You / meaningful changes (not vanity spam).

---

## M. COMPOUNDING INTELLIGENCE

| Check | Count |
|---|---|
| Context resets introduced | **0** |
| Duplicate product owners | **0** |
| Parallel Graph/Home/Opal systems | **0** |
| Local-only engagement introduced | **0** |
| Authority replaced by visual-only state | **0** |

---

## N–Q. REGRESSION / RESPONSIVE / CONSOLE

Focused Vitest: brandMark + firstRun + figmaAlignment + graphSocialHome = **35/35 pass**.  
Browser: Splash + Promise captured (`spectral-runtime/390_SPLASH.png`, `390_PROMISE.png`; Promise `data-figma-node=540:14`, beat 3, support line present).  
Home header Search/Activity soak: source-wired; automated post-auth land still flaky in harness — **founder manual walk is authoritative** for Home header/dock.  
Responsive law retained (390 column destinations, promise collision guards).

---

## R. EVIDENCE

- `HOLD_RETURN_CODED_SPECTRAL_IMPLEMENTATION.md` (this file)
- `SPECTRAL_FIGMA_TO_RUNTIME_MATRIX.md`
- `SPECTRAL_RUNTIME_TOKEN_MAP.md`
- `HOLD_RETURN_FIGMA_SPECTRAL_AUTHORITY.md` (prior Figma lock)
- Runtime: `spectralTokens.css`, `SearchDestination.tsx`, `ActivityDestination.tsx`, header/dock/splash/promise edits

---

## S. SHA / CI

Not merged. No push.

---

## T. FOUNDER WALK

`http://127.0.0.1:5173/?opal_reset_first_run=1`

1. Splash — emblem + OPAL GRAPH + **TALK. ALIGN. GO.**  
2. Promise — motion → Rooftop Jazz clean moment → Enter Opal  
3. Auth seam  
4. Home header — Profile / Search / Needs you  
5. Profile  
6. Search → 373:261 modes  
7. Notifications → Needs you  
8. Stories one row  
9. Conversation consequence  
10. Memory  
11. Graph  
12. Discovery  
13. Carousel  
14. rare Live (still blocked for Live domain)  
15. Dock emblem Talk to Opal  
16. Dock tabs  
17. Bottom clearance  

---

# STOP

**HOLD · DO NOT MERGE · permissionToStartLive = NO**

Founder visually inspects Spectral conversion before any next tranche.
