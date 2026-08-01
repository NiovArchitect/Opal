# Device and Identity Model

**Authority:** ARCHITECTURE (CURRENT) + ACCEPTED PRODUCT TRUTH (device hierarchy)  
**Status:** Conceptual model for Social Flow relationship universe — documentation only  
**Related:** `IDENTITY_AND_PHONE_NUMBERS.md`, `SOCIAL_FLOW_ARCHITECTURE.md`, `SOCIAL_FLOW_PRIVACY_BOUNDARIES.md`, ADR-0004  
**Owner (this phase):** Mobile Architect / RN Expo specialist

---

## Locked product truth

> **Opal’s primary long-term social surface is the phone.**  
> Tablets are supported social devices. Desktop and web support onboarding, recovery, richer planning, admin, and validation — they do not redefine who matters or how relationships form.

**Device capability must never define relationship importance.**  
A parent coordinating school pickup on a phone and a child confirming a plan on a Wi‑Fi tablet are both full participants in the *same* family social agreement. The device is a session surface, not a rank.

---

## Why this document exists

Phase 0 identity docs correctly treat **phone number as the adult discovery primitive** (WhatsApp-like). That remains true for many adult paths.

This document **extends** that model so Opal does **not** assume:

- every valid user owns a cellular line;
- every valid session is a phone;
- relationship authority is tied to device class;
- children (when legally allowed) must have their own mobile numbers to participate in approved family plans.

Preserve phone as an important **adult discovery path**. Do not freeze identity as “phone only forever.”

---

## Three layers that must stay distinct

| Layer | What it is | What it is not |
|-------|------------|----------------|
| **Human identity** | The person Opal recognizes as a social actor (adult, youth, or guardian-managed participant) | A phone, SIM, IMEI, or install |
| **Account / membership** | How that human is enrolled, verified, and authorized in Opal | A single device session |
| **Device session** | One authenticated client instance (phone, tablet, desktop/web) with tokens, push, offline store | The human themselves |

### Multi-device rule

One human identity may have **many concurrent device sessions**.  
Plan state, participation, commitments, and relationship memory attach to the **human (and plan/circle scope)** — not to “the device that created the plan.”

```text
HumanIdentity
  └── Account (adult | guardian_managed | approved_device_bound*)
        ├── DeviceSession (phone)
        ├── DeviceSession (tablet)
        └── DeviceSession (desktop/web)   # supporting, not primary social hierarchy
```

\* `approved_device_bound` is a **conceptual** enrollment path for participants who lack independent cellular identity (e.g., Wi‑Fi tablet youth under guardian approval). Exact enrollment UX and legal age gates are **LEGAL_OR_POLICY** and **not** first-slice implementation claims.

---

## Device hierarchy (delivery, not dignity)

| Class | Role | Typical Social Flow use |
|-------|------|-------------------------|
| **Phone** | **Primary** long-term social surface | Daily messaging, plan proposals, RSVP, day-of adaptation, push |
| **Tablet** | **Supported** social device | Family plans, youth participation (when allowed), longer reading, shared household surfaces |
| **Desktop / web** | **Supporting** | Onboarding, recovery, richer multi-day planning, admin, QA/validation, developer proof |
| **Dev / test clients** | **Proof only** | May prove lifecycle and contracts; do **not** freeze product hierarchy |

### Delivery strategy vs final hierarchy

Desktop, web, and automated clients may **prove functionality** early (contracts, websocket journeys, admin tooling). That is a **delivery strategy**, not the final product hierarchy.

**Locked:** mobile-primary social life; phone first; tablet included as real social hardware; desktop/web secondary by design intent.

ADR-0004 remains accepted for RN Expo as primary client stack. Web as primary MVP client remains rejected. Supporting web/desktop surfaces may still appear later for recovery and planning without becoming the “home” of social relationship life.

---

## Phone number: discovery primitive, not universal prerequisite

### Adult path (preserved)

- Phone number (E.164) remains the **primary adult discovery and account recovery primitive**.  
- Contact discovery, invites, and rate-limited search continue to treat phone as central for adults.  
- See `IDENTITY_AND_PHONE_NUMBERS.md` for verification challenges, hashing candidates, and non-user invite rules.

### What Opal must **not** assume

| Forbidden assumption | Why |
|----------------------|-----|
| Every valid user has their own cellular number | Children, dependents, some adults, and Wi‑Fi-only households break this |
| No phone number ⇒ no Social Flow participation | Family plans and guardian-managed accounts must remain possible in design |
| Device without cellular radio cannot coordinate | Tablets on Wi‑Fi are first-class *sessions* |
| Presence of a number equals adult autonomy | Numbers can be shared; authority must come from account tier and consent, not SIM ownership |

### Child / dependent enrollment (conceptual — not first-slice ship)

When legal and product gates allow youth participation, acceptable identity *concepts* include:

1. **Guardian-managed account** — human identity for the child; guardian holds enrollment authority, recovery, and high-trust controls.  
2. **Approved device identity** — session bound to a household/approved device under guardian approval (e.g., Wi‑Fi tablet), linked to the child’s human identity.  
3. **No personal cellular requirement** — a child may participate in **family plans** and **approved peer communication** without owning a phone number.

Exact age cutoffs, verification of guardian relationship, and peer-messaging eligibility remain **LEGAL_OR_POLICY** (`G052`, SF-D011). This architecture document does **not** invent jurisdictional law.

---

## Conceptual identity objects (extension)

These extend — and do not delete — Phase 0 `User` / `DeviceSession` / `PhoneVerificationChallenge`.

```text
HumanIdentity
  id
  display_name
  preferred_languages[]
  age_authority_tier     # adult | youth | child | unknown  (product tier, not legal claim)
  status                 # active | suspended | deleted | restricted

Account
  id
  human_identity_id
  account_kind           # self_sovereign | guardian_managed | household_linked
  primary_phone_e164?    # optional — required for many adult self_sovereign paths; not universal
  phone_verified_at?
  guardian_account_id?   # when guardian_managed
  created_at
  status

DeviceSession
  id
  account_id
  device_class           # phone | tablet | desktop | web | dev
  device_fingerprint
  network_mode           # cellular | wifi | mixed | unknown
  push_token?
  social_surface_rank    # primary | secondary | support | proof_only
  created_at
  last_seen_at
  revoked_at?

EnrollmentPath
  kind                   # phone_otp | invite_link | guardian_invite | approved_device | recovery
  proof_refs[]
  expires_at?
```

### Authority rules (architecture)

1. **Plan participation** binds to `HumanIdentity` (via account), never to `device_class`.  
2. **High-trust actions** (accept shared plan, share free/busy, change family plan, youth peer invite) check **account kind + age authority + consent**, not “has LTE.”  
3. **Session revocation** removes a device; it does not erase the human’s plan history unless account/deletion policy says so.  
4. **Multi-device continuity:** offline queues and local projections are per session; authoritative plan state is server-side (Elixir).  
5. **Dev clients** may use synthetic identity; production builds must not enable synthetic phone maps.

---

## Social Flow implications by surface

| Concern | Phone | Tablet | Desktop/web |
|---------|-------|--------|-------------|
| Day-of plan adaptation | Primary | Supported | Optional |
| In-conversation proposal cards | Primary | Supported | Supported where chat exists |
| Family coordination visibility | Full | Full when authorized | Support / overview |
| Youth Wi‑Fi participation | N/A if no phone | Expected path when allowed | Not primary youth surface |
| Onboarding / recovery | Common | Possible | Strong fit |
| Rich multi-day trip planning | Supported | Strong | Strong |
| Admin / validation | Limited | Limited | Strong |
| Push urgency | Highest | Medium | Lowest / email-like |

**Relevance policy:** urgency and notification defaults may differ by device class. Relationship importance and plan authority **do not**.

---

## Family and youth (architecture boundaries)

| Allowed in conceptual model | Blocked until legal/product gates |
|-----------------------------|-----------------------------------|
| Guardian-managed human identity without personal phone | Shipping youth growth features as adult-MVP |
| Wi‑Fi tablet as approved social session | Unbounded child-to-child open social graph |
| Family plan membership for dependents | Assuming number = guardian consent |
| Adult phone discovery unchanged | Covert monitoring via “parental device” as only design |

Adult Social Flow first slice remains **two consenting adult users** (see product truth). Family/youth are designed here so the identity model does not paint Opal into a phone-only corner that later excludes real households.

Cross-links (other exclusive owners in this phase):

- Age tiers → product age authority docs  
- Guardian boundaries → guardian product docs  
- Child-to-child Social Flow → dedicated product doc  
- Minor privacy → `MINOR_AND_FAMILY_PRIVACY` architecture  
- Scenarios → `docs/scenarios/FAMILY_AND_YOUTH_SCENARIO_LIBRARY.md`

---

## Security notes (device + identity)

- Session tokens rotatable; device revoke first-class.  
- Sensitive actions may re-verify (phone OTP for self-sovereign adults; guardian approval for managed accounts).  
- SIM-swap mitigations apply to phone-bound accounts; guardian-managed accounts need alternate recovery (LEGAL + PRODUCT).  
- Device fingerprint is anti-abuse, **not** social identity.  
- Dev/synthetic numbers must be impossible in production builds (existing identity doc).

---

## Explicit non-goals

- Ranking friends or family by who uses “better” devices  
- Requiring tablets or desktops for Social Flow value  
- Replacing phone OTP with blockchain/DID wallets  
- Treating browser automation as a product persona  
- Shipping minor features before LEGAL_OR_POLICY resolution  

---

## Acceptance for future implementation

When Social Flow identity work ships, implementations must demonstrate:

1. Adult can enroll and discover via phone.  
2. Human with multi-device sessions sees coherent plan state.  
3. Plan authority is independent of `device_class`.  
4. Conceptual path exists for account **without** `primary_phone_e164`.  
5. Tablet Wi‑Fi session can project family plans the human is authorized to see.  
6. Desktop/web cannot silently become the only place relationship memory lives.

See `docs/build/SOCIAL_FLOW_1_ACCEPTANCE_MATRIX.md` for slice-1 gates (adult-first; family conceptual checks may be NOT_RUN or EXTERNAL_BLOCKED).

---

## Summary lock

| Statement | Label |
|-----------|--------|
| Phone is primary long-term social surface | **ACCEPTED PRODUCT TRUTH** |
| Tablet is supported social device | **ACCEPTED PRODUCT TRUTH** |
| Desktop/web supporting (onboarding, recovery, planning, admin, validation) | **ACCEPTED PRODUCT TRUTH** |
| Dev clients prove function; not hierarchy | **ARCHITECTURE** |
| Device ≠ relationship importance | **ACCEPTED PRODUCT TRUTH** |
| Phone number = adult discovery primitive, not universal identity requirement | **ARCHITECTURE** + **ACCEPTED PRODUCT TRUTH** |
| Human identity ≠ device session; multi-device is normal | **ARCHITECTURE** |
| Guardian-managed / approved-device paths for phone-less participants | **ARCHITECTURE** (legal gates open) |
