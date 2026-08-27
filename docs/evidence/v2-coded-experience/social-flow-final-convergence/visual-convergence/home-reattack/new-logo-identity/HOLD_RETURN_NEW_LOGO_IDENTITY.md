# HOLD RETURN — P0 CANONICAL BRAND-ASSET IDENTITY REPAIR

**Date:** 2026-08-23  
**Branch:** `build/v2-coded-experience-closure`  
**Scope:** Brand assets only. No Chats. No Home rebuild. No Spectral palette reset.

---

## A. HOLD

**HOLD**  
**DO NOT MERGE**  
**permissionToStartLive = NO**  
**Chats not started**

---

## B. ROOT CAUSE

The founder-approved **Spectral Human Alignment** emblem (three humans → trajectories → shared alignment point) existed in Figma (`160:2` / `530:14`) but **was not the runtime product asset**.

Break in the chain:

1. **Figma** had the correct three-person mark at `160:2`.
2. **Repo** briefly gained filenames under `brand/spectral/` and `opal-graph/`, but
3. **Runtime import** pointed Splash + dock to `/brand/spectral/emblem-dock-rest.png`, whose **pixels were a generic spectral orb** (evidence: `WRONG_RUNTIME_emblem-dock-rest.png`, SHA `ad95949b…`, 12 181 bytes) — **not** the three-person mark.
4. **`OpalMark` / `BRAND_ASSETS.graphSymbol`** still pointed at the older Aug-17 `symbol-160-2-transparent.png` (SHA `3c7608eb…`) — a different raster, not the current hero mark.
5. Browser therefore requested and rendered the **wrong artwork** while filenames claimed “spectral emblem.”

Filename existence ≠ pixel identity. Proven by SHA mismatch vs master `9ac29a03…`.

---

## C. APPROVED REFERENCE

- Figma file: `fy69K8cCug9prf5GLwQ7Hy`
- Symbol-only master node: **`160:2`**
- Component: **`530:14`**
- Brand V4 board (documentation only): **`528:25`**
- Exported evidence: `FIGMA_160_2_RENAMED_MASTER.png`, `FIGMA_530_14_EXPORT.png`

Concept locked: people → conversation flow → alignment → shared point → life in motion. No speech bubble, no star-only, no old ring.

---

## D. FIGMA SYMBOL MASTER

| Field | Value |
|---|---|
| Node ID | **`160:2`** |
| Name | **BRAND MASTER — OPAL GRAPH — SPECTRAL HUMAN ALIGNMENT EMBLEM — SYMBOL ONLY** |
| Inner artwork | `525:2` — SYMBOL ONLY — Spectral Human Alignment Emblem — People / Paths / Shared Point |
| Component | `530:14` — Brand/Emblem/Spectral V4 — SYMBOL ONLY (component) |
| Screenshot | `FIGMA_160_2_RENAMED_MASTER.png` |

---

## E. WORDMARK MASTER

| Field | Value |
|---|---|
| Node ID | **`161:3`** |
| Name | **WORDMARK MASTER — OPAL GRAPH — TYPOGRAPHY ONLY** |
| Independent | YES — no emblem baked in |
| With brand lines | `161:2` — WORDMARK MASTER — OPAL GRAPH + BRAND LINES — TYPOGRAPHY ONLY |

---

## F. LOCKUP

| Field | Value |
|---|---|
| Node ID | **`525:7`** |
| Name | **BRAND LOCKUP — SYMBOL + WORDMARK — COMPOSITION ONLY** |
| Composition | Emblem (`160:2`) + typography (`161:3`) — not a single baked poster |

Brand board `528:25` remains **docs only** — never loaded as logo `src`.

---

## G. EXPORT FAMILY

| asset | dimensions | alpha | corner α=0 | SHA-256 | repo path |
|---|---|---|---|---|---|
| opal-graph-emblem-master.png | 1028×1028 | RGBA | YES | `9ac29a036d24483696c1e72a7d32e5523a941d3bef4e4a6e77dd34a0b25c1684` | `apps/opal_web/public/brand/opal-graph/opal-graph-emblem-master.png` |
| opal-graph-emblem-1024.png | 1024×1024 | RGBA | YES | `d7f5c185c6d4a2c68add9d7cc0cb332ac86c4d1c3266cf7eb7230a0b8fb453e3` | `…/opal-graph-emblem-1024.png` |
| opal-graph-emblem-512.png | 512×512 | RGBA | YES | `e6eab622daff04875ef03376fc20f1fe8817d48d34aeeeba70a500ecc2f01dee` | `…/opal-graph-emblem-512.png` |
| opal-graph-emblem-256.png | 256×256 | RGBA | YES | `312746453f0a436928a8c5334ab9cde5e97968f707931a097993d47d4f2d9490` | `…/opal-graph-emblem-256.png` |
| opal-graph-emblem-128.png | 128×128 | RGBA | YES | `e731e6097abc02d8ae2b4cf6bcffd17eea6b7692059a42e3bb38589ab99f778e` | `…/opal-graph-emblem-128.png` |
| opal-graph-emblem-64.png | 64×64 | RGBA | YES | `004330df85b88cfa9d9cc898c672ee350854639bb69292c1d3c5f05fedb21e8a` | `…/opal-graph-emblem-64.png` |
| opal-graph-emblem-dock.png | 112×112 | RGBA | YES | `dd17b8a5b498abfea236a2bad96336d31c6f56299aacb4ec375c789d822247b7` | `…/opal-graph-emblem-dock.png` |
| opal-graph-app-icon-1024.png | 1024×1024 | RGBA | NO (Midnight plate) | `22621bfe5f12ad3412fea5871aafd1fd75b3425bd90733cb918dd4d1d4335877` | `…/opal-graph-app-icon-1024.png` |

Machine table: `EXPORT_FAMILY.json`.

---

## H. OLD-ASSET AUDIT

### REPLACE (production runtime)

| Was | Now |
|---|---|
| Splash `/brand/spectral/emblem-dock-rest.png` (wrong orb) | `BRAND_ASSETS.opalGraphEmblemHero` → `opal-graph-emblem-1024.png` |
| Dock `/brand/spectral/emblem-dock-rest.png` | `BRAND_ASSETS.opalGraphEmblemDock` → `opal-graph-emblem-dock.png` |
| `OpalMark` → `symbol-160-2-transparent.png` | `BRAND_ASSETS.opalGraphEmblem*` family |
| `BRAND_ASSETS.graphSymbol` | alias → `opal-graph-emblem-512.png` |

Single source: `apps/opal_web/src/brand/brand.ts` → `BRAND_ASSETS.opalGraphEmblem*`.

### KEEP (historical / evidence)

- `symbol-160-2-transparent.png` (legacy Aug-17 export)
- `symbol-source-168-2-defective-black-plate.png`
- `WRONG_RUNTIME_emblem-dock-rest.png` (evidence of prior failure)
- Docs / live-closure brand boards

### DELETE LATER

- Unused obsolete runtime paths under `public/brand/spectral/emblem-dock-rest.png` once all caches drained (not deleted this HOLD).

---

## I. SPLASH

Founder URL screenshot: `I_SPLASH_FOUNDER_URL.png`  
Hero emblem visible: three figures, spectral separation, alignment point.  
DOM `src`: `/brand/opal-graph/opal-graph-emblem-1024.png` · natural **1024×1024** · HTTP **200**.

---

## J. PROMISE

Founder URL screenshot: `J_PROMISE_FOUNDER_URL.png`  
Promise structure preserved (Rooftop Jazz Graph, Enter Opal, TALK. ALIGN. GO.).  
Emblem via `OpalMark` → `/brand/opal-graph/opal-graph-emblem-512.png` · natural **512×512**.

---

## K. DOCK

Real-size dock capture: `K_DOCK_FOUNDER_URL.png` (+ `K_DOCK_HOME_CONTEXT.png`)  
`src`: `/brand/opal-graph/opal-graph-emblem-dock.png`  
natural **112×112** · rendered **56×56** · `data-brand-source=opal-graph-emblem-spectral-human-alignment` · `data-figma-symbol-only=160:2`  
Same mark family (three humans / trajectories / alignment), dock-optimized.

Header law preserved: Profile · Search · Needs You · emblem-only Talk to Opal.

---

## L. BROWSER NETWORK

| Surface | URL | Status | naturalWidth × naturalHeight |
|---|---|---|---|
| Splash | `http://127.0.0.1:5173/brand/opal-graph/opal-graph-emblem-1024.png` | 200 | 1024×1024 |
| Promise / OpalMark | `…/opal-graph-emblem-512.png` | 200 | 512×512 |
| Dock | `…/opal-graph-emblem-dock.png` | 200 | 112×112 |

Cache-bust: **new filenames** (not overwritten orb URL). Vite `Cache-Control: no-cache` + ETag on content.

Full JSON: `BROWSER_NETWORK_LOGO_PROOF.json`.

---

## M. PIXEL IDENTITY PROOF

`NEW_LOGO_PIXEL_IDENTITY_PROOF.png`

| LEFT | CENTER | RIGHT |
|---|---|---|
| Figma `160:2` | Runtime master `9ac29a03…` | Runtime dock `dd17b8a5…` |

Same three-person Spectral Human Alignment mark. Wrong prior orb SHA `ad95949b…` ≠ master.

---

## N. SPECTRAL STYLE REGRESSION

Intact:

- `--accent` / Opal Cyan: **`#00e5ff`**
- Midnight / Ink: **`#050816`**
- Alignment Gold · Living Coral · Opal Magenta · Graph Violet present in emblem + tokens
- Promise + Home header law not reverted

---

## O. FUNCTIONAL REGRESSION

Brand-asset pass only:

| Counter | Value |
|---|---|
| context reset | **0** |
| domain replacement | **0** |
| Graph rebuild | **0** |
| Home rebuild | **0** |
| new AI engine | **0** |
| engagement regression | **0** |
| Chats started | **0** |

Brand Vitest this pass: **37 passed** (`brandMark` + `figmaAlignment` + `s1Adversarial`).

---

## P. ZERO TRUST

Prior pre-live soak baseline (unchanged this asset-only pass): expected **6/6** foundation families remain the gate; **permissionToStartLive = NO**.  
See `pre-live-zero-trust/SOAK_REPORT.json` (prior candidate; not re-opened Live).

---

## Q. CONSOLE / NETWORK

Splash/Promise founder proof capture:

- console errors: **0**
- page errors: **0**
- logo requests: **200** (new emblem URLs only; no Neon Brand board as logo)

---

## R. FOUNDER URL

```
http://127.0.0.1:5173/?opal_reset_first_run=1&new_logo_runtime_proof=1787488140
```

One URL only. Open Splash first — the three-person emblem must be unmistakable before any copy.

---

## STOP

**HOLD**  
**DO NOT MERGE**  
**permissionToStartLive = NO**  
**Chats not started**
