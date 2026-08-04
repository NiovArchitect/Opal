# iOS physical device operator package (SF18)

**Status:** Operator package only. Physical gates remain open until founder runs devices.  
**Source commit (package authored against):** `9db9e45` (update after build with exact EAS build SHA)  
**Branch for follow-up evidence:** `ops/sf18-physical-device-closure`

## Stack (development profile)

| Item | Value |
|------|--------|
| Expo SDK | ~53.0.0 |
| React Native | 0.79.2 |
| expo-contacts | ~14.2.0 |
| expo-secure-store | ~14.2.0 |
| phoenix (JS) | ^1.7.21 |
| Bundle ID | `local.opal.mobile` |
| EAS profile | `development` (`eas.json`) |
| Profile env | `EXPO_PUBLIC_OPAL_PROFILE=internal_rc` |
| HTTP API | `https://api.opal.niovlabs.com` |
| WebSocket base | `wss://api.opal.niovlabs.com/socket` (Phoenix client appends transport) |
| DevAuth | **disabled** in `internal_rc` |
| Fixed Alex/Jordan | **not used** |
| Localhost | **not allowed** in RC profile |

## 0. One-time auth (founder)

```bash
cd apps/opal_mobile
npx eas-cli login
```

Complete browser / password / 2FA if prompted.  
Resume: `npx eas-cli whoami` must print your Expo account (not "Not logged in").

Apple Developer access required for device signing. Do not add unknown devices without confirmation.

## 1. Build (installable development client)

```bash
cd apps/opal_mobile
npm install
npx expo install expo-dev-client
npx eas build --profile development --platform ios
```

Record after build:

| Field | Value |
|-------|--------|
| Source commit | (fill) |
| EAS account | (fill) |
| Profile | development |
| Build ID | (fill) |
| Build URL | (fill) |
| Artifact | development client (internal) |
| Bundle ID | local.opal.mobile |
| Result | (pass/fail) |

**Not** an App Store production build.

If EAS asks to register a device:

```bash
npx eas device:create
# or follow the QR / registration URL EAS prints
```

Confirm with founder before registering extra devices.

## 2. Install

1. Open the EAS build page on the iPhone (same Apple ID / registered UDID).  
2. Install the development client.  
3. Trust developer if prompted (Settings → General → VPN & Device Management).  
4. Launch **Opal**. Confirm activation targets hosted API (no localhost error).

## 3. Controlled contact fixtures (do not use ordinary address book for evidence)

Create only these on the test device (or in a test iCloud contacts account):

| Label | Phones | Notes |
|-------|--------|--------|
| Opal Test A | one valid test number | single select |
| Opal Test B | two labeled numbers | multi-phone select one |
| Opal Test No Phone | none | must not invite by phone |
| Opal Test Duplicate | same number as A (different contact) | normalization |
| Opal Test International | controlled international format | format path |

Use synthetic hosted identities when the API requires fixture users.  
**Never** paste real private numbers into git docs or evidence files.

## 4. Permission matrix

### A. Not determined

1. Reset: Settings → General → Transfer or Reset iPhone → Reset → Reset Location & Privacy (or delete/reinstall app).  
2. Open Opal → Find People.  
3. **Expect:** no contacts before action; pre-permission explanation; CTA visible.

### B. Authorized (full)

1. Grant full contacts when prompted.  
2. Controlled contacts appear; search works.  
3. Select **one** contact / one phone.  
4. Confirm invitation submission.  
5. **Expect:** only selected phone submitted (see §5).

### C. Limited (iOS where supported)

1. Choose Limited Access; pick only Opal Test A.  
2. **Expect:** only selected system contacts; no permission-failure UI; app usable.

### D. Denied

1. Deny on prompt.  
2. **Expect:** Chats usable; manual invite / share link available; no shame copy; no immediate nag loop.

### E. Revoked

1. Grant, then Settings → Opal → Contacts → Off.  
2. Return to Opal.  
3. **Expect:** no crash; no broad access; existing relationships/conversations remain; manual fallback remains.

## 5. Selected-only network proof (safe aggregates only)

Record **counts only** (from in-app minimization diagnostics if shown, or test hooks):

| Metric | Expected |
|--------|----------|
| local contacts loaded | ≥ 0 |
| contacts displayed | ≥ 0 |
| contacts selected | N |
| phone values selected | N |
| phone values submitted | N |
| **unselected phone values submitted** | **0** |

Do **not** log names, numbers, contact IDs, emails, photos, notes.

## 6. Session

1. Activate with synthetic/hosted path (no DevAuth).  
2. Kill app fully; reopen → session restored via secure store.  
3. Sign out → server session revoked; local secure credential cleared; socket down; protected nav cleared; back does not reveal protected UI.

## 7. Dual-user realtime

Preferred: this iPhone as User A; Android (or second iOS) as User B.

1. A and B activate.  
2. A invites B; B accepts.  
3. Relationship + conversation appear.  
4. A sends; B receives immediately; B replies; A receives.  
5. No reload/polling substitute; order correct; no duplicates.

## 8. Background / foreground

1. A opens conversation; background app.  
2. B sends M1, M2.  
3. A returns: reconnect, rejoin, M1/M2 once, order OK.  
4. A sends M3; B receives immediately.

## 9. First social moment + quiet/active

- After acceptance: one Opal moment (not a human bubble / chatbot / identity subtitle).  
- Quiet chat: no moment, no journey bar, no glow.  
- Active plan-like chat: at most one calm conversation-scoped signal; no location prompt; no feed.

## 10. VoiceOver

Settings → Accessibility → VoiceOver → On.

Walk: Find People, permission copy, search, selection, multi-phone, confirm, manual fallback, invitation state, first moment, incoming message, signal, sign-out.

Check: reading order, selected announced, no color-only state, errors announced, focus not stolen, moment announced once politely.

## 11. Screenshots (safe)

Crop or redact any real contact text. Prefer fixture labels only. No phone numbers in uploaded evidence.

## 12. Failure reporting template

```text
Platform: iOS
Build ID:
Commit:
Step: (permission B / realtime / BG-FG / …)
Expected:
Actual:
Crash: yes/no
Safe counts: (aggregates only)
```

## Build record (fill after EAS)

| Field | Value |
|-------|--------|
| Build ID | **NOT RUN** — EAS not logged in on operator agent |
| Build URL | — |
| Install path | — |
| Source commit at build | — |

Agent session: `npx eas-cli whoami` → **Not logged in**. Resume after founder `npx eas-cli login`.
