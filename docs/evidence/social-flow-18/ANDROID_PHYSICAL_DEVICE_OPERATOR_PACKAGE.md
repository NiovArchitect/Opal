# Android physical device operator package (SF18)

**Status:** Operator package only. Physical gates remain open until founder runs devices.  
**Source commit (package authored against):** `9db9e45`  
**Branch:** `ops/sf18-physical-device-closure`

## Stack (development profile)

| Item | Value |
|------|--------|
| Expo SDK | ~53.0.0 |
| React Native | 0.79.2 |
| expo-contacts | ~14.2.0 |
| expo-secure-store | ~14.2.0 |
| Package name | `local.opal.mobile` |
| Permission | `READ_CONTACTS` declared |
| EAS profile | `development` (APK) |
| Profile env | `EXPO_PUBLIC_OPAL_PROFILE=internal_rc` |
| HTTP API | `https://api.opal.niovlabs.com` |
| WebSocket base | `wss://api.opal.niovlabs.com/socket` |
| DevAuth | **disabled** in RC |

## 0. One-time auth (founder)

```bash
cd apps/opal_mobile
npx eas-cli login
npx eas-cli whoami   # must show account
```

## 1. Build

```bash
cd apps/opal_mobile
npm install
npx expo install expo-dev-client
npx eas build --profile development --platform android
```

`eas.json` sets `"buildType": "apk"` for installable internal testing (not Play Store production).

Record:

| Field | Value |
|-------|--------|
| Source commit | (fill) |
| Profile | development |
| Build ID | (fill) |
| Build URL | (fill) |
| Artifact | APK / development client |
| Package | local.opal.mobile |
| Result | (pass/fail) |

## 2. Install

1. Download APK from EAS on the Android device (or `adb install` if available).  
2. Allow install from unknown sources / browser if prompted.  
3. Launch Opal; confirm hosted API (no localhost).

## 3. Controlled fixtures

Same labels as iOS package (Opal Test A/B/No Phone/Duplicate/International).  
Do not document real private numbers.

## 4. Permission matrix

### Not requested

Find People CTA; no contacts before action; explanation before system dialog.

### Granted

System READ_CONTACTS grant → controlled contacts; select one phone; only selected submitted.

### Denied

Deny → Chats usable; manual invite; no shame; no full address-book upload.

### Do not ask again

Deny + system “don’t ask again” where shown → product still usable; Settings path for re-grant.

### Revoked

Settings → Apps → Opal → Permissions → Contacts → Deny → return: no crash; relationships retained; manual fallback.

### Shape cases

One phone · multiple phones · no phone · duplicate normalized · international · manual fallback.

## 5. Selected-only proof

| Metric | Expected |
|--------|----------|
| unselected phone values submitted | **0** |

Counts only. No names/numbers in evidence.

## 6. Session

Activate → kill app → restore via secure store → sign-out clears session and protected nav.

## 7. Realtime + BG/FG

Pair with iOS User A or second Android. Same dual-user and background matrix as iOS package.

## 8. TalkBack

Settings → Accessibility → TalkBack → On.

Walk: Find People, permission, selection, multi-phone, manual invite, first moment, incoming message, sign-out.

Mark: **PASS / FAIL / BLOCKED / NOT RUN** — never convert NOT RUN to PASS.

## 9. Build record (fill after EAS)

| Field | Value |
|-------|--------|
| Build ID | **NOT RUN** — EAS not logged in on operator agent |
| Build URL | — |
| adb in agent | not available |

Resume after founder `npx eas-cli login` and device available.
