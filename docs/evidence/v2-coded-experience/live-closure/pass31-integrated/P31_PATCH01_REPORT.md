# P31-PATCH-01 — Solo WHEN + Direct Dyad Audience

**HOLD. DO NOT MERGE.**

| | |
|--|--|
| Pre-change product SHA | `f43408d` |
| Pre-change CI | `31939039458` |
| **New product SHA** | **`7256f8e`** |
| **New remote CI** | **`31941929374` SUCCESS** |
| Scope | Solo WHEN mount + person→dyad only |

## Results (local)

| Check | Status |
|-------|--------|
| Solo WHEN browser | **PASS** — time sheet visible, Saturday 7:30 selected, Juniper intact |
| Maya direct browser | **PASS** — peer person, conversation ≠ any group id, Juniper · with Maya |
| Unit P0 suites | PASS (42 tests in targeted run) |
| Elixir ensure_direct | PASS (4 tests) |

## Audience ID proof (seeded)

| Field | Value |
|-------|--------|
| Maya peer user id | `00023980-5179-48aa-8e80-63b221f2b9ef` |
| Direct conversation id | `3adf3c09-7033-4693-871b-7fdb4d3d14b7` |
| Sample group id (not used) | `e687224e-e6ce-47b1-87b6-2e362730b38f` |
| widenedToGroup | **false** |

## Unimplemented (explicit)

- Full experience invite topology
- Future graph-in / visibility
- Add people UI
- Journey cancel IA
- Living Graph Home
- Calling

See `P31_PATCH01_BROWSER.json` and shots `P31P1_*`.
