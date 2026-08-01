# Open Decisions — Relationship Universe & Minor Safety

**Authority:** FOUNDER CLARIFICATION / DECISION LOG (open items)  
**Status:** Explicit unresolved decisions — do **not** invent answers during implementation  
**Phase:** Social Flow Relationship Universe documentation  

---

## How to use this file

| Status | Meaning |
|--------|---------|
| **OPEN** | Needs founder / product decision |
| **LEGAL_OR_POLICY** | Needs qualified legal/policy review; not engineering discretion |
| **EXTERNAL_BLOCKED** | Cannot close until external dependency (counsel, regulator, age-rating body) |
| **DEFERRED** | Intentionally later; does not block bounded adult/family slice when scoped carefully |
| **ACCEPTED** | Closed in Social Flow decision log |

Implementation agents **must not** convert OPEN or LEGAL_OR_POLICY into silent defaults that ship as law.

---

## A. Relationship taxonomy

| ID | Decision | Status | Notes |
|----|----------|--------|-------|
| RU-001 | Exact storage enum vs product context labels | OPEN | Product concepts first; schema later |
| RU-002 | Who may label a relationship (self, mutual, guardian) | OPEN | Mutual preferred for adults; minors tier-sensitive |
| RU-003 | Multi-household / custody relationship graph model | LEGAL_OR_POLICY | Multi-guardian, multi-home logistics |
| RU-004 | Caregiver_dependent vs parent_child distinction rules | OPEN | Includes non-parent caregivers |
| RU-005 | Professional/community activation timing | DEFERRED | After personal/family Social Flow |

---

## B. Age, authority, accounts

| ID | Decision | Status | Notes |
|----|----------|--------|-------|
| RU-010 | Numeric age cutoffs per jurisdiction | LEGAL_OR_POLICY / EXTERNAL_BLOCKED | Conceptual tiers only until counsel |
| RU-011 | Self-asserted age vs verified age for minors | LEGAL_OR_POLICY | Fraud and safety tradeoffs |
| RU-012 | Guardian-managed account creation flow | OPEN + LEGAL | Device without phone number |
| RU-013 | When a minor may refuse guardian visibility on a capability | LEGAL_OR_POLICY + product | Dignity vs safety |
| RU-014 | Emancipated minors / special status | LEGAL_OR_POLICY | Jurisdictional |
| RU-015 | Age transition (birthday / majority handoff) | OPEN | Authority upgrade path |

---

## C. Guardian boundaries

| ID | Decision | Status | Notes |
|----|----------|--------|-------|
| RU-020 | Default guardian visibility of message content | LEGAL_OR_POLICY | Not total surveillance by product default |
| RU-021 | Guardian override for emergency location | LEGAL_OR_POLICY | Purpose-limited only |
| RU-022 | Dual-guardian conflict resolution | OPEN | Conflicting approvals |
| RU-023 | School / institutional account linking | DEFERRED | Out of first slices |
| RU-024 | Export of minor data to guardian | LEGAL_OR_POLICY | Subject to local law |

---

## D. Child-to-child communication

| ID | Decision | Status | Notes |
|----|----------|--------|-------|
| RU-030 | Whether child-to-child messaging ships in first SF slice | **ACCEPTED direction: NO** | Conceptual docs only; implement later |
| RU-031 | Minimum safeguards for approved peer plans | OPEN + LEGAL | Contact allowlist, invitation approval |
| RU-032 | Cross-family peer discovery model | LEGAL_OR_POLICY | Restricted discovery only |
| RU-033 | Group chats with mixed ages | LEGAL_OR_POLICY | Elevated risk |
| RU-034 | Reporting escalation path (platform vs guardian vs external) | LEGAL_OR_POLICY | Trust & safety program |

---

## E. Identity and devices

| ID | Decision | Status | Notes |
|----|----------|--------|-------|
| RU-040 | Non-phone identity for minors (device-bound, guardian-link) | OPEN | Must support Wi-Fi tablet child |
| RU-041 | Shared family device multi-user sessions | OPEN | Device handoffs |
| RU-042 | Desktop/web feature parity limits | OPEN | Supporting surface only |
| RU-043 | Contact discovery without phone for minors | LEGAL_OR_POLICY | Prefer invites / guardian-mediated |

---

## F. Visible signal and AI

| ID | Decision | Status | Notes |
|----|----------|--------|-------|
| RU-050 | Default density of in-conversation signals | OPEN | Noise budget A/B later |
| RU-051 | Youth-facing copy tone guidelines final | OPEN | Age-tier wording packs |
| RU-052 | Whether AI may suggest relationship labels proactively | OPEN | Always confirm; never force |
| RU-053 | Retention of rejected inferences | OPEN | Prefer short TTL |

---

## G. What may proceed without closing every legal item

A carefully bounded **adult two-user Social Flow slice** may proceed when:

- no youth-oriented growth / discovery features  
- no unrestricted child-to-child messaging  
- no adult-stranger-to-child contact paths  
- parent–older-child **family plan coordination** only if accounts are explicitly guardian-linked test fixtures and legal review is not required for internal non-production validation  

Anything consumer-facing involving minors requires LEGAL_OR_POLICY progress on RU-010–RU-034 as applicable.

---

## H. Honesty rule

Gates for **unresolved legal questions must not be marked PASS**.  
They may be **EXTERNAL_BLOCKED** or **OPEN (documented)** without blocking a strictly adult implementation path, if the report distinguishes the two.
