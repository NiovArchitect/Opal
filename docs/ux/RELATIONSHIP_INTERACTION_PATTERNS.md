# Relationship Interaction Patterns

**Authority:** ACCEPTED PRODUCT TRUTH (relationship-sensitive UX)  
**Status:** Interaction design law for Social Flow  
**Related:** `OPAL_RELATIONSHIP_INTELLIGENCE_PRINCIPLES.md`, `RELATIONSHIP_SAFETY_RULES.md`, `VISIBLE_SIGNAL_PRINCIPLES.md`, `SOCIAL_FLOW_VISIBLE_COMPONENTS.md`  
**Owner (this phase):** Relationship UX Specialist

---

## Purpose

Opal does not treat every conversation as the same “user pair.”  
Relationship **context** changes:

- wording,
- what may be suggested,
- who sees private vs shared objects,
- how firm or soft a nudge may be,
- what “help” would feel invasive.

This document defines **humane interaction patterns** by relationship kind — without Social Score, health grades, or certainty theater.

**User-confirmed labels only.** Opal may notice frequency of communication and *ask*; it must not assign “Jordan is your most important relationship.”

---

## Cross-cutting interaction law

| Law | Practice |
|-----|----------|
| Assist, don’t decide | High-trust actions need explicit approval |
| Private ≠ shared | Care work defaults private |
| Uncertainty language | “appear,” “may,” “still might” |
| Dismissible | Every suggestion can end without penalty |
| Circles are blast radius | No romantic context in family/work bleed |
| No coercion tooling | No “proof packs,” no stalking via AI |
| Age authority | Youth patterns only when legally allowed |

---

## Pattern P1 — Partner (romantic / committed pair)

### Emotional architecture

High intimacy, high risk of overreach. Shared plans are frequent; **private care work** is also frequent (gifts, surprises, personal prep).

### What Opal may do

- Soft-propose plans from natural chat (“dinner next week?”).  
- Surface mutual free/busy **after grants**.  
- Track commitments (“I’ll book”) with private or shared progress.  
- Private gift/anniversary reminders never on shared cards.  
- Gentle unfinished-coordination recall (“discussed this trip twice…”).  
- Offline plan-change reconcile.

### What Opal must not do

- Relationship health scores or “you’re drifting” fear pushes.  
- Certainty about partner’s private intent.  
- Auto-share private prep into shared plan.  
- Weaponizable “cancellation stats.”  
- Default always-on analysis of the partner’s mood.

### Humane wording examples

| Situation | Say | Don’t say |
|-----------|-----|-----------|
| Soft plan | “Dinner next week? Thursday after 6:30 looks possible for both of you.” | “Schedule forced for Thursday.” |
| Private gift | “This gift reminder is private.” | (show on shared anniversary event) |
| Unresolved | “This still needs an answer.” | “Your partner is waiting and disappointed.” |
| Trip stall | “You discussed this trip twice but never chose dates.” | “Your relationship planning score is low.” |
| Change | “The plan changed while you were offline.” | Silent rewrite with no review |

### Interaction beats

1. Chat natural → soft proposal card.  
2. Consent to coordinate → options / poll.  
3. Agreement → shared plan card.  
4. Private prep stays in private chrome.  
5. Revision → visible change + optional notify (user-approved).  

---

## Pattern P2 — Parent–child (and guardian–dependent)

### Emotional architecture

Care, logistics, safety, and power imbalance. Parent needs clarity; child needs dignity. **Not** “adult product + parental spy screen.”

### What Opal may do (when age authority allows)

- Family plan objects: practice, pickup, meals, multi-household logistics.  
- Visible signal: “Your daughter’s practice moved to 5:00.”  
- Impact lines: “This may affect school pickup.”  
- Commitments: “You offered to pick him up.”  
- Youth-originated asks surfaced to guardian when product rules require: “Your son asked whether his friend can come.”  
- “Turn this conversation into a shared family plan?”

### What Opal must not do

- Covert full-content surveillance framed as “safety dashboard.”  
- Shame language toward child (“you always forget”).  
- Treat child as a simple adult account variant.  
- Open child-to-world social graph.  
- Assume child has a personal phone number (`DEVICE_AND_IDENTITY_MODEL.md`).

### Humane wording examples

| Situation | Say | Don’t say |
|-----------|-----|-----------|
| Schedule change | “Practice moved to 5:00.” | “Child failed to update you.” |
| Pickup offer | “You offered to pick him up. Keep this commitment?” | “Assign parent task #4.” |
| Friend request (youth) | “Your son asked whether his friend can come.” | Auto-invite friend with no guardian path |
| Impact | “This may affect school pickup.” | “You will be late (97%).” |
| Consent | “Use this family chat to coordinate this plan?” | Silent family calendar writes |

### Interaction beats

1. Family conversation or family circle context.  
2. Plan proposal with **family membership** rules.  
3. Guardian-visible controls for high-trust youth actions (product/legal).  
4. Commitments and revisions as calm cards.  
5. Private child journals (if any) never default-shared to parent.

First Social Flow **implementation** slice remains adult two-user; this pattern is **design-locked** for later gated work. See scenario library for slice tags.

---

## Pattern P3 — Sibling

### Emotional architecture

Peer-like within family, sometimes competitive, often logistical (rides, shared chores, dual-household kids). Less romantic risk; still private-vs-shared care.

### What Opal may do

- Shared sibling plans (game, ride, visit other parent).  
- Fair-tone participation (“two agreed; one unsure”).  
- Commitments without parental tone when both are peers.  
- Optional family escalation: “Include a parent in this plan?” only when user asks or policy requires.

### What Opal must not do

- Rank siblings by reliability.  
- Escalate every sibling conflict to parents by default.  
- Leak private messages between siblings to parents without authority.

### Humane wording

- “Saturday still needs an answer from Alex.”  
- “You said you’d drive — want a reminder?”  
- Not: “Alex always flakes on family.”

---

## Pattern P4 — Friend (one-to-one)

### Emotional architecture

Warm, lower default intimacy than partner; high volume of soft plans. Over-formality feels corporate; over-intimacy feels creepy.

### What Opal may do

- Soft possibility → coordinate consent → free/busy → shared plan.  
- Group expansion: “Ask Michelle whether she wants to come.”  
- Late adaptation: “Running 20 min late” → offer notify, no silent reschedule.  
- Follow-through: “You said you’d send the pics.”

### What Opal must not do

- Imply romantic framing.  
- Import partner-style anniversary machinery without user cue.  
- Social Score matching for friends.

### Humane wording

- “You both appear free after 6:30.”  
- “This still needs an answer.”  
- “Three people agreed on Saturday; one person is still unsure.” (when group expands)  
- Not: “Your friendship strength increased.”

### Interaction beats

Classic Social Flow lifecycle (product truth). Primary first-slice target is **this pattern + partner logistics**, two adults.

---

## Pattern P5 — Group (small trusted group)

### Emotional architecture

Coordination complexity: polls, partial agreement, commitments (who brings what). Risk of public shaming and notification storms.

### What Opal may do

- In-chat polls for times.  
- Participation strip with humane aggregation.  
- Shared plan after agreement threshold.  
- Collaborative prep with optional private sub-items.  
- Restricted surprise: organizers + helpers; guest excluded.

### What Opal must not do

- Stake-weighted voting, wallets, tokens.  
- Public blast of who declined with mockery.  
- Auto-RSVP all members.  
- Cross-circle leakage (work group seeing friend-party surprise).

### Humane wording

- “Three people agreed on Saturday; one person is still unsure.”  
- “The reservation deadline is tomorrow.”  
- “Hide this plan from Sam (surprise).”  
- Not: “Sam is the bottleneck (score 12).”

### Interaction beats

1. Suggestion in group thread.  
2. Poll / options.  
3. Partial states visible.  
4. Agreement → shared plan.  
5. Commitments per person.  
6. Revision notifies per membership rules.

---

## Pattern matrix (quick reference)

| Concern | Partner | Parent–child | Sibling | Friend | Group |
|---------|---------|--------------|---------|--------|-------|
| Soft plan proposal | Yes | Yes (family) | Yes | Yes | Yes |
| Private gift/prep | Critical | Rare / careful | Rare | Optional | Per-person private |
| Free/busy grants | Dual | Family scope | Pair/family | Dual | Per member |
| Uncertainty tone | High | High | Medium | Medium | Medium |
| Nudge firmness | Soft | Soft–clear | Soft | Soft | Soft + poll |
| Surprise boundary | Common | Holiday/party | Possible | Possible | Common |
| Youth authority | N/A | Required | If minors | N/A adults | If any minor |
| First-slice focus | Yes | Design only | Design only | Yes | Thin / later |

---

## Relationship-sensitive microcopy rules

1. **Name the plan, not the pathology.**  
2. **Own actions over mind-reading** (“You offered…” vs “They expect you…”).  
3. **Aggregates before call-outs** in groups; names on expand.  
4. **Ask to escalate** (include parent, notify group) — don’t assume.  
5. **Label privacy** every time private objects appear.  
6. **Prefer questions for high-trust** (“Notify the group of the new time?”).  
7. **No clinical or legal diagnosis voice.**

---

## Activation pattern (all relationships)

Aligned with relationship intelligence principles:

> “You talk with Jordan often. Would you like Opal to help coordinate plans and commitments in this conversation?”

Never:

> “Jordan is your most important relationship.”

Expansion order remains gradual: closest confirmed → small groups → family circles → broader → public much later.

---

## Coercive-control awareness (all patterns)

Interaction design must not enable:

- Monitoring a partner via “invisible” AI reports  
- Pressure via AI-generated “proof” of disloyalty  
- Circumventing blocks  
- Parent or partner dashboards that are secretly full message mirrors without disclosure and policy

Block, report, mute, and consent revocation are first-class interactions in every pattern.

---

## Summary lock

| Statement | Label |
|-----------|--------|
| Relationship kind changes wording, visibility, and nudge firmness | **ACCEPTED PRODUCT TRUTH** |
| Partner / parent–child / sibling / friend / group patterns defined | **ACCEPTED PRODUCT TRUTH** (UX) |
| Humane wording; no scores; private care isolated | **ACCEPTED PRODUCT TRUTH** |
| Parent–child is dignity + logistics, not spy-only | **ACCEPTED PRODUCT TRUTH** |
| First implementation slice prioritizes adult friend/partner logistics | **ARCHITECTURE** / product truth |
