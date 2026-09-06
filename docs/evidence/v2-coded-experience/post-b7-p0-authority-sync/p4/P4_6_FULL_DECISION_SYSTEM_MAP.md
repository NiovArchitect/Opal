# P4.6 Full Decision System Map

**HEAD base:** `939b8ea` (+ P4.6 surgical cold-start path)

## Pipeline (authoritative)

```
INPUTS (Calls/Chats/Global Opal/Graph/Journey/Location/World)
  → DecisionContext (Postgres) REAL
  → DecisionEvidence REAL
  → CandidateAcquisition REAL
       ├─ synthetic → Place.Catalog FIXTURE
       └─ connected → OSM Overpass REAL_EXTERNAL | Google DEPENDENCY
  → HardCandidateFilter REAL
  → LowConfidence / MediumConfidence / HighConfidence REAL (order via resolve)
  → DecisionResult REAL
  → Outbox REAL → LocalAdapter REAL → KafkaAdapter LOCAL_REAL
  → Materiality + Recomposer REAL
  → Consumer (flagged) REAL
  → Product API / Global Opal projection (P4.6 surgical) 
```

## Classification

| Module | Class |
|--------|-------|
| DecisionContext / Result / High / Med / Low | REAL |
| CandidateAcquisition / OSM | REAL / REAL_EXTERNAL |
| Place.Catalog | FIXTURE |
| Google Places / Ticketmaster | DEPENDENCY |
| Materiality / Recomposer / DependencyIndex | REAL |
| Outbox / Publisher | REAL |
| Kafka local | LOCAL_REAL |
| Kafka production | NOT_DEPLOYED |
| Python propose | LOCAL_REAL propose-only |
| Phoenix Channels (general) | REAL |
| Dedicated Decision Channel | NOT_BUILT (HTTP product API instead) |
| Global Opal demo flags | TEST FIXTURE UI |
| WebRTC / TURN | NOT_BUILT |
| Memory learning loop | PARTIAL events only |

## Alternate paths

| Path | Class |
|------|-------|
| OpportunityController dinner fixture evaluate | HISTORICAL / parallel DynamicIntelligence — not P4 DI SoT |
| OpalAmbient hardcoded IDEAS carousel | DEPRECATION DEBT until Nearby uses DI |
| Founder home seed | FIXTURE demo |

**Canonical SoT for decisions:** `OpalCore.DecisionIntelligence` only.
