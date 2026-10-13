# Opal Dynamic Relationship Clarification

**Status:** ARCHITECTURE AUTHORITY  
**Synced:** 2026-10-13  
**Pass 2:** LOCKED  
**Composes with:** `OPAL_RELATIONSHIP_ACCESS_MODEL.md` · `RELATIONSHIP_CONTEXT_MODEL.md` · `OPAL_PERMISSION_ARCHITECTURE.md` · `YOU_TRUST_MODEL.md`

```yaml
authority_class: OPAL_DYNAMIC_RELATIONSHIP_CLARIFICATION
pass_2: LOCKED
purpose: examples_are_not_data_models_person_agnostic_relationship_dynamic
```

## Core rule: examples are not data models

Names used in founder conversations (for example Sadeil, Chanelle, family members, friends, coworkers) are **illustrative examples only**.

They must never become:

- hardcoded users  
- fixed relationship types  
- permission defaults  
- product assumptions  
- special cases  

The model must work identically for every Opal user.

**Wrong reading:** “Sadeil + Chanelle = romantic partner permissions.”  
**Correct principle:** Every Opal user has their own identity, relationships, boundaries, contexts, and evolving dynamics. The system dynamically models the relationship between **any** two or more people without assuming what that relationship means.

## The person is not the relationship

Common mistake:

```text
User → Profile → Relationships
```

where the relationship is a fixed label.

Opal instead:

```text
Person
+ Person
+ Relationship Context
+ Time
+ Situation
+ Permission
+ Intent
+ History
+ Current State
```

The relationship itself is dynamic.

## Same person, multiple relationship contexts

A single person may hold many concurrent contexts, each with different permissions and behaviors. Illustrative pattern (names are placeholders, not fixtures):

| Edge | Context shape | Typical permission *experience* (user still decides) | Not automatic |
|------|---------------|------------------------------------------------------|---------------|
| A ↔ B | spouse / private / high trust / shared planning | coordinate plans, preferences, scheduling | unlimited location / finances / all conversations |
| A ↔ C | coworker / professional / limited trust | meetings, availability, work scheduling | personal finances, relationship info, family |
| A ↔ D | childhood friend / high emotional trust / low planning | shared memories, social planning | calendar, location, spending |

Same human. Different relationships. Different permissions. Different behaviors.

## The same human has multiple valid expressions

A person is not one static profile.

Someone can be professional at work, playful with friends, romantic with a partner, protective with children, private when alone, creative when building. None of these are fake.

**Forbidden flatten:**

```text
Person = personality score
Person = preference list
```

**Required:**

```text
Person = stable identity expressed through changing contexts
```

## Relationship context is not a permission shortcut

```text
Relationship type ≠ automatic access
```

- Marriage does not automatically mean unlimited location, conversations, or financial visibility.  
- Friendship does not automatically mean no access.  
- Parent does not automatically mean everything.  

The user decides. Relationship context **informs** the permission experience. It does not replace permission.

## Three separate permission dimensions

| Dimension | Question | Example |
|-----------|----------|---------|
| **Understanding** | May Opal learn/use this for alignment? | Prefers quiet restaurants |
| **Action** | May Opal perform an action? | Schedule dinner (Suggest → Prepare → Execute) |
| **Disclosure** | May another person/group see this? | Private “cheaper options this month” may **use** for affordable Suggest; must not **disclose** “has money problems” |

Understanding / Action / Disclosure are independent. Use ≠ disclose remains mandatory (`OPAL_RELATIONSHIP_ACCESS_MODEL.md`).

## Groups are dynamic entities

Opal models:

```text
Person ↔ Person
Person ↔ Group
```

A group is not an average person. A group has shared purpose, shared history, individual members, different permissions, and different contexts.

Example pattern: a community group may know “A attends.” It does not automatically know A’s private relationship struggles. Group scope **must not inherit** every member’s private context.

## Time changes relationship context

```text
Stranger → Friend → Close Friend → Partner → Family
```

```text
Relationship evolution ≠ automatic permission escalation
```

Relationship change creates an opportunity to **revisit** permissions. Templates may propose a diff; the user accepts or declines.

## Opal’s core algorithmic goal

Opal does not ask only “Who likes what?”

Opal asks:

> What creates alignment between these specific people in this specific moment?

Inputs:

```text
People involved
+ Relationship context
+ Current situation
+ Time
+ Location
+ Intent
+ Available permissions
+ Constraints
```

Output is not “Person A wins.”  
Output is “the most aligned option for this situation.”

## Founder thesis

Opal is not a better contact list.

Opal is a **dynamic relationship intelligence layer**.

Not: remember everything about everyone.  
But: understand what matters, when it matters, for the right people, with the right permission.

## Drift guard (agents)

| Bad model | Opal model |
|-----------|------------|
| Everyone gets a profile; relationships are labels; permissions are settings | Every person exists inside a living network of relationships, contexts, moments, permissions, and shared experiences |
| Center point = person | Center point = **alignment between people in context** (gyroscope) |

## Implementation constraints (this clarification)

- No hardcoded founder names in schemas, seeds-as-product, permission templates, or Center logic.  
- Fixture / Walk identities remain **test fixtures**, not product ontology.  
- Template keys are abstract (`romantic_partner`, `coworker`, …), never person-named.  
- Pass 2 Understanding Candidates remain inactive until unlock.  

## Related

- `OPAL_RELATIONSHIP_ACCESS_MODEL.md`  
- `RELATIONSHIP_CONTEXT_MODEL.md`  
- `OPAL_CONTEXT_ALIGNMENT_ENGINE.md`  
