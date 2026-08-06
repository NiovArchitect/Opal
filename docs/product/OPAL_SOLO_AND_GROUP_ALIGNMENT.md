# Opal — Solo and Group Alignment

**Status:** Product mapping document — extends `OPAL_SPEED_TO_ALIGNMENT.md` to more-than-one-relationship shapes
**Authority:** Descriptive; every capability below inherits the ship-gates already set in its source documents
**Last updated:** 2026-08-05

---

## 1. Scope

Two shapes beyond 1:1 that Opal's product-truth corpus already designs for, but that are **not** in current MVP scope: **solo** (a single person navigating discovery, travel, or local experience with Opal's help, with no other person in the loop) and **group** (three or more people — friend groups, families, travel groups, study groups, communities — coordinating together). Both are described in real detail across existing docs; this document is the first place they're framed together as a pair, since they share a structural problem: aligning one changing thing (a person's preferences, or a set of people's preferences) against real-world options.

## 2. Solo alignment

A person traveling alone, discovering something local, or making a decision with no one else in the conversation still has an alignment problem — between what they want and what's actually available. This is the same "collective fit" machinery in `OPAL_DYNAMIC_SOCIAL_EXPERIENCE_INTELLIGENCE_PHASE0.md`, applied to a group of one. Nothing in the existing docs treats solo use as a lesser case — the experience-compatibility and restraint-engine concepts apply the same way, they just don't need a consensus step.

**Status: DOCUMENTED-ONLY.** No solo-discovery feature exists in the codebase. `LOCATION_ALIGNMENT_ENGINE.md` covers the location half of this in more depth.

## 3. Group alignment

### 3a. What makes group alignment different from 1:1
With two people, alignment means closing one gap. With a group, it means finding what's true for everyone at once without exposing anyone's private reasons. The product's own rule for this is exact and already locked: **"collective fit, not average fit."** A recommendation may say *"this works for everyone's current plans"* — it must never say *"we picked this because Maya can't afford the other place"* (`OPAL_DYNAMIC_SOCIAL_EXPERIENCE_INTELLIGENCE_PHASE0.md`). This is a direct extension of `OPAL_AUTHENTIC_ALIGNMENT.md` §3's "average-fit disguised as collective-fit" failure mode — group alignment is where that failure mode actually bites, so the safeguard has to be structural, not just a copy rule.

### 3b. The relationship shapes this covers
Every one of these already has a named, canonical context in `OPAL_RELATIONSHIP_CONTEXTS.md`: `family_group`, `trusted_group`, `extended_family`, `community`, plus emerging travel/study/church/sports groupings described in `OPAL_DYNAMIC_SOCIAL_EXPERIENCE_INTELLIGENCE_PHASE0.md` as *dynamic* (inferred, overlapping, time-varying) contexts layered on top of the durable ones.

### 3c. Family as the first real group case
Family coordination is the most fully designed group case in the corpus — `OPAL_AGE_AUTHORITY_TIERS.md`, `OPAL_GUARDIAN_BOUNDARIES.md`, `OPAL_CHILD_TO_CHILD_SOCIAL_FLOW.md` — but it is also the most tightly ship-gated. **This must not be read as build authorization.** The product's own rule: *"MVP / first engineering populations remain adult-only until legal and child-safety gates close"* (`RELATIONSHIP_SAFETY_RULES.md`), and child-to-child messaging is explicitly `"ACCEPTED direction: NO"` for the first slice (`OPAL_OPEN_DECISIONS_RELATIONSHIP_UNIVERSE.md`, RU-030). An **adult-only** group — a family of adults, a group of adult friends planning a trip — is not blocked by this gate and is the realistic near-term group case.

### 3d. Status
**DOCUMENTED-ONLY across the board.** Group messaging itself is explicitly deferred from MVP (`MVP_BOUNDARY.md`: "Group chat | Complexity"). The domain schemas that would eventually support it (plan proposals, shared plans, participation state — `OPAL_SOCIAL_FLOW_PRODUCT_TRUTH.md` domain primitives) exist in the Elixir `social_flow/` namespace as SOURCE-COMPLETE building blocks, but nothing wires them into a live group experience.

## 4. Why solo and group both defer to the same alignment model

Both are the same underlying question restated: *what does this person (or these people) actually need, and how little do we need to ask to find out?* — which is exactly `MINIMUM_QUESTION_ENGINE.md`'s job, extended from one recipient to n. Neither solo nor group alignment introduces a new consent model; both inherit `CONSENT_MODEL.md`'s L0–L4 layers directly (a group plan still requires each participant's own consent to be included, never one person's consent standing in for the group's).

## 5. Recommended sequencing, if this becomes buildable work

Not a commitment, just an ordering that respects the constraints already established: solo discovery (no new relationship-consent surface, only a location/preference surface — see `LOCATION_ALIGNMENT_ENGINE.md`) is structurally simpler than any group feature, and an adult-only trusted-group case is simpler than family. Nothing here should be started without founder sign-off per `SYSTEM_CONTEXT.md`'s external-provider gating, since real group coordination (restaurant availability, travel booking) implies the same provider dependencies flagged throughout `docs/architecture/`.
