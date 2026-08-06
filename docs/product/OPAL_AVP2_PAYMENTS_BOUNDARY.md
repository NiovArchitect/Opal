# AVP² — Payments Boundary (Corrected)

**Status:** Accepted product truth (2026-08-06 founder correction)  
**Supersedes:** Any earlier statement that AVP² governs all agent capabilities, device permissions, location, calls, messages, invites, or general bookings without money.  
**Audience:** Grok, Claude, Foundation agents, future implementers.

---

## Correction (read this first)

**AVP² is for payments**, not the general permission system for every device action.

Earlier drafts that said AVP² “governs who may act and what capabilities are allowed” for all Opal/device actions are **incorrect**.

| Domain | System |
|--------|--------|
| Location, calendar, navigation, calls, messages, app opens, availability checks, booking **authorization as social/device action** | **Opal device capability system** |
| People, relationships, invites, private/shared projections, experience state | **Opal domain** |
| Money, financial commitment, settlement, refunds, payment proof | **AVP²** |

Do not rename the device capability system to AVP² unless the founder **explicitly** redefines the acronym.

---

## What AVP² owns

AVP² enters when **money or financial commitment** is involved:

- payment authorization;
- merchant or provider payment requests;
- deposits;
- shared payments;
- group contributions;
- reimbursements;
- subscription or membership payments;
- escrow or conditional release;
- refunds;
- payment proof;
- revocation before settlement where possible;
- transaction completion and reconciliation.

---

## What AVP² does not decide

- who is invited;
- who sees private information;
- whether Opal can use location;
- whether Opal can place a call or send a message;
- whether a relationship exists;
- whether a conversation becomes a plan;
- calendar or free/busy access;
- navigation start;
- booking inquiry without payment;
- Friendly Plan social fit or membership roster (Opal owns people state).

---

## Clean division of labor

| Layer | Role |
|-------|------|
| **Opal** | People, relationships, context, alignment, experience state |
| **Mobile capability system** | What Opal may access or do on the device |
| **Phoenix** | Live updates to users |
| **Python** | Bounded intelligence; never authorizes payment or disclosure |
| **Kafka / Foundation** | Durable backend event flow after decisions |
| **AVP²** | Payment authority, payment terms, proof, transaction state |

---

## Example payment journey

```text
Opal understands the group
→ people align
→ Opal checks availability
→ user approves the booking
→ provider returns price and terms
→ AVP² handles payment authorization
→ payment succeeds
→ provider confirms
→ Opal shows Booked
```

Friendly Plans (future): Opal owns invite, private interest, shared-safe progress, and plan state. AVP² owns each person’s authorized share, recurring approval, failed payments, prorating, refunds, and settlement. See `OPAL_FRIENDLY_PLANS.md`.

---

## Example AVP² events

Prefer payment-specific names. Do not use generic “permission” for non-money grants.

```text
avp2.payment.requested
avp2.payment_terms.presented
avp2.payment.authorized
avp2.payment.declined
avp2.payment.captured
avp2.payment_split.requested
avp2.payment_split.completed
avp2.refund.requested
avp2.refund.completed
avp2.transaction.reconciled
```

**Deprecated / incorrect as general capability events under AVP²:**

```text
avp2.permission.granted   # wrong for location/calls/device
avp2.permission.revoked   # wrong for location/calls/device
```

Those concerns belong on device/Opal events such as `device.capability.granted` / `device.capability.revoked`.

Kafka topics may still use `opal.avp2.authorization.events` or `opal.payment.events` for **payment** authorization events only. Topic name is not a license to put device grants on AVP².

---

## Kafka rule

Kafka does **not** decide permission or payment.  
It carries durable events **after** AVP² (payment) or Opal (device/social) authority has decided.

---

## Foundation document

Canonical short boundary for the Social Foundation repo:

- `Opal-Social-Foundation/docs/AVP2_BOUNDARY.md` (must match this correction)

Opal product truth for implementers of Opal itself:

- this file  
- `OPAL_DEVICE_CAPABILITY_SYSTEM.md`  
- `OPAL_ALIGNMENT_LAYERS.md`

---

## Agent instruction (copy into handoffs)

> AVP² = payments only. Device location, calls, messages, bookings without money, and social permissions are **not** AVP². Do not build a universal capability grant plane under the AVP² name.
