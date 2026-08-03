# SF17 Final deploy and browser validation

**Date:** 2026-08-03  
**Decision:** SOCIAL FLOW 17 PARTIALLY COMPLETE

## Merge

| Item | Value |
|------|--------|
| PR | #22 |
| PR head | `747523f` |
| Merge commit | `dc2e461` |
| Main after deploy workflow | `b64d665` |
| CI | Green on PR #22 |

## API deploy

| Item | Value |
|------|--------|
| Service | `srv-d9nvji3m8hqs73f60tpg` (opal-api) |
| URL | https://opal-api-ao0c.onrender.com |
| Image | `ttl.sh/opal-api-sf17-main-b64d665:24h` |
| Deploy ID | `dep-d9ofrh6gekts73fh7s2g` |
| Status | **live** |
| Source | main build of `Dockerfile.prod` (SF17 code) |
| `OPAL_SYNTHETIC_FIXTURE_ONLY` | `true` |
| `OPAL_DEV_AUTH` | `false` |
| `OPAL_SYNTHETIC_EXPOSE_CODE` | `true` (preview) |
| Health | `GET /health` → 200 |

### Fixture-only (live API)

| Number | Result |
|--------|--------|
| `+12025550101` | challenge 201, code `111111` |
| `+15551234567` | `number_not_enabled`, no code |
| `+14155552671` | `number_not_enabled`, no code |

Cookies on verify include `SameSite=None; Secure; HttpOnly; Partitioned` for `opal_session`.

## Public web deploy

| Item | Value |
|------|--------|
| URL | https://opal.niovlabs.com |
| Asset | `/assets/index-0IQPnDd0.js` |
| Build env | `VITE_OPAL_API_URL=https://opal-api-ao0c.onrender.com` |
| CSP | includes Render API host |

## Chrome browser proof (Playwright channel=chrome)

| Gate | Result |
|------|--------|
| Walkthrough skip | PASS |
| Preview honesty copy | PASS |
| Reject non-fixture | PASS |
| Code step | PASS |
| Valid code advances to shell | **PASS** |
| Full page refresh stays authenticated | **PASS** |
| Sign out → unauth UI | PASS |
| Refresh after sign-out stays out | PASS |
| Mobile-width activation | PASS |
| Composer send message (201) | PASS |
| Peer sees message **without** reload | **FAIL** |
| Peer sees message **after** reload | PASS (history) |
| Safari | **Not run** in this agent environment |
| Two-browser WebSocket realtime | **FAIL** (no Phoenix socket client wired in `opal_web`) |
| User C isolation (browser) | Not fully exercised in UI |
| Reconnect without refresh | Not applicable without socket client |

## Hard residual for full closure

1. **WebSocket client not connected in product web shell.** `fetchSocketTicket` exists; no channel join / live push path in React. Messages only appear after reload/list refetch.
2. **Safari** not validated here.
3. **Same-site API** still preferred long-term (`api.opal.niovlabs.com` or `/api` proxy) so cookie auth does not depend on CHIPS/third-party behavior.
4. Contact import remains **documented only**.

## What is proven

Ordinary Chrome user can: understand preview, activate fixture, advance into product, **refresh without losing account**, send a message, load history after reload, sign out safely. Server fixture-only is active. Frontend and backend SF17 sources are deployed in matching roles.
EOF