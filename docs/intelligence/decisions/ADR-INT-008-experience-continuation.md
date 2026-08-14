# ADR-INT-008 — Experience continuation (not “Extend the night” domain)

**Status:** Accepted  
**Date:** 2026-08-13  
**Pass:** 10

## Context

“Extend the night” is a **presentation phrase** for one daypart of a broader capability: continue the moment.

## Decision

Domain owner: `OpalCore.SocialFlow.ExperienceContinuation`.

- Stable verb: `continue`
- Surface still opens existing private `extend` sheet (`opens: "extend"`)
- Label derives from daypart / remote / solo
- Night is not required semantic state

## Consequences

Morning/afternoon/evening/remote/solo get contextual copy without new social engines.
Private selection law unchanged (selection ≠ send).
