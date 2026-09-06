# P4.6 Idempotency Matrix

| Operation | Key | Duplicate effect |
|-----------|-----|------------------|
| create_context | mutation/idempotency where used | no double aggregate |
| resolve High/Med/Low | idempotency_key on resolve | same result revision |
| answer_question | idempotency | one answer |
| resolve_tradeoff | selection once open | one selection |
| recompose event | event_id in event_processing_records | one logical process |
| Outbox publish | event_id unique | one Kafka logical |

**Target:** canonical duplicates = 0 for DI path.
