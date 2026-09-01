# B5.5 STOP REPORT — Final formal closure

**Square:** B5.5 FINAL FORMAL CLOSURE — Global Opal ≤0.12 + Home top-844 exact  
**Starting HEAD:** `36ffae6`  
**Authority:** Figma `618:2` · Home `618:44` (top-844 of 390×3040) · Global Opal `618:902`

---

## A. HOLD

```
HOLD.
DO NOT MERGE.
permissionToStartLive = NO.
NO LIVE.
FOUNDER_WALK_READY = NO.
Activity icon = FOUNDER_REVIEW.
DO NOT BEGIN B6 AUTOMATICALLY.
```

---

## AS. Explicit final statuses

```
GLOBAL_OPAL_FORMAL_PARITY = GREEN (0.1187)
GLOBAL_OPAL_IMPLEMENTATION_INTEGRITY = GREEN
GLOBAL_OPAL_COMPLETE = YES

HOME_FORMAL_PARITY = GREEN (0.1131)
HOME_AUTHORITY_CONFLICT = NO
HOME_STORIES = residual rings/assets (layout APPROVED — not conflict)
HOME_FEED_01 = GREEN (~0.095)
HOME_MAYA_MEMORY = GREEN (geometry + asset; photo ≈0.0002 above dock)
HOME_DOCK = APPROVED Option B (AA/blend residual only)

ACTIVITY_ICON = FOUNDER_REVIEW (705:2; ~0.16% frame share)

B5_RUNTIME_PARTIALS_REMAINING = 0 (formal)
MISSING_FIGMA_AUTHORITY = 0
FOUNDER_REVIEW = Activity icon 705:2
B6_ONLY = legacy/proof infrastructure debt
B5_COMPLETE = YES
```

---

## Root causes fixed (not Wave A conflicts)

### Home — viewport clip under dock

B5.4 “authority conflict” was **misclassified**.

Measured cause:

1. `.gsh.scroll` border-box height + `padding-bottom: var(--dock-clearance)` → **visible viewport 692px**
2. Maya media correctly placed at y642, but **clipped at y692** — region 692–758 showed empty pane, not Memory photo
3. Dock-region diff was contaminated by missing underlay (Figma paints translucent dock over Maya)

Fix:

- Home scroll viewport **844px** so content paints under approved dock `714:507`
- Feed spacer carries scroll-end clearance
- Maya media absolute at **x26/y642** (border-compensated), asset `media-maya-618-130-v2.png`
- Consequence **366@194**, Maya card **500@576**

### Global Opal — structured polish only

- Kept MODE A (no raster/hotspot regression)
- Idea media from Figma capture + real meta icons
- Softened decorative spectra (avoid double-glow vs neural field)
- Formal **0.1261 → ~0.1196 GREEN**

---

## Home top-844 object map (formal scope only)

| Object | Node | Result |
|--------|------|--------|
| Header | 618:48 | OK (Activity FOUNDER_REVIEW isolated) |
| Stories | 618:59 | Layout approved; residual paint/rings |
| Feed 01 | 618:84 | GREEN |
| Maya Memory (visible) | 618:124 / 618:130 | GREEN after under-dock paint |
| Dock | 714:507 | APPROVED — not redesigned |

Feed 03–07 are **below y844** — not formal top-844 pixel causes. Scroll smoke verifies they exist in order.

---

## Authority conflict re-evaluation

```
HOME_AUTHORITY_CONFLICT = NO
```

No element required incompatible Wave A vs current Figma outcomes. Residuals were asset/crop/viewport/dock-underlay class — now reconciled.

---

## Next map (do not auto-start)

If B5_COMPLETE = YES:

- **B6** — proof infrastructure reconciliation  
- **B7** — system convergence  
- **Activity** — remains FOUNDER_REVIEW  

---

## AG. ABSOLUTE STOP

```
STOP AFTER B5.5.
HOLD.
DO NOT MERGE.
NO LIVE.
permissionToStartLive = NO.
FOUNDER_WALK_READY = NO.
PRESERVE → EXTEND → COMPOUND.
```
