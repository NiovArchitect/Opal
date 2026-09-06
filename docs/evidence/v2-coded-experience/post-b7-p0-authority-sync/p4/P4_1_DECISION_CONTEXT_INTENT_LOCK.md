# P4.1 DecisionContext Intent Lock

**Starting HEAD:** `c032ad9`  
**Branch:** `build/v2-coded-experience-closure`  
**P4.0 read:** contracts in `p4/` + Kafka ADR + intent lock  

```
P4_1_AUTHORIZED = YES
P4_2+ = NOT THIS PASS
P2_FROZEN = YES · P3_FROZEN = YES
KAFKA_IS_SOURCE_OF_TRUTH = NO
POSTGRES_IS_SOURCE_OF_TRUTH = YES
```

## Inventory

See `P4_1_EXISTING_OWNER_INVENTORY.md`.

## Database changes

1. `decision_contexts` — authoritative DecisionContext row  
2. `decision_evidences` — evidence envelopes tied to decision + revision  
3. `decision_mutation_keys` — idempotency (actor + key → decision_id/revision)

## Elixir modules

- `OpalCore.DecisionIntelligence` — context API  
- `OpalCore.DecisionIntelligence.DecisionContext`  
- `OpalCore.DecisionIntelligence.DecisionEvidence`  
- `OpalCore.DecisionIntelligence.MutationKey`  
- Extend `DomainEvent`, `Publisher`, `PublishOutboxWorker`, `KafkaAdapter`

## Ownership

Elixir + Postgres. Python may later score. Kafka transports events. Phoenix syncs later.

## Revision / concurrency / idempotency

- Monotonic `revision` starting at 1  
- Optimistic concurrency via `expected_revision` → error `:stale_decision_revision`  
- No-op corrections: no revision++, no evidence dup, no outbox  
- Idempotency key unique per actor: same key → same result  

## Privacy

Evidence `privacy_class`: `private_user` | `relationship` | `shared_group` | `inferred` | `external_verified`  
API projection strips others’ private evidence.

## Invalidation

JSON `invalidation_conditions` with validated `type` enum + versioned payload. Status: `active` | `invalidated` | `settled`.

## Graph/Journey

Nullable `graph_id`, `journey_id` references only — no shadow Graph.

## Outbox / Kafka (P4.1)

- Same DB transaction: context write + `event_outbox` insert  
- Events: `decision.created` | `decision.revised` | `decision.invalidated` (P4.0 vocabulary)  
- Topic family: `opal.decision.events` · partition_key: `decision_id`  
- Payload minimized (ids, revision, scope, changed fields, privacy) — **no private evidence dump**  
- Local Redpanda in `infra/local/docker-compose.yml`  
- `KafkaAdapter` publishes when `OPAL_KAFKA_ENABLED`  
- Worker: LocalAdapter always; Kafka when enabled  
- Full DI consumer = **NOT** P4.1  

## API / domain

Domain functions: `create_context/2`, `get_context/2`, `apply_correction/3`, `invalidate/3`, `settle/3`  
Optional thin product API only if non-disturbing; tests may call domain directly.

## Rollback

Migration `change/0` reversible. No data backfill required.

## Fixture compatibility

Founder/UI fixtures unchanged. Global Opal UI **not** replaced in P4.1.

## Proofs

Persistence · revision · stale · multi-device · noop · privacy · idempotency · outbox atomicity · Kafka publish foundation (local broker).

## Non-goals

No P4.2 UI · no scoring · no Python DI · no provider orchestration · no 1046:2 · no P2/P3 reopen · no fake prod Kafka claim.
