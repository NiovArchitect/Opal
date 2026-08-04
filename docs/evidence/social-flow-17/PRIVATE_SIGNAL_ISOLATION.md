# Private signal isolation

## Rules

- Shared journey signals (`privacy_class=shared_progress`) only for conversation members.
- Non-members receive `{:error, :not_a_member}` / HTTP 403 on history and signals.
- Private guidance (gift clues, surprise context) is **not** implemented as shared signals and must never ride `message:new` or conversation signal arrays.

## Proof

- `ProductSignals.signals_for_conversation/2` membership gate.
- `product_activation_test.exs` User C denied message history (403 `not_a_member`).
- Browser: User C sees empty conversation list for A–B threads (prior SF17).

## Residual

Full private-guidance surface (per-user only UI) is specified in product docs; shared path remains free of private nuance payloads.
