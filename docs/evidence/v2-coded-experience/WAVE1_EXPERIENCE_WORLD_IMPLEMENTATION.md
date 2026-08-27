# EXPERIENCE WORLD V2 — WAVE 1 IMPLEMENTATION

**HOLD. DO NOT MERGE.**  
**Branch:** `build/v2-coded-experience-closure`  
**Base SHA (pre-commit):** `0d456ab`  
**Scope:** Brand/opening + V2 primitives + Home 2:2 + Chat 3:2 shell/filaments + Shared Reality 4:2 foundation  

Not in this wave: Social Moment, Curate rewrite, Extend visual, Temporal UI, Group visual, Plans 5:31.

---

## EXECUTIVE STATE

Wave 1 **code foundation is in place**:

- Figma `63:7` brand asset resolved (raster working ref, not final master)
- Canonical mark path `/brand/opal-mark-current.svg` (+ working PNG ref)
- Opening uses 63:7 working raster in Living Void walkthrough welcome
- Shared V2 primitives module created and wired into Home / Chat / SR
- Home: one awaken only, presence energies, current mark, Figma structure
- Chat: filament awaken/transform primitives + private plate + organic bubbles
- Shared Reality: signature plate with optional when/where/travel (omit if no truth)
- Web tests: **100/100 pass**
- Production build: **pass**

**Visual product 390 diffs for authenticated Home/Chat/SR:** not fully captured in this session (no founder session seed in headless path). Figma references saved. Opening product screenshots captured at 375/390/430.

**Founder eyes required** for pixel acceptance of member surfaces against live seed.

---

## FIGMA 63:7 BRAND ASSET TRUTH

| Fact | Value |
|------|--------|
| Node | `63:7` IMAGE — CURRENT OPAL LOGO REFERENCE |
| Dimensions | Frame 1000×1000; export PNG **2000×2000**; raw JPEG **1024×1024** |
| Asset type | **IMAGE fill** (raster) — **no SVG/vector export from node** |
| imageHash | present (Plugin API) |
| Figma status text | COLOR/MATERIAL: approved working direction · LOGO: **working nuance, NOT final brand lock** |
| Stored | `public/brand/opal-mark-current-working-ref.png` (+ raw jpg) |
| Home product mark | Figma `2:4` clean circle SVG → `public/brand/opal-mark-current.svg` |
| Matches prior production SVGs? | **NO** — old `opal-mark.svg` is hand-drawn lumen loop; not 63:7 bytes |
| Final master? | **NO** — working reference only |
| Replacement path | Replace files behind `/brand/opal-mark-current.svg` and `-working-ref.png` without code renames |

---

## CURRENT PRODUCTION LOGO BEFORE

- `public/brand/opal-mark.svg` — custom SVG “Lumen Lens” loop (not 63:7)
- `public/figma-v2/opal-mark.svg` — prior extraction, simple radial
- Inline `OpalMark` React SVG component

## CURRENT PRODUCTION LOGO AFTER

- **Canonical product mark:** `/brand/opal-mark-current.svg` (Home 2:2 clean mark)
- **Working brand reference (opening):** `/brand/opal-mark-current-working-ref.png` (63:7)
- `BRAND_ASSETS.markCurrent` / `markWorkingRef` in `brand/brand.ts`
- No P7, no halo, no gemstone study pages

---

## OPENING / WALKTHROUGH CONTINUITY

| Phase | Status |
|-------|--------|
| Brand open | Welcome scene uses `OpeningBrandMark` (63:7 raster) |
| Walkthrough content | **Unchanged** (no copy redesign) |
| Skip / Join / no demo | Preserved (tests pass) |
| Activation | Unchanged flow after Join |
| Member dock | Still gated behind auth |

---

## V2 PRIMITIVES CREATED/REUSED

Module: `apps/opal_web/src/opalUi/v2Primitives.tsx`

| Primitive | Used by |
|-----------|---------|
| V2AmbientField | Home |
| V2BrandRow / V2OpalMark | Home |
| AwakenSurface | Home (one only) |
| PresenceSurface | Home |
| OpalFilament (awaken/transform) | Chat chronology |
| PrivateOpalPlate | Chat private |
| SharedRealityPlate | Chat SR / future Plans |
| OpeningBrandMark | Walkthrough welcome |
| V2Dock | Defined; tabbar labels → People |

---

## HOME 2:2 DESIGN CONTEXT PULL

**Pulled:** `get_design_context(2:2)` + screenshot → `wave1/FIGMA_HOME.png`  
Composition: void, ambient, 26px mark, “Tonight / is happening.”, ONE awaken, presence blocks, dock.

### HOME BEFORE / AFTER

| Before | After |
|--------|--------|
| `/figma-v2/opal-mark.svg` ad hoc | `/brand/opal-mark-current.svg` |
| Could stack secondary awaken cards | **ONE** awaken only |
| Presence energy partial | settled / possibility / group / recall / calm |
| Inline markup | Primitives |

### HOME 390 DIFF

| Check | Result |
|-------|--------|
| Structure matches Figma hierarchy | **PASS** (code) |
| Live content not hardcoded Chanelle | **PASS** |
| Pixel product screenshot vs Figma | **NOT RUN** (auth required) → **P1 founder** |
| Secondary awaken stack removed | **PASS** |

---

## CHAT 3:2 DESIGN CONTEXT PULL

**Pulled:** `get_design_context(3:2)` + screenshot → `wave1/FIGMA_CHAT.png`  
Also filament grammar from 3:11 / 3:21 / 3:29.

### CHAT BEFORE / AFTER

| Before | After |
|--------|--------|
| Filament markup inline | `OpalFilament` awaken (2px cyan) / transform (4px emerald) |
| Private plate inline | `PrivateOpalPlate` |
| Bubbles already near Figma | Radii confirmed 6/18 organic |
| Header context | Unchanged domain wiring |

### CHAT 390 DIFF

| Check | Result |
|-------|--------|
| Filament not peer bubble | **PASS** |
| Chronology → filament modes | **PASS** (domain map) |
| Pixel product screenshot | **NOT RUN** → **P1** |

---

## FILAMENT MAPPING

| Chronology / signal | Mode | Visual |
|---------------------|------|--------|
| plan_forming, still_open, open_loop, will_know_later | **awaken** | 2px cyan bar |
| set, ready, follow_through, handled | **transform** | 4px emerald + soft glow |
| privacy_class private_viewer | **private** | Violet ONLY YOU plate |

No Figma example strings hardcoded. Labels from durable chronology.

---

## PRIVATE OPAL MAPPING

| Source | Surface |
|--------|---------|
| Chronology private_viewer | `PrivateOpalPlate` |
| Curate/Extend private select | Existing private plates (unchanged behavior) |
| NEVER auto-shared | Preserved |

---

## SHARED REALITY 4:2 CONTEXT PULL

**Pulled:** `get_design_context(4:2)` + screenshot → `wave1/FIGMA_SR.png`

### SHARED REALITY BEFORE / AFTER

| Before | After |
|--------|--------|
| Thin resolution (kicker + title) | Atmosphere + settled plate + optional when/where/travel |
| No travel contract | Travel only if domain fields present |
| SET badge | Still none |

### SHARED REALITY 390 DIFF

| Check | Result |
|-------|--------|
| Signature structure | **PASS** (code) |
| No fabricated leave-by | **PASS** |
| Pixel product screenshot | **NOT RUN** → **P1** |

---

## TRAVEL / LEAVE-BY TRUTH

| Rule | Status |
|------|--------|
| Only if `leave_around` / `leave_by` / travel_estimate / distance on signal | **Enforced** |
| Figma “18 min / Leave around 7:05” never copied as default | **PASS** |
| Object complete without travel rows | **PASS** |

---

## REAL DATA DERIVATION

Home awaken / presence / chat filaments / SR headline all from ProductSignals, chronology, conversation names — **not** Figma sample people/venues.

---

## 375 / 390 / 430 RESULT

| Width | Opening screenshot | Overflow check |
|-------|--------------------|----------------|
| 375 | `PRODUCT_OPENING_375.png` | Captured |
| 390 | `PRODUCT_OPENING_390.png` | Captured |
| 430 | `PRODUCT_OPENING_430.png` | Captured |

Member surfaces: CSS uses flexible widths (`calc(100% - 44px)`, clamp on editorial). Full overflow audit on seed: **P1**.

---

## BUTTON REGRESSION

- Extend private-first tests: **pass**
- Pre-member no tabbar: **pass**
- Product / smoke: **pass**

---

## DOMAIN REGRESSION

No changes to availability composition logic behavior in this wave beyond prior module presence.  
No Sam / group authority / chronology persistence / open-ended / calendar disclosure changes.

---

## TESTS

| Suite | Result |
|-------|--------|
| `opal_web` vitest | **100 passed** |
| `vite build` | **pass** |

---

## P0 / P1 / P2

### P0

| Item | Status |
|------|--------|
| Hardcoded Chanelle/Juniper in product surfaces | **PASS** (not hardcoded) |
| Fabricated leave-by | **PASS** |
| Multi-awaken stack on Home | **PASS** (removed) |
| Logo final claim | **PASS** (explicitly working only) |
| Auto-message from Extend/Curate | **Unchanged pass** |

### P1

| Item | Status |
|------|--------|
| Authenticated PRODUCT_HOME/CHAT/SR 390 screenshots vs Figma | **OPEN** |
| Founder visual PASS/FAIL on member surfaces | **OPEN** |
| 63:7 vs Home clean mark visual continuity polish | **OPEN** (two assets by design) |
| Wordmark as proprietary artwork vs UI type “Opal” | UI type on Home; raster includes study wordmark on opening |

### P2

| Item | Status |
|------|--------|
| Dock label People vs historical “Chats” copy habits | Updated to People |
| 4px spacing micro-drifts | Expected until pixel pass |

---

## EXACT FOUNDER URL

```
http://127.0.0.1:5173/   # dev
# or seeded founder review host per FOUNDER_PROOF_RUNBOOK.md
```

Figma:

```
https://www.figma.com/design/fy69K8cCug9prf5GLwQ7Hy?node-id=2-2
https://www.figma.com/design/fy69K8cCug9prf5GLwQ7Hy?node-id=3-2
https://www.figma.com/design/fy69K8cCug9prf5GLwQ7Hy?node-id=4-2
https://www.figma.com/design/fy69K8cCug9prf5GLwQ7Hy?node-id=63-7
```

Evidence folder:

```
docs/evidence/v2-coded-experience/wave1/
docs/evidence/v2-coded-experience/figma-diff/
```

---

## DO NOT MERGE / READY FOR FOUNDER EYES

**HOLD.**  

Code is ready for founder visual review of:

1. Opening brand (63:7 working)  
2. Home living field with real seed  
3. Chat filaments + private plate  
4. Shared Reality signature plate  

**Do not claim pixel PASS** for Home/Chat/SR until founder compares live 390 product screenshots to Figma.

**READY FOR FOUNDER EYES** on structure + brand path + one-world primitives.

---

## FINAL WAVE 1 LAW ACK

DO NOT BUILD SCREENS INSPIRED BY FIGMA.  
BUILD THE APPROVED FIGMA WORLD WITH LIVE OPAL TRUTH.

Brand opens. Home situates. Chat explains. Shared Reality is the thing that became real.

**HOLD.**
