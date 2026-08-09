# Alignment Intelligence Campaign — Internal Checkpoint

**Not a handoff.** Continuous execution evidence for the authorized backend campaign under frozen UX.

Branch: `build/relationship-availability-alignment`  
Visual freeze: no CSS / Primary 1→8 / motion / Technicolor edits in this package.

## Packages status

| # | Package | Status |
|---|---------|--------|
| 1 | Production intervention wiring | Done (prior + maintained) |
| 2 | Minimum-question bridge | Done (prior) |
| 3 | Source + freshness model | Expanded (`AvailabilitySourceFact`) |
| 4 | Correction loop | Done — domain + `POST .../availability/correct` |
| 5 | Conversation-derived time evidence | Done — `ConversationTimeEvidence` |
| 6 | Asymmetric participation | Done — `AsymmetricParticipation` |
| 7 | Purpose-bound sharing | Done — `PurposeBoundShare` |
| 8 | Alignment context | Done — `AlignmentContext` |
| 9 | General intervention resolution | Done — `InterventionResolution` |
| 10 | Restraint | Wired via DI Restraint + general resolver |
| 11 | Location-fit contract | Done — no live collection |
| 12 | Place gap foundation | Done — `PlaceGap` |
| 13 | Group alignment | Covered via asymmetric + group matrix tests |
| 14 | Observability | Done — `InterventionTelemetry` + outbox |
| 15 | Python intelligence boundaries | Done — `PythonIntelligenceBoundary` |
| 16 | Event/outbox readiness | Done — `AlignmentEvents` + topic families |
| 17 | Device capability boundary | Done — handoff only |
| 18 | Calendar free/busy contract | Done — no fake live claims |
| 19 | Fallback matrix | Implemented as tests |
| 20 | Deep E2E proof | Journeys A–J in matrix test |

## Authority invariants

- Elixir authorizes; Python proposes
- Never auto-share / Set from availability or model output
- Private fact ≠ shared fact ≠ derived conclusion reveal
- Silence is a successful outcome
- Visual freeze held

## Test surface

- `alignment_intelligence_campaign_test.exs`
- `alignment_fallback_matrix_test.exs`
- existing availability sufficiency / API suites
