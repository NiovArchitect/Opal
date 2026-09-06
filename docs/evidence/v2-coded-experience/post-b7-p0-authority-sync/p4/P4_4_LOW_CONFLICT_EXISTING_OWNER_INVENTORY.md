# P4.4 Low/Conflict Existing Owner Inventory

**HEAD:** `a175199`

| Owner | Action |
|-------|--------|
| DecisionIntelligence + Context/Evidence/Result | **EXTEND** — low/tradeoff mode on DecisionResult |
| HighConfidence / MediumConfidence | **REUSE** — do not weaken; Low only after High/Medium inapplicable |
| CandidateSource / Place.Catalog | **REUSE** — still **FIXTURE** |
| Outbox / Kafka | **EXTEND** — tradeoff_presented / selected / superseded |
| Global Opal shell | **EXTEND** — one tradeoff UI (988:263) |
| P2 / P3 | **DO_NOT_TOUCH** |

No second DI engine. Conflict lives on DecisionResult (+ structured payload).
