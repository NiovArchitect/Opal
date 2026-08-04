# REPORT C — OPAL PERMISSIONED SOCIAL KNOWLEDGE PHASE 0

**Date:** 2026-08-03  
**Track:** C only  
**Repository:** Opal (product documentation)  
**Status:** Architecture and product contracts **defined**. **Not shipped.**  

## Status

**PHASE 0 COMPLETE AS DOCUMENTATION**

No production creator features. No public feed. No foundation knowledge topics live.  
Does not block Track A. Does not depend on Track B runtime.

## Core rule (accepted)

**A conversation mention is not permission to publish, redistribute, or answer as if owned knowledge were fully shared.**

Grandma’s “favorite lemon cake” may become a private *candidate*. It must not become a public recipe, a fabricated ingredient list, or an AI answer to Sadeil without ownership, audience, completeness, purpose, attribution, and non-revocation.

## Documents delivered

| Document | Purpose |
|----------|---------|
| `docs/product/PERMISSIONED_SOCIAL_KNOWLEDGE_PHASE0.md` | Lifecycle states, audience scopes, object types, AI retrieval checks, algorithm restraint, foundation event names (later) |
| `docs/product/SOCIAL_GRAPHS_AND_FOLLOWING.md` | Relationship graph vs audience graph; phone not required for follow; interaction vs follow permissions |
| `docs/product/OPAL_SOCIAL_COMMUNICATION_AI.md` | Existing hierarchy: people → conversation → meaning → experience → assistance |

## Two social graphs

### Relationship graph

Mutual, accepted, higher trust. Phone/invite/QR/private link + explicit acceptance. Stronger nuance and private knowledge scopes.

### Audience graph

Asymmetric follow. Handle/profile/QR/topic/verified discovery. **No phone required.** Follow does not grant DM, private nuance, private relationships, or phone access.

## Knowledge visibility scopes (defined)

```text
Private to owner
Private relationship
Selected people
Family circle
Private group
Followers
Subscribers
Public
```

## Lifecycle states (defined)

mentioned_privately · remembered_privately · needs_confirmation · approved_one_person · approved_family · approved_group · approved_followers · published_public · revoked · outdated · incomplete

## AI retrieval contract (when asked later)

1. Does a knowledge object exist (not only a mention)?  
2. Requester within audience?  
3. Purpose match?  
4. Complete enough?  
5. Current version?  
6. Attribution?  
7. Answer directly or ask owner first?  
8. Revoked?

Honest outcomes include family-shared recipe with credit, incomplete-with-ask-owner, or full refuse. Fabrication of “Grandma’s recipe” is forbidden.

## Creator model (defined, not shipped)

Structured owned knowledge objects (recipe, routine, guide, …) with audience, version, provenance, AI retrieval permission, and question permissions.  
Follow ≠ inbox flood. Questions may attach to knowledge objects.

## Algorithmic restraint

Optimize for conversation relevance, permission, provenance, context, freshness, authority, intention, **noise restraint**.  
Do not optimize for outrage, watch time, doomscroll, popularity, volume, follower count, engagement bait.

## Three connected social layers (product direction)

1. **Private relationships** — people you know; mutual permission  
2. **Communities and creators** — people you follow for knowledge without phone  
3. **Contextual social intelligence** — retrieve authorized knowledge at the useful moment  

## Authority

Opal owns ownership, audience, permission, revocation, conversation, journey, and user-facing retrieval.  
Foundation may later carry durable `knowledge.*` events; it never decides social truth.

## Explicit non-claims

- Documentation is not a live feature  
- Following is not a relationship  
- Private mention is not published knowledge  
- No production creator marketplace or feed  
- No phone-required public follow  
- Youth public discovery remains restricted by existing safety docs  

## What not to build next as “Phase 0 ship”

Do not open broad creator features in production.  
Do not convert Opal into a traditional feed.  
Do not merge Track C into SF18 device gates.

## Conclusion (Track C only)

**Permissioned social knowledge and dual-graph model are defined and protected in product truth.**  
**Implementation and production ship remain future phases.**
