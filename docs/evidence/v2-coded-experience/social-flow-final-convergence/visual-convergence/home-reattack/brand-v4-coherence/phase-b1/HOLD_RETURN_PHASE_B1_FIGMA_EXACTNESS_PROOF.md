# OPAL GRAPH — Phase B.1 Figma Exactness Proof Gap Closure

**HOLD · DO NOT MERGE · permissionToStartLive = NO · Chats feature tranche NOT STARTED**

No redesign. No new feature. No Live. Proof / completion pass only.

---

## A. HOLD

**AUTHORITY RESET = PASS** (unchanged)  
**BRAND V4 CORE = PASS CANDIDATE** (computed primitives exact)  
**RUNTIME HEALTH = PASS CANDIDATE** (console/network 0)  
**FULL FIGMA EXACTNESS = NOT PROVEN**  
**PHASE B = OPEN**  
**HOLD · DO NOT MERGE · NO LIVE**

---

## B. BYTE IDENTITY

| Field | Value |
|---|---|
| branch | `build/v2-coded-experience-closure` |
| HEAD | `cb1bd4382d73` |
| vite PID | `25239` |
| vite cwd | `opal-grok-real-people/apps/opal_web` |
| api PID | `8895` (`mix phx.server`) |
| founder URL | `http://127.0.0.1:5173` |
| proof at | `2026-08-24T04:44:50.951Z` |
| PROOF_PACKAGE SHA-256 | `3826f29779474b33cecc28724d7a2c99d3b04593ee63183a9b02994f10cca703` |

---

## C. CURRENT AUTHORITY MATRIX

**VALID (unchanged):**  
570:7 · 562:162 · 528:25 · 160:2 · 161:3 · 568:2 · 433:2 · 327:5 · 562:6 · 287:6 · 287:7 · 287:20 · 476:2 · 254:186 · 368:23 · 373:385 · 392:2 · 254:280 · 201:10 · 254:340 · 373:261 · 473:141 · 473:2

**INVALID (unchanged):**  
539:5 · 539:9 · 539:11 · 539:13 · 540:2 · 540:14 · 541:8 · 554:5

---

## D. ASSET COVERAGE BY SCREEN

Exclusion rule: TEXT / VECTOR / IMAGE / ICON_LIKE / AMBIENT / CONTROL = material. Bare SURFACE layout frames counted in descendants only unless IMAGE fill or ICON_LIKE naming. Completeness 473:2 is a section of many destinations.

| Node | Screen | Descendants | Material | IMAGE | VECTOR | ICON_LIKE | TEXT | CONTROL | AMBIENT |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 327:5 | Splash | 9 | 8 | 1 | 0 | 0 | 6 | 0 | 1 |
| 562:6 | Promise | 144 | 112 | 15 | 13 | 1 | 77 | 6 | 0 |
| 287:6 | Home | 220 | 176 | 20 | 30 | 14 | 101 | 7 | 4 |
| 287:7 | Header | 11 | 8 | 0 | 1 | 6 | 1 | 0 | 0 |
| 287:20 | Stories | 21 | 20 | 5 | 0 | 1 | 12 | 2 | 0 |
| 433:2 | Dock | 29 | 27 | 1 | 16 | 5 | 4 | 0 | 1 |
| 568:2 | DockMicro | 1 | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| 476:2 | Chats | 83 | 58 | 1 | 16 | 5 | 33 | 2 | 1 |
| 254:186 | Direct | 102 | 77 | 3 | 38 | 5 | 20 | 11 | 0 |
| 368:23 | Graphs | 84 | 52 | 1 | 16 | 5 | 27 | 1 | 2 |
| 373:385 | Graph Detail | 58 | 41 | 1 | 16 | 5 | 19 | 0 | 0 |
| 392:2 | Opal | 350 | 273 | 4 | 173 | 33 | 57 | 0 | 6 |
| 254:280 | Journey | 81 | 61 | 3 | 24 | 5 | 23 | 4 | 2 |
| 201:10 | Profile | 87 | 69 | 9 | 22 | 5 | 22 | 9 | 2 |
| 254:340 | You | 86 | 71 | 1 | 16 | 5 | 36 | 12 | 1 |
| 373:261 | Search | 85 | 57 | 1 | 17 | 5 | 32 | 0 | 2 |
| 473:141 | Needs You | 63 | 42 | 1 | 16 | 5 | 20 | 0 | 0 |
| 473:2 | Completeness | 940 | 641 | 18 | 224 | 71 | 320 | 2 | 6 |
| **TOTAL** | | **2454** | **1794** | | | | | | |

Coverage inventory = Figma descendant audit. Runtime resolution of every material child is **not** claimed EXACT — see Visual Status Matrix.

---

## E. MEASUREMENT COVERAGE BY SCREEN

Semantic objects measured on founder runtime (see `PROOF_PACKAGE.json`):

| Screen | Objects covered | Notes |
|---|---|---|
| Home | frame, header, profile, Search, Needs You, Stories, storyCreate, dock | Δ vs Figma ledger recorded |
| Header | height 58 match; control sizes 44 vs 36 | MINOR |
| Stories | 390×122; rows=1 | PASS geometry band |
| Dock | 356×86 vs 358×86 | MINOR |
| Search | frame/field/back | sheet geometry ≠ full-screen |
| Chats | frame, dock, row sample | hydration intermittent |
| Direct | **not measured on opened thread** | MAJOR gap |
| Graphs | frame | partial |
| Graph Detail | frame, title | sheet ≠ full-screen |
| Opal / Journey / Profile | visual compare; incomplete Δ tables | MAJOR / CONDITIONAL |

---

## F. VISUAL STATUS MATRIX

| Surface | Figma Node | Assets Resolved | Measurements Resolved | Runtime Screenshot | Interaction Proof | Mobile Proof | Visual Status | Residual |
|---|---|---|---|---|---|---|---|---|
| Splash | 327:5 | inventory 8 mat | major frame/emblem | YES | first-run path | — | **MINOR_DIFF** | type Δ not exhaustive |
| Promise | 562:6 | inventory 112 mat | frame/thesis | YES | Continue required | — | **MINOR_DIFF** | card media crops |
| Home | 287:6 | inventory 176 mat | header/stories/dock/controls | YES | Search/Needs/Forward | YES matrix | **MINOR_DIFF** | hit targets +12px-ish; header top−12 |
| Header | 287:7 | Search+Needs SVG exact | h=58; sizes Δ | YES | routing | — | **MINOR_DIFF** | 44 vs 36 |
| Stories | 287:20 | rail+create | 390×122 rows=1 | YES | open/close viewer | StoriesRows=1 | **MINOR_DIFF** | rings DYNAMIC |
| Dock | 433:2 / 568:2 | micro-emblem HD PASS | 356×86 | REST/TOUCH/LISTENING | tab coherence | dockOcclusion=0 | **MINOR_DIFF** | Δw=−2 |
| Chats | 476:2 | inventory | frame | YES | tab active | — | **MINOR_DIFF** | seed hydration flaky |
| Direct | 254:186 | inventory; stamp in code | **NO opened-thread Δ** | capture ≠ opened Direct | Plan→WHO not re-proven | — | **MAJOR_DIFF** | opened Direct not reliably captured |
| Graphs | 368:23 | inventory | frame | YES | tab | — | **MINOR_DIFF** | card media |
| Graph Detail | 373:385 | stamp 373:385 | sheet box | YES | Open Graph→detail | — | **MAJOR_DIFF** | bottom sheet vs full 390×844 |
| Opal | 392:2 | stamp; Figma 273 mat | ambient present | YES | LISTENING dock | — | **MAJOR_DIFF** | simplified Ambient ≠ living field (People/Places/Past/Availability missing) |
| Journey | 254:280 | code surface exists | incomplete | partial | Leave path partial | — | **MAJOR_DIFF** | full 254:280 not visually proven |
| Profile | 201:10 | ref on You | incomplete | CONDITIONAL capture | — | — | **CONDITIONAL** | person Profile not separately proven |
| You | 254:340 | stamp | tab coherence | YES (prior) | You active | — | **MINOR_DIFF** | Δ not exhaustive |
| Search | 373:261 | stamp | sheet box | YES | magnifier→373:261; Back | — | **MAJOR_DIFF** | modal sheet vs full-screen |
| Needs You | 473:141 | pulse icon exact | routing | YES | radar→473:141; no bell | — | **MINOR_DIFF** | sheet vs full |
| Completeness children | 473:2 | section inventory | destination table | partial | — | — | **mixed** | see completeness VISUAL |

**Freeze candidates (do not repaint):** Header icon identity (magnifier + pulse), Dock micro-emblem 568:2 family, Brand V4 primitive variables, StoriesRows=1, Search/Needs routing wires, dock REST/LISTENING state machine.

---

## G. MOBILE MATRIX

| Viewport | horizontalOverflow | dockOcclusion | bottomContentHidden | headerCollision | fixedOverlayBlowout | unreachableControl | PromiseCollision | StoriesRows |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 375×812 | 0 | 0 | 0 | **1** | 0 | 0 | 0 | 1 |
| 390×844 | 0 | 0 | 0 | **1** | 0 | 0 | 0 | 1 |
| 393×852 | 0 | 0 | 0 | **1** | 0 | 0 | 0 | 1 |
| 430×932 | 0 | 0 | 0 | **1** | 0 | 0 | 0 | 1 |

`headerCollision=1` from probe: Home header `getBoundingClientRect().top ≈ −12` (clipped under viewport). Residual — not claimed pass.

---

## H. HIGH-DPI ASSET MATRIX

| Asset | Natural | Rendered CSS | DPR | Required (≥ CSS×DPR) | Status |
|---|---:|---:|---:|---:|---|
| Dock Trio Orb (`opal-dock-orb-trio-112.png`) | 112×112 | 56×56 | 2 | 112 | **PASS** |
| Search magnifier SVG | 36×36 | 22×22 | 2 | vector | **PASS** |
| Needs You pulse SVG | 36×36 | 22×22 | 2 | vector | **PASS** |
| Primary emblem 1024 | 1024×1024 | Splash ~152 CSS | 2 | 304 | **PASS** band |
| Story/Memory/Discovery/Profile media | DYNAMIC_SLOT | varies | 2 | fixture-dependent | CONDITIONAL |

SHA-256 dock micro 112: `cb2bb1e0d58b06ae6ab723241bef650c83f5e7e8c8d5e0330fc7661a86326b26`  
SHA-256 emblem 1024: `d7f5c185c6d4a2c68add9d7cc0cb332ac86c4d1c3266cf7eb7230a0b8fb453e3`

---

## I. DOCK REST / TOUCH / LISTENING

| State | Result |
|---|---|
| REST | `data-dock-state=rest` · `data-opal-state=rest` · **PASS** |
| TOUCH | pointer-down captured; restrained; not forced listening · **PASS** |
| LISTENING | only while Opal ambient open · **PASS** |
| restAfterListening | returns to rest · **PASS** |

---

## J. ACTIVE TAB COHERENCE

| Context | Result |
|---|---|
| Home | only Home active · PASS |
| Chats | Chats active · Home off · PASS |
| Graphs | Graphs active · PASS |
| You | You active · Home off · PASS |

---

## K. SEARCH ROUTING

Home header magnifier → `373:261` **PASS**  
Back → Home **PASS** · staleOverlay=0  
No generic search substitute · magnifier SVG exact · **PASS** (routing)  
Visual status of destination remains **MAJOR_DIFF** (sheet vs full-screen).

---

## L. NEEDS YOU ROUTING

Home header radar/pulse → `473:141` **PASS**  
**NO BELL** · icon=`icon-needs-you.svg` · **PASS**  
Semantic “Needs you” / meaningful social changes · **PASS**

---

## M. HOME ROOT / BACK

Contextual Back from Search → prior Home · **PASS**  
Home tab from nested Search → Home root · **PASS**  
Behaviors remain separate.

---

## N. FORWARD / OVERLAY

| Metric | Result |
|---|---:|
| staleFragments | 0 |
| trappedOverlay | 0 |
| duplicateSend | 0 |
| open | true |
| Escape dismiss | true |
| cancel dismiss | true |
| Home-root dismiss | true |

---

## O–V. PRINCIPAL SCREENS (summary)

- **O Chats** — MINOR_DIFF; list present when hydrated  
- **P Direct** — **MAJOR_DIFF**; opened Direct not reliably captured on founder URL this pass  
- **Q Graphs** — MINOR_DIFF  
- **R Graph Detail** — **MAJOR_DIFF**; bottom sheet ≠ full-screen 373:385  
- **S Opal** — **MAJOR_DIFF**; Ambient help ≠ Figma living field  
- **T Journey** — **MAJOR_DIFF**; full 254:280 not visually proven  
- **U Profile** — **CONDITIONAL**  
- **V You** — MINOR_DIFF  

---

## W. COMPLETENESS DESTINATIONS

See `visual/COMPLETENESS_473_2_DESTINATIONS_VISUAL.md`. Mixed NOT_IMPLEMENTED / CONDITIONAL / MINOR_DIFF. No Live behavior added.

---

## X. CSS CASCADE AUDIT

Hierarchy: Brand V4 primitives → semantic roles → component `@layer` · unlayered `:root` hammer at end of `spectralTokens.css` so Living Void / `styles.css` cannot silently revert `--accent`.

`CASCADE_CONFLICTS_FOUND` (intentional clobber of Brand primitives by later unlayered sheet): **0** in import order.  

Computed `--accent` / `--opal-cyan` = `#00e5ff` **PASS**.

Note: hammer is intentional protection, not a second global design system. Hardcoded component hex in `styles.css` is a **separate legacy leak** issue (below), not a cascade-order conflict.

---

## Y. RUNTIME LEGACY BRAND LEAK AUDIT

| Class | Count | Notes |
|---|---:|---|
| production `#6ee8f5` in `styles.css` | **46** | pre-V4 Living Void accent still hardcoded on many selectors |
| other audited pre-V4 accents in src | 0 | |
| historical/evidence | n/a | |
| intentional non-brand semantic / human media | preserved | not indiscriminately replaced |

**RUNTIME_LEGACY_BRAND_LEAKS = 46** (target 0).  
Do **not** global search-replace. Semantic role migration required. Founder decides priority.

---

## Z. COMPOUNDING INTELLIGENCE

```
CONTEXT_RESET = 0
DUPLICATE_OWNER = 0
PARALLEL_HOME = NO
PARALLEL_GRAPH = NO
PARALLEL_OPAL_ENGINE = NO
STATIC_PRODUCTION_HOME = NO
LOCAL_ONLY_ENGAGEMENT = NO
WHO_RESTART = NO
```

---

## AA. ZERO TRUST

Prior ExUnit pre-live zero-trust **6/6** retained.  
**No domain code modified** in this Phase B.1 proof pass → no mandatory rerun. Evidence: `ZERO_TRUST.txt` + prior `ZERO_TRUST_EXUNIT.txt`.

---

## AB. CONSOLE / NETWORK

| Metric | Count |
|---|---:|
| pageErrors | 0 |
| consoleErrors | 0 |
| unexpectedNetworkFailures | 0 |
| asset404s | 0 |
| duplicateKeyWarnings | 0 |
| unhandledRejections | 0 |
| ReactBoundaryTrips | 0 |

---

## AC. EVIDENCE

Root:  
`docs/evidence/v2-coded-experience/social-flow-final-convergence/visual-convergence/home-reattack/brand-v4-coherence/phase-b1/`

- `PROOF_PACKAGE.json`  
- `DESCENDANT_COVERAGE.json`  
- `BYTE_IDENTITY.txt` · `FOUNDER_URL.txt` · `ZERO_TRUST.txt`  
- `figma/*.png` · `runtime/*.png`  
- `visual/*_VISUAL.md` (16 screens + Completeness)  
- `scripts/phase_b1_figma_exactness_proof.mjs`

---

## AD. SHA / CI

PROOF_PACKAGE SHA-256: `3826f29779474b33cecc28724d7a2c99d3b04593ee63183a9b02994f10cca703`  
DESCENDANT_COVERAGE SHA-256: `b20d29eec6e897f09a232288648a9ed1ac3e2d959f608a5deb2b53b6a6c1f24f`  

**DO NOT MERGE.**

---

## AE. FOUNDER URL

**http://127.0.0.1:5173**

PID vite=`25239` · api=`8895` · branch=`build/v2-coded-experience-closure` · HEAD=`cb1bd4382d73`

---

## ICON_SUBSTITUTIONS_FOUND

**Founder-locked header/dock icons = 0 substitutions.**

- Search = exact magnifier SVG (`/figma-v2/header/icon-search.svg`)  
- Needs You = exact radar/pulse (`icon-needs-you.svg`) ≠ bell  
- Dock center = 568:2 micro-emblem family  

Broader screen icon audit vs every Figma VECTOR child across 1794 material nodes is **not** claimed complete; principal locks above pass.

---

## PHASE B EXIT GATE

| Gate | Status |
|---|---|
| material asset coverage proven | inventory YES · per-asset EXACT resolution NO |
| major measurement coverage proven | partial · not exhaustive |
| principal screens Figma↔runtime compare | YES with honest labels |
| honest status labels | YES |
| mobile matrix pass | **FAIL** headerCollision=1 |
| dock states pass | YES |
| route proofs pass | YES (Search/Needs/HomeBack/Forward) |
| console/network pass | YES |
| zero trust 6/6 | YES retained |
| compounding intelligence intact | YES |

**Phase B does NOT close.**

Largest honest gaps for founder review: **392:2 Opal**, **254:186 Direct**, **254:280 Journey**, **373:385 Graph Detail geometry**, **373:261 Search geometry**, **46 legacy `#6ee8f5` leaks**, **headerCollision**.

---

## STOP
