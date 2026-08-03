# Social Flow 17 final closure

**Decision:** SOCIAL FLOW 17 PARTIALLY COMPLETE  

**Date:** 2026-08-03  
**Main HEAD at decision:** `a0fbaaf` (+ operator-closure branch `2526ed7` for deploy workflow)

## What is closed product-wise (Chrome / API)

- Honest synthetic activation + fixture-only  
- Refresh session restore (Chrome)  
- Phoenix realtime without reload (Chrome)  
- Offline reconnect + unique history reconcile (Chrome)  
- Sign-out + 401 on new socket ticket (Chrome)  
- User C isolation list/history/Channel (ExUnit + browser)  
- Frozen SF14 walkthrough  

## What blocks full closure

| Gate | Status |
|------|--------|
| Safari human validation | **Blocked** (interactive safaridriver enable) |
| Durable Render image (no ttl.sh) | **Blocked** (GHCR private; no packages:read credential on Render) |
| Restart from durable digest | **Not proven** (depends on above) |

## Founder steps to close

1. **Durable image (preferred):** Render GHCR registry credential with `read:packages` PAT → deploy `ghcr.io/niovarchitect/opal-api-runtime:sf17-final-2526ed7` (digest `sha256:7feb1ff0…`) → restart once.  
2. **Safari 18.6** human checklist in `SAFARI_HUMAN_VALIDATION.md`.  
3. One Chrome smoke after durable redeploy.  
4. Then use full closure language.

## Do not claim

- Production SMS  
- Contact import  
- Mobile parity  
- Uncontrolled public launch  
- Full experience collaboration domain  

See also: `DURABLE_IMAGE_DEPLOYMENT.md`, `POSTGRES_EXPIRATION_NOTICE.md`, prior realtime/activation evidence.
EOF