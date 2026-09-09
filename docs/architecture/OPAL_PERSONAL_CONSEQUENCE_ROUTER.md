# Personal Consequence Router

**Status:** ARCHITECTURE CURRENT  
**Law:** `EVENT ≠ CONSEQUENCE` · Silence is a valid output.  
**Extends:** Material Time / Time Services · Phoenix realtime · Kafka durable domain events

## Thesis

Shared reality is **canonical**. Material consequence is **personal**.

Same RealityEvent may produce:

| User | Consequence |
|------|-------------|
| A | Leave soon |
| B | Nothing (silence) |
| C | Reservation changed notice |
| D | Timezone-adjusted reminder |

## Flow

```text
Shared RealityEvent
  → per-user Materiality evaluation
  → personal consequence (or silence)
  → Phoenix to connected user (when valuable)
```

## Fabric (reaffirmed)

| Layer | Role |
|-------|------|
| Postgres | Durable truth |
| Outbox | Atomic event handoff |
| Kafka | Durable async domain distribution |
| Phoenix | Connected-user realtime consequence |
| WebRTC | Live media only |
| Python | Understanding / proposal |
| Elixir | Product / domain truth |

Kafka carries: decision · action · provider · material-time · appropriate Graph/Memory consequences.  

Kafka does **not** carry: raw A/V · SDP · ICE · clock ticks · credentials.

## Examples

Shared:

```text
Venue: Juniper & Ivy
start_at_utc: 2026-09-12T02:30:00Z
venue_timezone: America/Los_Angeles
party: 4
status: confirmed
```

Not shared as a single broadcast:

> Leave at 6:55.

Each user gets `user_material_leave_at` from their permitted location, mode, buffers, and world conditions.

## Related

- `OPAL_TEMPORAL_REALITY_MODEL.md`  
- `OPAL_TIME_SERVICES.md`  
- `docs/authority/OPAL_RELATIONSHIP_INTELLIGENCE_DOCTRINE.md`
