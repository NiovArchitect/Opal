# Production SMS provider review — phone verification

**Author:** Grok (lead)  
**Date:** 2026-08-06  
**Purpose:** Choose a production verification path for Opal Real People vertical.  
**Sources:** Primary vendor public pricing pages (Twilio Verify, Telnyx Verify, Vonage Verify) as of research date. Founder must reconfirm before purchase.

**No purchase or paid usage without founder approval** unless an existing approved account/budget already exists.

---

## Recommendation

| Rank | Provider | Role |
|------|----------|------|
| **1 — Recommended** | **Twilio Verify** | Primary for pilot → production candidate |
| **2 — Runner-up** | **Telnyx Verify** | Cost-competitive alternative; good if Twilio lock-in / cost becomes painful |
| **3 — Consider later** | **Vonage Verify** | Strong fraud packaging; sales-heavy Success tier; Conversion ~$0.06 + channel |

### Why Twilio first for Opal

1. **Managed Verify API** fits Opal’s boundary: request challenge / check code without inventing OTP storage in production.  
2. **Mature docs**, multi-channel later (SMS now; WhatsApp optional later — not required for first seed).  
3. **Built-in rate limiting and carrier-approved templates** reduce first-mile compliance burden vs raw SMS API.  
4. Existing industry Elixir HTTP clients (Req/Tesla) integrate cleanly; no need for a special SDK.  
5. Clear separation: **successful verification fee + SMS channel fee** — cost model is understandable for pilot budgeting.

### Why not Telnyx first

- **Lower list price** (~$0.03 / successful verification + SMS) is attractive.  
- Slightly thinner “default enterprise story” for US A2P/10DLC operational playbooks relative to Twilio for many startups — still fully viable.  
- **Promote to primary** if founder already has Telnyx account or cost at 10k+/mo matters more than operational familiarity.

### Why not Vonage first

- Verify Conversion ~**€0.052 / ~$0.06** per successful verification **plus** messaging rates.  
- Verify Success (pay only on success, attempts free) is sales-led — good at scale, slower for a two-phone pilot.  
- Keep as evaluation candidate if fraud tooling (Fraud Defender) becomes the deciding factor.

### AWS SNS / End User Messaging

- Viable for raw SMS OTP **if Opal generates and stores codes**.  
- Conflicts with preferred design: production mode should use a **managed verify** service so Opal stores **digests + provider reference**, not plaintext OTP.  
- Higher implementation risk (template compliance, custom rate limits, code lifecycle).  
- **Not recommended for first vertical** unless Twilio/Telnyx are blocked.

---

## Cost model (US SMS, order-of-magnitude)

Assumptions for pilot planning (must re-quote before scale):

| | Twilio Verify (US SMS) | Telnyx Verify (SMS) |
|--|----------------------|---------------------|
| Successful verification fee | **$0.05** | **$0.03** |
| SMS channel (US long-code order) | **~$0.0083** / SMS segment | Messaging list starts ~**$0.004** send (varies) |
| Rough all-in per success (1 SMS) | **~$0.058** | **~$0.034–0.05** (depends on SMS rate) |
| Failed / incomplete | SMS often still billed; Verify success fee only on success (Twilio) | Verify charges on successful verification + SMS API pricing |

### Monthly verification volume (rough USD, Twilio-like ~$0.06 all-in)

| Successful verifications / month | Approx. cost |
|----------------------------------|--------------|
| 100 | ~$6 |
| 1,000 | ~$60 |
| 10,000 | ~$600 |
| 100,000 | ~$6,000 |

**Add:** phone number rental (if required), 10DLC / brand registration, carrier fees, WhatsApp/Meta fees if used later, support plan, fraud tooling.

**Pilot reality:** two founders / friends verifying a few times/day is **&lt; $5/month** of pure verification cost. Compliance registration is the real fixed cost in the US.

---

## Compliance dependencies (split)

### Twilio Verify OTP (first pilot)

| Item | Notes |
|------|--------|
| Verify Service | Required — Opal does not own the OTP body |
| Recipient consent + evidence | Required ([Twilio consent policy](https://www.twilio.com/docs/verify/consent-opt-in)) |
| “Message and data rates may apply” | Required on US/Canada OTP request UI |
| Terms + Privacy links | Required |
| Trial verified recipients | Trial can only message numbers verified in Twilio console |
| Billing | Needed for non-trial / non-verified recipients |
| **Opal 10DLC campaign** | **Not automatic** for Verify-managed OTP |
| Youth / family | Separate product rules; phone ≠ legal identity |

### General SMS invitations (later)

| Item | Notes |
|------|--------|
| Approved sender | Long code / toll-free / short code |
| A2P 10DLC or other registration | When Opal sends app messaging via programmable SMS |
| STOP / HELP | Messaging-program expectations |
| Opt-in distinct from OTP | Do not bundle marketing with transactional OTP |

---

## Required founder actions (before production_sms mode)

See revised `FOUNDER_ACTIONS_REQUIRED.md`. Short form:

1. Approve Twilio Verify (or Telnyx override).  
2. Account + Verify Service.  
3. Billing **or** trial-recipient restrictions.  
4. Two pilot phones.  
5. Server secrets only (prefer API key + secret over long-lived Auth Token).  
6. No 10DLC required solely for Verify OTP unless account-specific Twilio guidance says otherwise.

---

## Secrets (server-side only)

| Secret | Where |
|--------|--------|
| Account SID / API key | Host secrets manager / Render env |
| Auth token / API secret | Host secrets — never client |
| Verify Service SID | Host secrets |
| Lookup pepper (existing) | Already server; rotate for production |

**Never in:** Git, Vite bundle, mobile assets, screenshots, evidence markdown, logs.

---

## Deployment impact

| Surface | Change |
|---------|--------|
| `opal_core` | Provider adapter + mode config |
| Hosted API | Env flags + secrets |
| `opal_web` | Copy only; still only `VITE_OPAL_API_URL` |
| Mobile | Profile `providerMode` must not claim production until flag true |
| DB | Reuse `verification_challenges`; may add provider fields if missing |

---

## Rollback

1. Set `OPAL_PHONE_VERIFY_MODE=disabled` or revert to `synthetic_development` **only on non-public hosts**.  
2. Public production must not silently switch to synthetic.  
3. Redeploy previous API image / unset Twilio secrets.  
4. Existing sessions remain until revoke; new challenges stop.

---

## Elixir integration quality

| Provider | Integration |
|----------|-------------|
| Twilio | HTTPS REST Verify v2; Req-friendly |
| Telnyx | HTTPS Verify API; Req-friendly |
| Vonage | REST + JWT patterns; slightly more setup |

Webhook delivery receipts: optional for pilot; useful for invite SMS later. First vertical can treat **Verify check API** as source of truth for OTP success.

---

## Decision record

**Grok recommendation:** implement **provider-neutral behavior** now; ship **Twilio Verify adapter** behind `production_sms` mode; keep synthetic for dev/test; **do not enable production mode** until founder completes account + 10DLC + secrets.

**Status:** Adapter skeleton in this branch. **Live production SMS: not enabled.**
