# ADR-0001: Monorepo for Opal

**Status:** Accepted  
**Date:** 2026-07-31

## Context

Older docs suggested separate frontend and backend repositories. Founder direction prefers one clean repository named Opal for coordinated work by Grok, Agent Zero, and agency agents, with shared contracts between Elixir, Python, and mobile.

## Decision

Use a **single private monorepo** `NiovArchitect/Opal` with:

- `apps/Opal_core` (Elixir)
- `apps/Opal_mobile` (RN Expo)
- `services/Opal_ai` (Python)
- `packages/contracts`
- `docs/`, `tests/`, `infra/`

## Consequences

- Pros: atomic cross-layer changes; shared schema versions; simpler agent coordination.  
- Cons: CI complexity grows; need clear ownership boundaries.  
- Non-goal: mono-deployment; services still deploy independently later.

## Alternatives considered

- Multi-repo (frontend/backend/ai): rejected for Phase 0–1 velocity and contract drift risk.
