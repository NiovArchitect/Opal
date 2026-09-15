# Tranche #1 — Physical walk checklist (Dev Client rebuild)

## Build (FINISHED)
| Field | Value |
|---|---|
| Implementation SHA (media bridge) | `8dc8a2a` |
| Build SHA | `b0d7bcb` (ancestor includes `8dc8a2a`) |
| EAS build ID | `e1430969-7b08-4f98-a7a7-7e88018aa08c` |
| Status | **finished** |
| Profile | `development` (`developmentClient: true`) |
| App version | `0.13.0` |
| CFBundleVersion (EAS) | `1` |
| Expo SDK | `53.0.0` |
| Native packages | `expo-image-picker@16.1.4`, `expo-document-picker@13.1.6` (no `expo-camera`) |
| IPA | https://expo.dev/artifacts/eas/xX5RScc3tvQDS9oy21mKnJpvRQXxzx-dNf605Gt3Yf8.ipa |
| Build page | https://expo.dev/accounts/sadeil/projects/opal-mobile/builds/e1430969-7b08-4f98-a7a7-7e88018aa08c |
| Provisioned device UDID | `00008140-001835222262401C` |

## Install
1. On founder iPhone Safari, open the **build page** above (Expo account signed in).
2. Tap **Install** for the new Development Client.
3. Settings → General → VPN & Device Management → trust developer if prompted.
4. **Do not** keep using the previous Dev Client binary for this walk.
5. Confirm SpringBoard app is the newly installed build (install time ~ finished 2026-09-14 22:13 PT).

## Runtime chain
```
iPhone → NEW Dev Client → Metro :8081 → Opal shell → WebView → Vite :5173
```
- Metro: `cd apps/opal_mobile && npx expo start --dev-client --lan --port 8081`
- Web: Vite on `http://192.168.86.156:5173` (`EXPO_PUBLIC_OPAL_WEB_URL`)
- In Expo launcher, open **`http://192.168.86.156:8081`** (Metro — never type :5173 into Expo)

## Walk order (founder)
1. **Your Story → Camera** (primary gate)
2. Your Story → Photo library
3. Graph Create → Camera / Library
4. Center → Plus → Camera / Photo / Document (+ cancel)
5. Camera permission deny → Settings honesty
6. Cross-surface cancel → other surface routing
7. Session / sign-out smoke

## Honesty
- `data:` preview OK for small images; large video/doc via WebView = PARTIAL
- `DURABLE_MEDIA_UPLOAD` stays PARTIAL
- `CENTER_INTELLIGENCE_CAN_USE_ATTACHMENT` stays NOT GREEN
- TRANCHE_2 = NO · STORE/MERGE/LIVE = NO

## Physical flags (fill after walk)
- IOS_CAMERA_*_PHYSICAL =
- IOS_PHOTO_LIBRARY_*_PHYSICAL =
- IOS_DOCUMENT_*_PHYSICAL =
- CAMERA_PERMISSION_DENIED_PHYSICAL =
- STORY/GRAPH/CENTER_NATIVE_MEDIA_PHYSICAL =
- MEDIA_REQUEST_ID_PHYSICAL_ROUTING =
- VIDEO_MEDIA_HANDOFF =
- NATIVE_SESSION_REGRESSION =
- NATIVE_LAUNCH_REGRESSION =
