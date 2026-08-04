# Render bridge environment audit (SF18 / post PR #39)

**Service target:** Opal API (`srv-d9nvji3m8hqs73f60tpg`), public host `https://api.opal.niovlabs.com`  
**Hosted health (public):** `GET /health` → `200` `status: ok` (no secrets)

## Authentication status (2026-08-04)

| Step | Result |
|------|--------|
| Stale `RENDER_API_KEY` in shell env | caused false 401; **unset** for CLI OAuth |
| `render login` (Brave device auth) | **success** |
| `render whoami` | authenticated (workspace set) |
| Service | `opal-api` (`srv-d9nvji3m8hqs73f60tpg`) |
| Live env-var name list | **COMPLETED** (names only; values not recorded) |

Browser for device authorization: **Brave Browser** (`open -a "Brave Browser" …`).

## Required absence checklist

| Variable | Status |
|----------|--------|
| OPAL_FOUNDATION_INGRESS_URL | **ABSENT** |
| OPAL_FOUNDATION_API_KEY | **ABSENT** |
| OPAL_FOUNDATION_TOKEN | **ABSENT** |
| FOUNDATION_INGRESS_URL | **ABSENT** |
| FOUNDATION_API_KEY | **ABSENT** |
| FOUNDATION_TOKEN | **ABSENT** |
| KAFKA_BROKERS | **ABSENT** |
| KAFKA_BOOTSTRAP_SERVERS | **ABSENT** |
| KAFKA_USERNAME | **ABSENT** |
| KAFKA_PASSWORD | **ABSENT** |
| KAFKA_SASL_USERNAME | **ABSENT** |
| KAFKA_SASL_PASSWORD | **ABSENT** |
| REDPANDA_BROKERS | **ABSENT** |
| REDPANDA_URL | **ABSENT** |
| REDPANDA_USERNAME | **ABSENT** |
| REDPANDA_PASSWORD | **ABSENT** |
| Any bridge-related key (FOUNDATION/KAFKA/REDPANDA/INGRESS) | **NONE present** |

Hosted env contains only non-bridge operational keys (count 12). Values not printed.

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
