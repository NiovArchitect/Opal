# Physical Reality + Experience Execution

After PR #71 merge (`149a852`).

Branch: `build/physical-reality-experience`

## Separation of concerns

| Layer | Question |
|-------|----------|
| Native Opal time | WHEN is committed / open |
| Location + travel | WHEN can it ACTUALLY happen |
| CandidateSource / PlaceProvider | WHAT EXISTS |
| CollectivePlaceFit | WHAT FITS THESE PEOPLE |
| Minimum question / humans | WHAT still needs a decision |
| Device / booking | EXECUTE |

## Product laws enforced in code

- Location is a feasibility source, not a product surface
- OS permission ≠ social share
- Precision minimization by purpose
- Expected origin ≠ current GPS for future plans
- Geometric estimate ≠ traffic ETA
- Candidate acquisition ≠ CollectiveFit
- Private budget / mobility never leak in shared projections
- Block terminates location sharing
- No peer location query API
- Opportunity detection is not a feed
- Visual freeze: no maps/explore/location pages

## Modules

```
physical/
  location_context.ex      # purpose-bound approx location + expected origin
  location_policy.ex       # block, revoke, probing, retention, shared projection
  travel_provider.ex       # geometric honesty taxonomy
  transition.ex            # buffer + travel composition
  temporal_spatial.ex      # private transition feasibility
  candidate_source.ex      # WHAT EXISTS
  place_provider.ex        # provider boundary + fallback
  collective_place_fit.ex  # WHAT FITS
  place_gap.ex             # only when place is the gap
  booking_attachment.ex    # lineage to native commitment
  opportunity.ex           # latent alignment, not a feed
  experience_pipeline.ex   # end-to-end under frozen UX
```

## UX freeze

No maps page, explore feed, location chrome, calendar UI, or restaurant browser.
Existing Private Opal / Shared possibility / minimum question / Set / action auth only.

## Provider posture

Fixture catalog default. External place/travel keys optional.
Core proof does not block on credentials.
See `PLACE_PROVIDER_RESEARCH.md`.

## Success bar (courtship gold)

1. Desire to meet emerges in conversation
2. Native commitments known
3. Private location/time feasibility
4. ≤1 smallest unknown question
5. Realistic time (buffers + travel)
6. Sensible meetup area
7. ≤3 real places compressed
8. Humans choose → Set
9. Optional book with one authorization
10. Later leave-by reminder
