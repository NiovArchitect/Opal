# Completion authority — Phase 3

## Rule

**Elixir is authoritative for completion.**  
Time alone must not complete an experience.

## Accepted evidence class

| Class | Result |
|-------|--------|
| `explicit_confirmation` | Completes (member only) |
| `time_elapsed` | Rejected `:time_alone_cannot_complete` |
| `time_alone` | Rejected `:time_alone_cannot_complete` |
| other | Rejected `:invalid_evidence_class` |

## API

`Outcome.complete/1` and `POST .../opportunity/complete`

## Guarantees

| Guarantee | Status |
|-----------|--------|
| Explicit completion creates durable row | PASS (test) |
| Idempotent by opportunity_id and idempotency_key | PASS |
| Time-only path hard-rejected | PASS |
| Outsider denied | PASS `:not_a_member` |
| Shared summary never includes budget language | PASS |
| Continuity label defaults to Happened | PASS |

## Python boundary

Python may propose “likely completed” signals. Python **cannot** write `dsi_experience_completions` or flip opportunity status to completed.
