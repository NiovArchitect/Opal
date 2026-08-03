# Social Flow 17 Closure Report

## Status language

**SOCIAL FLOW 17 PARTIALLY COMPLETE**

See also `FINAL_DEPLOY_AND_BROWSER.md` (2026-08-03).

## Executive decision

PR #22 merged. Matching SF17 API image is live on Render with fixture-only. Public web redeployed. Chrome activation, refresh restore, and sign-out pass. Full closure is blocked: product web has no live WebSocket client, so two-browser realtime without refresh fails; Safari not run here.

## Repository / deploy parity

| Item | Value |
|------|--------|
| Merge | `dc2e461` (PR #22) |
| Main (evidence) | `cccb09f` |
| API image | `ttl.sh/opal-api-sf17-main-b64d665:24h` |
| API deploy | `dep-d9ofrh6gekts73fh7s2g` live |
| Web asset | `index-0IQPnDd0.js` on opal.niovlabs.com |

## Passed gates

- Fixture-only server enforcement
- Chrome activation advance after 111111
- Chrome full refresh remains authenticated
- Sign-out + refresh stays signed out
- Mobile-width activation
- Message send 201 + peer history after reload
- SF14 walkthrough restoration in source; em dashes removed

## Failed / incomplete gates

- Peer receive without reload (no Phoenix socket UI wiring)
- Safari activation/refresh
- Browser User C isolation matrix
- Contact import (docs only, as expected)

## Next for full close

1. Wire product web socket ticket to channel join and live message events.
2. Re-run two-browser realtime and reconnect proof.
3. Safari pass or same-site API cutover.
4. Then use: SOCIAL FLOW 17 CLOSED FOR VALIDATED SOCIAL ACTIVATION AND EXPERIENCE COLLABORATION FOUNDATION

## Workers

Active workers: 0
