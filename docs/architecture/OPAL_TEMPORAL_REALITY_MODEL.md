# Temporal Reality Model

**Status:** CURRENT (additive)  
**Locks:** `SHARED_REALITY_CANONICAL = YES` · `PERSONAL_CONSEQUENCE_CONTEXTUAL = YES`  
**Companion:** `OPAL_TIME_SERVICES.md` · `OPAL_PERSONAL_CONSEQUENCE_ROUTER.md`

## Law

> **Shared reality is canonical. Material consequence is personal.**  
> Never persist a naked ambiguous `"7:30"`.

## Required temporal concepts

| Concept | Meaning |
|---------|---------|
| `start_at_utc` | Canonical instant |
| `venue_timezone` | Where the event is local |
| `user_display_timezone` | Where the viewer is now |
| `event_local_display` | e.g. 7:30 PM PT |
| `user_material_leave_at` | Per-user leave-by consequence |
| commitment `status` | provisional / confirmed / cancelled / … |

## Shared vs personal

**Shared decision example**

```text
Venue: Juniper & Ivy
Canonical start: 2026-09-12T02:30:00Z
Venue timezone: America/Los_Angeles
Party: 4
Status: confirmed
```

**Personal consequence** depends on:

permitted current/expected location · travel mode · real duration · parking/walking · personal buffer · accessibility · materiality · current world conditions

If a user is temporarily in New York:

- event local: **7:30 PM PT**  
- their present local display: **10:30 PM ET**

Both are first-class — not a single ambiguous string.

## Delivery discipline

- Silence by default (Material Time law)  
- Recompute may be frequent; **notify only when user value changed**  
- Live change = delta recompose, not restart of the whole Graph story
