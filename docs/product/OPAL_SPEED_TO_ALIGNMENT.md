# Opal — Speed to Alignment

**Status:** Product north star (Claude framing, grounded in existing accepted product truth)
**Authority:** Sits alongside `Opal_PRODUCT_TRUTH.md`; does not override it
**Last updated:** 2026-08-05

---

## 1. The claim

Opal's primary value is not messaging, and not AI. It is **speed to authentic alignment**: helping two or more people get to a shared, accurate understanding of what's happening between them, faster and with less friction than they could on their own — without ever manufacturing agreement that isn't real.

This is already the product's own language, gathered in one place for the first time: the compounding promise (*"Opal understands how you relate to people and the world around you, then helps the right experiences take shape with almost no work"*) and the user-effort doctrine (nothing / one confirmation / one correction / one private choice) are both, functionally, statements about speed to alignment. This document names the pattern and gives it a shape that the architecture docs in this handoff can build against.

## 2. What "alignment" means here

Alignment is not agreement on a calendar slot. It is shared, accurate understanding across all the dimensions the product already treats as first-class in `docs/product/`:

emotional understanding · intent · comfort · preferences · timing · location · expectations · private constraints · shared goals · relationship nuance · next action

Two people are **aligned** on a topic when each would describe the current state of that topic the same way, and each knows what (if anything) happens next. They are **misaligned** when one believes something the other doesn't know, hasn't confirmed, or would describe differently — a plan one person thinks is settled and the other thinks is still open, a boundary one person believes was communicated and wasn't.

## 3. Speed is not haste

This is the line that separates "speed to alignment" from a rushed-decision growth hack, and it has to be stated explicitly because the two are easy to conflate:

**Speed to alignment means removing unnecessary friction from reaching a true understanding. It never means pressuring anyone toward a faster but less accurate or less consensual one.**

Concretely:
- Fast and authentic: Opal notices two people have been circling a dinner plan for three messages and asks one clarifying question instead of making them re-explain from scratch.
- Fast and inauthentic (rejected): Opal infers a "yes" from silence, or a confirmed booking from a proposal, to make the interaction *look* resolved sooner.

The existing product law already forbids the inauthentic path — no silent commitments, no silent RSVP, no auto-accept, uncertainty must be stated, not hidden (`SOCIAL_FLOW_ARCHITECTURE.md`, `RELATIONSHIP_SAFETY_RULES.md`). What's new in this document is naming *why* those rules exist: they are what keeps "speed" honest. `OPAL_AUTHENTIC_ALIGNMENT.md` develops this boundary in full.

## 4. What actually produces speed

Three existing mechanisms, already documented elsewhere, are the real levers — this document is the first place that names them together as a system:

1. **Fewer round trips.** Opal notices what two people already implied instead of asking them to state it explicitly (the "understanding" step in the essential product loop, `Opal_PRODUCT_TRUTH.md`).
2. **The minimum necessary question.** When Opal is missing something it cannot infer, it asks exactly one narrow thing, not a form (see `MINIMUM_QUESTION_ENGINE.md`). Restraint is itself a speed mechanism: a person who is asked nothing they don't need to answer moves faster than one buried in confirmations.
3. **Correct closure of gaps, not manufactured closure.** When two people's understanding has actually diverged, Opal should surface that gap plainly and let them resolve it — not paper over it (see `ALIGNMENT_GAP_MODEL.md`).

## 5. What speed to alignment is not

Restating existing rejected patterns in this frame, because they are exactly the failure modes "speed" would tempt a lesser design into:

- Not a relationship health score, ever (`Opal_PRODUCT_TRUTH.md` — "Rejected forever").
- Not a nudge to decide before someone is ready ("Do not optimize for rushed decisions" — operating charter for this work).
- Not certainty where there is uncertainty ("This may suggest distance or uncertainty," never "He is definitely breaking up with you").
- Not alignment with Opal's guess substituted for alignment between the actual people.

## 6. How this shows up per relationship shape

Speed to alignment is not a 1:1-only idea, even though 1:1 is the only shape currently in MVP scope:

- **One-to-one:** the MVP case — reducing the gap between what two people each believe about a plan or an unresolved thread.
- **One-to-many / many-to-many (groups, families, communities):** alignment becomes *collective fit*, not majority rule — see `OPAL_SOLO_AND_GROUP_ALIGNMENT.md`, which inherits this document's definition of alignment and extends it to more than two people.
- **Network / discovery:** alignment between a person's stated interests and the people/communities around them — see `OPAL_NETWORK_EFFECT_JOURNEYS.md`.

All three build on this document; none of them are shipped today except the 1:1 case, and only partially (see `CLAUDE_REPOSITORY_UNDERSTANDING.md` §5–6 for exact status).

## 7. Relationship to existing documents

This document does not introduce new product law. It names the connective thread between: the compounding promise and user-effort doctrine (`Opal_PRODUCT_TRUTH.md`), the uncertainty doctrine (same), the consent flagship rule (`CONSENT_MODEL.md`), and the restraint-is-a-feature stance already in `OPAL_DYNAMIC_SOCIAL_EXPERIENCE_INTELLIGENCE_PHASE0.md` ("Silence is a successful product outcome"). Where this document and any of those conflict, those documents win — per the authority order in `OPAL_CONTEXT_AUTHORITY.md`.
