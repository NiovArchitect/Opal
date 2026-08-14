# Opal Brand Canon

**Status:** Product brand source **VALID** · Figma 93:* **PENDING MANUAL PIXEL PLACEMENT**  
**Vector master:** OPEN (working approved raster is authority until true vector exists)  
**Intelligence:** frozen / not part of this canon  

---

## Definitions

| Asset | Meaning | Product use |
|-------|---------|-------------|
| **OpalMark / CORE MARK** | Continuous dimensional iridescent orbital symbol only | Authenticated product, Home, app icon, favicon, compact identity |
| **OpalWordmark** | Futuristic OPAL lettering only (opalescent A detail) | Opening selective, brand reveal, marketing, merch, storefront |
| **OpalLockup** | Orbital + OPAL wordmark | Opening, hero, major marketing |

Do not call all three “logo” interchangeably.

---

## Founder source

| | |
|--|--|
| File | `apps/opal_web/public/brand/_source/a_clean_minimal_futuristic_brand_logo_layout_on.png` |
| SHA-256 | `39a0f3b30eb4ef7714cfd1abd1ad1508dbf83eb704dc98ba4b8ecc32b4e9965c` |
| Role | Full lockup master raster (exact) |

Derivation:

- **Lockup** = byte-identical copy → `opal-lockup-current.png`
- **Mark** = lossless crop of orbital region → `opal-mark-current.png` (no redraw, no AI)
- **Wordmark** = lossless crop of OPAL lettering → `opal-wordmark-current.png`

Label: **FOUNDER APPROVED WORKING RASTER**

---

## Semantic repo paths

```text
apps/opal_web/public/brand/opal-mark-current.png
apps/opal_web/public/brand/opal-wordmark-current.png
apps/opal_web/public/brand/opal-lockup-current.png
```

Machine pointer: `config/brand_manifest.json`

---

## Figma

| Node | Role | Status |
|------|------|--------|
| 93:2 | Brand authority | Structure OK |
| 93:5 | Core mark | **EMPTY until manual drop of mark PNG** |
| 93:7 | Wordmark | **EMPTY until manual drop of wordmark PNG** |
| 93:9 | Full lockup | **EMPTY until manual drop of lockup PNG** |
| 77:8 | — | **SUPERSEDED / DO NOT USE** |

Links:

- https://www.figma.com/design/fy69K8cCug9prf5GLwQ7Hy?node-id=93-2  
- https://www.figma.com/design/fy69K8cCug9prf5GLwQ7Hy?node-id=93-5  
- https://www.figma.com/design/fy69K8cCug9prf5GLwQ7Hy?node-id=93-7  
- https://www.figma.com/design/fy69K8cCug9prf5GLwQ7Hy?node-id=93-9  

**Do not claim FIGMA BRAND SOURCE VALID until 93:5/7/9 screenshots show the exact art.**

---

## Deprecated / quarantine

| Family | Example |
|--------|---------|
| Opposing arcs + center spike | `_quarantine/REJECTED-arcs-spike-opal-current-mark.png` |
| Flat opposing arcs + star | `opal-mark-63-7-opposing-arcs-historical.png` |
| Clean circle SVG | `opal-mark-current.svg` |
| Lumen-loop SVG | `opal-mark.svg`, mono, light |
| P7 hoodie mono | historical merch boards |

Filename containing “orbital” is **not** authority.

---

## Components

| Component | Asset |
|-----------|--------|
| `OpalMark` | `opal-mark-current.png` |
| `OpalWordmark` | `opal-wordmark-current.png` |
| `OpalLockup` | `opal-lockup-current.png` (or mark-only when `showWord={false}`) |
| `OpeningBrandMark` | full lockup |
| Favicon | `/favicon-mark.png` |
| Apple touch | `/brand/opal-app-icon-180.png` |

---

## Law

```text
PRODUCT BRAND SOURCE: VALID
FIGMA BRAND SOURCE: PENDING MANUAL PIXEL PLACEMENT
ONE CORE MARK · ONE WORDMARK · ONE LOCKUP
NO REDESIGN · NO AI SUBSTITUTE · NO ARCS/SPIKE
V2 WORLD LOCKED · BRAND OVERLAYS ONLY
HOLD MERGE
```
