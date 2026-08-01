# Social Flow Relationship Universe — Agency Agent Assignments

**Authority:** EVIDENCE  
**Program lead:** Agent Zero (integrator, scope controller, evidence owner, Git controller, final gatekeeper)  
**Branch:** `docs/social-flow-relationship-universe`  
**Baseline main:** `ba4504e1cb995952113134fad574865a7d2732bc`  
**Mode:** Documentation and design only — no Social Flow feature implementation  
**Principle:** Smallest effective specialist team; exclusive write ownership; no performative agent roster

---

## Selection rule

Agent Zero remains lead. Specialists are activated only with:

- bounded mission  
- exclusive write paths  
- explicit inputs and outputs  
- no overlapping write authority  
- findings reviewed by Agent Zero  
- unresolved disagreements recorded  

An agent is reported as **used** only if it produced or reviewed exclusive artifacts in this phase.

---

## Agency Agents catalog mapping

| # | Required role (instruction) | Agency Agents source | Used? | Exclusive write ownership |
|---|----------------------------|----------------------|-------|---------------------------|
| 0 | Program lead / Agent Zero | Orchestrator (this run) | **YES** | Integration, authority updates, evidence, PR/merge, gates |
| 1 | Product Manager | `agency-agents/product/product-manager.md` | **YES** | `docs/product/OPAL_RELATIONSHIP_CONTEXTS.md`, `docs/product/OPAL_RELATIONSHIP_ACTIVATION.md`, `docs/build/BUILD_SLICE_SOCIAL_FLOW_1.md` |
| 2 | Relationship UX Specialist | Closest: `design-ux-architect.md` + `design-persona-walkthrough.md` | **YES** | `docs/ux/RELATIONSHIP_INTERACTION_PATTERNS.md` |
| 3 | Child Safety and Family Experience | **GAP:** no exact child-safety agent. Closest: `security-compliance-auditor.md` + `specialized/data-privacy-officer.md` + Product Manager family scope | **YES (composite)** | `docs/product/OPAL_AGE_AUTHORITY_TIERS.md`, `docs/product/OPAL_CHILD_TO_CHILD_SOCIAL_FLOW.md`, `docs/product/OPAL_GUARDIAN_BOUNDARIES.md`, `docs/architecture/CHILD_SAFETY_THREAT_MODEL.md` |
| 4 | Privacy Engineer / DPO | `engineering-privacy-engineer.md` + `specialized/data-privacy-officer.md` | **YES** | `docs/architecture/MINOR_AND_FAMILY_PRIVACY.md` |
| 5 | Security Engineer | `security-architect.md` + `security-appsec-engineer.md` | **YES** | `docs/architecture/SOCIAL_FLOW_CONTACT_SECURITY.md` |
| 6 | Elixir/OTP Architect | Closest: `engineering-backend-architect.md` + `engineering-realtime-collaboration-engineer.md` | **YES** | `docs/architecture/SOCIAL_FLOW_AUTHORITY_BOUNDARIES.md` |
| 7 | Python AI Architect | `engineering-ai-engineer.md` + `engineering-prompt-engineer.md` | **YES** | `docs/architecture/SOCIAL_FLOW_INFERENCE_BOUNDARIES.md` |
| 8 | Mobile Architect / RN Expo | `engineering-mobile-app-builder.md` | **YES** | `docs/architecture/DEVICE_AND_IDENTITY_MODEL.md` |
| 9 | UX Architect | `design-ux-architect.md` | **YES** | `docs/ux/VISIBLE_SIGNAL_PRINCIPLES.md` |
| 10 | UI Designer | `design-ui-designer.md` | **YES** | `docs/ux/SOCIAL_FLOW_VISIBLE_COMPONENTS.md` |
| 11 | Inclusive Visuals / A11y | `design-inclusive-visuals-specialist.md` + `testing-accessibility-auditor.md` | **YES** | `docs/ux/ACCESSIBILITY_SOCIAL_FLOW.md` |
| 12 | Test Architect | `testing-test-automation-engineer.md` + `testing-reality-checker.md` | **YES** | `docs/build/SOCIAL_FLOW_1_ACCEPTANCE_MATRIX.md`, `docs/scenarios/FAMILY_AND_YOUTH_SCENARIO_LIBRARY.md` |

### Documented gap

**Child Safety and Family Experience Specialist** does not exist as a first-class Agency Agent. This phase assigns a **composite** of compliance auditor + data privacy officer + Product Manager family product ownership, and records the gap for future Agency Agents catalog expansion. No agent may invent jurisdictional legal policy; open legal decisions remain open.

---

## Non-activated roles (intentionally)

Dozens of catalog agents (marketing, sales, game-dev, Drupal, Solidity, etc.) are **not** activated. Naming them does not count as use.

---

## Execution order

1. Agent Zero — repo isolation proof, branch, assignment ledger  
2. Parallel specialist doc production (exclusive files)  
3. Agent Zero integration — authority, decision log, safety rules updates, open decisions, gate matrix  
4. Specialist consistency pass (read-only review notes)  
5. Commit → PR → CI → merge only when documentation gates PASS  

---

## Inputs (all specialists)

- Main baseline `ba4504e1`  
- `docs/product/OPAL_SOCIAL_FLOW_PRODUCT_TRUTH.md`  
- `docs/product/OPAL_CONTEXT_AUTHORITY.md`  
- `docs/product/RELATIONSHIP_SAFETY_RULES.md`  
- `docs/architecture/SOCIAL_FLOW_PRIVACY_BOUNDARIES.md`  
- `docs/architecture/IDENTITY_AND_PHONE_NUMBERS.md`  
- Founder instruction: relationship universe, minor safety, visible signal, devices, Agency Agents  

## Global constraints

- Do not reopen PR #3  
- Do not modify `docs/source-material/original/`  
- Do not implement Social Flow product code  
- Do not invent legal age cutoffs as final law  
- No Social Score; no surveillance by default; no adult system + parental screen only  
