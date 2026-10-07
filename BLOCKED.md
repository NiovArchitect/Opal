# BLOCKED — founder credentials & operational status

Branch: `muse/packet-b-batch-2`  
Scope: Real Multi-User Calling + Apple Store Operational Readiness  
Runtime truth checked: **2026-10-07T20:22:13Z** (Mac BEAM on `:4000` + `~/.opal/r1a1.env`)

Items below are implemented in code with honest stubs / disabled paths where
credentials are absent. Status reflects **actual runtime**, not hope.

| Item | Needed from | Env / artifact | Status |
|------|-------------|----------------|--------|
| Twilio Verify (SMS OTP) | — | `OPAL_TWILIO_ACCOUNT_SID`, `OPAL_TWILIO_AUTH_TOKEN`, `OPAL_TWILIO_VERIFY_SERVICE_SID` + `OPAL_PHONE_VERIFY_MODE=production_sms` (or auto when creds present) | **LIVE — verified by founder 2026-10-07** (real SMS OTP). Creds present in `~/.opal/r1a1.env`. |
| Twilio Messaging (invite SMS) | — | `OPAL_TWILIO_FROM_NUMBER` or `OPAL_TWILIO_MESSAGING_SERVICE_SID` (+ account SID/token) | **LIVE — verified by founder 2026-10-07** (invite texts working). |
| Twilio NTS (TURN) | Uses same Twilio account SID/token | `OPAL_TWILIO_ACCOUNT_SID` + `OPAL_TWILIO_AUTH_TOKEN` | Code mints via NTS Tokens API; requires those env vars on the Phoenix process. |
| Deepgram API key | Founder | `DEEPGRAM_API_KEY` from https://console.deepgram.com | **BLOCKED — key not in runtime env** (shell, BEAM process, launchctl, `~/.opal/*`). Stub path confirmed 2026-10-07T20:21:37Z: `transcribe_batch` → `{:ok, %{stub: true, transcript: "Yes, let's lock in Juniper for Saturday.", raw_provider: "deepgram_stub"}}`. |
| Google Places (live venue) | Founder | `GOOGLE_PLACES_API_KEY` | **BLOCKED — not in runtime env.** Phase E `VenueLookup.search_or_demo/2` serves offline demo venues. Full API wiring is a separate future paste. |
| Sentry DSN | Founder | `OPAL_SENTRY_DSN` or `SENTRY_DSN` | **BLOCKED — not in BEAM env.** `/health` reports `sentry_configured: false`. Stub captures/logs only. |
| Apple Developer / APNs | Founder | Apple Developer → Keys → create APNs key (p8) → upload to Expo/EAS for bundle `local.opal.mobile` (or production bundle). Optional direct: `APNS_KEY_ID` / `APNS_TEAM_ID` / `APNS_BUNDLE_ID` / `APNS_AUTH_KEY` | **BLOCKED — founder APNs key confirmation.** Push code uses Expo Push Service; delivery to a physical iPhone needs the APNs key in Expo credentials. |
| EAS iOS production build (local CLI) | Founder / CI | Clean `apps/opal_mobile` install on Node 20 LTS, or run build on EAS cloud workers | **BLOCKED locally** — `expo-modules-core@2.5.0` has `main: src/index.ts` with no `build/index.js`, so `eas build` cannot read expo config on this Mac (Node 22/24). Production profile URLs are correct in `eas.json`. |
| ngrok authtoken | — | already configured on this Mac | **LIVE** — tunnel mode via `~/.opal/tunnel.env`. |

## Phone verify prefer-real rule

When `OPAL_PHONE_VERIFY_MODE` is unset:

- If Twilio Verify SID+token+service are present → **`production_sms`** (prefer real).
- Else in `:prod` → `:disabled` (fail closed).
- Else → `:synthetic_development` (local fixtures only).

Explicit `synthetic_development` still forces synthetic (tests / local only).
`production_sms` **never** silently falls back to synthetic when misconfigured —
adapters return `:provider_not_configured` / honest errors.

**Note:** The Phoenix process checked at 2026-10-07T20:21 still reported
`phone_verify_mode: synthetic_development` because it was started without
sourcing `~/.opal/r1a1.env`. Restart with those env vars loaded for LIVE SMS
on this Mac. Founder-confirmed production SMS remains the product truth.

## Dev bypass (OTP) — local only

Without Twilio creds (or with explicit `OPAL_PHONE_VERIFY_MODE=synthetic_development`):

1. POST `/api/v1/product/activation/challenges` → response includes `development_code`.
2. POST `/api/v1/product/activation/verify` with that code.
3. Fixture lines: `+12025550101` / `111111`, `+12025550102` / `222222`.

Rate limit: **5 OTP challenges per phone per hour** (enforced).

## Not blocked (shipped)

- Intelligence pipeline Phase 1.1–1.5
- Message push enqueue via Expo `DeliverPushWorker` (when device token registered)
- Delivery states Sent → Delivered → Read (FE + channel ack)
- JWT access (1h) + refresh (14d) rotation + logout revoke
- API 1000/hr, messages 60/min, spam 10 non-contact/5min, OTP 5/hr
- Block + report APIs
- Structured JSON logging + `/health`
- PublicBaseUrl tunnel / Twilio webhook HMAC path
