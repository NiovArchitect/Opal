# Opal ↔ Foundation event envelope compatibility (v1)

## Scope

Development bridge only. Production Opal does not send live traffic to the foundation.

## Field matrix

| Field | Opal DomainEvent | Foundation Phase 1 | Required | Notes |
|-------|------------------|--------------------|----------|-------|
| event_id | string | string | yes | Idempotency key |
| event_type | string | string | yes | Phase 1 allowlist: invitation.accepted, relationship.accepted |
| event_version | integer | integer | yes | Start at 1 |
| occurred_at | ISO-8601 string | string | yes | Domain time |
| recorded_at | ISO-8601 string | string | yes | Write time |
| producer | `"opal_core"` | string | yes | Dev may use opal_core or opal_core_fixture |
| aggregate_type | string/null | optional | no | |
| aggregate_id | string/null | optional | no | |
| sequence | integer/null | optional | no | Foundation catalog may use aggregate_sequence later — map optionally |
| correlation_id | string/null | optional | no | |
| causation_id | string/null | optional | no | |
| tenant_scope | string default opal | optional | no | |
| relationship_scope | string/null | optional | no | |
| privacy_class | string | enum | yes | Must be streamable at foundation |
| purpose | string/null | optional | no | |
| trace_context | map | object | no | |
| topic_family | string | string | yes | Must match topic routing |
| partition_key | string | string | yes | Ordering key |
| payload | map | object | yes | IDs only |

## Privacy classes accepted by foundation stream

`public` | `internal` | `shared_authorized` | `restricted`

Opal currently emits `shared_authorized` for invitation/relationship events. Compatible.

## Forbidden payload keys (both sides)

phone, contact names, message bodies, share tokens, session tokens, locations, youth private content, payment credentials.

## Incompatibilities

| Issue | Strategy |
|-------|----------|
| Foundation Phase 1 rejects unknown event_type | Keep Opal SF18 allowlist alignment |
| `sequence` vs `aggregate_sequence` naming | Optional; do not rename Opal v1 |
| Permanent 422 from foundation | Opal marks outbox dead; do not infinite retry |

## Delivery semantics

At-least-once from Opal outbox → foundation. Exactly-once is **not** claimed. Correctness = idempotent `event_id` on foundation.
