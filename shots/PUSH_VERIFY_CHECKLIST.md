# PUSH_VERIFY_CHECKLIST — production IPA / TestFlight

Branch: `muse/packet-b-batch-2`  
Written: **2026-10-07**  
Audience: founder (physical devices)  
Agent role: procedure only — do **not** execute this walk from the agent session.

## Why this exists

EAS production build [2026-10-07] assigned an **APNs key** to bundle `local.opal.mobile`.
That unblocks the credential path. This checklist proves **end-to-end push** on the
signed store build (TestFlight), with the app backgrounded, against production.

IPA: https://expo.dev/artifacts/eas/j69l0eCfZb0Ha8XpryL08mWU9jotfKk0hosBgU4kyRk.ipa  
Upload first: `docs/TESTFLIGHT_UPLOAD.md`

## Preconditions (all must be true)

| # | Check | How |
|---|--------|-----|
| P1 | IPA uploaded and processing finished | App Store Connect → TestFlight → build ready |
| P2 | Founder installed via TestFlight | Not Expo Dev Client, not LAN Vite shell alone |
| P3 | Production API up | `curl -fsS https://api.opal.niovlabs.com/health` → `status: ok` |
| P4 | Notifications allowed on Device A | iOS Settings → Opal Graph → Notifications → Allow |
| P5 | Two identities | Device A = recipient; Device B (or second account) = sender |
| P6 | Both accounts activated | Real phone OTP against production (Twilio LIVE) |

**Device A** = iPhone under test (TestFlight build, will receive the push).  
**Device B** = second phone **or** another logged-in client that can send a message to Device A’s user (second TestFlight install, or a trusted second account on another device).

## Exact steps

### 1. Install and sign in on Device A

1. Install the production build from TestFlight.
2. Launch once; accept **Notifications** when iOS prompts (if you skipped it, enable in Settings before continuing).
3. Complete activation / login so you land in the main product shell (Chats / Home).
4. Confirm you are on production (no LAN IP in failure toasts; OTP came via SMS).

### 2. Let the app register its Expo push token

1. Stay on Device A with the app **foregrounded** for ~10–20 seconds after login.
2. Navigate once (e.g. open Chats) so the native host can bridge the Expo push token after auth (`bridgeExpoPushTokenAfterAuth` path in the mobile shell).
3. Optional ops check (if you have BEAM/SQL access to production): confirm a row exists in `device_tokens` for Device A’s user with an Expo token (`ExponentPushToken[...]`). If you cannot query production, skip — the physical notification is the acceptance test.

### 3. Background Device A

1. On Device A, press Home / swipe up so **Opal Graph is fully backgrounded** (not on screen).
2. Lock the phone **or** leave it unlocked on the home screen — either is fine; the app must not be in the foreground.
3. Do not force-quit the app (force-quit can suppress delivery on some iOS versions during first verify).

### 4. Send a message from Device B

1. On Device B, sign in as a **different** user who can message Device A’s account (existing thread or start one).
2. Send a short, distinctive text, e.g. `push-verify-2026-10-07`.
3. Wait up to ~30 seconds.

### 5. Confirm the push on Device A

Pass criteria (all):

- [ ] A system notification appears for Opal Graph / your ASC app name.
- [ ] Notification shows the **sender name** (or clear sender identity the product uses).
- [ ] Notification shows a **preview** of the message body (or the product’s truncated preview of that text).
- [ ] Tapping the notification opens the app to the relevant conversation (best effort — note FAIL if it only opens Home).

Record result:

| Field | Value |
|-------|--------|
| Date / time (local) | |
| TestFlight build number | |
| Device A model / iOS | |
| Sender identity (Device B) | |
| Push arrived? (Y/N) | |
| Sender name visible? (Y/N) | |
| Preview visible? (Y/N) | |
| Tap opens thread? (Y/N) | |
| Screenshot path (optional) | `shots/…` |

## Failure triage (founder)

| Observation | Likely cause | Next action |
|-------------|--------------|-------------|
| No notification at all | Permission denied; token never registered; production push worker / Expo not reaching APNs | Re-check Settings → Notifications; relaunch + stay foreground 20s; confirm production `DeliverPushWorker` / Expo receipt logs if available |
| Notification with generic title only | Payload title/body mapping | Note in walk log; product follow-up — still counts as “push path live” if APNs delivered |
| Works only when app is foregrounded | Background mode / APNs env mismatch | Confirm this IPA was **production** profile (APNs production); reinstall from TestFlight |
| Works on Dev Client, fails on TestFlight | Wrong API host or token registered against wrong backend | Confirm Device A talks to `api.opal.niovlabs.com` |
| `DeviceNotRegistered` in server logs | Stale token after reinstall | Relaunch Device A once; retry send |

## Out of scope

- Agent cannot run this without founder devices and TestFlight install.
- Two-device **call** matrix is a separate walk.
- Deepgram / Places / Sentry remain optional and unrelated to push.

## Acceptance

**PASS** when Device A, on the TestFlight production IPA, receives a background push for an inbound message that includes sender identity and message preview.  
Mark this file’s result table and optionally drop a screenshot under `shots/` when done.
