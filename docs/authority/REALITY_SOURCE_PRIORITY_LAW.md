# REALITY SOURCE PRIORITY LAW

**Status:** CURRENT AUTHORITY (steward Pass 1)  
**Synced:** 2026-10-13  
**Composes with:** `STATE_OWNERSHIP_LAW.md` · `STATE_SURFACE_CONTRACT.md` · `PRODUCT_INVARIANTS.md`

```yaml
authority_class: REALITY_SOURCE_PRIORITY_LAW
one_reality_graph: true
lower_never_overrides_higher: true
demo_never_pretends_current: true
```

## Law

> Opal must have one reality graph. Everything else is a projection.

Every surface resolver follows this order. A lower-priority source may **never** override a higher-priority source.

```text
1. Live user-owned data
2. Shared data with permission
3. Historical data
4. Explicit demo / test fixtures
5. Empty state
```

## Hierarchy (product)

```text
Real user reality
        ↓
User-created objects
        ↓
Permissioned shared reality
        ↓
Historical reality
        ↓
Optional demo fixtures only
```

Never:

```text
Demo fixture → pretend reality
```

## Surface examples

| Surface | Correct | Wrong |
|---------|---------|-------|
| Graphs | User plans → else EMPTY | No plans → insert founder seed |
| Chats | Real conversations → else EMPTY | No chats → fake friends |
| Home | Real social activity → intentional EMPTY | No activity → artificial engagement |

## Same failure class

Fort Oak (multiple active plans) and seed-off leakage (seed + live) are the same root:

```text
Multiple possible realities → system contradiction / user confusion
```

Authority arbitration (`active_plan_for_conversation`, `compose*Hydration`, reconcile) chooses **one** current reality. History remains readable; it does not compete as current.

## Required zeros

- `SEED_OVERRIDES_LIVE_WHEN_SEED_OFF = 0`
- `EMPTY_HIDDEN_BY_SYNTHETIC_DEMO = 0`
- `FIXTURE_PRESENTED_AS_OTHER_ACCOUNT_REALITY = 0`
- `LOWER_SOURCE_BEATS_HIGHER_SOURCE = 0`

## Related

- Ownership: `STATE_OWNERSHIP_LAW.md`
- Surface agreement: `STATE_SURFACE_CONTRACT.md`
- Prefer-real composers: `homeHydration` · `graphsHydration` · `chatsHydration`
- Future: Fact → Owner · Scope · Confidence · Source · Visibility (permission boundaries — Pass 1 hold note; do not expand intelligence yet)
