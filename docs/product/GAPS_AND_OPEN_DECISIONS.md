# Gaps and Open Decisions

**Status:** Phase 0  
**Rule:** Gaps do not block repository bootstrap or local docs. They block “spec complete” claims and many production actions.

Classification key:

- `FOUNDER_DECISION`  
- `EXTERNAL_PROVIDER`  
- `LEGAL_OR_POLICY`  
- `PRODUCT_RESEARCH`  
- `INTERNAL` (engineering can propose default)  
- `NOT_A_BLOCKER`

---

## Identity and org

| ID | Gap | Class | Notes |
|----|-----|-------|-------|
| G001 | Exact GitHub owner slug | NOT_A_BLOCKER | Resolved for bootstrap: **`NiovArchitect`** (auth identity). Historical docs said NIOV-Labs / “NIOVI Architect”. |
| G002 | Public product spelling / brand | FOUNDER_DECISION | Repo and product name used here: **Opal**. Confirm marketing spelling if any alternate brand exists. |
| G003 | Repo name vs display name | NOT_A_BLOCKER | Repo `Opal`; display **Opal**. |

## Communication infrastructure

| ID | Gap | Class | Notes |
|----|-----|-------|-------|
| G010 | Phone verification provider | EXTERNAL_PROVIDER + FOUNDER | Twilio, MessageBird, etc. No paid activation without approval. |
| G011 | Contact discovery privacy model | FOUNDER + LEGAL | Hashing, rate limits, social graph leakage. |
| G012 | Non-user invites: link, SMS, or both | FOUNDER | |
| G013 | Presence / last-seen policy | PRODUCT_RESEARCH | Safety implications. |

## Encryption and AI visibility

| ID | Gap | Class | Notes |
|----|-----|-------|-------|
| G020 | End-to-end encryption design | INTERNAL + FOUNDER | Phased? Messaging E2EE vs AI plaintext window. |
| G021 | Server visibility when AI enabled | FOUNDER + LEGAL | Core trust question. |
| G022 | On-device vs server AI | INTERNAL | Performance vs privacy. |
| G023 | Multi-device key and sync | INTERNAL | |
| G024 | Offline edit conflict resolution | INTERNAL | ADR-0007. |

## Consent and memory

| ID | Gap | Class | Notes |
|----|-----|-------|-------|
| G030 | Per-conversation AI consent UX | PRODUCT_RESEARCH | |
| G031 | Dual approval for shared relationship analysis | FOUNDER | Strong default recommendation: **yes**. |
| G032 | What stays private to one person | FOUNDER | Recommend: all reflections private by default. |
| G033 | Data deletion scope and timelines | LEGAL + FOUNDER | |
| G034 | Relationship-memory revocation semantics | INTERNAL + LEGAL | |
| G035 | AI provider retention / training | EXTERNAL + LEGAL + FOUNDER | |

## Voice and telephony

| ID | Gap | Class | Notes |
|----|-----|-------|-------|
| G040 | Voice cloning disclosure rules | LEGAL + FOUNDER | Deferred capability. |
| G041 | Outbound call-as-user policy | LEGAL + FOUNDER | Deferred. |
| G042 | Call recording consent | LEGAL | Jurisdictional. |
| G043 | Telephony provider | EXTERNAL | No prod without approval. |

## Safety and policy

| ID | Gap | Class | Notes |
|----|-----|-------|-------|
| G050 | Blocking / stalking / harassment full policy | LEGAL + PRODUCT | MVP has baseline block. |
| G051 | Coercive-control playbooks | PRODUCT + LEGAL | Synthetic tests first. |
| G052 | Minors / age requirements | LEGAL | |
| G053 | Uncertainty language final copy deck | PRODUCT_RESEARCH | Principles set; copy polish later. |
| G054 | Relationship health quantification | NOT_A_BLOCKER | **Rejected.** |

## Product / business

| ID | Gap | Class | Notes |
|----|-----|-------|-------|
| G060 | Monetization without exploiting vulnerability | FOUNDER + PRODUCT | |
| G061 | Boundary: assist vs act as user | FOUNDER | Principles set; edge cases open. |
| G062 | Primary navigation freeze | PRODUCT_RESEARCH | Candidates only. |
| G063 | Primary database choice | INTERNAL | ADR-0005 provisional Postgres. |
| G064 | Elixir↔Python transport | INTERNAL | ADR-0006 provisional HTTP+job queue. |

---

## Recommended provisional defaults (non-binding until founder confirms)

1. **Shared analysis:** dual consent required.  
2. **Private reflections:** never auto-shared.  
3. **AI master:** educational opt-in; features ask contextually.  
4. **Commitments:** candidates until user confirms.  
5. **Health scores:** never.  
6. **Voice clone / call-as-user:** not in MVP.  
7. **Database:** PostgreSQL for authoritative relational state.  
8. **AI transport:** Oban (or equivalent) jobs + HTTP/gRPC to Python workers.  
9. **E2EE:** design-compatible; not blocking local MVP with TLS + at-rest + strict access control.  

---

## Blocker ledger pointer

Operational tracking lives in `docs/evidence/BLOCKER_LEDGER.md`.
