# R1B.1 — ExpoAsset native module missing (physical iOS)

**Date:** 2026-09-08  
**Class:** Native dependency / development-client fingerprint mismatch  
**Not:** Twilio · Apple membership · Phoenix · Web · product UI

## Symptom (founder device)

Installed EAS development build launches; Hermes fails immediately:

```text
Error: Cannot find native module 'ExpoAsset'
```

JS reload cannot fix this. New development binary required after native dep correction.

## Audit (`apps/opal_mobile`, Expo SDK 53)

| Gate | Result |
|------|--------|
| `EXPO_SDK` | `53` (`expo@~53.0.0` / resolved `53.0.27`) |
| `EXPO_ASSET_INSTALLED` (before) | **YES** but **nested only** under `expo/node_modules/expo-asset` |
| `EXPO_ASSET_VERSION` | `11.1.7` |
| `EXPO_ASSET_SDK53_COMPATIBLE` | **YES** |
| `EXPO_ASSET_IMPORTED_BY` | `expo` package runtime (`expo-asset` / `ExpoAsset` native module) — not app source |
| `EXPO_ASSET_NATIVE_AUTOLINKED` (before) | **NO** — top-level autolink search does not include `expo/node_modules/*` |
| `INSTALLED_DEV_BUILD_FINGERPRINT_MATCHES_CURRENT_NATIVE_DEPS` | **NO** (binary lacked ExpoAsset; JS graph expected it) |

Same nested-native gap also present for: `expo-constants`, `expo-font`, `expo-file-system`.

Project model: **CNG** (no committed `ios/` / `android/`). EAS prebuild regenerates native project. No local `expo prebuild --clean`.

## Correction (surgical)

```bash
npx expo install expo-asset expo-constants expo-font expo-file-system
npx expo install react-native   # doctor pin only: 0.79.2 → 0.79.6 (SDK 53 expected)
```

No Expo SDK upgrade. No mass dependency upgrades. No product/Twilio/R3 changes.

## Post-fix gates

| Gate | Result |
|------|--------|
| `EXPO_DOCTOR` | **GREEN** (18/18) |
| `EXPO_INSTALL_CHECK` | **GREEN** (Dependencies are up to date) |
| `EXPO_ASSET_PRESENT` | **GREEN** (direct dep `~11.1.7`, top-level `node_modules/expo-asset`) |
| `NATIVE_AUTOLINK` | **GREEN** (`expo-asset` in apple autolink set; count 12 → 16) |
| `NEW_EAS_DEV_BUILD` | pending |
| `PHYSICAL_IOS_RUNTIME_BOOT` | pending founder install |
| `EXPOASSET_ERROR` | pending clear on device |

## Next

New `eas build --platform ios --profile development` → founder install → Metro reconnect → expect activation screen (no ExpoAsset redbox) before SMS.
