# Kafka-ready foundation (not operational Kafka)

## Implemented

- Transactional outbox table `event_outbox`
- Versioned envelopes (`OpalCore.Events.DomainEvent`)
- Transport-neutral publisher (`OpalCore.Events.Publisher`)
- Oban queue `events` + `PublishOutboxWorker`
- LocalAdapter (PubSub + log)
- KafkaAdapter stub (`OPAL_KAFKA_ENABLED` off)
- SF18 domain events on invite create/accept and relationship/conversation open
- ADR + event contracts + privacy rules

## Not implemented / not deployed

- Kafka brokers
- Schema registry
- Multi-region consumers
- User-visible stream concepts

## Activation

See `docs/architecture/KAFKA_ACTIVATION_ADR.md`.
