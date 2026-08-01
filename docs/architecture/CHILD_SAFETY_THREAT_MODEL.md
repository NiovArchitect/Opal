# Child Safety Threat Model

**Authority:** ARCHITECTURE (CURRENT)  
**Status:** Living threat model for youth / family Social Flow — design phase; **not** a pen-test report or legal opinion  
**Method:** STRIDE-informed + product abuse cases specific to minors, guardians, and peer coordination  
**Related:** `docs/architecture/THREAT_MODEL.md`, `docs/product/OPAL_AGE_AUTHORITY_TIERS.md`, `docs/product/OPAL_CHILD_TO_CHILD_SOCIAL_FLOW.md`, `docs/product/OPAL_GUARDIAN_BOUNDARIES.md`, `docs/product/RELATIONSHIP_SAFETY_RULES.md`, `docs/architecture/SOCIAL_FLOW_PRIVACY_BOUNDARIES.md`, `docs/architecture/IDENTITY_AND_PHONE_NUMBERS.md`

---

## Purpose

Extend the general Opal threat model with **child- and family-specific** assets, adversaries, and mitigations.

This document assumes product truths:

- Minors are not “adults + parental screen”
- Surveillance-by-default is a **failure mode**
- Child dignity and private space matter
- Opal is **not a courtroom**
- Legal age cutoffs and mandatory duties are **OPEN / LEGAL_OR_POLICY**

---

## In scope

- Youth accounts (conceptual tiers T0–T3) and guardian-linked relationships  
- Child-to-child messaging and Social Flow plans  
- Parent–child logistics (pickup, sports, medical coordination, multi-household)  
- Contact discovery, invitations, groups  
- AI features touching youth content  
- Shared and personal devices used by families  
- Cross-account isolation (child ↔ guardian ↔ peers ↔ strangers)

## Out of scope (this draft)

- Full formal penetration test  
- Country-by-country compliance certification  
- School district enterprise deployments  
- Clinical safeguarding case management systems  
- Legal determination of abuse (human/legal processes)

Those remain **LEGAL / EXTERNAL** before public youth launch.

---

## Assets (youth / family elevated)

| ID | Asset | Why sensitive |
|----|-------|----------------|
| A1 | Youth message and media content | Intimate; grooming target; dignity |
| A2 | Youth contact graph / allowlist | Discovery abuse; social mapping |
| A3 | Invitation and approval records | Impersonation and social engineering |
| A4 | Shared plans (time, place, transport) | Physical meetup risk |
| A5 | Location / pickup logistics | Physical safety |
| A6 | Guardian link and grant state | Authority takeover |
| A7 | Device sessions / shared tablets | Cross-profile leakage |
| A8 | AI reflections and youth memory | Profiling and surveillance risk |
| A9 | Report / block / safety case metadata | Retaliation and confidentiality |
| A10 | Purchase / payment instruments | Financial abuse |
| A11 | Identity (phone, recovery) | Account takeover of child or guardian |
| A12 | Presence / last-seen / typing signals | Stalking and coercion |
| A13 | Multi-household custody logistics data | Weaponization between adults |
| A14 | School / sports schedule patterns | Predictable location inference |

---

## Adversaries and misuse actors

| Actor | Interest / harm |
|-------|-----------------|
| **Adult stranger** | Contact children; grooming; meetup solicitation |
| **Impersonator** | Fake peer/guardian/coach identity; fraudulent invites |
| **Malicious peer** | Harassment, exclusion, coercion, non-consensual sharing |
| **Abusive guardian / household member** | Over-surveillance, coercive control, isolation, using app to intimidate (**careful product response—not courtroom**) |
| **Hostile co-parent** | Weaponize logs, location, messages in disputes |
| **Compromised guardian account** | Inherit full family authority |
| **Compromised child account** | Reach peers; alter plans; social engineering guardians |
| **Curious sibling on shared device** | Read wrong profile; send as sibling |
| **School/acquaintance social engineer** | Phish invites; scrape rosters |
| **External attacker / malware** | Session theft; local DB read |
| **Malicious insider / subprocessor** | Youth data exfiltration |
| **Abusive AI misuse** | Jailbreak drafting; profiling; certainty theater |
| **Product design itself** | Over-surveillance defaults; engagement dark patterns; ad systems |

---

## Priority threat scenarios

### 1. Adult stranger contact / grooming vectors

**Story:** Adult finds or messages a child; builds trust; moves to private channel or meetup.

| Vector | Example |
|--------|---------|
| Open discovery | Phone search, public profiles, “people nearby” |
| Graph crawl | Contact upload matching; friend-of-friend spam |
| Group injection | Join link to “team chat” with hidden adults |
| Plan hijack | Adult added as transport contact without verification |
| Cross-over from adult account | Adult product messaging youth without gates |
| External bridge | Gaming IDs, SMS off-platform coaxing (partially out of band) |

**Mitigations (design):**

- No public discovery for young tiers  
- Allowlist contacts; invitation provenance  
- Adult→child contact **default deny**  
- Group membership server-authoritative; no silent adult members  
- Meetup risk class forces guardian involvement by tier  
- Rate limits, anomaly detection on new edges (**OPEN** tooling)  
- Report/block that actually isolate  
- AI refuses to help draft grooming / sexual content involving minors  

**Residual risk:** Off-platform contact; compromised peer accounts; social engineering of guardians.

---

### 2. Impersonation and unauthorized invitations

**Story:** Attacker poses as a friend, coach, or co-parent to move a child or extract information.

| Vector | Example |
|--------|---------|
| Display-name spoof | “Mom” or peer nickname without identity binding |
| Invite replay / forward | Viral invite links reused |
| Fake guardian link | Social engineer child or support into linking attacker |
| Plan edit spoof | Change pickup person/time after agreement |
| Clone UX notifications | Phishing outside app (out of band) |

**Mitigations (design):**

- Server identity + contact edge as authority—not display name alone  
- Guardian link is high-assurance flow (**OPEN** proofing)  
- Invites: expiry, limited use, audit, visible approver  
- Plan revisions notify required parties; high-risk fields re-consent  
- Delegated caregiver grants time-boxed and purpose-limited  
- No SMS codes in logs; recovery hardened  

**Residual risk:** SIM swap on guardian phone; weak proofing if rushed to market.

---

### 3. Coercion / abuse within family (careful handling)

**Story:** A household member uses Opal to control, isolate, or intimidate a child or co-parent. Product must reduce harm **without** pretending to adjudicate abuse or custody.

| Vector | Example |
|--------|---------|
| Forced account access | Demanding passwords; watching over shoulder |
| Surveillance features marketed to abusers | Full transcript access as “parental controls” |
| Location coercion | Continuous tracking demands  
| Isolation | Removing all peer contacts as punishment without safeguards narrative |
| Evidence packs | Export tools designed for courtroom attack |
| Impersonation of child | Guardian messaging peers as the child |

**Mitigations (design):**

- Reject surveillance-as-default and “total visibility” SKUs  
- Tier-sensitive private space; disclosed visibility  
- No remote cam/mic; no covert location  
- No evidence-pack product center  
- Impersonating child to peers forbidden  
- Safety resources pathways **OPEN / LEGAL_OR_POLICY** (how/when to surface help)  
- Session locks, biometric options on personal devices (**mobile**)  
- Careful UX: do not instruct children in ways that increase acute danger without expert policy  

**Non-goals:** Opal does not determine legal abuse findings; does not replace hotlines or courts.

**Residual risk:** Physical coercion cannot be fully solved by software; avoid false safety promises.

---

### 4. Over-surveillance product failure mode

**Story:** Well-intentioned “safety” becomes always-on monitoring that destroys trust, drives kids off-platform to riskier channels, or normalizes intimate spying.

| Vector | Example |
|--------|---------|
| Default full chat mirroring to parents | T2/T3 dignity failure |
| Hidden AI parent summaries of peer drama | Covert profiling |
| Guilt notifications | “Your child is distant (score)” |
| Engagement-driven alerts | Noise that trains parents to ignore real signals |
| False omniscience | UI implies complete view when only metadata exists |

**Mitigations (design):**

- Guardian boundaries doc as product law  
- Summaries and logistics over raw feeds by default as tiers rise  
- No Social Score / emotion scores of children  
- Disclosure to child of guardian visibility  
- Safety alerts prefer **quality over volume**  
- Metrics for product health must not optimize “minutes of child chat watched by parent”  

**Residual risk:** Jurisdictions that mandate broader parental access—implement as disclosed legal mode, not dark pattern.

---

### 5. Cross-account leakage

**Story:** Data from one principal appears in another’s context without authorization.

| Vector | Example |
|--------|---------|
| Child AI job includes co-parent private notes | Context bleed |
| Peer sees full family calendar titles via availability | Household privacy leak |
| Guardian of A sees B’s message content via shared plan bug | Authz failure |
| Surprise party visible to guest child | Restricted surprise defect |
| Adult romantic circle memory in family circle | Classic Opal circle blast-radius bug |
| Support tooling over-fetch | Insider path |

**Mitigations (design):**

- Elixir authz on every read/write path  
- Personal Context / Relationship Privacy Boundaries enforced for youth  
- Availability grants default coarse for youth  
- Python receives minimum context + consent proof + purpose  
- Automated isolation tests (child, guardian, peer, stranger matrices)  
- Surprise / private prep isolation tests  

**Residual risk:** Misconfigured grants; multi-household complexity bugs.

---

### 6. Device sharing risks

**Story:** Family tablet or “borrowed phone” exposes the wrong profile.

| Vector | Example |
|--------|---------|
| No profile fence | Sibling reads messages  
| Push notification preview on lock screen | Pickup address visible to others |
| Shared session tokens | Account switch without re-auth  
| Local DB unencrypted on device | Physical access  
| Parent sets up child then forgets logout | Cross-use |

**Mitigations (design):**

- Distinct device sessions per account; re-auth on switch (**DEVICE_AND_IDENTITY** track)  
- Notification privacy defaults stricter for youth logistics  
- Local encryption and remote revoke  
- Clear “who is active” UX  
- Sensitive actions re-auth (purchase, contact add, guardian unlink)  

**Residual risk:** Shoulder surfing; malware with accessibility access on device OS side.

---

### 7. Contact discovery abuse

**Story:** Attacker enumerates which phone numbers are youth accounts or maps family graphs.

| Vector | Example |
|--------|---------|
| Bulk lookup API | Phone → registered child |
| Timing oracle | Distinguish youth vs adult accounts |
| Address book upload of millions | Graph build  
| Invite probing | “Delivered” reveals existence |

**Mitigations (design):**

- Youth: bulk discovery off; invite-first models  
- Rate limits, hashing, k-anonymity techniques (see identity doc)  
- Uniform error responses where possible  
- Anomaly detection on lookup patterns  
- Legal review of existence disclosure (**OPEN**)  

---

### 8. Plan / meetup physical safety

**Story:** Coordination features become a channel for unsafe in-person contact.

| Vector | Example |
|--------|---------|
| Child accepts meetup without guardian when policy requires G | Policy gap |
| Location share lasts forever | Stalking  
| Public event listing for minors | Stranger arrival  
| Last-minute pickup person swap to stranger | Impersonation |

**Mitigations (design):**

- Risk classes R4+ elevate guardian authority  
- No public youth event discovery  
- Location purpose-limited, time-boxed, disclosed  
- Verified principals for pickup where product models authorization  
- Change notifications on transport fields  

---

### 9. AI-specific youth threats

| Threat | Mitigation direction |
|--------|----------------------|
| Always-on analysis of youth chat | Forbidden without explicit lawful design |
| Emotional profiling / hidden labels | Rejected |
| Certainty claims about child’s or peer’s mind | Uncertainty doctrine |
| Helpful drafting of harassment or sexual content involving minors | Hard safety refusal |
| Training public models on youth content | **OPEN / LEGAL**; prefer contractual no-train |
| Guardian “AI spy summary” default | Rejected default |
| Prompt injection via peer messages into family AI | Isolation, purpose binding, least context |

Python proposes only under Elixir consent and policy codes; never assigns authority.

---

### 10. Financial and commercial abuse

| Threat | Mitigation direction |
|--------|----------------------|
| Child purchases without guardian | Tier G gates |
| Peer pressure pay requests | Friction; guardian for money risk class |
| Ads targeting youth emotional state | **Rejected** |
| In-app dark patterns | Forbidden under experience + safety principles |

---

## STRIDE snapshot (youth overlay)

| STRIDE | Youth examples | Design mitigations |
|--------|----------------|--------------------|
| **Spoofing** | Fake peer/guardian; SIM swap | Strong linking, invite provenance, re-auth |
| **Tampering** | Plan time/place edits; grant escalation | Authoritative Elixir state, audit, re-consent on high-risk fields |
| **Repudiation** | Deny invite approval | Audit trails with careful legal framing (**OPEN**) |
| **Info disclosure** | Graph leak, transcript leak, calendar titles, push previews | Allowlists, isolation tests, coarse availability, notification hygiene |
| **Denial of service** | Invite storms; AI cost bombs on family accounts | Rate limits, backpressure, quotas |
| **Elevation of privilege** | Child grants self adult powers; caregiver → full chat | Capability grants, server authz, least privilege |

---

## Control themes (architecture)

| Theme | Owner direction |
|-------|-----------------|
| Tier + grant authoritative store | Elixir |
| Enforcement on message, invite, plan, AI dispatch | Elixir |
| Policy codes on AI jobs | Elixir → Python |
| Client disclosure UX | Mobile |
| Isolation & abuse test suites | QA / test architecture |
| Legal age tables, mandatory reporting | Counsel — **EXTERNAL_BLOCKED** until set |
| Operational trust & safety | **OPEN** org process |

---

## Required test themes (future)

Extend general privacy/safety tests with:

1. Adult stranger cannot message T1–T2 child  
2. Invite to non-approved contact fails closed  
3. Guardian V-class boundaries hold (no accidental V4)  
4. Co-guardian cannot read other adult’s private adult threads via child  
5. Shared device profile switch requires auth  
6. Availability grant does not leak family event titles  
7. Surprise guest isolation  
8. Block removes plan injection paths  
9. Meetup plan without required guardian approval cannot become authoritative SharedPlan  
10. AI job without youth consent/policy proof refused  
11. No Social Score fields on youth APIs  
12. Limited invite forwarding  
13. Caregiver grant cannot read peer chat  
14. Compromised session revoke stops further youth data sync  
15. Synthetic coercive-control scenarios (family) — product non-weaponization checks  

---

## Mapping to general threat model

| General (`THREAT_MODEL.md`) | Youth elevation |
|-----------------------------|-----------------|
| AI as surveillance | Higher severity; guardian misuse + product default risk |
| AI as weapon | Includes family coercion; still no evidence packs |
| Impersonation | Guardian/coach/peer variants |
| Context bleed | Multi-household + peer + family circles |
| Graph leakage | Stricter youth discovery posture |
| Provider retention | Youth data processors **OPEN / LEGAL** elevated scrutiny |

---

## Unresolved decision matrix (security / policy)

| ID | Decision | Class |
|----|----------|-------|
| CS-01 | Abuse-detection scanning of youth content (on-device vs server, notice) | **OPEN / LEGAL_OR_POLICY** |
| CS-02 | Mandatory reporting obligations and product hooks | **OPEN / LEGAL_OR_POLICY** |
| CS-03 | Age verification technology bar (attestation vs stronger) | **OPEN / LEGAL_OR_POLICY + EXTERNAL** |
| CS-04 | Threat intelligence sharing with platforms | **OPEN / LEGAL** |
| CS-05 | Retention of invite/audit logs for safety vs privacy minimization | **OPEN / LEGAL_OR_POLICY** |
| CS-06 | Cross-age contact policy (teen–adult edges) | **OPEN / LEGAL_OR_POLICY** |
| CS-07 | Break-glass security UX under active abuser scenarios | **OPEN / LEGAL + SAFETY expertise** |
| CS-08 | Push notification minimum content standards for youth logistics | **PRODUCT + SECURITY** |
| CS-09 | Whether existence of youth account is concealable from probers | **INTERNAL + LEGAL** |
| CS-10 | Third-party school roster integrations threat review | **EXTERNAL + LEGAL** — default avoid early |

---

## Severity guidance (product prioritization)

Treat as **P0 design blockers** before any youth production exposure:

- Adult stranger messaging paths  
- Missing invite/contact authz  
- Cross-account transcript leakage  
- Covert location  
- Social Score / ad systems on youth  
- Undisclosed full-chat parental mirroring marketed as default safety  

Treat as **high** before scale:

- Shared device fences  
- Discovery enumeration  
- Plan transport field security  
- AI context minimization  

---

## Document control

| Item | Value |
|------|-------|
| Authority label | **ARCHITECTURE (CURRENT)** |
| Does not authorize | Shipping youth features |
| Does not replace | Legal opinion, formal pen-test, Trust & Safety runbooks |
| Updates when | Product tier rules, identity model, or Social Flow plan authz change |

---

## Alignment

Compatible with and subordinate to accepted product truths in:

- `OPAL_AGE_AUTHORITY_TIERS.md`  
- `OPAL_CHILD_TO_CHILD_SOCIAL_FLOW.md`  
- `OPAL_GUARDIAN_BOUNDARIES.md`  
- `RELATIONSHIP_SAFETY_RULES.md`  
- `OPAL_SOCIAL_FLOW_PRODUCT_TRUTH.md`  

If this threat model and a product-truth document conflict on **stance**, product truth wins; if they conflict on **implementation fact**, update this architecture doc—do not silently weaken safety stance.
