# AI Job Lifecycle (Slice 1)

## States

```text
queued → processing → completed
                    → refused
                    → failed
```

Terminal states cannot return to `processing`.

## Flow

1. Client requests AI job with `consent_proof_id` and `idempotency_key`.
2. Elixir loads message (membership-scoped).
3. `OpalCore.Consent.validate_for_job/1` loads **authoritative** consent row.
4. On success, insert `ai_jobs` (`queued`) if idempotency key is new.
5. Enqueue `OpalCore.AI.ProcessJobWorker` via Oban.
6. Worker sets `processing`, builds bounded `AiJobRequest`, validates contract.
7. HTTP (or test client) calls Python `POST /v1/jobs`.
8. Elixir validates `AiJobResponse` contract, job_id, trace_id, idempotency_key.
9. Persist `ai_job_results` only for schema-valid terminal responses.
10. Publish PubSub event once (`ai_job.completed|refused|failed`).

## Idempotency

- Unique index on `ai_jobs.idempotency_key`.
- Duplicate request returns existing job without second Python dispatch.

## Failure classes

| Condition | Job status | error_code examples |
|-----------|------------|---------------------|
| Consent invalid | (no job) | API 403 |
| Python down | failed | service_unavailable |
| Timeout | failed | timeout |
| Schema-invalid response | failed | schema_invalid_response |
| ID mismatch | failed | job_id_mismatch / trace_id_mismatch |
| Safety refuse | refused | (reasons in safety) |

## Sequencing strategy (messages)

`conversations.next_server_seq` incremented under `SELECT … FOR UPDATE` in the same transaction as message insert. Deterministic and concurrency-safe for single-node Postgres. Not a final multi-region sequencer.
