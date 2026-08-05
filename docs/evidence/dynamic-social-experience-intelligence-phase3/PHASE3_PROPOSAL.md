# Phase 3 proposal: experience continuity and learning from outcomes

**Status:** Design proposal only. **Not implemented.**  
**Prerequisite:** Phase 2 merged (durable context, participation, correction, restraint).  
**Do not implement until this proposal is reviewed.**

---

## Objective

Prove that Opal becomes better after an experience, without homework, surveys, feeds, or live providers.

Narrow dinner scenario lifecycle:

```text
detected
  → surfaced
  → private participation
  → shared readiness
  → confirmed
  → completed
  → light reflection
  → future preference update
```

Core question:

> Can Opal learn from what happened without making the user complete a survey?

---

## Lifecycle (authoritative, Elixir)

| Stage | Meaning | User-facing (examples) |
|-------|---------|------------------------|
| detected | Context forming | Quiet / no surface yet |
| surfaced | Restraint allowed one moment | Experience moment |
| private participation | Individual responses | Interested / Not this time / … |
| shared readiness | Aggregate interest enough | Still open / Ready |
| confirmed | Group sufficiently aligned | Ready |
| completed | Experience treated as happened | Handled / Happened (review language) |
| reflected | Optional light continuity | One soft follow-up |
| learned | Scoped preference update | Invisible unless explain later |

Python never owns lifecycle transitions.

---

## Completion authority

Completion may come from:

1. Explicit user confirmation  
2. Provider confirmation **later** (out of Phase 3 scope)  
3. Conversation evidence with high confidence **plus** participant confirmation  
4. Time **plus** participant confirmation  

**Do not** mark complete solely because time passed.

Candidate product words: `Handled` or `Happened` (founder review).

---

## Outcome signals (no survey)

| Signal | Use |
|--------|-----|
| Option selected | Positive candidate evidence |
| Who participated | Group-specific learning scope |
| Experience completed | Outcome weight |
| Light reaction | Optional one-tap |
| Conversation afterward | Soft evidence only |
| Correction | Highest priority override |
| Repeat interest | Boost similar class later |

Maximum user ask when necessary (one question):

> Would you choose a place like this again?

Actions: **Yes** · **Maybe** · **Not with this group**

No satisfaction questionnaire.

---

## Learning scope

May update (scoped):

- group-specific venue / place-class preference  
- quiet preference confidence  
- travel tolerance  
- timing fit  
- experience-type interest  

Must **not** update:

- friendship score  
- global reliability score  
- financial classification  
- permanent social label  

Sensitive updates may require explicit confirmation.  
Corrections outrank inferred outcomes.

Scope keys: experience type · participant set · context · freshness · permission.

---

## Digital continuity

After completion, at most one light shared moment, for example:

- Save this kind of place for next time?  
- That seemed to work well for this group.  
- Want to keep this as a future option?  

Forbidden:

- public memory feed  
- automated social scrapbook  
- forced recap  
- constant post-event engagement  

---

## Repeat experience intelligence

Later similar conversations may modestly boost candidates similar to prior positive outcomes for **that** participant set and experience type.

Do not:

- repeat the same venue blindly  
- assume all participant sets are equivalent  

---

## Privacy

Group-safe outcome:

> This kind of place worked well before.

Never:

> It worked because C could afford it.

Preserve private: budget, decline reason, exact location, sensitive accessibility, private correction.

---

## Restraint

Outcome follow-ups obey the same restraint rule:

surface only when social value clearly exceeds interruption and privacy cost.

Quiet is success after completion too.

---

## Non-goals (Phase 3)

- real restaurant APIs  
- location tracking  
- reservation execution  
- payment  
- membership  
- creator system  
- Kafka requirement  
- push campaigns  
- recommendation feed  

---

## Test plan (when implemented)

| Gate | Proof |
|------|-------|
| Full dinner lifecycle | detected → completed without provider |
| No complete on time alone | time-only remains incomplete |
| One lightweight reflection max | no multi-question survey |
| Scoped learning | different group does not inherit blindly |
| Private outcome non-leak | shared copy safe |
| Correction outranks outcome | “Not with this group” blocks boost |
| Quiet after decline | no nag follow-up |
| Idempotent completion | one completion record |

---

## Suggested implementation order (later)

1. Completion state + authority rules  
2. One lightweight reflection intake  
3. Scoped preference write (Elixir)  
4. Soft boost in collective-fit ranking for same set  
5. Continuity moment (optional, restrained)  

No implementation in this document.

---

## Closure language (future)

Use only when implemented and proven:

> OPAL DYNAMIC SOCIAL AND EXPERIENCE INTELLIGENCE PHASE 3 CLOSED FOR EXPERIENCE CONTINUITY AND BOUNDED OUTCOME LEARNING

Not claimed now.
