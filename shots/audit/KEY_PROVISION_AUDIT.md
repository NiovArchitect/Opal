# Key provision audit — Paste G shopping list

**Audited:** 2026-10-08  
**Branch:** `muse/packet-b-batch-2`  
**Env files scanned:** `~/.opal/r1a1.env`, `~/.opal/tunnel.env` (only files `runtime.exs` auto-loads outside `:test`)  
**Also checked:** process env of this shell; `launchctl getenv DEEPGRAM_API_KEY`  
**Rule:** presence/absence only — no values printed or logged.

## Founder correction — Deepgram

`DEEPGRAM_API_KEY` is **MISSING**. It is not in `r1a1.env`, not in `tunnel.env`, not in this shell’s process env, and not in LaunchAgent env via `launchctl getenv`.  
Code path is wired (`OpalCore.Intelligence.DeepgramClient` reads `System.get_env("DEEPGRAM_API_KEY")` + `Application.get_env(:opal_core, :deepgram_api_key)` + launchctl fallback). Until the key is added to `~/.opal/r1a1.env` and Phoenix is restarted, Deepgram stays on the honest stub / listen gate.

## What `r1a1.env` actually contains today (names only)

| Key | Status |
|---|---|
| `OPAL_PHONE_VERIFY_MODE` | SET |
| `OPAL_PHONE_LOOKUP_PEPPER` | SET |
| `OPAL_TWILIO_ACCOUNT_SID` | SET |
| `OPAL_TWILIO_AUTH_TOKEN` | SET |
| `OPAL_TWILIO_VERIFY_SERVICE_SID` | SET |
| `OPAL_LLM_API_KEY` | SET |
| `OPAL_LLM_PROVIDER` | SET |

`tunnel.env` holds public-base / tunnel URL keys only (no Paste G provider secrets).

## Paste G key table

| Key | Status | Wired in code? | Unlocks |
|---|---|---|---|
| `BRAVE_API_KEY` | **MISSING** | Yes — `runtime.exs` → `:brave_api_key`; `OpalCore.Search.Brave` | Live web search |
| `GOOGLE_PLACES_API_KEY` | **MISSING** | Yes — `runtime.exs` → `:google_places_api_key`; `OpalCore.Places` (also accepts `OPAL_GOOGLE_PLACES_API_KEY`) | Live venues + restaurant phones for call-to-book |
| `GOOGLE_OAUTH_CLIENT_ID` | **MISSING** | Yes — `runtime.exs` / `GoogleAdapter` (legacy `GOOGLE_CALENDAR_CLIENT_ID` also accepted) | Calendar + Gmail OAuth start |
| `GOOGLE_OAUTH_CLIENT_SECRET` | **MISSING** | Yes — same path as client id | OAuth code exchange |
| `DUFFEL_API_KEY` | **MISSING** | Yes — `OpalCore.Bookings.Duffel` reads `System.get_env` at call time | Flights/hotels search→book→cancel (use `duffel_test_…` + `DUFFEL_TEST_MODE=true` first) |
| `STRIPE_SECRET_KEY` | **MISSING** | Yes — `OpalCore.Wallets.StripeCheckout` | Wallet Checkout loads (+ legal review still required) |
| `ELEVENLABS_API_KEY` | **MISSING** | Yes — `OpalCore.Voice.ElevenLabs` | Voice-note TTS |
| `DEEPGRAM_API_KEY` | **MISSING** | Yes — `DeepgramClient` / `Voice.listen` / live transcription | Call STT + inbound voice-note listen |
| `OPAL_PROVIDER_TOKEN_SECRET` | **MISSING** | Yes — `runtime.exs` → `:provider_token_secret` (TokenVault). Generate locally: `openssl rand -base64 48` | Encrypt calendar/Gmail refresh tokens at rest |

**Zero PRESENT-BUT-UNWIRED** among the nine keys above — every key has a reader. All nine are simply absent from the loaded env files.

## Related optional keys (also missing)

| Key | Notes |
|---|---|
| `GOOGLE_OAUTH_REDIRECT_URI` | Optional override; without it production defaults to hosted connector callback (see `docs/GOOGLE_CLOUD_SETUP.md`) |
| `DUFFEL_TEST_MODE` | Set `true` with a `duffel_test_…` key for safe E2E |
| `STRIPE_WEBHOOK_SECRET` | Needed for live webhook signature verify |
| `ELEVENLABS_VOICE_ID` | Optional; code has a documented default voice |
| `SERPER_API_KEY` | Documented Brave fallback; adapter not primary |

## Founder provisions ONLY

1. `BRAVE_API_KEY`  
2. `GOOGLE_PLACES_API_KEY`  
3. `GOOGLE_OAUTH_CLIENT_ID` + `GOOGLE_OAUTH_CLIENT_SECRET` (+ set `GOOGLE_OAUTH_REDIRECT_URI` for local)  
4. `OPAL_PROVIDER_TOKEN_SECRET` (local generate — no vendor signup)  
5. `DUFFEL_API_KEY` (test token first)  
6. `STRIPE_SECRET_KEY` (+ webhook secret; legal gate before prod loads)  
7. `ELEVENLABS_API_KEY`  
8. `DEEPGRAM_API_KEY` (was believed present — **not on disk**)

After any batch lands in `~/.opal/r1a1.env`, restart Phoenix **once**, then run that batch’s verification (see Phase 3 protocol in the final report / BLOCKED pricing section).
