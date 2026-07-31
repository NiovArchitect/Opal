# Offline Sync

**Status:** Phase 0 recommendation  
**Related ADR:** 0007

---

## Goals

1. Compose and send when offline.  
2. Preserve history on device.  
3. Reconnect without duplicates or reordering chaos.  
4. AI features degrade gracefully offline (queue or disable with clear UX).

---

## Client responsibilities

- SQLite store of conversations, messages, pending ops.  
- Outbound mutation queue: `send_message`, `ack_read`, etc.  
- Optimistic UI for pending messages.  
- Conflict policy for rare concurrent edits (MVP: messages are append-mostly).

---

## Sync protocol (provisional)

### Bootstrap / catch-up

```text
Client: last_server_seq per conversation + user event cursor
Server: return messages with server_seq > cursor (paged)
Client: apply in seq order; reconcile pending by client_msg_id
```

### Send while offline

```text
1. Insert local message pending
2. Enqueue op with client_msg_id
3. On reconnect, flush queue FIFO per conversation
4. Server idempotent upsert
5. Replace local id mapping with server ids + server_seq
```

---

## Conflict resolution

| Case | Policy |
|------|--------|
| Duplicate client_msg_id | Server returns existing |
| Two devices send near-simultaneously | Both accepted; order by server_seq |
| Edit message (if allowed later) | CRDT or last-write with vector clock — POST-MVP |
| Delete | Tombstone with server_seq |
| AI suggestion offline | Generate only online; or on-device stub later |

MVP is **append-mostly messaging**, which simplifies sync dramatically.

---

## Media

- Voice notes: store local file; upload when online; message may reference local URI until remote ref ready.  
- Server accepts message with media pending upload state if needed.

---

## Multi-device

- Each device independent cache.  
- Server is authority for history.  
- Read cursors: server-side merge later; MVP may be last-writer per device with eventual user-level read.

---

## Testing requirements

- Offline send → reconnect  
- Dual-device concurrent sends  
- Duplicate delivery  
- Long partition  
- Partial upload failure  
