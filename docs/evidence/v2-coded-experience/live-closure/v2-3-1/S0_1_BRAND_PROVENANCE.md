# S0.1 — Exact brand provenance closure

**DATE:** 2026-08-17  
**HOLD. DO NOT MERGE.**  
**NO S1.**

> **SUPERSESSION (2026-08-18):** The S0.1 rule that `168:2` is the exact runtime PNG is **obsolete**.  
> `168:2` is **DEFECTIVE / SUPERSEDED / DO NOT IMPLEMENT** (near-black plate, SHA `ecc9768b…`).  
> Current colorful symbol visual master: **`160:2`**. First-run instance: **`217:6`**.  
> See `docs/evidence/v2-coded-experience/BRAND_AUTHORITY_CORRECTION_160_2.md`.  
> Historical body below is retained for audit trail — do not treat as live product law.


## Authority (corrected)

| Node | Role |
|------|------|
| **`168:2`** | **Exact approved transparent PNG** — runtime master |
| **`160:2`** | Editable / vector master — not silent runtime substitute |
| **`161:2`** | Type + tagline lockup |
| **`161:3`** | Wordmark only |
| `162:2` | **Obsolete** (not present) |

## Pre-check: was S0 runtime already equivalent?

| File (before S0.1) | SHA-256 | Dims | Source |
|--------------------|---------|------|--------|
| `symbol-transparent.png` | `3ae4e36c…` | 512×512 | **160:2 export** (not exact) |
| `symbol-source-168-2.png` | `ecc9768b…` | 560×560 | **168:2 exact** (present but not used as runtime) |

**Conclusion:** Runtime was **not** byte-equivalent to `168:2`. Replacement required (option B).

## After S0.1

| File | SHA-256 | Dims | Role |
|------|---------|------|------|
| `symbol-transparent.png` | `ecc9768b0105a33f297ff5782cd5c99b79ce40ed989261946f891c7ef52ffe4e` | 560×560 | Runtime master = **168:2 exact** |
| `symbol-master.png` | same as above | 560×560 | Alias of exact |
| `symbol-source-168-2.png` | same as above | 560×560 | Provenance archive |
| `app-icon-180.png` | `601cb5d7…` | 180×180 | **sips resize** from exact |
| `app-icon-512.png` | `f632e70c…` | 512×512 | **sips resize** from exact |
| `favicon-opal-graph.png` | `11e7dda1…` | 32×32 | **sips resize** from exact |
| `symbol-vector-master-160-2-export.png` | (optional ref) | 512×512 | 160:2 export for comparison only |

Derived generation method: macOS `sips -z` pure pixel resize. No redesign.

## Product SHA

Runtime bytes changed → new product SHA required (this commit).
