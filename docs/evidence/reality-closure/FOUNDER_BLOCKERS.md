# Reality Closure — founder interrupt packet (exact only)

Grok will not ask for steps Grok can complete. Only these require founder.

## 1. Render CLI reauth (optional — deploy via GH Actions preferred)

| Field | Value |
|-------|--------|
| Why | Local `RENDER_API_KEY` returns Unauthorized; `render whoami` fails |
| Preferred path | GitHub Actions `Deploy Opal API (Render image)` uses repo secret `RENDER_API_KEY` |
| Founder action only if | GH secret is also invalid, or ad-hoc Render CLI needed |
| Action | Create/refresh Render API key → store as GH secret `RENDER_API_KEY` |

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
