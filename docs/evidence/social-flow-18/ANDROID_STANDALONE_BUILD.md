# Android standalone internal_rc build

| Field | Value |
|-------|--------|
| Build ID | `0736b4fc-38db-4a50-8db4-5c147ff4fc0f` |
| Status | **FINISHED** |
| Profile | `internal_rc` |
| developmentClient | **false** (absent) |
| distribution | internal |
| buildType | apk |
| Package | `local.opal.mobile` |
| SDK | 53.0.0 |
| Version | 0.12.0 |
| Source commit | `1f83e18` |
| Page | https://expo.dev/accounts/sadeil/projects/opal-mobile/builds/0736b4fc-38db-4a50-8db4-5c147ff4fc0f |
| Artifact | 64MB APK Zip |
| Expires | ~2026-08-19 |
| API env | EXPO_PUBLIC_OPAL_PROFILE=internal_rc → https://api.opal.niovlabs.com |
| Socket | wss://api.opal.niovlabs.com/socket |
| DevAuth | off |

## Standalone character

Profile does **not** set `developmentClient: true`.  
Expected: app opens with embedded JS; no Metro / QR / "Select a development server".  
Device confirmation still required at install (emulator or phone).

## Not final proof alone

Must still pass install + social journey gates. Label evidence **EMULATOR ONLY** until physical phone.
