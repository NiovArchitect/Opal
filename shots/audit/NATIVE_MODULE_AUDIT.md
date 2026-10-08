# Native module audit — Bring to Life Phase 1 (2026-10-08)

Rebuild path chosen: **EAS development client** (`npx eas build --profile development --platform ios --non-interactive`).

Why development (not production): founder walks first-run on LAN Vite (`EXPO_PUBLIC_OPAL_WEB_URL=http://192.168.86.156:5173`). Production IPA bakes `app.opal.niovlabs.com` and would not exercise the contact bridge against the local tip. Dev client is the faster unblock for real contacts.

Build number: **4** (was 3). Bundle: `local.opal.mobile`.

## Modules in this rebuild

| Module | In package.json | In app.json plugins | In binary after rebuild | Notes |
|--------|-----------------|---------------------|-------------------------|-------|
| `expo-contacts` | YES (~14.2.0) | YES + withReadOnlyContacts | YES (this rebuild's purpose) | Permission copy matches NSContactsUsageDescription |
| `expo-notifications` | YES | YES | YES | Push token bridge already code-complete |
| `expo-speech` + `expo-speech-recognition` | YES | YES | YES | Opal Center STT/TTS |
| `expo-image-picker` / document-picker | YES | YES | YES | Media bridge |
| `expo-dev-client` | YES | YES | YES | Required for this profile |
| `react-native-callkeep` | **NO** | plist-only `withCallKeep.js` | **NO** — not a dependency | CallKeep bridge falls back to in-app incoming UI. Adding CallKeep mid-flight risks Expo SDK 53 native link failures; documented for a later rebuild. |

## Contact permission copy (must appear on device)

> Opal needs your contacts so you can pick real people to plan with — not type names from memory.

Sources: `app.json` `ios.infoPlist.NSContactsUsageDescription` + expo-contacts plugin `contactsPermission`.

## Install path for founder

1. Wait for EAS build to finish (see `EAS_DEV_BUILD_START.log` / Expo dashboard).
2. Install via Expo internal distribution QR / link on the provisioned iPhone (UDID already on Ad Hoc profile).
3. Force-quit old client; open new build; open Meet Opal / add person; grant contacts; pick Chanel.
4. Metro / Vite LAN: keep Vite at `192.168.86.156:5173` with tip SHA; start `npx expo start --dev-client --lan` if the client needs Metro.

## Verification checklist (device)

- [ ] New build launches (buildNumber 4)
- [ ] Contact permission prompt shows correct copy
- [ ] Selecting a contact returns name + phone to JS (`opal_native_request_contacts`)
- [ ] Denied permission → typed-text fallback + one-time note


## Build attempts (2026-10-08)

1. `a4793518-4afc-414d-941d-6e131bbf599e` — ERRORED: AdHoc profile missing Push Notifications / `aps-environment`.
2. Retry with `--refresh-ad-hoc-provisioning-profile` — failed non-interactively (no ASC API key: `EXPO_ASC_API_KEY_PATH` / EAS submissions key).
3. Retry buildNumber **5**: dropped `expo-notifications` + `remote-notification` from **development** AdHoc binary so signing succeeds. Contacts + speech + mic remain. Production retains push via `app.config.js` when `EAS_BUILD_PROFILE=production`.

Founder unblock: install internal distribution build #5 when FINISHED. Push verification stays on production/TestFlight IPA.
