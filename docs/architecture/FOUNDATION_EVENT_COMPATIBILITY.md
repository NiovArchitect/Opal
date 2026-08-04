# Opal ↔ Foundation event envelope compatibility (v1)

## Scope

Development bridge only. Production Opal does not send live traffic to the foundation.

## Enablement

| Condition | Behavior |
|-----------|----------|
| `OPAL_FOUNDATION_INGRESS_URL` unset or empty | Adapter **disabled** (default) |
| URL set (e.g. `http://127.0.0.1:4100`) | Adapter may POST to `{url}/v1/events` |
| Hosted Render | Must **never** set this variable |

LocalAdapter / PubSub remains the default path. Domain transactions never call foundation inline; Oban outbox worker may optionally bridge after the authoritative write.

## Allowlisted event types (code-enforced)

Only:

* `invitation.accepted`
* `relationship.accepted`

All other types are refused before HTTP (`event_type_not_allowlisted`).

## Field matrix

| Field | Opal DomainEvent | Foundation Phase 1 | Required | Notes |
|-------|------------------|--------------------|----------|-------|
| event_id | string | string | yes | Idempotency key |
| event_type | string | string | yes | Allowlist above |
| event_version | integer | integer | yes | Start at 1 |
| occurred_at | ISO-8601 string | string | yes | Domain time |
| recorded_at | ISO-8601 string | string | yes | Write time |
| producer | `"opal_core"` | string | yes | Dev may use opal_core or opal_core_fixture |
| aggregate_type | string/null | optional | no | |
| aggregate_id | string/null | optional | no | |
| sequence | integer/null | optional | no | |
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

phone, contact names, message bodies, share tokens, session tokens, locations, youth private content, payment credentials, private guidance, gift_surprise, etc.

Adapter rejects these before HTTP (`permanent_rejection`).

## HTTP status classification (Opal adapter)

| Class | Codes / transport | Outbox effect (when bridge enabled) |
|-------|-------------------|-------------------------------------|
| success | 200, 202 | mark published |
| permanent | 400, 401, 403, 404, 409, 422, other 4xx except 408/429 | mark failed + dead (no infinite retry) |
| retryable | 408, 429, 5xx, timeout, conn refused, DNS, closed | mark failed; Oban retries (max_attempts 5) |

Foundation Phase 2 ingress: **202** accept, **422** privacy/schema, **503** not ready, **400** invalid JSON.

## Timeouts

* connect: 2_000 ms  
* receive: 5_000 ms  

## Safe logging

Logs: event_id, event_type, HTTP status, duration_ms, error class.  
Does **not** log: payload, phones, tokens, contact names, full response bodies.

## Export task (`mix opal.export_outbox`)

Requires:

* `OPAL_FOUNDATION_INGRESS_URL` set  
* `--confirm-development-bridge`  
* optional `--dry-run` (no write, no HTTP, no state change)  
* `--event-type` restricted to allowlist  
* `--limit` default 25, max 100  

Does not POST to foundation; writes a file for the foundation bridge script.

## Delivery semantics

At-least-once from Opal outbox → foundation. Exactly-once is **not** claimed. Correctness = idempotent `event_id` on foundation.

## Incompatibilities

| Issue | Strategy |
|-------|----------|
| Foundation Phase 1 rejects unknown event_type | Opal allowlist matches |
| Permanent 422 from foundation | Opal marks outbox dead |
| Bridge disabled | LocalAdapter only; foundation path is no-op success for worker |
