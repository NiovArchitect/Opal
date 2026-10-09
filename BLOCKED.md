# BLOCKED — founder credentials & operational status

Branch: `muse/packet-b-batch-2`  
Scope: Real Multi-User Calling + Apple Store Operational Readiness  
Runtime truth checked: **2026-10-07** (Mac BEAM on `:4000` + `~/.opal/r1a1.env`; EAS production IPA succeeded)  
**Key provision audit (2026-10-08):** `shots/audit/KEY_PROVISION_AUDIT.md` — all nine Paste G shopping-list keys are **MISSING** from `~/.opal/r1a1.env` / `tunnel.env` (including `DEEPGRAM_API_KEY`, which was believed present). Zero PRESENT-BUT-UNWIRED. Google click-through: `docs/GOOGLE_CLOUD_SETUP.md`.

Items below are implemented in code with honest stubs / disabled paths where
credentials are absent. Status reflects **actual runtime**, not hope.

| Item | Needed from | Env / artifact | Status |
|------|-------------|----------------|--------|
| Twilio Verify (SMS OTP) | — | `OPAL_TWILIO_ACCOUNT_SID`, `OPAL_TWILIO_AUTH_TOKEN`, `OPAL_TWILIO_VERIFY_SERVICE_SID` + `OPAL_PHONE_VERIFY_MODE=production_sms` | **LIVE** — founder OTP on phone 2026-10-07; `/health` reports `production_sms` on this Mac BEAM. |
| Twilio Messaging (invite SMS) | — | `OPAL_TWILIO_FROM_NUMBER` or `OPAL_TWILIO_MESSAGING_SERVICE_SID` (+ account SID/token) | **LIVE** — founder-confirmed invite texts 2026-10-07. |
| Twilio NTS (TURN) | Uses same Twilio account SID/token | `OPAL_TWILIO_ACCOUNT_SID` + `OPAL_TWILIO_AUTH_TOKEN` | Code mints via NTS Tokens API when those env vars are on the Phoenix process (present via `r1a1.env`). |
| Deepgram API key | Founder | `DEEPGRAM_API_KEY` from https://console.deepgram.com | **BLOCKED — MISSING (audit 2026-10-08).** Not in `~/.opal/r1a1.env`, not in LaunchAgent env. Believed previously provided — disk says otherwise. Stub path remains legitimate: `transcribe_batch` → `deepgram_stub`. Product listen gate (`OpalCore.Voice.listen/1`) returns honest `"I can't listen to voice notes yet"` without the key. Code **is** wired (not PRESENT-BUT-UNWIRED). |
| LLM (DeepSeek / OpenAI-compatible) | — | `OPAL_LLM_API_KEY` + `OPAL_LLM_PROVIDER=deepseek` in `~/.opal/r1a1.env` (optional `OPAL_LLM_MODEL`) | **LIVE (verified 2026-10-07T23:35Z)** — `readiness: :ready`; smoke `pong` OK; 4/4 seed conversations PASS via LLM extract+draft (Maya confirm, Chanelle Saturday counter, Alex trip extend, “maybe” clarify). Zero hallucinations. Measured ~304 tokens/convo (~$0.000043/convo at $0.14/MTok); projected ~$1.28/mo at 1000 convos/day. Provider abstraction: DeepSeek + OpenAI; Anthropic seam only. Evidence: `shots/intelligence/LLM_VERIFY.json`. Templates remain the floor on API failure. |
| Google Places (live venue) | Founder | `GOOGLE_PLACES_API_KEY` | **BLOCKED — not in runtime env.** `OpalCore.Places` / `VenueLookup` return `{:disabled, ...}` or explicit `demo_fixture` only when opted in — never silent live mix. |
| Brave Search (web) | Founder | `BRAVE_API_KEY` from https://brave.com/search/api/ | **BLOCKED — not in runtime env.** `OpalCore.Search.Brave` returns `{:disabled, "BRAVE_API_KEY missing"}`; never invents hits. (Optional alt: `SERPER_API_KEY` — not wired; Brave chosen for simpler REST gating.) |
| Google OAuth (Calendar + Gmail) | Founder | `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI` (legacy `GOOGLE_CALENDAR_*` still accepted). Redirect examples: `…/api/v1/product/oauth/google/callback` or `…/connectors/google_calendar/callback`. Consent scopes: `calendar.readonly` + `gmail.readonly`. Also needs `OPAL_PROVIDER_TOKEN_SECRET` for TokenVault. | **BLOCKED — OAuth client not in runtime env on this Mac.** Without it, connector start returns honest `oauth_not_configured`. Tokens reuse `provider_connections` (encrypted). |
| Sentry DSN | Founder | `OPAL_SENTRY_DSN` or `SENTRY_DSN` | **BLOCKED — not in BEAM env.** `/health` reports `sentry_configured: false`. |
| Apple Developer / APNs | — | APNs key assigned in Expo/EAS for bundle `local.opal.mobile` | **LIVE** — generated during EAS build [2026-10-07], assigned to `local.opal.mobile`. Physical push still needs TestFlight install + device token registration (see `shots/PUSH_VERIFY_CHECKLIST.md`). |
| EAS iOS production build | — | Expo project `de17c8b3-074e-4656-980d-e16fc10bbda4`; account `sadeil@niovlabs.com` | **SUCCEEDED** via interactive founder run [2026-10-07]. Distribution certificate reused, valid until Sep 2027. Provisioning profile freshly created and active. IPA: https://expo.dev/artifacts/eas/j69l0eCfZb0Ha8XpryL08mWU9jotfKk0hosBgU4kyRk.ipa — production URLs bake `https://api.opal.niovlabs.com`. Upload/TestFlight steps: `docs/TESTFLIGHT_UPLOAD.md`. |
| ngrok authtoken | — | already configured on this Mac | **LIVE** — tunnel mode via `~/.opal/tunnel.env`. |
| Duffel (flights/hotels) | Founder | `DUFFEL_API_KEY` from https://duffel.com | **BLOCKED — key not in runtime env.** Booking search/confirm returns honest `{:disabled, ...}` / conversational disabled message; never invents confirmation numbers. **Test mode (Paste G Phase 6):** when key present AND (`DUFFEL_TEST_MODE=true` OR key prefix `duffel_test_`), hits Duffel test API. Test mode is EXPLICIT — never defaults on in production. |
| OpenTable (restaurants) | Founder / partnership | `OPENTABLE_API_KEY` | **BLOCKED — no self-serve booking API for most partners.** Even with a key, book path stays call-to-book / search-only informational. Partnership required for live reserve. **Call-to-book (Phase 6):** uses Google Places Details phone when `GOOGLE_PLACES_API_KEY` + `place_id` present; never invents phone or confirmation. |
| Wallet loads (Stripe) | Founder + legal | `STRIPE_SECRET_KEY` (+ optional `STRIPE_WEBHOOK_SECRET`, `STRIPE_CHECKOUT_SUCCESS_URL`, `STRIPE_CHECKOUT_CANCEL_URL`) | **BLOCKED — wallet loading not connected.** Needs `STRIPE_SECRET_KEY` **and** founder legal review of stored-value / money-transmitter regulations before enabling loads in production. Checkout session + webhook credit path implemented (`POST /wallet/checkout`, `POST /webhooks/stripe`); without key Load CTA stays honest. Spend/refund ledger works in-process once funded (test load path only). |
| Instagram / Threads social sync | — | Meta professional-account APIs only | **SKIP for social awareness (Paste G Phase 5).** Personal IG Basic Display shut down 2024-12-04; Graph/Threads cannot read friends’ birthdays/life events. See `shots/audit/SOCIAL_API_RESEARCH.md`. Contact birthday sync uses device contacts the user selects. |
| AdHoc push profile refresh | Founder | App Store Connect API key for EAS (`EXPO_ASC_API_KEY_PATH` + `EXPO_ASC_KEY_ID` + `EXPO_ASC_ISSUER_ID`, or EAS submissions ASC key) | **BLOCKED for non-interactive AdHoc refresh.** Development build #4 failed: profile missing Push Notifications. Contacts rebuild #5 ships **without** push entitlement on AdHoc; production/TestFlight keeps push. After ASC key lands, refresh AdHoc with `--refresh-ad-hoc-provisioning-profile` and restore notifications on development. |
| ElevenLabs TTS (voice notes) | Founder | `ELEVENLABS_API_KEY` from https://elevenlabs.io (optional `ELEVENLABS_VOICE_ID`) | **BLOCKED — key not in runtime env.** `OpalCore.Voice.speak/2` returns `{:disabled, "ELEVENLABS_API_KEY missing"}` unless OpenAI TTS fallback key is present. Text approval remains mandatory; never freelances speech. |

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
| ElevenLabs TTS disabled / OpenAI TTS fallback | No `ELEVENLABS_API_KEY` — speak path disabled unless OpenAI TTS key present; listen honesty via `Voice.listen/1`. |
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

1. Upload IPA → App Store Connect / TestFlight — `docs/TESTFLIGHT_UPLOAD.md`
2. Verify push on the production build — `shots/PUSH_VERIFY_CHECKLIST.md`
3. Two-device call walk (second pair of hands)
4. Walk current tip on the real TestFlight build (not LAN/dev client)
5. Optional later: Deepgram, Google Places, Sentry keys
