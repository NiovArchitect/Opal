# CHANNEL_CONTRACT — BroadcastChoreography (+ Paste F extensions)

**Branch:** `muse/packet-b-batch-2`  
**Module:** `OpalCore.Intelligence.BroadcastChoreography`

## Audience map

| ActionIntent / named event | Topic | Event name | Cross-account? |
|---|---|---|---|
| `conflict_alert` | `conversation:<conversation_id>` (fallback plan_id) | `intelligence:conflict_alert` | Shared conversation members only |
| `plan_update_suggestion` | `conversation:<conversation_id>` | `intelligence:plan_update_suggestion` | Shared conversation members only |
| `nudge` | `user:<account_id>` | `intelligence:nudge` | **NEVER** — private |
| `presence_nudge` | `user:<account_id>` | `intelligence:presence_nudge` | **NEVER** — private |
| `commitment_reminder` | `user:<account_id>` | `intelligence:commitment_reminder` | **NEVER** — private |
| **Paste F** `group_blocked` | `user:<account_id>` | `intelligence:group_blocked` | **Owner only** (mediation is owner Center — Paste C; not group fanout) |
| **Paste F** `group_consensus` | `user:<account_id>` | `intelligence:group_consensus` | **Owner only** |
| **Paste F** `weekly_briefing` | `user:<account_id>` | `intelligence:weekly_briefing` | **Owner only** |
| **Paste F** `temporal_anchor` | `user:<account_id>` | `intelligence:temporal_anchor` | **Owner only** |

## Payload shape (IDs + display summary only)

```json
{
  "schema_version": 1,
  "event_id": "<uuid>",
  "intent_type": "nudge|presence_nudge|conflict_alert|group_blocked|…",
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

## Paste F first-class events

Emitted via `BroadcastChoreography.broadcast_named/3` (owner `user:` topic).

| Event | When | Extra payload keys |
|---|---|---|
| `intelligence:group_blocked` | Mediation drafted / sent | `decision_id`, `topic`, `card_state` |
| `intelligence:group_consensus` | Consensus reached lock-in | `decision_id`, `winning_proposal` (optional) |
| `intelligence:weekly_briefing` | Weekly briefing generated | `briefing_id`, `week_start` |
| `intelligence:temporal_anchor` | Temporal reminder / plan confirm | `anchor_id`, `lifecycle`, `plan_id` |

**FE one-release fallback:** handlers still accept interim `intelligence:nudge` + `inbox:attention` for mediation/briefing/temporal until founder validates `choreography_events` real path; then remove fallback.

## Latency

BroadcastChoreography is in-process `Endpoint.broadcast` — p95 target **< 3s** (typically < 50ms). Durable fanout still goes through `event_outbox` → `PublishOutboxWorker` for system consumers.

## Presence

- Joins may emit `presence_nudge` via `PresenceAware` → private `user:<account_id>`.
- Leaves **never** nudge.

## Live transcription

- Caller-only push via `LiveTranscriptionConsumer` → `DeliverPushWorker` for the caller.
- Gated by `DEEPGRAM_API_KEY` + `AssistConsent`.
