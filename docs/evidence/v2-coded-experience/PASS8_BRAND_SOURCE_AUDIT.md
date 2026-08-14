# PASS 8 — Brand source audit (mechanical STOP)

**Date:** 2026-08-13  
**Branch:** `build/v2-coded-experience-closure`  
**Baseline SHA:** `82bae5a` (Pass 7)  
**Intelligence delta:** **NONE** (no intelligence code touched)  
**Verdict:**

```text
FOUNDER APPROVED SOURCE ASSET REQUIRED

BRAND SOURCE INVALID — PIXELS MISSING
```

Pass 8 law §9: if exact approved continuous iridescent orbital is not available locally → **STOP**.  
No generation. No approximation. No 77:8. No stale raster install. No Figma fill with wrong family. No product swap.

---

## Intelligence preflight

```text
INTELLIGENCE CONTEXT LOADED
TARGET: brand identity source-of-truth only
EXPECTED INTELLIGENCE DELTA: NONE
```

`./scripts/intelligence_check.sh --impact` → PASS (brand untouched by intelligence foundation).

---

## Approved definition (not found as pixels)

| Role | Required visual |
|------|-----------------|
| **OpalMark / CORE MARK** | Continuous iridescent orbital/ring — dimensional, cyan/blue/violet/purple, selective pink/opalescent light, dark void |
| **OpalWordmark** | Futuristic OPAL lettering (distinct asset) |
| **OpalLockup** | Mark + wordmark |

**Not approved:** opposing arcs · arcs + center spike · center star · clean circle · P7 · lumen-loop · generic O · filename alone.

---

## Figma mechanical verify (live MCP screenshot 2026-08-13)

| Node | Name | Screenshot | Continuous orbital? | Wordmark? | Lockup? |
|------|------|------------|---------------------|-----------|---------|
| **93:2** | Brand authority | Labels + empty slots (prior capture) | — | — | — |
| **93:5** | A · CORE MARK | **EMPTY black frame** | **NO** | — | — |
| **93:7** | B · WORDMARK | **EMPTY black frame** | — | **NO** | — |
| **93:9** | C · FULL LOCKUP | **EMPTY black frame** | — | — | **NO** |

Direct links (structure only — pixels missing):

- Authority: https://www.figma.com/design/fy69K8cCug9prf5GLwQ7Hy?node-id=93-2  
- Core mark: https://www.figma.com/design/fy69K8cCug9prf5GLwQ7Hy?node-id=93-5  
- Wordmark: https://www.figma.com/design/fy69K8cCug9prf5GLwQ7Hy?node-id=93-7  
- Full lockup: https://www.figma.com/design/fy69K8cCug9prf5GLwQ7Hy?node-id=93-9  

**77:8** remains SUPERSEDED / DO NOT USE.

---

## Local asset audit (visual + hash — filename untrusted)

| Path | Dims | SHA-256 (full) | Visual family | Matches approved continuous orbital? |
|------|------|----------------|---------------|--------------------------------------|
| `apps/opal_web/public/brand/opal-current-mark.png` | 1024×1024 PNG | `7b38bbaa…ad51e933` | **Opposing arcs + center crystalline spikes** (app-icon plate) | **NO** |
| `…/opal-latest-founder-orbital-mark.jpg` | 1024×1024 JPEG | `b4dd3969…20f36818` | **Same family** as above (duplicate content family with “orbital” name) | **NO** |
| `…/opal-current-mark-latest-orbital.jpg` | 1024×1024 | same as latest-orbital | Same | **NO** |
| `…/opal-current-mark-raw.jpg` | 1024×1024 | `30bbed5f…0701f928` | Spike/arcs family (raw) | **NO** |
| `…/opal-mark-current-working-ref-raw.jpg` | 1024×1024 | same as raw | Same | **NO** |
| `…/opal-current-mark.working.png` | 2000×2000 PNG | `b567bfa1…01bf1862` | **Flat opposing arcs + center star** (63:7 historical) | **NO** |
| `…/opal-mark-63-7-opposing-arcs-historical.png` | 2000×2000 | **identical** to working.png | Explicit historical opposing arcs | **NO** |
| `…/opal-mark-current-working-ref.png` | 2000×2000 | identical to historical | Same | **NO** |
| `…/opal-mark-current.svg` | SVG 540B | `1c76a9b8…` | **Clean circle** stub | **NO** |
| `figma-v2/opal-mark*.svg` | SVG | same circle hash | Clean circle | **NO** |
| `…/opal-mark.svg` / mono / light | SVG | lumen-loop family | Lumen-loop / old mark | **NO** |
| `…/opal-lockup.svg` | SVG | old mark + type | Deprecated lockup | **NO** |
| `…/opal-brand-application-63-9.png` | 1160×1450 | application board | Application study — not sole core-mark SoT | **NO** as mark |
| `docs/.../FOUNDER_LATEST_ORBITAL_MARK.jpg` | 1024×1024 | = latest-orbital | Opposing arcs + spikes | **NO** |
| `docs/.../FOUNDER_BRAND_BOARD_16.jpg` | 1280×720 | material photo | **Black opal stone photo** (material reference, not mark) | **NO** (not logo) |
| `docs/.../FOUNDER_BRAND_BOARD_17.jpg` | 1024×1024 | hoodie | **Mono opposing arcs + star + OPAL** (merch / P7-era social mark) | **NO** |
| `docs/.../logo-study-v3/p71-*.jpg` | — | = above families | P7 lineage | **NO** |
| `docs/.../FIGMA_BRAND_REFERENCE.png` | 1000×1000 | flat arcs+star | Historical Figma export | **NO** |
| `docs/.../FIGMA_BRAND_AUTHORITY_93-2.png` | 703×1024 | authority section | **Empty black slots A/B/C** | **NO pixels** |

**Downloads / Desktop / broader Developer tree:** no additional founder-supplied continuous-orbital raster distinct from the rejected families above.

---

## Wrong assets (quarantine report)

All of the following are **not** eligible for product install or Figma 93:* fill:

| Family | Example paths |
|--------|----------------|
| Opposing arcs + center spike | `opal-current-mark.png`, `*latest*orbital*`, `FOUNDER_LATEST_ORBITAL_MARK.jpg` |
| Opposing arcs + center star (flat) | `opal-mark-63-7-opposing-arcs-historical.png`, `opal-current-mark.working.png` |
| Clean circle | `opal-mark-current.svg`, `figma-v2/opal-mark*.svg` |
| Lumen-loop / old SVG mark | `opal-mark.svg`, mono, light, lockup.svg |
| P7 / hoodie mono social mark | `FOUNDER_BRAND_BOARD_17.jpg`, `p71-*` |
| Material photo only | `FOUNDER_BRAND_BOARD_16.jpg` |
| Empty Figma labels | 93:5 / 93:7 / 93:9 |

**Filename authority is forbidden.** Several rejected files contain `orbital`, `latest`, `current`, `approved`, or `founder` in the name.

---

## What was intentionally not done

| Action | Status |
|--------|--------|
| Generate / AI-redraw continuous orbital | **NOT DONE** (forbidden) |
| Trace raster into fake vector master | **NOT DONE** |
| Populate Figma 93:5/7/9 with wrong family | **NOT DONE** |
| Wire product OpalMark to rejected raster | **NOT DONE** (product still points at stale path; status remains INVALID) |
| Provider work / intelligence changes / V2 redesign | **NOT DONE** |
| Commit “brand install success” | **NOT DONE** |

---

## Founder action required (unblocks Pass 8)

Place **exact** founder-approved files into the worktree (or provide path), for example:

```text
apps/opal_web/public/brand/_incoming/
  opal-mark-approved.<png|jpg>      # continuous iridescent orbital ONLY
  opal-wordmark-approved.<png|jpg>  # futuristic OPAL lettering ONLY
  opal-lockup-approved.<png|jpg>    # optional; mark + wordmark as designed
```

Then re-run Pass 8 from §10:

1. Visual verify continuous orbital (not arcs/spike/star/circle/P7)  
2. Canonical semantic paths: `opal-mark-current.*` · `opal-wordmark-current.*` · `opal-lockup-current.*`  
3. Populate Figma **93:5 / 93:7 / 93:9** with those exact pixels  
4. Mechanical screenshot verify  
5. Wire OpalMark / OpalWordmark / OpalLockup + favicon  
6. Old-asset guard tests  
7. Product screenshots at 390  
8. Commit only after all verify gates  

---

## Direct Figma pointers (durable)

| Role | Node | URL |
|------|------|-----|
| Brand authority | 93:2 | https://www.figma.com/design/fy69K8cCug9prf5GLwQ7Hy?node-id=93-2 |
| Core mark | 93:5 | https://www.figma.com/design/fy69K8cCug9prf5GLwQ7Hy?node-id=93-5 |
| Wordmark | 93:7 | https://www.figma.com/design/fy69K8cCug9prf5GLwQ7Hy?node-id=93-7 |
| Full lockup | 93:9 | https://www.figma.com/design/fy69K8cCug9prf5GLwQ7Hy?node-id=93-9 |
| Superseded | 77:8 | DO NOT USE |

---

## Status summary

| Gate | Result |
|------|--------|
| Exact continuous orbital found locally | **NO** |
| Exact futuristic wordmark asset found | **NO** (hoodie type is P7-era merch, not isolated approved wordmark master) |
| Exact lockup found | **NO** |
| Figma 93:5 populated | **NO** (empty) |
| Figma 93:7 populated | **NO** (empty) |
| Figma 93:9 populated | **NO** (empty) |
| Product wired to approved art | **NO** |
| Vector master | **OPEN** |
| V2 merge | **HOLD** |
| Brand 93:* | **BLOCKED** |

```text
STOP.
FOUNDER APPROVED SOURCE ASSET REQUIRED.
DO NOT MERGE.
```
