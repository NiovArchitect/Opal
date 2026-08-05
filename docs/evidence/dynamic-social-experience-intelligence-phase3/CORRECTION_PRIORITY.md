# Correction priority — Phase 3

## Required scenario

1. Outcome suggests positive reinforcement path is available.
2. User selects **Not with this group**.

## Expected

| Expectation | Status |
|-------------|--------|
| Group-specific learning suppressed | PASS |
| `suppressed: true` on learning result | PASS |
| `global_label: false` | PASS |
| No global negative relationship label | PASS (by design) |
| Other participant sets unaffected | PASS (key isolation) |
| Python cannot override correction | PASS (Elixir applies suppression) |
| Elixir applies correction before learning remains active | PASS (`suppress_learning_for_group/2`) |

## Implementation

`Outcome.respond_to_reflection` with `not_with_this_group`:

- Does not accept positive dimension rows
- Calls `suppress_learning_for_group/2` → `active=false`, `suppressed_by_correction=true`
