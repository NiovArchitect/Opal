# Render bridge environment audit (SF18 / post PR #39)

**Service target:** Opal API (`srv-d9nvji3m8hqs73f60tpg`), public host `https://api.opal.niovlabs.com`  
**Hosted health (public):** `GET /health` → `200` `status: ok` (no secrets)

## Authentication status (this operator session)

| Step | Result |
|------|--------|
| `render whoami` | unauthorized / token expired |
| `RENDER_API_KEY` API call | HTTP 401 |
| `render login --confirm` | reported success once, then still unauthorized |
| Live env-var list | **NOT COMPLETED** |

### Founder resume (exact)

```bash
render login
# complete browser / dashboard approval
render whoami
# then list env var NAMES only for Opal API service
```

Or in Render Dashboard → Opal API → Environment: confirm names only.

## Required absence checklist (record PRESENT / ABSENT after login)

| Variable | Status |
|----------|--------|
| OPAL_FOUNDATION_INGRESS_URL | **UNVERIFIED** (auth blocked) |
| OPAL_FOUNDATION_API_KEY | **UNVERIFIED** |
| OPAL_FOUNDATION_TOKEN | **UNVERIFIED** |
| KAFKA_BROKERS | **UNVERIFIED** |
| KAFKA_BOOTSTRAP_SERVERS | **UNVERIFIED** |
| KAFKA_USERNAME | **UNVERIFIED** |
| KAFKA_PASSWORD | **UNVERIFIED** |
| KAFKA_SASL_USERNAME | **UNVERIFIED** |
| KAFKA_SASL_PASSWORD | **UNVERIFIED** |
| REDPANDA_BROKERS | **UNVERIFIED** |
| REDPANDA_URL | **UNVERIFIED** |
| FOUNDATION_INGRESS_URL | **UNVERIFIED** |

Do **not** print values in evidence. Names + present/absent only.

## Code-side posture (verified on main)

| Check | Result |
|-------|--------|
| Adapter default | disabled without `OPAL_FOUNDATION_INGRESS_URL` |
| PR #39 merge | did not set Render env |
| Repo deploy config | no foundation URL embedded |
| Kafka from Opal domain | not used |

## Hosted bridge traffic audit

| Check | Result |
|-------|--------|
| Generate Foundation test traffic | **not done** (forbidden) |
| Adapter success/retry logs on hosted | not inspected (auth blocked) |
| Conclusion | no evidence bridge became active; live log proof still pending founder auth |

## If any bridge key is PRESENT after login

1. Do not publish events.  
2. Record unexpected name (not value).  
3. Remove only if clearly unused Opal leftover.  
4. Restart only if required.  
5. Confirm no Foundation traffic.  
6. Attach evidence to this file.
