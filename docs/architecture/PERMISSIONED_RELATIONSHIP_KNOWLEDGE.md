# Permissioned Relationship Knowledge

**Status:** ARCHITECTURE (PROPOSED) — design phase, not an implementation claim. "Not shipped" (inherited from `PERMISSIONED_SOCIAL_KNOWLEDGE_PHASE0.md`)
**Authority:** Specializes `docs/product/PERMISSIONED_SOCIAL_KNOWLEDGE_PHASE0.md` for private relationship facts (birthdays, preferences, boundaries) rather than public/audience knowledge
**Last updated:** 2026-08-05

---

## 1. What this covers

The operating brief for this work names a specific category the existing `PERMISSIONED_SOCIAL_KNOWLEDGE_PHASE0.md` doesn't fully cover: knowledge one person learns about another *inside a private relationship* — birthdays, favorite foods, brands, jewelry sizes, flowers, music, travel dreams, important dates, gift preferences, places, private boundaries. This is not the audience/creator knowledge graph (`SOCIAL_GRAPHS_AND_FOLLOWING.md`); it's smaller, more private, and higher-stakes, because it's exactly the kind of information that makes a gift or a gesture feel thoughtful — or, mishandled, makes someone feel surveilled.

## 2. The rule this is built around

**Mention does not authorize disclosure or action.** If someone says "my sister loves peonies" in conversation, that is not consent for Opal to buy peonies, tell someone else, or treat it as a standing instruction. This is a direct restatement of `PERMISSIONED_SOCIAL_KNOWLEDGE_PHASE0.md`'s core rule, applied to the private-relationship case, and it is the load-bearing constraint for everything below.

## 3. Knowledge object lifecycle

Reusing the state machine already defined in `PERMISSIONED_SOCIAL_KNOWLEDGE_PHASE0.md`, specialized to relationship facts:

```
mentioned_privately → remembered_privately → needs_confirmation →
approved_for_scope → (usable within that scope) → revoked / outdated
```

- **mentioned_privately** — Opal noticed a fact in conversation. Not yet "known" in any actionable sense.
- **remembered_privately** — stored, visible only to the person who'd naturally already know it (the listener in the original conversation), never surfaced to anyone else.
- **needs_confirmation** — before this fact is used for anything beyond passive private recall (a gift suggestion, a reminder), the person is asked to confirm it's accurate and that using it is okay. This is where `MINIMUM_QUESTION_ENGINE.md` governs: one narrow confirmation, not a review form.
- **approved_for_scope** — confirmed, and bounded to a specific use (a specific upcoming date, a specific gift-suggestion feature) — never a blanket "Opal may use anything it knows about this person."
- **revoked / outdated** — the person can revoke at any time, and facts age out; an old preference should not be treated as current forever.

## 4. Every fact carries scope, not just content

Every knowledge object requires the same metadata already specified for personal nuance records in `EXPERIENCE_COLLABORATION_AND_NUANCE.md`: owner, source, visibility, purpose, scope, confidence, freshness, revocation status. Applied here: a birthday mentioned by person A about person B is *owned* by the relationship between A and the fact, *visible* only where A confirmed, and *scoped* to a specific purpose (a reminder for A, not a public calendar entry, not something Opal mentions unprompted to B).

## 5. The retrieval gate

Before Opal uses any stored relationship fact for anything — a suggestion, a reminder, a gift idea — it must pass the same eight-check gate already specified for AI retrieval in `PERMISSIONED_SOCIAL_KNOWLEDGE_PHASE0.md`: does the fact exist in `approved_for_scope` state, for this specific purpose, requested by the person who owns the confirmation, within its freshness window, without exposing it to anyone it wasn't approved for. Python may propose a use (e.g., "gift idea: peonies, based on a prior conversation") but Elixir alone checks the gate and decides whether to surface it — same authority split as everywhere else in this system (`SOCIAL_FLOW_INFERENCE_BOUNDARIES.md`).

## 6. The surprise problem

Gift and surprise use cases create a specific tension: the whole point of "Opal remembers your partner loves peonies" is that the partner doesn't find out ahead of time. This is already named as a first-class privacy boundary elsewhere in the corpus — the "restricted-surprise" continuity mode (`MINOR_AND_FAMILY_PRIVACY.md`) and "surprise leakage is a hard defect" — and this document inherits it exactly: a knowledge object used for a surprise must never be visible, even indirectly (through a shared reminder, a shared calendar entry, an autocomplete suggestion), to the person it's a surprise for. This is a harder privacy bar than ordinary shared content, not a lighter one.

## 7. What this must never become

- **Not a dossier.** This is not a growing profile of facts about a person that Opal can query freely — every fact stays scoped to its approved purpose; there is no "show me everything Opal knows about X" surface, by design.
- **Not shared without the subject's layer of consent where required.** A fact person A shares about person B is A's private memory of a conversation, not B's disclosed data — this document does not create a backdoor around `CONSENT_MODEL.md`'s dual-consent requirement for anything that would constitute shared relationship memory about B.
- **Not a substitute for asking.** Even a confirmed, scoped fact should prompt a light confirmation before high-stakes use ("Still want to go with peonies?") rather than acting unilaterally — consistent with "Opal assists; the human decides" (`RELATIONSHIP_SAFETY_RULES.md`).

## 8. Status and dependencies

**DOCUMENTED-ONLY.** No knowledge-object schema, retrieval gate, or storage exists in `apps/opal_core` today. This document depends on `PERMISSIONED_SOCIAL_KNOWLEDGE_PHASE0.md` and `CONSENT_MODEL.md` remaining the source of truth for the underlying state machine and consent layers respectively — it does not redefine either, only specializes their application to private relationship facts.
