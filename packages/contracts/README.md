# Opal Contracts

Language-neutral, versioned schemas shared by:

- `apps/opal_core` (Elixir) — authoritative validation and job envelopes
- `services/opal_ai` (Python) — request/response validation

**Package version:** see `VERSION` (starts at `0.1.0`)

## Format

JSON Schema Draft 2020-12 (where practical).

## Schemas

| Schema | Purpose |
|--------|---------|
| `message.schema.json` | Authoritative message shape (minimal) |
| `consent_proof.schema.json` | Consent proof metadata (server-authoritative) |
| `ai_job_request.schema.json` | Bounded AI job request from Elixir → Python |
| `ai_job_response.schema.json` | Structured AI result from Python → Elixir |
| `error_envelope.schema.json` | Stable error shape |
| `event_envelope.schema.json` | PubSub / domain event envelope |

## Rules

1. Every payload that crosses a process boundary must declare `schema_version`.
2. Elixir owns consent truth; Python never authorizes.
3. AI context is bounded (max 5 items, max 2000 total characters for Slice 1).
4. Reject undeclared properties where schemas set `additionalProperties: false`.
5. Examples under `examples/` must remain valid against their schemas.

## Local validation

```bash
# From repo root (requires Python deps for opal_ai or jsonschema)
make test-contracts
```
