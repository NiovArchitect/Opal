# Opal Age and Authority Tiers

**Authority:** ACCEPTED PRODUCT TRUTH  
**Status:** Conceptual product law for family / minor design — **not** final legal ages  
**Audience:** Product, design, trust & safety, privacy, backend, mobile, QA  
**Related:** `RELATIONSHIP_SAFETY_RULES.md`, `CONSENT_MODEL.md`, `OPAL_SOCIAL_FLOW_PRODUCT_TRUTH.md`, `OPAL_GUARDIAN_BOUNDARIES.md`, `OPAL_CHILD_TO_CHILD_SOCIAL_FLOW.md`, `docs/architecture/CHILD_SAFETY_THREAT_MODEL.md`

---

## Locked product stance

> **Minors are not adults with a parental-control screen bolted on.**  
> Opal must model **age-appropriate authority, safety, visibility, consent, guardian involvement, contact rules, and communication protections** as first-class product architecture.

Opal does **not**:

- Ship youth experiences as “adult product + spy dashboard”
- Treat surveillance as the default family safety model
- Grant guardians unlimited access to every private child communication by default
- Invent a single global “legal age number” in product docs as if it were law

Opal **does**:

- Use **conceptual tiers** that map to capability, autonomy, and safeguards
- Vary authority by **child age tier, guardian status, plan type, capability domain, family structure, and jurisdiction**
- Protect **child dignity, developing autonomy, and legitimate private space** while elevating safety where risk is higher
- Mark legal cutoffs, notice requirements, and regional rules as **OPEN / LEGAL_OR_POLICY** until counsel and founder lock them

Historical deferral (`SF-D011`, `G052`): minors were out of initial Social Flow architecture. This document **opens the dedicated safety track** as product truth for design; it does **not** authorize shipping youth features before legal/policy gates close.

---

## What “authority” means in Opal

**Authority** is the right of a principal (child, guardian, adult peer, system) to:

| Authority domain | Examples |
|------------------|----------|
| **Account** | Create, recover, delete, link devices, change identity bindings |
| **Contact** | Add peers, accept invites, message outside approved set |
| **Plan / Social Flow** | Propose, accept, revise, cancel, invite others |
| **Visibility** | What guardians, co-guardians, or household members may see |
| **Consent (AI)** | Enable AI features, memory, transcription, drafting |
| **Financial** | In-app purchase, paid plans, shared spend on events |
| **Transport / location** | Meetups, pickup logistics, location shares |
| **Medical / sensitive logistics** | Dental, medical appointments, care handoffs (coordination only—not clinical advice) |
| **Safety actions** | Report, block, freeze contacts, escalate emergency change |
| **Export / deletion** | Data export, account erasure requests |

Authority is **capability-scoped**, not a single “parent override everything” bit.

---

## Conceptual tiers (not final legal ages)

**Rule:** Tier names are product architecture. Numeric ages, school-grade mappings, and jurisdictional majority thresholds are **OPEN / LEGAL_OR_POLICY**. Do not hard-code “under 13,” “16,” or “18” as locked product law in implementation without an external policy decision.

### Tier T0 — Pre-account / guardian-mediated only

| Dimension | Product truth |
|-----------|---------------|
| Account | No independent Opal account for the child |
| Presence | Child may appear only as a **dependent participant** on a guardian-owned plan or household context (e.g., “pick up Maya at 3”) |
| Messaging | No child-to-child or child-initiated messaging channel |
| Discovery | None |
| AI | No child-facing AI profile |
| Guardian role | Full mediation; child is a **subject of logistics**, not a principal communicator |

**Use cases:** Very young children; regions or product modes where independent accounts are forbidden; temporary “mentioned child” in adult coordination without granting the child a login.

---

### Tier T1 — Younger child (guardian-managed account, highly restricted peers)

| Dimension | Product truth |
|-----------|---------------|
| Account | Guardian-managed account; child may use a device session under household rules |
| Contacts | **Allowlist only** — guardians approve every peer / adult contact |
| Child-to-child | Only with dual guardian gates (see child-to-child flow); tiny approved set |
| Discovery | **Off** — no public discovery, no broad contact-book matching for the child |
| Plans | Guardian co-authority or primary authority on nearly all plan types |
| Location / meetups | No public location; meetups require guardian approval and adult-safe logistics |
| Purchases | Guardian-only |
| AI | Highly restricted: coordination help may run under guardian consent; no emotional profiling, no scoring, no manipulative engagement |
| Private space | Minimal private channel space; any private notes are tier-limited and never sold or used for ads |
| Language / UX | Age-appropriate copy; no adult romantic / dating intelligence surfaces |

---

### Tier T2 — Older child / early teen (expanding autonomy with guardian gates)

| Dimension | Product truth |
|-----------|---------------|
| Account | Child-facing account with **standing guardian relationship** (link remains mandatory unless LEGAL_OR_POLICY allows otherwise) |
| Contacts | Allowlist default; limited self-request to add peers, still guardian-gated for new contacts |
| Child-to-child | Expanding: school project, sports, study, approved group — with invitation approval rules by capability |
| Discovery | Restricted (invite, QR, mutual approval)—not adult graph discovery |
| Plans | Child may propose and negotiate many peer plans; guardian notification or approval depends on **plan risk class** |
| Location / meetups | Purpose-limited shares; no continuous tracking; meetup plans often need guardian visibility or approval |
| Purchases | Guardian gate for money movement |
| AI | Coordination and homework-adjacent drafting under consent; **no** relationship health scores; uncertainty doctrine still applies; no hidden emotional profiling of peers |
| Private space | **Legitimate private space expands** — not all chat is guardian-readable by default (see guardian boundaries) |
| Dignity | Product must explain what guardians see in plain language to the child |

---

### Tier T3 — Older teen approaching majority (more self-authority; safety still elevated)

| Dimension | Product truth |
|-----------|---------------|
| Account | High self-authority; guardian link may become optional or advisory depending on jurisdiction (**OPEN / LEGAL_OR_POLICY**) |
| Contacts | Broader peer freedom; **adult stranger contact remains restricted** relative to full adult product |
| Child-to-child / peer | Near-adult peer planning with elevated safety tooling (report/block, invite provenance, limited forwarding) |
| Discovery | Still more cautious than adult default until majority / policy unlock |
| Plans | Self-authority for most social plans; financial / high-risk / medical logistics may retain optional guardian share |
| Location | Same purpose-limited model as adult Social Flow; default off; no covert proximity |
| Purchases | May self-purchase where law allows; parental finance tools are opt-in family features, not surveillance |
| AI | Closer to adult consent model; still bans scoring, ads on intimate data, manipulative engagement |
| Private space | Default private communications; guardian visibility is **capability- and consent-sensitive**, not blanket |
| Transition | Explicit **majority graduation** flow (OPEN on proof, timing, residual guardian data access) |

---

### Tier T4 — Adult

| Dimension | Product truth |
|-----------|---------------|
| Account | Full adult product under existing product truth, consent model, and safety rules |
| Guardian | Not applicable (except when the adult **is** a guardian of others) |
| Family features | Adults may hold guardian roles, multi-household custody logistics, and family-circle coordination |
| Safety | Baseline adult safety (block, report, coercive-control mitigations)—not child tier architecture |

---

## Authority matrix (conceptual)

**Legend**

- **C** — child principal may act alone  
- **G** — guardian approval or co-action required  
- **N** — notify guardian (no hard block)  
- **—** — not available  
- **OPEN** — legal/policy must define before ship  

Cells describe **product intent**, not shipping claims.

| Capability | T0 | T1 | T2 | T3 | T4 |
|------------|----|----|----|----|-----|
| Independent account | — | G-managed | G-linked | C (G link OPEN) | C |
| Message approved peer | — | C within allowlist | C within rules | C | C |
| Add new peer contact | — | G | G (request by C) | C with safety checks | C |
| Contact unknown adult | — | — | — / G rare exceptions OPEN | Restricted OPEN | C with adult safety |
| Propose low-risk peer plan (study, homework chat) | — | G | C + N or G by policy | C | C |
| Propose meetup / transport plan | — | G | G | C + N (or G by family setting) | C |
| Share precise location | — | G only, time-limited | G or dual rules | C purpose-limited | C purpose-limited |
| Enable AI on conversation | — | G | G or dual C+G OPEN | C | C |
| In-app purchase | — | G | G | OPEN | C |
| Export / delete account | — | G (+ child voice where required OPEN) | G + child notice OPEN | C with policy | C |
| View child’s full message history (guardian) | n/a | Tier-limited; not “everything always” | Capability-sensitive | Default private | n/a |
| Block / report | — | C + G visibility | C (+ G for severe) | C | C |

Exact notify-vs-approve thresholds: **FOUNDER + LEGAL_OR_POLICY + PRODUCT_RESEARCH**.

---

## Authority differs by more than age

Tier alone is insufficient. Authority must also consider:

### 1. Guardian status

| Status | Meaning |
|--------|---------|
| **Primary guardian** | Account manager; highest family authority on T0–T2 |
| **Co-guardian** | Shared rights (custody-aware); scopes must not assume single-household |
| **Delegated caregiver** | Time-boxed, capability-limited (e.g., pickup only)—not full chat access |
| **No guardian link** | Only where law and product policy allow (typically T3+ / T4) |

Multi-household / custody logistics are **foundational**, not edge cases. Conflicting guardian directives are **OPEN / LEGAL_OR_POLICY** (product must not become a courtroom; see safety rules).

### 2. Plan / activity risk class

| Risk class | Examples | Default posture (T1–T2) |
|------------|----------|-------------------------|
| **R0 logistics-about-child** | School pickup, dental, guardian-owned chores | Guardian-primary; child may be informed participant |
| **R1 household** | Chores, reminders, family dinner | Guardian-led or family circle |
| **R2 low-risk peer** | Homework help chat, school project text, sibling plan at home | Expanding child autonomy |
| **R3 social peer** | Birthday invite, sports practice coordination among known peers | Guardian gate or notify by tier |
| **R4 meetup / transport** | Playdate at park, ride arrangements | Elevated guardian involvement |
| **R5 money** | Tickets, gifts, group spend | Guardian financial authority |
| **R6 sensitive** | Medical handoff details, emergency schedule change | Guardian authority; minimize peer fan-out |
| **R7 restricted surprise** | Surprise party excluding child guest | Same surprise rules as adult Social Flow; child-guest isolation still applies |

### 3. Capability domain

Safety elevation is domain-specific:

- **Financial** stays stricter longer than **homework chat**  
- **Location / transport** stays stricter longer than **in-thread scheduling text**  
- **External adult contacts** stay restricted longer than **approved same-age peers**  
- **AI memory and emotional inference** stay restricted longer than **structured plan fields**  
- **Medical / emergency logistics** prioritize guardian reachability without turning Opal into a medical record system  

### 4. Family structure

- Single guardian  
- Dual / multi-guardian same household  
- Split custody / multi-household  
- Caregiver or school-staff **delegation** (narrow, audited)  

Product must support **scoped grants**, not “one parent sees all forever.”

### 5. Jurisdiction and account type

| Factor | Effect |
|--------|--------|
| Jurisdiction | Age of digital consent, parental consent proofs, data retention, school rules — **OPEN / LEGAL_OR_POLICY** |
| Account type | Guardian-managed vs child-primary vs adult |
| Device | Shared family tablet vs personal phone — see threat model (device handoffs) |
| Plan type (commercial) | Future family plan entitlements must not purchase “total surveillance” as a SKU |

---

## Parent–child scenarios as foundational product surface

These are **core relationship patterns**, not afterthoughts. Social Flow primitives (proposal → consent → agreement → commitment → adaptation) still apply; authority tiers change **who may act and who must know**.

| Scenario | Typical drivers | Authority notes |
|----------|-----------------|-----------------|
| School pickup | Time, place, who is authorized | R0/R4; guardian + delegated caregiver; child notified as appropriate |
| Sports practice / games | Recurring schedule, carpool | R3–R4; co-guardian visibility |
| Medical / dental | Appointment, transport, privacy of details | R6; minimize peer exposure; not clinical records |
| Homework / school project | Deadlines, peer collaboration | R2; expanding T2 autonomy |
| Family trips | Multi-party logistics | Family circle; private packing vs shared itinerary |
| Birthdays | Celebration plan, guest list, surprise mode | R3 + restricted surprise rules |
| Chores / household plans | Reminders, completion | R1; dignity-preserving, no scoring |
| Permission requests | “May I go to…?” | Explicit request/response object; audit-friendly |
| Playdates | Peer + guardians | Child-to-child flow + guardian gates |
| Transport changes | Late bus, traffic, emergency pickup | High-priority notify; verified principals only |
| Multi-household custody logistics | Two homes, two calendars of care | Co-guardian scopes; no weaponized “evidence packs” |
| Device handoffs | Shared tablet, parent phone | Session isolation; no cross-profile message bleed |
| Schedule conflicts | Two events, one child | Conflict as coordination problem—not guilt score |
| Celebrations | Holidays, milestones | Family circle warmth; no engagement dark patterns |

---

## Consent model extensions for minors

Adult consent layers (L0–L4 in `CONSENT_MODEL.md`) still exist. For minors, add:

```text
L0 Legal / age gate (LEGAL_OR_POLICY)
  └── Guardian link / household grant
        └── Tier-scoped feature consent
              └── Conversation / plan consent (child and/or guardian by tier)
                    └── Action consent (send, accept plan, share location)
                          └── Governed event (purchases, sensitive shares)
```

**Rules:**

1. Child-facing AI is **never** silent surveillance of the child for guardian entertainment.  
2. Guardian consent can authorize **safety and coordination** features; it does **not** automatically authorize reading all private peer chat (tier- and capability-sensitive).  
3. Dual-consent spirit still applies when intelligence is **shared across people**—including guardian–child shared plan views.  
4. Revocation and deletion paths must be explainable to both guardian and child (age-appropriate).  
5. Clinical diagnosis theater, relationship health scores, and ads on intimate family data remain **forbidden** at every tier.

---

## What is rejected as product architecture

| Rejected pattern | Why |
|------------------|-----|
| Adult app + “parental controls” skin only | Wrong autonomy and safety model |
| Default full message surveillance for guardians | Dignity failure; over-surveillance threat |
| Public discovery / stranger graph for minors | Grooming and contact abuse vectors |
| Social Score, reliability grades, popularity metrics | Manipulative; banned under safety rules |
| Ads / engagement farming on youth content | Exploitation |
| Hidden emotional profiling of children or their peers | Surveillance product failure |
| Unrestricted adult messaging UX for young tiers | Contact and content risk |
| Auto-RSVP / auto-accept playdates | Authority violation |
| Continuous precise location of children | Rejected; purpose-limited only |
| Courtroom / custody-evidence product | Safety rules: Opal is not a court |

---

## Unresolved decision matrix (legal / policy review)

| ID | Decision | Class | Notes |
|----|----------|-------|-------|
| AA-01 | Numeric age boundaries for T0–T3 and majority graduation | **OPEN / LEGAL_OR_POLICY** | Do not invent global numbers as law |
| AA-02 | Age attestation vs verified parental consent proofs | **OPEN / LEGAL_OR_POLICY** | Per jurisdiction |
| AA-03 | Whether T3 may drop guardian link before legal majority | **OPEN / LEGAL_OR_POLICY** | |
| AA-04 | School official / coach delegate account model | **OPEN / LEGAL_OR_POLICY + PRODUCT** | Narrow grants only |
| AA-05 | Default notify vs approve thresholds per risk class × tier | **FOUNDER + PRODUCT_RESEARCH** | |
| AA-06 | Multi-guardian conflict resolution when approvals disagree | **OPEN / LEGAL_OR_POLICY** | Avoid courtroom features |
| AA-07 | Child right to private space vs mandatory reporting laws | **OPEN / LEGAL_OR_POLICY** | Product dignity vs legal duty |
| AA-08 | Data retention for guardian-visible vs child-private stores | **OPEN / LEGAL_OR_POLICY** | |
| AA-09 | Cross-border family (guardians in different jurisdictions) | **OPEN / LEGAL_OR_POLICY** | |
| AA-10 | Youth AI training / processor rules | **OPEN / LEGAL_OR_POLICY + EXTERNAL** | Prefer no training on youth content |
| AA-11 | Emergency “break glass” guardian access | **OPEN / LEGAL_OR_POLICY + FOUNDER** | Audited, rare, disclosed |
| AA-12 | Commercial family SKU limits (what may never be sold) | **FOUNDER + LEGAL** | No “total surveillance” SKU |

These IDs are for the child-safety program track; Agent Zero may map them into `GAPS_AND_OPEN_DECISIONS.md` / blocker ledger without treating this file as a shipping authorization.

---

## Implementation ownership (when built)

| Concern | Owner |
|---------|-------|
| Tier state, guardian links, capability grants | Elixir / Opal core (authoritative) |
| Enforcement on messaging, plans, invites | Elixir authz on every path |
| AI proposals respecting youth policy codes | Python workers under Elixir consent/policy |
| Child / guardian UX copy and disclosure | Mobile + design |
| Legal age tables, notices, DPA terms | FOUNDER + counsel (**EXTERNAL_BLOCKED** until set) |

Python **never** assigns tier or guardian authority. Elixir holds authoritative age/guardian/capability state.

---

## Alignment with existing product law

This document **extends and never weakens**:

- `Opal_PRODUCT_TRUTH.md` — private Social OS; no covert surveillance  
- `OPAL_SOCIAL_FLOW_PRODUCT_TRUTH.md` — consented living coordination; minors not a simple product variant  
- `OPAL_RELATIONSHIP_INTELLIGENCE_PRINCIPLES.md` — no scores; dedicated minor architecture  
- `RELATIONSHIP_SAFETY_RULES.md` — consent continuous; Opal not a courtroom  
- `CONSENT_MODEL.md` — granular, revocable consent  

---

## Labels for readers

| Claim type | How to read |
|------------|-------------|
| Stance, tiers, rejected patterns, parent–child foundational scenarios | **ACCEPTED PRODUCT TRUTH** (conceptual) |
| Numeric ages, jurisdictional consent, mandatory access | **OPEN / LEGAL_OR_POLICY** — not product-lockable here |
| Runtime modules | Not claimed built; future gated implementation |
