# Persistence — Phase 2

Elixir-owned tables under migration `20260814000001_create_dsi_phase2`.

## Principles

- No raw model prompts stored
- No private budget values in shared fields (`private_feature_refs` only)
- No real locations or contacts
- Reference conversation and user IDs only
- Uniqueness on `(conversation_id, evaluation_key)` for contexts and opportunities
- Indexes for conversation status, expiry, cooldown, correction lookup

## Active retrieval

`Durable.get_for_user/2` loads the latest non-expired opportunity in status `eligible|surfaced|confirmed`.
