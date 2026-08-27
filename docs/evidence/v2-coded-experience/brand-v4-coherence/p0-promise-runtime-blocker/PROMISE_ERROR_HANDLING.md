# Promise error handling

- `onError` → `data-promise-load="failed"` + visible `PROMISE_ASSET_LOAD_FAILED` (dev-visible).
- Does **not** auto-advance to Auth on load failure.
- Loading state: controlled “Loading…” until `naturalWidth/Height > 0`.
- Incomplete backdrop asset quarantined under `public/brand/opal-graph/_quarantine/`.
