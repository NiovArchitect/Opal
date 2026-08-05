# API boundary — Phase 2

Product-auth routes only. No direct Python invocation.

| Route | Behavior |
|-------|----------|
| GET opportunity | Member-only; quiet or one moment |
| POST evaluate | Dinner fixture default; durable write |
| POST participation | Private action |
| POST correction | Persist + maybe suppress |
| POST dismiss | Cooldown quiet |

Outsider → 403 `not_a_member`.
