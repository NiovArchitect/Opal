# EAS / development-client install path (SF18)

## Source

- Repo: Opal
- Branch (this work): `ops/sf18-eas-and-knowledge-docs`
- App: `apps/opal_mobile`
- Config: `eas.json` profiles `development` and `development_simulator`

## Reported stack

| Component | Version / value |
|-----------|-----------------|
| Expo | ~53.0.0 |
| React Native | 0.79.2 |
| expo-contacts | ~14.2.0 |
| expo-secure-store | ~14.2.0 |
| phoenix (JS) | ^1.7.21 |
| iOS bundle id | `local.opal.mobile` |
| Android package | `local.opal.mobile` |
| App version | 0.12.0 |

Permission strings are configured in `app.json` (NSContactsUsageDescription + expo-contacts plugin; Android `READ_CONTACTS`).

## Commands (founder-operated Apple/Google credentials)

```bash
cd apps/opal_mobile
npm install
npx expo install expo-dev-client
npx eas-cli login
npx eas build --profile development --platform ios
npx eas build --profile development --platform android
```

Environment for hosted API:

```bash
EXPO_PUBLIC_OPAL_PROFILE=internal_rc
# profiles map internal_rc → https://api.opal.niovlabs.com
```

Local Xcode path (if preferred over EAS):

```bash
cd apps/opal_mobile
npx expo run:ios --device
```

Requires: Apple Developer signing, physical device or installed simulator runtime, matching provisioning for `local.opal.mobile`.

Do **not** rely on Expo Go if the full contact permission model cannot be proven there.

## This operator session

| Requirement | Status |
|-------------|--------|
| Xcode | 15.2 present |
| iOS Simulator runtime (usable) | **not available** (only unavailable 16.2 stub listed) |
| Physical iOS device | not attached |
| adb / Android device | not present |
| EAS CLI login | not configured in agent |
| expo / eas global CLI | not on PATH (use npx) |
| App Store publish | **not done** (correct) |

## Closure note

Build configuration (`eas.json`, permission strings, hosted profile env) is ready.  
**Physical install and permission matrices remain required for SF18 closure.**  
Jest, browser automation, API-only, or simulated permission objects do **not** close Social Flow 18.
