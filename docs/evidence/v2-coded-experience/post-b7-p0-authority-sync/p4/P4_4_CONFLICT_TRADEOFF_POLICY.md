# P4.4 Conflict / Tradeoff Policy

**Version:** `p4.4.tradeoff.v1`

## When Low applies

Facts known enough that Medium would not ask, but two **soft** legitimate needs cannot be jointly satisfied by remaining candidates (or explicit soft conflicts in context), while hard constraints remain intact.

## Never Low

- Missing human fact → Medium  
- Machine/provider/model failure → system failure  
- Zero candidates under hard constraints → `NO_VALID_CANDIDATE`  
- Invented conflict from close scores alone  

## Axes (one)

| Axis | Option A | Option B |
|------|----------|----------|
| CLOSER_VS_MORE_SPECIAL | Closer | More special |
| CHEAPER_VS_BETTER_FIT | Cheaper | Better fit |
| QUIETER_VS_MORE_ENERGETIC | Quieter | More energetic |
| EARLIER_VS_EVERYONE_TOGETHER | Earlier | Everyone together |

## Resolution

Authorized human picks one side → mutate soft context only → never violate hard → HighConfidence.evaluate.
