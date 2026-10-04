# Phase 2A — Push infrastructure (synthetic-ready)

Honest synthetic mode by default. APNs/FCM adapters present; absent credentials
fall back to Synthetic with a warn log. Never claims delivery without keys.

## Verify

- `mix test test/opal_core/push/ test/opal_core_web/device_token_api_test.exs` → 22/22
- Attention Center regression → 31/31
- Register token → ingest urgent → job enqueued → synthetic log (user_id + title)
- Ingest silent → no job

## Evidence

- `VERIFY.json` — check matrix
- `mix_test_push.log` — suite output
- `verify_urgent_synthetic.log` — VERIFY flow
