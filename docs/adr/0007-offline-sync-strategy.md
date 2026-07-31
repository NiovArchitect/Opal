# ADR-0007: Offline Sync Strategy

**Status:** Accepted (provisional)  
**Date:** 2026-07-31

## Context

Messenger UX requires offline compose and history. Full CRDT stack is heavy for MVP.

## Decision

**Append-mostly sync:**

- Client SQLite + outbound op queue  
- Server assigns `server_seq` per conversation  
- Idempotency via `client_msg_id`  
- Catch-up by sequence cursors  
- Media upload decoupled from message accept when needed  

CRDTs / complex merge limited to future editable artifacts.

## Consequences

- Matches chat semantics well.  
- Simpler tests and mental model.  
- Edits/reactions need explicit later design.

## Alternatives considered

- Full local-first CRDT framework: deferred.  
- Server-only online client: rejected for product quality.
