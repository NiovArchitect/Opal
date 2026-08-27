# Home — 287:6 VISUAL

**HOLD · DO NOT MERGE · Phase B.1 proof**

## A. Authority
`287:6` · file `fy69K8cCug9prf5GLwQ7Hy` · governing locks `570:7` / `562:162` · Brand board `528:25` (palette/assets only)

## B. Figma screenshot
`../figma/HOME_287_6.png`

## C. Founder-runtime screenshot
`../runtime/HOME_287_6.png` · `:5173` same process

## D. Viewport
390×844 (unless nested component)

## E. Object measurement comparison
Runtime (390×844 DPR2):
frame 390×692 (above dock) · header 390×58 · profile 44×44 @ (19,7) · search 44×44 @ (281,7) · needsYou 44×44 @ (329,7) · stories 390×122 · dock 356×86 @ (17,748)
Figma ledger: header h=58 · profile 34×34 @ (~18,12) · search 36×36 @ (300,11) · needsYou 36×36 @ (342,11) · stories h=122 · dock 358×86
Δ: profile/search/needs hit targets larger (+10/+8); search x −19; needsYou x −13; dock w −2

## F. Asset identity comparison
descendants=220 material=176 IMAGE=20 VECTOR=30 ICON_LIKE=14

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
Hit-target inflation vs Figma; stories label color uses violet rgb(184,156,255); header top≈−12 under some probes; feed content DYNAMIC_SLOT
