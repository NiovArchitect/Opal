# Opal Context Authority

**Status:** Accepted product governance  
**Purpose:** Tell every future agent which documents govern decisions.

---

## Authority order (highest → lowest)

1. **Current accepted product-truth documents**  
   - `docs/product/Opal_PRODUCT_TRUTH.md`  
   - `docs/product/OPAL_ALIGNMENT_LAYERS.md` — person ↔ people ↔ device/world; deeper promise  
   - `docs/product/OPAL_DEVICE_CAPABILITY_SYSTEM.md` — mobile harness / device consent (**not** AVP²)  
   - `docs/product/OPAL_AVP2_PAYMENTS_BOUNDARY.md` — **AVP² = payments only** (corrects earlier over-scope)  
   - `docs/product/OPAL_FRIENDLY_PLANS.md` — friend-shared services concept (future; not shipping)  
   - `docs/product/OPAL_DYNAMIC_SOCIAL_EXPERIENCE_INTELLIGENCE_PHASE0.md` — backend magic, dynamic contexts, collective fit, restraint (compounds; does not replace SF18)  
   - `docs/product/OPAL_SOCIAL_FLOW_PRODUCT_TRUTH.md`  
   - `docs/product/OPAL_RELATIONSHIP_INTELLIGENCE_PRINCIPLES.md`  
   - `docs/product/OPAL_RELATIONSHIP_CONTEXTS.md`  
   - `docs/product/OPAL_RELATIONSHIP_ACTIVATION.md`  
   - `docs/product/EXPERIENCE_COLLABORATION_AND_NUANCE.md`  
   - `docs/product/LOCATION_COLLECTIVE_FIT.md`  
   - `docs/product/OPAL_AGE_AUTHORITY_TIERS.md`  
   - `docs/product/OPAL_CHILD_TO_CHILD_SOCIAL_FLOW.md`  
   - `docs/product/OPAL_GUARDIAN_BOUNDARIES.md`  
   - `docs/product/CONSENT_MODEL.md`  
   - `docs/product/RELATIONSHIP_SAFETY_RULES.md`  
   - `docs/product/MVP_BOUNDARY.md`  
   - `docs/ux/VISIBLE_SIGNAL_PRINCIPLES.md`  
   - `docs/ux/RELATIONSHIP_INTERACTION_PATTERNS.md`  

2. **Accepted ADRs** — `docs/adr/`  

3. **Current architecture documents** — `docs/architecture/` including:  
   - Social Flow privacy/architecture  
   - `DEVICE_AND_IDENTITY_MODEL.md`  
   - `MINOR_AND_FAMILY_PRIVACY.md`  
   - `SOCIAL_FLOW_CONTACT_SECURITY.md`  
   - `SOCIAL_FLOW_AUTHORITY_BOUNDARIES.md`  
   - `SOCIAL_FLOW_INFERENCE_BOUNDARIES.md`  
   - `CHILD_SAFETY_THREAT_MODEL.md`  

4. **Build-slice definitions, reports, and evidence** — `docs/evidence/`, `docs/build/`  
   - including `BUILD_SLICE_SOCIAL_FLOW_1.md` and relationship-universe evidence  

5. **Founder clarification / decision logs** — `docs/decisions/`, `docs/evidence/DECISION_LOG.md`,  
   `docs/product/OPAL_OPEN_DECISIONS_RELATIONSHIP_UNIVERSE.md`  

6. **Original source documents** — `docs/source-material/original/` (**immutable**; never edit)  

7. **Historic roadmaps and marketing** — same folder when classified historical  

8. **AI-generated unapproved drafts** — not authoritative until reviewed and labeled accepted  

---

## Conflict rules

| Conflict type | Winner |
|---------------|--------|
| Social Flow vision vs Node/Express/Socket.io roadmap | **Elixir/BEAM + Python AI** (ADRs 0002–0003) |
| Conversation-first planning vs calendar-dashboard UX | **Conversation-first** Social Flow product truth |
| Blockchain/DID/staking in source vs current architecture | **Deferred / rejected as dependency** |
| Social Score in source vs safety rules | **Rejected** — never lock scores |
| Intimate data for advertising | **Rejected** |
| Silent AI event creation vs consent model | **Consent-gated proposals only** |
| Scenario narrative vs hard-coded scenario code | **Primitives + templates**, not scenario hard-coding |
| Marketing “it does X” vs evidence | **Evidence** |
| Adult-only product model vs family/parent-child truth | **Family is first-class**; minors use age/authority tiers — not adult UX + parental screen only |
| Phone-number-only identity vs guardian-managed / tablet users | **Device & identity model** — phone important for adult discovery; not every user needs a cellular number |
| Invisible backend intelligence vs visible signal | **Visible signal principles** — useful signal must be user-experienced without noise |
| Setup forms / circle homework vs backend inference | **Backend magic** — user does nothing, one confirmation, one correction, or one private choice (`OPAL_DYNAMIC_SOCIAL_EXPERIENCE_INTELLIGENCE_PHASE0.md`) |
| Average single-user recommendations vs collective fit | **Collective fit** — multi-person constraints without leaking private reasons |
| Always suggest vs restraint | **Restraint engine** — surface only when social value >> interruption + privacy cost |
| Agent Zero solo for Social Flow build vs multi-specialist | **Agency Agents required** for Social Flow design/build; Agent Zero integrates |
| AVP² as universal capability/permission plane vs payments | **AVP² = payments only** (`OPAL_AVP2_PAYMENTS_BOUNDARY.md`); device actions use device capability system |
| Autonomous device takeover vs support/control | **Support and control** — user-approved harness; never “Opal took over your phone” |
| Checking availability vs “Booked” | **Honest action states** — do not blur inquiry, approval, and provider confirmation |
| Streaming password sharing vs provider-approved Friendly Plans | **Provider-approved only**; no household/TOS bypass; Friendly Plans are future, not shipping |
| Generic “permission.granted” under avp2.* for location/calls | **Wrong** — use `device.capability.*` / Opal domain events; AVP² events are payment-shaped |

---

## Questions every agent must be able to answer from the repo

1. What is Opal? → product truth  
2. What is Social Flow? → Social Flow product truth  
3. What is locked? → product truth + ADRs + safety  
4. Founder source ideas? → `docs/source-material/`  
5. Rejected mechanisms? → Social Flow decision log + this hierarchy  
6. What is built? → build evidence (Slice 1–2)  
7. What is not built? → MVP boundary + Social Flow next-slice notes  
8. What may AI infer? → proposals with uncertainty  
9. What needs approval? → consent model  
10. Data boundaries? → privacy boundaries  
11. Which doc is authoritative? → this file  
12. Next Social Flow slice? → `docs/build/BUILD_SLICE_SOCIAL_FLOW_1.md` + decision log  
13. What is a relationship context? → `OPAL_RELATIONSHIP_CONTEXTS.md`  
14. How do minors and guardians work? → age tiers + guardian boundaries + child-to-child (conceptual)  
15. Device hierarchy? → `DEVICE_AND_IDENTITY_MODEL.md` (phone primary; tablet supported; desktop supporting)  
16. What must the user *see*? → `VISIBLE_SIGNAL_PRINCIPLES.md`  
17. Open legal/product decisions? → `OPAL_OPEN_DECISIONS_RELATIONSHIP_UNIVERSE.md`  
18. Which Agency Agents own Social Flow design? → `docs/evidence/relationship-universe/AGENT_ASSIGNMENTS.md`  
19. Alignment layers? → `OPAL_ALIGNMENT_LAYERS.md` (person ↔ people ↔ device/world)  
20. Device actions / calls / bookings honesty? → `OPAL_DEVICE_CAPABILITY_SYSTEM.md`  
21. What is AVP²? → **payments only** — `OPAL_AVP2_PAYMENTS_BOUNDARY.md`  
22. Friendly Plans? → `OPAL_FRIENDLY_PLANS.md` (future concept; not shipping authorization)  

### Read order (relationship universe / Social Flow expansion)

1. This file  
2. `OPAL_SOCIAL_FLOW_PRODUCT_TRUTH.md`  
3. `OPAL_RELATIONSHIP_CONTEXTS.md`  
4. `OPAL_RELATIONSHIP_ACTIVATION.md`  
5. `OPAL_AGE_AUTHORITY_TIERS.md` → `OPAL_GUARDIAN_BOUNDARIES.md` → `OPAL_CHILD_TO_CHILD_SOCIAL_FLOW.md`  
6. `VISIBLE_SIGNAL_PRINCIPLES.md` + relationship UX patterns  
7. `DEVICE_AND_IDENTITY_MODEL.md`  
8. Privacy / contact security / authority / inference architecture  
9. `CHILD_SAFETY_THREAT_MODEL.md`  
10. `BUILD_SLICE_SOCIAL_FLOW_1.md` + acceptance matrix  
11. Open decisions + decision log  

---

## Labels for new documents

When adding docs, state one of:

- **ACCEPTED PRODUCT TRUTH**  
- **ACCEPTED ADR**  
- **ARCHITECTURE (CURRENT)**  
- **EVIDENCE**  
- **HISTORICAL SOURCE**  
- **EXTRACTION / NOTES**  
- **DRAFT (NOT AUTHORITATIVE)**  
