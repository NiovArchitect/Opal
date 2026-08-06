# Opal — Alignment Layers

**Status:** Accepted product truth (2026-08-06 founder correction)  
**Authority:** Product truth for Grok, Claude, and all agents  
**Shipping claim:** None. This defines the model. Implementation follows build order elsewhere.

---

## Deeper product promise

> **Opal helps you, the people in your life, and the world around you get aligned faster. Then it handles the next step with your permission.**

Stronger than “Opal recommends places” or “Opal books reservations.”

Opal creates alignment across three layers:

```text
person  ↔  people  ↔  device / world
```

The phone becomes the user’s **personal action layer**. It senses permitted context, keeps the user connected, and carries out **approved** actions.

Internally this may be called a **capability harness**. In product language it is **support and control**, never the device taking over.

---

## The complete Opal model

### 1. Personal alignment

Opal understands the individual’s current needs and preferences.

Example: *You have 90 minutes, you are already near downtown, and you usually prefer somewhere calm after work.*

### 2. Social alignment

Opal reconciles the needs of the people involved (collective fit without leaking private reasons).

Example: *Maya wants something casual, Jordan needs a lower-cost option, and nobody wants to drive farther north.*

### 3. Device alignment

Opal understands what each **authorized** device can safely contribute.

Examples:

- one user is already driving;
- one user’s ETA is 14 minutes;
- one user has a calendar conflict at 9:00;
- the organizer has approved Opal to contact the restaurant;
- another user wants their exact location kept private.

### 4. World alignment

Opal connects aligned intent to outside services: calls, reservations, flights, hotels, rides, tickets, maps, calendars, reminders, gifts, payments, provider agents, creator experiences.

---

## Resulting loop

```text
understand → align → authorize → act → confirm → remember
```

This is **device-to-life alignment**, not merely chat intelligence.

Questions the system should help answer:

| Layer | Question |
|-------|----------|
| Personal | What fits me right now? |
| Social | What works for us? |
| Device / world | What can Opal safely handle next? |

---

## What device alignment may represent (with permission)

The user’s phone can represent immediate reality only when permitted:

- approximate place;
- moving vs available;
- time available;
- calendar free/busy (not full private event dump by default);
- who is calling or messaging (scoped);
- authorized apps and services;
- which notifications matter;
- approved actions;
- online, driving, busy, traveling, or already at a place.

Exact location, private declines, budgets, and gift surprises stay private unless the user chooses otherwise. See `OPAL_DEVICE_CAPABILITY_SYSTEM.md` and Social Flow privacy boundaries.

---

## Solo and group

**Solo** use is first-class (cold start). Device context + personal preference can deliver value without friends online.

**Group** use multiplies value: device state keeps a dynamic plan aligned when people are already outside.

Both paths still require:

- authorization before commitment;
- honest action states (checking ≠ booked);
- private participation where needed.

---

## Authority split (do not collapse)

| Domain | Owns |
|--------|------|
| **Opal** | People, relationships, context, alignment, experience state |
| **Mobile capability system** | What Opal may access or do on the device |
| **Phoenix** | Live shared-safe updates to users |
| **Python** | Bounded intelligence and recommendations only |
| **Kafka / Foundation** | Durable event transport after authoritative decisions |
| **AVP²** | **Payment** authority, terms, proof, transaction state only |

**AVP² is not** the general permission system for location, calls, messages, invites, or bookings.  
See `OPAL_AVP2_PAYMENTS_BOUNDARY.md`.

---

## Build order (product truth, not a merge gate)

Do **not** begin with unrestricted autonomous calls or purchases.

Strongest early sequence:

1. Device capability registry (what the user permits).
2. Approximate location and ETA for one experience (private by default).
3. Calendar availability check (free/busy only).
4. One external inquiry without commitment.
5. Explicit booking approval.
6. Confirmation and proof.
7. Realtime group update (shared-safe only).
8. Revocation and audit.

First “device harness” miracle (aspirational proof, not a current ship claim):

> Three friends align on an idea. Opal notices one person is already nearby, finds two viable options, checks availability, asks one final question, books after approval, and starts directions for each person without exposing anyone’s exact location.

---

## Related documents

- `Opal_PRODUCT_TRUTH.md` — core definition  
- `OPAL_DEVICE_CAPABILITY_SYSTEM.md` — phone harness, action levels, calls/bookings honesty  
- `OPAL_AVP2_PAYMENTS_BOUNDARY.md` — payments only  
- `OPAL_FRIENDLY_PLANS.md` — shared services for friends (future)  
- `OPAL_DYNAMIC_SOCIAL_EXPERIENCE_INTELLIGENCE_PHASE0.md` — collective fit and restraint  
- `LOCATION_COLLECTIVE_FIT.md`  
- `CONSENT_MODEL.md`  
- `docs/architecture/DEVICE_AND_IDENTITY_MODEL.md` — device hierarchy (phone primary)  
- `docs/architecture/SOCIAL_FLOW_AUTHORITY_BOUNDARIES.md`  
