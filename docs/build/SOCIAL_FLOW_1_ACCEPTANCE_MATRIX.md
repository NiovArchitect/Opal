# Social Flow 1 — Acceptance Matrix

**Authority:** EVIDENCE (test architecture)  
**Status:** Gates for the **first Social Flow implementation slice** — documentation only; all rows currently **NOT_RUN** for product feature code  
**Related:** `OPAL_SOCIAL_FLOW_PRODUCT_TRUTH.md`, `VISIBLE_SIGNAL_PRINCIPLES.md`, `DEVICE_AND_IDENTITY_MODEL.md`, `SOCIAL_FLOW_ARCHITECTURE.md`  
**Owner (this phase):** Test Architect

---

## Purpose

Define **PASS/FAIL-style gates** for Social Flow slice 1 so future implementation cannot claim “done” without adult lifecycle proof, privacy isolation, security negatives, and explicit handling of family/youth scope.

This matrix is **not** a claim that Social Flow features are implemented.

---

## Result semantics

| Status | Meaning |
|--------|---------|
| **PASS** | Assertion held under agreed environment; evidence linked |
| **FAIL** | Assertion exercised and did not hold |
| **PARTIAL_PASS** | Core path held; documented secondary gaps remain (must list gaps) |
| **ENVIRONMENT_BLOCKED** | Could not run due to local/CI/env limits (no Docker, missing runtime) |
| **EXTERNAL_BLOCKED** | Could not run due to unpaid provider, legal hold, or third-party dependency |
| **NOT_RUN** | Not executed in this phase (default for this documentation PR) |

**Rule:** `PARTIAL_PASS` never hides a privacy or security negative failure. Those are **FAIL** or blocked.

---

## Slice 1 product boundary (what “first slice” means)

From Social Flow product truth — **two consenting adult users**, one lifecycle:

```text
discuss → proposal → consent to coordinate → free/busy grants
  → options → agreement → shared plan → revision
  → private commitment → private reminder
  → reconnect reconcile → consent revoke stops AI context
```

**Out of slice 1 implementation:** public discovery, external calendars, continuous location, children/youth shipping, ads, blockchain, Social Score, broad relationship scoring.

Family/youth rows appear below as **design-trace / future** or **blocked pending legal** — they do not expand slice 1 scope silently.

---

## Environment keys (future runs)

| Key | Example |
|-----|---------|
| `env.core` | `apps/opal_core` tests + runtime |
| `env.ai` | `services/opal_ai` worker |
| `env.mobile` | RN Expo client |
| `env.e2e` | Multi-client websocket / container journey |
| `env.a11y` | VoiceOver / TalkBack / contrast tooling |

Record command, commit SHA, and artifact path in evidence when any row leaves `NOT_RUN`.

---

## A. Adult lifecycle (happy path)

| ID | Gate | Expected | Status |
|----|------|----------|--------|
| SF1-A01 | Soft possibility from chat does **not** create binding shared plan | Proposal only; no authoritative event | NOT_RUN |
| SF1-A02 | User sees dismissible proposal affordance | “Not a plan” / equivalent removes pressure | NOT_RUN |
| SF1-A03 | Coordinate consent required before shared options/grants processing | No grant/options without consent proof | NOT_RUN |
| SF1-A04 | Free/busy option visible after dual grants | e.g. “You both appear free after 6:30” class signal | NOT_RUN |
| SF1-A05 | Agreement creates authoritative shared plan (Elixir) | Python never authors SharedPlan | NOT_RUN |
| SF1-A06 | Shared plan card shows participants + time | Conversation-native card, not dashboard-only | NOT_RUN |
| SF1-A07 | Revision creates lineage; both users can see change | Plan version / changed signal | NOT_RUN |
| SF1-A08 | Offline user receives reconcile signal | “The plan changed while you were offline” class | NOT_RUN |
| SF1-A09 | Private commitment owned by user | “I’ll book” → commitment object | NOT_RUN |
| SF1-A10 | Private reminder not visible to partner | Private chrome + isolation test | NOT_RUN |
| SF1-A11 | Consent revoke stops future AI context for scope | No new jobs with revoked proof | NOT_RUN |
| SF1-A12 | Normal message send never blocked by AI latency | Messaging path independent | NOT_RUN |

---

## B. Visible signal (aha without noise)

| ID | Gate | Expected | Status |
|----|------|----------|--------|
| SF1-B01 | At least one in-thread signal for free/busy option | Visible in conversation | NOT_RUN |
| SF1-B02 | “Needs answer” when user blocks progress | Soft indicator + actions | NOT_RUN |
| SF1-B03 | Private gift/reminder labeled private | User can recognize privacy without opening settings | NOT_RUN |
| SF1-B04 | Deadline signal for owned commitment | Calm deadline language | NOT_RUN |
| SF1-B05 | Dismissed proposal does not re-spam same message loop | Relevance / suppress policy | NOT_RUN |
| SF1-B06 | No Social Score or health meter UI | Forbidden surfaces absent | NOT_RUN |
| SF1-B07 | No engineering dialect in user-visible strings | No agent/workflow/embedding labels | NOT_RUN |
| SF1-B08 | Pattern recall (if implemented) uses factual unfinished-coordination copy | No shame score | NOT_RUN |

---

## C. Privacy and consent isolation

| ID | Gate | Expected | Status |
|----|------|----------|--------|
| SF1-C01 | Partner cannot read private reminder/commitment content | Cross-user fetch denied | NOT_RUN |
| SF1-C02 | Free/busy does not leak event titles | Titles absent from peer-visible payload | NOT_RUN |
| SF1-C03 | Shared plan payload excludes private prep fields | Schema/API isolation | NOT_RUN |
| SF1-C04 | Surprise/restricted context excludes guest (if feature present) | Guest cannot load surprise objects | NOT_RUN |
| SF1-C05 | AI job receives only bounded consented context | Purpose + consent proof + expiry | NOT_RUN |
| SF1-C06 | Revocation audited | Evidence of stop + no subsequent processing | NOT_RUN |
| SF1-C07 | Circle/relationship bleed absent | Plan intelligence not visible outside membership | NOT_RUN |

---

## D. Authority boundaries (runtime)

| ID | Gate | Expected | Status |
|----|------|----------|--------|
| SF1-D01 | Python returns proposals only | Schema-validated; no SharedPlan write API for Python | NOT_RUN |
| SF1-D02 | Elixir enforces membership on plan ops | Non-member denied | NOT_RUN |
| SF1-D03 | Idempotent plan agreement | Duplicate accept safe | NOT_RUN |
| SF1-D04 | Auto-RSVP without authority impossible | No default accept-all | NOT_RUN |
| SF1-D05 | High-trust notify-group requires approval | Explicit user action | NOT_RUN |

---

## E. Device and identity (adult multi-device)

| ID | Gate | Expected | Status |
|----|------|----------|--------|
| SF1-E01 | Same human, two sessions, coherent shared plan projection | Multi-device | NOT_RUN |
| SF1-E02 | Device class does not change plan authority | Phone vs tablet/desktop session equal membership | NOT_RUN |
| SF1-E03 | Adult phone enrollment path still works | OTP/synthetic per env policy | NOT_RUN |
| SF1-E04 | Session revoke does not delete human plan history improperly | Per deletion policy | NOT_RUN |

Note: phone-less / guardian-managed identity is **out of slice 1 ship** but model-documented; see section G.

---

## F. Accessibility (slice 1 surfaces)

| ID | Gate | Expected | Status |
|----|------|----------|--------|
| SF1-F01 | Proposal card VoiceOver: Opal suggestion ≠ contact message | Correct announcement | NOT_RUN |
| SF1-F02 | Private vs shared announced | Labels present | NOT_RUN |
| SF1-F03 | Primary actions ≥ 44pt | Layout audit | NOT_RUN |
| SF1-F04 | Contrast AA on badges | Automated or manual evidence | NOT_RUN |
| SF1-F05 | Dynamic type does not clip primary CTA | XL smoke | NOT_RUN |
| SF1-F06 | Reduce motion still comprehensible | Motion audit | NOT_RUN |

---

## G. Family and youth (scope control)

| ID | Gate | Expected | Status |
|----|------|----------|--------|
| SF1-G01 | Slice 1 build does **not** ship youth growth features | Code/docs boundary | NOT_RUN |
| SF1-G02 | Family scenario library tagged first-slice vs later vs legal-blocked | Docs present | **PASS** (docs phase) |
| SF1-G03 | No claim of legal age cutoff as final law in product UI | Copy review | NOT_RUN |
| SF1-G04 | Conceptual Wi‑Fi tablet / phone-less participation documented | Architecture doc | **PASS** (docs phase) |
| SF1-G05 | Child-to-child open social graph not enabled | Default deny | NOT_RUN / EXTERNAL_BLOCKED until legal |
| SF1-G06 | Guardian-managed enrollment not required for adult slice 1 PASS | Adult path independent | NOT_RUN |

Rows SF1-G02 and SF1-G04 are documentation gates for **this** relationship-universe phase; implementation rows remain NOT_RUN.

---

## H. Security negatives (must not pass if broken)

| ID | Gate | Expected | Status |
|----|------|----------|--------|
| SF1-H01 | User B cannot accept/decline as User A | AuthZ fail | NOT_RUN |
| SF1-H02 | User B cannot read User A private holds | AuthZ fail | NOT_RUN |
| SF1-H03 | Blocked user cannot re-enter plan ops via plan id guess | Enforcement | NOT_RUN |
| SF1-H04 | Consent proof for wrong user/conversation rejected | Consent gate | NOT_RUN |
| SF1-H05 | Expired consent rejected | Consent gate | NOT_RUN |
| SF1-H06 | AI context cannot be widened by client-supplied extra fields beyond schema | Validation | NOT_RUN |
| SF1-H07 | Synthetic phone verify impossible in production build flags | Config safety | NOT_RUN |
| SF1-H08 | Plan revision spoof from non-member rejected | AuthZ | NOT_RUN |
| SF1-H09 | No covert partner mood inference job type in slice | Capability allowlist | NOT_RUN |
| SF1-H10 | No Social Score field in API responses | Schema absence | NOT_RUN |

**Any FAIL in section H blocks slice 1 release claim.**

---

## I. Relationship-sensitive UX negatives

| ID | Gate | Expected | Status |
|----|------|----------|--------|
| SF1-I01 | No “relationship health” or reliability grade strings | Copy scan | NOT_RUN |
| SF1-I02 | Uncertainty language present on free/busy when imperfect | Copy/contract | NOT_RUN |
| SF1-I03 | Private gift never appears on shared plan card fixture | UI/integration | NOT_RUN |
| SF1-I04 | Dismiss path exists on all suggestion cards | UI | NOT_RUN |

---

## J. Group / multi-party (thin — optional partial)

Slice 1 is two-user primary. If thin group appears:

| ID | Gate | Expected | Status |
|----|------|----------|--------|
| SF1-J01 | Participation aggregate humane | “N agreed; M unsure” class | NOT_RUN |
| SF1-J02 | Partial agreement does not force SharedPlan | Threshold rules | NOT_RUN |

If group is out of slice: mark **NOT_RUN** with note “out of scope” (not FAIL).

---

## Minimum bar to claim “Social Flow 1 PASS”

All of the following must be **PASS** (or ENVIRONMENT_BLOCKED only with founder waiver recorded):

1. **All of section A** (A01–A12)  
2. **All of section C** applicable to shipped features (C01–C03, C05–C07 minimum)  
3. **All of section D** (D01–D04 minimum)  
4. **All of section H** that map to shipped surfaces  
5. **B01, B03, B05, B06** at minimum for visible signal  
6. **G01** (no silent youth ship)

A11y F-rows: at least F01–F03 **PASS** or documented ENVIRONMENT_BLOCKED with retest plan.

---

## Evidence template (per future run)

```text
Gate ID:
Result: PASS | FAIL | PARTIAL_PASS | ENVIRONMENT_BLOCKED | EXTERNAL_BLOCKED | NOT_RUN
Commit:
Command / method:
Artifact path:
Notes / gaps:
```

Store under `docs/evidence/` when implementation phase begins (do not invent results now).

---

## Relationship to prior slices

Build slices 1–2 proved messaging + consent-gated AI echo + websocket — **not** Social Flow plans.  
This matrix is a **new** gate set. Prior PASS evidence does not mark SF1 rows PASS.

---

## Summary lock

| Statement | Label |
|-----------|--------|
| Result semantics PASS/FAIL/PARTIAL_PASS/ENVIRONMENT_BLOCKED/EXTERNAL_BLOCKED/NOT_RUN | **EVIDENCE** |
| Adult two-user lifecycle is slice 1 bar | **ACCEPTED PRODUCT TRUTH** |
| Security negatives hard-block release claims | **EVIDENCE** |
| Family/youth mostly design-trace or legal-blocked | **EVIDENCE** + **LEGAL_OR_POLICY** |
| Docs-phase G02/G04 PASS; feature rows NOT_RUN | **EVIDENCE** |
