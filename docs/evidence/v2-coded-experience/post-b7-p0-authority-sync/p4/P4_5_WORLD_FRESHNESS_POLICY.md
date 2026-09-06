# P4.5 World Freshness Policy

**Version:** `p4.5.freshness.v1`

| Fact class | Typical TTL rationale | Default TTL |
|------------|----------------------|-------------|
| traffic_eta | highly volatile | 5–15 min |
| live_availability / reservation_slot | inventory moves fast | 3–5 min |
| venue_open_now | near decision time | 30–60 min |
| weather_forecast | short/moderate | 30–60 min |
| venue_hours schedule | changes occasionally | 6–24 h |
| venue_price_level | approximate | 7 d |
| venue_location / address | stable | 30 d |
| venue_exists | stable | 30 d |
| event_time | until provider revision | until end + buffer |
| user preference | evidence rules (not world TTL) | separate |

## High gate

For time-sensitive intents (`nearby_now`, leave-soon): critical open/availability facts must be within TTL or refreshed. If refresh fails → do not claim High open-now.

OSM Overpass: treat `opening_hours` tags as **schedule hints**, not live verified open-now unless freshly interpreted with timezone; `inventory_unknown = true`.
