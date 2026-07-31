# BEAM + AI Concurrency Model

**Status:** Phase 0 recommendation  
**Hard rule:** Heavy model inference never blocks latency-sensitive BEAM schedulers.

---

## Goals

1. Use OTP supervision, isolation, and backpressure for **coordination**.  
2. Keep message path fast when AI is slow or down.  
3. Make AI work **durable, idempotent, observable**.  
4. Preserve per-conversation and per-user fault isolation.

---

## Candidate process topology

```text
Application Supervisor
├── Endpoint / Channel sockets
├── Presence
├── Registry (conversation, user, session keys)
├── DynamicSupervisor — ConversationRuntime
│     └── ConversationServer (GenServer)
│           - ordering / fan-out coordination
│           - projects events
├── DynamicSupervisor — UserSession (optional)
├── AI.Orchestrator
│     ├── ConsentGate
│     ├── ContextSelector (bounded)
│     ├── JobDispatcher (Oban producer)
│     └── CircuitBreakers (per provider)
├── Oban (durable jobs)
├── PubSub
└── Telephony.Supervisor (later)
```

### Per conversation

- One logical **ConversationServer** (or small process set) for active conversations.  
- Idle conversations may hibernate or stop; state reloads from DB.  
- AI jobs reference `conversation_id` + `message_id` + `idempotency_key`.

### Per user session

- Channel process already represents a socket.  
- Device session record in DB for multi-device.  
- Presence tracks online devices.

---

## AI job lifecycle

```text
Event (message created, user request, schedule tick)
  → ConsentGate (Elixir)
  → ContextSelector (Elixir; bounded message window / ids only)
  → Enqueue Oban job (durable)
  → HTTP/gRPC to Python worker
  → Schema-validate result
  → Persist AI artifact (suggestion / transcript) if allowed
  → Notify interested sockets via PubSub
  → On failure: retry policy → dead letter → user-visible soft fail
```

### Principles

- **Messaging path must not await AI** unless the user action is explicitly AI-bound (e.g., “Translate now”).  
- Background insights are best-effort.  
- User-requested AI actions may show in-thread progress states—not spinners forever.

---

## Backpressure

| Mechanism | Use |
|-----------|-----|
| Oban queue concurrency limits | Global/provider caps |
| Per-user rate limits | Abuse / cost control |
| Per-conversation inflight AI cap | Avoid stampede |
| Circuit breakers | Provider outages |
| Mailbox metrics | Detect ConversationServer overload |
| Broadway/GenStage | Only if proven need for streaming ingest |

Start simple: **Oban + explicit limits**. Introduce Broadway when event volume demands it.

---

## What must not run on normal schedulers

- Large model inference  
- Long blocking HTTP without Task isolation  
- CPU-heavy audio decoding  
- Unbounded JSON embedding of entire histories  

Use `Task.Supervisor` for short async; Oban for durable; Python for heavy work.

---

## Idempotency and recovery

- Every AI job: `idempotency_key` (e.g., hash of type + subject ids + purpose).  
- Python workers must be safe to retry.  
- BEAM process crash: job remains in Oban; ConversationServer restarts clean.  
- Poison messages → dead letter table + alert.

---

## Streaming

- Prefer chunked response for drafting/translation where UX needs it.  
- Transport ADR may start with request/response; add streaming in v2.  
- Stream tokens are **not** messages until user accepts/sends.

---

## Observability hooks

- Job latency histograms by type  
- Queue depth  
- Consent denials  
- Provider error rates  
- Conversation process message queue length  

See OBSERVABILITY.md.
