# ADR-0006: Elixir ↔ Python Transport

**Status:** Accepted (provisional)  
**Date:** 2026-07-31

## Context

Need reliable, observable, idempotent AI job execution without blocking Channels.

## Decision

**Phase 1 transport:**

1. Elixir enqueues durable jobs (**Oban** preferred).  
2. Job worker performs **HTTP** request to Python service (JSON, schema versioned).  
3. Optional later: gRPC for streaming/performance.  
4. Circuit breakers and retries in Elixir.  
5. Consent proof attached to each job.

## Consequences

- Simple local dev (docker compose: core + ai + db).  
- HTTP latency overhead acceptable for AI jobs.  
- Streaming drafts may need chunked HTTP or SSE/gRPC upgrade.

## Alternatives considered

- Python pulls from shared Redis queue only: possible; Oban still preferred for Elixir-side durability/visibility.  
- Erlang ports to local Python: poor multi-host story.  
- Message bus (NATS/Kafka) day one: deferred until scale.
