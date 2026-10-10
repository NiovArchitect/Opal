# PLIST_AUDIT — Apple Info.plist / Expo iOS usage strings

Branch: `muse/packet-b-batch-2`  
Source of truth: `apps/opal_mobile/app.json` → `expo.ios.infoPlist` (+ `plugins/withCallKeep.js`)  
Audited: 2026-10-10 (Paste W8 Phase 7c)

| Key | Current string | Apple why-required | PASS/FAIL |
|-----|----------------|--------------------|-----------|
| `NSMicrophoneUsageDescription` | Opal needs microphone access for voice calls and voice messages. | Explains voice calls + voice messages | **PASS** |
| `NSCameraUsageDescription` | Opal needs camera access for video calls. | Explains video calls | **PASS** |
| `NSLocationWhenInUseUsageDescription` | Opal uses your location to share trip ETAs with your group. | Explains convoy/trip ETA sharing | **PASS** |
| `NSContactsUsageDescription` | Opal needs your contacts so you can pick real people to plan with, not type names from memory. | Contacts bridge is active (`expo-contacts` plugin) | **PASS** |
| `NSPhotoLibraryUsageDescription` | Allow Opal Graph to access photos you choose to add to Stories, Graphs, and conversations. | Photo picker for media | **PASS** |
| `NSSpeechRecognitionUsageDescription` | Opal uses speech recognition to understand your voice. | Center voice STT | **PASS** |
| `UIBackgroundModes` | `audio`, `voip`, `fetch` (+ `remote-notification` on production via `app.config.js`) | Call audio, CallKit/VoIP wake, push (prod), background sync | **PASS** |
| `ITSAppUsesNonExemptEncryption` | `false` | Export compliance | **PASS** |

## Notifications (runtime — no fake plist key)

- There is **no** static Info.plist usage-description key for push/local notifications on modern iOS.
- Permission is requested at **runtime** via `expo-notifications` → `UNUserNotificationCenter` after auth (see `pushTokenBridge.ts` / ProductWebSurface post-auth bridge).
- Production EAS profile keeps the `expo-notifications` plugin + `remote-notification` background mode; non-production profiles strip them so AdHoc contacts builds can sign without `aps-environment`.
- Do **not** invent a plist string for notifications. Document the runtime path only.

## Notes

- Usage strings for contacts, location, and mic are plain-spoken (no em dashes).
- CallKeep plugin re-asserts mic/camera + `audio`/`voip` modes at prebuild time.
- Simulator is insufficient to certify CallKit lock-screen behavior (see `PHASE3_CALLKIT_VERIFY.json`).
