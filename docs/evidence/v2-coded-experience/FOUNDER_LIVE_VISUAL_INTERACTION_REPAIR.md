# FOUNDER LIVE VISUAL/INTERACTION REPAIR

**HOLD. DO NOT MERGE.**  
**Branch:** `build/v2-coded-experience-closure`  
**SHA:** post-repair working tree on `0d456ab` base  

Wave 2 remains blocked until founder visual PASS on this repair.

---

## EXECUTIVE STATE

Repaired exact founder failures only:

1. **Logo** — product mark is now **exact Figma 63:7 raster** (opposing white arcs + opalescent center). Clean-circle SVG removed from product path.
2. **Ambience** — deeper void + restrained cyan/violet/pearl edge light (not neon overload).
3. **Home scroll** — root cause: `.home-living-field { overflow: hidden }` overrode `.scroll`. Fixed to `overflow-y: auto` + `min-height: 0`.
4. **Chat scroll** — root cause: flex child without `min-height: 0` + conversation shell not locking flex scroll region. Fixed thread + conversation shell.
5. **Time redundancy** — `composeHumanReality` presentation layer; AM/PM required; one day/time fact per local object.
6. **Extend collapse** — CTA toggles open/closed; Close + Escape; Back to options after private select; select no longer traps or auto-messages.

**Tests:** 111 passed · **Build:** pass  

---

## 63:7 ACTUAL ASSET PROOF

| | |
|--|--|
| Node | `63:7` IMAGE — CURRENT OPAL LOGO REFERENCE |
| File | `fy69K8cCug9prf5GLwQ7Hy` |
| Visual | Dark rounded-square · **two opposing white open arcs** · **opalescent four-point center** · perimeter cyan/violet/pink ambience |
| NOT | Clean circle · lumen-loop · plain O · P7 · halo |
| Asset | Raster IMAGE fill · PNG 2000×2000 · JPEG raw 1024×1024 |
| Product path | **`/brand/opal-current-mark.png`** |
| Final master? | **NO** — working nuance only |

Evidence copy: `wave1/FIGMA_63_7_MARK.png`

---

## 63:9 APPLICATION PROOF

| | |
|--|--|
| Node | `63:9` application study |
| Confirms | White symbol on black · arcs + center · OPAL wordmark · wearable/premium |
| Product use | Atmosphere reference only — not literal apparel mockup |
| Stored | `/brand/opal-brand-application-63-9.png` |

---

## WRONG LOGO ROOT CAUSE

Wave 1 incorrectly set `BRAND_ASSETS.markCurrent` to **`opal-mark-current.svg`**, which was the Figma **Home 2:4 “Opal mark clean” circle** (radial fill), **not** 63:7.

Also retained inline `OpalMark` SVG as a different lumen-loop geometry.

**Fix:** single canonical path `/brand/opal-current-mark.png` = exact 63:7 download; `OpalMark` / `V2OpalMark` / opening all use it.

---

## LOGO BEFORE / AFTER

| Before | After |
|--------|--------|
| Clean circle SVG | 63:7 opposing-arcs PNG |
| Separate lumen SVG component | Same 63:7 raster via img |
| Scattered paths | One semantic path + figma node metadata |

---

## WORDMARK STATUS

- Opening: **OPAL** UI type under 63:7 mark (not apparel art from 63:9)
- Home: **Opal** product UI word (15px Inter) beside mark
- Not proprietary lettering artwork until final brand lock provides vector wordmark

---

## AMBIENCE ROOT CAUSE / BEFORE → AFTER

| Before | After |
|--------|--------|
| Near-flat black + thin cyan borders | Multi-stop void: cyan possibility + violet private + rare pearl edge |
| Ambient field too weak / clipped by overflow:hidden | Ambient restored; field scrolls under content |
| Semantic energy only on borders | Local awaken cyan, private violet, resolve emerald, restrained shell gradients |

Still: no permanent logo halo, no every-card neon.

---

## HOME SCROLL ROOT CAUSE / PROOF

**Cause:** `.home-living-field { overflow: hidden }` (later CSS) defeated `.scroll { overflow-y: auto }`.

**Fix:**

```css
.home-living-field { overflow-y: auto; min-height: 0; touch-action: pan-y; }
.scroll { min-height: 0; overflow-y: auto; }
```

**Test:** CSS structure asserts in `extend.private.test.ts`. Live founder: long presence list must move; dock stays intentional.

---

## CHAT SCROLL ROOT CAUSE / PROOF

**Cause:** Conversation shell flex column without `min-height: 0` on `.thread`; Figma 844 height treated as hard clip via `app { overflow: hidden }` without a flexing scroller.

**Fix:**

```css
.thread { flex: 1 1 auto; min-height: 0; overflow-y: auto; }
.app[data-testid="member-conversation"] { max-height: 100dvh; overflow: hidden; }
.app[data-testid="member-conversation"] .thread { min-height: 0; }
```

Composer / header / journey CTA `flex-shrink: 0`. Extend/curate capped height with own scroll if tall.

---

## TIME REDUNDANCY ROOT CAUSE / BEFORE → AFTER

**Cause:** Independent concatenations in `presenceLines`, SR plate, and free labels restated day + clock.

**Fix:** `composeHumanReality` — single presentation compressor.

| Before | After |
|--------|--------|
| Dinner Thursday / Thursday 6:30 / Thursday 6:30 | Dinner with Jordan · **Thu · 6:30 PM** · Place still open |
| Bare 6:30 | **6:30 PM** |

---

## AM/PM RESULT

`formatClockAmPm` always emits meridem for clocks. Bare social hours 5–11 default **PM**. ISO uses locale 12h.

---

## SHARED REALITY COPY RESULT

Hierarchy:

- KICKER: TONIGHT / THURSDAY / …
- HEADLINE: Dinner with Jordan (no day/time)
- PRIMARY: 6:30 PM · venue/gap (no kicker restatement)
- SECONDARY: area · distance · leave (only if truth)

---

## EXTEND COLLAPSE ROOT CAUSE / PROOF

**Cause:** CTA only `setExtendOpen(true)` — no toggle; selection path weak collapse.

**Fix:**

| Transition | Behavior |
|------------|----------|
| CTA tap | Toggle OPEN ↔ CLOSED |
| Close / Not tonight / Escape | CLOSED, clear selection |
| Option select | Private only, reversible |
| Back to options | Clear selection, stay open |
| Share | Explicit draft only |

No auto peer message on select (regression tests).

---

## ACTION SIDE-EFFECT RESULT

| Action | Side effect |
|--------|-------------|
| Open Extend | None |
| Close Extend | None |
| Select option | Private state only |
| Share | Composer draft only when explicit |

---

## FIGMA HOME / CHAT / SR FIDELITY

| Surface | Code structure | Pixel founder PASS |
|---------|----------------|--------------------|
| Home 2:2 | Living field + scroll + 63:7 mark | **OPEN — founder eyes** |
| Chat 3:2 | Filaments + scroll shell | **OPEN — founder eyes** |
| SR 4:2 | Signature plate + compressed copy | **OPEN — founder eyes** |

Automated tests do not replace visual proof.

---

## 390 SCREENSHOT INVENTORY

| Asset | Status |
|-------|--------|
| FIGMA_63_7_MARK | Saved |
| FIGMA_63_9_APPLICATION | Saved |
| FIGMA_HOME / CHAT / SR | Prior |
| PRODUCT_OPENING_* | Prior wave1 |
| PRODUCT_HOME / CHAT scrolled | **Requires founder seed session** — capture on review host |

---

## BUTTON LIVE SWEEP (code)

- Extend toggle / collapse / back: wired  
- Curate toggle: wired  
- Escape: wired  
- Share still explicit  

---

## MOTION RESULT

No new traps. Escape + toggle prevent disclosure lock-in. No logo halo animation.

---

## 375 / 390 / 430

Scroll CSS uses `100dvh` + flex min-height 0 — works across phone widths. Founder overflow check still required on device.

---

## TESTS

| Suite | Result |
|-------|--------|
| vitest full | **111 passed** |
| brandMark (63:7 path) | pass |
| composeHumanReality | pass |
| extend private + scroll structure | pass |
| build | pass |

---

## P0 / P1 / P2

### P0 PASS (code)

- Wrong clean-circle mark replaced with 63:7  
- Home/chat scroll structural fix  
- Extend reversible disclosure  
- Time AM/PM + compression layer  
- No auto-message on extend select  

### P1 OPEN (founder visual)

- Live 390 Home/Chat/SR screenshots vs Figma after seed login  
- Confirm ambience “feels dimensional” on device  
- Confirm long chat/home scroll on mobile Safari  

### P2

- Final vector master when brand locks  
- Micro spacing vs Figma  

---

## KNOWN GAPS

- Authenticated product screenshots not captured in this agent session (need seed/session host).
- 63:7 remains raster working asset — not final vector master.
- Pixel fidelity still founder-judged.

---

## EXACT FOUNDER URL

Use local founder seed / review host per `FOUNDER_PROOF_RUNBOOK.md`.

Figma:

- https://www.figma.com/design/fy69K8cCug9prf5GLwQ7Hy?node-id=63-7  
- https://www.figma.com/design/fy69K8cCug9prf5GLwQ7Hy?node-id=63-9  
- Home `2:2` · Chat `3:2` · SR `4:2`

Evidence: `docs/evidence/v2-coded-experience/FOUNDER_LIVE_VISUAL_INTERACTION_REPAIR.md`

---

## DO NOT MERGE / READY FOR FOUNDER EYES

**HOLD.**

Repairs address named live failures.  
**READY FOR FOUNDER EYES** on logo, scroll, time copy, Extend collapse, ambience.

Wave 2 (Curate/Extend visual/Temporal) stays blocked until this passes.

**THE USER SHOULD FEEL: THIS IS OPAL — NOT A DARK REACT APP INSPIRED BY OPAL.**
