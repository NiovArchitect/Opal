# POST-R1B Native Visual Parity — STOP REPORT

**Date:** 2026-09-09  
**Branch:** `build/v2-coded-experience-closure`  
**Starting HEAD:** `ea88b2a`  

## Explicit flags

```text
R1B_COMPLETE = YES
POST_R1B_NATIVE_VISUAL_PARITY = PARTIAL  (JS/host wired; awaits physical founder walk)
NATIVE_FIRST_RUN_AUTHORITY = PARTIAL → Brand V4 web owners mounted in native host
NATIVE_AUTH_VISUAL_PARITY = PARTIAL
ONE_NATIVE_STAGE = GREEN (intent: full-bleed WebView, no SafeArea double pad, no host chrome bar)
PHYSICAL_IOS_VISUAL_PROOF = PENDING_FOUNDER
SIMULATOR_VISUAL_DEBUG = BLOCKED
STORE_READY = NO
P2_FROZEN = YES · P3_FROZEN = YES · P4_COMPLETE = YES
R3_FORMALLY_AUTHORIZED = NO · MERGE = NO · LIVE = NO
```

## Xcode / simulator

| Field | Value |
|-------|-------|
| E | Xcode **15.2** |
| F | Simulator runtimes: **none** |
| G | Usable devices: **none** |
| H | Local SDK53 compile: **NO** |
| I | EAS simulator build required for local sim: N/A without runtime |
| J | EAS simulator result: **not run** (would not install without runtime) |

## Figma nodes

| Surface | Node |
|---------|------|
| Splash | `618:19` |
| Phone | `773:27` |
| OTP | `773:52` |
| Promise | `646:2` / presentation `710:8` |

Refs: `visual-parity/figma/*.png`  
Web 390 runtime: `visual-parity/runtime/splash-390.png`, `after-tap-390.png` (Promise / Enter Opal)

## Root causes (classified)

| Area | Owner |
|------|-------|
| Off-brand phone-key screen | **FIRST_RUN_STATE / NATIVE_CONTAINER** — RN `ActivationScreen` substitute |
| Missing Splash / Tap / Promise | Same — never mounted Brand V4 owners |
| Safe area | Avoided double pad by removing SafeAreaView around first-run WebView |
| Host chrome bar | Removed native top bar from ProductWebSurface |
| Twilio | **Backend only** — never owned pixels |

## Correction

1. `NativeFirstRunSurface` loads `/?opal_native_host=1&opal_reset_first_run=1`  
2. Web `notifyNativeHostSession` / `notifyNativeHostSignOut` bridges SecureStore lifecycle  
3. Auth contracts unchanged (Twilio Verify → SecureStore → socket_ticket)

## Auth regression expectation

REAL_SMS_IDENTITY / NATIVE_SECURE_SESSION / NATIVE_PHOENIX_AUTH remain GREEN after founder Metro reload + walk.

## Founder retest

1. Same Wi‑Fi · Metro running  
2. Open Opal Graph → shake → **Reload**  
3. Expect Splash (Brand V4) → Tap / Enter Opal → Phone → OTP  
4. Sign out via **You → Sign out**  
5. Reply `visual parity green` or list remaining defects  

## Non-touched

P2 · P3 · P4 · R3 · Action Plane · Muse connectors · Activity icon
