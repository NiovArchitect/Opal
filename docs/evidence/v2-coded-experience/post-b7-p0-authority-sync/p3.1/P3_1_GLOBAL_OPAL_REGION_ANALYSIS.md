# P3.1 Global Opal Region Analysis — Figma `618:902`

**Date:** 2026-09-05  
**Authority:** CURRENT Figma `618:902` (written geometry; no playable motion timeline)

## Figma measured (absolute, 390×844)

| Region | y (top) | Notes |
|--------|---------|-------|
| Response group | **379** | x18 w354 h246 |
| Response copy line 1 | ≈388 | relative top ≈7–9 |
| Response copy line 2 / picks | ≈424 | relative top ≈43–45 |
| Recommendation lane | **≈449** | relative top ≈69–70 |
| Quick-intent chips | **630** | |
| Refinement chips | **670** | |
| Composer | **708** | |
| Dock | **758** | |

## Runtime BEFORE (founder walk `b6b1bd7`)

| Region | Measured | Defect |
|--------|----------|--------|
| Response | unbounded head height | copy grew downward |
| Ideas lane | absolute ≈70px relative / overlapping | **cards over response copy** |

**Root cause:** `.opal-response` / head content not height-clamped; recommendation lane absolute inside response while copy flowed unbounded → objective overlap.

Evidence: `p3.1/runtime/GLOBAL_OPAL_BEFORE.png` · `P3_1_GEOMETRY_BEFORE.json`

## Runtime AFTER (P3.1 prove)

| Region | Runtime top | Figma | Match |
|--------|-------------|-------|-------|
| Response | **379** | 379 | YES |
| Body bottom | 420 | above 449 | YES |
| Picks bottom | 439 | above 449 | YES |
| Ideas lane | **449** | ≈449 | YES |
| Intent | **630** | 630 | YES |
| Composer | **708** | 708 | YES |
| Overlap body∩ideas | **false** | required | YES |
| Picks∩ideas | **false** | required | YES |

Evidence: `p3.1/runtime/GLOBAL_OPAL_AFTER.png` · `P3_1_FOUNDER_CORRECTION_PROOF.json`

## Fix applied

Absolute response head height **68px** + overflow hidden; ideas lane absolute at relative top **70** (abs **449**); no eyeball offset.

## Status

**GLOBAL_OPAL_GEOMETRY = GREEN**
