# Domain event contracts (SF18 foundation)

## Envelope fields

| Field | Required | Notes |
|-------|----------|-------|
| event_id | yes | Unique, stable for idempotency |
| event_type | yes | Dotted domain verb |
| event_version | yes | Integer starting at 1 |
| occurred_at | yes | Domain time |
| recorded_at | yes | Write time |
| producer | yes | `opal_core` |
| aggregate_type / aggregate_id | preferred | Authority aggregate |
| partition_key | yes | Ordering within family |
| topic_family | yes | Kafka family name |
| privacy_class | yes | See below |
| purpose | preferred | Why emitted |
| correlation_id / causation_id | optional | Trace |
| payload | yes | Minimal IDs/state only |

## Privacy classes

- `public`
- `internal`
- `shared_authorized`
- `private_authorized`
- `restricted`
- `prohibited_in_stream` (must never leave private store)

## Forbidden in general-purpose topics

Raw private messages, contact lists, phone numbers, precise locations, gift surprises, private guidance, session/payment credentials, youth private content, unapproved personal nuance.

## SF18 event types

| event_type | topic_family | partition_key | when |
|------------|--------------|---------------|------|
| invitation.created | opal.invitation.events | invitation_id | invite persisted |
| invitation.accepted | opal.invitation.events | invitation_id | accept |
| relationship.accepted | opal.relationship.events | relationship_id | establishment |
| conversation.opened | opal.conversation.events | conversation_id | first conversation after accept |

Future (not all emitted yet): `contact.selection.completed`, `invitation.shared`, `conversation.message.accepted`, `journey.*`, `reservation.*`, `payment.*`, `avp2.*`.
