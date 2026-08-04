# Social graphs and following — Phase 0

**Status:** Product architecture only. **Not shipped.**  
Does not block Social Flow 18. Does not depend on foundation runtime.

## Why two graphs

Opal must support Grandma (private family) and a public creator (asymmetric audience) without turning every connection into a phone-book relationship or a noisy feed.

## 1. Relationship graph

Mutual, accepted, higher trust.

**Examples:** friends, family, partners, private groups, approved youth contacts.

**Entry paths:**

- phone contact (trusted relationship formation)
- invitation
- QR code
- private link
- explicit acceptance

**Carries:** stronger permission, personal nuance eligibility under policy, private knowledge scopes.

## 2. Audience graph

One-way or asymmetric following.

**Examples:** influencers, chefs, musicians, coaches, pastors, artists, local experts, public businesses, community organizers.

**Entry paths:**

- username or handle
- public profile
- QR code
- shared creator link
- topic search
- verified creator discovery
- contextual recommendation

**Does not grant:**

- phone-number access
- direct-message access
- private nuance access
- precise location access
- friend status
- visibility into private relationships

A creator may have 100,000 followers and only 50 accepted private relationships.

## Product rules (hard)

| Rule | Meaning |
|------|---------|
| Friend ≠ follower | Mutual relationship is not audience follow |
| Follower ≠ private relationship | Follow is asymmetric and lower trust by default |
| Public creator knowledge ≠ private conversation | Streamable knowledge objects only |
| Mention ≠ publication | Conversation text is not a knowledge object |
| AI inference ≠ owner-authored knowledge | No fabricating Grandma’s recipe |
| Phone not required for public follow | Phone stays for trusted relationship formation |

## Discovery

Public handles, profiles, QR, topic search, verified creators.  
**Not:** harvesting address books for public following.

## Interaction permissions (separate from follow)

Creators may allow independently:

- follow only
- questions on published knowledge objects
- paid questions (later)
- group discussion
- limited direct messages
- no direct messages
- invitation-only conversation

Questions should attach to knowledge objects when possible, not flood private inboxes.

## Algorithmic posture

Optimize for: conversation relevance, permission, provenance, relationship/audience context, freshness, creator authority, collective fit, intention, noise restraint.

Do **not** optimize primarily for: outrage, watch time, compulsive scrolling, popularity, posting volume, follower count, engagement bait.

## Related

- `docs/product/PERMISSIONED_SOCIAL_KNOWLEDGE_PHASE0.md` — knowledge states, audiences, AI retrieval
- `docs/product/OPAL_SOCIAL_COMMUNICATION_AI.md` — social communication hierarchy
