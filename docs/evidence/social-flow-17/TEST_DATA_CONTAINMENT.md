# SF17 test data containment

**Date:** 2026-08-03  
**Decision context:** SOCIAL FLOW 17 PARTIALLY COMPLETE (continuation)

## Root cause of founder-visible smoke messages

Browser automation and operator smoke scripts used **hosted synthetic preview fixtures** (`+12025550101` / `+12025550102`) against the live Render Postgres.

Those accounts are the same identities used for product preview. Messages such as:

- `SF17 live ping …`
- `RT live …` / `RT reply …`
- `OFF1` / `OFF2` / `OFF3`
- `REG …`
- `SF17-GHCR-…`

were written into the real A–B conversation and therefore appeared in the ordinary product UI.

They are engineering harness labels (timestamp uniqueness), not social content.

## Classification

| Source | Contaminates preview? | Notes |
|--------|----------------------|--------|
| Hosted Playwright / Chrome automation | Yes | Used fixture phones + visible timestamp bodies |
| Safari AppleScript smoke | Yes | Same fixture conversation |
| ExUnit product_activation_test | No | Isolated test DB |
| Demo `data.ts` threads | No | Static marketing shell only |

## Corrections shipped

1. **`OpalCore.SocialFlow.SmokeResidue`** — detects known smoke body patterns.
2. **Product read path** — `Messages.list_messages/3` rejects smoke bodies; conversation previews skip smoke latest.
3. **Signals** — smoke bodies never count as evidence for journey signals.
4. **`mix opal.cleanup_smoke_messages`** — environment-restricted delete of matching rows (`OPAL_SYNTHETIC_FIXTURE_ONLY=true`). Idempotent. Dry-run supported.
5. **UI** — journey signals no longer written into `contextLine` under a person’s name.

## Fixture classes (going forward)

| Class | Use |
|-------|-----|
| Preview fixtures | Human founder/demo paths only; human-readable messages |
| Automated test fixtures | ExUnit / CI DB only |
| Manual QA fixtures | Labeled QA threads if needed |
| Ordinary user accounts | Never write harness text |

## Future harness rules

- Prefer isolated conversation IDs and `client_message_id` / internal `test_run_id` for uniqueness.
- Do not encode harness purpose into consumer-visible bodies.
- After hosted smoke: run cleanup or use non-preview accounts.
- Collect evidence, then clean or archive.

## Hosted cleanup (operator)

With synthetic fixture mode on the API host:

```bash
# dry-run
mix opal.cleanup_smoke_messages --dry-run
# apply
mix opal.cleanup_smoke_messages
```

Do not expose cleanup as a product user action. Do not full-reset the database.
