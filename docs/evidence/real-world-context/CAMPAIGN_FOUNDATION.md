# Real-World Context + Device Harness — Campaign Foundation

Branch: `build/real-world-context-device-harness`  
Base: `origin/main` after PR #65 merge (`be71db4`)  
UX freeze: absolute — no CSS/layout redesign in this campaign.

## Product laws locked

1. **Every source eliminates a step** without silently taking authority.
2. **Automate cognition aggressively; automate external actions progressively.**
3. Ladder: `understand → privately_suggest → prepare → authorize → execute → confirm`
4. **Free ≠ willing** (calendar free is capacity, not social desire).

## Implemented (truthful now)

| Layer | Module | Live? |
|-------|--------|-------|
| Context registry | `RealWorld.ContextSource` | yes (contract) |
| Calendar connector | `Calendar.Connector` + `FreeBusyStore` | local store (not Google OAuth) |
| Calendar → sufficiency | `CalendarSufficiency` + `Availability.resolve_intervention` fuse | yes |
| Calendar write SM | `Calendar.WriteAction` | prepare/authorize/create stub |
| Willingness | `Cognition.Willingness` | yes |
| Zero redundancy | `Cognition.ZeroRedundancy` | yes |
| Effort budget | `Cognition.EffortBudget` | yes |
| Automation ladder | `Cognition.AutomationLadder` | yes |
| Plan versioning | `Cognition.PlanVersion` | yes |
| Progressive enrichment | `Cognition.ProgressiveEnrichment` | yes |
| Decision compression | `Cognition.DecisionCompression` | yes |
| Location precision/grant/retention/movement | `Location.*` | contracts |
| Proximity / burden / halfway | `Proximity.*` | pure engines |
| Preference memory | `Place.PreferenceMemory` | yes |
| Device registry + action SM | `Device.*` | yes |
| Booking provider boundary | `Booking.ProviderBoundary` | abstract |
| Events | `RealWorld.Events` | outbox ready |

## Explicitly NOT claimed live

- Google/Apple/Microsoft calendar OAuth
- Real GPS collection
- OpenTable/Resy booking
- Production device harness execution
- Kafka synchronous path

## Steps eliminated when sources present

- Calendar free/busy → no “let me check my calendar”
- Zero redundancy → no re-ask known time/area
- Decision compression → no dominated option comparison
- Effort budget → prefer one confirmation over editor
- Travel burden → no manual map fairness math
- Meet halfway → no user midpoint calculation
- Device ladder → no silent external action
