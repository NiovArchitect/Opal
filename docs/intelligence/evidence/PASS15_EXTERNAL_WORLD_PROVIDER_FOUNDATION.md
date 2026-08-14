# PASS 15 — External-World Provider Foundation

**Date:** 2026-08-14  
**Branch:** `build/v2-coded-experience-closure`  
**HOLD. DO NOT MERGE.**

---

## EXECUTIVE STATE

Pass 14 closed the internal orchestration loop.  
Pass 15 connects **place discovery + travel truth** as **senses and hands** — not a new brain.

```text
Social context
→ place adapter (live | recorded_fixture | synthetic catalog)
→ ExternalWorldTruth envelopes + provenance
→ CollectivePlaceFit (social rank; provider order ≠ authority)
→ private select + stable place identity
→ travel fact (freshness)
→ PersonalFlow leave
→ NotificationDelivery
```

**Credentials:** `GOOGLE_PLACES_API_KEY` unset in this environment → **recorded fixture path** proven (not claimed live).

---

## INTELLIGENCE PREFLIGHT

```text
INTELLIGENCE CONTEXT LOADED
TARGET: place/travel ExternalWorldTruth vertical
CURRENT PROVIDER ARCHITECTURE: Physical.PlaceProvider, TravelProvider,
  OpportunitySource, GooglePlaces adapter, CandidateSource/Catalog,
  WorldFact, ExternalWorldTruth, CollectivePlaceFit
EXPECTED NON-CHANGES: AttentionAuthority ranking, PersonalFlow semantics,
  NotificationDelivery authority, SocialReality, brand, no booking
```

---

## PROVIDER INVENTORY

| Capability | Owner | Real / Synthetic / Stub | Notes |
|------------|-------|-------------------------|-------|
| Places search | `Physical.PlaceProvider` + `OpportunitySource` | synthetic default; Google when key | mode matrix |
| Google Places | `Providers.GooglePlaces` | real adapter | Nearby Search New |
| Recorded places | `Providers.RecordedPlaces` | **recorded_fixture** | Pass 15 |
| Venue catalog | `RealWorld.Place.Catalog` | synthetic fixture | Juniper/Harbor… |
| Travel | `Physical.TravelProvider` → Haversine | geometric_estimate | not traffic_eta |
| Events | Ticketmaster adapter | real when key | not in vertical |
| Calendar | RealWorld.Calendar.* | google adapter | out of slice |
| Booking | ProviderBoundary | execution separate | not Pass 15 |
| Payments | — | unbuilt | blocked |
| Social fit | CollectivePlaceFit | Opal brain | provider not authority |

---

## PROVIDER CHOICE

**Place:** Google Places API (New) adapter already in repo + **recorded fixture** for credential-less proof.  
**Travel:** existing haversine geometric estimate (no fake traffic ETA).  

Why: fits architecture, server-side key only, no scraping, provenance already modeled.

---

## LIVE CREDENTIAL STATUS

```text
GOOGLE_PLACES_API_KEY: unset
→ recorded_fixture path used
→ live=false, recorded=true, source=recorded_google_places
```

---

## EXTERNAL FACT SCHEMA

Envelope fields: `provider`, `provider_resource_id`, `fact_type`, `value`, `observed_at`, `expires_at`, `confidence`, `source_region`, `provenance`.

TTL by type:

| Fact type | TTL |
|-----------|-----|
| place metadata | 6h |
| venue hours | 1h |
| travel_duration | 15m |
| reservation_availability | 3m |

---

## VERTICAL PROOF RESULTS

| Step | Result |
|------|--------|
| Place search (recorded) | candidates normalized with provenance |
| Closed venue | excluded (Closed Italian Corner) |
| Downtown hard exclude | Downtown Pasta Co excluded |
| Hours unknown | Quiet Trattoria: open_now=:unknown (not closed) |
| Social fit | CollectivePlaceFit; `provider_is_not_authority=true` |
| Private select | top social candidate |
| Place identity | provider_place_id retained |
| Explicit share | human label + backend IDs |
| Travel | duration + provenance; origin not peer-exposed |
| Leave | approximate “about N minutes” (no 6:17 fake exactness) |
| Provider failure | WHO/WHAT/WHEN preserved; next_gap=place |
| LLM-not-provider | recorded_fixture / google_places pass |
| No fake booking | BOOKABILITY=unknown, EXECUTION=none |

---

## PRIVACY

- Origin coordinates private; `origin_exposed_to_peers=false`
- Provider query uses minimal area/category/lat-lng — not conversation memory
- Lock-screen / leave copy remain action timing

---

## ATTENTION NON-REGRESSION

Provider calls do not surface Home noise. Only human consequences may interrupt (Pass 13/14 frozen).

---

## TESTS

- `provider_vertical_test.exs` — recorded adapter + vertical E2E  
- `external_world_truth_test.exs` — existing + envelope TTL  
- vitest `externalWorldTruth.test.ts`  
- Pass 13/14 suites still green  
- intelligence_check --with-tests

---

## FILES

- `apps/opal_core/lib/.../provider_vertical.ex`
- `apps/opal_core/lib/.../providers/recorded_places.ex`
- `apps/opal_core/priv/provider_fixtures/google_places_nearby_dinner_little_italy.json`
- `apps/opal_core/lib/.../external_world_truth.ex` (envelope, freshness, failure reopen)
- `apps/opal_web/src/opalUi/externalWorldTruth.ts` + test
- this evidence

---

## KNOWN GAPS

1. **No live Google Places network call** in this environment (key unset).  
2. Travel is **geometric**, not traffic-aware — correct honesty.  
3. Reservation availability **not** integrated (open ≠ table).  
4. No map UI (intentional).  
5. Booking / payments blocked for next pass.  
6. Curate product surface still primarily fixture-driven in SPA; vertical is domain-proven for wiring.

---

## V2 MERGE VERDICT

**HOLD — DO NOT MERGE.**

Providers give Opal eyes and hands.  
They do not decide what people want, what matters, or whether Opal may act.
