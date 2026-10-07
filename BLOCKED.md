# BLOCKED — founder credentials & operational status

Branch: `muse/packet-b-batch-2`  
Scope: Real Multi-User Calling + Apple Store Operational Readiness  
Runtime truth checked: **2026-10-07** (Mac BEAM on `:4000` + `~/.opal/r1a1.env`; EAS production IPA succeeded)

Items below are implemented in code with honest stubs / disabled paths where
credentials are absent. Status reflects **actual runtime**, not hope.

| Item | Needed from | Env / artifact | Status |
|------|-------------|----------------|--------|
| Twilio Verify (SMS OTP) | — | `OPAL_TWILIO_ACCOUNT_SID`, `OPAL_TWILIO_AUTH_TOKEN`, `OPAL_TWILIO_VERIFY_SERVICE_SID` + `OPAL_PHONE_VERIFY_MODE=production_sms` | **LIVE** — founder OTP on phone 2026-10-07; `/health` reports `production_sms` on this Mac BEAM. |
| Twilio Messaging (invite SMS) | — | `OPAL_TWILIO_FROM_NUMBER` or `OPAL_TWILIO_MESSAGING_SERVICE_SID` (+ account SID/token) | **LIVE** — founder-confirmed invite texts 2026-10-07. |
| Twilio NTS (TURN) | Uses same Twilio account SID/token | `OPAL_TWILIO_ACCOUNT_SID` + `OPAL_TWILIO_AUTH_TOKEN` | Code mints via NTS Tokens API when those env vars are on the Phoenix process (present via `r1a1.env`). |
| Deepgram API key | Founder | `DEEPGRAM_API_KEY` from https://console.deepgram.com | **BLOCKED — key not in runtime env.** Stub path remains legitimate until key arrives: `transcribe_batch` → `deepgram_stub`. |
| LLM (DeepSeek / OpenAI-compatible) | Founder (billing) | `OPAL_LLM_API_KEY` + `OPAL_LLM_PROVIDER=deepseek` in `~/.opal/r1a1.env` (optional `OPAL_LLM_MODEL`) | **BLOCKED (2026-10-07T23:30Z)** — key present; `LlmAdapter.readiness() == :ready`; live `chat/2` returns `{:error, {:http_status, 402, "Insufficient Balance …"}}`. **Founder action:** add credits at https://platform.deepseek.com (Billing). Then re-run `cd apps/opal_core && mix run ../../shots/intelligence/verify_llm.exs` (no code change). Pipeline already falls back honestly (`llm_fallback` / `llm_unavailable_using_templates`). Provider abstraction: DeepSeek + OpenAI implemented; Anthropic seam only. Evidence: `shots/intelligence/LLM_VERIFY.json`. |
| Google Places (live venue) | Founder | `GOOGLE_PLACES_API_KEY` | **BLOCKED — not in runtime env.** `VenueLookup.search_or_demo/2` serves offline demo venues. |
| Sentry DSN | Founder | `OPAL_SENTRY_DSN` or `SENTRY_DSN` | **BLOCKED — not in BEAM env.** `/health` reports `sentry_configured: false`. |
| Apple Developer / APNs | — | APNs key assigned in Expo/EAS for bundle `local.opal.mobile` | **LIVE** — generated during EAS build [2026-10-07], assigned to `local.opal.mobile`. Physical push still needs TestFlight install + device token registration (see `shots/PUSH_VERIFY_CHECKLIST.md`). |
| EAS iOS production build | — | Expo project `de17c8b3-074e-4656-980d-e16fc10bbda4`; account `sadeil@niovlabs.com` | **SUCCEEDED** via interactive founder run [2026-10-07]. Distribution certificate reused, valid until Sep 2027. Provisioning profile freshly created and active. IPA: https://expo.dev/artifacts/eas/j69l0eCfZb0Ha8XpryL08mWU9jotfKk0hosBgU4kyRk.ipa — production URLs bake `https://api.opal.niovlabs.com`. Upload/TestFlight steps: `docs/TESTFLIGHT_UPLOAD.md`. |
| ngrok authtoken | — | already configured on this Mac | **LIVE** — tunnel mode via `~/.opal/tunnel.env`. |

## Phone verify prefer-real rule

When `OPAL_PHONE_VERIFY_MODE` is unset:

- If Twilio Verify SID+token+service are present → **`production_sms`** (prefer real).
- Else in `:prod` → `:disabled` (fail closed).
- Else → `:synthetic_development` (local fixtures only).

Explicit `synthetic_development` still forces synthetic (tests / local only).
`production_sms` **never** silently falls back to synthetic when misconfigured —
adapters return `:provider_not_configured` / honest errors.

**Runtime note (2026-10-07):** Phoenix on this Mac was started with `~/.opal/r1a1.env` (+ tunnel.env). `/health` reports `phone_verify_mode: production_sms`. Do not restart without those env files.

## Dev bypass (OTP) — local / test only

Without Twilio creds (or with explicit `OPAL_PHONE_VERIFY_MODE=synthetic_development`):

1. POST `/api/v1/product/activation/challenges` → response includes `development_code`.
2. POST `/api/v1/product/activation/verify` with that code.
3. Fixture lines: `+12025550101` / `111111`, `+12025550102` / `222222`.

Rate limit: **5 OTP challenges per phone per hour** (enforced).

Under live `production_sms`, fixture numbers do **not** return `development_code` (422). Keep the synthetic path for `MIX_ENV=test` and local agents only.

## Flags that must stay

| Flag / stub | Why it stays |
|-------------|--------------|
| Deepgram stub (`deepgram_stub`) | No `DEEPGRAM_API_KEY` in runtime — honest stub until founder key. |
| Google Places demo venues | No `GOOGLE_PLACES_API_KEY` — offline demo path. |
| Sentry no-op capture | No DSN — log-only stub. |
| `synthetic_development` phone mode | Required for automated tests; must not be used on the live BEAM with Twilio. |

## Not blocked (shipped)

- Intelligence pipeline Phase 1.1–1.5
- Message push enqueue via Expo `DeliverPushWorker` (when device token registered)
- Delivery states Sent → Delivered → Read (FE + channel ack)
- JWT access (1h) + refresh (14d) rotation + logout revoke
- API 1000/hr, messages 60/min, spam 10 non-contact/5min, OTP 5/hr
- Block + report APIs
- Structured JSON logging + `/health`
- PublicBaseUrl tunnel / Twilio webhook HMAC path
- Holistic verify 2026-10-07: `mix test` 1887/1887; `tsc --noEmit` 0 errors; smoke a–e PASS (`shots/final_holistic/VERIFY.json`)
- EAS production iOS IPA (store distribution) with APNs key assigned — TestFlight upload is the next founder step

## Founder next (human-only)

1. Upload IPA → App Store Connect / TestFlight — `docs/TESTFLIGHT_UPLOAD.md`
2. Verify push on the production build — `shots/PUSH_VERIFY_CHECKLIST.md`
3. Two-device call walk (second pair of hands)
4. Walk current tip on the real TestFlight build (not LAN/dev client)
5. Optional later: Deepgram, Google Places, Sentry keys
