# Android validation session evidence (2026-08-05)

**SF18 status: PARTIALLY COMPLETE**  
**Apple/iOS: not attempted (founder searching credentials)**

## Artifacts

| Build | Profile | Status | Notes |
|-------|---------|--------|-------|
| `4f59b55e-bc50-473b-a196-c58f4659c06c` | development | FINISHED | Dev client; may require Metro |
| `0736b4fc-38db-4a50-8db4-5c147ff4fc0f` | internal_rc | IN_PROGRESS → check Expo | Standalone hosted APK intended |

## Device discovery

| Check | Result |
|-------|--------|
| adb installed | yes (Homebrew cask android-platform-tools 37.0.1) |
| Physical Android attached | **none** (`adb devices` empty) |
| Emulator | **not installed** this session (no physical device; emulator deferred until standalone APK ready) |

## Matrix (Android)

| Gate | Status |
|------|--------|
| APK install | NOT RUN (no device) |
| Permission not requested / granted / denied / DNAA / revoked | NOT RUN |
| Selected-only (unselected submitted = 0) | NOT RUN |
| Session restore / sign-out | NOT RUN |
| Invitation / acceptance | NOT RUN |
| Native realtime | NOT RUN |
| BG/FG | NOT RUN |
| TalkBack | NOT RUN |
| Personas | NOT RUN |
| First social moment / quiet / active signal | NOT RUN |

## Source preservation

- Branch `ops/sf18-android-device-validation` → PR #41 → merged main `a2e873b`
- EAS project ID and expo-dev-client preserved on main

## Next founder steps

1. Wait for `internal_rc` build `0736b4fc-…` to finish; install APK on physical Android.  
2. Or attach Android USB + `adb install`.  
3. Execute `ANDROID_PHYSICAL_DEVICE_OPERATOR_PACKAGE.md`.  
4. iOS only after “Apple credentials ready”.
