# Build Slice 1 — Test Matrix

## Commands

```bash
# Python + contracts
cd services/opal_ai && source .venv/bin/activate && pytest -q

# Elixir
cd apps/opal_core && mix test
```

## Results (local + remote + container, 2026-07-31)

| Suite | Count | Status |
|-------|------:|--------|
| Python (`services/opal_ai`) | 8 | PASS |
| Elixir (`apps/opal_core`) | 38 | PASS |
| Container E2E journey | multi-assert script | PASS |
| Remote CI jobs | 3/3 green | PASS |
| **Unit total** | **46** | **PASS** |

## Coverage by category

| Category | Evidence |
|----------|----------|
| Contracts | `contracts_test.exs`, Python `test_examples_validate_against_schemas` |
| Consent grants/refuses | `consent_ai_test.exs` (missing/denied/revoked/expired/wrong user/conversation/capability) |
| Idempotency message | `messages_test.exs` |
| Idempotency AI | `consent_ai_test.exs` duplicate key |
| Concurrent message | `messages_test.exs` race |
| Python failure modes | unavailable, timeout, malformed, wrong ids, bad version |
| Isolation | job access, bounded context |
| PubSub | completion once |
| Terminal immutability | process_job after completed |
| API | health, round trip, cross-user 404 |
| Safety refuse marker | `OPAL_TEST_FORCE_REFUSAL` |

## Skips / blocks

| Item | Status |
|------|--------|
| Full docker multi-service integration | NOT_RUN in unit suite (compose available) |
| Paid providers | N/A |
| Real SMS | Out of scope |
