# Stories — 287:20 VISUAL

**HOLD · DO NOT MERGE · Phase B.1 proof**

## A. Authority
`287:20` · file `fy69K8cCug9prf5GLwQ7Hy` · governing locks `570:7` / `562:162` · Brand board `528:25` (palette/assets only)

## B. Figma screenshot
`../figma/STORIES_287_20.png`

## C. Founder-runtime screenshot
`../runtime/STORIES_287_20.png` · `:5173` same process

## D. Viewport
390×844 (unless nested component)

## E. Object measurement comparison
Figma 390×122 · Runtime 390×122 · data-stories-rows=1 PASS

## F. Asset identity comparison
descendants=21 material=20 IMAGE=5 · Create Story corner control

## G. Typography comparison
See PROOF_PACKAGE.json typography samples where captured. Full type matrix not claimed EXACT without per-text Δ.

## H. Color / effect comparison
Brand V4 computed primitives PASS (`--opal-cyan=#00e5ff` …). Hardcoded `#6ee8f5` remains in `styles.css` (legacy leak audit).

## I. Interaction behavior
See PROOF_PACKAGE.json routing / dock / forward sections.

## J. Scroll / overflow
Mobile matrix: horizontalOverflow=0 on 375/390/393/430. headerCollision probe flagged (header top≈−12).

## K. Status
**MINOR_DIFF**

## L. Residual differences
Ring colors / avatar crop DYNAMIC_SLOT; Create Story placement vs Figma corner not Δ-exact
