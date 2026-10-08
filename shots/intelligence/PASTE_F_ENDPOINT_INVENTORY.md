# Paste F — Endpoint Inventory (Phase 0)

All routes under authenticated `product_auth` scope: `/api/v1/product/...`.  
Paths match **frontend mocks** in `apps/opal_web/src/api/intelligenceClient.ts` (contract owner).  
Paste F narrative `/api/v1/people/...` paths are aliases in spirit only — product namespace wins.

| BLOCKED mock | Method + path | Owner module(s) | Auth |
|---|---|---|---|
| Person memory GET | `GET /intelligence/people/:person_id/memory` | `SocialMemory.PersonMemory`, `Recall`, `Routine`, `TemporalAnchor`, `OutcomeSignal`, `RelationshipBehaviorProfile` | account-scoped; foreign → **404** |
| Person fact Correct | `PATCH /intelligence/people/:person_id/facts/:key` | `PersonMemory` (known_facts map) + provenance `:stated` | same |
| Person fact Remove | `DELETE /intelligence/people/:person_id/facts/:key` (+ `confirm=true`) | archive fact entry (`archived_at`) | same |
| Fact confirm/wrong | `POST /intelligence/people/:person_id/facts/:key/confirm` | provenance transition | same |
| Mediation list | `GET /intelligence/mediation` | `GroupDecisionState`, `GroupCoordinator`, `GroupDecision` | owner account |
| Mediation by convo | `GET /intelligence/groups/:conversation_id/mediation` | same | owner + member |
| Mediation send | `POST /intelligence/mediation/:id/send` | `GroupCoordinator` owner_draft + **outbox** | owner |
| Mediation dismiss | `POST /intelligence/mediation/:id/dismiss` | `GroupDecision.dismiss_mediation/2` | owner |
| Mediation lock-in / create_plan | `POST /intelligence/mediation/:id/create_plan` | consensus → plan prefill | owner |
| Briefing current | `GET /intelligence/briefings?current=1` | `WeeklyBriefing` | owner; 404 + `next_briefing_at` if none |
| Briefing past | `GET /intelligence/briefings` | same | owner |
| Briefing by id | `GET /intelligence/briefings/:id` | same | owner |
| Briefing dismiss | `POST /intelligence/briefings/:id/dismiss` | dismiss-for-week | owner |
| Attention enrichment | fields on `GET /attention` items | `AttentionCenter` + `TemporalAnchor` + plans | existing attention auth |
| Channel `group_blocked` | broadcast first-class | `BroadcastChoreography` + `GroupCoordinator` | **owner** `user:` (Paste C mediation privacy) |
| Channel `group_consensus` | broadcast | same | owner `user:` |
| Channel `weekly_briefing` | broadcast | `WeeklyBriefingWorker` | owner `user:` |
| Channel `temporal_anchor` | broadcast | temporal nudge / MemoryHourlyWorker | owner `user:` |

## Controller module

`OpalCoreWeb.IntelligenceProductController` — product HTTP facade only; intelligence logic stays in existing modules.
