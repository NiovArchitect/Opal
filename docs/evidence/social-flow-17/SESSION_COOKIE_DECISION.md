# SF17 Session and cookie architecture decision

## Problem

`opal.niovlabs.com` (GitHub Pages) calls `opal-api-ao0c.onrender.com` (Render). Session cookies set by the API are **third-party** to the page origin. Modern browsers (Safari ITP, Chrome third-party cookie phase-out) often reject or partition them. Cookie-only auth after verify produces a false success path: verify HTTP 200, then product calls fail or the UI never advances.

## Decision (SF17)

| Transport | Role |
|-----------|------|
| **Memory bearer** | Primary for hosted cross-origin web. Returned when `include_bearer=true`. Stored in process memory only; never `localStorage`. |
| **HttpOnly cookie** | Still issued for same-site future hosts and native clients. |
| **CSRF** | Still returned; used when cookie credentials work. Bearer paths do not depend on CSRF cookie visibility. |

## Target architecture (residual)

Prefer first-party API to restore cookie-first security:

1. **Preferred:** `https://api.opal.niovlabs.com` (CNAME to Render) with cookie `Domain=.niovlabs.com` or host-only on API with BFF.
2. **Alternative:** reverse proxy `https://opal.niovlabs.com/api` → Phoenix so cookies are same-site.

Do not keep indefinitely patching around third-party cookie rejection.

## Hosted preview policy

- `OPAL_SYNTHETIC_FIXTURE_ONLY=true` on Render (operator action).
- Client also gates fixtures on hosted pages.
- No production SMS in this slice.
EOF