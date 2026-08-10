# Founder credential packet — world adapters

**When:** Real place/event proof requires keys.  
**Grok status:** Adapters, normalization, security, synthetic/mock proofs, no-silent-fallback, metrics, and tests are complete **without** production secrets.

---

## PROVIDER 1 — Google Places API (New)

| Field | Value |
|-------|--------|
| **PROVIDER** | Google Places API (New) — Nearby Search |
| **WHY THIS PROVIDER** | Strong US place coverage, opening hours / open-now, types, price level, business status. Best single place source to remove “search restaurants near X” work. |
| **WHAT IT UNLOCKS** | Real place candidates into `OpportunitySource` / `WorldFact` for dinner/coffee/etc. Still does **not** claim reservation slots. |
| **COST / PLAN** | Pay-as-you-go Places SKUs; field masks control tier. ~$200 Google Maps monthly credit historically (verify current console). Nearby Search Pro-class pricing when requesting hours/price fields. |
| **EXACT CREDENTIAL** | Server API key restricted to Places API (New) |
| **ENV NAME** | `GOOGLE_PLACES_API_KEY` (alias `OPAL_GOOGLE_PLACES_API_KEY`) |
| **WHERE TO PUT IT** | Host secrets / Doppler / Fly secrets / `.env` **never committed**. Optional: `OPAL_PLACE_PROVIDER_MODE=connected` |
| **WHAT GROK CAN CONFIGURE** | Runtime config mapping, adapter modules, mock tests, CI synthetic mode |
| **WHAT FOUNDER MUST AUTHORIZE** | GCP project billing + create/restrict API key + enable Places API (New) |
| **HOW LIVE PROOF RUNS** | Set key → `OPAL_PLACE_PROVIDER_MODE=connected` → acquire Carlsbad dinner zone → assert normalized candidates + no Set + no slot claims |
| **ALTERNATIVE IF DECLINED** | Remain on synthetic fixtures (`provider_mode=synthetic`); product judgment path unchanged |

### Setup steps (founder)

1. Google Cloud Console → create/select project  
2. Enable **Places API (New)**  
3. Credentials → API key → Application restriction: IP or none for server  
4. API restriction: Places API only  
5. `export GOOGLE_PLACES_API_KEY=...`  
6. Optional: `export OPAL_PLACE_PROVIDER_MODE=connected`  

---

## PROVIDER 2 — Ticketmaster Discovery API

| Field | Value |
|-------|--------|
| **PROVIDER** | Ticketmaster Discovery API v2 |
| **WHY THIS PROVIDER** | Free developer key, geo + date event search, venue coordinates, onsale status. Removes “what’s on this weekend” search without building an event feed. |
| **WHAT IT UNLOCKS** | Real event candidates; expiry filtering; ticket URL presence (not auto-purchase) |
| **COST / PLAN** | Free developer tier with rate limits (confirm current portal quotas) |
| **EXACT CREDENTIAL** | Consumer API key from developer.ticketmaster.com |
| **ENV NAME** | `TICKETMASTER_API_KEY` (alias `OPAL_TICKETMASTER_API_KEY`) |
| **WHERE TO PUT IT** | Host secrets / Doppler / Fly secrets |
| **WHAT GROK CAN CONFIGURE** | Adapter, tests, mode flags |
| **WHAT FOUNDER MUST AUTHORIZE** | Create TM developer account + app + Discovery API key |
| **HOW LIVE PROOF RUNS** | Key set → event acquire for city/geo → future events only → judgment still gates surface |
| **ALTERNATIVE IF DECLINED** | Synthetic event fixtures remain default |

### Setup steps (founder)

1. https://developer.ticketmaster.com/ → register  
2. Create app → enable Discovery API  
3. Copy API key  
4. `export TICKETMASTER_API_KEY=...`  
5. Optional: `export OPAL_EVENT_PROVIDER_MODE=connected`  

---

## WHAT GROK ALREADY SHIPPED (no credential required)

- `GooglePlaces` + `TicketmasterEvents` thin adapters  
- Payload sanitize / untrusted input  
- Mode: DISABLED / SYNTHETIC / CONNECTED / DEGRADED / ERROR  
- No silent synthetic fallback when connected  
- Metrics counters  
- Mock HTTP golden tests (place + event + quiet judgment still wins)  
- Runtime.exs env wiring  

## PAYMENT / MFA

Grok cannot complete: GCP billing enablement, TM account email MFA, paid plan upgrades.
