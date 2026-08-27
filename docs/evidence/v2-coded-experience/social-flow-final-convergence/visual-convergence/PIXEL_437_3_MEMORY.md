# PIXEL LEDGER — Memory Detail 437:3

## Figma measured (390×844)

| Token | Value |
| --- | --- |
| bg | `#030406` |
| brand mark | 30×30 @ (20,18) |
| title | 30px / 600 / `#f4f7fa` @ y=76 |
| lede | 14px / `#8993a3` @ y=116 |
| avatar | 42×42 @ (20,170) |
| name | 18px / 600 |
| time | 12px / `#8993a3` |
| media | **350×330** r**22** @ (20,228) |
| caption | 18px / 500 @ y=576 (no author prefix) |
| action wells | 34×34; icons 24×24 @ y=620 |
| actions | Like · Comment · Repost · Share (no Save) |
| lineage | 13px `#8993a3` “From a lived Graph · visible to friends” |
| dock | visible Option B @ y=758 |
| Close | **none** (dock Home) |

## V0 before

* Emoji icons instead of approved SVG wells  
* Extra Save on action row  
* Caption prefixed with author name  
* Generic radius/spacing  
* Nested/device-chrome appearance in prior captures  

## Repair

* `md437-*` geometry CSS matching Figma numbers  
* Approved icons from `/figma-v2/social/*.svg`  
* Caption-only copy  
* Save/Close as sr-only hooks  
* bg `#030406`, media r22 350×330  

## Status

**MINOR_DIFF** if founder accepts residual icon glyph / fixture media content differences.  
Otherwise remains **MAJOR_DIFF** until founder walk accepts AFTER shot vs `FIGMA_437_3.png`.

Evidence: `RUNTIME_437_3_BEFORE.png` · `RUNTIME_437_3_AFTER.png` · `references/FIGMA_437_3.png`
