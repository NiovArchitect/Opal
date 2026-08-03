# SF17 Final closure pass evidence

**Date:** 2026-08-03  
**Decision:** SOCIAL FLOW 17 PARTIALLY COMPLETE

## Merged source

| Item | Value |
|------|--------|
| PR #25 | Merged `f8fabfb` |
| Main HEAD (merge) | `f8fabfb` |
| Evidence commit | (this file) |
| Web asset | `index-BSS-J9hG.js` |

## Accepted Chrome realtime baseline

Retained from prior proof (PR #23/#24): live message exchange without reload.

## Reconnect (Chrome, latest thrash-fixed client)

| Gate | Result |
|------|--------|
| Tickets before open chat | A=1 B=1 (bounded) |
| WebSockets before offline | A=1 B=1 |
| Offline UI | PASS |
| M1/M2 after restore (no page reload) | PASS, count=1 each |
| A receives M3 after B reconnect | PASS |
| Ticket thrash after offline | **none** (still A=1 B=1) |

## Sign-out + revocation (Chrome)

| Gate | Result |
|------|--------|
| `data-testid=sign-out` reachable from chat via Back → You | PASS |
| UI returns to activation | PASS |
| `POST /socket-ticket` after sign-out | **401 `auth_required`** |
| Refresh stays signed out | PASS |

## User C Channel denial

ExUnit `user C ticket works but channel join to A-B conversation is denied`:

- History 403 `not_a_member`
- Socket ticket mint for C succeeds
- `subscribe_and_join conversation:{ab}` → `{:error, %{reason: "unauthorized"}}`
- After A sign-out, ticket mint for A fails 401

## Message reconciliation

Vitest: dedupe by id/client_message_id, order by server_seq, history after live, normalize envelope. **38** web tests pass.

## Safari

| Item | Status |
|------|--------|
| Real Safari automation | **Blocked** (`safaridriver --enable` requires interactive password) |
| Playwright WebKit | Not installed / unsupported on this host |
| Closure impact | **Hard gate fails** — cannot close SF17 |

## Durable image

| Item | Value |
|------|--------|
| Built & pushed GHCR tag | `ghcr.io/niovarchitect/opal-api:sf17-final-f8fabfb` |
| Digest | `sha256:07df4c24a871a00b5e1011cca017bd40c5c37792a1ab9e42a7b2db59ee717784` |
| Workflow visibility step | Reported success |
| Anonymous/authenticated pull from this agent | **403 / unable to fetch** |
| Render deploy from GHCR | **Failed:** `unable to fetch image with provided input` |
| Live service still on | `ttl.sh/opal-api-sf17-rt-41fcfb0:24h` (`dep-d9oggsnavr4c73f224ig`) |

**Founder action required for durable image:**

1. Open GHCR package `opal-api` → set **Public**, **or**
2. Create a packages:read PAT and add Render **private registry credential** for `ghcr.io`, then set image to the digest above and redeploy.

## Database expiration

| DB | Expires |
|----|---------|
| `opal-postgres` (`dpg-d9nu39e1egvs738q1jlg-a`) | **2026-09-02T00:32:37Z** |

Plan upgrade or export before that date.

## Same-site recommendation

Still preferred: `api.opal.niovlabs.com` or `opal.niovlabs.com/api` for first-party cookies; Safari validation likely depends on this.

## Workers

Active workers: 0
EOF