# Lifecycle — Phase 3

## Extended durable lifecycle

| Stage | Owner | Notes |
|-------|-------|-------|
| detected | Phase 1/2 engine | Conversation forms dinner intent |
| eligible | Elixir | Collective fit + restraint |
| surfaced | Elixir | One conversation-native moment |
| private participation | Elixir | Per-user private states |
| shared readiness | Elixir | Shared-safe projection only |
| confirmed | Elixir (Phase 3) | Explicit synthetic confirmation |
| completed | Elixir | `dsi_experience_completions` row; opportunity `status=completed`, `journey_state=happened` |
| reflection eligible | Elixir | After completion |
| reflection surfaced or suppressed | Elixir | Low value / recent / force → silence |
| scoped learning accepted or rejected | Elixir | Correction suppresses group learning |
| archived or expired | TTL | Reflection 48h; learning 90d; stale decay 60d |

## User-facing continuity

Backend may store status tokens; product surfaces **Happened** (or Handled / Complete) — not raw lifecycle names.

## Proven

- Completion transitions opportunity to completed/happened
- Reflection requires completion (`:not_completed` otherwise)
- Suppressed reflection is quiet with no prompt/actions
- Learning rows keyed by participant set + experience type
