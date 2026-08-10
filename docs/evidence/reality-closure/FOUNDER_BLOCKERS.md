# Reality Closure — founder interrupt packet (exact only)

Grok will not ask for steps Grok can complete. Only these require founder.

## 1. Render API key reauth — **P0 BLOCKER FOR HOSTED DEPLOY**

| Field | Value |
|-------|--------|
| Why | Both local and **GitHub Actions** `RENDER_API_KEY` return HTTP **401** `{"message":"Unauthorized"}` |
| Reconfirmed | 2026-08-10 (post-#104) — `GET /v1/owners` 401; workflow run `31426276589` PATCH service 401 |
| What already done | **Two** durable images built + pushed from main: (1) `reality-closure-main-b29540b` (2) `hosted-adversarial-closure-00937e5` digest `sha256:804c9364…` from **#104** main |
| Preferred path | Refresh Render API key → update GH secret `RENDER_API_KEY` → re-run workflow **or** set image path in Render dashboard |
| Exact action | See `docs/evidence/adversarial-human-reality/HOSTED_CLOSURE_BLOCKED.md` |
| Without this | Hosted stays on stale image; **hosted adversarial matrix cannot run**; pilot stays **NOT READY** |
| After fix | Grok continues autonomously: deploy → migrate proof → Real People + adversarial hosted → pilot gate. **No new product work until then.** |

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
