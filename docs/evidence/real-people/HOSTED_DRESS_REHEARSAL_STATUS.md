# Hosted synthetic dress rehearsal — STATUS

**Date:** 2026-08-07  
**Twilio:** OFF  
**App code changes this session:** none (ops only)

## RENDER AUTH

**pass** — `render whoami` after unsetting stale `RENDER_API_KEY`

## DEPLOY

| Field | Value |
|-------|--------|
| Service | `opal-api` `srv-d9nvji3m8hqs73f60tpg` |
| Image | `ghcr.io/niovarchitect/opal-api-runtime:rp61-synthetic-61100ca` |
| Digest | `sha256:69a81bb9a64389001d216901e2e6f17e9f6ba06a3f72fef9dde7e0b1286b9b5c` |
| Deploy (first) | `dep-d9r1utht0dsc73b6hgv0` live |
| Deploy (env apply) | `dep-d9r21f7avr4c73c1skc0` live |
| Source commit in tag | `61100ca` |
| No ttl.sh | confirmed |

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

## P0 DEPLOYMENT PARITY (hosted)

| Check | Result |
|-------|--------|
| mutual ready → Set | **PASS** |
| private alignment HTTP | **200** (was 404 on old image) |
| private not_this_time → not Set | **PASS** |
| im_in restore → Set | **PASS** |
| one affirmative → Still open | **PASS** |
| stale proposal → not Set | **PASS** |
| block peer → not Set | **PASS** |
| User C history | **403** |
| User C private | **403** |
| non-fixture phone | `number_not_enabled` |
| DELETE session → 401 after | **PASS** |
| private payload | shared_safe only; `private_reason_hidden` flag (not raw reason) |

## LEGAL

privacy/terms **200**

## MERGE

**hold** pending optional full browser WebSocket + NETWORK_INSPECTION_CHECKLIST human pass; API P0 parity proven.

## TWILIO

still off
