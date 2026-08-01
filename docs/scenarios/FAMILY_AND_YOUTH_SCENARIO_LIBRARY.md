# Family and Youth Scenario Library

**Authority:** ACCEPTED PRODUCT TRUTH (scenario templates) + LEGAL_OR_POLICY (shipping gates)  
**Status:** Conceptual templates for parent–child and carefully bounded child-to-child scenarios  
**Related:** `RELATIONSHIP_SCENARIO_LIBRARY.md`, `SOCIAL_FLOW_SCENARIO_LIBRARY.md`, `DEVICE_AND_IDENTITY_MODEL.md`, `RELATIONSHIP_INTERACTION_PATTERNS.md`, `SOCIAL_FLOW_1_ACCEPTANCE_MATRIX.md`  
**Owner (this phase):** Test Architect (+ family experience inputs)

---

## Purpose

Provide **behavioral templates** so product, UX, architecture, and safety can reason about households without:

- hard-coding “SchoolPickupMode” microservices,
- treating minors as a simple adult skin,
- inventing jurisdictional age cutoffs as final law,
- shipping youth social features inside adult Social Flow slice 1.

**Rule:** Scenarios map to Social Flow primitives (proposal, grant, option, poll, shared plan, participation, commitment, revision, personal hold, restricted visibility).

---

## Slice tags (mandatory on every scenario)

| Tag | Meaning |
|-----|---------|
| **FIRST_SLICE** | In scope for first Social Flow **implementation** slice (adult two-user). Family-specific rows use this only if they reduce to adult logistics without youth accounts. |
| **LATER** | Designed and desired after adult lifecycle proof; still needs product sequencing |
| **BLOCKED_LEGAL** | Must not ship until LEGAL_OR_POLICY (and often safety architecture) decisions land |
| **DESIGN_ONLY** | Template for architecture/UX; no implementation claim |

A scenario may carry multiple tags (e.g., `LATER` + `BLOCKED_LEGAL`).

---

## Global constraints

1. **No Social Score** of parents, children, or peers.  
2. **No covert surveillance** marketed as safety.  
3. **Private ≠ shared** — child’s private journal (if any) is not default parent feed.  
4. **Device ≠ dignity** — Wi‑Fi tablet child can be a full plan participant when authorized (`DEVICE_AND_IDENTITY_MODEL.md`).  
5. **Phone number not required** for every participant.  
6. **Uncertainty language** on impacts (“may affect school pickup”).  
7. **Do not invent legal age numbers** as product law in this library.  
8. Adult MVP test populations remain adult-only until G052 / SF-D011 resolve for shipping.

---

## Pattern catalog (family/youth)

| Pattern | Example language | System shape |
|---------|------------------|--------------|
| Family soft plan | “Can we do lunch Sunday with grandma?” | Proposal in family thread |
| Schedule change | “Practice moved to 5:00” | Plan revision + visible signal |
| Pickup commitment | “I’ll get him from practice” | Commitment, often shared with co-parent |
| Cross-plan impact | “This may affect school pickup” | Impact signal with uncertainty |
| Youth ask-up | “Can my friend come?” | Proposal needing guardian rule path |
| Guardian approval | “Allow friend join for Saturday only?” | High-trust approval object |
| Bounded peer plan | Two approved kids + guardians visible as required | Tight membership, not open graph |
| Private adult prep | “Order cake — private” | Private care work |
| Multi-household | Dual-home availability | Circle isolation + grants |
| Offline change | Coach changed time while parent offline | Reconnect banner |

---

## Parent–child templates

### FY1 — Practice time change + pickup rethink

| Field | Content |
|-------|---------|
| **Story** | Child’s practice moves earlier; parent who offered pickup must adapt; co-parent may need visibility. |
| **Visible signals** | “Your daughter’s practice moved to 5:00.” · “You offered to pick him up.” · “This may affect school pickup.” |
| **Primitives** | SharedPlan · PlanRevision · Commitment · optional impact note |
| **Privacy** | Coach notes private to organizers if needed; child’s other chats not scraped |
| **Tags** | **LATER**, **DESIGN_ONLY** (if youth account); adult-only co-parent logistics variant may be **LATER** without youth UI |
| **Negatives** | No shame copy to child; no silent reschedule of other plans |

**Acceptance hooks:** SF1 visible-signal classes B/C; family G-rows for scope.

---

### FY2 — “Can my friend come?” (youth-originated expansion)

| Field | Content |
|-------|---------|
| **Story** | Child asks in family or parent chat whether a friend may join a Saturday plan. |
| **Visible signals** | “Your son asked whether his friend can come.” · “Do you want to turn this into a shared family plan?” |
| **Primitives** | Plan proposal · pending participant · guardian approval · ParticipationState |
| **Privacy** | Friend not added until approval path completes; no address-book blast |
| **Tags** | **LATER**, **BLOCKED_LEGAL** (youth messaging + peer invite policy) |
| **Negatives** | Auto-invite friend; open discovery of random minors; parent spoof as child |

---

### FY3 — Shared family meal across households

| Field | Content |
|-------|---------|
| **Story** | Two households coordinate Sunday lunch; availability grants; one adult still unsure. |
| **Visible signals** | “Three people agreed on Saturday; one person is still unsure.” (adapt day) · needs-answer |
| **Primitives** | Poll/options · grants · SharedPlan · participation aggregate |
| **Privacy** | Work calendars not leaked; free/busy only per grant |
| **Tags** | **LATER** (multi-party); adult-only version can follow group pattern after two-user slice |
| **Negatives** | Cross-household leak of unrelated family plans |

---

### FY4 — School pickup chain of commitments

| Field | Content |
|-------|---------|
| **Story** | Parent A commits to pickup; transfer to Parent B; deadline/time sensitivity. |
| **Visible signals** | “You offered to pick him up.” · commitment transfer · calm deadline if any |
| **Primitives** | Commitment · transfer/withdraw · SharedPlan link |
| **Tags** | **LATER**, **DESIGN_ONLY** |
| **Negatives** | Auto-transfer without approval; public school roster scrape |

---

### FY5 — Private gift for child (adult private care)

| Field | Content |
|-------|---------|
| **Story** | Parent prepares birthday gift; child must not see. |
| **Visible signals** | “This gift reminder is private.” |
| **Primitives** | Personal hold / private reminder · restricted surprise if party helpers |
| **Tags** | **FIRST_SLICE**-adjacent as **adult private care** pattern (no youth account required); full family party **LATER** |
| **Negatives** | Gift line on shared plan child can open |

Note: Adult private care is already in relationship scenario R2/R3. Listed here so family context reuses the same isolation law.

---

### FY6 — Guardian-managed Wi‑Fi tablet participation

| Field | Content |
|-------|---------|
| **Story** | Child has no personal cellular number; uses approved household tablet on Wi‑Fi; joins family plan RSVP. |
| **Visible signals** | Same plan cards as other members; device class not shown as “lesser member” |
| **Primitives** | HumanIdentity · guardian_managed account · DeviceSession tablet · ParticipationState |
| **Tags** | **LATER**, **BLOCKED_LEGAL** (enrollment + age authority), **DESIGN_ONLY** for identity model proof |
| **Negatives** | Requiring phone OTP for child; ranking relationship by device |

**Architecture ref:** `DEVICE_AND_IDENTITY_MODEL.md`.

---

### FY7 — Plan changed while parent offline

| Field | Content |
|-------|---------|
| **Story** | Family plan revision occurs; parent reconnects on phone. |
| **Visible signals** | “The plan changed while you were offline.” |
| **Primitives** | PlanRevision · offline reconcile · notification relevance |
| **Tags** | **LATER** for family; **FIRST_SLICE** for adult two-user offline reconcile class |
| **Negatives** | Silent overwrite with no review |

---

### FY8 — Multi-commitment day (cognitive load)

| Field | Content |
|-------|---------|
| **Story** | Practice, pickup, and dinner collide; Opal surfaces one primary impact at a time. |
| **Visible signals** | Single primary: “This may affect school pickup.” → expand for more |
| **Primitives** | Multiple SharedPlans · relevance ranking |
| **Tags** | **LATER**, **DESIGN_ONLY** |
| **Negatives** | Notification storm; dashboard of all family metrics |

---

## Child-to-child templates (carefully bounded)

Child-to-child is **never** open social graph in early design.  
Membership is **tight, approved, and purpose-limited**.

### FY9 — Approved peer hang (both guardians)

| Field | Content |
|-------|---------|
| **Story** | Two children already known to families; guardians approve a Saturday hang; time options; pickup owners. |
| **Visible signals** | Plan state to guardians as policy requires; children see age-appropriate plan card |
| **Primitives** | SharedPlan · dual guardian approval · commitments for pickup |
| **Tags** | **LATER**, **BLOCKED_LEGAL** |
| **Negatives** | Stranger discovery; location stalking; private chat export to third parties |

---

### FY10 — Peer asks peer; guardian mediation required

| Field | Content |
|-------|---------|
| **Story** | Child A asks Child B to join; system routes through approval rules before B’s membership is active. |
| **Visible signals** | Pending approval states; not silent add |
| **Primitives** | Proposal · pending participation · guardian gate |
| **Tags** | **LATER**, **BLOCKED_LEGAL** |
| **Negatives** | Pressure loops / spam invites; AI drafting coercion |

---

### FY11 — School group project (bounded group)

| Field | Content |
|-------|---------|
| **Story** | Small fixed roster for a project deadline; shared plan for meeting; private notes per student. |
| **Visible signals** | Deadline · needs answer · private vs shared work |
| **Primitives** | Group plan · commitments · private holds |
| **Tags** | **LATER**, **BLOCKED_LEGAL** (minors in group + school policy) |
| **Negatives** | Whole-class open channel by default; grade-like reliability scores |

---

### FY12 — Explicitly blocked: open youth discovery

| Field | Content |
|-------|---------|
| **Story** | “Find friends nearby” / public youth feed / score-matched peers |
| **Tags** | **BLOCKED_LEGAL** (and product-rejected as early Social Flow) |
| **Status** | **Not a template to implement** — recorded so it is not “forgotten into” a roadmap by accident |
| **Negatives** | Entire class of predatory and privacy risk |

---

## Adult-only family logistics (no youth account)

These support real family life while slice 1 stays adult-account-only.

### FY13 — Co-parent coordination (two adults)

| Field | Content |
|-------|---------|
| **Story** | Two adults coordinate child-related logistics without the child holding an Opal account. |
| **Visible signals** | Practice change, pickup commitment, offline change — among adults |
| **Primitives** | Full adult Social Flow lifecycle |
| **Tags** | **LATER** after two-user slice (still multi-commitment); content may appear in tests as adult scenario data **without** youth features |
| **Note** | Does not require child identity; avoids BLOCKED_LEGAL youth messaging |

---

### FY14 — Family group of adults (siblings + parents)

| Field | Content |
|-------|---------|
| **Story** | Adult siblings plan holiday meal; polls; who-brings-what. |
| **Tags** | **LATER** (group); not youth |
| **Primitives** | Group pattern P5 |

---

## Mapping to first Social Flow slice

| In first implementation slice | Not in first slice |
|-------------------------------|--------------------|
| Adult discuss→plan lifecycle | Youth accounts |
| Private vs shared isolation (adult) | Child-to-child messaging |
| Offline reconcile (two adults) | Guardian enrollment product |
| Visible signal classes for adult plans | School/peer open graphs |
| Security negatives H-section | Shipping FY2, FY6, FY9–FY12 |

**Documentation phase:** this library + identity model + interaction patterns = **PASS** for design-trace gates (see SF1-G02, SF1-G04).

---

## Reusable primitives checklist (family/youth)

Every non-blocked scenario above must remain implementable with:

PotentialPlan · AvailabilityGrant · TimeOption · PlanPoll · SharedPlan · ParticipationState · Commitment · PlanRevision · PersonalHold · Restricted visibility · CalendarProjection  

Plus identity extensions when allowed:

HumanIdentity · guardian_managed Account · DeviceSession (tablet/wifi) · EnrollmentPath  

No scenario-specific microservices required.

---

## Safety and test intent

When implementation approaches family/youth:

| Suite | Intent |
|-------|--------|
| Isolation | Parent cannot read child’s private objects without authority |
| Approval | Peer joins only via gate |
| Device | Tablet session equal plan membership |
| Copy | No scores, no shame, uncertainty on impacts |
| Coercion | No help drafting pressure against child or co-parent |
| Legal hold | BLOCKED_LEGAL scenarios stay unshipped |

Use acceptance matrix semantics: PASS / FAIL / PARTIAL_PASS / ENVIRONMENT_BLOCKED / EXTERNAL_BLOCKED / NOT_RUN.

---

## Open decisions (do not close here)

- Exact age tiers and jurisdictions (`G052`, SF-D011)  
- Guardian proof of relationship  
- What guardians can see by default vs request  
- Child-to-child messaging eligibility  
- School/enterprise special policies  

Record resolutions in product age authority / guardian / child-to-child docs owned by other specialists — not by inventing law in this library.

---

## Summary lock

| Statement | Label |
|-----------|--------|
| Family/youth scenarios are templates with slice tags | **ACCEPTED PRODUCT TRUTH** |
| FIRST_SLICE / LATER / BLOCKED_LEGAL / DESIGN_ONLY mandatory | **EVIDENCE** |
| Child-to-child carefully bounded; open youth discovery blocked | **ACCEPTED PRODUCT TRUTH** + **LEGAL_OR_POLICY** |
| Phone-less Wi‑Fi tablet participation is valid conceptual path | **ARCHITECTURE** |
| Adult co-parent logistics can proceed without youth accounts | **ACCEPTED PRODUCT TRUTH** |
| No legal age cutoffs invented here | **LEGAL_OR_POLICY** |
