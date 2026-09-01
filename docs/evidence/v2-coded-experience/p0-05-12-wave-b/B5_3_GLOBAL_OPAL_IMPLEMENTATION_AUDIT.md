# B5.3 — Global Opal Implementation-Integrity Audit

**Authority:** Figma `618:2` / Global Opal `618:902`  
**HOLD.** Do not merge. `permissionToStartLive = NO`.

## Classification (post-rebuild)

```
GLOBAL_OPAL_IMPLEMENTATION_MODE = A. STRUCTURED_UI_WITH_DECORATIVE_UNDERLAY
GLOBAL_OPAL_IMPLEMENTATION_INTEGRITY = GREEN
GLOBAL_OPAL_FORMAL_PARITY = PARTIAL (0.1291)
```

### Pre-rebuild (B5.2 audited commit `cda81b4`)

```
GLOBAL_OPAL_IMPLEMENTATION_MODE = B. FULL_SCREEN_RASTER_WITH_HOTSPOTS
GLOBAL_OPAL_IMPLEMENTATION_INTEGRITY = RED / PARTIAL
image diff = 0.0171 (invalid as sole GREEN proof)
```

B5.2 used `authority-618-902-stage.png` (full semantic UI baked) + transparent
`.opal-hit` hotspots. That architecture is **prohibited**.

### Post-rebuild (this pass)

Structured semantic DOM restored in `OpalAmbient.tsx`:

- Real context cards (label + value, aria-pressed)
- Real conversation / response copy
- Real recommendation cards (rank, title, time, descriptor, status, fit, media)
- Real intent + refine chips
- Real composer `<input>` + attach + voice control
- Graph mutation via existing `onSeedGraph` → Graphs tab + gate note
- Dock close via center Opal toggle

Decorative only:

- `neural-field-618-902.png` (exact Figma node `618:923`)
- Ambient spectral CSS washes (`618:903/904/905` approximation)
- Response orb asset `opal-response-orb-618-1244.png`

**No** `authority-618-902-stage.png` in the product tree.  
**No** `.opal-hit` hotspots.

## Element inventory (post-rebuild)

| ELEMENT | FIGMA NODE | IN RASTER? | REAL DOM? | DATA-BOUND? | INTERACTIVE? | A11Y OWNER? | STATEFUL? | OWNER |
|---------|------------|------------|-----------|-------------|--------------|-------------|-----------|--------|
| Ambient neural field | 618:923 | YES (decorative only) | YES (img, aria-hidden) | N/A | NO | decorative | NO | neural-field PNG |
| Ambient spectra | 618:903–905 | CSS approx | decorative layer | N/A | NO | decorative | NO | `.opal-ambient-spectra` |
| Settings | 618:906 | NO | YES | NO | YES | aria-label + icon | NO | `opal-settings` |
| History | 618:910 | NO | YES | NO | YES | aria-label + icon | NO | `opal-history` |
| Opal Graph header | 618:1151/1152 | NO | YES | NO | NO | wordmark | NO | `OpalWordmark` |
| People / Places / Vibe / Budget / Past / Availability | 618:915… | NO | YES | YES (runtime set) | YES | button + pressed | YES | CONTEXT map |
| User message | 618:1075 | NO | YES | fixture copy | NO | text | NO | `.opal-bubble.is-user` |
| Opal response + picks | 618:1153–1156 | NO | YES | fixture copy | NO | text | NO | `.opal-response` |
| Idea cards 1–4 | 618:1158… | media only | YES | YES | YES | button + text | YES | IDEAS → `onSeedGraph` |
| Intent chips | 618:1077… | NO | YES | YES | YES | button text | YES | INTENT |
| Refine chips | 618:1085… | NO | YES | YES | YES | button text | YES | REFINE |
| Composer | 618:1110 | NO | YES | YES (value) | YES | label + input | YES | `opal-query` |
| Voice | 618:1114 | NO | YES | YES | YES | aria-pressed | YES | `opal-listen` |
| Center Opal close | dock | NO | YES | YES | YES | dock button | YES | `OpalApp` |
| Graph mutation | — | N/A | YES | YES | YES | — | YES | `onSeedGraph` |

## Integrity flags (proven)

| Flag | Value |
|------|-------|
| GLOBAL_OPAL_DYNAMIC_CONTENT | YES |
| GLOBAL_OPAL_REAL_CONTROLS | YES |
| GLOBAL_OPAL_COMPOSER_REAL | YES |
| GLOBAL_OPAL_GRAPH_MUTATION | YES (closes Opal → Graphs + note) |
| GLOBAL_OPAL_ACCESSIBILITY_SEMANTICS | YES |
| GLOBAL_OPAL_RESPONSIVE_STRUCTURE | YES (375/390/393/430; no stage raster scale) |
| GLOBAL_OPAL_COMPLETE | NO (formal image 0.1291 > 0.12) |

## Formal image residual (0.1291)

Near-gate. Dominant bands: response/cards chrome + icons, shared dock active
paint, chip icon detail, context icon detail. Integrity is **not** carried by
screenshot overlay. Further formal close is pixel polish on structured UI only —
not a return to MODE B.

## Home (B5.3C)

```
HOME_FORMAL_PARITY = PARTIAL (0.1854)
HOME_AUTHORITY_CONFLICT = YES
```

| Region | Ratio | Classification |
|--------|-------|----------------|
| Header 0–120 | 0.1689 | Wave B shell + **Activity FOUNDER_REVIEW** (“Needs you” vs bell) |
| Upper feed 120–420 | 0.0589 | Acceptable |
| Lower feed 420–720 | 0.2545 | **FOUNDER_CAST / Wave A feed objects** vs Figma demo cast |
| Pre-dock 720–844 | 0.3401 | Wave A feed tail + dock — freeze respected |

**Do not reopen frozen Wave A** to force Home GREEN.  
**Do not resolve Activity icon** (FOUNDER_REVIEW).

### Founder decision required

1. Accept FOUNDER_CAST residual → Home stays PARTIAL; or  
2. Authorize fixture/cast alignment to Figma demo objects; or  
3. Explicitly authorize Wave A reopen (not recommended).

## Evidence

- `B5_3_INTEGRITY_PROOF.json`
- `runtime/GLOBAL_OPAL_618_902.png` / `diff/` / `overlay/`
- `prove_b53_integrity.mjs`
