# Phoenix private participation non-leak proof

**Gate:** PR #61 Real People — first runtime privacy gate  
**Status:** Automated test added (`private_participation_non_leak_test.exs`)  
**Date:** 2026-08-06

## Requirement

Private alignment answers must never enter:

- shared HTTP message history
- shared socket events with private keys
- peer-visible response identity (who / why / raw key)
- non-member surfaces

Shared-safe labels only, e.g. “One person needs another time.”

## What ships in this gate

1. **HTTP** `POST /api/v1/product/conversations/:id/alignment/private`  
   - Returns only `shared_safe` projection + flags  
   - Never echoes `response_key`, `user_id`, or private reason  

2. **Phoenix broadcast** `alignment:participation` on `conversation:{id}`  
   - Payload is shared-safe only  
   - Same assert as domain `PrivateParticipation.assert_shared_safe!/1`  

3. **Hardened** `assert_shared_safe!/1`  
   - Rejects forbidden keys on root and one nested level  

## Tests

`apps/opal_core/test/opal_core_web/private_participation_non_leak_test.exs`

| Case | Proves |
|------|--------|
| HTTP body shared-safe | No response_key / user_id in body |
| Peer history | Messages list + JSON encode lack private keys |
| Channel broadcast | Peer topic event is shared-safe only |
| Non-member | 403 not_a_member |
| Projection matrix | All public action keys map without leaking keys |

## Explicit non-claims

- Does not complete full two-user Set journey end-to-end (next gate)
- Does not enable Twilio
- Does not implement device capability registry
- Does not claim production SMS

## Run

```bash
cd apps/opal_core
mix test test/opal_core_web/private_participation_non_leak_test.exs
```
