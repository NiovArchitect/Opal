# ADR-0003: Python AI Services

**Status:** Accepted  
**Date:** 2026-07-31

## Context

Speech, translation, embeddings, and LLM tooling are mature in Python. Mixing inference into BEAM schedulers would harm latency and isolation.

## Decision

Implement AI as **`services/Opal_ai`** in Python:

- Receives bounded, versioned jobs from Elixir  
- Returns schema-validated structured results  
- Owns model/provider adapters and eval harnesses  
- Does **not** own messaging authority  

## Consequences

- Clear operational boundary; independent scaling.  
- Requires robust contracts and consent tokens.  
- Duplicate domain concepts must not drift (use packages/contracts).

## Alternatives considered

- Elixir-only AI via ports/NIFs: rejected for ecosystem and safety.  
- Node AI orchestrator: rejected.
