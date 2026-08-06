# Opal — Authentic Alignment

**Status:** Product boundary document — defines what makes alignment "authentic" and names the failure modes that fake it
**Authority:** Extends `OPAL_SPEED_TO_ALIGNMENT.md` §3; does not override `RELATIONSHIP_SAFETY_RULES.md`
**Last updated:** 2026-08-05

---

## 1. The test

Alignment is authentic when it would survive both people finding out exactly how it was reached. If either person would feel manipulated, rushed, or misrepresented upon learning what Opal actually did behind the scenes, the alignment wasn't real — it just looked resolved.

This is a stricter bar than "the user didn't complain." Silence is not consent, and a fast "yes" extracted under social pressure or ambiguity is not alignment — it's the same failure the product already forbids in other forms (no silent RSVP, no auto-accept).

## 2. Four things that make alignment authentic

1. **Both parties know it happened.** No inference is treated as settled without the person confirming it, especially anything that becomes visible to someone else. This is the direct product-level enforcement of the consent flagship rule: "Opal must never surprise User B with User A's private reflections" (`CONSENT_MODEL.md`).
2. **Uncertainty is shown, not hidden.** If Opal isn't sure, it says so, in the register the product already defines: "This may suggest..." not "This means..." (`Opal_PRODUCT_TRUTH.md` uncertainty doctrine).
3. **The state is honestly labeled.** A proposal never looks like a confirmation; a suggestion never looks like a fact. This is `OPAL_HUMAN_AND_AI_STATE_MATRIX.md` in force.
4. **Reversal is always available.** Anyone can correct, dismiss, or revoke without penalty or friction, at the moment they notice something is wrong — not buried in settings.

## 3. Failure modes, named plainly

These are not hypothetical. Two are visible in the shipped product or the adjacent design work reviewed for this handoff, cited here rather than in the abstract:

| Failure mode | What it looks like | Where it's already been flagged |
|---|---|---|
| **Manufactured closure** | A chip or line implies something is done when it's only proposed | Live in the walkthrough booking scene, `FirstRunExperience.tsx:201-203` — see `OPAL_HUMAN_AND_AI_STATE_MATRIX.md` §4 |
| **One-way funnel** | The final screen of a flow removes the exit that every earlier screen had | The walkthrough's screen 5 drops the "Skip" affordance present on screens 1–4 — not deceptive copy, but a deliberate one-way gate at exactly the moment of highest commitment. Worth naming even though it's mild and contains no dark-pattern language (the codebase's own `FORBIDDEN_COPY` list already bans "don't miss out"-style urgency) |
| **Borrowed consent** | A's decision to invite C is treated as C's consent to be contacted | The invite flow lets an activated user fire an invitation to any phone number with a pre-filled message and no visible consent step for the invitee — currently gated to approved test numbers only, but built for real numbers. Flagged for review before it opens to real numbers, in `CLAUDE_TO_GROK_ALIGNMENT_HANDOFF.md` |
| **Average-fit disguised as collective-fit** | A group recommendation is presented as "everyone agrees" when it's actually "acceptable to most" | Explicitly forbidden already: "collective fit, not average fit" — never expose *why* one person's constraint shaped the outcome (`OPAL_DYNAMIC_SOCIAL_EXPERIENCE_INTELLIGENCE_PHASE0.md`) |
| **Score-shaped confidence** | Any UI that reduces "how well do these people understand each other" to a number | Rejected forever, already product law (`Opal_PRODUCT_TRUTH.md`) — restated here because "speed to alignment" as a metric is exactly the kind of concept a future team could be tempted to visualize as a score. It must never become one. |

## 4. The boundary with dignity, consent, and safety

Authentic alignment inherits, and does not weaken, every existing safety boundary:

- Alignment between an abuser and a victim is not a product goal — nothing in this document authorizes helping one person get a faster "yes" from another when coercion is present. `RELATIONSHIP_SAFETY_RULES.md`'s coercive-control section governs, unchanged.
- Alignment involving a minor inherits the full age-authority and guardian-boundary model (`OPAL_AGE_AUTHORITY_TIERS.md`, `OPAL_GUARDIAN_BOUNDARIES.md`) — nothing here creates a faster path around consent for minors.
- "Speed" never means reducing the number of people who get to know something is happening; it means reducing the *effort* it takes each of them to find out and respond.

## 5. What to build against this

`ALIGNMENT_GAP_MODEL.md` and `MINIMUM_QUESTION_ENGINE.md` are the architecture-level implementations of this boundary — the gap model decides *what* misalignment exists and how to represent uncertainty about it; the question engine decides *how little* to ask while still keeping alignment authentic. Neither may resolve a gap without a step that satisfies all four conditions in §2.
