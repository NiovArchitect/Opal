# Post-merge hosted proof — PR #61

**Date:** 2026-08-08  
**Main HEAD at proof:** `9f29e1e` (`feat(real-people): merge network seed foundation (#61)`)  
**Hosted API image:** still `rp61-synthetic-61100ca` (digest `sha256:69a81bb9…b9b5c`) — image pin, not auto rebuild  
**Public web:** `index-fwLzjnR-.js` with baked `VITE_OPAL_API_URL`  
**Twilio:** OFF  

## Critical journey (hosted)

| Step | Result |
|------|--------|
| health | PASS |
| activation A/B/C synthetic | PASS |
| relationship A↔C | PASS (reuse) |
| plan + one affirmative → Still open | PASS |
| mutual ready → Set | PASS |
| private not_this_time → not Set | PASS |
| private non-leak | PASS |
| im_in restore → Set both | PASS |
| outsider isolation | PASS 403 |
| WebSocket realtime no reload | PASS |
| reconnect history | PASS |
| sign-out → socket-ticket 401 | PASS |
| web API URL baked | PASS |

## Decision

Branch-only proof is **not** sufficient; this file records **merged-main** hosted critical path.

Vertical remains open for real-phone pilot (Twilio still off). Synthetic hosted path is closed for PR #61 scope.
