# SF17 dynamic signal proof

## Defect

`Becoming a plan` appeared under Jordan’s name as if it were an identity subtitle.

## Cause

Product web mapped active signal labels into `contextLine` (header subtitle under the peer name):

```ts
contextLine: data.signals[0]?.label
```

## Fix

1. **Elixir lifecycle** (`ProductSignals`): quiet → Becoming a plan → Still open → Ready / Will know later → Handled.
2. **Signals carry** `not_identity_label`, `privacy_class=shared_progress`, lifecycle stage.
3. **Web**: `contextLine` is peer names only; journey state uses `.opal-moment` (list chip, conversation journey bar, inline moments).
4. **Plans tab**: section titled “In motion”, not a permanent “Becoming a plan” identity header.

## Automated proof

- `product_signals_test.exs` — quiet, forming, still open, ready, handled, smoke ignored, non-member denied.
- `product_activation_test.exs` — signals after plan-forming message; isolation for User C.
- Web: `product.test.ts`, `smoke.social.test.ts` — signals optional; Jordan has no identity contextLine.

## Manual visual expectation

| Surface | Before | After |
|---------|--------|-------|
| Chat list under name | “Becoming a plan” felt like profile status | Peer names only; optional journey chip below preview |
| Thread header | Signal as name subtitle | Name + optional peer context; separate journey bar |
| Inline | Signal chip next to bubble | Distinct Opal moment capsule (not a third person) |
