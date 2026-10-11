# Paste W9 Phase 4 — Real-data integration audit

- **Worktree:** `opal-grok-real-people`
- **Tip:** `81276ef8`
- **Audited (UTC):** 2026-10-11T02:38:36Z
- **Runtime:** Mac BEAM on `:4000` with `~/.opal/r1a1.env` (+ `tunnel.env`) loaded into process env
- **Rules:** No secrets printed. No sample data presented as real. No SMS challenges burned. Google consent not faked.

## Env key presence (names only)

| Key | Present |
|-----|---------|
| `OPAL_LLM_API_KEY` | PRESENT |
| `OPAL_LLM_PROVIDER=deepseek` | PRESENT |
| `BRAVE_API_KEY` | PRESENT |
| `DEEPGRAM_API_KEY` | PRESENT |
| `ELEVENLABS_API_KEY` (`sk_` prefix) | PRESENT |
| `ELEVENLABS_VOICE_ID=XrExE9yKIg1WjnnlVkGX` (Matilda) | PRESENT |
| `OPAL_TWILIO_ACCOUNT_SID` / `AUTH_TOKEN` / `VERIFY_SERVICE_SID` | PRESENT |
| `OPAL_PHONE_VERIFY_MODE=production_sms` | PRESENT |
| `GOOGLE_OAUTH_CLIENT_ID` / `CLIENT_SECRET` / `REDIRECT_URI` | PRESENT |
| `GOOGLE_PLACES_API_KEY` | PRESENT |
| `DUFFEL_API_KEY` (`duffel_test_` prefix) | PRESENT |
| `DUFFEL_TEST_MODE=true` | PRESENT |

Authority cross-check: repo-root `BLOCKED.md` (runtime truth dated 2026-10-08). This audit re-proves live endpoints on tip `81276ef8`.

## Matrix

| Integration | LIVE/GATED/TEST | Evidence | Reason |
|-------------|-----------------|----------|--------|
| 1. DeepSeek (LLM) | **LIVE** | `OPAL_LLM_PROVIDER=deepseek` + `OPAL_LLM_API_KEY` PRESENT. Direct `POST https://api.deepseek.com/v1/chat/completions` → **HTTP 200**; model reply content `ready`; usage 12 tokens. Elixir `LlmAdapter.readiness() == :ready`, `provider_name() == "deepseek"`. Modules: `apps/opal_core/lib/opal_core/intelligence/llm_adapter.ex`. | Real end-to-end chat completion against DeepSeek API with wired product key. |
| 2. Brave Search | **LIVE** | `BRAVE_API_KEY` PRESENT. Direct `GET api.search.brave.com/res/v1/web/search?q=San+Francisco+weather&count=3` → **HTTP 200**, **3** web hits (AccuWeather, Weather Channel, NWS — real titles/URLs). Module: `apps/opal_core/lib/opal_core/search/brave.ex`. | Real search results returned; not fixtures. |
| 3. Deepgram (STT) | **LIVE** | `DEEPGRAM_API_KEY` PRESENT. Direct `GET https://api.deepgram.com/v1/projects` → **HTTP 200**, **1** project. Elixir `DeepgramClient.configured? == true`; `LiveTranscriptionConsumer.readiness() == {:ready, :deepgram}`. Modules: `intelligence/deepgram_client.ex`, `live_transcription_consumer.ex`. | Auth + projects API live; live-transcription consumer reports ready for Deepgram. |
| 4. ElevenLabs TTS Matilda | **LIVE** | `ELEVENLABS_API_KEY` PRESENT (`sk_`); voice `XrExE9yKIg1WjnnlVkGX` (Matilda). Direct `POST /v1/text-to-speech/XrExE9yKIg1WjnnlVkGX` text `"Hey, I am Opal."` model `eleven_multilingual_v2` → **HTTP 200**, **22613** bytes MPEG ADTS/ID3 audio. `ElevenLabs.configured? == true`. Module: `apps/opal_core/lib/opal_core/voice/eleven_labs.ex`. | Real Matilda TTS audio bytes returned on free-tier-allowed voice. |
| 5. Twilio SMS/Verify | **LIVE** | `/health` → `phone_verify_mode: "production_sms"` (HTTP 200). Account `GET …/Accounts/{SID}.json` → **HTTP 200**, `status=active`, `type=Full`. Verify Service `GET …/v2/Services/{SID}` → **HTTP 200**, friendly name `Opal Graph`. Env: `OPAL_TWILIO_*` + `OPAL_PHONE_VERIFY_MODE=production_sms`. **No SMS challenge sent** (no burn). | Production Verify path configured and authenticated; health reports production_sms. Challenge send skipped by audit policy. |
| 6. Google OAuth | **GATED** (wire LIVE; consent not granted) | Client ID/secret/redirect PRESENT. `GoogleAdapter.oauth_configured? == true`. Authorize URL host `accounts.google.com` path `/o/oauth2/v2/auth` with real `client_id`, scopes `calendar.readonly` + `gmail.readonly`, PKCE S256, `access_type=offline`, `prompt=consent`, redirect `127.0.0.1` `/api/v1/product/connectors/google_calendar/callback`. Router: `POST/GET …/connectors/google_calendar/start` + `…/oauth/google/start`. Unauthenticated start → **401 `auth_required`**. DB `provider_connections`: `google_calendar` status **`revoked`** (no active consent). Product entry: Connect calendar / connectors API (You hub Settings path for founder consent). **Consent not faked.** | OAuth client + start URL wired, but product use requires founder Connect/consent. Current connection revoked; audit did not complete Google consent. |
| 7. Google Places | **GATED** | `GOOGLE_PLACES_API_KEY` PRESENT. Places New `POST places.googleapis.com/v1/places:searchText` → **HTTP 403** `PERMISSION_DENIED` / `"The caller does not have permission"` (no places). Facade `OpalCore.Places.search_text` → `{:error, {:http, 403, …}}`. Sibling Routes on same key → 403 **`API_KEY_SERVICE_BLOCKED`** (restrictions exist), while Places lacks that reason → classified **API_NOT_ENABLED** on project `449126891803` (matches `BLOCKED.md`). Fix: enable Places API (New) + billing on that project. | Key wired but Places API (New) not enabled/permissioned; still 403 as historically. |
| 8. Duffel | **TEST** | `DUFFEL_API_KEY` PRESENT with `duffel_test_` prefix; `DUFFEL_TEST_MODE=true`. `Duffel.test_mode?(key) == true`. Direct `POST https://api.duffel.com/air/offer_requests` SFO→LAX 2026-11-15 → **HTTP 201**, **102** offers, `live_mode=false`, offer_request id returned. Module: `apps/opal_core/lib/opal_core/bookings/duffel.ex`. Zero real money. | Live against Duffel **test** API only; label TEST (not prod live token). |

## Health snapshot

```json
{"db":"up","phone_verify_mode":"production_sms","schema_version":"0.1.0","sentry_configured":false,"service":"opal_core","status":"ok"}
```

## Not probed / intentionally skipped

- Twilio Verify **challenge create / SMS send** — skipped to avoid burning SMS quota and founder phone traffic. Account + Verify Service + `/health` production_sms are sufficient for LIVE classification under this audit’s rules.
- Google OAuth **consent completion / token exchange** — skipped; would require founder Google login. Wire proven; consent remains GATED.
- Stripe / Sentry / OpenTable — out of W9 Phase 4 integration list.

## Provider modules (code authority)

| Integration | Primary module(s) |
|-------------|-------------------|
| DeepSeek | `apps/opal_core/lib/opal_core/intelligence/llm_adapter.ex` |
| Brave | `apps/opal_core/lib/opal_core/search/brave.ex` |
| Deepgram | `apps/opal_core/lib/opal_core/intelligence/deepgram_client.ex`, `live_transcription_consumer.ex` |
| ElevenLabs | `apps/opal_core/lib/opal_core/voice/eleven_labs.ex` |
| Twilio | runtime `OPAL_PHONE_VERIFY_MODE` + Twilio Verify adapters; `/health` |
| Google OAuth | `SocialFlow.RealWorld.Calendar.GoogleAdapter`, `ConnectorController` |
| Google Places | `apps/opal_core/lib/opal_core/places.ex` + `GooglePlaces` provider |
| Duffel | `apps/opal_core/lib/opal_core/bookings/duffel.ex` |

## Summary counts

| Status | Count | Integrations |
|--------|-------|--------------|
| LIVE | 5 | DeepSeek, Brave, Deepgram, ElevenLabs Matilda, Twilio SMS/Verify |
| GATED | 2 | Google OAuth (await founder consent), Google Places (await API+billing enable) |
| TEST | 1 | Duffel (test API / `duffel_test_` + `DUFFEL_TEST_MODE=true`) |

**No commit made.**
