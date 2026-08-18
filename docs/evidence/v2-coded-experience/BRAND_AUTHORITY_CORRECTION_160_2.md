# Brand authority correction — 160:2 master / 168:2 defective

**DATE:** 2026-08-18  
**HOLD. DO NOT MERGE.**  
**Product SHA (cinematic repair):** `7ae32c5`  
**Follow-on authority commit:** (this package)

## Supersession (do not rewrite historical evidence silently)

Earlier S0.1 / S1 documentation treated Figma **`168:2`** as:

> exact approved transparent PNG — runtime master

That provenance rule is **obsolete**.

Figma was re-inspected. `168:2` is labeled `SOURCE ASSET — opal_graph_symbol_transparent.png — EXACT PNG`, but its **rendered pixels are an almost-black plate** (SHA-256 `ecc9768b…`, max channel ~51, zero alpha). It does **not** represent the founder-approved visible Opal Graph mark.

### Current authority

| Node | Role |
|------|------|
| **`160:2`** | **Founder-approved colorful symbol visual master** |
| **`217:6`** | Approved first-run symbol instance (inside `217:5`) |
| **`161:2`** | Type + tagline lockup |
| **`161:3`** | Compact wordmark-only |
| **`168:2`** | **DEFECTIVE / SUPERSEDED / DO NOT IMPLEMENT** |

### Runtime raster policy

Runtime PNG must be a **faithful export/derivative of `160:2`**, not the defective `168:2` plate.

Current runtime:

- Path: `/brand/opal-graph/symbol-160-2-transparent.png` (cache-busted URL)
- SHA-256: `3c7608ebf75511a710171473cf0269c2e6fd6d3769954d1e5ea8e5afe740f6ba`
- True alpha + spectral cyan/indigo/magenta nodes

Defective archive:

- `symbol-source-168-2-defective-black-plate.png` (`ecc9768b…`)

Do not regenerate stylistically. Do not redraw. Do not substitute icons.

## Historical docs

Where older evidence still says “168:2 exact runtime,” treat those statements as **pre-correction historical text**. This file and `brand.ts` are the live authority.
