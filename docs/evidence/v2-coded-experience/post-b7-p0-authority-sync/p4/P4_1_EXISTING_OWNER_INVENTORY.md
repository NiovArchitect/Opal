# P4.1 Existing Owner Inventory

**Date:** 2026-09-05 · **HEAD:** `c032ad9`

| Owner | Module / table | Purpose | Action |
|-------|----------------|---------|--------|
| Event outbox | `OpalCore.Events.EventOutbox` / `event_outbox` | Transactional durable events | **REUSE / EXTEND** |
| Event publisher | `OpalCore.Events.Publisher` | Transport-neutral record + Oban schedule | **EXTEND** (Multi-friendly insert) |
| Domain envelopes | `OpalCore.Events.DomainEvent` | Versioned Kafka-ready envelopes | **EXTEND** (`decision.*` topic family) |
| Outbox worker | `PublishOutboxWorker` | LocalAdapter (+ Foundation) | **EXTEND** (Kafka when enabled) |
| Kafka adapter | `Adapters.KafkaAdapter` | Stub today | **EXTEND** → real produce |
| Local adapter | `Adapters.LocalAdapter` | PubSub immediacy | **REUSE** |
| SharedPlan | `shared_plans` + revisions | Plan commitment lifecycle | **REFERENCE** (not DecisionContext) |
| PlanRevision | `plan_revisions` | Plan change proposals | **DO_NOT_TOUCH** / pattern REFERENCE only |
| PlanParticipant | `plan_participants` | Plan membership | **REFERENCE** pattern for people IDs |
| ExperienceGraph | in-memory lineage helper | Provenance graph | **REFERENCE** — not DI owner |
| DecisionCompression | cognition helper | Option compression (≤3) | **DO_NOT_TOUCH** in P4.1 (P4.2+) |
| decision_trace / decision_summary | partial traces | Not first-class context | **REFERENCE** — do not elevate as owner |
| JourneyAuthority / MicroJourney | journey domain | Journey truth | **REFERENCE** via `journey_id` only |
| RelationshipGraph | relationship truth | People/relationship | **REFERENCE** via participant IDs |
| Accounts.User | users | Identity | **REFERENCE** |
| AiJob idempotency | `OpalCore.AI` | Idempotency pattern | **REFERENCE** pattern |
| CompletionEvent idempotency | social_flow | Unique idempotency_key | **REFERENCE** pattern |
| Local docker | `infra/local/docker-compose.yml` | postgres + opal_ai + opal_core | **EXTEND** (+ Redpanda) |
| Kafka ADR | `docs/architecture/KAFKA_ACTIVATION_ADR.md` | Authority | **EXTEND** |

## Absolute

- Do **not** create second Graph / Journey / Outbox owners.  
- DecisionContext **references** `graph_id` / `journey_id`; does not duplicate their truth.
