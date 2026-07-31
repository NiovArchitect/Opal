# Build Slice 1

**Branch:** `build/slice-1-core-ai-contracts`  
**Phase 0 base:** `3e673db3ad767356378894921ae9abb50340f59b`  
**Objective:** Contracts + Elixir authority + Python worker + consent-gated round trip

## What this slice proves

```text
Message accept → ConsentGate → durable AI job (Oban)
  → Python ai_echo → schema validation → result store → PubSub
```

## Directory names (canonical)

```text
apps/opal_core/
apps/opal_mobile/   # reserved, empty for this slice
services/opal_ai/
packages/contracts/
```

## Executable capability

Only **`ai_echo`** is executable. It returns a deterministic normalized echo of bounded context. It is **not** relationship intelligence.

## Out of scope (enforced)

No SMS, mobile UI, STT, translation, voice clone, E2EE completion, production auth, Node.js backend, legacy imports.
