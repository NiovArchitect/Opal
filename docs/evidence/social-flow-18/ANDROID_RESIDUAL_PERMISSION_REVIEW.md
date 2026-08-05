# Residual Android permissions review (clean APK)

**APK:** `91cc279f-733c-48a0-a789-204351fe7e0c` · source `4dadd94`  
**Inspector:** `aapt dump permissions`  
**Date:** 2026-08-05

## Contact policy (closed for packaging)

| Permission | Packaged | Product need | Status |
|------------|----------|--------------|--------|
| READ_CONTACTS | PRESENT | Yes — selected-contact invite | **PASS** |
| WRITE_CONTACTS | ABSENT | No | **PASS** |

## Residual declarations

### SYSTEM_ALERT_WINDOW

| Question | Finding |
|----------|---------|
| Present in APK? | **Yes** |
| Source candidate | React Native `ReactAndroid/src/debug/AndroidManifest.xml` (overlay for DevSettings) |
| Product SF18 need? | **No** — Opal must not draw over other apps |
| Runtime prompt observed on physical device? | **NOT RUN** (no phone) |
| Can be blocked via Expo? | Yes — candidate for `withBlockedPermissions` on next bounded rebuild |
| Action now | **Documented residual** — do not claim complete privacy minimization until blocked + rebuilt if still present |

### READ_EXTERNAL_STORAGE / WRITE_EXTERNAL_STORAGE

| Question | Finding |
|----------|---------|
| Present in APK? | **Yes** (no maxSdkVersion visible in simple aapt dump) |
| Source candidate | Transitive `expo-file-system` AndroidManifest (bundled under `expo`) |
| Product SF18 need? | **No** broad device-file access for contact/invite journey |
| Used by app code? | Not for SF18 contacts path (secure-store / network only) |
| Runtime prompt on modern Android? | Often limited / legacy; **physical confirmation NOT RUN** |
| Action now | Document; consider tools:node remove or maxSdkVersion on next privacy PR |

### USE_BIOMETRIC / USE_FINGERPRINT

| Finding | Likely from expo-secure-store / biometric soft dependency |
| Product need | Acceptable for secure session storage architecture |
| Action | **Retain** unless proven unused |

### INTERNET / VIBRATE

| Finding | Expected network + UX feedback |
| Action | **Retain** |

## SMS / location / call log / camera / mic / phone state

All **ABSENT** from packaged uses-permission list.

## Verdict

| Gate | Status |
|------|--------|
| WRITE_CONTACTS packaging | **PASS** |
| Residual SYSTEM_ALERT_WINDOW explained | **REVIEW** (not yet blocked) |
| Residual external storage explained | **REVIEW** (expo-file-system) |
| Physical runtime grant behavior | **NOT RUN** |
