# SF17 Realtime channel contract map

## Socket

| Item | Value |
|------|--------|
| Path | `/socket` (websocket) |
| Module | `OpalCoreWeb.UserSocket` |
| Auth (hosted) | `socket_ticket` param (preferred) |
| Auth (legacy test) | `session_token` |
| Required params | `device_id`, `app_state` (`foreground`\|`background`), `client_version` |
| Ticket lifetime | 120 seconds (`ProductSession.socket_ticket_max_age_sec/0`) |
| Ticket mint | `POST /api/v1/product/socket-ticket` (product auth) |

## Channel

| Item | Value |
|------|--------|
| Topic | `conversation:{conversation_id}` |
| Join auth | Membership via `ConversationMember` |
| Join deny | `%{reason: "unauthorized"}` (no existence leak) |

## Events (product messaging)

| Event | Direction | Notes |
|-------|-----------|--------|
| `message:new` | Server → clients | Authoritative message payload |
| `message:accepted` | Server → sender (channel send) | Channel push path |
| `message:failed` | Server → sender | Channel push path |
| `history:sync` | Client push | `{after_server_seq}` → messages after seq |
| `message:send` | Client push | Optional alternate send path |
| `presence:state` / `presence:diff` | Server | Presence (not required for SF17 gate) |

## Message contract

```json
{
  "id": "uuid",
  "client_message_id": "string",
  "conversation_id": "uuid",
  "sender_user_id": "uuid",
  "body": "string",
  "server_seq": 1,
  "created_at": "ISO8601",
  "message_type": "text"
}
```

## Send strategy (SF17)

**Option A:** HTTP `POST /api/v1/product/conversations/:id/messages` is primary.

On create (`origin == :created`), server broadcasts `message:new` on `conversation:{id}`.

Clients:

1. Send via HTTP.
2. Insert from HTTP response (dedupe by `id` / `client_message_id`).
3. Receive peer messages via Channel `message:new`.
4. On reconnect: re-ticket → reconnect → rejoin → `history:sync` after max `server_seq`.
EOF