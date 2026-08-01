# Opal Micro-Journey Model

**Authority:** ACCEPTED PRODUCT TRUTH (compatibility design for SF-3+)  
**Status:** Documented model — full generic workflow engine is **deferred**. SF-3 implements meaning/repair transitions that map onto this model.

---

## Definition

A **micro-journey** is a bounded social objective with:

1. **Trigger** — message, question, invitation, commitment, date, plan change, user request  
2. **Social objective** — what people are trying to accomplish  
3. **Required authority** — who may act  
4. **Current uncertainty** — what remains unresolved  
5. **Useful next action** — smallest step forward  
6. **Completion condition** — evidence the micro-journey is done  
7. **Reward expression** — calm signal of real progress (if useful)  
8. **Continuation** — whether another micro-journey begins  

**Product rule:** Every *meaningful* micro-journey ends with useful signal, reduced uncertainty, visible progress, or a socially meaningful next step.  
Not every system event deserves user attention.

---

## Long journey

A long journey (trip, birthday, wedding, recurring friend group, post-conflict repair) is composed of linked micro-journeys — **not** one giant workflow.

Users experience:

- one relevant next step  
- clear settled information  
- visible progress  
- quiet completion  

Not a workflow diagram.

---

## Conceptual schema (future-compatible)

### SocialJourney (conceptual — not required DB enum in SF-3)

| Field | Notes |
|-------|--------|
| id | |
| journey_type | trip, birthday, romantic_weekend, … |
| owner_user_id | |
| relationship_context_id | optional |
| conversation_id | |
| title | |
| privacy_class | private / shared scopes |
| status | emerging · active · paused · waiting · settled · completed · cancelled · expired |
| current_micro_journey_id | |
| started_at / target_date / completed_at / cancelled_at | |
| source_lineage · consent_reference | |

### SocialMicroJourney (conceptual)

| Field | Notes |
|-------|--------|
| id · journey_id · micro_type · objective · status | |
| owner_user_id · participant_ids | |
| source_message_ids · required_authority | |
| unresolved_fields · next_action · completion_evidence | |
| privacy_class · sequence · due_at · completed_at · superseded_at | |
| idempotency_key | |

Statuses: detected · proposed · active · waiting_on_user · waiting_on_other · blocked · resolved · completed · dismissed · superseded · cancelled · expired

**Python** may propose micro-journey *transitions*.  
**Elixir** owns existence, participants, privacy, state, completion, emission.

---

## SF-3 mapping (implemented without workflow engine)

| Micro-journey type | SF-3 object | Example completion signal |
|--------------------|-------------|---------------------------|
| Pre-send clarity | `ConversationInsight` pre_send_clarity | clarified / sent as written / dismissed |
| Unanswered question | `OpenLoop` | resolved / dismissed |
| Ambiguity check | `ConversationInsight` ambiguity | clarify / continue / Opal misunderstood |
| Impact repair | `ConversationInsight` repair | draft used / write myself / dismiss |
| Decision summary | `DecisionSummary` | private “What did we decide?” |
| Plan agreement (SF-1) | SharedPlan | “Everyone agreed…” |
| Follow-through (SF-2) | AttentionSignal + CompletionEvent | “Reservation handled.” |

---

## Signal policy at transitions

For every transition ask:

| Q | Meaning |
|---|---------|
| A | Must the system record it? |
| B | Must a user see it immediately? |
| C | Contextual only? |
| D | Needs you? |
| E | Summarize later? |
| F | Suppress entirely? |

Examples:

| Transition | Visibility |
|------------|------------|
| Message delivered | Record only |
| Question answered | Quiet resolve open loop |
| All participants agree | Concise shared signal |
| Private reminder | Owner only |
| Relevance ranking done | Invisible |
| Duplicate prevented | Record privately |
| Reservation complete | Calm completion (L2) |
| Trip fully prepared | Rare L4 milestone |

---

## Reward intensity (socially meaningful reward)

| Level | Use | Example |
|-------|-----|---------|
| 0 | Invisible resolution | Duplicate suppressed |
| 1 | Quiet acknowledgement | “Saved privately.” |
| 2 | Meaningful completion | “Reservation handled.” |
| 3 | Shared social progress | “Everyone agreed on Saturday.” |
| 4 | Major milestone (rare) | “Your trip is ready.” |

**Prohibited:** points for app opens, message-volume rewards, use streaks, confetti for trivial acts, public rankings, variable compulsion rewards, fear/guilt badges, session-length bait.

---

## Next-best-social-action

When a micro-journey is active, Opal may suggest the **smallest** useful next action that preserves consent and dignity — including **leave it alone**.

---

## Emotional pacing

- Do not force premature closure after impact statements  
- Allow pause / wait / leave-it-alone  
- Quiet hours and frequency caps still apply (SF-2)  
- Sensitive repair never auto-sends  

---

## Partner integrations

**Deferred.** See `docs/evidence/social-flow-3/FUTURE_PARTNER_INTEGRATION_BOUNDARIES.md`.  
No partner APIs, ads, purchases, or sponsored options in SF-3.
