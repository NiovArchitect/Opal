# ADR: Kafka as durable intersystem event backbone

## Status

**Accepted · P4-authorized (2026-09-05).**  
Local/dev architecture + proof are **CURRENT IMPLEMENTATION TARGETS** under P4.  
**Not** automatically production-deployed. Do not conflate:

| Flag | Meaning |
|------|---------|
| `KAFKA_IMPLEMENTATION_AUTHORIZED` | **YES** (P4 founder addendum) |
| `KAFKA_ARCHITECTURE_IMPLEMENTED` | Required for P4 complete (publish P4.1 · local proof P4.1a · recompose consume P4.5) |
| `KAFKA_LOCAL_PROOF` | Required GREEN for P4 complete |
| `KAFKA_PRODUCTION_DEPLOYED` | Truthful YES/NO — local ≠ prod |
| `KAFKA_IS_SOURCE_OF_TRUTH` | **NO** |

Supersedes prior wording that Kafka must remain “future only / do not implement” during early stages.  
Does **not** supersede: Elixir/Postgres authority, Phoenix client realtime, or privacy payload rules.

## Context

Opal needs a durable event backbone for independent consumers (Decision Intelligence, Activity projection, learning, providers, notifications, evaluation) without replacing Elixir authority, Phoenix realtime, PostgreSQL transactions, or Oban jobs.

## Decision

1. **Elixir/BEAM** remains social authority and concurrent coordination.  
2. **Phoenix Channels / PubSub** remain the user-facing realtime edge.  
3. **PostgreSQL** remains authoritative transactional state.  
4. **Oban** publishes outbox rows and runs retries.  
5. **Kafka** is the system-to-system durable stream — **build for local proof in P4**; production deploy is a separate truthful claim.  
6. Domain code publishes only through transport-neutral `OpalCore.Events.Publisher` into a **transactional outbox**.

## Current path (today at P4.0)

```text
domain transaction
  +--> PostgreSQL authority
  +--> event_outbox row
            |
            v
     Oban (events queue)
            |
            v
     LocalAdapter (PubSub + structured log)
```

## P4 target path

```text
domain transaction
  +--> PostgreSQL authority
  +--> event_outbox row
            |
            v
     Oban Outbox Relay
        +--> LocalAdapter (Phoenix immediacy)
        +--> KafkaAdapter (durable fanout) when OPAL_KAFKA_ENABLED
            |
            v
     consumers: Decision Intelligence, learning, projections, …
```

**Hybrid latency:** Immediate user decisions may run synchronously; world changes flow Outbox→Kafka→recompute. Kafka must not make interactive taps feel slow.

## Activation criteria (satisfied for P4 local)

Founder P4 addendum authorizes implementation because Decision Intelligence creates multi-consumer durable consequences (recompute, learning, Activity, providers, evaluation).

## Non-goals

- Kafka is **not** the database  
- Kafka is **not** the client realtime transport  
- No user-visible Kafka terminology  
- No raw private messages, contacts, phones, precise locations, credentials in general topics  
- No fake “production deployed” from docker-compose proof

## Partition keys

Prefer aggregate id (`decision_id`, `graph_id`, `journey_id`, relationship id). Topic families documented in `P4_EVENT_CONTRACT.md` (publish proven P4.1a; recomposition consume P4.5).

## Existing code

- `OpalCore.Events.EventOutbox`  
- `OpalCore.Events.Publisher`  
- `OpalCore.Events.Workers.PublishOutboxWorker`  
- `OpalCore.Events.Adapters.LocalAdapter`  
- `OpalCore.Events.Adapters.KafkaAdapter` (brod producer — local GREEN P4.1a; production deploy separate)  
- `OpalCore.Events.Consumers.DecisionRecompositionConsumer` (P4.5; flagged)
