# Opal Context Authority

**Status:** Accepted product governance  
**Purpose:** Tell every future agent which documents govern decisions.

---

## Authority order (highest → lowest)

1. **Current accepted product-truth documents**  
   - `docs/product/Opal_PRODUCT_TRUTH.md`  
   - `docs/product/OPAL_SOCIAL_FLOW_PRODUCT_TRUTH.md`  
   - `docs/product/OPAL_RELATIONSHIP_INTELLIGENCE_PRINCIPLES.md`  
   - `docs/product/OPAL_RELATIONSHIP_CONTEXTS.md`  
   - `docs/product/OPAL_RELATIONSHIP_ACTIVATION.md`  
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
| Agent Zero solo for Social Flow build vs multi-specialist | **Agency Agents required** for Social Flow design/build; Agent Zero integrates |

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
