# System Context

**Status:** Phase 0 architecture recommendation  
**Repo shape:** monorepo (ADR-0001)

---

## Context diagram (logical)

```text
┌─────────────────────────────────────────────────────────────┐
│                     Mobile Clients (iOS/Android)              │
│              React Native + Expo + TypeScript                 │
│         SQLite · secure storage · offline queue · push        │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS + WSS (Phoenix Channels)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Opal Core (Elixir/OTP)                     │
│  Auth · Sessions · Channels · Presence · Messaging · Consent  │
│  Conversation processes · Delivery · Orchestration · Oban     │
│  Relationship event streams · Rate limit · Fan-out            │
└───────────────┬─────────────────────────────┬───────────────┘
                │                             │
                │ SQL                         │ Job RPC (HTTP/gRPC)
                ▼                             ▼
┌───────────────────────────┐   ┌─────────────────────────────────┐
│  Authoritative data store │   │  Opal AI (Python workers)         │
│  PostgreSQL (provisional) │   │  STT · Translation · Embeddings   │
│  (+ object store media)   │   │  Understanding · Draft · Safety   │
└───────────────────────────┘   └─────────────────────────────────┘
```

---

## Authority boundaries

| Domain | Source of truth |
|--------|-----------------|
| User identity, sessions, devices | Elixir + DB |
| Message order, delivery, presence | Elixir (BEAM processes + DB/event log) |
| Consent and permissions | Elixir |
| Commitments (confirmed) | Elixir |
| Conversation membership | Elixir |
| AI model outputs (suggestions) | Python (ephemeral until accepted into Elixir state) |
| Embeddings / vector index | Python-managed store (non-authoritative for chat) |
| Local UI cache | Mobile SQLite (non-authoritative) |

---

## Monorepo layout (target)

```text
apps/
  Opal_mobile/     # RN Expo client
  Opal_core/       # Phoenix/Elixir
services/
  Opal_ai/         # Python AI workers
packages/
  contracts/       # JSON Schema / OpenAPI / shared types
  design_tokens/   # later
docs/              # this tree
infra/
  local/ ci/ deployment/
tests/
  journeys/ contracts/ load/ safety/ privacy/
```

Do not scaffold full apps until ADRs reviewed; skeleton dirs may exist empty.

---

## External systems (future; no paid activation yet)

- SMS / phone verify provider  
- Push (APNs/FCM)  
- Object storage for media  
- Optional model providers (LLM, STT, TTS, translation)  
- Observability backend  

All require founder approval before production use or spend.

---

## Trust zones

1. **Device** — user secrets, local DB, biometric unlock (later).  
2. **Edge** — TLS termination, API gateway (later).  
3. **Core BEAM cluster** — messaging authority.  
4. **AI workers** — untrusted for authority; trusted for compute under policy.  
5. **Third-party model APIs** — least privilege, DPA, no training where possible.

---

## Design constraints from product truth

- No Node.js orchestration core.  
- No Python ownership of presence/order/consent.  
- Conversation-primary UX; AI contextual.  
- Privacy and consent cannot be deferred in design (implementation can phase E2EE).  
