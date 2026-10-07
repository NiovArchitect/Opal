# Phase B — Dead settings controls reconciliation

**Audited:** `1fc9c44` (*Fix dead settings controls…*) vs `muse/packet-b-batch-2`  
**Verdict:** **No port required.** Every focus area is already covered in a stricter honesty form.

## Source commit

- `1fc9c449fd32c38400c5d8c86846ba0bc9b21e84` on `origin/muse/fix-dead-settings-toggles`
- Files: `YouSettingsDestination.tsx`, `styles.css`

## Lineage on working branch

Equivalent work landed via:

1. `20f53c2` — H-1 settings honesty fix (cherry-pick of 1fc9c44 spirit)
2. `63c07cd` — Coming soon → honest blockers
3. Later polish (`8bff172`, `52e3318`)

## Hunk coverage

| Focus | 1fc9c44 | Working branch | Action |
| --- | --- | --- | --- |
| Dead toggles | `comingSoon: true` + pill | `blockedReason` + expandable why | **Already covered** (superseded) |
| Save profile | `updateProfile` + Saving/error | Same path live | **Already covered** |
| Nav rows | Non-button + coming soon | Blocked / informational / live `opens` | **Already covered** |
| Delete account | Remove fake DELETE; unavailable note | `delete-unavailable` + Keep my account | **Already covered** |
| CSS pills / errors | `.you-settings-coming-soon` | Alias + `.you-settings-blocked` + why | **Already covered** (evolved) |

**PARTIAL / NEEDS_PORT:** none.

Porting `1fc9c44` verbatim would **regress** honesty by restoring vague “Coming soon” copy.
