# R1B.1 Physical iOS Build Audit

**Date:** 2026-09-08  
**HEAD:** `6e8c5c4` (+ path correction)

## First report (required)

```text
XCODE_AVAILABLE = YES
  Xcode 15.2 (15C500b)

PHYSICAL_IPHONE_VISIBLE = NO
  xcrun xctrace / devicectl: no iPhone listed
  USB: Apple device Product ID 0x8600 observed (inconclusive; not usable for install)

EXPO_DEV_CLIENT_PRESENT = YES
  expo-dev-client ~5.2.4
  expo ~53.0.0
  ios/ directory: ABSENT (managed; needs prebuild or EAS)

LOCAL_IOS_DEV_BUILD_POSSIBLE = NO
  codesigning identities: 0 valid
  provisioning profiles: 0
  physical device not visible to Xcode tooling

APPLE_SIGNING_STATE = MISSING_LOCAL_IDENTITIES
  EAS account authenticated: YES (owner sadeil / niovlabs)
  Local Apple Development certificates: NONE

EAS_REQUIRED = YES
  (for this Mac + current signing/device state)

SELECTED_R1B_PHYSICAL_IOS_PATH = EAS_DEVELOPMENT_BUILD

EXPO_GO_PHYSICAL_IOS_SDK53 = NO
  (do not send founder back to Expo Go)
```

## Preference vs reality

| Preference | Reality |
|------------|---------|
| A. Local `expo run:ios --device` | Blocked: no signing + no visible iPhone |
| B. EAS development build | Selected — Expo already logged in as `sadeil` |

## Non-goals held

No SDK upgrade · no TestFlight · no production bundle IDs · no P2/P3/P4 reopen · no R3/TURN/push.
