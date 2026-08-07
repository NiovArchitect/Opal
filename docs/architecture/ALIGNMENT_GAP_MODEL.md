# Alignment Gap Model

**Status:** ARCHITECTURE (PROPOSED) — design phase, not an implementation claim
**Authority:** Extends `docs/architecture/SOCIAL_FLOW_INFERENCE_BOUNDARIES.md` and `SOCIAL_FLOW_ARCHITECTURE.md`; introduces no new authority
**Last updated:** 2026-08-05

---

## 1. What this models

`OPAL_SPEED_TO_ALIGNMENT.md` names the product goal: close the gap between what people believe about a shared topic, faster and honestly. This document gives that gap a shape a system can reason about, using machinery that already exists rather than proposing new authority. It does not introduce a new service, database, or ownership boundary — it is a naming layer over the existing Social Flow proposal pipeline.

## 2. The gap, defined

An **alignment gap** exists between two or more participants on a **topic** (a plan, a boundary, an expectation, an unresolved question) when their inferred or stated understanding of that topic differs, or when one party's understanding is unconfirmed. A gap has:

- **topic** — what the gap is about (references a Social Flow domain object where one exists: `PlanProposal`, `AvailabilityGrant`, `Commitment`; or a bare `OpenLoop` when no formal object exists yet)
- **participants** — who is involved, and whose understanding is known vs. unknown
- **confidence per participant** — how sure the system is what each participant currently believes (never asserted above what the evidence supports — this is a *display* of the existing uncertainty doctrine, not a new one)
- **state** — `open` (gap detected, not yet addressed) → `narrowing` (a question or proposal has been sent) → `closed` (all participants confirmed, or the topic was explicitly dropped)

## 3. Who computes what — no new authority

This model **adds no new authority boundary.** It reuses the existing one exactly:

- **Python** may propose that a gap exists and estimate confidence, from bounded conversation context, the same way it proposes `PotentialPlan` objects today (`SOCIAL_FLOW_INFERENCE_BOUNDARIES.md`). A gap proposal is schema-validated and carries mandatory uncertainty, exactly like existing plan proposals — "missing uncertainty ⇒ Elixir treats job as `schema_invalid_response` failed."
- **Elixir** alone decides whether a proposed gap is worth surfacing to a user, applies the restraint threshold (see §4), and is the only writer of a gap's state transitions. This mirrors "Only Elixir decides that agreement threshold was met" (`SOCIAL_FLOW_AUTHORITY_BOUNDARIES.md`) applied to gap-closure instead of plan-agreement.
- **Nothing about a gap is ever shown to one participant as fact about another's private state.** A gap surfaced to User B never reveals User A's private reflection, message, or reasoning — only what's needed for B to respond, consistent with the consent flagship rule (`CONSENT_MODEL.md`).

## 4. Restraint: most gaps should never be surfaced

Most differences in understanding are trivial, self-resolving, or none of Opal's business. The existing restraint engine's threshold — surface only when expected social value clearly exceeds interruption and privacy cost, and silence is a successful outcome (`OPAL_DYNAMIC_SOCIAL_EXPERIENCE_INTELLIGENCE_PHASE0.md` §10) — applies unchanged to gap surfacing. This model does not add a new restraint mechanism; it is a consumer of the existing one, and it inherits `MINIMUM_QUESTION_ENGINE.md`'s decision of *how* to close a gap once one is deemed worth surfacing.

## 5. Gap lifecycle, mapped onto existing pipeline

```
conversation message(s)
  → Python: bounded interpretation, proposes possible gap + confidence + uncertainty (existing AI job pipeline, AI_JOB_LIFECYCLE.md)
  → Elixir: consent check (existing CONSENT_GATE_EXECUTION.md), restraint check
  → Elixir: if worth surfacing, hands off to MINIMUM_QUESTION_ENGINE.md to decide the smallest closing action
  → User(s) respond or ignore
  → Elixir: records closure (confirmed / corrected / dropped) — never inferred silently
```

Every arrow in this pipeline is an existing, documented boundary (job lifecycle, consent gate, authority table); this document only names what flows through it.

## 6. What a gap must never become

- **Not a relationship score.** A count of open gaps, or a "how aligned are you" percentage, is exactly the kind of derived metric already forbidden by product law (`Opal_PRODUCT_TRUTH.md`). This model tracks gaps as ephemeral, per-topic state, not as an accumulating relationship metric.
- **Not evidence.** A gap is not a record of who was right — it exists only to be closed, and closed gaps should not be retained as a searchable log of one person's misunderstandings, per the existing "no evidence packs" rule (`SOCIAL_FLOW_INFERENCE_BOUNDARIES.md`).
- **Not visible to a third party.** A gap between A and B is never surfaced to C, even in an aggregated or anonymized form, without the same consent that would be required for any other private content.

## 7. Open questions for a future build slice

This is architecture, not a build plan — the following would need founder and product-research resolution before implementation, consistent with the existing gap-tracking convention (`GAPS_AND_OPEN_DECISIONS.md`):
- Retention window for an unresolved `open` gap before it silently expires vs. stays queryable.
- Whether a gap's `state` history is visible to the participants who closed it (transparency) or only its final state (minimalism).
- How this interacts with the not-yet-built group case (`OPAL_SOLO_AND_GROUP_ALIGNMENT.md`) where a gap may exist between more than two people simultaneously.
