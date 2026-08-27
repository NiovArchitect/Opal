# P0-04.7 TYPOGRAPHY + DIRECT MEDIA + GROUP SEND — HOLD RETURN

**Date:** 2026-08-27  
**Mode:** Narrow visual closure only  
**Branch:** `build/v2-coded-experience-closure` @ `cb1bd43`  
**Evidence:** `docs/evidence/v2-coded-experience/brand-v4-coherence/p0-04-7-typography-media-send/`

P0-04.6 `FOUNDER_WALK_READY = YES` remains **REVOKED** until this pass; this return supersedes that classification for typography / Juniper / group send.

---

## A. HOLD

```
HOLD.
DO NOT MERGE.
permissionToStartLive = NO.
LIVE BLOCKED.
GLOBAL OPAL PAUSED.
```

---

## B. Runtime identity

| | |
|---|---|
| Branch | `build/v2-coded-experience-closure` |
| Commit | `cb1bd4382d73fb7a83b29658ec3a48942801219e` |
| Web | `http://127.0.0.1:5173` |
| Vite | PID `62628` |
| Figma file | `fy69K8cCug9prf5GLwQ7Hy` |
| `FONT_FAMILY_DEPENDENCY_GAP` | **FALSE** (Inter confirmed) |

---

## C. Direct exact typography Figma ↔ runtime

All roles: **Inter**. Objective diff count = **0**.

| role | Figma | Runtime | match |
|---|---|---|---|
| title (618:352) | 21 / 600 / #F4F7FA | 21px / 600 / rgb(244,247,250) | ✓ |
| subtitle (618:353) | 13 / 400 / #8A96A8 | 13px / 400 / rgb(138,150,168) | ✓ |
| You label (618:366) | 12 / 600 / #00E5FF | 12px / 600 / rgb(0,229,255) | ✓ |
| You body (618:367) | **17 / 600** / #F4F7FA | **17px / 600** | ✓ (was 15/400) |
| peer label (618:369) | 12 / 600 / #FFC86B | 12px / 600 | ✓ |
| peer body (618:370) | **17 / 600** / #F4F7FA | **17px / 600** | ✓ |
| Opal kicker (618:375) | **15 / 600** / #00E5FF | **15px / 600** | ✓ (was 14/700) |
| Juniper title (618:377) | **23 / 600** / #F4F7FA | **23px / 600** | ✓ |
| graph time (618:378) | 14 / 600 / #8B5CF6 | 14px / 600 | ✓ |
| truth slots | 13 / 600 / #F4F7FA | 13px / 600 | ✓ |
| bottom copy (618:407) | 13 / 400 / #8A96A8 | 13px / 400 | ✓ |
| composer (618:409) | 14 / 400 / #E2E8F0 | 14px / 400 | ✓ |
| dock labels | 10 / 500; active #00E5FF / inactive #919EB2 | 10px / 500 | ✓ |

**DIRECT_TYPOGRAPHY_OBJECTIVE_DIFF = 0** → GREEN

---

## D. Group exact typography Figma ↔ runtime

Separate scale from Direct. Objective diff count = **0**.

| role | Figma | Runtime | match |
|---|---|---|---|
| title (618:456) | 22 / 600 / #F4F7FA | 22px / 600 | ✓ |
| subtitle (618:457) | 12 / 400 / #8A96A8 | 12px / 400 | ✓ |
| Shared Graph (618:461) | 13 / 600 / #8B5CF6 | 13px / 600 | ✓ |
| Maya label / body | 10/600 #00F0D1 · 14/600 #F4F7FA | match | ✓ |
| Jordan label / body | 10/600 #8B5CF6 · 14/600 | match | ✓ |
| Sabrina label / body | 10/600 #D946FF · 14/600 | match | ✓ |
| Opal kicker (618:472) | ✦ Opal update · 13/600 #00E5FF | match | ✓ |
| Opal headline (618:473) | 18/600 #F4F7FA | 18px / 600 | ✓ |
| Opal support (618:474) | 11/400 #B8C2D4 | 11px / 400 | ✓ |
| reservation (618:475) | 11/400 #8A96A8 | 11px / 400 | ✓ |
| composer (618:477) | 14/400 #E2E8F0 | 14px / 400 | ✓ |

**GROUP_TYPOGRAPHY_OBJECTIVE_DIFF = 0** → GREEN

---

## E. Juniper source provenance

| Field | Value |
|---|---|
| Figma node | `618:376` |
| MCP asset id | `f624e39c-9987-411c-9543-70e03a3547d2` |
| Figma raw SHA256 | `d6d8c288dc4176477c4fae90d9702863811fbb5030ba03ed65dfe029a0de4916` |
| Figma natural | 864×1152 JPEG |
| `/figma-v2/home-201/media-juniper.png` | **NOT same** (SHA `c7f89131…`, 1728×2304) |
| Runtime path | `/figma-v2/direct/opal-direct-juniper-618-376.png` (+ `.jpg` byte-identical to Figma raw) |
| JPG SHA | matches Figma raw |
| MCP URL as runtime dep | **NO** — bytes installed under `public/` |

See `JUNIPER_PROVENANCE.json`.

---

## F. Juniper natural / rendered / DPR

| | |
|---|---|
| natural | 864×1152 |
| rendered | 108×86 |
| object-fit | **cover** |
| radius | **14px** |
| DPR3 target 324×258 | **PASS** (864≥324, 1152≥258) |
| gradient placeholder | **removed** |

**DIRECT_JUNIPER_MEDIA_DPR3 = PASS**

---

## G. Juniper crop screenshot proof

| | Figma | Runtime |
|---|---|---|
| slot | 34, 386, 108×86 | **35, 387, 108×86** (Δ1) |
| crop proof | `figma/FIGMA_JUNIPER_618_376_SLOT.png` | `RUNTIME_JUNIPER_CROP.png` |

Image is the approved Figma fill (restaurant interior), beside title — not a CSS gradient.

---

## H. Group send Figma ↔ runtime

| | Figma 618:478 | Runtime |
|---|---|---|
| glyph | ↑ | ↑ |
| font | Inter Semi Bold 20 | Inter 600 20px |
| color | #00E5FF | rgb(0,229,255) |
| background | transparent | rgba(0,0,0,0) |
| border | none | 0 / none |
| position | ~338, 699 | **338, 699** |
| Direct send | vector 22×22 @330,702 | preserved SVG (≠ Group) |

**GROUP_SEND_TREATMENT = GREEN** · Direct ≠ Group preserved.

---

## I. Direct visual diff

Fresh: `FIGMA_DIRECT_618_348.png` · `RUNTIME_DIRECT_618_348.png` · `DIRECT_OVERLAY.png` · `DIRECT_DIFF.png`

Inspected: text density, bubble hierarchy, Juniper image presence/crop, Opal plate.  
Remaining diff energy = dynamic names/copy + peer avatar.  
**No known chrome OBJECTIVE_DIFF.**

---

## J. Group visual diff

Fresh: `FIGMA_GROUP_618_451.png` · `RUNTIME_GROUP_618_451.png` · `GROUP_OVERLAY.png` · `GROUP_DIFF.png`

Inspected: hierarchy, send ↑ treatment, Opal plate.  
Dynamic membership/names acceptable.  
**No known chrome OBJECTIVE_DIFF.**

---

## K–Q. Frozen surfaces (smoke only)

| Gate | Result |
|---|---|
| Geometry / rectangles | preserved (Juniper slot Δ1 only) |
| Mobile 375/390/393/430 Direct+Group | GREEN — no overflow, dock contained, no composer collision |
| Dock Option B @390 | 16,758,358×86 · Center Opal 146,-4,66×66 |
| Call no-Dock | GREEN |
| Teardown / call controls | preserved |
| Graphs All·Action·Ready | GREEN |
| Settings depth | preserved |
| Home / Stories / Search / Discovery | preserved |
| First Run + Promise SHA | `20c5210ff89e911368479463780eed37dce6fe2e994c61cda13982eaa2ddcf10` unchanged |
| Activity icon | **FOUNDER_REVIEW_REQUIRED** (untouched) |

---

## R. Console / network

pageErrors = 0 · consoleErrors = 0 (gate run)

---

## S. Objective remaining defects

**None** among the four P0-04.7 open items.

---

## T. Founder-only remaining decisions

1. **Activity icon** = `FOUNDER_REVIEW_REQUIRED`
2. Production live-media hydration into the Juniper slot (Figma fixture remains founder-seed visual; not permanent fake production truth)

---

## U. FOUNDER_WALK_READY

```
FOUNDER_WALK_READY = YES
```

| Required | Status |
|---|---|
| DIRECT_TYPOGRAPHY | GREEN |
| GROUP_TYPOGRAPHY | GREEN |
| DIRECT_JUNIPER_MEDIA | GREEN |
| DIRECT_MEDIA_DPR3 | GREEN |
| GROUP_SEND_TREATMENT | GREEN |
| DIRECT_DIFF / GROUP_DIFF | no known objective chrome diff |
| MOBILE + prior preserved gates | GREEN |

---

## V. Founder URL (HOLD local only)

```
http://127.0.0.1:5173/?opal_reset_first_run=1&opal_founder_seed=1
```

---

## W. STOP

```
HOLD.
DO NOT MERGE.
NO LIVE.
NO GLOBAL OPAL.
permissionToStartLive = NO.
```

Repairs applied only to proven failures: Direct/Group Inter node typography, Figma 618:376 image bind, Group ↑ send. Geometry/dock/calls/Home/First Run frozen.
