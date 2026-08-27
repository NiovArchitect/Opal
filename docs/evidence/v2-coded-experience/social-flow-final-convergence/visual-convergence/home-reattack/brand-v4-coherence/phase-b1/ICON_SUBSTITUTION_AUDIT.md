# ICON SUBSTITUTION AUDIT — Phase B.1

**ICON_SUBSTITUTIONS_FOUND (founder locks) = 0**

| Screen | Figma child | Runtime | Status |
|---|---|---|---|
| Home Header 287:7 | 541:70 magnifier | `/figma-v2/header/icon-search.svg` | EXACT source |
| Home Header 287:7 | 541:72 Needs You pulse | `/figma-v2/header/icon-needs-you.svg` | EXACT source · NOT bell |
| Dock 433:2 | 568:2 micro-emblem | `opal-dock-orb-trio-112.png` family | EXACT family |

`icon-notifications.svg` exists on disk but is **not wired** in production header (superseded by pulse).

Broader VECTOR-for-VECTOR reconciliation across Completeness / Opal 273 material icons is **not** claimed complete this pass — would inflate false confidence.
