# External-World Truth Contract

**Status:** ACTIVE  
**Established:** Pass 5 (2026-08-13)  
**Module:** `OpalCore.SocialFlow.ExternalWorldTruth`

## Purpose

Opal may reason richly about people and Shared Reality without inventing the external world.

## Three truth classes (never collapse)

| Class | Meaning | Example | Does NOT authorize |
|-------|---------|---------|-------------------|
| **SOCIAL_FIT** | CollectiveComposition ranking | “Good fit for the group” | open/booked/paid/Set |
| **PROVIDER_FACT** | Inventory, hours, free/busy, travel | “Provider reports open” | Set, payment, social willingness |
| **EXECUTION_STATE** | Hold/book/pay/nav attempt | “Reservation confirmed” | Silent charge; invent success |

## Laws

1. **LLM is not a provider.** Inference never becomes inventory.
2. **Social fit ≠ availability.** Ranked first does not mean bookable.
3. **Availability ≠ reservation.** Checked inventory is not held/confirmed.
4. **Reservation ≠ payment authorization.**
5. **Every provider fact needs provenance** (source, observed_at, synthetic|real).
6. **Fixture catalog is synthetic** (`inventory_unknown` unless live checked).
7. **Booking requires human authorization** + valid execution state machine.
8. **Provider failure recomposes only provider/execution scope** — preserves WHAT/WHEN/social constraints.
9. **External handoff** sets `reservation_complete: false` until real confirmation.

## Existing anchors (reuse)

| Module | Role |
|--------|------|
| `ProviderAuthority` | Provider facts ⇏ social authority |
| `ProviderBoundary` | Booking states; no Booked without confirmation |
| `WorldFact` | Provenance taxonomy |
| `ProviderResultGate` | Stale/live claim gate |
| `ExternalHandoff` | Leaving Opal; reservation_complete false |
| `CollectiveComposition` | social_fit only |

## Human language

Allowed from social fit alone: “looks like a good fit”, “candidate”, “option”.

Forbidden without provider/execution evidence: “booked”, “table reserved”, “open now”, “confirmed”, “paid”.

## Auto-learning

Not in scope. Durable memory remains explicit-write only.
