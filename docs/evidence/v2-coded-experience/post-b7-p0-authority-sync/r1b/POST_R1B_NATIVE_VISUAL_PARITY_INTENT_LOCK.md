# POST-R1B Native Visual Parity — Intent Lock

**Date:** 2026-09-09  
**Starting HEAD:** `ea88b2a`  
**Branch:** `build/v2-coded-experience-closure`  
**Founder GO:** Surgical visual / geometry only  

## Locks

```text
R1B_COMPLETE = YES  (do not reopen foundation)
TWILIO_PROVIDER = BACKEND ONLY
OPAL_OWNS_VISUAL_AUTHORITY = YES
STORE_READY = NO
P2/P3 FROZEN · P4 COMPLETE · R3 = NO
```

## Physical device

| Field | Value |
|-------|-------|
| Class | Founder iPhone (UDID registered; modern notched / Dynamic Island class) |
| Formal proof viewport | 390×844 (Figma law) |
| Highest proof | Physical installed EAS development build + Metro JS |

## Xcode / simulator audit

| Field | Value |
|-------|-------|
| `XCODE_VERSION` | 15.2 (15C500b) |
| macOS | 13.7.8 |
| `IOS_SIMULATOR_RUNTIMES` | **none installed** |
| `USABLE_SIMULATOR_DEVICES` | **none** |
| `LOCAL_SDK53_COMPILE_SUPPORTED` | **NO** |
| `EAS_SIMULATOR_BUILD_REQUIRED` | Would not help locally without a runtime |
| `SIMULATOR_VISUAL_DEBUG` | **BLOCKED** |

Do not upgrade Xcode/macOS. Do not force local SDK 53 compile.

## Native host strategy (chosen)

**Defect class:** `NATIVE_CONTAINER` + `FIRST_RUN_STATE`  

R1B used a functional React Native `ActivationScreen` for SMS/OTP. That screen is **Opal product UI** (Twilio is transport only) and does **not** match Brand V4 / Figma.

**Correction (surgical):** Unauthenticated native host loads **current web first-run / auth owners** in a full-bleed WebView:

| Stage | Figma | Web owner |
|-------|-------|-----------|
| Splash | `618:19` | `FirstRunSplashPage` |
| Promise | `646:2` / `710:8` | `FirstRunPromisePage` |
| Phone | `773:27` | `FirstRunExperience` fr06 |
| OTP | `773:52` | `FirstRunExperience` fr07 |

On auth success, web posts session to native → **SecureStore** (R1A/R1B contracts unchanged) → existing `ProductWebSurface` + native Phoenix ticket.

Fallback: if `EXPO_PUBLIC_OPAL_WEB_URL` missing, keep RN `ActivationScreen`.

## Known defects (pre-fix)

1. Generic RN activation (system-looking inputs / purple pill CTA / no Brand V4 splash)  
2. Missing Splash → Tap to begin / Promise progression (jumped straight to phone-key copy)  
3. Possible double safe-area / stage shrink when wrapping WebView in `SafeAreaView`  
4. No Expo splash asset configured in `app.json` (blank/default native launch)

## Non-goals

P2 · P3 · P4 · R3 · TURN · push · Action Plane · Muse connectors · Activity icon · auth contract changes · synthetic OTP · redesign · threshold moves

## Proof plan

Physical iPhone founder walk + Figma refs + web 390 screenshots. Simulator = BLOCKED.
