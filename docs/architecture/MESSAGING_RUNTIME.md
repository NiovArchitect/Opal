# Messaging Runtime

**Status:** Phase 0  
**Owner:** Elixir `Opal_core`

---

## Responsibilities

- Authenticated realtime connections (Phoenix Channels)  
- Message ingest, validation, persistence  
- Ordering guarantees within a conversation  
- Fan-out to participant devices  
- Delivery and acknowledgement  
- Presence  
- Offline client reconciliation hooks  
- Triggering (not performing) AI work  

---

## Message model (conceptual)

```text
Message {
  id              # ULID/UUID, client may propose with server authority
  conversation_id
  sender_id
  client_id       # device/session
  client_msg_id   # idempotency for retries
  sent_at         # client clock (advisory)
  server_seq      # monotonic per conversation (authoritative order)
  server_time
  type            # text | voice | system | ...
  body            # ciphertext or plaintext per encryption phase
  media_refs[]
  reply_to?
  status_timeline # accepted | delivered | read (policy-dependent)
}
```

### Ordering

- **Authoritative order:** `server_seq` assigned by ConversationServer or single-writer path per conversation.  
- Clients display by `server_seq`; optimistic UI may show pending with local id until ack.  
- Duplicate `client_msg_id` → return original server message (idempotent).

---

## Channel topics (provisional)

| Topic | Purpose |
|-------|---------|
| `user:<user_id>` | Personal events, receipts, invites |
| `conversation:<id>` | Message stream for members |
| `device:<session_id>` | Optional device-specific |

Authorization: join only if membership/session valid.

---

## Delivery path

```text
Client insert (optimistic)
  → channel push "msg:send"
  → authz + rate limit
  → ConversationServer handle_send
  → persist message + assign server_seq
  → PubSub broadcast to conversation
  → ack to sender with server ids
  → optional AI enqueue (non-blocking)
```

---

## Presence

- Phoenix Presence on user or conversation topics.  
- Track: user_id, device_id, status, last_online.  
- Product policy for last-seen visibility is open (G013).

---

## Multi-device

- Each device: session credential.  
- All devices of a user receive conversation events if authorized.  
- Read state sync: provisional server-side per user-conversation cursor.  
- E2EE multi-device keys: future (G023).

---

## Failure modes

| Failure | Behavior |
|---------|----------|
| Client offline | Queue locally; sync on reconnect |
| Duplicate send | Idempotent by client_msg_id |
| ConversationServer crash | Restart; reload from DB; no message loss if persisted first |
| Slow AI | Messages unaffected |
| Reconnect storm | Rate limit joins; backoff client |

---

## Group messages

- Same runtime with N members; fan-out cost grows.  
- MVP focuses on 1:1; design membership model to extend.

---

## System messages

- Commitments confirmed, translations attached, etc. may appear as **annotations** or side artifacts rather than fake human messages—UX choice pending. Prefer not polluting chat with robot spam.
