# PLIST_AUDIT — Apple Info.plist / Expo iOS usage strings

Branch: `muse/packet-b-batch-2`  
Source of truth: `apps/opal_mobile/app.json` → `expo.ios.infoPlist` (+ `plugins/withCallKeep.js`)  
Audited: 2026-10-07

| Key | Current string | Apple why-required | PASS/FAIL |
|-----|----------------|--------------------|-----------|
| `NSMicrophoneUsageDescription` | Opal needs microphone access for voice calls and voice messages. | Explains voice calls + voice messages | **PASS** |
| `NSCameraUsageDescription` | Opal needs camera access for video calls. | Explains video calls | **PASS** |
| `NSLocationWhenInUseUsageDescription` | Opal uses your location to share trip ETAs with your group. | Explains convoy/trip ETA sharing | **PASS** |
| `NSContactsUsageDescription` | Opal accesses contacts so you can invite friends. | Contacts bridge is active (`expo-contacts` plugin) | **PASS** |
| `NSPhotoLibraryUsageDescription` | Allow Opal Graph to access photos you choose to add to Stories, Graphs, and conversations. | Photo picker for media | **PASS** |
| `NSSpeechRecognitionUsageDescription` | Opal uses speech recognition to understand your voice. | Center voice STT | **PASS** |
| `UIBackgroundModes` | `audio`, `voip`, `remote-notification`, `fetch` | Call audio, CallKit/VoIP wake, push, background sync | **PASS** |
| `ITSAppUsesNonExemptEncryption` | `false` | Export compliance | **PASS** |

## Notes

- Vague strings like “needs access” are absent.
- CallKeep plugin re-asserts mic/camera + `audio`/`voip` modes at prebuild time.
- Simulator is insufficient to certify CallKit lock-screen behavior (see `PHASE3_CALLKIT_VERIFY.json`).
