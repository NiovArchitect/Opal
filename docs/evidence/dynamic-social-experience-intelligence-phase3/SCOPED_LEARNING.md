# Scoped learning — Phase 3

## Bound

Learning is scoped by:

- experience type (`dinner`)
- participant set key (sorted member ids)
- dimension
- confidence
- freshness / expiry (90 days)
- active flag
- correction suppression flag

## Dimensions (Phase 3)

| Dimension | Intent |
|-----------|--------|
| quiet_venue | Quiet place worked |
| moderate_cost | Cost band fit dinner context (never shared as price) |
| timing | Evening timing worked |
| balanced_travel | Balanced travel acceptable |
| similar_dinner | Group may enjoy similar dinners |

## Ranking influence

`Outcome.rank_with_learning/3`:

- Applies modest boosts (capped ~0.25 total influence)
- Hard constraints still come from `CollectiveFit.rank/3`
- Same venue is not auto-selected by learning alone
- Stale learnings (older than 60 days) excluded even if not expired

## Forbidden products

- Friend / reliability / wealth scores
- Global personality profiles
- Permanent venue lock from one dinner
