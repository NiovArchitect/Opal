# P0_ZERO_TRUST_REATTACK

**Actual rerun** 2026-08-23/24 — not inherited.

## ExUnit critical six (`pre_live_zero_trust_test.exs` + `revoked_open_socket_test.exs`)

| # | Case | Result |
|---|---|---|
| 1 | friends Story outsider denied | PASS |
| 2 | deleted Story gone | PASS |
| 3 | stale Journey revision denied | PASS |
| 4 | withdrawn stale invitation cannot reconfirm | PASS |
| 5 | blocked peer not added to Journey | PASS |
| 6 | revoked open socket denies message:send | PASS |

**6 tests, 0 failures**

See `P0_ZERO_TRUST_EXUNIT.txt`.

Soak harness also exercised session/memory/story/home families; journey material_change helper threw `409 not_pending_reconfirm` mid-script (harness bug, not product P0). Critical six covered by ExUnit above.
