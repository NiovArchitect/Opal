# Idempotency — Phase 2

Evaluation key is provided (`idempotency_key`) or derived from conversation + message boundary hash.

Second `evaluate_and_persist` with the same key returns `:idempotent` and the same opportunity id.

Proven in `dynamic_intelligence_durable_test.exs`.
