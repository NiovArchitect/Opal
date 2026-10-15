# Repair #6 — Coverage / Gap Map

Baseline: `4dfa8d35` · Branch: `muse/packet-b-batch-2` · HOLD · PASS2=NO

## Pipeline

| Stage | Status | Notes |
|---|---|---|
| Center input | PROVEN (R5) + composer REGRESSED→REPAIRED | Keyboard PASS preserved; multiline containment PASS machine |
| Human Chat meaning/authority | PARTIAL | UI works; full meaning chain UNPROVEN |
| Call → intelligence E2E | UNPROVEN | CALL_LOG_PROJECTION STILL_MISSING_E2E |
| Intent classify | PROVEN taxonomy | Exact vs discovery added |
| Entity constraints | PARTIAL→EXTENDED | EXACT_ENTITY + generic WHO + when_time |
| PlanningContext | PROVEN slots + fingerprint resume | |
| Authority lead/co_lead | IMPLEMENTED | JourneyAuthority; surfaced on Journey UI |
| Provider exact | MISSING→PROVEN live | Geoapify geocode amenity; Night Hawk 1315 Orange Ave |
| Provider discovery | PROVEN | Mexico City category path preserved |
| Plan mutate time | PARTIAL→EXTENDED | Center when_time + Journey material_change; PlansPane dead Change-time removed |
| Projections | PARTIAL | Lead visible on Journey; Graph detail viewport fill |
| Realtime | PARTIAL | unchanged |

## Specimens

| ID | Result |
|---|---|
| A Exact Nighthawk | PASS live Geoapify · UNREQUESTED=0 · SUBSTITUTION=0 |
| B Generic Friday WHO | PASS unit (clears Maya inheritance cues) |
| C Pending resume | PASS fingerprint + ensure_plan reuse path |
| D Multiline composer | PASS playwright containment |
| E Time patch | PASS_MACHINE extract+SharedPlan; Journey manage lead-gated |
| F Lead visible | YES on JourneySurface / GraphJourneyCard |
| G Double-tap Center | PRESERVE R5 |
| H Center≠Chat leak | PRESERVE R5 SUBJECT≠RECIPIENT |
| I Discovery/DeepSeek/solo | Regression lock — targeted tests green |

## Explicit UNPROVEN (do not claim GREEN)

- Call ingestion → consent → speaker → signals → durable lineage → Graphing
- Full relationship gyroscope across all six questions
- Comparison curation UX
- Non-lead change-request happy path (explicitly blocked with consumer copy)
