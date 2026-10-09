# BLOCKED — founder credentials & operational status

Branch: `muse/packet-b-batch-2`  
Scope: Real Multi-User Calling + Apple Store Operational Readiness  
Runtime truth checked: **2026-10-08** (Mac BEAM on `:4000` + `~/.opal/r1a1.env`; EAS production IPA succeeded)  
**Key wire batch (2026-10-08):** keys appended to `~/.opal/r1a1.env` (backed up first; no duplicate exports). Phoenix restarted once. Live curl + Elixir verify. Audit: `shots/audit/KEY_PROVISION_AUDIT.md`. Google click-through: `docs/GOOGLE_CLOUD_SETUP.md`.

Items below are implemented in code with honest stubs / disabled paths where
credentials are absent. Status reflects **actual runtime**, not hope.

| Item | Needed from | Env / artifact | Status |
|------|-------------|----------------|--------|
| Twilio Verify (SMS OTP) | — | `OPAL_TWILIO_ACCOUNT_SID`, `OPAL_TWILIO_AUTH_TOKEN`, `OPAL_TWILIO_VERIFY_SERVICE_SID` + `OPAL_PHONE_VERIFY_MODE=production_sms` | **LIVE** — founder OTP on phone 2026-10-07; `/health` reports `production_sms` on this Mac BEAM. |
| Twilio Messaging (invite SMS) | — | `OPAL_TWILIO_FROM_NUMBER` or `OPAL_TWILIO_MESSAGING_SERVICE_SID` (+ account SID/token) | **LIVE** — founder-confirmed invite texts 2026-10-07. |
| Twilio NTS (TURN) | Uses same Twilio account SID/token | `OPAL_TWILIO_ACCOUNT_SID` + `OPAL_TWILIO_AUTH_TOKEN` | Code mints via NTS Tokens API when those env vars are on the Phoenix process (present via `r1a1.env`). |
| Deepgram API key | Founder | `DEEPGRAM_API_KEY` from https://console.deepgram.com | **LIVE (verified 2026-10-08)** — projects API 200; `LiveTranscriptionConsumer.readiness() == {:ready, :deepgram}` after Phoenix restart. |
| LLM (DeepSeek / OpenAI-compatible) | — | `OPAL_LLM_API_KEY` + `OPAL_LLM_PROVIDER=deepseek` in `~/.opal/r1a1.env` (optional `OPAL_LLM_MODEL`) | **LIVE (re-verified 2026-10-08 after restart)** — `LlmAdapter.readiness() == :ready`; DeepSeek chat smoke reply `ready`. Prior 2026-10-07 evidence still valid: `shots/intelligence/LLM_VERIFY.json`. Templates remain the floor on API failure. |
| Google Places (live venue) | Founder | `GOOGLE_PLACES_API_KEY` | **BLOCKED — API_NOT_ENABLED on project `449126891803`.** Key valid (wrong key → `API_KEY_INVALID`). Key **has** API restrictions (Routes → `API_KEY_SERVICE_BLOCKED`) but Places is **not** restriction-blocked (no `API_KEY_SERVICE_BLOCKED` on `places.googleapis.com`). Places New `searchText` → sparse `403 PERMISSION_DENIED` / `"The caller does not have permission"`. Sibling Maps APIs on same project → “API is not activated”. **Fix (one click):** enable Places API (New) → https://console.cloud.google.com/apis/library/places.googleapis.com?project=449126891803 — then confirm billing → https://console.cloud.google.com/billing/linkedaccount?project=449126891803 . Same project as the wired key (not a different “Opal” project). |
| Brave Search (web) | Founder | `BRAVE_API_KEY` from https://brave.com/search/api/ | **LIVE (verified 2026-10-08)** — web search returned real results (3 hits). |
| Google OAuth (Calendar + Gmail) | Founder | `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI` (legacy `GOOGLE_CALENDAR_*` still accepted). **URIs:** `docs/GOOGLE_OAUTH_URIS.md`. Consent scopes: `calendar.readonly` + `gmail.readonly`. `OPAL_PROVIDER_TOKEN_SECRET` SET; TokenVault encrypt→store→decrypt **PASS**. Local `GOOGLE_OAUTH_REDIRECT_URI` pre-wired. GET+POST on both callbacks. | **OAuth pending founder’s Cloud console wizard** — paste all 4 redirect URIs, then hand client ID + secret. Start-URL structure verified with placeholder client_id (scopes + PKCE S256 + offline consent). |
| Sentry DSN | Founder | `OPAL_SENTRY_DSN` or `SENTRY_DSN` | **BLOCKED — not in BEAM env.** `/health` reports `sentry_configured: false`. |
| Apple Developer / APNs | — | APNs key assigned in Expo/EAS for bundle `local.opal.mobile` | **LIVE** — generated during EAS build [2026-10-07], assigned to `local.opal.mobile`. Physical push still needs TestFlight install + device token registration (see `shots/PUSH_VERIFY_CHECKLIST.md`). |
| EAS iOS production build | — | Expo project `de17c8b3-074e-4656-980d-e16fc10bbda4`; account `sadeil@niovlabs.com` | **SUCCEEDED** via interactive founder run [2026-10-07]. Distribution certificate reused, valid until Sep 2027. Provisioning profile freshly created and active. IPA: https://expo.dev/artifacts/eas/j69l0eCfZb0Ha8XpryL08mWU9jotfKk0hosBgU4kyRk.ipa — production URLs bake `https://api.opal.niovlabs.com`. Upload/TestFlight steps: `docs/TESTFLIGHT_UPLOAD.md`. |
| ngrok authtoken | — | agent authtoken in `~/Library/Application Support/ngrok/ngrok.yml` | **LIVE** — tunnel mode via `~/.opal/tunnel.env`. |
| ngrok API key | Founder | `ngrok config add-api-key` + `NGROK_API_KEY` in `~/.opal/r1a1.env` | **LIVE (verified 2026-10-08)** — `ngrok api endpoints list` → 200, 1 endpoint. Separate from agent authtoken. |
| Duffel (flights/hotels) | Founder | `DUFFEL_API_KEY` from https://duffel.com | **LIVE (test) (verified 2026-10-08)** — `duffel_test_…` + `DUFFEL_TEST_MODE=true`; offer_requests SFO→LAX returned 133 offers; zero real money. Live/prod token still not wired. |
| OpenTable (restaurants) | Founder / partnership | `OPENTABLE_API_KEY` | **BLOCKED — no self-serve booking API for most partners.** Even with a key, book path stays call-to-book / search-only informational. Partnership required for live reserve. **Call-to-book (Phase 6):** uses Google Places Details phone when `GOOGLE_PLACES_API_KEY` + `place_id` present; never invents phone or confirmation. |
| Wallet loads (Stripe) | Founder + legal | `STRIPE_SECRET_KEY` + `OPAL_WALLET_LOADS_ENABLED` (+ optional `STRIPE_WEBHOOK_SECRET`, checkout URLs) | **Stripe wired, loads gated (verified 2026-10-08).** Live restricted key authenticates (`/v1/balance` 200). `OPAL_WALLET_LOADS_ENABLED=false` → `StripeCheckout.configured? == false`; `create_session` → `{:disabled, "wallet loads gated pending legal approval"}`. Do **not** set loads enabled until founder explicitly approves live money movement (legal review pending). Optional: `STRIPE_WEBHOOK_SECRET` still missing for signed webhooks. |
| Instagram / Threads social sync | — | Meta professional-account APIs only | **SKIP for social awareness (Paste G Phase 5).** Personal IG Basic Display shut down 2024-12-04; Graph/Threads cannot read friends’ birthdays/life events. See `shots/audit/SOCIAL_API_RESEARCH.md`. Contact birthday sync uses device contacts the user selects. |
| AdHoc push profile refresh | Founder | App Store Connect API key for EAS (`EXPO_ASC_API_KEY_PATH` + `EXPO_ASC_KEY_ID` + `EXPO_ASC_ISSUER_ID`, or EAS submissions ASC key) | **BLOCKED for non-interactive AdHoc refresh.** Development build #4 failed: profile missing Push Notifications. Contacts rebuild #5 ships **without** push entitlement on AdHoc; production/TestFlight keeps push. After ASC key lands, refresh AdHoc with `--refresh-ad-hoc-provisioning-profile` and restore notifications on development. |
| ElevenLabs TTS (voice notes) | Founder | `ELEVENLABS_API_KEY` (+ `ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM` Rachel, `ELEVENLABS_MODEL_ID`) | **BLOCKED — `paid_plan_required` for library voices.** Key + Rachel wired; TTS reaches ElevenLabs. Free plan rejects library voices via API (`402` / “Free users cannot use library voices via the API”) even with credits balance. Fix: upgrade to a paid ElevenLabs plan **or** use a non-library / Instant Voice Clone id. Key also lacks `voices_read`. |

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
| Deepgram stub (`deepgram_stub`) | Fallback if key removed; currently LIVE with key. |
| ElevenLabs TTS disabled / OpenAI TTS fallback | Valid `sk_` wired; TTS blocked on `402 payment_required` until credits/billing. |
| Google Places demo venues | Key wired but Places API (New) not enabled on GCP — demo/fixture until Cloud enable. |
| Wallet loads gated | `OPAL_WALLET_LOADS_ENABLED` must stay false until legal approval; Stripe key alone does not open Checkout. |
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

## Provider pricing (checked 2026-10-08 — plan costs; do not guess later)

Sources are the providers’ current public pricing pages. Numbers drift — re-check before budgeting large spend.

| Key / product | Free / entry | Paid model (headline) | Source |
|---|---|---|---|
| **Brave Search** (`BRAVE_API_KEY`) | **$5 free credits / month** on Search plans (card on file; attribution required for credit). Older “2k queries/mo free plan” was retired (Feb 2026). | Search plan **$5.00 / 1,000 requests** (dashboard). | https://brave.com/search/api/ · https://api-dashboard.search.brave.com/documentation/pricing |
| **Google Places (New)** (`GOOGLE_PLACES_API_KEY`) | **Per-SKU free monthly caps** (replaced the old **$200/mo credit** on **2025-03-01**). Essentials often **10k**/mo; Pro (Text/Nearby Search Pro) **5k**/mo; Enterprise **1k**/mo. | After free cap: e.g. Text Search Pro **$32 / 1k**, Place Details Pro **$17 / 1k**, Enterprise Text Search **$35 / 1k** (entry tier). Billing account required. | https://developers.google.com/maps/billing-and-pricing/pricing · overview FAQ |
| **Google OAuth / Calendar / Gmail** | OAuth client + Calendar/Gmail API calls for personal use are **$0** at Google’s consumer OAuth quotas; Places billing is separate. | N/A for read scopes we use | Google Cloud Console |
| **Duffel** (`DUFFEL_API_KEY`) | **Test mode free** (`duffel_test_…` tokens; no real money). | Live: pay-as-you-go — **$3 / confirmed flight order**, **1%** managed content, **$2 / paid ancillary**, excess search **$0.005** above 1500:1 search:book. Zero upfront. | https://duffel.com/pricing · https://duffel.com/docs/api/overview/test-mode |
| **Stripe** (`STRIPE_SECRET_KEY`) | No free processing; test mode cards free. | US online cards **2.9% + $0.30** per successful charge (standard). Wallet loads also need **legal review** of stored-value. | https://stripe.com/pricing (US) |
| **ElevenLabs** (`ELEVENLABS_API_KEY`) | **Free $0 / mo** — **10k credits**/mo (Creative Free). | Starter **$5–6/mo** (30k credits); Creator **$11–22/mo**; higher tiers scale credits. API TTS draws from the same credit pool (~1 credit / character on Multilingual v2). | https://elevenlabs.io/pricing |
| **Deepgram** (`DEEPGRAM_API_KEY`) | **$200 free credit** on Pay As You Go (no card required to start; credit until used). | Then usage: e.g. Nova-3 streaming ~**$0.0048–0.0077 / min** (promos vary); pre-recorded Nova-3 ~**$0.0043 / min**. | https://deepgram.com/pricing |
| **OPAL_PROVIDER_TOKEN_SECRET** | Free — generate locally (`openssl rand -base64 48`) | N/A | Local only |

### Wiring protocol (when founder hands keys)

1. Append keys to `~/.opal/r1a1.env` only (never the repo). Presence checks only in chat/logs.
2. Restart Phoenix **once per batch** (not per key): kill BEAM on `:4000`, `set -a; . ~/.opal/r1a1.env; . ~/.opal/tunnel.env; set +a; mix phx.server`.
3. Verify that batch (examples): Brave → real search hits; Places → real venues; Duffel test → search/book/cancel; Stripe test → Checkout session URL; ElevenLabs → speak returns audio URL; Deepgram → `listen` / batch leaves stub.
4. One-line report per key: name → what is live → UX change (“nothing visible — it just works”).
5. Update this file’s Status column from BLOCKED → LIVE for that row.

## Founder next (human-only)

1. **ElevenLabs:** upgrade off Free **or** Instant Voice Clone — Free rejects library voices (Rachel) via API (`paid_plan_required`) even with credit balance.
2. **Google Places (project `449126891803`):** enable Places API (New) → https://console.cloud.google.com/apis/library/places.googleapis.com?project=449126891803 — then billing → https://console.cloud.google.com/billing/linkedaccount?project=449126891803
3. **Google OAuth:** paste all 4 URIs from `docs/GOOGLE_OAUTH_URIS.md` into Authorized redirect URIs, then hand `GOOGLE_OAUTH_CLIENT_ID` + `GOOGLE_OAUTH_CLIENT_SECRET`.
4. **Stripe loads:** keep `OPAL_WALLET_LOADS_ENABLED=false` until legal review explicitly approves live money movement; then set `true` and restart once. Optional: `STRIPE_WEBHOOK_SECRET`.
5. Upload IPA → App Store Connect / TestFlight — `docs/TESTFLIGHT_UPLOAD.md`
6. Verify push on the production build — `shots/PUSH_VERIFY_CHECKLIST.md`
7. Two-device call walk (second pair of hands)
8. Optional later: Sentry DSN
