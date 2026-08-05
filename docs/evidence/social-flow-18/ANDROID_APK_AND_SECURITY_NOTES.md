# Android APK artifact and mobile security notes (SF18)

**Status:** SOCIAL FLOW 18 PARTIALLY COMPLETE  
**Date:** 2026-08-05  
**No Apple credential activity in this workstream.**

## Existing EAS development APK

| Field | Value |
|-------|--------|
| Build ID | `4f59b55e-bc50-473b-a196-c58f4659c06c` |
| Status | FINISHED |
| Platform | Android |
| Profile | `development` |
| `developmentClient` | **true** |
| Distribution | internal |
| Package | `local.opal.mobile` |
| SDK | 53 |
| App version | 0.12.0 |
| Source commit at build | `0617b50` |
| Expires | ~2026-08-18 |
| Artifact | APK via Expo |

### Standalone vs Metro

The finished APK is an **Expo development client** (`developmentClient: true`).  
It is **not** a guaranteed standalone product APK. It typically expects a Metro / Expo dev server unless an update channel is configured separately.

**Implication for founder testing:** Physical validation that does not depend on a laptop Metro process requires the **`internal_rc`** EAS profile (no development client; embedded JS; `EXPO_PUBLIC_OPAL_PROFILE=internal_rc`).

Do not claim the current development-client APK alone is sufficient for SF18 physical closure.

## Hosted targets (internal_rc)

| Endpoint | Value |
|----------|--------|
| HTTP | `https://api.opal.niovlabs.com` |
| WebSocket | `wss://api.opal.niovlabs.com/socket` |
| DevAuth | off |
| Localhost | disallowed in profile |

## Android contacts permissions

`expo-contacts` plugin declares both:

- `android.permission.READ_CONTACTS` (required for Find People)
- `android.permission.WRITE_CONTACTS` (plugin default; product path is **read/select only**)

Product code must still enforce selected-only submission. WRITE declaration is a plugin artifact, not a product “upload contacts” feature.

## npm audit (SDK 53 lockfile)

| Severity | Count | Classification |
|----------|-------|----------------|
| high | 1 (postcss advisory family) | NONBLOCKING WITH MITIGATION |
| moderate | 14 | Expo toolchain transitive |

**High:** `postcss` (transitive via Expo tooling) — sourceMappingURL / path issues in CSS tooling.  
Not a direct dependency. Fix path via `npm audit fix --force` wants **Expo 57** (breaking vs accepted SDK 53).  

Also present: moderate `uuid` via `@expo/config-plugins` / `xcode` (prebuild tooling).

**Classification for current product path:** NONBLOCKING WITH MITIGATION for the hosted/internal_rc mobile runtime; do not force-upgrade Expo outside SDK 53 without a dedicated upgrade program.

## iOS

Paused: no Apple Developer team login, no iOS EAS credentials, no iPhone registration in this directive.
