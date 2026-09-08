# R1B.1 Device Runtime Path

**Date:** 2026-09-08  
**Foundation HEAD:** `03f8fd0`  
**Correction:** Physical iPhone + App Store Expo Go **cannot** load SDK 53 projects.

## Observed founder failure

- Expo Go launches; Playground works.
- `opal-mobile` appears under Projects; tap does nothing.
- Metro receives **no** JS bundle request from physical iPhone.

## Authority reconciliation

```text
EXPO_GO_COMPATIBLE_CODEWISE = PARTIAL
  (SecureStore + WebView exist in Expo Go module set; custom config plugin ignored)

EXPO_GO_PHYSICAL_IOS_SDK53 = NO
  (Expo: SDK 53–compatible Expo Go is not installable on physical iOS via App Store)

R1B_PHYSICAL_IOS_RUNTIME_PATH = DEVELOPMENT_BUILD

EAS_REQUIRED_FOR_THIS_PROOF = TBD after local Xcode/device/signing audit
```

## Chosen order (founder GO)

1. **LOCAL physical iOS development build** (`expo-dev-client` already present) if Mac/Xcode/device/signing allow.
2. **EAS development build** only if local path is not legitimate.
3. **Do not** upgrade Expo SDK solely to revive Expo Go.
4. **Do not** send founder back to Expo Go for this physical SDK 53 iPhone proof.

## Endpoint variable names (unchanged; LAN values gitignored)

- `EXPO_PUBLIC_OPAL_WEB_URL`
- `EXPO_PUBLIC_OPAL_HTTP_URL`
- `EXPO_PUBLIC_OPAL_WS_URL`
- `VITE_OPAL_API_URL`
