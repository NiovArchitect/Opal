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
| 2026-07-31 | Live HTTPClient forced in compose via OPAL_AI_CLIENT=http | Slice 1 closure | docker-compose |
| 2026-07-31 | OPAL_DEV_AUTH / OPAL_EVENT_PROBE explicit env only | Slice 1 closure | runtime.exs |
| 2026-07-31 | Remote CI green required before PR merge | Slice 1 closure | BUILD_SLICE_1_REMOTE_CI |
| 2026-07-31 | Container E2E required as gate 11 | Slice 1 closure | BUILD_SLICE_1_CONTAINER_E2E |
| 2026-08-06 | Alignment layers: person ↔ people ↔ device/world; phone as action harness (support/control) | Founder | OPAL_ALIGNMENT_LAYERS |
| 2026-08-06 | Device capability system is separate from AVP² | Founder correction | OPAL_DEVICE_CAPABILITY_SYSTEM |
| 2026-08-06 | AVP² = payments only (not universal permissions) | Founder correction | OPAL_AVP2_PAYMENTS_BOUNDARY |
| 2026-08-06 | Honest call/booking states; no deceptive voice | Founder | OPAL_DEVICE_CAPABILITY_SYSTEM |
| 2026-08-06 | Friendly Plans accepted as future concept; not shipping; fitness-first vertical | Founder | OPAL_FRIENDLY_PLANS |
| 2026-08-06 | Walkthrough: no logo halo; original first-run copy frozen unless recommended first | Founder | PR #62 / WALKTHROUGH_COPY_POLICY |

## Pending founder confirmations

See BLOCKER_LEDGER and GAPS_AND_OPEN_DECISIONS.
