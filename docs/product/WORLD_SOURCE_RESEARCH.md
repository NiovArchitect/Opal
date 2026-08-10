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

## Selection (this activation)

| Role | Choice | Why |
|------|--------|-----|
| Place source | **Google Places API (New)** | Coverage + hours/open-now + types; removes place search labor |
| Event source | **Ticketmaster Discovery** | Free key, geo/time events; not a feed |
| Not chosen yet | Yelp / Foursquare / PredictHQ | Redundant place coverage or commercial onboarding heavier |

Primary metric: **alignment compression**, not listing volume.

## Status

| Source path | Runtime class | Notes |
|-------------|----------------|-------|
| Catalog fixtures | SYNTHETIC / LIVE DOMAIN | Default without keys |
| Event fixtures | SYNTHETIC | Zone-bounded |
| GooglePlaces adapter | **CREDENTIAL-GATED** | `GOOGLE_PLACES_API_KEY`; modes via `OPAL_PLACE_PROVIDER_MODE` |
| Ticketmaster adapter | **CREDENTIAL-GATED** | `TICKETMASTER_API_KEY`; `OPAL_EVENT_PROVIDER_MODE` |
| Live slot / booking | NOT CLAIMED | Metadata ≠ “7:30 available” |

## Modes

`disabled | synthetic | connected | degraded | error`

Connected failures **must not** silently return synthetic as real.

## Founder packet

See `FOUNDER_CREDENTIAL_PACKET_WORLD_ADAPTERS.md` (exact secrets, setup, proof).

## Non-goals

- Event feed UI
- Place browser / map product
- Fake trending from star ratings
- Provider-created Set authority
