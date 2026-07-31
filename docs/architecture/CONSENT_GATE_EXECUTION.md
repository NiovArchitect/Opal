# Consent Gate Execution (Slice 1)

## Rule

**Never trust client-supplied consent status.**  
Requests may carry only `consent_proof_id`. Elixir loads the row and validates.

## Checks (all must pass)

1. Proof exists  
2. `capability` matches job  
3. `user_id` matches requester  
4. `conversation_id` matches message conversation  
5. `status == granted`  
6. Not revoked (`status`/`revoked_at`)  
7. Not expired (`status`/`expires_at` vs now)  
8. `policy_version` in accepted list (`slice1-0.1.0`)

## Refusal path

On any failure:

- Return error to caller  
- **Do not** create a durable AI job (for missing/invalid consent at request time)  
- **Do not** call Python  
- Proven in tests via `OpalCore.AI.TestClient.call_count() == 0`

## Fixtures

| Case | Actor | Conversation | Status |
|------|-------|--------------|--------|
| Granted | Alex | Alex↔Jordan | granted |
| Denied | Jordan | Alex↔Jordan | denied |
| Revoked | Alex | Alex↔Taylor | revoked |
| Expired | Taylor | Alex↔Taylor | expired |

## Python boundary

Python receives `consent_proof_id` as an opaque UUID for correlation only.  
Python **cannot** approve, grant, or authorize consent.
