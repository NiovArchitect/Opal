# Social Flow Decision Log

**Authority:** FOUNDER CLARIFICATION / DECISION LOG  
**Date opened:** 2026-07-31  

| ID | Decision | Status | Notes |
|----|----------|--------|-------|
| SF-D001 | Social Flow is conversation-first living coordination, not calendar CRUD | **Accepted** | Product truth |
| SF-D002 | Scenarios are behavioral templates mapped to primitives | **Accepted** | Not hard-coded modes |
| SF-D003 | Python proposes; Elixir is authoritative for plan/commit/RSVP | **Accepted** | Aligns ADRs 0002–0003 |
| SF-D004 | No silent binding event creation | **Accepted** | Consent to coordinate first |
| SF-D005 | Shared plan vs private care work must be isolated | **Accepted** | Surprise + gift rules |
| SF-D006 | Blockchain / DID staking / wallets not required for Social Flow | **Accepted reject-as-dependency** | Preserve capability, not mechanism |
| SF-D007 | Social Score rejected (visible or hidden) | **Accepted reject** | Safety rules |
| SF-D008 | No default mood surveillance of contacts | **Accepted** | Explicit self-report only |
| SF-D009 | No advertising use of intimate messages/plans | **Accepted reject** | Trust |
| SF-D010 | “Privacy sandbox” renamed to Personal Context / Relationship Privacy Boundary | **Accepted** | Logical governance, not data lake |
| SF-D011 | Minors/children **general product** deferred for shipping | **Clarified** | Full youth calendar/growth still deferred; **design track opened** (age tiers, guardian, child-to-child conceptual, threat model). Shipping youth features remains LEGAL_OR_POLICY |
| SF-D012 | Location off by default; purpose-limited | **Accepted** | Future capability |
| SF-D013 | Auto-RSVP without explicit authority forbidden | **Accepted** | High-trust approval |
| SF-D014 | First build slice = adult two-user full lifecycle core | **Accepted direction** | Journey A mandatory; Journey B (parent+older child pickup) optional and safety-gated — see `BUILD_SLICE_SOCIAL_FLOW_1.md` |
| SF-D015 | Historic Node roadmap non-authoritative for Social Flow runtime | **Accepted** | ADRs win |
| SF-D016 | Source docs live under docs/source-material from Desktop NIOV Labs/Opal | **Accepted** | Path: Desktop/NIOV Labs/Opal |
| SF-D017 | Relationship universe includes partners, spouses, parents/children, siblings, child-to-child, extended family, friends, trusted groups, caregivers, later professional/community | **Accepted** | `OPAL_RELATIONSHIP_CONTEXTS.md` |
| SF-D018 | Parents/children and child-to-child are first-class product contexts (not edge cases) | **Accepted** | Child-to-child **ship-gated**; model is first-class |
| SF-D019 | Minors are not adult system + parental-control screen | **Accepted** | Age/authority tiers + guardian dignity model |
| SF-D020 | Not surveillance by default; child private space exists and grows with tier | **Accepted** | `OPAL_GUARDIAN_BOUNDARIES.md` |
| SF-D021 | No Social Score; no public relationship ranking; no “most important” ranking | **Accepted** | Safety + product |
| SF-D022 | Relationship labels: suggest + user confirm; never force from frequency alone | **Accepted** | Activation + contexts |
| SF-D023 | Visible signal is a product differentiator; intelligence must be user-experienced without noise | **Accepted** | `VISIBLE_SIGNAL_PRINCIPLES.md` |
| SF-D024 | Device hierarchy: phone primary social surface; tablet supported; desktop/web supporting | **Accepted** | `DEVICE_AND_IDENTITY_MODEL.md` |
| SF-D025 | Not every valid user has a cellular number; guardian-managed / Wi-Fi tablet participation allowed conceptually | **Accepted** | Especially children |
| SF-D026 | Device capability does not define relationship importance | **Accepted** | |
| SF-D027 | Agency Agents required for Social Flow design/build; Agent Zero alone insufficient for multi-domain work | **Accepted** | Evidence under `docs/evidence/relationship-universe/` |
| SF-D028 | Unrestricted child-to-child messaging and open youth discovery blocked until legal/safety gates | **Accepted** | Conceptual docs only for now |
| SF-D029 | Adult-stranger ↔ child contact default-deny | **Accepted** | Contact security |
| SF-D030 | Documentation-only relationship-universe phase; no Social Flow feature implementation in this PR | **Accepted** | |

## Unresolved (do not block documentation)

- External calendar providers  
- Monetization of Social Flow  
- Exact dual-consent UX for shared plan memory  
- Surprise-mode helper invitation model details  
- Numeric age cutoffs and jurisdiction policy (see `OPAL_OPEN_DECISIONS_RELATIONSHIP_UNIVERSE.md`)  
- Exact guardian default visibility of minor message bodies  
- Non-phone minor identity attestation product flow  
- Child-to-child ship criteria beyond conceptual safeguards  

**Honesty:** OPEN / LEGAL_OR_POLICY items are **not PASS**. They may be documented without blocking a carefully bounded **adult** implementation slice.
