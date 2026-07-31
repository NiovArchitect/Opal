# Decision Log

**Status:** Phase 0

| Date | Decision | Made by | Evidence / ADR |
|------|----------|---------|----------------|
| 2026-07-31 | Create isolated repo at `~/Developer/NIOVI-Architect/Opal` | Bootstrap | Avoid home git root |
| 2026-07-31 | GitHub private repo `NiovArchitect/Opal` | Bootstrap | `gh auth` as NiovArchitect |
| 2026-07-31 | Product center = relationship intelligence in private comms | Founder brief | PRODUCT_TRUTH |
| 2026-07-31 | Elixir/OTP authoritative runtime | Founder lock | ADR-0002 |
| 2026-07-31 | Python AI workers only | Founder lock | ADR-0003 |
| 2026-07-31 | RN Expo + TS client | Founder + prior docs | ADR-0004 |
| 2026-07-31 | Monorepo | Founder direction | ADR-0001 |
| 2026-07-31 | Reject Node messaging core | Founder lock | SOURCE_EXTRACTION |
| 2026-07-31 | Reject relationship health scores | Founder lock | SAFETY_RULES |
| 2026-07-31 | Defer voice clone / call-as-user | Founder lock | MVP_BOUNDARY |
| 2026-07-31 | Postgres provisional primary DB | Architecture Phase 0 | ADR-0005 |
| 2026-07-31 | Oban + HTTP to Python provisional | Architecture Phase 0 | ADR-0006 |
| 2026-07-31 | Append-mostly offline sync | Architecture Phase 0 | ADR-0007 |
| 2026-07-31 | Phased encryption honesty | Architecture Phase 0 | ADR-0008 |
| 2026-07-31 | No product code import from old Opal | Founder brief | SOURCE_EXTRACTION |
| 2026-07-31 | Phase 0 docs before generic UI | Founder brief | This bootstrap |
| 2026-07-31 | Lowercase dirs `opal_core` / `opal_ai` / `opal_mobile` | Founder Slice 1 | BUILD_SLICE_1 |
| 2026-07-31 | Contract package version 0.1.0 JSON Schema | Slice 1 | packages/contracts |
| 2026-07-31 | Only `ai_echo` executable | Slice 1 | AI boundary |
| 2026-07-31 | DevAuth header only in dev/test | Slice 1 | DevAuth plug |
| 2026-07-31 | Oban durable jobs + TestClient for unit isolation | Slice 1 | AI lifecycle |
| 2026-07-31 | server_seq via conversation row lock | Slice 1 | Messages |

## Pending founder confirmations

See BLOCKER_LEDGER and GAPS_AND_OPEN_DECISIONS.
