# Opal Relationship Activation

**Authority:** ACCEPTED PRODUCT TRUTH  
**Status:** How Social Flow turns on for a relationship or conversation — discovery, consent, capability choice, expansion  
**Related:** `OPAL_RELATIONSHIP_CONTEXTS.md`, `OPAL_SOCIAL_FLOW_PRODUCT_TRUTH.md`, `OPAL_RELATIONSHIP_INTELLIGENCE_PRINCIPLES.md`, `CONSENT_MODEL.md`, `RELATIONSHIP_SAFETY_RULES.md`  
**Branch context:** `docs/social-flow-relationship-universe` (documentation only; no implementation in this PR)

---

## Purpose

This document defines **relationship activation**: the product process by which Opal may offer Social Flow in a conversation or circle, how the user accepts or declines, which capabilities turn on, and how activation expands over time.

Activation is **not** automatic deeper analysis of high-volume chats. High message frequency is a **discovery signal only**.

---

## Locked product statement

> **Opal notices where coordination might help, asks clearly, and starts narrow.**  
> The user chooses **which** relationships get Social Flow and **which** capabilities apply.  
> Value and ongoing consent justify expansion — never silent escalation from message volume.

---

## Frequency is discovery only

| Frequency may do | Frequency must not do |
|------------------|------------------------|
| Surface a private “you talk with X often — want planning help?” candidate | Assign romantic, family, or “most important” labels |
| Prioritize *which conversations to suggest first* in an onboarding or quiet coach moment | Trigger unrestricted AI analysis of the whole history |
| Help the user find high-value places to try Social Flow | Create plans, RSVPs, or shared memory |
| Be one input among others (user search, explicit “enable here,” group creation) | Rank relationships publicly or privately as a Social Score |

**Rule:** No deeper plan intelligence, memory mining, or availability inference runs **just because** two people message a lot. Those require activation + capability consent (+ conversation/action consent layers as defined in `CONSENT_MODEL.md`).

---

## Activation flow (canonical)

```text
1. Identify active conversations privately
     (device- and server-side signals under existing privacy rules;
      no partner-visible “Opal is ranking you”)
        ↓
2. Suggest a small set of high-value contexts
     (e.g. 1–3 candidates; dismissible; uncertainty language)
        ↓
3. User chooses which get Social Flow
     (enable / not now / never for this conversation)
        ↓
4. User confirms or corrects relationship context
     (see OPAL_RELATIONSHIP_CONTEXTS.md — ASK, do not assume)
        ↓
5. User chooses capabilities (narrow defaults offered)
        ↓
6. Social Flow operates only within granted scope
        ↓
7. Expand later via demonstrated value + explicit consent
     (add capabilities or circles; never silent full-history unlock)
```

### Step notes

**1 — Private identification**  
Opal may consider recency, mutual messaging, existing user labels, and lightweight coordination cues *only to decide whether to suggest activation*. This step does not authorize content mining for commitments, gifts, or mood.

**2 — Small high-value set**  
Prefer quality over quantity. Suggest places where plans already form in language (“dinner,” “pickup,” “practice”), not a dump of the entire contact list.

**3 — User chooses contexts**  
Activation is per conversation and/or per relationship circle, consistent with consent layers. Enabling for Conversation A does not enable for Conversation B.

**4 — Context confirmation**  
If Opal suggests “family” or “partner,” the user must confirm or correct. Sensitive contexts follow higher-care rules; minors may require guardian involvement by age tier.

**5 — Capability choice**  
Start with a **narrow** recommended set for that context family (e.g. plan recognition + reminders for adult friends; plan recognition + family coordination for parent–child). User can deselect before confirming.

**6 — Scoped operation**  
Python proposes; Elixir enforces consent, membership, and plan authority (`OPAL_SOCIAL_FLOW_PRODUCT_TRUTH.md`). Revocation stops new processing for that scope.

**7 — Expand via value + consent**  
After useful outcomes (a successful shared plan, a helpful reminder), Opal may offer *one more* capability — never “you message a lot, so we turned everything on.”

---

## User-facing language patterns

### Acceptable

> “You and Alex plan things often. Want Social Flow in this chat — plan detection, availability, and reminders?”  
> **Turn on · Choose features · Not now**

> “This looks like family logistics. Is this a parent/child conversation?”  
> **Yes, I’m the parent · Yes, I’m the child · Something else · Don’t help**

### Unacceptable

> “Alex is your #1 relationship. Full intelligence enabled.”  
> “We analyzed 4,000 messages and unlocked Social Flow.”  
> “Your partner’s reliability score unlocked advanced coordination.”

---

## Capability catalog (activation menu)

Users may enable any subset appropriate to context, age tier, and policy. Names are product capabilities; implementation may split or rename jobs later.

| Capability | What the user gets | Notes |
|------------|--------------------|--------|
| **Plan recognition** | Soft detection of possible plans in conversation; dismissible proposals | No silent binding events |
| **Shared availability** | Consented free/busy or window sharing for a plan scope | Grant-scoped; titles/private prep not exposed by default |
| **Reminders** | Contextual reminders for confirmed or user-accepted items | No fear-based push |
| **Commitments** | “I’ll book / I’ll pick up” candidates → user-confirmed obligations | Private vs shared by choice |
| **Family coordination** | Multi-person family logistics inside family contexts | Age + guardian gates |
| **Travel** | Trip-oriented proposal/availability/commitment patterns | Template over primitives, not a hard-coded mini-app |
| **Gift / surprise protection** | Private prep surfaces; exclude guest from surprise plans | Leakage is a defect |
| **Child pickup** | Pickup/drop-off plan recognition and shared family plan support | Parent/guardian and age rules |
| **School activity** | Practice, games, performances, school events as plan templates | Family context; not public school OS |
| **Household responsibilities** | Chores, handoffs, “who is doing X” commitments | No household “productivity score” |

### Capability rules

1. **Offer narrow first.** Default bundles are small; advanced options behind “choose features.”  
2. **Context filters the menu.** Professional contexts do not default to gift/surprise. Parent–child does not default to romantic travel packages.  
3. **Each capability remains revocable** at feature, conversation, and (where applicable) plan scope.  
4. **High-trust actions** still need action-level consent (accept for me, notify group of change, etc.).  
5. **Message volume alone never enables a capability.**

---

## Consent stack (activation maps onto existing model)

Activation sits on top of `CONSENT_MODEL.md`:

| Layer | Activation meaning |
|-------|--------------------|
| L0 Account / age | Who may use Social Flow at all; minor policies |
| L1 Feature | e.g. Social Flow master, plan recognition, memory |
| L2 Conversation | “Use AI/Social Flow in *this* thread” |
| L3 Action | Confirm plan, confirm commitment, share availability |
| L4 Governed | Future high-risk (not required for base Social Flow) |

**Shared** plan surfaces and shared relationship memory require the stronger dual/shared rules when those surfaces exist. One party activating private help must not force shared intelligence on the other.

---

## Minors, guardians, and family activation

- For minors, **activation and sensitive context confirmation** may require guardian involvement by age tier (exact thresholds: LEGAL_OR_POLICY).  
- Family coordination capabilities (`family coordination`, `child pickup`, `school activity`) are first-class product offers under family contexts — not hidden experiments — but ship only inside **safety-bounded** journeys.  
- Unrestricted child-to-child activation, adult-stranger-to-child Social Flow, and youth growth loops are **out of activation product truth for shipping** until child-safety architecture and legal gates accept them.  
- Parent-only private notes remain private when a family plan is activated.

See also: child-safety track docs (`OPAL_AGE_AUTHORITY_TIERS.md`, `OPAL_GUARDIAN_BOUNDARIES.md`, `OPAL_CHILD_TO_CHILD_SOCIAL_FLOW.md`) when present.

---

## Expansion model

```text
Narrow start
  → user experiences one clear win (e.g. dinner plan or practice pickup)
  → optional prompt: “Add shared availability?” / “Add reminders?”
  → user accepts or declines
  → still no full-history intimacy model
```

Expansion triggers that are **allowed**:

- user success with a plan lifecycle;
- user opening settings and enabling more;
- user inviting another participant into an existing shared plan (membership + their consent).

Expansion triggers that are **forbidden**:

- crossing a secret message-count threshold;
- inferred “relationship escalation” (friend → partner) without user confirmation;
- enabling gift/surprise mining because romantic label was guessed from emoji frequency;
- cross-circle activation (family insight leaking into work chat).

---

## Deactivation and “not now”

| User choice | Expected behavior |
|-------------|-------------------|
| Not now | Dismiss; may ask again later with backoff; no analysis escalation |
| Never for this conversation | Suppress Social Flow suggestions here; respect unless user re-enables |
| Turn off capability | Stop new jobs of that type in scope |
| Turn off conversation Social Flow | No new Social Flow proposals/processing for that thread |
| Leave / remove from plan | Participation and visibility update; no residual unauthorized access |

Deactivation must be as easy as activation. No dark patterns to keep mining on.

---

## What activation is not

- Always-on surveillance of contacts  
- Auto-RSVP or auto-create calendar events  
- Social Score unlocking features  
- A substitute for messaging consent or block/report  
- Silent training of public models on private chats  
- Permission to ignore Personal Context / Relationship Privacy Boundaries  

---

## Alignment with lifecycle

Once activated with plan recognition (and related capabilities), the Social Flow lifecycle remains:

```text
Conversation
  → possible plan (proposal only)
  → consent to coordinate
  → shared options
  → agreement
  → commitment
  → preparation
  → adaptation
  → follow-through
  → relationship memory (scoped, consented)
```

Activation is the **gate onto** this lifecycle for a given context — not a parallel product.

---

## Explicit non-goals

- Bulk “enable Social Flow for everyone I message” without review (especially including minors)  
- Activation from received marketing or public discovery graphs (out of scope)  
- Ranking which friend “deserves” activation  
- Deeper analysis as a reward for chattiness  

---

## Open product questions (do not invent closure here)

- Exact UX for dual consent when both parties must enable shared plan AI  
- Default capability bundles per context family (final copy and counts)  
- Backoff timing for “not now”  
- Guardian co-activation flows per age tier (legal + child-safety ownership)  
- Whether activation state syncs across a user’s multi-device sessions only, or has circle-admin controls for family_group  

---

## One-line summary

**Suggest little, confirm context, enable few capabilities, earn the right to offer more — never unlock intimacy intelligence from message volume alone.**
