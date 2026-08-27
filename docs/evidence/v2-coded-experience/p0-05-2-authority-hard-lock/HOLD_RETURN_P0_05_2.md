# P0-05.2 — CURRENT PRODUCT AUTHORITY HARD LOCK — HOLD RETURN

**Date:** 2026-08-27  
**Contract:** Figma `618:2` is the ONLY product design universe  
**Checkpoint lineage start:** `17bee0a`

---

## A. HOLD

HOLD. DO NOT MERGE. `permissionToStartLive = NO`. LIVE BLOCKED.  
Global Opal feature tranche remains **PAUSED**.

## B. Starting HEAD / clean-tree state

- Start HEAD: `17bee0a4359d0873154f7ba9bc76d7e8edaf853e`
- Dirty working tree reconciled into this checkpoint (authority + dock coherence)

## C. Proof 618:2 read FIRST

Fresh Figma MCP `get_metadata` on `fy69K8cCug9prf5GLwQ7Hy` / `618:2`:

- Canvas name: `2026-08-24 — CURRENT OPAL GRAPH AUTHORITY`
- Founder alignment: `FOUNDER ALIGNMENT • 2026-08-24 • BRAND V4 • PRESERVE → EXTEND → COMPOUND`
- Governance `618:9` now states: **Center dock authority = 645:3** · Legacy **568:2 Trio Orb is not current** · Promise = **646:2**

## D. Current dated section map 00–08

| Section | Node |
|---|---|
| 00 Governance | 618:6 |
| 01 First Run / Promise | 618:16 |
| 02 Home | 618:41 |
| 03 Communication | 618:268 |
| 04 Graphs / Journey | 618:671 |
| 05 Opal / Ambient | 618:899 |
| 06 Profile / You / Settings | 618:1254 |
| 07 Destinations | 618:2296 |
| 08 E2E wiring | 618:3288 |

Immutable: Center Opal `645:3` · Promise `646:2`

## E. Proof no historical screen substituted

- Repo authority + guard forbid browsing outside `618:2`
- `scripts/opal-authority-check.mjs` **GREEN**
- Runtime Splash tagged `data-figma-authority="618:19"` (lineage `327:5` kept as provenance only)

## F. Splash 618:19 Figma/runtime comparison

- Figma: `618:19` CURRENT — SPLASH — 327:5 — BRAND V4 REPAIRED
- Runtime: Brand V4 emblem · Tap to begin · Skip intro · I already have an account
- Evidence: `SPLASH_390.png` · `SPLASH_PROOF.json` (`figmaAuthority: 618:19`)

## G. Promise unchanged proof

- Asset SHA-256: `20c5210ff89e911368479463780eed37dce6fe2e994c61cda13982eaa2ddcf10`
- Path: `/brand/opal-graph/opal-promise-exact-941x1672.png`
- `untouched: true` — no re-export / crop / fit change
- Evidence: `PROMISE_390.png` · `PROMISE_PROOF.json`

## H. Center Opal 645:3 runtime provenance

- Path: `/brand/opal-graph/opal-center-opal-645-3-rest-512.png`
- SHA-256: `1ddbbe1bc23b029de27d8ba1a3396d1de35e814da5101d518c1305a7131935f6`
- Wrapper CSS: dock-relative **136, 7 · 86×64** (not obsolete 146,-4 · 66×66)
- `data-figma-center-opal="645:3"` on dock mark

## I. Center Opal screen matrix

All measured dock-bearing surfaces: **136 / 7 / 86 / 64** + asset `opal-center-opal-645-3-rest-512.png`

| Surface | Center Opal |
|---|---|
| Home | ✓ |
| Chats | ✓ |
| Direct | ✓ |
| Group | ✓ |
| Graphs | ✓ |
| Graph Detail | ✓ |
| You | ✓ |
| Settings Hub | ✓ |
| Global Opal | ✓ |

Figma Direct parent `618:348` clone `717:2` verified at **x136 y7 w86 h64**.

## J. Navigation active-state screen matrix

| Surface | Active |
|---|---|
| Home | home |
| Chats | chats |
| Direct | chats |
| Group | chats |
| Graphs Overview | graphs |
| Graph Detail | graphs |
| You | you |
| Settings Hub | you |
| Global Opal | Center Opal location (`shell=opal`; Home/Chats/Graphs/You not active) |
| Calls | **no dock** |

Journey: nav law encoded (`activeJourney → graphs`) + unit-tested; live Journey open not exercised in this seed (requires plan activation). Graphs Overview + Detail prove Graphs-active + exact Center Opal.

## K–O. Regressions

- **Communication:** Direct/Group Chats-active + exact Center Opal; typography/media/send not reopened
- **Graphs/Journey:** Graphs-active on Overview + Detail; Journey law encoded
- **Profile/You/Settings:** You-active; Settings under You; Person Profile ≠ You preserved
- **Global Opal:** shared-nav only; Home not falsely active; feature tranche not expanded
- **Calls:** dock absent (`CALL_DOCK.json` · `CALL_390.png`)

## P–R. Authority artifacts

Updated to `authority_version: 2026-08-27-p0-05-2`:

- `docs/authority/OPAL_CURRENT_AUTHORITY.yaml`
- `docs/authority/FIGMA_RUNTIME_LEDGER.yaml` (incl. dock geometry correction off obsolete 146,-4)
- `docs/authority/SUPERSEDED_PRESENTATIONS.yaml` (legacy 568:2 / 66×66 Trio)
- `docs/authority/ASSET_PROVENANCE.yaml`
- `docs/authority/CSS_CONVERGENCE_AUDIT.yaml`
- `scripts/opal-authority-check.mjs`

## S. Authority guard

`node scripts/opal-authority-check.mjs` → **GREEN**

## T. Tests

`npx vitest run src/brand/brandMark.test.ts src/opalUi/authorityRejectedStates.test.ts` → **27 passed**

## U. Console / network

Smoke: `consoleErrors: []` · material `netFails: []`

## V. Changed files (checkpoint)

- `apps/opal_web/src/OpalApp.tsx` — `dockActiveSlot` route ownership; Center Opal 645:3
- `apps/opal_web/src/styles.css` · `spectralTokens.css` — 86×64 @ 136,7
- `apps/opal_web/src/brand/brand.ts` · tests
- authority YAMLs + `scripts/opal-authority-check.mjs`
- `scripts/p0_05_2_authority_hard_lock_smoke.mjs`
- evidence under `docs/evidence/v2-coded-experience/p0-05-2-authority-hard-lock/`

## W–X. Checkpoint

See git HEAD after commit. Tree clean after checkpoint.

## Y. Remaining OBJECTIVE defects

1. **Journey live-open path** — `dockActiveSlot` encodes `activeJourney→graphs`, but this seed did not surface a live Journey (activation requires durable plan / `activateJourney` entry). Not a nav-law defect; entry-path completeness remains objective if founder wants walkable Journey from Graphs without prior plan.
2. Historical comments / some ledger prose may still mention lineage IDs — do not treat as permission to leave `618:2`.

## Z. Remaining FOUNDER decisions

1. **Activity icon** — `FOUNDER_REVIEW_REQUIRED` (618:2384 / header control)
2. **Global Opal feature tranche** — remains PAUSED until explicit founder authorization
3. Named Figma version-history checkpoint — unavailable in ChatGPT Figma execution environment (edits verified; API version naming not supported)

## AA. FOUNDER_WALK_READY

**PARTIAL** — Splash → Promise → Home → Chats → Direct → Group → Graphs → Graph Detail → You → Settings → Global Opal (nav-only) → Calls (no dock) are walk-ready for coherence. Journey live open not in this smoke. Promise frozen. HOLD.

## AB. STOP

HOLD. DO NOT MERGE. `permissionToStartLive = NO`. NO LIVE. STOP.
