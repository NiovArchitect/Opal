# ADR-0009: Mobile local message persistence uses SQLite schema

**Status:** Accepted  
**Date:** 2026-07-31

## Context

Slice 2 initially used AsyncStorage for messages. Opal requires durable conversation continuity and an offline outbound queue. AsyncStorage is not a structured message database.

## Decision

- Message durability and outbound queue use a **SQLite schema** (`messages`, `outbound_queue`, `meta`) via `MessageRepository`.
- Driver abstraction (`SqlDriver`) allows:
  - in-memory driver for unit tests and pure Node validation;
  - `expo-sqlite` for device runtime (wired at native bootstrap).
- Synthetic development identity uses **expo-secure-store** (with memory fallback in Node tests).

## Consequences

- Durable reconciliation and ordering tests are deterministic without AsyncStorage.
- Device runtime must open `expo-sqlite` and inject the driver; shell currently uses MemorySqlDriver until native bootstrap (schema and repository API are final).
