# Phase E — Real Venue API spike

**Status:** spike only — **not** wired into TripCanvas.  
**Date:** 2026-10-07  
**Module:** `OpalCore.Places.VenueLookup`

## Decision

**Chosen: Google Places API (New) — Text Search**

### Why Google over Foursquare

| Need | Google Places (New) | Foursquare Places |
| --- | --- | --- |
| Name / address / types | Pro SKU | Pro |
| Cuisine / restaurant typing | Strong via `types` + text query | Good categories |
| Price tier | `priceLevel` (Enterprise) | Attributes (Premium) |
| Rating | Enterprise | Pro/Premium |
| Photos | Place Photos SKU | Premium photos |
| Mexico City coverage | Excellent for fine dining | Good, thinner on some indie spots |
| Existing Opal stack | Maps-adjacent; Req already in repo | New vendor + deprecation churn (V3→new, May/Jun 2026) |

Google wins for **restaurant/venue lookup quality** on the fields TripActivity needs (`venue_name`, cuisine/tags, price tier, rating, photos) and for CDMX fine dining. Foursquare is cheaper at Pro ($15/1k after 500 free) but pricing/API surface churned in mid-2026 and Premium is required for deeper venue attrs.

## Pricing (2026, approximate — verify on Google price list before prod)

**Google Places API (New) — Text Search**

| SKU tier | Free / month | Entry rate / 1k |
| --- | --- | --- |
| Pro (name, address, types, location) | ~5,000 | ~$32 |
| Enterprise (+ rating, phone, website, hours, price) | ~1,000 | ~$35 |
| Enterprise + Atmosphere (+ reviews, amenities) | ~1,000 | ~$40 |

- Field mask bills at the **highest** SKU of any requested field.
- Spike field mask: `places.id,displayName,formattedAddress,types,priceLevel,rating,photos` → expect **Enterprise** pricing when `priceLevel`/`rating` included.
- Rate limits: per-method per-project RPM (manage in Cloud Console quotas).

**Foursquare Places (post Jun 1 2026)**

| Tier | Free | Then |
| --- | --- | --- |
| Pro | 500 calls/mo | $15 / 1k (drops at volume) |
| Premium | — | ~$18.75 / 1k |

Cheaper for volume search; weaker fit for our exact fine-dining field set without Premium.

## POC usage

```elixir
# Live (requires GOOGLE_PLACES_API_KEY):
OpalCore.Places.VenueLookup.search("Mexico City", "Mexican fine dining")
# => {:ok, [%{name: "...", cuisine: ..., price_tier: ..., rating: ..., ...}, ...]}

# Local proof without key:
OpalCore.Places.VenueLookup.search_or_demo("Mexico City", "Mexican fine dining")
# => {:ok, [Pujol, Quintonil, Contramar], :demo}

OpalCore.Places.VenueLookup.demo_venues()
# => 3 real CDMX venue shapes
```

Config:

```elixir
# config/runtime.exs (founder key)
config :opal_core, OpalCore.Places.VenueLookup,
  api_key: System.get_env("GOOGLE_PLACES_API_KEY")
```

## Integration plan (TripActivity venue resolution) — not built yet

1. **Curator suggest path** — When `GroupCurator` proposes an alternative or `TripCurator` suggests stops, call `VenueLookup.search(destination, vibe)` and map to `TripActivity` attrs (`venue_name`, `venue_area`, `vibe_tags`, notes with price/rating).
2. **Cache** — Owner-scoped short TTL cache keyed by `{city, query}` to stay inside free Pro/Enterprise caps.
3. **Fallback** — On `:api_key_missing` or HTTP error, keep seed/hand-curated venues; never invent fake restaurants in production UI.
4. **Wire point** — `TripController.curate_experience` / add_activity — resolve venue **before** insert; store Google `place_id` in activity notes or a future `place_ref` column (trip legs already have `place_ref`).
5. **Photos** — Separate Place Photos SKU; defer until canvas media slots exist.
6. **Do not** call Places from the web client — server-only, key never in Vite.

## Acceptance

- [x] Document chosen API, why, pricing, limits
- [x] POC module returns 3 venues for Mexico City / Mexican fine dining (`search_or_demo` / `demo_venues`; live with key)
- [x] Integration plan above
- [ ] Live key call — blocked on founder `GOOGLE_PLACES_API_KEY`
