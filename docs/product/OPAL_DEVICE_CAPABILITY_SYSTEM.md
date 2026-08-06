# Opal — Device Capability System (Mobile Harness)

**Status:** Accepted product truth (2026-08-06)  
**Authority:** Product truth for device actions and consent  
**Not:** AVP². Do not name this system AVP².  
**Shipping claim:** None until build slices and evidence exist.

---

## Purpose

Govern **what Opal may access or do on the user’s phone** (and other sessions):

- use approximate location;
- check calendar availability (free/busy);
- start navigation;
- place a call;
- send a message;
- open another app;
- check availability with a provider;
- prepare a booking;
- access a contact the user selected.

This is Opal’s **mobile capability-and-consent system**. It tracks purpose, scope, duration, audience, approval level, and revocation.

---

## Product language vs internal language

| Internal | Product presentation |
|----------|----------------------|
| Capability harness | Support and control |
| Device acts | User-approved next step |
| Grant / revoke | Settings the user can see and stop |

Never present the phone as “taking over.”

---

## Example bounded capabilities

```text
read_approximate_location
share_eta_for_experience
check_calendar_availability
start_navigation
place_authorized_call
send_authorized_message
request_reservation
confirm_purchase          # payment path hands off to AVP²
store_private_preference
open_provider_app
receive_live_status
```

Every capability grant needs:

| Field | Meaning |
|-------|---------|
| Owner | User who owns the device/session |
| Purpose | Why this grant exists |
| Scope | Experience / people it applies to |
| Duration | When it expires |
| Approval level | Ask first / handle small steps / etc. |
| Data allowed | What may be read |
| Result share | What may be shared with others |
| Revocation | How the user stops it |

---

## User-facing action levels

Users should not approve every harmless step. Opal must not act too freely.

### Ask me first

Opal proposes everything and waits.

### Handle small steps

Opal may check availability, gather information, compare options, and prepare actions. Still asks before commitments or payments.

### Handle this experience

For one bounded trip, date, study session, or outing, Opal may perform **approved categories** of actions.

### Never do this automatically

Permanent restrictions for calls, purchases, location sharing, messages, or bookings.

Product copy stays simple; permission architecture underneath may be advanced. **Future copy still requires founder / ChatGPT recommendation before shipping text changes.**

---

## Calls on the user’s behalf

Calls can become high value. They must never be deceptive.

### Required honesty

When Opal communicates externally:

> “Hi, I’m Opal, an assistant calling for [User] with their permission.”

The outside party must know:

- an assistant is involved;
- whose behalf;
- what authority it has;
- what it is requesting;
- whether it may commit.

**Do not** imitate the user’s voice without explicit high-trust authorization and safeguards.

### Call flow (after user approval)

1. Confirm venue and bounded request.
2. Place call or connect through approved voice provider.
3. Identify as Opal acting for the user.
4. Ask only bounded questions.
5. Avoid unrelated private information.
6. Return a short result.
7. Request approval before committing.
8. Preserve proof of what was agreed.

### Shared-safe group language

```text
Opal checked
They can seat six at 7:30. The patio is quieter.

Ready to book   → after group/user authority
Booking         → only after explicit book authority
Booked          → only after external confirmation
```

Never blur: checking · requested · business confirmed.

---

## Bookings on the user’s behalf

Authority steps must stay distinct:

| State | Meaning | Commitment? |
|-------|---------|-------------|
| **Suggested** | This place could work | No |
| **Approved to check** | Opal can check availability | Inquiry only |
| **Option found** | A table is available at 7:30 | No booking yet |
| **Approved to book** | User said book it | Authority exists |
| **In progress** | Booking now | In flight |
| **Confirmed** | Booked + provider id / proof | Yes |
| **Failed or changed** | Time no longer available | No false completion |

Do not call inquiry “booked.” Do not call Friendly Plan activation “booked” either (see `OPAL_FRIENDLY_PLANS.md`).

---

## Dynamic plans (outside)

When people are already moving, device context supports plan repair without leaking private constraints:

- private budget stays private;
- exact location stays private by default;
- shared view shows only safe progress.

Example shared language:

> **Plans changed** — two easier options nearby.  
> **This one works best** — nobody drives backward; open now.

Actions stay simple: Works for me · Another option · Need more time · Keep my answer private.

---

## Runtime ownership

| Layer | Owns |
|-------|------|
| **Elixir / BEAM** | User authority; device registration; capability grants; relationship/experience state; action approval; call and booking lifecycle; retries; revocation; private/shared projection; confirmation truth |
| **Python** | Proposes intent, next action, call questions, group fit, ranking, summaries, clarifications. **Cannot** authorize calls, purchases, bookings, or disclosure |
| **Phoenix** | Live device/experience state to clients (checking, approval needed, confirmed, plan changed, directions ready) |
| **Kafka / Foundation** | Durable events **after** authoritative decisions; does not control the device or authorize action |
| **AVP²** | Payment authorization only (after booking/price path needs money) |

### Example durable device events (not AVP²)

Device capability namespace (Opal-owned; documentation only — no runtime in this docs PR):

```text
device.capability.granted
device.capability.revoked
device.action.requested
device.action.approved
device.action.completed
device.action.failed
```

Related experience / action events (also not AVP²):

```text
call.requested
call.started
call.completed
availability.found
booking.authorization.requested
booking.authorized
booking.confirmed
booking.failed
location.scope.granted
location.scope.expired
```

Kafka preserves and transports; Elixir decides.

---

## Corrected journey with money

```text
Opal understands the group
→ people align
→ Opal checks availability (device capability)
→ user approves the booking (device / experience authority)
→ provider returns price and terms
→ AVP² handles payment authorization
→ payment succeeds
→ provider confirms
→ Opal shows Booked
```

---

## What this system must not decide via AVP²

AVP² must **not** decide:

- who is invited;
- who sees private information;
- whether Opal may use location;
- whether Opal may call;
- whether a relationship exists;
- whether a conversation becomes a plan.

Those remain Opal domain + device capability responsibilities.

---

## Related

- `OPAL_ALIGNMENT_LAYERS.md`
- `OPAL_AVP2_PAYMENTS_BOUNDARY.md`
- `CONSENT_MODEL.md` — L3/L4 action and governed consent
- `docs/architecture/DEVICE_AND_IDENTITY_MODEL.md`
- `docs/architecture/SOCIAL_FLOW_AUTHORITY_BOUNDARIES.md`
- Foundation: `Opal-Social-Foundation/docs/AVP2_BOUNDARY.md` (payments-only; corrected)
