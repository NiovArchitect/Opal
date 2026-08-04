# Permissioned Social Knowledge — Phase 0

**Status:** Product architecture and contracts only. **Not shipped.**  
Does not block Social Flow 18. Does not depend on foundation runtime.

## Core rule

**A conversation mention is not permission to publish, redistribute, or answer as if owned knowledge were fully shared.**

Example: Grandma says her favorite cake is the lemon cake her mother made.

Opal may privately notice a knowledge *candidate*. It must not invent ingredients, claim a complete recipe, or answer Sadeil as if Grandma published it—until ownership, completeness, audience, purpose, attribution, and revocation allow.

## Knowledge lifecycle states

| State | Meaning |
|-------|---------|
| mentioned_privately | Appeared in conversation; no knowledge object |
| remembered_privately | Owner-private memory candidate |
| needs_confirmation | Incomplete or ambiguous; ask owner |
| approved_one_person | Explicit share to one relationship |
| approved_family | Family circle |
| approved_group | Private group |
| approved_followers | Audience graph (not relationship) |
| published_public | Public creator knowledge |
| revoked | Access withdrawn |
| outdated | Superseded by newer version |
| incomplete | Exists but not answerable as complete |

## Two social graphs (must not blur)

### 1. Relationship graph (mutual, higher trust)

Friends, family, partners, private groups, approved youth contacts.

Entry: phone, invitation, QR, private link, **explicit acceptance**.

Carries stronger personal nuance and private knowledge scopes.

### 2. Audience graph (asymmetric follow)

Creators, chefs, trainers, experts, public businesses.

Entry: handle, public profile, QR, topic search, verified discovery.

Following does **not** grant: phone access, DM access, private nuance, private relationships, private recipes.

Phone numbers are **not** required to follow public creators.

## Audience scopes (knowledge visibility)

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

## Knowledge object types (future)

recipe · routine · guide · recommendation · technique · itinerary · story · product_list · experience_template · lesson · collection

### Recipe object (illustrative fields)

Owner · Title · Ingredients · Steps · Notes · Provenance · Audience · Version · Updated · Attribution · Allowed reuse · AI retrieval permission · Question permissions

## AI retrieval rules

When asked “What is Grandma’s lemon cake recipe?” Opal must check:

1. Does a recipe object exist (not only a mention)?  
2. Is the requester within audience?  
3. Purpose match?  
4. Complete enough to answer?  
5. Current version?  
6. Attribution required?  
7. May answer directly, or must ask owner first?  
8. Revoked?

Honest responses:

- “Grandma shared this with family. Here is her version.”  
- “Grandma mentioned the cake, but has not shared the full recipe. Want to ask her?”  
- Refuse: fabrication of missing ingredients as “Grandma’s recipe.”

## Algorithmic restraint

Optimize for: relevance to conversation, permission, provenance, relationship/audience context, freshness, creator authority, collective fit, intention, **noise restraint**.

Do not optimize primarily for: outrage, watch time, doomscroll, popularity, volume, follower count, engagement bait.

Contextual offer (good):

> A creator you follow has a lemon cake recipe that fits what you described.

Not: twenty cake videos on the home screen.

## Creator interaction vs follow

Separate permissions: follow-only · questions on knowledge objects · limited DM · invite-only conversation · no DM.

Questions should attach to knowledge objects when possible, not flood private inboxes.

## Foundation events (later; not Phase 0 runtime)

`knowledge.created` · `updated` · `published` · `permission.granted` · `permission.revoked` · `followed` · `question.asked` · `answer.approved` · `version.superseded`

Opal remains authoritative for ownership, audience, permission, revocation, and whether AI may reveal.

## What Phase 0 does not ship

- Public feed  
- Follower counts as product ranking  
- Phone-required follow  
- Automatic publish from private mention  
- Production creator marketplace  
- Foundation knowledge topics live  

## Personas (design, not device proof)

| Persona | Graph | Knowledge |
|---------|-------|-----------|
| Grandma | relationships only | family recipes |
| Influencer chef | audience + few relationships | public + follower collections |
| Friend | relationship | private techniques |
| Youth | restricted | no public discovery |
