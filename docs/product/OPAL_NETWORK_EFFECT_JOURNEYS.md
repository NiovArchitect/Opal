# Opal — Network Effect Journeys

**Status:** Product mapping document — synthesizes the following/audience/creator design work into a journey view
**Authority:** Descriptive; explicitly not build authorization — both source documents self-label "Not shipped"
**Last updated:** 2026-08-05

---

## 1. Scope and warning label

Opal's product-truth corpus already designs a second, separate graph beyond private relationships — an audience/following graph for creators and communities — in `SOCIAL_GRAPHS_AND_FOLLOWING.md` and `PERMISSIONED_SOCIAL_KNOWLEDGE_PHASE0.md`. Both documents open with the same header: **"Not shipped."** This document maps how that graph could grow the network, and repeats the warning at every stage, because "network effect" is exactly the kind of idea that tempts a team into shipping growth mechanics ahead of the trust mechanics that are supposed to gate them.

## 2. The two graphs, and why they must stay separate

| | Relationship graph | Audience graph |
|---|---|---|
| Nature | Mutual, accepted, high-trust | Asymmetric — one person follows another |
| Entry | Phone, invite, QR, acceptance | Handle, profile, QR, topic search |
| Grants | Phone visibility, DM, private nuance, location (per consent) | None of the above, by default |
| Example | "50 accepted private relationships" | "100,000 followers" |

The product's own hard rule, worth restating because it's the entire safety of this feature: **friend ≠ follower, mention ≠ publication, AI inference ≠ owner-authored knowledge** (`SOCIAL_GRAPHS_AND_FOLLOWING.md`). A network-effect journey built on this graph must never let audience-scale reach imply relationship-scale trust.

## 3. The journey stages

### Stage A — Someone becomes discoverable
A person or community opts into being found (handle, profile, topic) without exposing anything from their private relationship graph. **Status: DOCUMENTED-ONLY.**

### Stage B — Someone follows
Asymmetric, revocable, grants nothing beyond what's explicitly public. Interaction permissions (can this follower message me? see my location? see private notes?) are separate settings from the follow itself — following never implies any of them. **Status: DOCUMENTED-ONLY.**

### Stage C — Knowledge is shared, carefully
A person mentions something in private conversation (a favorite restaurant, a recipe) — this is not automatically publishable. `PERMISSIONED_SOCIAL_KNOWLEDGE_PHASE0.md`'s core rule: *"A conversation mention is not permission to publish, redistribute, or answer as if owned knowledge were fully shared."* Knowledge moves through explicit states — mentioned privately → remembered privately → needs confirmation → approved for a specific scope → published — never skipping a step. **Status: DOCUMENTED-ONLY.**

### Stage D — Discovery grows the network
People find communities, creators, or knowledge relevant to them through search and topic interest — explicitly not through outrage or watch-time optimization. `SOCIAL_GRAPHS_AND_FOLLOWING.md`'s algorithmic posture: growth should come from real value delivered, not engagement-bait mechanics. **Status: DOCUMENTED-ONLY.**

## 4. What this is not allowed to become

Every one of these is already explicitly rejected in the source docs, restated here because a "network effect journeys" document is exactly where a future team might reach for them:
- No public feed with a likes economy (`Opal_PRODUCT_TRUTH.md` — "not this" table).
- No follower count used as a ranking or status signal.
- No phone number required to follow someone publicly.
- No auto-publish of anything inferred from a private conversation.
- No creator marketplace mechanics in this phase.
- No optimizing discovery for engagement over relevance.

## 5. Why this is last in the journey, not first

`OPAL_COMPLETE_SOCIAL_JOURNEY.md` places network effects as the final stage of the arc, after multi-context private relationships are established — not because audience features are unimportant, but because the trust and consent machinery they'd need to be safe (permissioned knowledge states, scope-approval flows) doesn't exist yet, and building audience-scale reach ahead of that machinery is precisely how "mention becomes publication" accidents happen. The two source documents agree with this sequencing implicitly — both are written as pure architecture with zero build claims, unlike the 1:1 messaging docs, which describe things that at least partially exist.

## 6. Status summary

Nothing described in this document exists in code. `CLAUDE_REPOSITORY_UNDERSTANDING.md` §4–6 confirms: no audience-graph schema, no follow mechanism, no knowledge-object lifecycle implementation anywhere in `apps/opal_core`, `apps/opal_web`, or `apps/opal_mobile`. This is the most purely aspirational document in this handoff, by design — it exists so the vision is recorded in one place without anyone mistaking it for a near-term roadmap.
