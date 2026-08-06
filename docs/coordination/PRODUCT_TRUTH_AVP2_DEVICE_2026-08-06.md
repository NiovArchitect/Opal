# Handoff — Product truth: alignment layers, device harness, AVP² payments only

**Date:** 2026-08-06  
**Audience:** Grok (execute), Claude (research/design), any agent  
**Type:** Product truth documentation — **not** an implementation ticket

---

## Why this exists

Founder expanded Opal’s model and **corrected** an earlier stretch of AVP².

Agents must not build a universal capability-grant plane named AVP².

---

## Read these (in order)

1. `docs/product/OPAL_ALIGNMENT_LAYERS.md`
2. `docs/product/OPAL_DEVICE_CAPABILITY_SYSTEM.md`
3. `docs/product/OPAL_AVP2_PAYMENTS_BOUNDARY.md`
4. `docs/product/OPAL_FRIENDLY_PLANS.md` (future only)
5. Updated `docs/product/Opal_PRODUCT_TRUTH.md`
6. Updated `docs/product/OPAL_CONTEXT_AUTHORITY.md`
7. Foundation: `Opal-Social-Foundation/docs/AVP2_BOUNDARY.md`

---

## One-line rules

| Rule | Detail |
|------|--------|
| Alignment | person ↔ people ↔ device/world |
| Phone | Personal action layer; support and control, not takeover |
| Loop | understand → align → authorize → act → confirm → remember |
| Device capabilities | Opal-owned registry (location, calendar free/busy, calls, messages, booking inquiry) |
| AVP² | **Payments only** |
| Python | Proposes; never authorizes |
| Kafka | After decisions only |
| Friendly Plans | Future concept; provider-approved; no password sharing; fitness-first when built |
| Copy | Walkthrough first-run copy frozen; recommend before changing |

---

## Do not implement from this handoff alone

Still open execution tracks (separate):

- PR #61 Real People gates (private non-leak first; no merge; no Twilio yet)
- PR #62 visual (no halo) after founder sign-off
- First under-1-minute alignment miracle (when ordered)
- Device capability registry code (only when ordered; start with registry, not autonomous calls)

---

## Agent copy-paste instruction

```text
AVP² = payments only.
Device location, calls, messages, booking inquiry, invites, and social permissions are Opal domain + device capability system.
Do not put general capability grants under avp2.permission.*.
Friendly Plans are documented future product truth, not a shipping authorization.
```
