# Place provider research (architecture, pre-credential)

**Status:** architecture complete with fixture adapter. Live provider keys not required for core proof.

## Separation

| Layer | Role |
|-------|------|
| PlaceProvider / CandidateSource | WHAT EXISTS |
| CollectivePlaceFit | WHAT FITS THESE PEOPLE |
| Humans | authority / choice |
| BookingAttachment | execute only after authorization |

Providers must never become accidental alignment authority.

## Evaluation criteria (from campaign)

- place search, opening hours, category, location
- pricing indication, ratings/popularity
- photos only if genuinely needed
- API pricing, quota, terms, commercial use
- data caching rules, coverage
- event support vs place-only

## Default for Opal core

**Fixture catalog** (`RealWorld.Place.Catalog` → `Physical.CandidateSource`).

Rationale:

- no credential gate for CI/privacy proof
- provider-neutral normalized fields already defined
- degrades without external network
- CollectiveFit tests hard/soft constraints independently

## Future external candidates (evaluate with CURRENT official docs at activation)

When credentials are available, re-check:

1. **Google Places API (New)** — strong coverage, commercial terms, caching rules strict
2. **Mapbox Search** — places + geocoding; check commercial and caching
3. **Foursquare Places** — category depth; check free tier limits
4. **Yelp Fusion** — restaurants-strong; limited event/general place
5. **Ticketmaster / Eventbrite** — events only; separate from restaurants

Do **not** pick from memory at activation time — re-read official terms.

## Normalized fields (provider-neutral)

```
provider_place_id, name, categories, area_label,
open_at_plan_time, price_level, rating,
reservation_support, quiet, provider_freshness
```

No raw provider schema leaked into SocialFlow.

## Activation gate

Stop for credentials only when remaining real proof requires a live place call.
Until then: fixture + CollectiveFit + pipeline tests are sufficient.
