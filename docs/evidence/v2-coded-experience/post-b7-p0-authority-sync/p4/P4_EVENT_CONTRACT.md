# P4 Event Contract (transport-neutral)

**Checkpoint:** P4.0 · **Wire:** P4.1 writes · **Kafka publish proof:** P4.1a · **Recompose consume:** P4.5  
**Publisher:** `OpalCore.Events.Publisher` → Outbox → LocalAdapter + KafkaAdapter (when enabled)

## Envelope law

Use existing `DomainEvent` envelope. Payloads = **IDs + authority state**, not raw PII. Forbidden keys remain enforced.

## Decision topic family (add in P4.1/P4.4)

| event_type | topic_family (target) | Meaning |
|------------|----------------------|---------|
| `decision.created` | `opal.decision.events` | New DecisionContext |
| `decision.revised` | `opal.decision.events` | Revision bumped |
| `decision.recomputed` | `opal.decision.events` | Delta recompute result |
| `decision.accepted` | `opal.decision.events` | User accepted into Graph |
| `decision.rejected` | `opal.decision.events` | Explicit reject |
| `decision.invalidated` | `opal.decision.events` | Premise broken |
| `decision.noop` | `opal.decision.events` | Event checked; no material change (optional audit) |
| `decision.question_asked` | `opal.decision.events` | Medium — one necessary question presented |
| `decision.question_answered` | `opal.decision.events` | Medium — answer applied; same decision |
| `decision.question_superseded` | `opal.decision.events` | Medium — stale question after revision |
| `decision.tradeoff_presented` | `opal.decision.events` | Low — one real tradeoff presented |
| `decision.tradeoff_selected` | `opal.decision.events` | Low — authorized side selected; same decision |
| `decision.tradeoff_superseded` | `opal.decision.events` | Low — stale tradeoff after revision |

## Upstream events that may trigger recompute

| event_type | Typical invalidate dimensions |
|------------|-------------------------------|
| `availability.changed` | availability, time |
| `provider.reservation_failed` / `_confirmed` / `_requested` | provider, truth_state |
| `graph.context_changed` | graph_context, people |
| `journey.leave_time_changed` | journey, time, location |
| `relationship.preference_updated` | vibe, budget, soft prefs |
| `location.context_changed` | location (consent) |
| `conversation.commitment_detected` | time, people, intent (Elixir-validated) |

## Partition key

Prefer `decision_id` for decision stream; else aggregate id (graph_id, journey_id, relationship_id).

## Idempotency / ordering

- `event_id` unique (outbox constraint)  
- Consumers must be idempotent on `event_id`  
- Per-partition key ordering; cross-key best-effort  
- Stale revision updates must no-op if `decision_revision` ≤ current

## Hybrid path

| Path | Transport |
|------|-----------|
| User taps Nearby now / intent | Sync DecisionEngine OK; still Outbox on persist |
| World/provider/availability change | Outbox → Kafka → DI consumer → Phoenix **only if** UI consequence |

## Privacy classes

Reuse outbox: `public` · `internal` · `shared_authorized` · `private_authorized` · `restricted` · `prohibited_in_stream`
