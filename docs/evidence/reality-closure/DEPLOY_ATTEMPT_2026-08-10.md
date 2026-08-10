# Deploy attempt — Reality Closure main

**Date:** 2026-08-10  
**Workflow:** Deploy Opal API (Render image)  
**Run:** https://github.com/NiovArchitect/Opal/actions/runs/31384028464  
**Ref:** `main` @ `b29540b` (PR #102 squash merge)

## What succeeded (no founder)

| Step | Result |
|------|--------|
| Build production image | PASS |
| Push GHCR durable tag | PASS |
| Image | `ghcr.io/niovarchitect/opal-api-runtime:reality-closure-main-b29540b` |
| Digest | `sha256:7b5ba164b61b26b21ee2dbbadd179f6fb85c12c59efd0b1cc6e18c4328f10fe6` |
| Source SHA | `b29540b1b094da94ea776529c7e30669553c2412` |
| GHCR public visibility step | ran |
| Anonymous pull verify | `public_pull=false` (continue-on-error) |

## What failed (founder)

| Step | Result |
|------|--------|
| PATCH Render service imagePath | **Unauthorized** |
| POST Render deploy | not reached |

```json
{"message":"Unauthorized"}
```

Repo secret `RENDER_API_KEY` is present in Actions but rejected by Render API  
(same as local CLI/env key Unauthorized).

## Exact founder action

1. Render Dashboard → Account Settings → API Keys  
2. Create a new API key with deploy/service update permission  
3. Update GitHub repo secret `RENDER_API_KEY`  
4. Optionally update local `RENDER_API_KEY` for CLI  
5. Re-run:

```bash
gh workflow run "Deploy Opal API (Render image)" \
  --ref main \
  -f image_tag=reality-closure-main \
  -f make_public=true
```

Or point Render service `srv-d9nvji3m8hqs73f60tpg` at:

```text
ghcr.io/niovarchitect/opal-api-runtime:reality-closure-main-b29540b
```

with registry credential `rgc-d9ohqc7lk1mc7397tjs0`, then deploy.

## After successful deploy

1. Confirm health  
2. Confirm boot migrate applied 20260817–19  
3. Run Real People functional regression (not health alone)  
4. Update HostedParity last hosted image constants  
5. Re-evaluate PilotReadiness  

## Pilot recommendation still

**NOT READY** — hosted still on `rp61-synthetic-61100ca` until Render accepts the new image.

Image for next deploy is **already built and durable on GHCR**.
