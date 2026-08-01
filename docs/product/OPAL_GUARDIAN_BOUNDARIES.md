# Opal Guardian Boundaries

**Authority:** ACCEPTED PRODUCT TRUTH  
**Status:** Conceptual product law for guardian visibility, control, and dignity-preserving limits  
**Audience:** Product, design, trust & safety, privacy, backend, mobile, QA, counsel (review)  
**Related:** `OPAL_AGE_AUTHORITY_TIERS.md`, `OPAL_CHILD_TO_CHILD_SOCIAL_FLOW.md`, `CONSENT_MODEL.md`, `RELATIONSHIP_SAFETY_RULES.md`, `docs/architecture/CHILD_SAFETY_THREAT_MODEL.md`, `docs/architecture/SOCIAL_FLOW_PRIVACY_BOUNDARIES.md`

---

## Locked product stance

> **Guardians are partners in safety and logistics—not unlimited owners of a child’s entire inner life by default.**  
> Opal gives guardians **capability- and tier-sensitive** authority.  
> It does **not** ship “watch everything your child types” as the flagship family feature.

Parent–child relationships may need **stronger safeguards** than adult–adult chat. Those safeguards must still respect:

- **Child dignity**  
- **Developing autonomy**  
- **Legitimate private space** when developmentally appropriate  
- **Multi-household reality** (custody, co-guardians, caregivers)  
- **Non-courtroom** product ethics (no evidence-pack warfare tools)

Surveillance-by-default is a **product failure mode**, not a premium SKU.

---

## Guardian relationship types

| Type | Scope intent |
|------|----------------|
| **Primary guardian** | Account management, tier-appropriate approvals, safety configuration |
| **Co-guardian** | Shared or split rights; must support multi-household without assuming a single “boss parent” |
| **Delegated caregiver** | Time-boxed, purpose-limited (pickup, sit, transport)—**not** full message access by default |
| **Emergency contact** | Reachability and break-glass paths only (**OPEN** design) |
| **Former guardian** | Access ends or sharply reduces on unlink; retention **OPEN / LEGAL_OR_POLICY** |

Authority is expressed as **grants** (capabilities + scopes + time bounds), not a single boolean `is_parent=true`.

---

## Design principles

1. **Least privilege for guardians** — access matches safety and logistics need, not curiosity.  
2. **Least surprise for children** — children (at readable ages) know what guardians can see.  
3. **Tier-sensitive defaults** — T1 ≠ T3.  
4. **Capability-sensitive visibility** — plan logistics ≠ private diary-like peer chat.  
5. **Auditability** — sensitive guardian access is logged; silent omniscience is forbidden.  
6. **Reversibility** — grants expire; features revoke; unlink has a defined path.  
7. **Anti-weaponization** — features that primarily help coercive control inside a family are rejected or heavily constrained.  
8. **Not a courtroom** — no “export everything to use against the other parent” product center.  
9. **Safety over engagement** — no guilt scores for children or parents.  
10. **Align with adult privacy law** — Personal Context Boundary still exists for the child as a person.

---

## Visibility model: what guardians may see

Visibility is **not** binary. Use classes:

| Visibility class | Meaning |
|------------------|---------|
| **V0 None** | Guardian has no read access to that object |
| **V1 Metadata** | Exists / time / participants count / plan title level—without message bodies |
| **V2 Logistics** | Shared plan fields: time, place name, participation state, transport notes meant for caregivers |
| **V3 Safety summary** | Aggregated safety signals (new contact pending, report filed)—not full transcripts |
| **V4 Full content** | Message bodies / media in scope |
| **V5 Account admin** | Devices, recovery, purchase controls, contact allowlist admin |

### Default posture by object type (conceptual)

| Object | T1 typical | T2 typical | T3 typical |
|--------|------------|------------|------------|
| Contact allowlist admin | V5 guardian | V5 with child requests | Child-led; guardian optional |
| Pending contact / invite | V3–V5 | V3–V5 | V1–V3 settings |
| Low-risk peer chat content | V4 limited **or** V1–V2 with samples **OPEN** | **Prefer private (V0–V1)** with safety tools | **Default private (V0)** |
| Meetup / transport plan | V2–V4 as needed | V2 + notify | V1–V2 optional share |
| School pickup / medical logistics | V2–V5 guardian-primary | Guardian-primary | Optional share |
| Child private reminders / journal-like notes | V0 if feature exists | V0 | V0 |
| AI private reflections about the child | V0 to other parties; guardian copy only if explicitly family-shared | V0 | V0 |
| Purchases | V5 | V5 | OPEN |
| Device sessions | V5 | V5 / shared | Child-primary |
| Block / report events | V3 (+ policy) | V3 | V3 optional |

**Critical truth:** Even at T1, “guardian sees every private thought forever” is **not** the celebrated default. Where law requires stronger parental access, that is **OPEN / LEGAL_OR_POLICY**—implemented as **disclosed, bounded, audited** access—not marketing surveillance.

---

## What remains the child’s private space

When developmentally appropriate (especially T2–T3), the following should tend private unless the child shares or a narrow safety exception applies:

- Peer message **content** in approved low-risk threads  
- Private preparation (“buy gift for friend,” personal feelings drafts)  
- Private commitments that are not household logistics  
- AI reflections addressed only to the child  
- Exploratory plans declined or abandoned before guardian-gated stages  

**Private space is not a free pass for harm.** Report/block, server-side abuse detection where lawfully and transparently applied, and emergency procedures may still exist. Those are **safety systems**, not parent entertainment feeds.

---

## Guardian controls (legitimate)

Guardians need real tools that are **not** the same as reading everything:

| Control | Purpose |
|---------|---------|
| **Contact allowlist / approvals** | Prevent stranger and unwanted peer edges |
| **Risk-class approval matrix** | Meetup vs homework vs purchase |
| **Quiet hours / device session limits** | Household rules without content spying |
| **Feature gates** | AI on/off, media, location capability |
| **Plan logistics inbox** | Pickups, practice times, permission requests |
| **Permission request queue** | “May I go to Jordan’s on Saturday?” as a first-class object |
| **Safety alerts** | New contact attempts, blocks, reports, policy hits—**summaries first** |
| **Delegation** | Grant sitter pickup window without chat history |
| **Multi-household share** | Share **logistics** with co-guardian, not necessarily full peer chat |
| **Freeze** | Temporarily stop new invites / outbound contact adds |

### Permission requests (foundational)

```text
Child requests permission (plan, contact, purchase, late curfew logistics)
  → Guardian(s) per grant rules notified
  → Approve / deny / counter-propose
  → Decision attaches to plan or contact edge
  → Child sees outcome in plain language
```

This is coordination with dignity—not a hidden veto buried in settings.

---

## What guardians must not get by default

| Capability | Status |
|------------|--------|
| Silent keystroke-level monitoring | **Rejected** |
| Hidden always-on transcription of child life for parent feed | **Rejected** |
| Undisclosed reading of T3 private peer chat | **Rejected** (defaults); legal override **OPEN** |
| Remote camera / mic activation | **Out of scope / rejected** as Opal family feature |
| Social Score of child or peers | **Rejected** |
| Weaponized “loyalty evidence” packs against co-parent or child | **Rejected** |
| Covert location trail | **Rejected** — location purpose-limited and disclosed |
| Impersonating the child to peers | **Rejected** |
| Reading the other guardian’s private adult conversations via child account | **Rejected** (cross-account leakage) |

---

## Disclosure duties

### To the child (age-appropriate)

- Who their guardians are in-product  
- What those guardians can see **now**  
- When a guardian approves or denies a request  
- When a safety alert about them is raised (where safe and lawful—**OPEN** edge cases)  
- How to ask questions / seek help (report)  

### To the guardian

- What they **cannot** see (so they do not form false confidence)  
- Which approvals are waiting  
- Device and contact admin state  
- That Opal is not guaranteeing omniscience  

False confidence (“you see everything”) is a **safety defect** if untrue.

---

## Multi-household and custody logistics

Foundational, not edge-case:

| Need | Boundary approach |
|------|-------------------|
| Two homes, two schedules | Separate logistics contexts; shared child plan objects with dual-guardian grants |
| Only Parent A has Saturday custody | Transport/meetup authority follows grants for that interval where modeled |
| Parent conflict | Product offers **coordination and clear grant state**, not adjudication |
| Information steers | Do not auto-share Parent A’s new partner chat into Parent B’s view via the child |
| Delegated pickup | Time-boxed V2 logistics to caregiver; V0 on peer chat |

**OPEN / LEGAL_OR_POLICY:** court orders as input to grants; product should not claim legal compliance automation without counsel.

---

## Parent–child foundational scenarios × visibility

| Scenario | Guardian typically needs | Child private space |
|----------|--------------------------|---------------------|
| School pickup | Time, place, authorized adult | Chatter with friends about unrelated topics |
| Sports | Practice calendar, carpool | Peer banter on the team thread (tier-sensitive) |
| Medical / dental | Appointment logistics | Clinical detail minimization; not a health record |
| Homework | Deadlines if family opts into school help | Peer study chat content (T2+) |
| Trips | Family itinerary | Personal packing list, gift surprises |
| Birthdays | Guest logistics, hosting | Surprise planning excluding birthday child |
| Chores | Household task list | No public shame score |
| Playdates | Approval + transport | In-playdate peer messages (tier-sensitive) |
| Permission requests | Decision UX | Child’s emotional drafts before sending request **OPEN** |
| Emergency change | High-priority notify, verified parties | Minimize fan-out to peers |
| Celebrations | Family plans | Private feelings, gift prep |
| Device handoffs | Session clarity, lock profiles | No reading wrong profile’s messages |

---

## AI and guardian boundaries

| Pattern | Rule |
|---------|------|
| Guardian enables AI for **family logistics** | Scoped to family/plan contexts they participate in |
| Guardian enables AI to **summarize child’s peer chat** | Not default; if ever offered, tier-limited, disclosed to child, high friction, **OPEN / LEGAL** |
| Child enables private AI help | Stays private to child unless they share |
| AI used to infer child’s “secrets” for parent dashboard | **Rejected** |
| AI certainty about family members’ minds | **Rejected** (uncertainty doctrine) |
| Training on youth content | **OPEN / LEGAL**; product preference: no public-model training |

---

## Consent, revocation, and unlink

| Event | Expected direction |
|-------|--------------------|
| Guardian revokes a feature | Stops new processing; UI explains residual data **OPEN** retention |
| Child (tier-appropriate) turns off optional share | Guardian loses that V-class on new data |
| Guardian unlink | Admin paths end; historical access **OPEN / LEGAL_OR_POLICY** |
| Account delete | Family-linked erasure path; counsel defines multi-party hard cases |
| Co-guardian removed | Grants tombstoned; audit retained as policy requires |

Revocation must be as clear as enablement—no dark patterns locking family surveillance on.

---

## Break-glass and emergency access

Rare, audited, disclosed paths may be required for extreme safety situations.

| Property | Requirement |
|----------|-------------|
| Trigger | Narrow categories only (**OPEN / LEGAL_OR_POLICY**) |
| Authority | Defined principals; not every co-guardian automatically |
| Audit | Durable log; visible after-action to appropriate parties where safe |
| Scope | Minimum data for the emergency |
| UX | Never presented as routine “spy mode” |

Until policy locks, treat break-glass as **design placeholder**, not implemented claim.

---

## Commercial and packaging ethics

| Forbidden package | Why |
|-------------------|-----|
| “Total visibility” premium tier | Sells surveillance; dignity failure |
| Paywall for basic block/report | Safety must not be gated exploitatively |
| Engagement boosts for family guilt notifications | Harm |

Family plans may include **extra devices, shared logistics, priority support**—not omniscience.

---

## Mapping to adult consent layers

Guardian boundaries sit **beside** `CONSENT_MODEL.md`:

```text
Legal / age gate
  └── Guardian link grants (this document)
        └── Feature consent (youth-restricted defaults)
              └── Conversation / plan consent
                    └── Action consent
```

Elixir remains authoritative for grant records, enforcement, and audit. Python never invents guardian visibility.

---

## Unresolved decision matrix

| ID | Decision | Class |
|----|----------|-------|
| GB-01 | Default V-class for T1 peer message bodies | **OPEN / LEGAL_OR_POLICY + FOUNDER** |
| GB-02 | Whether child can hide specific threads at T2 | **FOUNDER + PRODUCT_RESEARCH + LEGAL** |
| GB-03 | Co-guardian symmetric vs asymmetric grants | **FOUNDER + LEGAL** |
| GB-04 | Caregiver identity proofing | **EXTERNAL + LEGAL** |
| GB-05 | Mandatory disclosure copy decks by age tier | **PRODUCT_RESEARCH + LEGAL** |
| GB-06 | Break-glass categories and notice timing | **OPEN / LEGAL_OR_POLICY** |
| GB-07 | Unlink / custody-change operational playbooks | **OPEN / LEGAL_OR_POLICY** |
| GB-08 | Whether guardians see report **contents** or only that a report occurred | **OPEN / LEGAL_OR_POLICY + SAFETY** |
| GB-09 | Child appeal path when guardian deny feels unfair | **PRODUCT_RESEARCH** — dignity; not courtroom |
| GB-10 | Shared device “profile fence” guarantees | **INTERNAL + MOBILE architecture** |

---

## Alignment with safety law

Reinforces `RELATIONSHIP_SAFETY_RULES.md`:

- Intimate data is radioactive—including youth peer content  
- Consent is continuous  
- Private ≠ shared  
- Circles are blast radius  
- Opal assists; humans decide  
- Protect users from Opal overreach **and** from each other  
- Do not generate evidence packs for interpersonal warfare  
- Minors require dedicated policy—not adult defaults  

---

## Labels for readers

| Content | Label |
|---------|-------|
| Stance, visibility classes, rejected surveillance defaults, legitimate controls | **ACCEPTED PRODUCT TRUTH** |
| Numeric ages, mandatory parental access laws, break-glass legality | **OPEN / LEGAL_OR_POLICY** |
| Implementation modules | Not claimed present in runtime |
