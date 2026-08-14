# Golden human episodes

Non-regression contracts for social intelligence. Messy, realistic, order-sensitive where needed.

## Format

Each episode MD includes cast, messages, expected next_gap, preserved dimensions, forbidden actions, and links to executable tests.

## Status

Initial set documents **already-proven** behaviors from SocialReality matrix, live Jordan proof, and privacy laws. Expand over time; never delete a green episode without SUPERSEDE.

Pass 10 adds attention contracts:

| Episode | Focus |
|---------|--------|
| EP-009 | Personal day flow (solo reality) |
| EP-010 | Attention silence (more intelligence ≠ more UI) |

## Replay

```bash
# Preferred single entrypoint
./scripts/intelligence_check.sh --with-tests

# Domain matrix + invariants + episode bridge
cd apps/opal_core && mix test test/opal_core/social_flow/social_reality_test.exs \
  test/opal_core/social_flow/social_reality_scenario_matrix_test.exs \
  test/intelligence/

# Presentation
cd apps/opal_web && npm test -- --run src/opalUi/

# Live (optional; deterministic episodes — do not rewrite harness)
node scripts/live_jordan_foundation_proof.mjs --repeat 1
```

## Execution bridge

Episode MD remains the human contract. Executable mapping lives in:

- `config/intelligence_enforcement.json` → `episode_eval_bridge`
- `apps/opal_core/test/intelligence/golden_episode_bridge_test.exs`

Bridge uses existing `SocialReality` / `PlaceGap` APIs — not a second framework.
