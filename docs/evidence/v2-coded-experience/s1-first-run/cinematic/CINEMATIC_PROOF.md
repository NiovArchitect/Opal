# Cinematic first-run proof

**HOLD. DO NOT MERGE.**

At: 2026-08-18T01:28:50.085Z

## Black-logo root cause
Figma `168:2` IMAGE FILL was an opaque near-black plate (SHA `ecc9768b…`, max channel ~51, zero alpha). Splash `217:6` uses the colorful vector brand master. Runtime rendered the black plate, so the mark looked black/invisible on Living Void.

## Asset after repair
- Path: `public/brand/opal-graph/symbol-transparent.png`
- SHA-256: `3c7608ebf75511a710171473cf0269c2e6fd6d3769954d1e5ea8e5afe740f6ba`
- Stats: `{"w":560,"h":560,"a0":255853,"colored":55891,"bright":56266,"dark":0,"maxc":255,"pixels":313600}`
- Defective archive SHA: `ecc9768b0105a33f297ff5782cd5c99b79ce40ed989261946f891c7ef52ffe4e`

## Results
| Check | Pass |
|------|------|
| Asset color/alpha | true |
| Splash mark visible | true |
| Logo crop colored | true |
| Tap to begin text-only cyan | true |
| Autoplays FR01→FR05 | true (13282ms) |
| FR05 stops | true |
| Reduced motion | true (1975ms) |
| Member brand | true |
| Home feed memory-heavy | true |

## Home feed counts
Memory 5 / Graph 3 / Live 1 / Near 1
People: Maya, Taylor, Riley, Chanelle, Alex, J, Jordan, N, Nina, Sam, Sabrina

## Defects found
- none

## Defects fixed
- replaced defective near-black 168:2 plate with true-alpha colorful mark
- FR00 logo crop contains visible spectral color
- Tap to begin is plain cyan text without fat pill
- FR01-FR04 cinematic autoplay reached FR05 without Continue
- FR05 stops for Continue with phone / already have account
- reduced motion reaches FR05 quickly

**OVERALL PASS (P0 cinematic):** true
