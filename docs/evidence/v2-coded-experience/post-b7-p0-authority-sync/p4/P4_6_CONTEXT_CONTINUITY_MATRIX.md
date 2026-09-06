# P4.6 Context Continuity Matrix

| Scenario | Event | Changed | Preserved | Revision |
|----------|-------|---------|-----------|----------|
| High OSM cold start | create+resolve | intent, location, result | n/a (new) | 1→result |
| Medium answer | answer_question | soft/time/vibe dim | people, hard constraints, decision_id | +1 |
| Low tradeoff select | resolve_tradeoff | soft preference only | hard constraints, decision_id | +1 |
| Non-material world event | recompose | none (silence) | all | unchanged |
| Selected place unavailable | urgent invalidate | result invalidated; may FAILURE | decision_id, people | + if context mutates |
| Accepted + better score | commitment inertia | none auto | place identity | unchanged |
| Stale question/tradeoff | supersede | question/tradeoff status | decision_id | context already moved |

**Law:** `decision_id` stable · revisions monotonic · no WHO/WHEN/WHERE reset without cause.
