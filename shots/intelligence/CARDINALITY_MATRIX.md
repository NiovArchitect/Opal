# Paste I Cardinality Matrix

Authority: `shots/intelligence/MULTIUSER_VERIFY.json` + `multiuser_pressure_test.exs` (30/30) + N1–N4 (`cardinality_pressure_test.exs`).

Cardinality labels how many people the *interaction under test* coordinates:

| Label | Meaning |
|---|---|
| **1:1** | Dyad — exactly two people (or owner↔one contact) |
| **1:many** | One actor fans out to / aggregates across multiple people (broadcast, batch Center card, one person in multiple groups) |
| **many:many** | Group of 3+ peers coordinating a shared object |

---

## Batched nudge budget (product decision)

**One AttentionBudget slot per batch delivery to the owner** — one Center card listing N person nudges = **1 unit** against `used_today`, **not** one per person.

- API: `AttentionBudget.grant_batch/3` (see module moduledoc + function doc).
- Individual `time_critical` items still break through separately via `request_slot/4` and do not count against the daily budget (same as mediation).
- Casual per-person `request_slot` remains valid for single-nudge surfaces; batch delivery must use `grant_batch`.

---

## Phase-2 matrix (T / G / I / M / P / E)

| ID | Name | Cardinality | Notes |
|---|---|---|---|
| T1 | Dinner across the Pacific | **1:1** | A↔B dual local times |
| T2 | Four timezones, one decision | **many:many** | 4-person mediation |
| T3 | The traveler returns | **1:1** | A travel pause; shared plan with B |
| T4 | Midnight boundary | **1:1** | A↔B day names |
| T5 | Daylight saving weekend | **1:1** | A↔B absolute time |
| T6 | Same city, different neighborhoods | **1:1** | Midpoint A↔B |
| G1 | The split vote | **many:many** | 4-person consensus |
| G2 | The silent one | **many:many** | Group silence tracking |
| G3 | The late joiner | **many:many** | Catch-up into group |
| G4 | The dropout | **many:many** | Headcount / re-split |
| G5 | Two groups, one person | **1:many** | One owner, two group memberships; private conflict |
| G6 | The plus-one | **many:many** | Group headcount + guest |
| I1 | The cold invite | **1:1** | A→C invite |
| I2 | Invite ignored | **1:1** | Single invite lifecycle |
| I3 | The re-invite | **1:1** | Fresh invite after decline |
| I4 | Group invite | **1:many** | One host → three independent cards |
| M1 | Split the flight | **1:1** | A↔B wallet split |
| M2 | Over-threshold group booking | **many:many** | Per-person confirm in group |
| M3 | Insufficient balance mid-group | **many:many** | Group waiting_on |
| M4 | The refund | **many:many** | Per-member credit |
| P1 | Private stays private | **1:1** | A solos vs B shared |
| P2 | The ex-factor | **many:many** | Group mediation; private ex sealed |
| P3 | Wallet privacy | **1:1** | Split surfaces A↔B |
| P4 | Leakage probe | **1:1** | A private vs B scoped prompt |
| E1 | Voice note to the group | **1:many** | One speaker → group recipients |
| E2 | The artifact share | **1:1** | A share link for plan with B |
| E3 | Remind us | **1:1** | Parallel reminders A + B |
| E4 | Real-time convergence | **1:1** | A edit → B sees |
| E5 | Notification storm | **1:many** | Many notifications → one owner budget |
| E6 | The graceful exit | **many:many** | Remove from group plan |

### Phase-2 counts

| Cardinality | Count | IDs |
|---|---|---|
| 1:1 | 15 | T1, T3, T4, T5, T6, I1, I2, I3, M1, P1, P3, P4, E2, E3, E4 |
| 1:many | 4 | G5, I4, E1, E5 |
| many:many | 11 | T2, G1, G2, G3, G4, G6, M2, M3, M4, P2, E6 |

**Gap:** 1:many was thin at 4 (<6). N1 + N3 fill to **6**. many:many and 1:1 already ≥6; N2/N4 add deliberate depth.

---

## Cardinality addendum N1–N4

| ID | Name | Cardinality | Asserts |
|---|---|---|---|
| N1 | Typed broadcast dinner | **1:many** | Spouse/close_friend/business/acquaintance → four cards (warm/full, casual, formal/logistics, minimal); no cross-leak of sibling framing |
| N2 | Spouse 1:1 memory depth | **1:1** | Seeded ~6-month PersonMemory + routines; PromptBuilder / Access `:one_to_one` includes vibe/routines/rhythms/open loops; `:group` strips |
| N3 | Batched Center nudges | **1:many** | Three typed nudges (mom warm, business formal, old friend casual); `grant_batch` → `used_today` +1 |
| N4 | Group trip + private fork | **many:many** | Group plan A/B/C + A↔B private surprise fork; C sealed; group unchanged |

### Coverage after N1–N4

| Cardinality | Phase-2 | N-add | **Total listed** |
|---|---|---|---|
| 1:1 | 15 | N2 | **16** |
| 1:many | 4 | N1, N3 | **6** |
| many:many | 11 | N4 | **12** |

All cardinalities ≥6.

---

## Test

```bash
cd apps/opal_core && mix test \
  test/opal_core/intelligence/cardinality_pressure_test.exs \
  test/opal_core/intelligence/attention_budget_test.exs
```

Evidence: `shots/intelligence/CARDINALITY_VERIFY.json`.
