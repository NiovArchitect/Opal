# Repeat experience — Phase 3

## Scenario

Later synthetic dinner context for the same participant set after accepted positive learning.

## Proven behaviors

| Behavior | Status |
|----------|--------|
| Prior accepted outcome provides modest ranking influence | PASS (`rank_with_learning`) |
| Hard constraints still dominate | PASS (venue_2/venue_3 still excluded by CollectiveFit) |
| Preferred remains hard-constraint winner (venue_1) | PASS |
| Same venue not selected automatically solely by learning | Design: boost only after hard filter |
| Stale outcome influence decays | PASS (`inserted_at` decay cutoff 60d) |
| Different participant set does not inherit learning | PASS (participant_set_key isolation) |

## Fresh preferences and availability

Phase 3 ranking still runs CollectiveFit first; learning is a post-filter modest re-score only.
