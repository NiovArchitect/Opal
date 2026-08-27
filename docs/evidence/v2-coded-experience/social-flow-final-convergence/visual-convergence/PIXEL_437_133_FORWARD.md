# PIXEL LEDGER — Forward 437:133

## Figma measured

| Token | Value |
| --- | --- |
| title | 30px Send to |
| lede | 14px |
| avatars | **68×68** · 3-col grid |
| mode bar | 342×48 r18 `#05070c` |
| Separately active | `#6ee8f5` |
| Continue | 342×56 r18 bg `#051a21` border `#6ee8f5` text `#f4f7fa` |
| Cancel | **not in Figma** (dock/Escape) |
| law | 13px at y=620 |
| dock | visible |

## Repair

* Continue restyled to dark+cyan border (not solid fill)  
* Mode bar geometry matched  
* Cancel returned to sr-only (behavior preserved via Escape + `dismissedRef`)  
* Law copy matched Figma string  

## Functional regression

Must remain PASS (cancel/separately/together locks).

## Status

**MINOR_DIFF** pending founder acceptance (candidate avatars may be initials when photos unavailable).
