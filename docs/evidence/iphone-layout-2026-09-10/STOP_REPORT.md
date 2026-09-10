# STOP — PHYSICAL IPHONE RESPONSIVE LAYOUT CONVERGENCE

**Date:** 2026-09-10  
**Branch:** `build/v2-coded-experience-closure`  
**Starting HEAD:** `0c1454c`

## ROOT CAUSES

1. **Safe area:** Product headers (Home/You/Opal Center) lacked top inset on native host  
2. **Absolute vertical layout:** FR07/08/09 used fixed Figma Y after wrapping text → collisions  
3. **Dock geometry:** 86px stage coords on full-bleed width; labels/safe-area not contained; clearance ignored orb overhang  
4. **Bottom content exclusion:** Home forced `height:844` + `padding-bottom:0`, defeating `--dock-clearance`  
5. **Center composer:** Absolute `top:708` under dock/orb on tall phones  
6. **Horizontal controls:** Intent/refine lanes clipped without overflow scroll  
7. **Text wrapping:** Absolute siblings did not participate in document flow  

## SHARED OWNERS FIXED

| Owner | Fix |
|-------|-----|
| Dock | Centered; height includes safe-bottom; tokens `--opal-dock-exclusion-height` |
| Home `.gsh.scroll` | Full height + `padding-bottom: var(--dock-clearance)` |
| Graphs / Chats / You | Width 100%; top safe; dock clearance |
| Opal Center | Full stage; top safe; composer/intent/refine stacked above dock exclusion |
| First-run verify/profile/find | Flex column flow layout (text owns height) |
| Safe-area owner | **WEB** |

No Figma redesign. No Twilio work. No 390 card return.

## GATES (code)

```text
IPHONE_LAYOUT_SYSTEM = PARTIAL→code GREEN
FIRST_RUN_RESPONSIVE = PARTIAL→code GREEN (verify/profile/find flow)
PRIMARY_TAB_RESPONSIVE = PARTIAL→code GREEN
BOTTOM_NAV_SYSTEM = PARTIAL→code GREEN
OPAL_CENTER_RESPONSIVE = PARTIAL→code GREEN
PHYSICAL_FOUNDER_RETEST = READY
R1B_COMPLETE = YES
P2_FROZEN = YES · P3_FROZEN = YES · P4_COMPLETE = YES
STORE_READY = NO · R3 = NO
```

## Founder retest

Reload → OTP (if mid-flow) / Home → Graphs → You → Solo Opal  

Confirm: no text collisions · headers clear clock · last content above dock · composer above orb · labels inside dock shell.
