# Same-Site API Architecture — Social Flow 17

## Decision

Host the product API at `https://api.opal.niovlabs.com` so the public web
(`https://opal.niovlabs.com`) and API share the registrable domain `niovlabs.com`.

## Why

Safari did not reliably restore the product session after refresh when the API lived
on `opal-api-ao0c.onrender.com` (cross-site cookie / CHIPS partitioning).

Same-site (different subdomains, same eTLD+1) allows Secure + HttpOnly + SameSite=Lax
host-only cookies without a broad `Domain=.niovlabs.com` attribute.

## Host map

| Role | Host |
|------|------|
| Public web | `https://opal.niovlabs.com` |
| Product API | `https://api.opal.niovlabs.com` |
| Socket | `wss://api.opal.niovlabs.com/socket/websocket` |
| Rollback API | `https://opal-api-ao0c.onrender.com` (temporary) |

## Cookie policy

| Host class | Attributes |
|------------|------------|
| `*.niovlabs.com` API | Secure, HttpOnly session, SameSite=Lax, Path=/, host-only |
| `*.onrender.com` API | Secure, HttpOnly session, SameSite=None, Partitioned (CHIPS) |

No bearer token in localStorage. CSRF remains required for unsafe cookie-authenticated
mutations. CORS remains required because web and API are still cross-origin origins.

## Non-goals

- Not production SMS
- Not contact import
- Not location intelligence
- Not private gift guidance UI
