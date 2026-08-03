# Social Flow 16 Closure

## Status

**SOCIAL FLOW 16 CLOSED FOR HOSTED SYNTHETIC PRODUCT VALIDATION**

## Merge

| Field | Value |
|-------|--------|
| PR | https://github.com/NiovArchitect/Opal/pull/21 |
| Merge SHA | `9d8ee89d89a9d622f063d7bdbeb45179b87a4731` |
| CI | `30779195575` SUCCESS |
| API | https://opal-api-ao0c.onrender.com |
| Web | https://opal.niovlabs.com |
| Postgres | Render `dpg-d9nu39e1egvs738q1jlg-a` (private network) |

## Proven

- Hosted health 200
- Two synthetic users: activate, invite, accept, messages, Becoming a plan, isolation, sign-out
- Cookie session + CSRF + socket ticket (ADR-0011)
- Client built with VITE_OPAL_API_URL; no authenticated seed fallback when unconfigured
- Production SMS still B001

## Residual

- Image deploy path (GitHub repo not linked to Render; Docker image via temporary registry)
- Free Render sleep on idle
- Permanent container registry should replace ttl.sh for long-term ops
