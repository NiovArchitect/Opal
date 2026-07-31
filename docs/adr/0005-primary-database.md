# ADR-0005: Primary Database

**Status:** Accepted (provisional)  
**Date:** 2026-07-31

## Context

Roadmap mentioned PostgreSQL or MongoDB. Later docs mentioned ScyllaDB for scale. MVP needs relational integrity for users, memberships, consent, jobs, and sequences.

## Decision

**PostgreSQL** is the provisional primary authoritative store via Ecto.

- Strong consistency for conversation membership, `server_seq`, consent.  
- JSONB for flexible AI artifacts where appropriate.  
- Object storage (S3-compatible) later for media blobs.  
- Vector/index stores may sit beside Postgres for embeddings (non-authoritative).

ScyllaDB/Cassandra remain **future options** for massive write fan-out if metrics demand—not default.

## Consequences

- Familiar ops; excellent Elixir support.  
- Must design for scale early (seq allocation, partitioning strategy later).  
- Revisit if write path saturates.

## Alternatives considered

- MongoDB primary: weaker relational constraints for consent/membership.  
- ScyllaDB primary now: operational complexity without proven need.
