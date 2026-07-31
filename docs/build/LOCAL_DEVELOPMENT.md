# Local Development — Slice 1

## Prerequisites

- Docker (Postgres)
- Elixir 1.17+ / OTP 27+
- Python 3.12+ (3.14 works locally)

## One-time setup

```bash
cd /Users/genghishameha/Developer/NIOVI-Architect/Opal
make setup
```

## Run services (host processes)

Terminal A — AI worker:

```bash
cd services/opal_ai
source .venv/bin/activate
uvicorn opal_ai.main:app --port 8000
```

Terminal B — Elixir core:

```bash
cd apps/opal_core
mix phx.server
```

Health:

- `GET http://127.0.0.1:4000/health`
- `GET http://127.0.0.1:8000/health`

## Dev auth

Only when `dev_auth_enabled` is true (dev/test):

```http
X-Opal-Dev-User-Id: a1111111-1111-4111-8111-111111111111
```

Synthetic user ids: see `OpalCore.Fixtures`.

## Example flow

```bash
# Create message
curl -s -X POST http://127.0.0.1:4000/api/v1/messages \
  -H 'content-type: application/json' \
  -H 'x-opal-dev-user-id: a1111111-1111-4111-8111-111111111111' \
  -d '{
    "conversation_id":"b1111111-1111-4111-8111-111111111111",
    "client_message_id":"demo-1",
    "body":"hello opal"
  }'

# Request ai_echo (use message id + consent c1111111-...)
curl -s -X POST http://127.0.0.1:4000/api/v1/messages/<MESSAGE_ID>/ai-jobs \
  -H 'content-type: application/json' \
  -H 'x-opal-dev-user-id: a1111111-1111-4111-8111-111111111111' \
  -d '{
    "capability":"ai_echo",
    "consent_proof_id":"c1111111-1111-4111-8111-111111111111",
    "idempotency_key":"demo-idem-1",
    "trace_id":"trace-demo-0000000001"
  }'
```

## Tests

```bash
make test
```

## Reset

```bash
make reset
```
