# Android final APK permission audit (post PR #43)

**Status language:**  
**SOCIAL FLOW 18 PARTIALLY COMPLETE**  
**CLEAN STANDALONE ANDROID APK BUILT WITH READ-ONLY CONTACT PERMISSIONS**  
**PHYSICAL AND IOS GATES REMAIN OPEN**

## Artifact

| Field | Value |
|-------|--------|
| Build ID | `91cc279f-733c-48a0-a789-204351fe7e0c` |
| Profile | `internal_rc` |
| Source commit | `4dadd94` (main after PR #43 merge) |
| Package | `local.opal.mobile` |
| Version | 0.12.0 (versionCode 1) |
| SDK | min 24 / target 35 |
| Application label | Opal |
| Size | ~64 MB |
| SHA-256 | `5905cd56765f83f16eccc0915592b24c6b789de927141e2db299f11c974482e0` |
| Local path | `/tmp/opal-android/opal-internal-rc-4dadd94.apk` |
| EAS page | https://expo.dev/accounts/sadeil/projects/opal-mobile/builds/91cc279f-733c-48a0-a789-204351fe7e0c |
| APK URL | https://expo.dev/artifacts/eas/sX0l5UeUHp2LQSdBMgAhJhfdJoFbAl8CqEHU0c81DVE.apk |
| Expires | per EAS retention (~14 days from build) |
| Hosted API | `https://api.opal.niovlabs.com` (via `EXPO_PUBLIC_OPAL_PROFILE=internal_rc`) |
| Hosted socket | `wss://api.opal.niovlabs.com/socket` |
| DevAuth | off |

## Superseded artifact

| Build | Commit | Note |
|-------|--------|------|
| `0736b4fc-…` | `1f83e18` | Pre–WRITE_CONTACTS fix; **do not use** for final contact-permission validation |

## Packaged uses-permission (`aapt dump permissions`)

| Permission | Result | Notes |
|------------|--------|-------|
| INTERNET | PRESENT | Hosted API/socket |
| **READ_CONTACTS** | **PRESENT** | Selected-contact journey |
| **WRITE_CONTACTS** | **ABSENT** | **PASS** — privacy goal met |
| READ_SMS / SEND_SMS / RECEIVE_SMS | ABSENT | |
| READ_CALL_LOG / WRITE_CALL_LOG | ABSENT | |
| ACCESS_*_LOCATION | ABSENT | |
| RECORD_AUDIO / CAMERA | ABSENT | |
| READ_PHONE_STATE | ABSENT | |
| QUERY_ALL_PACKAGES | ABSENT | |
| SYSTEM_ALERT_WINDOW | PRESENT | Residual Expo default; review for future minimization |
| READ_EXTERNAL_STORAGE / WRITE_EXTERNAL_STORAGE | PRESENT | Legacy storage (minSdk 24); review later |
| USE_BIOMETRIC / USE_FINGERPRINT | PRESENT | Secure-store related |

## Standalone character

| Check | Result |
|-------|--------|
| `developmentClient` in profile | false (absent) |
| `expo-dev-client` / EXDevLauncher in APK markers | not in manifest binary scan |
| metro / localhost markers in manifest | no |
| Bundle packaged | `assets/index.android.bundle` present |

## WRITE_CONTACTS string in dex/bundle

`WRITE_CONTACTS` string may still appear inside JS/native library constants (`classes.dex`, `index.android.bundle`).  
**Authoritative install-time permission list is `aapt dump permissions`**, which does **not** declare WRITE_CONTACTS.

## Verdict

| Gate | Status |
|------|--------|
| Packaged WRITE_CONTACTS absent | **PASS** |
| Packaged READ_CONTACTS present | **PASS** |
| SMS / location / call log absent | **PASS** |
| Physical install matrix | **NOT RUN** |
| Emulator journey | **BLOCKED** (host) |

## Physical handoff

See `ANDROID_PHYSICAL_INSTALL_HANDOFF.md`.
