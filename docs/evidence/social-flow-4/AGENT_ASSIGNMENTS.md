# Social Flow 4 — Agency Agent Assignments

**Branch:** `build/social-flow-4-collective-intelligence`  
**Baseline:** `97228b6ddfb03fcda349e4ef00cce4a9d45d3044`  
**Orchestrator:** Agent Zero (controlling)

| Role | Mission | Primary files | Completion |
|------|---------|---------------|------------|
| Agent Zero | Integration, scope, CI, PR, merge, evidence | entire SF4 slice | PASS |
| Product Manager | Trusted groups 3–8 adults; no public/PM drift | evidence, journeys | PASS |
| Group Dynamics (composite) | Silence/tentative ≠ consensus; minority protection | `collective.ex` participation | PASS |
| Relationship UX | Humane group language; no blame | copy in summaries | PASS |
| Behavioral Ethicist | No ranking, pressure, gamified conformity | mobile copy filters | PASS |
| Elixir/OTP Architect | Membership, plans, rules, PubSub, audit | `collective.ex`, schemas, migration | PASS |
| Python AI Architect | Bounded group intent; no ranking | `group_intent.py`, worker | PASS |
| Contract Architect | Capability enums + response shapes | contracts schemas, `contracts.ex` | PASS |
| Privacy Engineer | Private constraints, free/busy, sync filter | `GroupConstraint`, availability, sync | PASS |
| Security Engineer | Taylor denial, membership, no spoof | tests Journey A–D | PASS |
| Mobile Architect | Helpers, false-consensus guards | `groupCollective.ts` | PASS |
| UX / UI / A11y | Chat-first; factual readiness; non-color states | helpers + tests | PASS |
| Test Architect | Journeys A–E | `collective_test.exs` | PASS |
| UI Finish Gate | Social not administrative; no voting-app aesthetics | language review | PASS |

## Catalog gap

**Group Dynamics Specialist** — no exact Agency Agent catalog entry. Documented composite of Relationship UX + Product Manager + Behavioral Ethicist + Conversation Analysis + Privacy.

## Disagreements

None unresolved. Integration decisions:

1. Unanimous required participants only for plan creation (no majority override).
2. Private constraints default visibility `private`; shared_summary is minimized.
3. Availability peers never read another user’s grant payload.
4. Revision approvals exclude proposer; all required must accept.
