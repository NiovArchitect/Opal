# Key provision audit — Paste G shopping list

**Audited:** 2026-10-08 (initial MISSING pass)  
**Wired + live-verified:** 2026-10-08 (batch append to `~/.opal/r1a1.env`, Phoenix restarted once)  
**Branch:** `muse/packet-b-batch-2`  
**Env files scanned:** `~/.opal/r1a1.env`, `~/.opal/tunnel.env` (only files `runtime.exs` auto-loads outside `:test`)  
**Rule:** presence/absence + live verify outcomes only — no values printed or logged.

## Wire batch summary (2026-10-08)

Backup taken before append. Duplicate-export check: one export line per key.  
`OPAL_PROVIDER_TOKEN_SECRET` generated via `openssl rand -hex 32`.  
`OPAL_WALLET_LOADS_ENABLED=false` (Stripe live key present; loads gated).  
`GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` omitted (still pending).

| Key | Env | Live verify |
|---|---|---|
| `BRAVE_API_KEY` | SET | **LIVE** — web search 200, 3 real hits |
| `DUFFEL_API_KEY` + `DUFFEL_TEST_MODE=true` | SET | **LIVE (test)** — offer_requests 201, 133 offers; `duffel_test_…` |
| `DEEPGRAM_API_KEY` | SET | **LIVE** — projects 200; `LiveTranscriptionConsumer` `{:ready, :deepgram}` |
| `STRIPE_SECRET_KEY` | SET (live restricted) | **wired, loads gated** — balance 200; `create_session` → gated pending legal |
| `ELEVENLABS_API_KEY` | SET (`sk_…` Opal App) | **BLOCKED** — ElevenLabs confirmed; TTS `402 payment_required` (needs credits/billing) |
| `GOOGLE_PLACES_API_KEY` | SET | **BLOCKED** — Places API (New) `403 PERMISSION_DENIED`; legacy Text Search `REQUEST_DENIED` |
| `OPAL_LLM_API_KEY` + `OPAL_LLM_PROVIDER=deepseek` | SET | **`:ready`** — `LlmAdapter.readiness() == :ready`; chat smoke `ready` |
| `OPAL_PROVIDER_TOKEN_SECRET` | SET | **generated** |
| `GOOGLE_OAUTH_CLIENT_ID` / `SECRET` | **MISSING** | **OAuth pending** Cloud console wizard |

## What `r1a1.env` contains today (names only — post-wire)

| Key | Status |
|---|---|
| `OPAL_PHONE_VERIFY_MODE` | SET |
| `OPAL_PHONE_LOOKUP_PEPPER` | SET |
| `OPAL_TWILIO_ACCOUNT_SID` | SET |
| `OPAL_TWILIO_AUTH_TOKEN` | SET |
| `OPAL_TWILIO_VERIFY_SERVICE_SID` | SET |
| `OPAL_LLM_API_KEY` | SET |
| `OPAL_LLM_PROVIDER` | SET |
| `BRAVE_API_KEY` | SET |
| `DUFFEL_API_KEY` | SET |
| `DUFFEL_TEST_MODE` | SET (`true`) |
| `DEEPGRAM_API_KEY` | SET |
| `STRIPE_SECRET_KEY` | SET |
| `OPAL_WALLET_LOADS_ENABLED` | SET (`false`) |
| `ELEVENLABS_API_KEY` | SET (`sk_…`; TTS blocked on billing) |
| `GOOGLE_PLACES_API_KEY` | SET (GCP API not enabled) |
| `OPAL_PROVIDER_TOKEN_SECRET` | SET |

`tunnel.env` holds public-base / tunnel URL keys only.

## Still missing / founder action

1. **ElevenLabs billing/credits** — `sk_…` wired; TTS returns `402 payment_required`.
2. **Enable Places API (New)** on the Google Cloud project for the wired Places key (+ billing).
3. **`GOOGLE_OAUTH_CLIENT_ID` + `GOOGLE_OAUTH_CLIENT_SECRET`** — Cloud console wizard (`docs/GOOGLE_CLOUD_SETUP.md`).
4. **Legal approval** before `OPAL_WALLET_LOADS_ENABLED=true`.
5. Optional: `STRIPE_WEBHOOK_SECRET`, `ELEVENLABS_VOICE_ID`, `SENTRY_DSN`.

After any of the above land in `~/.opal/r1a1.env`, restart Phoenix **once**, then re-verify that batch.
