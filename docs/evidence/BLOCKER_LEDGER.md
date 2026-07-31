# Blocker Ledger

**Status:** Phase 0 live ledger  
**Updated:** 2026-07-31

| ID | Blocker | Class | Blocks | Status | Notes |
|----|---------|-------|--------|--------|-------|
| B000 | Home directory is accidental git root | INTERNAL | Confusion if tools open `$HOME` | Mitigated | Opal isolated at `~/Developer/NIOVI-Architect/Opal` with own `.git` |
| B001 | Phone verification provider unset | EXTERNAL_PROVIDER + FOUNDER_DECISION | Real SMS auth | Open | Dev synthetic path allowed |
| B002 | Contact discovery privacy model | FOUNDER_DECISION + LEGAL_OR_POLICY | Production discovery | Open | Invite-link first recommended |
| B003 | E2EE + AI visibility final design | FOUNDER_DECISION + INTERNAL | “Encrypted messenger” marketing | Open | Phased ADR-0008 |
| B004 | Dual consent for shared analysis | FOUNDER_DECISION | Shared memory features | Open | Default recommendation: required |
| B005 | AI provider + data training terms | EXTERNAL_PROVIDER + LEGAL_OR_POLICY | Production AI | Open | No paid activation yet |
| B006 | Minors / age policy | LEGAL_OR_POLICY | Public launch | Open | Design assumes adults |
| B007 | Voice clone / call-as-user legal | LEGAL_OR_POLICY | Those features | Deferred | Not MVP |
| B008 | Monetization model | FOUNDER_DECISION | Business scaling | Open | Not MVP |
| B009 | Brand spelling confirmation | FOUNDER_DECISION | Marketing | Soft | Using **Opal** |
| B010 | GitHub org naming (Labs vs Architect) | NOT_A_BLOCKER | — | Resolved for bootstrap | `NiovArchitect` auth owner |
| B011 | Production infrastructure | FOUNDER_DECISION | Deploy | Open | Local only |
| B012 | Real personal data use | FOUNDER_DECISION | Any real chat ingest | Open | Synthetic only |
| B013 | Full multi-service docker integration not in unit suite | INTERNAL | End-to-end compose proof | **Resolved** | Container journey PASS 2026-07-31 |
| B014 | Remote CI not yet green on branch | INTERNAL | Merge confidence | **Resolved** | Runs 30628916853 / 30628920474 success |

## Class definitions

- **INTERNAL** — eng can resolve with proposal  
- **FOUNDER_DECISION** — needs explicit founder call  
- **EXTERNAL_PROVIDER** — vendor selection/account  
- **LEGAL_OR_POLICY** — counsel / policy  
- **PRODUCT_RESEARCH** — UX/product validation  
- **NOT_A_BLOCKER** — logged for clarity  
