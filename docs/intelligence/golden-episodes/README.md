# Golden human episodes

Non-regression contracts for social intelligence. Messy, realistic, order-sensitive where needed.

## Format

Each episode MD includes cast, messages, expected next_gap, preserved dimensions, forbidden actions, and links to executable tests.

## Status

Initial set documents **already-proven** behaviors from SocialReality matrix, live Jordan proof, and privacy laws. Expand over time; never delete a green episode without SUPERSEDE.

## Replay

```bash
# Domain matrix + invariants
cd apps/opal_core && mix test test/opal_core/social_flow/social_reality_test.exs \
  test/opal_core/social_flow/social_reality_scenario_matrix_test.exs \
  test/intelligence/

# Presentation
cd apps/opal_web && npm test -- --run src/opalUi/

# Live (optional; deterministic episodes)
node scripts/live_jordan_foundation_proof.mjs --repeat 1
```
