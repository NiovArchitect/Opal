# Reality Closure — founder interrupt packet (exact only)

Grok will not ask for steps Grok can complete. Only these require founder.

## 1. Render API key reauth — **P0 BLOCKER FOR HOSTED DEPLOY**

| Field | Value |
|-------|--------|
| Why | Both local and **GitHub Actions** `RENDER_API_KEY` return `{"message":"Unauthorized"}` |
| What already done | Durable image built + pushed: `ghcr.io/niovarchitect/opal-api-runtime:reality-closure-main-b29540b` digest `sha256:7b5ba164…` from main `b29540b` |
| Preferred path | Refresh Render API key → update GH secret `RENDER_API_KEY` → re-run workflow **or** set image path in Render dashboard |
| Exact action | See `DEPLOY_ATTEMPT_2026-08-10.md` |
| Without this | Hosted stays on `rp61-synthetic-61100ca`; pilot stays **NOT READY** |

## 2. Google Places live (optional for social pilot)

| Field | Value |
|-------|--------|
| ENV | `GOOGLE_PLACES_API_KEY` |
| Founder only | GCP billing authorization + Places API (New) key + legal/account-owner consent |
| If declined | Remain SYNTHETIC; RuntimeTruth stays honest |
| Packet | `docs/product/FOUNDER_CREDENTIAL_PACKET_WORLD_ADAPTERS.md` |

## 3. Ticketmaster live (optional for social pilot)

| Field | Value |
|-------|--------|
| ENV | `TICKETMASTER_API_KEY` |
| Founder only | Developer portal account / MFA if Grok cannot access |
| Cost | Free developer tier typically |
| If declined | SYNTHETIC events remain |

## 4. Not required for small social pilot

- Live Places / Ticketmaster  
- Physical device push receipt  
- Twilio production SMS  

## Required for pilot (engineering, not founder MFA)

1. Deploy **main** image to hosted API  
2. Boot migrations 20260817–19  
3. Core Real People + privacy + realtime hosted regression  
4. Residue + question ledgers available for dogfood  

## After secrets land

Grok flips RuntimeTruth only after **actual** connection/proof — never because env var exists.
