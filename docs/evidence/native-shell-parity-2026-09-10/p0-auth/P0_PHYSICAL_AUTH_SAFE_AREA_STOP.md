# STOP — PHYSICAL AUTH + SAFE AREA P0

**Date:** 2026-09-10  
**Branch:** `build/v2-coded-experience-closure`  
**Starting HEAD:** `b31adcb`

## SAFE AREA

| | |
|--|--|
| Physical defect | Header under status clock; Skip/CTAs into home-indicator |
| Root cause | Full-bleed native host without `env(safe-area-inset-*)` on absolute Figma coords |
| SAFE_AREA_OWNER | **WEB** (WKWebView not inset; CSS `env()`) |
| Top fix | `top: calc(Npx + env(safe-area-inset-top))` on auth/splash headers & stack |
| Bottom fix | Primary/Skip/Promise CTAs use `bottom: calc(... + env(safe-area-inset-bottom))` |
| Viewport | `100dvh` + `viewport-fit=cover` (already present) |
| Files | `apps/opal_web/src/styles.css` |

Background remains edge-to-edge. Content clears unsafe regions. No return to 390 card.

## PHONE SERVICE PATH

| | |
|--|--|
| Classification | **A. REQUEST_NEVER_REACHED_PHOENIX** (from physical device) |
| Device API URL (baked Vite) | was `http://127.0.0.1:4000` |
| Current LAN | `192.168.86.156` (unchanged) |
| Phoenix running | YES · `*:4000` · Twilio env PRESENT · mode production_sms |
| Root cause | WebView on phone called loopback; never Mac Phoenix |
| Fix | `deviceReachableBase()` rewrites localhost → `window.location.hostname` when `opal_native_host=1`; `.env.local` set to LAN for Vite |

## ERROR STATE

| | |
|--|--|
| Old collision | `fr-status` + `fr-error` both at `top:230px` |
| Arbitration | Error XOR status; skip-for-now clears error first |
| Layout owner | FirstRunExperience fr06/fr07 |
| Tests | `authErrorArbitration.test.ts` |

## GATES

```text
TOP_SAFE_AREA = PARTIAL→code GREEN (await physical confirm)
BOTTOM_SAFE_AREA = PARTIAL→code GREEN (await physical confirm)
AUTH_ERROR_LAYOUT = GREEN
PHYSICAL_API_REACHABILITY = GREEN (path fixed; await Continue)
TWILIO_VERIFY_PATH = READY (env present; await one challenge)
REAL_SMS_FROM_NATIVE = PENDING_FOUNDER
OTP_PHYSICAL_VISIBLE = PENDING_FOUNDER
AUTH_VISUAL_PARITY = PARTIAL
R1B_COMPLETE = YES
SOLO_OPAL_FOUNDER_APPROVED = YES
SOLO_OPAL_PHYSICAL_PROOF = PENDING
STORE_READY = NO · R3/TURN/PUSH/MERGE/LIVE = NO
```

## Remaining founder action

1. Shake → Reload Opal Graph  
2. Splash → Promise → Phone  
3. Confirm header clears clock; Skip clears home edge  
4. Tap **Continue** once → receive real SMS  
5. Reply `sms green` or paste exact error (no phone number)

