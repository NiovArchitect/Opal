# Build slice: Dynamic Social and Experience Intelligence Phase 1

**Status:** Synthetic quiet-dinner-for-three proof  
**Branch:** `build/dynamic-social-intelligence-phase1-dinner-proof`  
**Does not close Social Flow 18.**  
**Does not enable live location, providers, payments, Kafka, or Foundation.**

## Objective

Prove the core product magic in one narrow, testable slice:

> Opal notices what is taking shape, understands the people involved, protects what should remain private, surfaces one fitting possibility, and stays quiet when it should.

## Scope

| In | Out |
|----|-----|
| Forming dinner context detection | Live GPS |
| Fixture personas A/B/C | Real phone numbers |
| Collective-fit ranking | Real restaurant APIs |
| Private budget hard constraint | Bookings / payments |
| Restraint / silence | Public feed |
| Private participation | Friendship scores |
| Group-safe explainability | Provider chat personae |
| Correction “Not with this group” | Production deploy |
| Elixir authority + Python proposal | SF18 device closure |

## Modules

### Elixir (`apps/opal_core`)

| Module | Role |
|--------|------|
| `OpalCore.SocialFlow.DynamicIntelligence` | Orchestrator |
| `...Context` | Dinner / weak / ordinary detection |
| `...CollectiveFit` | Hard + soft ranking |
| `...Restraint` | Surface vs silence |
| `...Participation` | Private responses + aggregate summary |
| `...Audience` | Shared projection + leak checks |
| `...PythonProposal` | Admit/reject Python rankings |
| `...Fixtures` | Synthetic dinner scenario |

### Python (`services/opal_ai`)

| Module | Role |
|--------|------|
| `collective_fit_dinner.py` | Deterministic ranking proposal |
| capability `social_flow_collective_fit_rank` | Contracted job |

### Clients

| Path | Role |
|------|------|
| `apps/opal_web/src/experience/experienceMoment.ts` | Conversation-scoped moment contract |
| `apps/opal_mobile/src/__tests__/experienceMoment.test.ts` | Shared contract test |

## Authority

- Elixir admits participants, privacy, restraint, shared outcomes, corrections.
- Python proposes rankings and confidence only.
- Python never publishes, books, or reveals private constraints.

## Closure language (when gates green)

> OPAL DYNAMIC SOCIAL AND EXPERIENCE INTELLIGENCE PHASE 1 CLOSED FOR SYNTHETIC COLLECTIVE-FIT, RESTRAINT, PRIVATE PARTICIPATION, AND CONVERSATION-SCOPED EXPERIENCE PROPOSAL

See `docs/evidence/dynamic-social-experience-intelligence-phase1/`.
