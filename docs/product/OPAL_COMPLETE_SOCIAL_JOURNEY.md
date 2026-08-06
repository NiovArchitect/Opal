# Opal — Complete Social Journey

**Status:** Product mapping document — synthesizes existing accepted docs into one journey view
**Authority:** Descriptive, not authorizing; every stage below cites its actual build status
**Last updated:** 2026-08-05

---

## 1. Purpose

The product-truth corpus defines relationship types, activation flows, and journey stages across a dozen separate documents. No single place shows the whole arc a relationship travels through in Opal, from two strangers to an established, multi-context social life. This document is that map — and, per the ship-gating already established in the docs it draws from, it is explicit at every stage about what's built versus modeled.

## 2. The arc

```
Discovery/Invitation → First conversation → Activation of Social Flow →
Relationship context confirmed → Ongoing coordination → Expansion to
new capabilities → Multi-context life (family, groups, communities) →
Network effects (following, discovery)
```

Each stage below: what it is, which existing document owns it, and its real build status (drawn from `CLAUDE_REPOSITORY_UNDERSTANDING.md`).

## 3. Stage detail

### Stage 1 — Discovery / Invitation
A person is invited by someone they already know (phone-based), or discovers someone through voluntary, limited contact matching — never bulk address-book harvest. Owned by `OPAL_CONTACT_ONBOARDING.md`. **Status: SOURCE-COMPLETE, SYNTHETIC** — real invitation domain code and web/mobile flows exist; SMS delivery is blocked (B001), so every real invitation today happens over a link, not a text.

### Stage 2 — First conversation
Ordinary 1:1 messaging, no relationship context assigned yet. Owned by `MESSAGING_RUNTIME.md`, `MVP_BOUNDARY.md`. **Status: SOURCE-COMPLETE, HOSTED-SYNTHETIC** — this is the most-built part of the product: real Phoenix Channels, presence, delivery acks, proven in-browser on the hosted Render instance with synthetic identities.

### Stage 3 — Social Flow activation
Opal notices coordination might help and asks narrowly which of 1–3 candidate contexts should get it — never activates from message volume alone. Owned by `OPAL_RELATIONSHIP_ACTIVATION.md`. **Status: DOCUMENTED-ONLY** — the seven-step activation flow is fully specified; no activation UI exists yet.

### Stage 4 — Relationship context confirmed
The person confirms (never Opal alone) which of the 14 canonical contexts applies — `romantic_partner`, `sibling`, `adult_friend`, `family_group`, etc. Owned by `OPAL_RELATIONSHIP_CONTEXTS.md`. **Status: DOCUMENTED-ONLY** — vocabulary and detection-vs-confirmation rules are locked; no context-assignment code exists.

### Stage 5 — Ongoing coordination
Plan proposals, availability grants, commitments, follow-through — the full Social Flow domain primitive lifecycle. Owned by `SOCIAL_FLOW_ARCHITECTURE.md`, `OPAL_SOCIAL_FLOW_PRODUCT_TRUTH.md`. **Status: SOURCE-COMPLETE (domain schemas + tests), not exposed as a live feature** — 99 Elixir schema modules and ExUnit coverage exist for this domain; there is no live coordination UI proving the full lifecycle end-to-end with real people.

### Stage 6 — Expansion to new capabilities
Value earns trust, trust earns scope — plan recognition expands to shared availability, then commitments, then richer family/travel/gift capabilities, gated by consent at each step (never by a hidden threshold). Owned by `OPAL_RELATIONSHIP_ACTIVATION.md` §expansion model. **Status: DOCUMENTED-ONLY.**

### Stage 7 — Multi-context life
The same person relates differently across contexts — partner, sibling, coworker, church group — each with its own blast radius and no cross-context leakage. Owned by `OPAL_RELATIONSHIP_CONTEXTS.md`, `OPAL_DYNAMIC_SOCIAL_EXPERIENCE_INTELLIGENCE_PHASE0.md`. **Status: DOCUMENTED-ONLY**, and explicitly ship-gated for anything touching family/minors — see `RELATIONSHIP_SAFETY_RULES.md`: "MVP / first engineering populations remain adult-only until legal and child-safety gates close." Detailed in `OPAL_SOLO_AND_GROUP_ALIGNMENT.md`.

### Stage 8 — Network effects
Following, audience graphs, permissioned knowledge discovery, community discovery. Owned by `SOCIAL_GRAPHS_AND_FOLLOWING.md`, `PERMISSIONED_SOCIAL_KNOWLEDGE_PHASE0.md`. **Status: DOCUMENTED-ONLY, "Not shipped"** (both source docs' own words). Detailed in `OPAL_NETWORK_EFFECT_JOURNEYS.md`.

## 4. What this map makes visible

Two things become obvious only by putting the stages side by side:

**First,** the product has one stage (Stage 2, first conversation) that is genuinely built and hosted, and everything after it — activation, context confirmation, ongoing coordination as a live feature, expansion, multi-context, network effects — is either domain-complete-but-unexposed or documentation-only. The "complete social journey" described across a dozen product docs is a coherent design, not yet a built product past its first step.

**Second,** the honest MVP boundary (`MVP_BOUNDARY.md`) already says this — "1:1 conversations" is the only in-MVP relationship shape — but that boundary is easy to lose sight of when reading the rich Stage 3–8 documents in isolation, because they're written with the same confident "ACCEPTED PRODUCT TRUTH" header as the stages that are actually built. This document exists so that distinction survives being read out of context.

## 5. Relationship to speed-to-alignment

Every stage in this arc is, underneath, an alignment problem: Stage 1 aligns "I want to talk to you" with "I'm willing to be reached." Stage 4 aligns each person's understanding of what kind of relationship this is. Stage 5 aligns intent with commitment. `OPAL_SPEED_TO_ALIGNMENT.md` is the lens this whole journey should be read through — the question at every stage is not "what feature comes next" but "what gap in shared understanding does this stage close, and how honestly."
