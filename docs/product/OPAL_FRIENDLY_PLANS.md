# Opal — Friendly Plans (Future Product Truth)

**Status:** Accepted product concept (2026-08-06)  
**Shipping claim:** **Not authorized to implement yet.** Documentation and design only until a dedicated build slice and provider agreements exist.  
**First vertical preference:** Local fitness / experiences — not streaming password sharing.

---

## One-line definition

> **Friendly Plans:** shared services and experiences built for friends, not only households.

Opal must **not** help people bypass household rules, share passwords improperly, or violate a provider’s terms.  
It should enable a **provider-approved** model where trusted friends can share eligible access, benefits, payments, and experiences.

---

## Why this belongs in Opal

Most services sell to: one person · a household · a company.

Many people live socially through chosen relationships: best friends, gym friends, church friends, couples plus friends, travel groups, roommates, creator communities, study groups.

Opal already owns relationship and alignment. It can help answer:

- Who would actually use this?
- Does the plan fit everyone?
- Who wants in?
- What would each person pay?
- What if someone leaves?
- Is the provider’s plan allowed for friends?
- Better option for this group?
- Geographic practicality?
- Permanent group vs one experience?

---

## What Friendly Plans can include (examples)

Not only streaming:

- gyms and fitness classes;
- concerts, movie memberships, event passes;
- travel clubs and vacation benefits;
- creator memberships;
- gaming (where terms allow);
- museums, attractions, local experiences;
- coworking and study spaces;
- food, dining, delivery benefits;
- shared transportation or ride packages;
- sports and recreation;
- classes and workshops;
- software or creative tools where team use is allowed;
- church, community, or social-group resources.

Forms:

| Form | Example |
|------|---------|
| Ongoing | Four friends share a monthly fitness-and-events membership |
| Temporary | Six friends share a travel package for one trip |
| Experience-specific | Three friends unlock a concert bundle |

---

## User journey (product language)

Opal notices opportunity (with restraint — not spam):

> **This could be better together**  
> Unlimited fitness classes for up to four friends  
> About $28 each per month

Actions: I’m interested · See who might like it · Not for me · Save it

Invites are **user-chosen**, not automatic pressure.

Private responses:

- I’m in  
- Maybe  
- Too expensive  
- Not this time  
- Ask me next month  

Shared-safe view:

> Three friends are in. One spot is still open.

Does **not** reveal who said it was too expensive.

When enough people agree:

> **Ready to start**

Provider exact terms and price appear.  
Only after everyone accepts terms does **AVP²** handle payment.

---

## AVP² role (payments only)

AVP² may handle:

- each person’s authorized share;
- recurring payment approval;
- deposits and deadlines;
- failed payments;
- prorating join/leave;
- refunds;
- provider settlement;
- proof of payment;
- cancellation terms;
- spending limits;
- who may change the plan (payment authority side).

**Opal** handles people, group, permissions, fit, and plan state.

---

## Friendly Plan states (public language)

Keep language simple. Do **not** call everything “booked.”

- Worth a look  
- Friends are interested  
- One spot open  
- Ready to start  
- Active  
- Payment needed  
- Someone left  
- Looking for one more  
- Ends this month  
- Renewed  

---

## Network effect and cold start

Loop:

```text
useful shared plan → invite trusted friends → alignment → payment → shared benefit → recurring use
```

Stronger than generic friend discovery: invite carries immediate value.

Cold start: show provider-approved “Better together” plans from interests before friends join. User chooses whether to invite.

---

## Anti-patterns (harmful social pressure)

Avoid:

- “Your closest friends are already in.”
- public rankings of who contributes most;
- visible reasons someone declined;
- pressure countdowns;
- replacing a member without dignity;
- showing that someone could not afford it;
- permanent elite circles as status proof.

Prefer:

- One spot is open.  
- This plan currently has three people.  
- Someone is leaving at the end of the month.  
- Invite someone who would actually use it.

A Friendly Plan is a **useful group arrangement**, not proof of friendship status.

---

## Provider opportunity

Opal can offer providers a compliant way to sell to real social groups.

Providers gain: more customers per acquisition · group reinforcement · discovery · recurring revenue · utilization · creator distribution · approved split payments · qualified demand.

Opal can become marketplace + operating layer. **Only with provider-approved products.**

---

## Strongest first vertical

**Do not** start with streaming accounts (household restrictions, password sharing, licensing).

**Prefer:** local fitness or experiences

Examples: four-person class membership · friend gym package · monthly comedy/event pass · museum membership · creator-led activity club.

### First proof sequence (when authorized to build)

1. Show a provider-approved four-person fitness plan.  
2. One user invites three friends.  
3. Each responds privately.  
4. Shared-safe progress.  
5. Everyone accepts exact price and rules.  
6. AVP² authorizes individual shares.  
7. Provider activates the plan.  
8. Opal helps friends use the benefit together.  
9. Group sees upcoming included experiences.  
10. Renewal clear and voluntary.

---

## Deeper product value

Friendly Plans are not only discounts. They turn relationships into **shared capability**: access, savings, experiences, routines, traditions, recurring reasons to meet.

Fits Opal:

> **Opal helps people align around what they want to do, then gives them better ways to do it together.**

---

## Implementation freeze

Until a dedicated slice exists:

- no production UI for Friendly Plans;
- no password-sharing workarounds;
- no AVP² payment wiring for this feature;
- no marketing that claims this ships.

Prior live work remains: Real People activation, first alignment miracle, device capability registry steps — not this marketplace.

---

## Related

- `OPAL_ALIGNMENT_LAYERS.md`
- `OPAL_AVP2_PAYMENTS_BOUNDARY.md`
- `OPAL_DEVICE_CAPABILITY_SYSTEM.md`
- Social Flow private participation and restraint docs
