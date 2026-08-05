# Light reflection — Phase 3

## Maximum user effort

One lightweight response, only when useful.

## Prompt

> Would you choose a place like this again?

## Actions

| Action | Learning effect |
|--------|-----------------|
| Yes | Accept scoped positive dimensions (higher confidence) |
| Maybe | Accept scoped dimensions (lower confidence) |
| Not with this group | Suppress group-specific learning; no global label |

## Suppression (silence wins)

| Condition | Result |
|-----------|--------|
| `low_learning_value: true` | Suppressed; quiet payload |
| Recent reflection already shown (24h) | Suppressed |
| Forced suppress | Suppressed |
| No completion yet | Error `:not_completed` |

## Not included

- Multi-question survey
- Rating scale
- Mandatory follow-up
- Push campaign
- Celebration spam
- Placeholder glow when suppressed

## Tests

- Suppressed path returns `quiet: true`
- Surfaced path exposes prompt + actions
- Answered path marks status `answered`
