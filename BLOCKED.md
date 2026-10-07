# BLOCKED — founder credentials required

Branch: `muse/packet-b-batch-2`  
Scope: Real-Time Intelligence + Real App Foundation; ngrok/Deepgram live foundation

Items below are implemented in code with honest bypasses / stubs. Live production
paths cannot complete until the founder supplies credentials.

| Item | Needed from | Env / artifact | Status in code |
|------|-------------|----------------|----------------|
| Twilio Verify (real SMS OTP) | Founder | `OPAL_TWILIO_ACCOUNT_SID`, `OPAL_TWILIO_AUTH_TOKEN`, `OPAL_TWILIO_VERIFY_SERVICE_SID` + set `OPAL_PHONE_VERIFY_MODE=production_sms` | Adapter + Onboarding wired; default remains `synthetic_development` with fixture OTP + `development_code` |
| Twilio Messaging (invite SMS) | Founder | `OPAL_TWILIO_FROM_NUMBER` or `OPAL_TWILIO_MESSAGING_SERVICE_SID` (plus account SID/token) | `TwilioSmsAdapter` readiness-gated; honest `sms_queued: false` when unset |
| Sentry DSN | Founder | `OPAL_SENTRY_DSN` or `SENTRY_DSN` | `OpalCore.Observability.Sentry` stub captures/logs; SDK not linked until DSN + dep approval |
| Apple Developer / APNs direct | Founder | `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_BUNDLE_ID`, `APNS_AUTH_KEY` | Expo push path works without these; direct APNs optional fallback |
| Google Places (live venue) | Founder | `GOOGLE_PLACES_API_KEY` | Phase E spike uses offline demo venues when unset |
| ngrok authtoken (if unset) | Founder | `ngrok config add-authtoken <token>` from https://dashboard.ngrok.com | Agent installed; config check OK on this Mac. Manual cloudflared/localtunnel fallback in `docs/GOING_LIVE.md` |
| Deepgram API key | Founder | `DEEPGRAM_API_KEY` from https://console.deepgram.com | `DeepgramClient` stub returns canned diarized transcript with `stub: true` when unset |

## Dev bypass (OTP)

Without Twilio creds:

1. Leave `OPAL_PHONE_VERIFY_MODE` unset or `synthetic_development`.
2. POST `/api/v1/product/activation/challenges` → response includes `development_code`.
3. POST `/api/v1/product/activation/verify` with that code.
4. Fixture lines: `+12025550101` / `111111`, `+12025550102` / `222222`.

Rate limit: **5 OTP challenges per phone per hour** (enforced).

## Not blocked (shipped)

- Intelligence pipeline Phase 1.1–1.5
- Message push enqueue via Expo `DeliverPushWorker` (when device token registered)
- Delivery states Sent → Delivered → Read (FE + channel ack)
- JWT access (1h) + refresh (14d) rotation + logout revoke
- API 1000/hr, messages 60/min, spam 10 non-contact/5min, OTP 5/hr
- Block + report APIs
- Structured JSON logging + `/health`
