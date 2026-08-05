# Collective fit — Phase 1

## Constraint classes

| Class | Example | Averaged? |
|-------|---------|-----------|
| Hard shared | quiet required | No |
| Hard private | max price band | No (hidden) |
| Soft | novelty preference | Yes, for ranking among valid |
| Soft | travel friction | Yes, for ranking among valid |
| Hard timing | earliest available | No |

## Rules

1. Hard constraints must all pass or the venue is discarded.
2. If no venue passes, return no option (silence path).
3. Soft preferences only rank among hard-valid venues.
4. Private hard constraints affect eligibility without shared explanation.
5. Preferred option is the top hard-valid venue after soft ranking.

## Phase 1 result

- Winner: `venue_1` Quiet bistro fixture
- Discarded: loud `venue_2`, high-cost `venue_3`
- Optional secondary: long-travel quiet `venue_4`
