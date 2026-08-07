# Minimum Question Engine

**Status:** ARCHITECTURE (PROPOSED) — design phase, not an implementation claim
**Authority:** Implements the user-effort doctrine (`Opal_PRODUCT_TRUTH.md`) as a decision procedure; introduces no new authority boundary
**Last updated:** 2026-08-05

---

## 1. The problem this solves

The product already commits to a hard constraint: a user should experience nothing, one lightweight confirmation, one correction, or one private choice — never configuration homework (the user-effort doctrine, `Opal_PRODUCT_TRUTH.md`). But nothing in the existing docs specifies *how* the system decides which single thing to ask, when several things are technically unknown. This document is that decision procedure.

## 2. The rule

**When Opal needs input to proceed, it asks for the smallest single thing that unblocks the most value — never a form, never more than one open question at a time, and never anything it could reasonably infer instead.**

"Smallest" is doing real work here: a yes/no or a pick-one-of-three beats an open text field; a single question beats two questions asked at once, even if both are eventually needed — ask the second only after the first is answered, and only if it's still relevant.

## 3. The decision procedure

For any point where Python has proposed something (a plan, a gap, per `ALIGNMENT_GAP_MODEL.md`) but Elixir determines more information is needed before it can be confirmed:

1. **Can this be inferred instead of asked?** If the answer is available from conversation content already, or from a prior confirmed preference, don't ask — that's not restraint, that's just doing the work Opal is supposed to do quietly (`Opal_PRODUCT_TRUTH.md` — "Intelligence is backend work").
2. **Is this worth asking at all?** Apply the same restraint threshold as `ALIGNMENT_GAP_MODEL.md` §4 — expected value must clearly exceed interruption cost. Most unknowns should simply not be asked about; Opal should proceed with an honestly-labeled uncertain proposal instead (state 3 in `OPAL_HUMAN_AND_AI_STATE_MATRIX.md`) rather than blocking on a question.
3. **What is the single narrowest form of the question?** Prefer a bounded choice over an open question, and a single field over several. If two things are unknown, rank them by which one unblocks the most downstream value, and ask only that one first.
4. **Attach the question to what's already true.** The question must reference the actual conversation content it came from — never a generic prompt disconnected from context. This is enforced by the existing bounded-context rule for Python job requests (`PYTHON_AI_BOUNDARY.md`).
5. **Never re-ask what was already answered or declined.** A declined question is a signal, not a retry trigger — mirrors the existing contact-permission rule ("never re-nag in the same session," `OPAL_CONTACT_ONBOARDING.md`), generalized to any question this engine asks.

## 4. Who decides what — reusing existing authority

- **Python** may propose that a question is needed and suggest candidate phrasings/options as part of its bounded response — it does not decide whether to actually surface anything.
- **Elixir** alone applies the restraint threshold and commits to asking. This is the same authority split already governing plan proposals: "Python returns schema-validated proposals only... Elixir alone commits" (`SOCIAL_FLOW_INFERENCE_BOUNDARIES.md`).
- The question, once asked, is itself state 3 in `OPAL_HUMAN_AND_AI_STATE_MATRIX.md` ("what Opal suggested") — never phrased or styled to look like a fact or a completed action.

## 5. Interaction with the noise budget

This engine is one of the consumers of the existing "noise budget" concept — the running allowance of how much Opal is allowed to surface before it must go quiet (`EXPERIENCE_COLLABORATION_AND_NUANCE.md`). A question this engine wants to ask still competes against that budget alongside every other signal Opal might show; being "the minimum question" doesn't exempt it from being worth asking at all.

## 6. What this engine must never do

- **Never batch multiple unknowns into one form.** If three things are unclear, that's three separate, sequenced, individually-skippable moments — not a settings screen.
- **Never ask a question whose only purpose is data collection for a future feature.** Every question must unblock something the user is already trying to do, right now — never "help us build your profile."
- **Never make skipping costly.** Declining a question must leave the user in a working, ungated state — Opal proceeds with its best honestly-uncertain proposal, not a dead end. This mirrors the existing rule that permission denial is "a first-class calm path" (`OPAL_CONTACT_ONBOARDING.md`), generalized.
- **Never let a question imply certainty it doesn't have.** "Is this for Thursday?" is fine; "Confirm: Thursday 7pm" when nothing has actually been proposed yet is not — see the live counterexample in `OPAL_HUMAN_AND_AI_STATE_MATRIX.md` §4.

## 7. Relationship to existing job lifecycle

This procedure runs as an evaluation step inside the existing AI job lifecycle (`AI_JOB_LIFECYCLE.md`) — specifically at the point where a job's result is `completed` but incomplete for the purpose Elixir needs it for. No new job state is introduced; "needs one more input" is represented as Elixir choosing not to act on an otherwise-valid proposal yet, and instead emitting a single bounded prompt through existing UI signal machinery (`EXPERIENCE_COLLABORATION_AND_NUANCE.md`'s content classes).
