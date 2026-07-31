# Social Flow Architecture (Current Direction)

**Authority:** ARCHITECTURE (CURRENT) — product-level, **not** an implementation claim  
**Status:** Ready for a future bounded build slice; **no Social Flow feature code in this documentation phase**

---

## Alignment with Opal runtime

| Concern | Owner |
|---------|--------|
| Message authority, membership, consent, plan state, polls, RSVP, holds, revisions, reminder jobs, realtime | **Elixir / OTP** |
| Plan language understanding, time candidates, missing fields, draft prompts, uncertainty | **Python workers** (jobs in, proposals out) |
| Local plan projection, offline continuity | **Mobile** |

Hard rule: Python returns **schema-validated proposals**. Elixir creates **authoritative** plan/commitment state only after agreement rules are met.

---

## Happy-path pipeline

```text
Conversation message (Elixir persists)
    → Consent / capability check (Elixir)
    → Bounded Python plan interpretation
    → Schema-validated PotentialPlan proposal
    → Elixir stores proposal (not event)
    → User consents to coordinate
    → Negotiation (options / poll / chat replies)
    → Agreement threshold met
    → Authoritative SharedPlan + version
    → Realtime updates, commitments, reminders, adaptations
```

---

## PotentialPlan (proposal shape — conceptual)

```text
PotentialPlan
- activity
- participants (mentioned)
- time_candidates[]
- location (may be unresolved)
- source_message_ids[]
- confidence / uncertainty
- missing[]
- recommended_prompt
- evidence only (no side effects)
```

Never: silent RSVP, silent calendar write, silent invite fan-out.

---

## Elixir authoritative concepts (conceptual)

- PlanProposal  
- AvailabilityGrant  
- TimeOption  
- PlanPoll / responses  
- SharedPlan + PlanRevision  
- ParticipationState  
- Commitment  
- PersonalHold  
- CalendarProjection (export/view)  
- Audit / idempotency keys  

A supervised process may coordinate **active** negotiations; durable truth in PostgreSQL.

---

## What this phase does **not** include

- Elixir feature modules for plans  
- Python plan-extraction models  
- Mobile Plans UI  
- External calendar providers  
- Location services  
- Blockchain / DID / staking  

Those belong to a later, gated build slice after this documentation is reviewed.
