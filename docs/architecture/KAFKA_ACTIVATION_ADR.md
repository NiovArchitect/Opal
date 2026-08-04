# ADR: Kafka as durable intersystem event backbone

## Status

Accepted direction. **Not operationally deployed.**

## Context

Opal needs a durable event backbone for independent consumers (providers, AVP², Foundation, payments, analytics, projection rebuild) without replacing Elixir authority, Phoenix realtime, PostgreSQL transactions, or Oban jobs.

## Decision

1. **Elixir/BEAM** remains social authority and concurrent coordination.
2. **Phoenix Channels / PubSub** remain the user-facing realtime edge.
3. **PostgreSQL** remains authoritative transactional state.
4. **Oban** publishes outbox rows and runs retries.
5. **Kafka** is the future system-to-system durable stream, activated only when criteria below are met.
6. Domain code publishes only through a **transport-neutral** `OpalCore.Events.Publisher` into a **transactional outbox**.

## Current path

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

## Future path

```text
event_outbox --> Kafka publisher --> topics/consumer groups
```

Business code must not branch on transport.

## Activation criteria (any one)

- Two or more independent backend consumers need the same durable events
- AVP² exchanges events with external company agents
- Reservation/payment durable reconciliation
- Sustained external feed ingestion
- Projection rebuild/replay required
- Outage must not drop multi-consumer events
- Foundation and Opal independently consume event history
- Outbox fan-out volume exceeds simpler architecture comfort

## Non-goals until activation

- No Kafka broker dependency in production
- No user-visible Kafka terminology
- No raw private messages, contacts, phones, locations, credentials in general topics

## Partition keys

| Family | Key |
|--------|-----|
| conversation | conversation_id |
| journey | journey_id |
| relationship | relationship_id |
| reservation | reservation_id |
| invitation | invitation_id |

## Topic families (planned)

`opal.identity.events`, `opal.relationship.events`, `opal.conversation.events`, `opal.journey.events`, `opal.experience.events`, `opal.memory.events`, `opal.invitation.events`, `opal.safety.events`, `opal.provider.requests`, `opal.provider.results`, `opal.reservation.events`, `opal.payment.events`, `opal.avp2.authorization.events`, `opal.audit.events`
