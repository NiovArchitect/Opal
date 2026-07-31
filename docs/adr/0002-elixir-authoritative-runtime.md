# ADR-0002: Elixir/OTP as Authoritative Runtime

**Status:** Accepted  
**Date:** 2026-07-31

## Context

Roadmap proposed Node.js/Express/Socket.io. Developer docs and founder lock require BEAM for realtime messaging. WhatsApp historically used Erlang; Elixir runs on the same VM with modern tooling (Phoenix).

## Decision

**Elixir + OTP + Phoenix** owns:

- Auth connections, Channels, Presence, PubSub  
- Messaging authority, ordering, fan-out, acks  
- Consent, commitments, orchestration state  
- AI job dispatch, rate limits, supervised recovery  
- Future telephony state machines  

## Consequences

- Team must invest in Elixir expertise.  
- AI remains out-of-band via jobs.  
- No Node.js messaging core will be introduced.

## Alternatives considered

- Node + Socket.io: rejected (founder lock; weaker OTP isolation model for this design).  
- Pure Erlang: viable but Elixir/Phoenix productivity preferred.
