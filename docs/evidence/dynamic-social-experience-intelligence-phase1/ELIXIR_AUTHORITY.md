# Elixir authority — Phase 1

Elixir remains authoritative for:

| Concern | Module |
|---------|--------|
| Participants / membership | `DynamicIntelligence` + `Audience.authorize_view` |
| Audience / shared projection | `Audience.project_shared` |
| Permission revocation | `evaluate` early silence |
| Conversation context admission | `Context.detect` + `Restraint.decide` |
| Signal eligibility | `Restraint` |
| User confirmation / participation | `Participation.respond` |
| Shared outcome | `Audience` + journey state |
| Revocation / correction | `apply_correction` / `evaluate_with_correction` |
| Python proposal admission | `PythonProposal.validate_and_admit` |

Python may not:

- publish directly to users
- reveal private constraints
- book anything
- create a shared plan automatically
- override user permission
- bypass Elixir hard-constraint revalidation
