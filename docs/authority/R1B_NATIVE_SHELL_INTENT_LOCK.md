# R1B Native Shell Intent Lock

**Date:** 2026-09-08  
**Starting HEAD:** `3e589b9`  
**Branch:** `build/v2-coded-experience-closure`  
**Founder GO:** R1B ONLY  
**R1B_COMPLETE at start:** NO

## Purpose

R1A made the **human** real.  
R1B makes the **device** real — same Opal Graph, not a second product.

## Framework truth

- **Expo + React Native** (`apps/opal_mobile`)
- EAS internal profiles present
- Bundle/application IDs: `local.opal.mobile` (**development/internal**)

## Existing state (summary)

| Area | State |
|------|--------|
| iOS | EAS-managed; no checked-in `.xcodeproj` |
| Android | EAS-managed; no checked-in Gradle app as SoT |
| Auth | Product activation API; needs production consent + SMS path |
| Secure storage | expo-secure-store (**reuse**) |
| Routing | Stale AppShell tabs — **do not promote** |
| Web/native parity | **BROKEN** if AppShell used as product |
| Phoenix | Present; must use **socket_ticket** |
| Permissions | Contacts declared — do not exercise for R1B shell proof |
| Build | EAS development / internal_rc |

## Strategy

See `R1B_NATIVE_AUTHORITY_STRATEGY.md`:  
**Expo secure host + current `opal_web` WebView product surface.**

## Real-user proof plan

1. Internal/dev client on physical device (preferred) or honest BLOCKED  
2. Activation: “Your number is your key” → R1A Twilio Verify → OTP  
3. SecureStore holds token  
4. Kill/relaunch → same user without OTP  
5. Server revoke → relaunch → auth screen  
6. Phoenix ticket auth GREEN; revoked DENIED  
7. Product WebView shows current Opal (not SF18 shell)

## Two-device proof plan

**Out of R1B closure** as full chat/call milestone (R2/R3).  
R1B may record single-device foundation sufficiency for later two-phone work.

## Frozen / held

P2 FROZEN · P3 FROZEN · P4 COMPLETE · R3 not formally authorized · no TURN buy · no push · no merge/live · no store submit · no Activity icon · no contacts upload · no synthetic OTP · no founder seed.

## STOP law

No automatic R2/R3. Commit evidence. Push. Stop when foundation proven or blockers honestly classified.
