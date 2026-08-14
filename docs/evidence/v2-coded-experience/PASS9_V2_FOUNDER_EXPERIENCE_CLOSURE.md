# PASS 9 — Founder V2 Experience Closure

**Branch:** `build/v2-coded-experience-closure`  
**Baseline before this pass:** `3a5e6cf`  
**Date:** 2026-08-13  
**HOLD. DO NOT MERGE.**

Intelligence delta: **NONE** (presentation / interaction only)  
Brand exploration: **FROZEN** (93:5/7/9 + repo semantic assets VALID)

---

## Executive

Pass 9 pulls live Figma V2 authority, captures product at **390** (plus 375/430 home), and applies **minimal eye-proven presentation repairs**. Capture harness ends **22/22 PASS** (0 product fail). Founder visual judgment still required for merge.

| Area | Verdict |
|------|---------|
| Brand 93:5/7/9 | **PASS** (continuous orbital + OPAL + lockup) |
| Opening lockup | **PASS** (redundant OPAL kicker removed) |
| Home living field | **PASS** structure · **P2** seed density / multi-Friends history |
| Chat human primary | **PASS** · single place CTA after repair |
| Shared Reality | **PASS** embedded lineage (NEXT TOGETHER) |
| Curate / place | **PASS** open + Escape |
| Plans | **PASS** field of realities |
| Profile | **PASS** named identity + sign out · topbar mark (not full lockup) |
| Scroll 375/390/430 | **PASS** |
| Intelligence | **UNCHANGED** |

---

## Figma nodes pulled

| Node | Name | Artifact |
|------|------|----------|
| 2:2 | V2 HOME | `pass9/figma/390_FIGMA_HOME.png` |
| 3:2 | V2 CHAT | `pass9/figma/390_FIGMA_CHAT.png` |
| 4:2 | V2 SHARED REALITY | `pass9/figma/390_FIGMA_SR.png` |
| 4:11 | V2 CURATE | `pass9/figma/390_FIGMA_CURATE.png` |
| 4:23 | V2 SOCIAL MOMENT | `pass9/figma/390_FIGMA_SOCIAL_MOMENT.png` |
| 5:20 | EXTEND | `pass9/figma/390_FIGMA_EXTEND.png` |
| 5:31 | PLANS | `pass9/figma/390_FIGMA_PLANS.png` |
| 93:5 | CORE MARK | `pass9/figma/BRAND_93_5_MARK.png` |

---

## Brand verify

| Source | Status |
|--------|--------|
| Product `opal-mark-current.png` | VALID continuous orbital |
| Product opening lockup | VALID |
| Favicon `favicon-mark.png` | VALID |
| Figma 93:5/7/9 | VALID (prior Pass 8) |
| 77:8 | SUPERSEDED |

---

## Figma → product mapping

| Figma | Product component | File | Domain | Interaction | Motion | Status |
|-------|-------------------|------|--------|-------------|--------|--------|
| 2:2 Home | `HomeField` / `V2BrandRow` / `PresenceSurface` / `AwakenSurface` | `OpalApp.tsx`, `v2Primitives.tsx` | ProductSignals | open chat | restrained | PASS structural |
| 3:2 Chat | conversation shell + filaments + chip | `OpalApp.tsx`, `grammar.ts` | messages + SocialReality | place CTA | chip edge | PASS after CTA repair |
| 4:2 SR | `OpalResolution` / NEXT TOGETHER | `OpalResolution.tsx` | shared_reality | — | settle | PASS lineage |
| 4:11 Curate | curate sheet | `OpalApp.tsx` | place options | private select | sheet | PASS |
| 5:20 Extend | extend sheet | `OpalApp.tsx` | active SR | private | sheet | PASS (restraint when no extend gap) |
| 5:31 Plans | `PlansField` | `OpalApp.tsx` | same signals | open chat | — | PASS |
| 93:5 Mark | `OpalMark` / `V2OpalMark` | `OpalLogo.tsx` | brand assets | — | — | PASS |

---

## Side-by-side (390)

### HOME — PASS (with known seed density)

| Figma | Product |
|-------|---------|
| Editorial “Tonight is happening.” | Match |
| Soft brand row | Orbital mark + Opal (correct brand, denser than Figma orb) |
| ONE CHOOSE awaken | Match |
| Quiet presence | Product denser (historical multi-Friends seeds — **P2 fixture noise**) |

### CHAT — PASS after repair

| Figma | Product |
|-------|---------|
| Human bubbles primary | Match |
| Sparse cyan filaments | Present; some chronology labels noisy (**P1 known**, no intelligence rewrite) |
| Single composer | Match |
| Dual Choose/Curate CTAs | **REPAIRED** → one primary “Choose a place” |

### OPENING — PASS after repair

| Before | After |
|--------|-------|
| Lockup + redundant OPAL kicker | Kicker suppressed on welcome |

### PROFILE — PASS after repair

| Before | After |
|--------|-------|
| Full lockup topbar | Compact mark + “Opal” word |

---

## Capture harness results

```text
node scripts/pass9_v2_experience_capture.mjs
22 PASS · 0 PRODUCT · 0 ENV
```

Machine JSON: `docs/evidence/v2-coded-experience/pass9/PASS9_CAPTURE.json`

---

## Repairs made (minimal presentation)

1. **ONE PRIMARY CTA** — remove stacked “Curate this” when chip owns place; Curate remains via place-sheet alternate.
2. **Awaken meta** — group names compress to “Friends” (no multi-name dump).
3. **Opening** — suppress redundant OPAL kicker when full lockup is shown.
4. **Authenticated topbar** — OpalMark + word, not full lockup raster.

---

## P0 / P1 / P2

| Sev | Item | Notes |
|-----|------|-------|
| **P0** | none in harness | — |
| **P1** | Chronology label noise | e.g. “Thursday · 6:30 replaced Thursday” — intelligence/chrono polish, not Pass 9 redesign |
| **P1** | Social Moment media primary | Figma 4:23 richer than product stub |
| **P2** | Home multi-Friends seed density | Clean fixture / seed hygiene |
| **P2** | Dock icon vs Figma label density | Same four destinations |
| **P2** | Vector brand master | OPEN (raster approved) |

---

## Exact founder review URL

```bash
# API (if not already running)
cd apps/opal_core && mix phx.server

# Web
cd apps/opal_web && npm run dev -- --host 127.0.0.1 --port 5173

# Fresh Jordan place-open fixture
node scripts/founder_proof_fixture.mjs

# Optional automated capture
node scripts/pass9_v2_experience_capture.mjs
```

| | |
|--|--|
| URL | http://127.0.0.1:5173/ |
| Phone | `+12025550101` |
| OTP | development_code from challenge (local often `000000` or `111111`) |
| Viewport | **390 × 844** |
| Click path | Opening → Skip/Continue → Join → OTP → Home → open Jordan → Choose a place → Escape → Plans → Profile → Sign out |

---

## Tests

- `grammar.test.ts` · `brandMark.test.ts` · `designTokens.test.ts` — PASS  
- Pass 9 capture — 22/22  

## V2 merge verdict

**HOLD** — ready for **founder eyes**, not auto-merge. Brain strong · brand real · experience closer; residual seed density + chronology copy still founder-sensitive.

```text
MAKE OPAL FEEL COMPLETE.
DO NOT MERGE UNTIL THE FOUNDER SEES IT.
```
