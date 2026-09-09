# Personal → Relational → Shared Model

**Status:** CURRENT (additive)  
**Date:** 2026-09-08

## Three planes

### 1. Personal Opal — “Know me and help me.”

Zero-network, out-of-box. Uses only permitted:

calendar · location · preferences · budget comfort · interests · memory · travel context · world truth · connected capabilities

Locks:

- `ZERO_NETWORK_SOLO_VALUE = REQUIRED`  
- `PERSONAL_OPAL_ZERO_NETWORK_VALUE = CURRENT`  
- No friends / Graph / memory / connectors required for **first** value  
- Progressive enrichment: ask permission **just-in-time**, never a twenty-connector onboarding wall

### 2. Relational Opal — “Know how I fit with this person.”

Maintains relationship-specific permitted intelligence `A↔B`:

communication history · shared choices · comfort · timing · patterns · decisions · memories · nuance

Adding a person must **not** rebuild the query. Context deletes steps.

### 3. Shared Opal — “Figure out what works for us.”

```text
Private intelligences → Safe Projection
        ↓
Relationship context + World/Provider truth
        ↓
Decision Intelligence (1 answer / question / tradeoff)
        ↓
Shared Graph → Approved Execution → Journey → Memory
```

## Solo → network conversion

After personal value exists, Opal may suggest including another person **only when materially useful**:

> Want me to include Chanelle?

Do not force invite walls. One-person retention must stand alone.

## Fixture vs real identity

| Context | Allowed |
|---------|---------|
| Founder demo seed / visual walk | Fixture people OK if labeled as fixture authority |
| Real Twilio-authenticated session | Fixture Calls/People as “your people” = **lie** — forbidden |
| New real user empty graph | Expected until invites — Solo still useful |

## Related

- `OPAL_RELATIONSHIP_INTELLIGENCE_DOCTRINE.md`  
- `OPAL_RELEASE_MAGIC_LOOP.md`  
- `docs/architecture/OPAL_PERSONAL_CONSEQUENCE_ROUTER.md`
