# P4.5 World / Provider Reality Audit

> **SUPERSEDED for implementation status by** `P4_5_REALTIME_WORLD_TRUTH_STOP_REPORT.md` / proof at `939b8ea`  
> (materiality, recomposer, OSM adapter, flagged consumer are BUILT).  
> Keep as pre-implementation inventory lineage. OSM ≠ provider ecosystem complete.

**Date:** 2026-09-05  
**Starting HEAD:** `ddbae07`  
**Branch:** `build/v2-coded-experience-closure`  
**Square:** `POST_B7_P4_5_REALTIME_WORLD_TRUTH`  
**Rule:** Do not infer “real” from JSON. No surprise paid signup.

## Classification legend

| Tag | Meaning |
|-----|---------|
| REAL_EXTERNAL | Live third-party / public API when exercised |
| REAL_BACKEND | Elixir/Postgres authoritative product truth |
| LOCAL_REAL | Real local infra (Redpanda, device geo, math) |
| FIXTURE | Hardcoded / recorded / synthetic inventory |
| STATIC | Contracts / TTL tables / filters |
| SYSTEM_DEPENDENCY | OS/browser/carrier |
| NOT_BUILT | Named; no production path |

## Critical finding

**Decision Intelligence (P4.2–P4.4) still fetches `CandidateSource.fetch(source: :catalog)` → `Place.Catalog` FIXTURE.**  
Google Places / Ticketmaster adapters exist beside DI via `OpportunitySource` / `PlaceProvider`, but are **not** on the High/Medium/Low path.  
Kafka is **publish-capable**; long-lived **recomposition consumer is NOT_BUILT**.  
Invalidation predicates exist on Context/Result; **runtime materiality matcher is NOT_BUILT**.

## Source inventory (condensed)

| Source | Owner | Class | Auth | Freshness | Price/Hours/Avail/Loc truth | Prod-safe | Store-ready | Cost/cred | P4.5 |
|--------|-------|-------|------|-----------|-----------------------------|-----------|-------------|-----------|------|
| Place.Catalog via CandidateSource | RealWorld.Place | **FIXTURE** | none | none | fake | as-labeled only | NO | none | DI currently uses this |
| CandidateSource `:events` | Physical | FIXTURE | none | none | no | fixture | NO | none | placeholder |
| HardCandidateFilter | Physical | STATIC | n/a | n/a | enforces only | yes | gate-only | none | keep after real acquire |
| DecisionContext / DecisionResult | DI | REAL_BACKEND | session | revision | social yes / place no | PARTIAL | NO world | none | recompose target |
| invalidation_conditions | DI | REAL_BACKEND fields | — | — | predicates stored | yes | runtime missing | none | activate |
| Google Places Nearby (New) | Providers.GooglePlaces | REAL_EXTERNAL when connected+key | `GOOGLE_PLACES_API_KEY` | live query | hours/price/loc provider_fact; **no slots** | yes if gated | PARTIAL | **paid GCP** | adapter ready; **key unset** |
| RecordedPlaces JSON | Providers.RecordedPlaces | FIXTURE (`recorded`) | none | stale | historical shape | proof only | NO | none | contract tests |
| Ticketmaster Discovery | Providers.TicketmasterEvents | REAL_EXTERNAL when key | `TICKETMASTER_API_KEY` | live | event schedule | yes w/ limits | PARTIAL | free signup | key unset |
| OpportunitySource / PlaceProvider / Mode | Physical | REAL_BACKEND plumbing | mode | — | no silent synth when connected | yes | — | — | correct DI seam |
| WorldFact / ExternalWorldTruth / ProviderResultGate | SocialFlow | STATIC contracts | — | TTL table exists | overclaim guard | yes | — | — | reuse |
| TravelProvider Haversine | Physical | LOCAL_REAL estimate | none | n/a | geometric only; **not traffic** | if labeled | weak ETA | none | keep honest |
| Traffic / Maps Directions | — | **NOT_BUILT** | — | — | — | — | — | — | dependency |
| Geocode area_label→lat/lng | GooglePlaces comment | **NOT_BUILT** | — | — | — | — | — | — | blocks Places without lat/lng |
| Weather | weather_forecast kind only | **NOT_BUILT** | — | — | — | — | — | — | dependency |
| Browser geo → ApproximateStore | Client+Agent | SYSTEM + LOCAL_REAL | OS perm | ~15m | approximate | PARTIAL | in-memory | none | nearby support |
| Google Calendar freeBusy | RealWorld.Calendar | REAL_EXTERNAL if OAuth | OAuth client | on-demand | busy≠willingness | yes | PARTIAL | Cloud signup | availability |
| OpalCalendar / manual availability | SocialFlow | REAL_BACKEND | membership | — | in-app | yes | yes in-app | none | use |
| SyntheticReservationProvider | SocialFlow | FIXTURE | none | 3m TTL | not live book | labeled only | NO | none | state machine only |
| OpenTable/Resy handoff URLs | BookingTransport | REAL_EXTERNAL handoff / NOT_BUILT create | none | — | not inventory | yes handoff | NO book | partner later | interim |
| EventOutbox + PublishOutboxWorker | Events | REAL_BACKEND | internal | — | — | yes | yes path | none | backbone |
| KafkaAdapter (brod produce) | Events | LOCAL_REAL when enabled | brokers | — | — | local≠prod | NO prod | none | publish GREEN |
| Kafka long-lived consumer | — | **NOT_BUILT** | — | — | — | — | — | — | **must build** |
| LocalAdapter PubSub | Events | REAL_BACKEND | — | — | — | yes | immediacy | none | keep |
| services/opal_ai | Python | REAL_BACKEND propose | URL | — | **not** world source | yes | — | — | must not invent inventory |
| Graph / Journey | Core | REAL_BACKEND + UI fixtures | — | — | PARTIAL | yes domain | PARTIAL | none | consumers + invalidators |
| Twilio Verify | phone | REAL_EXTERNAL if prod SMS | Twilio | — | identity | gated | — | paid | not place truth |
| Founder seeds / Search / Activity rows | Web | FIXTURE | — | — | — | demo | NO | none | do not reopen UI |

## Env keys (names only)

`GOOGLE_PLACES_API_KEY`, `OPAL_GOOGLE_PLACES_API_KEY`, `OPAL_PLACE_PROVIDER_MODE`, `TICKETMASTER_API_KEY`, `OPAL_EVENT_PROVIDER_MODE`, `GOOGLE_CALENDAR_*`, `OPAL_PROVIDER_TOKEN_SECRET`, `OPAL_KAFKA_ENABLED`, `OPAL_KAFKA_BROKERS`, `OPAL_AI_URL`, `OPAL_TWILIO_*`, `OPAL_SYNTHETIC_*`.

**No** OpenWeather / Mapbox / Resy partner / traffic keys in config.

**Dev probe 2026-09-05:** `GOOGLE_PLACES_API_KEY=unset`, `TICKETMASTER_API_KEY=unset`, `OPAL_KAFKA_ENABLED=unset` (Colima/Redpanda available from P4.1a).

## Free public path discovered

| Source | Class | Notes |
|--------|-------|-------|
| **OpenStreetMap Overpass** | REAL_EXTERNAL (public) | Live HTTP probe returned real Little Italy restaurants (Barbusa, Filippi’s, …) with OSM ids + tags. **No API key. No paid signup.** Bounded queries only. Hours/price incomplete vs Google. |

## What can become real without paid founder signup

1. **OSM Overpass** — primary P4.5 real-candidate gate (no credential).  
2. Ticketmaster — free signup (not auto-created).  
3. Haversine travel — already LOCAL_REAL.  
4. Native calendar / manual availability — REAL_BACKEND.  
5. Browser approximate location — SYSTEM.  
6. OpenTable/Resy URL handoff — not inventory.

## Adapter status

| Adapter | Status |
|---------|--------|
| GooglePlaces | Thin live HTTP; mode-gated; **DI unwired**; key DEPENDENCY |
| TicketmasterEvents | Thin live HTTP; key DEPENDENCY |
| RecordedPlaces | FIXTURE recorded |
| Place.Catalog | FIXTURE default |
| OSM Overpass | **NOT_BUILT → build in P4.5** |
| Travel geometric | LOCAL_REAL |
| Calendar Google | OAuth DEPENDENCY |
| Weather / traffic / geocode | NOT_BUILT |
| Kafka consumer recompose | NOT_BUILT → build |

## Invalidation already on schema

`participant_availability` · `provider_availability` · `time_window_validity` · `budget_maximum` · `location_radius` · `participant_membership` · `weather_dependency` · `graph_revision` · `journey_revision` · `explicit_reject`

## Kafka consumer status

| Layer | Status |
|-------|--------|
| Outbox → Oban → Kafka publish | Implemented |
| Local Redpanda | LOCAL_REAL (P4.1a GREEN) |
| Long-lived consumer group | **NOT_BUILT** |
| Proof fetch | Script-only `:brod.fetch` |
| Production Kafka | NOT_DEPLOYED |

## Biggest blockers (fixture → real)

1. DI hard-wired to Catalog fixtures.  
2. No EVENT→materiality→recompose loop.  
3. Kafka consume absent.  
4. Paid/signup credentials for Google/Calendar.  
5. Geocode gap for Google Places area_label.  
6. No live reservation inventory.  
7. Weather/traffic NOT_BUILT.  
8. ApproximateStore not durable.  

## One-liner

**Ladder REAL · candidate world FIXTURE · provider adapters SIDE · Kafka PUBLISH-ONLY · recomposition HOLD → P4.5 must wire DI→real CandidateSource, activate invalidation/materiality, and consume Kafka.**
