# P4.2 High-Confidence Existing Owner Inventory

**HEAD:** `bb17d81` · **Date:** 2026-09-05

| Owner | Purpose | Action |
|-------|---------|--------|
| `OpalCore.DecisionIntelligence` | DecisionContext lifecycle | **EXTEND** |
| DecisionContext / Evidence / MutationKey | Context truth | **REUSE** |
| EventOutbox + Publisher + KafkaAdapter | Durable events | **REUSE / EXTEND** (`decision.resolved`, `decision.accepted`) |
| `Physical.CandidateSource` + `Place.Catalog` | Candidate inventory | **REUSE** — classify **FIXTURE** |
| `HardCandidateFilter` | Hard constraint filter | **REUSE** |
| `CollectivePlaceFit` / DecisionCompression | Fit helpers | **REFERENCE** — do not revive multi-option UI |
| `ExternalWorldTruth` | Social fit ≠ provider fact | **REFERENCE** |
| `services/opal_ai` + `collective_fit_dinner` | Python propose-only | **EXTEND** with high_eval contract |
| `OpalCore.AI` / AiJob | Job idempotency patterns | **REFERENCE** |
| SharedPlan / Graph APIs | Same-Reality accept | **REFERENCE** via `graph_id` |
| Global Opal `OpalAmbient` 618:902 | Shell + result region | **EXTEND** one-answer provisional |
| 979:2 / 979:280 visuals | Frozen high visuals | **REFERENCE** semantics (violet provisional) |
| P2 Calls / P3 motion-signal | Frozen | **DO_NOT_TOUCH** |
