# CHANNEL_CONTRACT — Paste B BroadcastChoreography

**Branch:** `muse/packet-b-batch-2`  
**Module:** `OpalCore.Intelligence.BroadcastChoreography`

## Audience map

| ActionIntent type | Topic | Event name | Cross-account? |
|---|---|---|---|
| `conflict_alert` | `conversation:<conversation_id>` (fallback plan_id) | `intelligence:conflict_alert` | Shared conversation members only |
| `plan_update_suggestion` | `conversation:<conversation_id>` | `intelligence:plan_update_suggestion` | Shared conversation members only |
| `nudge` | `user:<account_id>` | `intelligence:nudge` | **NEVER** — private |
| `presence_nudge` | `user:<account_id>` | `intelligence:presence_nudge` | **NEVER** — private |
| `commitment_reminder` | `user:<account_id>` | `intelligence:commitment_reminder` | **NEVER** — private |

## Payload shape (IDs + display summary only)

```json
{
  "schema_version": 1,
  "event_id": "<uuid>",
  "intent_type": "nudge|presence_nudge|conflict_alert|…",
  "account_id": "<uuid>",
  "ref_ids": ["…"],
  "reason": "short reason code/text",
  "priority": 50,
  "summary": "display-ready draft",
  "conversation_id": "<uuid|null>",
  "plan_id": "<uuid|null>",
  "person_id": "<uuid|null>"
}
```

**Forbidden in payloads:** raw memory rows, other accounts' private commitments, precise location, phones, tokens.

## Latency

BroadcastChoreography is in-process `Endpoint.broadcast` — p95 target **< 3s** (typically < 50ms). Durable fanout still goes through `event_outbox` → `PublishOutboxWorker` for system consumers.

## Presence

- Joins may emit `presence_nudge` via `PresenceAware` → private `user:<account_id>`.
- Leaves **never** nudge.

## Live transcription

- Caller-only push via `LiveTranscriptionConsumer` → `DeliverPushWorker` for the caller.
- Gated by `DEEPGRAM_API_KEY` + `AssistConsent`.
