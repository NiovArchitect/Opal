# SF17 Realtime browser proof

**Date:** 2026-08-03  
**Status:** SOCIAL FLOW 17 PARTIALLY COMPLETE (Chrome realtime gate met; Safari not run)

## Source / deploy

| Item | Value |
|------|--------|
| PR #23 | Merged `41fcfb0` realtime client + HTTP broadcast |
| PR #24 | Merged `1d66dcf` thrash fix |
| Main HEAD | `1d66dcf` |
| API image | `ttl.sh/opal-api-sf17-rt-41fcfb0:24h` |
| API deploy | `dep-d9oggsnavr4c73f224ig` live |
| Web asset | `index-CGVj2Dv3.js` (gh-pages `cce5798`) |

## Implementation

- `phoenix@1.7.21` official client
- `apps/opal_web/src/realtime/RealtimeClient.ts`
- Socket ticket 120s, memory-only (not localStorage)
- Join `conversation:{id}`; event `message:new`; reconnect `history:sync`
- HTTP primary send; `ConversationController.create_message` broadcasts `message:new`

## Chrome proof (Playwright channel=chrome)

| Gate | Result |
|------|--------|
| Activate A/B | PASS |
| WebSocket opens to Render `/socket/websocket` | PASS |
| A sends via composer | PASS |
| **B sees without reload** | **PASS** |
| **A sees B reply without reload** | **PASS** |
| Activate C | PASS |
| C conversation list empty (no A–B leak) | PASS |
| C GET A–B messages → 403 `not_a_member` | PASS |
| C mint ticket (evaluate without CSRF) | FAIL (test harness; product client CSRF path works for A/B) |
| Sign-out automation | Incomplete (UI timeout in chat view) |
| Safari | **Not run** |
| Network disconnect reconnect | **Not re-run after thrash fix** |

## Residual

1. Safari / iPhone Safari validation  
2. Durable registry (GHCR private; Render cannot pull without credentials; ttl 24h)  
3. Formal reconnect after offline proof post thrash-fix deploy  
4. Channel join denial automated for C via Phoenix client  
5. Reduce ticket-in-query-string visibility (Phoenix handshake constraint; short TTL)

## Same-site recommendation

Prefer `api.opal.niovlabs.com` or reverse-proxied `opal.niovlabs.com/api` so session cookies are first-party and socket tickets are not the only cross-origin bootstrap.
EOF