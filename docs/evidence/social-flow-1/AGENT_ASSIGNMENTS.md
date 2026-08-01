# Social Flow 1 — Agency Agent Assignments

**Program lead:** Agent Zero  
**Branch:** `build/social-flow-1-adult-lifecycle`  
**Baseline:** `39078f5b3f26fd5e72691ffd8884fb8fdaa55a39`  
**Scope:** Adult two-user Journey A only (Alex ↔ Jordan). No youth product.

| Role | Exclusive ownership |
|------|---------------------|
| Product Manager | Boundary evidence, acceptance journey wording |
| Contract Architect | `packages/contracts/**` |
| Python AI Architect | `services/opal_ai/**` |
| Elixir/OTP Architect | `apps/opal_core/lib/opal_core/social_flow/**`, migrations, AI wiring |
| Channel / Realtime | `conversation_channel.ex` Social Flow events |
| Privacy / Security | Isolation tests, private reminder filters |
| Mobile Architect | `apps/opal_mobile/src/socialFlow/**`, UI shell |
| Test Architect | `test/**`, `tests/journeys/social_flow_1_*` |
| Agent Zero | Integration, PR, gates, merge |

Journey B (family) is **not** implemented in this slice.
