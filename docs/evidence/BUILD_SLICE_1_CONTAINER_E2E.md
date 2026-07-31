# Build Slice 1 — Multi-Container HTTP E2E

**Date:** 2026-07-31  
**Command:** `SKIP_COMPOSE_REBUILD=1 bash tests/journeys/slice_1_container_roundtrip.sh`  
**Full log:** `docs/evidence/BUILD_SLICE_1_CONTAINER_E2E_RUN.log` (and latest journey stdout)

## Stack

| Service | Image / role | Network | Ports |
|---------|--------------|---------|-------|
| postgres | postgres:16-alpine | `local_opal_net` | 5432 |
| opal_ai | live FastAPI worker | `local_opal_net` | 8000 |
| opal_core | Phoenix + Oban + HTTPClient | `local_opal_net` | 4000 |

## Proof that TestClient is not used

```json
{"ai_client":"OpalCore.AI.HTTPClient","ai_service_url":"http://opal_ai:8000","dev_auth_enabled":true,"event_probe_enabled":true}
```

## Happy path (live network)

| Step | Result |
|------|--------|
| Message accept | `server_seq=1`, body `container e2e hello` |
| AI job | queued → completed via Oban |
| Python call count | 0 → **1** |
| Echo output | `container e2e hello` |
| PubSub / event probe | `ai_job.completed` recorded |
| Message authority | subsequent message `server_seq=2` |

Example IDs from green run:

- message_id: `199dde5d-20e8-40ea-bbdd-6bb095631937`
- job_id: `5374eb10-f58b-40bf-bc29-ef984cbf3114`
- trace_id: `trace-e2e-1785499087`

## Consent isolation

- Denied consent for Jordan → HTTP **403**
- Python request_count **unchanged** (zero calls)

## Idempotency

- Duplicate AI `idempotency_key` → same job id, `origin=idempotent`, **exactly 1** Python call

## Safety refusal

- Body containing `OPAL_TEST_FORCE_REFUSAL` → job status **refused**

## Python unavailable

- `docker compose stop opal_ai` → job status **failed**
- Message body remains authoritative

## Gate 11 status

**PASS** — true multi-container HTTP journey proven without faking completion in the database.
