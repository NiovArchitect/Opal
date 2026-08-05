# Opal Dynamic Social and Experience Intelligence — Phase 0

**Status:** ACCEPTED PRODUCT TRUTH (Phase 0 documentation only)  
**Date:** 2026-08-05  
**Authority:** Founder product-intelligence directive (compounds; does not replace)  
**Not shipped.** Algorithms are not live. Location is not live. Providers are not live.  
**Does not close Social Flow 18.** Does not open Social Flow 19.

---

## Importance

This document does **not** replace existing Opal product truth, architecture, Social Flow history, security rules, privacy boundaries, UI decisions, repository state, or execution plans.

It **compounds** them.

Preserve everything already accepted about:

- Social Flow 17 and Social Flow 18
- selected-contact onboarding
- relationship acceptance
- conversation authority
- realtime
- private versus shared signals
- permissioned social knowledge
- creator and audience concepts
- Opal Social Foundation separation
- Kafka readiness (not hosted Opal dependency)
- Elixir and BEAM authority
- Phoenix realtime
- AVP² direction
- no noisy feed
- no friendship scoring
- no private surprise leakage
- no user-facing technical jargon
- no em dashes in product-facing copy

---

## 1. Core product correction

**Users should not manage social intelligence. They should experience its results.**

Opal must not require users to manually do most of the organizational, relationship, preference, group, planning, or experience-curation work.

The intelligence must happen primarily on the backend.

The user should usually experience only one of three things:

1. **Nothing**, because Opal correctly stays out of the way  
2. **One lightweight confirmation**  
3. **One useful opportunity** surfaced at the right moment  

Or, equivalently: nothing, one lightweight correction, one confirmation, or one private choice.

Everything else is backend reasoning.

### Forbidden product shapes

Do not turn Opal into:

- homework
- a stack of setup forms
- continuous circle definition
- relationship labeling chores
- preference data entry
- membership maintenance UI as the product
- friend ranking
- isolated feature checklist (messenger + calendar + contacts + feed)

### Allowed user effort

| Effort | When |
|--------|------|
| Nothing | System is confident and silent is correct |
| One confirmation | High-value option ready; user says yes/no |
| One correction | User teaches the model from normal language |
| One private choice | Audience, privacy, or participation boundary |

---

## 2. Product promise (compounding)

### Strong internal product statement

> Opal understands how you relate to people and the world around you, then helps the right experiences take shape with almost no work.

### Complementary accepted truth

> Opal helps people collaborate with one another’s experiences.

These are complementary. Neither reduces Opal to messaging, planning, calendaring, contacts, followers, recommendations, memberships, creator content, location services, reservations, or AI chat alone.

Each of those is a **component**. The product is the **intelligence that connects them**.

### Sticky product loop

```text
conversation
  → understanding
  → curation
  → real-world experience
  → shared digital continuity
  → better future understanding
```

That loop is what can make Opal uniquely sticky without becoming another feed, another chatbot, or another planning tool.

---

## 3. Social Flow 18 is the doorway, not the ceiling

Social Flow 18 proves:

- a real person activates
- finds someone
- invites them
- the other person accepts
- a relationship is created
- a conversation becomes live
- Opal can recognize meaningful movement (architecture exists; device proof still open)

That is **necessary**. It is **not** the full product.

Do not allow Android validation, iOS validation, contact permissions, or infrastructure closure to become the product roadmap. They are **product-enablement gates**.

Current operational truth for Social Flow 18 remains **PARTIALLY COMPLETE**. See `docs/evidence/social-flow-18/CLOSURE_STATUS.md`. This Phase 0 does not change that status.

---

## 4. Backend magic, not user configuration

### Bad product behavior (rejected)

- Create your workout circle.
- Name the group.
- Choose relationship labels for everyone.
- Enter everyone’s preferences.
- Add your budget on every plan.
- Add favorite venues as homework.
- Set availability calendars as the primary path.
- Rank friends by closeness.
- Manage memberships as the main job.

### Correct product behavior

Opal gradually understands from normal life, then may surface:

> You four seem to work out together often. There may be a group option that fits. Want to see it?

That is **one action**, not twelve setup screens.

### User corrects; user does not configure

Corrections are more important than forms. Examples of high-value corrections:

- Not with this group.
- We only do this in summer.
- She does not like loud places anymore.
- Keep that private.
- Do not use work location for this.
- He is a close friend, but not for travel.
- Stop suggesting memberships.
- Ask me before involving anyone else.

The system must adapt quickly from a small correction.

---

## 5. Circles are mostly inferred, not created

People belong to many overlapping contexts at once:

- workout friends
- church friends
- close friends
- coworkers
- travel companions
- parents from school
- people who like live music
- people nearby tonight
- friends who spend similarly
- friends who like spontaneous plans
- friends who need advance notice

These groups are not always permanent, named, or consciously recognized.

**Product law:** Model them as **dynamic relationship contexts**, not force people to formally create groups for every pattern.

A person may be:

- part of your dinner group this week
- part of your travel group twice a year
- someone you trust for advice
- someone nearby right now
- someone you follow for knowledge
- someone you rarely message but consistently enjoy at concerts

That complexity belongs in the **algorithm**, not the **interface**.

### Relation to existing relationship-context catalog

`OPAL_RELATIONSHIP_CONTEXTS.md` remains accepted for **sensitive, durable labels** (family, romantic, minor, caregiver) that require clear confirmation and safety rules.

This Phase 0 **adds** a second layer:

| Layer | Nature | User burden |
|-------|--------|-------------|
| Sensitive durable contexts | User-confirmed (and guardian rules for minors) | Light confirmation when high-stakes |
| Dynamic experience contexts | Mostly inferred; overlapping; time-varying | Corrections preferred over setup |

Formal circle creation remains optional power for users who want it. It must never be the default path to value.

---

## 6. Living social model (relationship state)

Opal needs a continuously updated social model around:

### Relationship strength (internal only)

Not a visible score. Internal understanding of:

- frequency
- recency
- reciprocity
- shared experiences
- follow-through
- emotional tone (careful, uncertain, never as certainty theater)
- context-specific compatibility
- mutual participation

**Hard ban:** no friendship score, no social worth UI, no leaderboard of closeness, no “most important contact” ranking.

### Relationship type (multi-label)

The same two people may simultaneously be friends, coworkers, gym partners, creative collaborators, and neighbors.

Opal must not force one exclusive label.

### Experience compatibility

Two people may be close friends but poor travel partners.  
Another person may be an occasional friend but an excellent concert companion.

Compatibility is **by experience type**, not a single affinity number.

### Social timing

Who is nearby, free soon, likely receptive, already involved, overcommitted, waiting on someone else, usually spontaneous, or usually advance-planning.

### Personal constraints (permissioned)

With permission, and without restating every time:

- budget comfort
- dietary needs
- mobility
- transportation
- sensory preferences
- scheduling patterns
- location tolerance
- family obligations
- energy level
- social preferences

---

## 7. The experience engine

The true product is an **experience-curation engine** powered by social understanding.

It combines signals such as:

```text
Person
Relationship context
Current conversation
Location (permissioned)
Time
Availability
Preferences
Past experiences
Participation
Group fit
Provider inventory
Cost
Travel friction
Weather
Events
Social sensitivity
Permission
```

Then produces a **small number of high-quality possibilities**.

Not a feed.  
Not hundreds of options.  
Not “here are 42 restaurants.”

Something more like:

> This quiet Italian place is 11 minutes from all three of you, fits Maya’s dietary needs, has a table after Jordan gets off work, and is similar to places your group has liked before.

That is materially different from ordinary recommendation software.

### Collective fit, not average fit

Most systems optimize for one user. Opal optimizes for the **actual people involved**.

A simple average can produce a bad result. If one person needs quiet, one has a strict budget, one is vegetarian, one is farther away, and one wants adventure, Opal must not average those into a mediocre venue.

It should find the option that satisfies the most important constraints **without exposing private reasons**.

Group may see:

> This option fits everyone’s current preferences.

Not:

> We chose this because Maya cannot afford the other place.

Private constraints stay private unless the owner chooses to share them.

---

## 8. Location: helpful, never surveillant

Location can make Opal extraordinary. Continuous public tracking makes it creepy.

**Correct model:** permissioned, purpose-bound situational intelligence.

Examples of legitimate use:

- people are already near one another
- a venue is convenient for everyone
- traffic makes one option impractical
- a friend is visiting the user’s city
- an event fits the group’s location and timing
- a membership has useful locations near several participants
- a spontaneous experience is possible now

### Location scopes

| Scope | Meaning |
|-------|---------|
| Approximate area | Coarse only |
| While using Opal | Session-bound |
| For this experience only | Purpose-bound grant |
| Shared with selected people | Explicit audience |
| Used privately for option ranking | Never shown to others |
| Never shown directly to others | Default for ranking |

Opal may know a venue is centrally convenient without telling everyone exactly where each person is.

Extends `LOCATION_COLLECTIVE_FIT.md`. Location remains **not live** in this Phase 0.

---

## 9. Vendors and providers: invisible until useful

Restaurants, gyms, venues, transportation, events, and membership providers can add enormous value.

Users must not feel that vendors have entered their private social life.

### Sequence

1. Opal understands the human context.  
2. Opal recognizes an opportunity.  
3. Opal privately evaluates relevant providers.  
4. Opal filters on permissions and collective fit.  
5. Opal presents one or a few useful options.  
6. Users confirm.  
7. The provider is involved only as needed.

### Hard rules

- A company agent must never behave like a person in the chat.
- The commercial layer serves the social experience; it must not dominate it.
- No provider spam inside private threads.
- No marketplace of friends.
- No turning relationships into inventory for ads.

---

## 10. Restraint engine (most important algorithm)

Every suggestion must answer:

> Should Opal say anything at all?

### Factors

```text
relevance
timing
permission
confidence
social sensitivity
novelty
expected benefit
interruption cost
commercial influence
recent suggestion frequency
```

### Conceptual rule

```text
surface only when
expected social value
is meaningfully greater than
interruption and privacy cost
```

Default is quiet. Silence is a successful product outcome.

Extends the noise budget in `EXPERIENCE_COLLABORATION_AND_NUANCE.md`.

---

## 11. Backend architecture (cooperating intelligence systems)

These are **responsibilities**, not a claim that they are implemented.

| Engine | Responsibility |
|--------|----------------|
| Dynamic relationship graph | Evolving relationships, roles, overlapping contexts |
| Social context engine | What is happening in a conversation or group now |
| Nuance and preference engine | Permitted, time-sensitive preferences and corrections |
| Participation engine | Who is actually involved in a specific experience |
| Proximity and mobility engine | Geographic convenience without unnecessary exposure |
| Collective-fit engine | Rank options for the people involved |
| Experience curation engine | Coherent possibilities from people, place, time, providers, context |
| Opportunity engine | Shared membership, event, reservation, routine, or benefit moments |
| Privacy and audience engine | What may be used, revealed, shared, or withheld |
| Restraint engine | Whether to surface anything |
| Execution engine | Approved reservations, invitations, payments, memberships, provider actions |
| Learning and correction engine | Outcomes and user feedback updates |

### Authority boundaries (locked)

| Layer | Role |
|-------|------|
| Elixir / BEAM / Phoenix | Authority: eligibility, privacy, lifecycle, realtime, execution gates |
| Python intelligence services | Propose only: candidates, rankings, drafts under contracts |
| Foundation / Kafka | Separate platform concerns; not required for this Phase 0 truth |
| Mobile / web UI | Light surfaces; no intelligence theater |

Python never silently grants sharing, never impersonates a human in-thread, and never bypasses Elixir admission.

---

## 12. User interface surface (very little)

A strong Opal surface might show:

> This looks promising for the three of you.

Then:

- See why  
- Interested  
- Not this time  
- Keep this private  

Or:

> You are all nearby and free after 7. This event fits what you usually enjoy together.

Then one confirmation.

**Intelligence deep. Interface light.**

Explainability (“See why”) must never expose another person’s private constraints.

---

## 13. Private participation and dignity

Participation states remain first-class (interested, flexible, confirmed, waiting, sitting out) as in experience-collaboration truth.

Additions for Phase 0:

- **Private participation:** a person may be considered for fit without being publicly listed until they opt in.
- **Soft involvement:** “maybe later” without social pressure UI.
- **No exposure of decline reasons** to the group by default.
- **No social load theater:** do not shame quiet people; do not show busyness as status.

---

## 14. Shared access and memberships

Shared access (group memberships, guest benefits, family plans) is an **opportunity class**, not a setup wizard product.

Opal may notice:

- repeated co-use of a gym, streaming, or venue class
- one person already holds a guest benefit
- a nearby group option fits timing and people

Then surface one lightweight opportunity. Never force membership management as the core loop.

---

## 15. Creator and audience continuity

Preserves two-graph model (`SOCIAL_GRAPHS_AND_FOLLOWING.md`, `PERMISSIONED_SOCIAL_KNOWLEDGE_PHASE0.md`):

1. **Relationship graph** — mutual, higher trust  
2. **Audience graph** — asymmetric follow / creator knowledge  

Dynamic experience intelligence may use creator knowledge **only** under permissioned knowledge rules. Following is not friendship. Public content is not private nuance.

Real-world experiences can continue digitally with the people involved (shared memory of the plan, follow-ups, private notes) without becoming a public feed.

---

## 16. Network effects (product, not dark growth)

Desired network effect:

> Bringing friends into Opal creates compounding value because the system understands group fit better with more consented relationship context.

Forbidden network effects:

- viral public feeds
- invite spam pressure
- ranking people as acquisition assets
- vendor-driven friend spam

Growth follows usefulness of shared experiences, not engagement farming.

---

## 17. Algorithmic correction and learning

Learning sources (permissioned):

- outcomes of surfaced options (accepted, ignored, rejected)
- explicit corrections
- completed experiences
- no-shows and friction (careful, non-punitive)
- privacy revocations (highest priority updates)

Corrections outrank older inferences.  
Revocations outrank commercial opportunity.  
Surprise-sensitive privacy outranks helpfulness.

---

## 18. Explainability

When the user asks “See why”:

- Prefer group-safe explanations: distance, open hours, past group likes, dietary fit the owner has made shareable.
- Never reveal another user’s private budget, health, location precision, or rejection of a person.
- Uncertainty language remains mandatory (may, seems, often) unless the user explicitly confirmed a fact.

---

## 19. Privacy, ethics, and youth safety

This Phase 0 inherits and never weakens:

- `CONSENT_MODEL.md`
- `RELATIONSHIP_SAFETY_RULES.md`
- `OPAL_AGE_AUTHORITY_TIERS.md`
- `OPAL_GUARDIAN_BOUNDARIES.md`
- `OPAL_CHILD_TO_CHILD_SOCIAL_FLOW.md`
- Social Flow privacy architecture docs

### Ethical hard stops

- No friendship marketplace
- No covert continuous tracking
- No private surprise leakage
- No social scoring
- No provider-as-person in chat
- No autonomous high-trust actions without approval
- Minors: no unrestricted dynamic experience intelligence until child-safety gates pass
- Age-14 comprehension: product surfaces must remain plain language

---

## 20. What Phase 0 closes (and does not)

### Closed for product truth

- Vision documented  
- User-effort doctrine  
- Dynamic contexts defined  
- Collective fit defined  
- Location boundaries defined  
- Restraint defined  
- Provider boundaries defined  
- Network effects defined  
- Walkthrough review defined  
- Narrow Phase 1 proof proposed  

### Not closed / not live

- algorithms
- location features
- providers
- shared memberships product
- creator following product
- knowledge retrieval product
- reservations
- payments
- Social Flow 18

**Closure language (Phase 0 only):**

> OPAL DYNAMIC SOCIAL AND EXPERIENCE INTELLIGENCE PHASE 0 CLOSED FOR PRODUCT TRUTH, ALGORITHMIC RESPONSIBILITIES, PRIVACY, AND NARROW PROOF DESIGN

---

## 21. Related documents

| Document | Role |
|----------|------|
| This file | Master Phase 0 product intelligence |
| `docs/evidence/dynamic-social-experience-intelligence-phase0/ENGINE_RESPONSIBILITIES.md` | Engine contracts |
| `docs/evidence/dynamic-social-experience-intelligence-phase0/PHASE1_NARROW_PROOF.md` | Narrow next proof |
| `docs/evidence/dynamic-social-experience-intelligence-phase0/WALKTHROUGH_REVIEW.md` | Persona / UX / restraint review |
| `docs/evidence/dynamic-social-experience-intelligence-phase0/CLOSURE_REPORT.md` | Phase 0 closure |
| `EXPERIENCE_COLLABORATION_AND_NUANCE.md` | Journey, nuance, noise budget |
| `LOCATION_COLLECTIVE_FIT.md` | Location boundaries |
| `OPAL_RELATIONSHIP_CONTEXTS.md` | Durable / sensitive contexts |
| `PERMISSIONED_SOCIAL_KNOWLEDGE_PHASE0.md` | Knowledge permissions |
| `SOCIAL_GRAPHS_AND_FOLLOWING.md` | Relationship vs audience graphs |

---

## 22. Final founder instruction (locked)

Do not make users configure Opal.  
Make Opal understand.

Do not make people define every circle.  
Model dynamic context quietly.

Do not make groups exclusive.  
Preserve contextual belonging.

Do not rank friends.  
Do not expose social worth.  
Do not turn relationships into a marketplace.  
Do not let providers invade private conversation.  
Do not overwhelm users with suggestions.  
Build a powerful restraint system.  
Use location to help, not surveil.  
Use private participation to preserve dignity.  
Curate real-world experiences with extraordinary accuracy.  
Let those experiences continue digitally with the people involved.  
Make the product feel alive.  
Make it useful enough that bringing friends into Opal creates compounding value.  
Make the backend sophisticated.  
Keep the interface light.

The user should feel:

- Opal understands.  
- Opal knows when to help.  
- Opal knows when to stay quiet.  
- Opal helps the right experience happen.  

That is the sticky product.
