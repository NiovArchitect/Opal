# Hosted synthetic dress rehearsal — STATUS

**Date:** 2026-08-08 (recovery pass)  
**Twilio:** OFF  
**App code changes this session:** none (ops + evidence only; web redeploy baked API URL)

## RENDER AUTH

**pass** — `render whoami` after unsetting stale `RENDER_API_KEY`

## DEPLOY

| Field | Value |
|-------|--------|
| Service | `opal-api` `srv-d9nvji3m8hqs73f60tpg` |
| Image | `ghcr.io/niovarchitect/opal-api-runtime:rp61-synthetic-61100ca` |
| Digest | `sha256:69a81bb9a64389001d216901e2e6f17e9f6ba06a3f72fef9dde7e0b1286b9b5c` |
| Deploy (live) | `dep-d9r21f7avr4c73c1skc0` live |
| Source commit in tag | `61100ca` (PR #61 runtime; docs heads through `c53571d`) |
| No ttl.sh | confirmed |

## PUBLIC WEB (gh-pages)

| Field | Value |
|-------|--------|
| URL | `https://opal.niovlabs.com` |
| Asset | `index-fwLzjnR-.js` |
| Deploy | `d5e509a` on `gh-pages` |
| Build env | `VITE_OPAL_API_URL=https://api.opal.niovlabs.com`, socket wss same |
| Note | Prior privacy/terms deploy lacked baked API base (`api_not_configured`). Fixed this recovery pass. |

## ENV OPS (names + non-secret mode only)

- Set `OPAL_PHONE_VERIFY_MODE=synthetic_development` (was ABSENT → prod default `:disabled`)
- Preserved: `OPAL_SYNTHETIC_FIXTURE_ONLY`, `OPAL_SYNTHETIC_EXPOSE_CODE`
- Absent: Twilio keys, Foundation ingress URL, Kafka brokers

## MIGRATION

Boot migrate on deploy applied:

- `20260814000001` CreateDsiPhase2
- `20260815000001` CreateDsiPhase3
- `20260816000001` CreateInvitationContinuations
- `20260816000002` CreateAlignmentPrivateParticipations

## P0 + HOSTED GATES (recovery 2026-08-08)

| Check | Result |
|-------|--------|
| health | **PASS** `api.opal.niovlabs.com/health` ok |
| mutual ready → Set | **PASS** |
| private alignment HTTP | **200** |
| private not_this_time → not Set | **PASS** |
| im_in restore → Set (both readers) | **PASS** |
| one affirmative → Still open | **PASS** |
| stale private key → no false invalidate | **PASS** |
| residual blocked pair → no new relationship | **PASS** |
| outsider history/private/message | **403** `not_a_member` |
| non-fixture phone | `number_not_enabled` |
| DELETE session → 401 after | **PASS** |
| socket-ticket after sign-out | **401** |
| private payload | shared_safe + `private_reason_hidden` (not raw reason) |
| WebSocket A↔peer realtime (no reload) | **PASS** (Phoenix clients on live `/socket`) |
| WebSocket reply realtime | **PASS** |
| offline send + reconnect history:sync | **PASS** |
| Set after reconnect | **PASS** |
| outsider socket join | **denied** `unauthorized` |
| invite `?invite=` strip → continuation | **PASS** (Brave headless) |
| raw token absent after strip | **PASS** |
| sessionStorage only `opal_invite_continuation` | **PASS** |
| localStorage no bearer dump (cold + invite open) | **PASS** |
| cookies on verify | `opal_session` Secure+HttpOnly+SameSite=Lax; `opal_csrf` Secure+SameSite=Lax |
| privacy/terms | **200** |

## LEGAL

privacy/terms **200**

## OBSERVABILITY

**PARTIAL** — manual API/browser/network evidence only; no dashboard metric claims.

## MERGE

**ready** for PR #61 scope review after this recovery proof (CI green on `c53571d`, hosted gates above).

## TWILIO

still off

## RESIDUAL NOTES

- Fixture A↔B may still carry a prior safety block from earlier N6; A↔C used for clean Set + WS proof.
- `POST /conversations/:id/block` returned 500 once during residual probe; residual block path still proven via invite accept denial.
- Hosted QA residue should be cleaned after merge proof (sign-out, no screenshots with tokens).
