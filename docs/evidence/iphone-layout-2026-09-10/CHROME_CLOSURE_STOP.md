# STOP — IPHONE MOBILE CHROME CLOSURE

**Date:** 2026-09-10  
**Starting HEAD:** `3eb1388`  
**Auth design:** UNCHANGED (founder approved)

## FIGMA DOCK AUTHORITY

| | |
|--|--|
| Outer frame | 358×86 @ x16 y758 (714:507 / 618:1394 / 714:478) |
| Internal bar | 358×62 @ local y22 |
| Icons | y35 h24 |
| Labels | y65 h12 |
| Center Opal | 86×64 @ y7 (inside 86px frame) |

## ROOT CAUSES

1. **Settings top:** `.you-settings-dest` absolute Y at physical 0; hub-only safe-top missed the family  
2. **Dock undersizing:** Runtime treated 62px floating bar as the dock; labels appeared to hang  
3. **Home excess clearance:** `.gsh.scroll` AND `.gsh-feed` both applied `--dock-clearance` (double count)  
4. **Double-counting:** prior pass also conceptually stacked orb overhang; Figma proves orb is inside 86px  

## FIXES

| Owner | Change |
|-------|--------|
| Dock tokens | `--opal-dock-base-height: 86` + bar/icon/label/opal Y from Figma; gap=12; **no second orb** |
| Dock visual | Bar extends from y22 through safe-bottom (labels inside dark field) |
| Home | Feed `padding-bottom: 14px` only; scroll keeps single `--dock-clearance` |
| You/settings | Shared safe-top on top/title/lede/body/edit-avatar for entire `.you-settings-dest` family |

## DOCK_CONTENT_GAP

`12px` — single intentional breath above the 86px layout frame (+ device safe-bottom in exclusion).  
`DOCK_EXCLUSION_DOUBLE_COUNT = 0`

## PHYSICAL_FOUNDER_RETEST = READY

A. You hub · B. Privacy · C. Notifications or Calls · D. Home bottom · E. Dock · F. Solo top/bottom
