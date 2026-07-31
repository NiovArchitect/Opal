# Python AI Boundary

**Status:** Phase 0  
**Service name:** `services/Opal_ai`

---

## Python owns

- Speech recognition (STT)  
- Voice processing / TTS (later)  
- Language identification  
- Translation enhancement  
- Embeddings and semantic retrieval  
- Structured conversation understanding  
- Relationship-context extraction (under consent)  
- Safe message drafting  
- Inference pipelines and provider adapters  
- Evaluation harnesses and safety classifiers  
- Batch learning jobs (later)

---

## Python must not own

| Forbidden | Why |
|-----------|-----|
| Message ordering | BEAM authority |
| Presence / sockets | BEAM |
| Delivery state | BEAM |
| Consent records | BEAM |
| Confirmed commitments | BEAM |
| User auth sessions | BEAM |
| Fan-out to devices | BEAM |

Python is a **worker**, not the social OS runtime.

---

## Job interface (provisional)

Request (from Elixir):

```json
{
  "job_id": "uuid",
  "idempotency_key": "string",
  "type": "stt | translate | draft | understand | commitment_candidates | safety_check",
  "schema_version": 1,
  "consent_token": "opaque-proof-from-core",
  "payload": {}
}
```

Response:

```json
{
  "job_id": "uuid",
  "status": "ok | error | refused",
  "schema_version": 1,
  "result": {},
  "uncertainty": {"level": "low|medium|high", "notes": []},
  "safety": {"allowed": true, "flags": []},
  "error": null
}
```

All payloads validated against `packages/contracts`.

---

## Uncertainty and safety in outputs

- Insights about others must include uncertainty metadata.  
- Drafting must pass safety check (inline or chained job).  
- `refused` is a first-class status (policy/safety), not only transport error.

---

## Deployment shape (local first)

- Python package with worker entrypoint  
- FastAPI or equivalent for health + sync jobs  
- Optional queue consumer if not purely push-from-Elixir  
- GPU optional; CPU-capable models for local dev  

Production scaling and providers: founder approval.

---

## Provider abstraction

```text
Opal_ai
  └── providers/
        openai_compatible/
        local_whisper/
        local_nmt/
        grok_or_xai/   # when approved
```

Never hardcode a single vendor into domain logic.

---

## Data minimization

Elixir should send:

- Minimum message window needed  
- Redacted fields when possible  
- Purpose-bound consent token  

Avoid “send entire user history every time.”
