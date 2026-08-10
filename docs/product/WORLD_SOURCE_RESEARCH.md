# Real-world opportunity sources — research note

**Product objective:** sources exist so Opal can **eliminate decisions**, not fill a browse catalog.

Quality metric:

> How often does this source allow Opal to remove a search, question, comparison, or app switch?

Data abundance without alignment compression is not valuable.

## Source contract

`OpalCore.SocialFlow.Physical.OpportunitySource` answers **WHAT EXISTS** only.

Opal judgment (OpeningQuality, InterruptionDebt, SmallestOutput) decides whether to interrupt.

## Candidate classes

| Class | Need | Example capability |
|-------|------|--------------------|
| Places | location, hours, category, public metadata, optional price/reservation capability | Google Places, Yelp Fusion, Foursquare |
| Events | geo, time, category, venue/zone, optional tickets | Ticketmaster Discovery, PredictHQ, SeatGeek |
| Inventory | short half-life availability | provider-specific booking APIs |
| Weather | time-sensitive context | Open-Meteo (no key), NWS |

## Evaluation criteria (current docs required before wiring)

- Coverage for target geos
- Cost / rate limits / commercial terms
- Caching rules and freshness
- Place vs event vs booking support
- API stability and attribution requirements

## Status (this campaign)

| Source path | Runtime | Notes |
|-------------|---------|-------|
| Catalog fixtures | LIVE DOMAIN synthetic | Default via CandidateSource |
| Event fixtures | LIVE DOMAIN synthetic | Not a feed; zone-bounded |
| Live Google / Ticketmaster / etc. | CREDENTIAL-GATED | Adapters + contract first; no secret committed |

## Founder credential packet (when needed)

When a real key is required, package:

1. Provider recommended (with why)
2. Capability unlocked
3. Pricing implications
4. Exact account setup steps
5. Secret names + vault location
6. Verification plan
7. Fallback if declined

Do not ask “which provider?” — research and recommend.

## Non-goals

- Event feed UI
- Place browser / map product
- Fake trending from star ratings
- Provider-created Set authority
