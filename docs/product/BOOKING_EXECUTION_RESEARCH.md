# Booking execution research (current official state)

**Product goal:** eliminate re-search / re-entry after humans say yes — not fake “Booked”.

## OpenTable

| Claim | Reality |
|-------|---------|
| Public create-reservation API for third-party apps | **No** — guest reservation APIs are **partner / commercial approval** |
| Public docs | https://docs.opentable.com/ (partner) |
| Partner path | https://www.opentable.com/restaurant-solutions/api-partners/ |
| Deep-link / guest handoff | **Yes** — venue pages e.g. `https://www.opentable.com/r/{slug}` with optional `covers`, `dateTime` query params |

**Opal stance:** default **HANDOFF ONLY**. `handoff_started` ≠ `booked`.

## Resy / others

Similar: commercial partner programs for transactional APIs. Prefer handoff until partnership.

## Ticketmaster

Discovery (#87) ≠ purchase authority. Ticket purchase remains handoff / future transactional provider.

## Future AVP² plug-in point

```
execution-ready action
→ amount / participants resolved
→ AVP² payment authorization
→ provider execution
```

AVP² = payments only. Not built this campaign.

## Recommendation for founder

| Path | Effort | User step elimination |
|------|--------|------------------------|
| Venue deep-link handoff (now) | Low | High for “find the place again” |
| OpenTable partner API | Commercial approval + integration | Highest (true book) |
| Fake booked status | **Forbidden** | Lies |

Ship handoff now; pursue partner booking only with explicit founder commercial decision.
