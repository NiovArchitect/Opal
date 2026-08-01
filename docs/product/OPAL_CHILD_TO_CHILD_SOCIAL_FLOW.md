# Opal Child-to-Child Social Flow

**Authority:** ACCEPTED PRODUCT TRUTH  
**Status:** Conceptual product law for peer coordination among minors — **not** a shipping authorization  
**Audience:** Product, design, trust & safety, privacy, backend, mobile, QA  
**Related:** `OPAL_AGE_AUTHORITY_TIERS.md`, `OPAL_GUARDIAN_BOUNDARIES.md`, `OPAL_SOCIAL_FLOW_PRODUCT_TRUTH.md`, `RELATIONSHIP_SAFETY_RULES.md`, `docs/architecture/CHILD_SAFETY_THREAT_MODEL.md`, `docs/architecture/SOCIAL_FLOW_PRIVACY_BOUNDARIES.md`

---

## Locked product stance

> **Child-to-child Social Flow is neither unrestricted adult messaging nor total parental surveillance.**  
> It is **consented, living coordination among approved peers**, with **age-appropriate guardian involvement**, **restricted discovery**, and **elevated safety**—while preserving **child dignity and legitimate private space** as tiers allow.

Adult Social Flow product truth still holds:

- Conversation-first planning  
- Proposals, not silent binding events  
- Python proposes; Elixir is authoritative  
- Shared plan vs private care work isolation  
- No Social Score, no ads on intimate data, no covert mood surveillance  

Youth peer flow **adds** contact gates, invitation provenance, capability-scoped guardian roles, and hard limits on strangers, location, forwarding, and commercial pressure.

---

## What child-to-child is for

Peer Social Flow helps real relationships children already have—not growth-hacking new ones.

### Foundational peer scenarios

| Scenario | User language (examples) | Coordination shape |
|----------|--------------------------|--------------------|
| **Playdate** | “Can you come over Saturday?” | Proposal → guardian gates → agreement → pickup logistics |
| **Study / homework** | “Want to work on math after school?” | Low-risk peer plan; time windows; materials checklist (private or shared) |
| **Gaming session** | “Online at 4?” | Time agreement; **no** unapproved external account bridging as Opal authority |
| **Sports meetup** | “See you at practice—carpool?” | Recurring plan; transport is elevated risk |
| **Birthday** | “You’re invited to my party” | Invitation object; guest list; optional surprise isolation for guest of honor |
| **School project** | “Our poster is due Friday—divide tasks?” | Commitments, reminders, file/link care without turning into a classroom LMS |
| **Neighborhood hangout** | “Bike ride after lunch?” | Meetup risk class; location purpose-limited |
| **Sibling plans** | “Fort in the living room after dinner” | Same-household; lighter external risk; still no scoring |
| **Approved group** | Team chat, small club, class project pod | Group membership guardian-scoped by tier |

These map to the same **primitives** as adult Social Flow (proposal, availability grant, time option, participation, commitment, revision)—not hard-coded mini-apps.

---

## Explicit non-goals

| Non-goal | Why |
|----------|-----|
| Public youth social network | Discovery abuse, grooming adjacency |
| Open stranger messaging | Adult stranger contact is a primary threat vector |
| Adult dating / romantic intelligence surfaces for young tiers | Wrong product center |
| Gamified popularity, streaks-as-pressure, Social Score | Manipulative; forbidden |
| Ad targeting or influencer funnels on peer plans | Exploitation |
| Guardian live wiretap of every peer message by default | Over-surveillance product failure |
| Silent auto-accept of invitations | Authority violation |
| Precise continuous location sharing among kids | Safety + privacy failure |
| Unrestricted message forwarding / invite cascades | Contact graph and coercion risk |

---

## Participants and roles

| Role | Description |
|------|-------------|
| **Child principal (A, B, …)** | Minor account in tier T1–T3 initiating or joining peer coordination |
| **Guardian (Ga, Gb, …)** | Linked adult with tier-scoped authority—not unlimited omniscience |
| **Co-guardian / other household** | Custody-aware visibility grants |
| **Delegated adult** | Narrow logistics only (e.g., coach publishes practice time)—not peer chat participant by default |
| **Approved group** | Bounded membership set created under guardian rules |

**Hard rule:** An **unapproved adult** is never a silent participant in child-to-child threads. Adult join paths require explicit, auditable approval rules (**OPEN** details).

---

## Contact and discovery model

### Approved contacts only (default)

Child-to-child communication requires an **approved contact relationship** before messaging or plan invites.

How a peer becomes approved (conceptual):

```text
Request (child or guardian)
  → Other side’s guardian/child rules by tier
  → Mutual acceptance conditions met
  → Contact edge becomes “approved”
  → Messaging / low-risk plans may proceed under tier policy
```

| Mechanism | Youth posture |
|-----------|---------------|
| Phone-book bulk upload discovery | **Default off / forbidden** for child accounts until LEGAL + privacy review |
| Public profile search | **Forbidden** for T1–T2; T3 **OPEN** and still cautious |
| Invite link / QR | Allowed with **expiry, single-use or limited-use, guardian visibility by tier** |
| Mutual friend expansion | **Not** a free graph crawl; any suggestion is allowlist-shaped and non-pushy |
| Adult-initiated contact to child | **Blocked by default**; rare exceptions **OPEN / LEGAL_OR_POLICY** (e.g., known relative with guardian approval) |

Contact discovery abuse mitigations (rate limits, hashing, k-anonymity) from identity architecture still apply—and are **stricter** for youth.

---

## Invitation model

Invitations are **first-class objects**, not casual ambient spam.

### Invitation lifecycle

```text
Compose invite (peer plan or contact request)
  → Policy check (tier, contact edge, risk class)
  → Guardian involvement step (approve / notify / none—by matrix)
  → Deliver to recipient child (and recipient guardian if required)
  → Accept / decline / withdraw
  → On accept: conversation and/or SharedPlan membership updates
  → Audit trail (who invited, who approved, when)
```

### Rules

1. **No unauthorized invitations** — cannot invite a child outside policy (non-contact, blocked, suspended, wrong tier rules).  
2. **Provenance** — recipient sees who invited them and whether a guardian co-approved.  
3. **Limited forwarding** — re-sharing an invite or adding “plus ones” is restricted; viral invite chains are a defect.  
4. **Impersonation resistance** — display names are not authority; contact edge + guardian link + server identity are.  
5. **Decline is first-class** — no guilt copy, no dark-pattern re-prompt loops.  
6. **Group adds** — adding a child to an approved group requires the same class of gates as a direct invite.

### Guardian involvement by tier (conceptual)

| Tier | Contact request | Low-risk peer plan invite | Meetup / transport invite |
|------|-----------------|---------------------------|---------------------------|
| T1 | Guardian approve both sides (typical) | Guardian approve | Guardian approve + logistics visibility |
| T2 | Guardian approve new contacts; existing peers freer | Child may send; guardian notify or approve by risk | Guardian approve or strong notify **OPEN** |
| T3 | Child-led with safety checks | Child-led | Child-led + optional family notify settings |

Exact thresholds: **FOUNDER + LEGAL_OR_POLICY** (see AA-05 in age tiers doc).

---

## Plan risk classes for peer flow

Reuse risk classes from `OPAL_AGE_AUTHORITY_TIERS.md`:

| Class | Peer examples | Extra safeguards |
|-------|---------------|------------------|
| R2 low-risk | Study chat, project tasks, “call me after dinner” (voice still policy-bound) | Approved contacts; report/block |
| R3 social | Birthday, team hangout planning text | Invitation approval; limited guest list growth |
| R4 meetup / transport | Playdate in person, carpool, park | Guardian authority elevated; **no public location**; time-limited location share only if ever enabled |
| R5 money | Ticket split, gift contribution | Guardian financial gate |
| R7 surprise | Surprise party for a peer | Guest isolation; helpers allowlisted |

**Location rule (peer):**

- No public or ambient location of children  
- No “find my friends” continuous tracking as a youth feature  
- Meetup coordination prefers **named place + time** agreed in plan fields over live GPS  
- Any live location share is purpose-limited, time-boxed, visible to the child, and tier-gated (**OPEN** whether allowed at all for T1–T2)

---

## Communication protections

### Allowed product behaviors

- Clear, age-appropriate language  
- Lightweight plan affordances inside conversation (dismissible)  
- Commitments the child actually accepted  
- Gentle reminders the user/guardian configured—not fear-based pushes  
- Report and block that work  
- Plain explanations of what guardians can see (tier-appropriate)

### Forbidden product behaviors (youth peer surfaces)

| Forbidden | Why |
|-----------|-----|
| Manipulative engagement (streak shame, “they’re waiting—reply now” pressure loops) | Harm |
| Social Score / popularity / “reliability” grades | Safety law |
| Ads, sponsored peer suggestions, shopping funnels in youth chat | Exploitation |
| Hidden emotional profiling of children or peers | Surveillance |
| Purchases without guardian where tier requires G | Financial safety |
| Adult stranger injection into peer threads | Grooming vector |
| Read receipts / presence tuned for stalking | Coercive control adjacency |
| AI certainty about a peer’s private feelings | Uncertainty doctrine |
| Auto-send drafts | Agency violation |

### Messaging shape (not adult clone)

Youth peer messaging may share the familiar thread UX but **must not** inherit adult defaults for:

- global discovery  
- open group join links  
- unrestricted media re-sharing  
- AI private insights about another child  
- presence/last-seen richness (**OPEN** — default conservative)

---

## Social Flow lifecycle (youth peer)

Same conceptual lifecycle as adult Social Flow; **gates** differ.

```text
Conversation among approved peers
  → possible plan (proposal only)
  → policy + guardian gates (by risk × tier)
  → consent to coordinate (child and/or guardian)
  → shared options (availability grants—careful with household privacy)
  → agreement
  → commitment (authoritative plan state in Elixir)
  → preparation (private vs shared care work still isolated)
  → adaptation (changes notify required parties)
  → follow-through
  → relationship memory (strictly scoped; youth retention OPEN)
```

**Python** may propose: “this looks like a playdate Saturday afternoon” with uncertainty.  
**Elixir** enforces: contact edges, guardian grants, plan membership, and whether a SharedPlan may exist.

Never: silent playdate on the calendar; silent invite fan-out to a class list; silent guardian live transcription of peer chat as a default feature.

---

## Multi-household and sibling patterns

| Pattern | Product notes |
|---------|---------------|
| Two kids, four guardians | Approvals may require the **responsible guardian set** for each child—not every adult in every household for every R2 chat (**OPEN** simplification rules) |
| Sibling plan in one home | Lower external risk; still no scoring; shared device handoff risks apply |
| Child A invites Child B who is blocked at B’s household | Invite fails closed; no partial leak of B’s existence beyond policy |
| Custody week switches | Plan participation and pickup authority follow **grants**, not assumptions about “default parent” |

Opal coordinates logistics; Opal does **not** adjudicate custody disputes.

---

## Report, block, and safety tooling

Minimum youth peer toolkit:

1. **Block** — stops messages, invites, presence leakage, plan adds  
2. **Report** — routes to trust & safety process (**OPEN** SLA and guardian co-notify rules)  
3. **Leave plan / leave group** — first-class; not buried  
4. **Freeze new contacts** — guardian or safety action  
5. **Invite audit** — child and guardian can see recent invitation history  

Safety drafting refusals (threats, harassment, sexual content involving minors, self-harm adjacency) apply **more strictly** on youth surfaces. User-typed content may still exist; Opal must not **help** produce abuse content.

Coercive control **within** family is handled carefully in the threat model and guardian boundaries—product is not a courtroom and must not generate “evidence packs” for custody warfare.

---

## AI boundaries on child-to-child threads

| AI capability | Youth posture |
|---------------|---------------|
| Plan proposal from conversation | Allowed under consent + policy codes; uncertainty mandatory |
| Drafting replies | Restricted; no manipulative or coercive phrasing assistance |
| Translation | On-request; processing consent required |
| Private “how might they feel” insights about a peer | **Default off / discouraged**; never certainty; often **forbidden** for T1–T2 **OPEN** |
| Memory of peer preferences | Short-lived, purpose-limited, no advertising, no scoring |
| Always-on analysis of youth chat | **Forbidden** |

Guardian enabling “family coordination AI” does **not** equal license for emotional surveillance of the child’s friends.

---

## Availability and household privacy

When resolving “when can we hang out?”:

- Prefer **free/busy or coarse windows** over exposing full family calendars to peers  
- Other household members’ private events must not leak through a child’s availability grant  
- Guardian may set default availability disclosure level for the child account  

Aligns with `SOCIAL_FLOW_PRIVACY_BOUNDARIES.md` availability grants—stricter defaults for youth.

---

## Unresolved decision matrix

| ID | Decision | Class |
|----|----------|-------|
| CC-01 | Whether T2 study chats among approved peers can skip guardian notify | **FOUNDER + PRODUCT_RESEARCH** |
| CC-02 | Maximum approved group size by tier | **PRODUCT_RESEARCH + SAFETY** |
| CC-03 | Voice/video in youth peer threads | **OPEN / LEGAL_OR_POLICY + FOUNDER** |
| CC-04 | Media (images/location screenshots) retention and guardian visibility | **OPEN / LEGAL_OR_POLICY** |
| CC-05 | Cross-age peer edges (T1 with T3, teen with young adult) | **OPEN / LEGAL_OR_POLICY** — high sensitivity |
| CC-06 | School-managed rosters as contact bootstrap | **OPEN / LEGAL_OR_POLICY** |
| CC-07 | Gaming identity linking (external gamertags) | **FOUNDER + SAFETY** — do not become open bridge to strangers |
| CC-08 | Guardian co-notify on report events | **OPEN / LEGAL_OR_POLICY** |
| CC-09 | Default presence / last-seen for youth | **PRODUCT_RESEARCH + SAFETY** — recommend minimal |
| CC-10 | Sibling automatic approval edges | **FOUNDER + PRODUCT** |

---

## Acceptance themes (for future test architecture)

When implementation exists, tests must include:

- Invite to non-contact child fails closed  
- Block removes in-flight plan membership paths  
- Guardian approval required when matrix says G  
- No adult stranger join without explicit approved path  
- No cross-household calendar title leakage via availability  
- Surprise guest isolation still holds  
- Limited forwarding enforced  
- AI job refused without youth-appropriate consent proof  
- No Social Score fields in youth APIs  

---

## Alignment

Extends without weakening:

- `OPAL_SOCIAL_FLOW_PRODUCT_TRUTH.md`  
- `OPAL_AGE_AUTHORITY_TIERS.md`  
- `RELATIONSHIP_SAFETY_RULES.md`  
- `CONSENT_MODEL.md`  
- `SOCIAL_FLOW_PRIVACY_BOUNDARIES.md`  

**Label:** ACCEPTED PRODUCT TRUTH (conceptual). Legal ages and mandatory reporting remain **OPEN / LEGAL_OR_POLICY**.
