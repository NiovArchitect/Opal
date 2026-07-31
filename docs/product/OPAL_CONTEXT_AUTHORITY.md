# Opal Context Authority

**Status:** Accepted product governance  
**Purpose:** Tell every future agent which documents govern decisions.

---

## Authority order (highest → lowest)

1. **Current accepted product-truth documents**  
   - `docs/product/Opal_PRODUCT_TRUTH.md`  
   - `docs/product/OPAL_SOCIAL_FLOW_PRODUCT_TRUTH.md`  
   - `docs/product/OPAL_RELATIONSHIP_INTELLIGENCE_PRINCIPLES.md`  
   - `docs/product/CONSENT_MODEL.md`  
   - `docs/product/RELATIONSHIP_SAFETY_RULES.md`  
   - `docs/product/MVP_BOUNDARY.md`  

2. **Accepted ADRs** — `docs/adr/`  

3. **Current architecture documents** — `docs/architecture/` (including Social Flow privacy/architecture)  

4. **Build-slice reports and evidence** — `docs/evidence/`, `docs/build/`  

5. **Founder clarification / decision logs** — `docs/decisions/`, `docs/evidence/DECISION_LOG.md`  

6. **Original source documents** — `docs/source-material/original/`  

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
12. Next Social Flow slice? → decision log / product truth “next slice”  

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
