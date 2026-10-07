# APP_STORE_PRIVACY_NOTES — founder questionnaire aid

Fill App Store Connect’s privacy questionnaire from this inventory.  
Do not invent categories. If a row is wrong, fix the product before submitting.

Generated: 2026-10-07 · Branch: `muse/packet-b-batch-2`

## Tracking

- **Third-party tracking SDKs:** none declared in this build.
- `PrivacyInfo.xcprivacy` sets `NSPrivacyTracking` = **false**.
- Analytics flags in release profiles are **false** for production_placeholder / internal_rc.

## Data the app collects

| Category | What | Where stored | Retention (current product) | Shared with third parties? |
|----------|------|--------------|-----------------------------|----------------------------|
| Account / contact info | Display name, phone (E.164) for OTP | Opal Postgres (`users`, activation challenges) | Account lifetime; OTP challenges short-lived | **Twilio Verify** (phone number for SMS OTP) |
| Messages | Chat text, voice-note metadata, delivery state | Opal Postgres + object storage for audio blobs | Account / conversation lifetime | No ad networks. Voice may go to **Deepgram** when `DEEPGRAM_API_KEY` set (transcription). Currently **stub** if key unset. |
| Contacts | Device contacts the user chooses to invite | Processed on-device / invite flow; selected invites may store phone/name for invite SMS | Invite records while pending/accepted | **Twilio Messaging** for invite SMS when configured |
| Location | When-in-use for trip/convoy ETA sharing | Shared with group participants via product APIs | Trip/session scoped | Not sold; not used for ads |
| Audio (calls) | WebRTC media | Ephemeral peer-to-peer / **Twilio TURN** relay when NTS used | Not recorded by default in this paste | **Twilio NTS** (ICE credentials + relay media while call active) |
| Call metadata | call_id, participants, duration_ms, outcome | `call_sessions` + intelligence `call.ended` events | Product analytics / memory features | Internal only |
| Device tokens | Expo push tokens | `device_tokens` table | Until disabled / DeviceNotRegistered | **Expo Push Service** → APNs |
| Photos / camera | User-selected media for stories/graphs | User-initiated uploads | Content lifetime | Storage provider only (no ad SDK) |
| Diagnostics | Structured server logs, optional Sentry | Server logs; Sentry if DSN set | Ops retention | **Sentry** only when `OPAL_SENTRY_DSN` configured (currently **unset**) |

## Third parties (operational)

| Vendor | Purpose | Status on this Mac (2026-10-07) |
|--------|---------|----------------------------------|
| Twilio Verify | SMS OTP | LIVE (founder-verified) |
| Twilio Messaging | Invite SMS | LIVE (founder-verified) |
| Twilio NTS | TURN/STUN for WebRTC | LIVE when account SID/token present (`r1a1.env`) |
| Expo Push | iOS/Android push fanout | Implemented; delivery needs APNs project credentials |
| Deepgram | Speech-to-text | **BLOCKED** — key not in runtime |
| Google Places | Venue search | **BLOCKED** — key not in runtime |
| Sentry | Crash/error reporting | **BLOCKED** — DSN unset |

## Production bypass audit (dev-only must stay off)

| Path | Production behavior |
|------|---------------------|
| `OPAL_PHONE_VERIFY_MODE` | Prefers `production_sms` when Twilio Verify creds present; explicit `synthetic_development` for local/tests only; never silent synthetic from production_sms |
| `opal_founder_seed` | FE seed for LAN walks; production WebView URLs must not append founder seed |
| `__DEV__` | RN host logs only under `__DEV__`; release builds strip |
| `EXPO_PUBLIC_OPAL_PROFILE=production_placeholder` | `devAuthEnabled: false`, `allowsLocalhost: false`, API → `https://api.opal.niovlabs.com` |
| EAS `production` profile | Bakes production HTTPS/WSS/web URLs (not LAN IPs) |

## Founder actions still required for Store

1. Confirm APNs key (p8) uploaded to Expo / EAS for bundle `local.opal.mobile` (or production bundle ID when changed).
2. Confirm production API host is live at the URLs baked into EAS production profile (or update env before submit).
3. App Store screenshots, description, privacy policy URL (designer/founder — out of this paste).
4. Physical two-device CallKit + NAT walk (`TWO_DEVICE_MATRIX.json` founder rows).
