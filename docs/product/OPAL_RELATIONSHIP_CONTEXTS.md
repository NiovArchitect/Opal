# Opal Relationship Contexts

**Authority:** ACCEPTED PRODUCT TRUTH  
**Status:** Foundational product vocabulary for Social Flow and relationship intelligence  
**Related:** `OPAL_SOCIAL_FLOW_PRODUCT_TRUTH.md`, `OPAL_RELATIONSHIP_INTELLIGENCE_PRINCIPLES.md`, `OPAL_RELATIONSHIP_ACTIVATION.md`, `RELATIONSHIP_SAFETY_RULES.md`, `CONSENT_MODEL.md`  
**Branch context:** `docs/social-flow-relationship-universe` (documentation only; no implementation in this PR)

---

## Purpose

This document defines **relationship contexts**: product-level roles and care circles that govern how Opal may offer Social Flow, privacy defaults, and coordination capabilities.

Relationship contexts are **product concepts**. They are not required to map 1:1 to database enums, API codes, or UI hard-modes. Storage may use flexible labels, edges, and capability grants. What must stay stable is the **user meaning** and the **safety rules** attached to each context family.

---

## Locked product statement

> **Every meaningful coordination surface in Opal sits inside a relationship context the user understands and can correct.**  
> Opal may notice that a conversation looks like family, friendship, or partnership — but **only the user (and, for minors, guardian rules where required) confirms what the relationship is and which capabilities apply.**

Relationship contexts exist so that:

- coordination help is **proportionate** to the relationship;
- private care work stays isolated from shared plans;
- family coordination is a **first-class** product surface, not an afterthought;
- sensitive labels are never invented from traffic volume alone.

---

## Core principles

1. **User-confirmed labels.** Opal may *suggest* a likely context; the user *accepts, edits, or declines*.  
2. **Frequency is not identity.** Message volume may surface a candidate conversation for Social Flow; it must **not** auto-label someone as spouse, parent, or “most important.”  
3. **Parents, children, and child-to-child are first-class.** They are not edge cases bolted onto an adult-romantic product.  
4. **Family Social Flow is core.** Household and multi-household family coordination is part of Opal’s primary value — gated by age, consent, and guardian rules, not deferred forever as “later maybe.”  
5. **No public ranking of relationships.** No leaderboard of closeness. No “most important contact.” No Social Score (visible or hidden).  
6. **Context is blast radius.** Capabilities, memory, and plan visibility stay inside the confirmed context unless the user intentionally bridges them.  
7. **Sensitive labels require higher care.** Romantic, family-of-origin, caregiver, and minor-related contexts need clearer confirmation and stricter defaults.  
8. **Custom is allowed.** Real life is messy; users may define contexts that do not fit the catalog.

---

## Canonical relationship context catalog

These identifiers are **product vocabulary**. Implementation may store them as free-form labels with optional type hints, normalized codes, or edge metadata.

| Context ID | Product meaning | Typical coordination | Confirmation sensitivity |
|------------|-----------------|----------------------|--------------------------|
| `romantic_partner` | Partnered romantic relationship (not necessarily cohabiting or married) | Dates, trips, shared plans, private gift/surprise prep | High |
| `spouse` | Married / civil partnership / equivalent long-term legal or household partnership as **user-described** | Household + romantic coordination; may overlap family_group | High |
| `parent_child` | Adult (or guardian) relating **to their child** | Pickup, school, practice, health logistics, family plans | High; minors → guardian rules |
| `child_parent` | Child relating **to their parent/guardian** | Same logistics from child surface; age-tier capability limits | High; minors → guardian rules |
| `sibling` | Brothers, sisters, step-siblings as user-confirmed | Family events, shared travel, sibling coordination | Medium–high |
| `minor_friend` | Friendship where one or more parties are minors | Playdates, school activities — **strict capability and contact rules** | Very high |
| `adult_friend` | Adult friendship | Social plans, groups, travel among adults | Medium |
| `extended_family` | Aunts, uncles, grandparents, cousins, in-laws, etc. | Holidays, multi-household events | Medium |
| `family_group` | Multi-person family circle (household or multi-household) | Family plans, shared calendars of agreement, group logistics | High |
| `trusted_group` | Small non-family trusted circle (e.g. close friends group) | Group plans, polls, shared prep | Medium |
| `caregiver_dependent` | Care relationship that is not only parent_child (elder care, disability support, nanny/guardian logistics as user-defined) | Appointments, handoffs, responsibilities | High |
| `professional` | Work, client, colleague, professional network | Meetings and professional coordination only; **no intimate defaults** | Medium |
| `community` | Neighbors, faith/community orgs, sports clubs, school parent communities | Events, rosters, group logistics with community norms | Medium |
| `custom` | User-defined relationship that does not fit above | User-selected capability subset | As declared by user |

### Directional family edges

`parent_child` and `child_parent` are **directional product views** of the same real-world bond. They exist so:

- defaults, language, and capability menus match **who is looking**;
- a parent’s private notes about caregiving do not appear as the child’s shared truth;
- age-authority and guardian confirmation attach correctly on the minor side.

They are **not** two independent friendships. Shared family plans may span both views under membership + consent rules.

### Sibling and child-to-child

- **Sibling** is first-class family context.  
- **Minor friend / child-to-child** coordination is first-class in the **product model**, but **implementation and growth features** require dedicated child-safety, guardian, and legal architecture (`OPAL_CHILD_TO_CHILD_SOCIAL_FLOW.md`, age tiers, guardian boundaries — owned by child-safety track).  
- Product truth: child-to-child is real life Opal must eventually support safely. Product law: **no unrestricted child-to-child Social Flow** until those gates pass.

---

## What relationship context is *not*

| Not this | Why |
|----------|-----|
| A forced single enum per contact | People can be coworker **and** friend; parent **and** emergency contact |
| A Social Score or closeness rank | Forbidden (`SF-D007`, relationship intelligence principles) |
| Auto-inferred permanent identity from chat volume | Frequency is discovery only (see activation doc) |
| Permission to run always-on analysis | Consent and activation still required |
| A public graph others can browse | Relationships are private unless the user intentionally shares membership |

Multiple contexts may apply over time (e.g. `adult_friend` → later `trusted_group` member). Users may refine labels; history of labels is not a weaponizable score.

---

## Detection vs confirmation

### Allowed (proposal only)

Opal may privately notice signals such as:

- repeated coordination language (“pickup,” “practice,” “our anniversary”);
- address book or user-provided labels (when present);
- user-initiated “this is my family” / “this is work” settings;
- group membership patterns the user already created.

Opal may then **ask**, with uncertainty language:

> “This conversation looks like family coordination. Is that right?”  
> Options: Parent / child · Sibling · Extended family · Something else · Not family · Don’t help here

### Forbidden

- Setting `spouse`, `romantic_partner`, `parent_child`, or `minor_friend` solely because two people message often.  
- Saying “X is your most important relationship.”  
- Ranking contacts by intimacy for the user or for any ranking product.  
- Inferring clinical, legal, or abuse labels as relationship types.  
- Quietly reusing a romantic context inside a work or family circle.

### Minors and confirmation

When age policy indicates a participant is a minor:

- Confirmation of sensitive contexts and of Social Flow activation may require **guardian involvement** appropriate to age tier (exact cutoffs: LEGAL_OR_POLICY; do not invent final law in this doc).  
- Minors must not be treated as a simple “small adult” variant of the adult product (`RELATIONSHIP_SAFETY_RULES.md`).  
- Until age tiers and guardian boundaries are accepted and implemented, **shipping surfaces assume adult test populations** except for explicitly bounded, safety-reviewed family journeys defined in build slices.

---

## Family Social Flow (core)

Family is not a secondary mode of a dating-assistant product. Family Social Flow covers:

- parent ↔ child logistics (pickup, school, practice, activities);
- multi-parent / multi-household coordination when consented;
- sibling and extended family events;
- household responsibilities and caregiver handoffs;
- shared family plans that still protect **private parent-only** (or private adult) notes.

### Family rules of care

| Rule | Meaning |
|------|---------|
| Private parent care stays private | “Talk to coach about attitude” must not land on the child’s shared plan surface |
| Child surfaces are age-limited | Capabilities shrink by age authority tier |
| Guardian gates apply | Activation and certain capabilities require guardian confirmation by age |
| No stranger–child Social Flow | Adult with no trusted relationship to a child does not get family coordination affordances with that child |
| No unrestricted child-to-child | First-class in model; gated in product ship criteria |
| Circle isolation | Family plan intelligence does not leak into work or public community contexts |

Romantic Social Flow (partner/spouse) remains equally first-class. The product has **multiple first-class context families**, not one romantic core with family as a plugin.

---

## Capability posture by context family (product defaults)

Defaults are **starting postures**, not hard-coded scenario products. Users still choose which capabilities to enable (see `OPAL_RELATIONSHIP_ACTIVATION.md`).

| Context family | Default posture | Notes |
|----------------|-----------------|-------|
| Romantic / spouse | Rich coordination + strong private care isolation (gifts, surprises) | Shared plan ≠ private prep |
| Parent / child / family_group | Logistics-first: pickup, school, practice, household | Age + guardian gates |
| Sibling / extended_family | Event and travel coordination | Often multi-household |
| Caregiver_dependent | Responsibility and handoff heavy | High privacy; no scoring of “care quality” |
| Adult friend / trusted_group | Social plans, polls, group availability | Standard adult consent |
| Professional | Meeting/scheduling tone; no intimate memory defaults | No romantic inference |
| Community | Group logistics; weaker intimate defaults | Roster/event patterns |
| Minor friend / child-to-child | Minimal until safety architecture lands | Explicit future track |
| Custom | Empty capability set until user chooses | Safest default |

---

## Surfaces and language

Users should see plain language, not internal IDs:

- “Partner” / “Spouse” / “Family” / “Friend” / “Work” / “Community” / “Something else”  
- Optional detail: “This is my child” / “This is my parent” / “Sibling”  

Never:

- “Priority rank #1”  
- “Relationship health: 87”  
- “Top contact by intimacy model”

---

## Mapping to Social Flow domain primitives

Relationship context **scopes** Social Flow primitives (`OPAL_SOCIAL_FLOW_PRODUCT_TRUTH.md`); it does not replace them.

| Primitive | Context influence |
|-----------|-------------------|
| Plan proposal | Wording and which capabilities may activate |
| Availability grant | Who may compute/reveal free-busy |
| Shared plan | Membership limited to context-appropriate participants |
| Commitment | Private vs shared by context and user choice |
| Personal hold / private care | Especially strict in romantic and parent contexts |
| Relationship memory | Only after activation + consent; dual consent when shared |

---

## Explicit non-goals

- Building a public social graph of relationship types  
- Monetizing relationship labels or ranking  
- Auto-assigning legal family status from app behavior  
- Replacing human judgment about who “counts” as family  
- Using context labels for advertising  
- Shipping unrestricted youth growth loops under the cover of “family features”

---

## Alignment and authority

This document **extends** and does not weaken:

- `OPAL_SOCIAL_FLOW_PRODUCT_TRUTH.md`  
- `OPAL_RELATIONSHIP_INTELLIGENCE_PRINCIPLES.md`  
- `RELATIONSHIP_SAFETY_RULES.md`  
- `CONSENT_MODEL.md`  
- `OPAL_CONTEXT_AUTHORITY.md`

Where historic source material implied Social Score, staking, or automatic intimacy ranking: **rejected**. Preserve coordination capability; reject harmful mechanisms.

### Open product / policy items (do not invent closure here)

- Exact legal age cutoffs and guardian confirmation UX per jurisdiction  
- Whether `spouse` and `romantic_partner` share one settings template by default  
- Multi-context contacts (e.g. sibling who is also coworker): primary UI pattern  
- Full child-to-child activation criteria (owned with child-safety docs)

---

## One-line summary

**Relationship contexts are user-confirmed coordination worlds — family and children included as first-class — never auto-ranked intimacy scores inferred from chat volume.**
