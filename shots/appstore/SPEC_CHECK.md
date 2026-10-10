# Paste W8 Phase 7 — App Store completeness SPEC_CHECK

Branch: `muse/packet-b-batch-2`  
Checked: 2026-10-10  
Scope: 7a–7e only (no Splash 2 PNG / shared-plans sheet / You gold / tab order)

| Item | Result | Evidence |
|------|--------|----------|
| **7a** App icon 1024 opaque | **PASS** | `apps/opal_mobile/assets/icon.png` is 1024×1024 RGB, no alpha (`hasAlpha: no`). Wired as `expo.icon` + `ios.icon`. |
| **7b** Branded Expo splash | **PASS** | `expo.splash` in `app.json` and explicit splash in `app.config.js`: image `./assets/icon.png`, `resizeMode: contain`, `backgroundColor: #050816`. No new heavy deps (`expo-splash-screen` was not already a dependency). |
| **7c** NSUsageDescriptions + notifications note | **PASS** | Contacts / location / mic strings plain-spoken in `app.json` (contacts em dash removed). `PLIST_AUDIT.md` synced to current strings. Notifications documented as **runtime** via `expo-notifications` (no fake plist usage key). |
| **7d** App Store privacy labels | **PASS** | Created `docs/APP_STORE_PRIVACY.md` covering contacts, calendar, email, location, voice, usage, and contacts-birthday. Short ASC paste copy. No em dashes. |
| **7e** Production gates + version | **PASS** | `ProductWebSurface.tsx` + `NativeFirstRunSurface.tsx` inject `opal_founder_seed` / seed storage only when `RELEASE_PROFILE.allowsLocalhost` (dev/test). Production / internal_rc do not. `profiles.ts` synced to **0.13.0** / build **5** (matches `app.json`). EAS `production` env is HTTPS/WSS only (`api`/`app.opal.niovlabs.com`); no LAN/dev URLs. |

## Summary

All of **7a–7e: PASS**.

## Related paths

- `apps/opal_mobile/app.json`
- `apps/opal_mobile/app.config.js`
- `apps/opal_mobile/eas.json`
- `apps/opal_mobile/src/release/profiles.ts`
- `apps/opal_mobile/src/shell/ProductWebSurface.tsx`
- `apps/opal_mobile/src/shell/NativeFirstRunSurface.tsx`
- `PLIST_AUDIT.md`
- `docs/APP_STORE_PRIVACY.md`
