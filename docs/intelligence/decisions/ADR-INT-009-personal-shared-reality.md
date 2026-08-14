# ADR-INT-009 — Personal and Shared Reality cardinality

**Status:** Accepted (conceptual extension)  
**Date:** 2026-08-13  
**Pass:** 10

## Context

Opal intelligence should not switch off when only one participant is present.  
Personal day-flow and shared plans are one abstraction: **Reality** with participant cardinality.

## Decision

- **1 participant** → Personal Reality (private orchestration, no fake social CTAs)
- **2+** → Shared Reality (existing path)
- Transitions: personal→shared (add person) and shared→personal (solo continuation) without restarting lineage when dimensions remain valid

Implementation: no rename of SharedReality modules required; cardinality and attention treat solo as valid. Full solo product surfaces remain incremental.

## Consequences

Enables leave-by, transition, and continuation for one human without becoming a todo/calendar clone.
Privacy: personal causes stay private; lock-screen copy later must minimize disclosure.
