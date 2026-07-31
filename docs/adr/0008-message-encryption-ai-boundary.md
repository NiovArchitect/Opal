# ADR-0008: Message Encryption and AI Boundary

**Status:** Accepted (phased)  
**Date:** 2026-07-31

## Context

Intimate messaging wants E2EE; relationship AI may need content access. Claiming E2EE while server-reading all messages for AI is dishonest.

## Decision

**Phased honesty:**

1. **MVP:** TLS + at-rest encryption + strict authz. Privacy policy states when AI processes content. Per-feature/conversation consent.  
2. **Next:** maximize on-device AI paths for sensitive assists.  
3. **Later:** true E2EE for message bodies; server AI only with explicit unwrap session or client-side inference.

**Never:**

- Silent server analysis without consent  
- Marketing “E2EE” before it is real  
- Python workers holding long-term plaintext beyond job need  

## Consequences

- MVP ships without full E2EE (documented).  
- Architecture keeps door open for E2EE (client keys, sealed blobs).  
- Consent token required for AI jobs.

## Alternatives considered

- E2EE-only, no server AI: limits product center; possible future mode.  
- Always server-readable without framing: rejected.
