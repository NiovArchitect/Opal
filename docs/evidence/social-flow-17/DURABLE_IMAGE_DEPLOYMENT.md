# SF17 Durable image deployment

**Date:** 2026-08-03  
**Status:** Image exists on GHCR; Render pull **not yet** proven

## Built durable artifacts

| Field | Value |
|-------|--------|
| Package (linked / private-repo constrained) | `ghcr.io/niovarchitect/opal-api` |
| Package (unlinked attempt) | `ghcr.io/niovarchitect/opal-api-runtime` |
| Tag | `sf17-final-2526ed7` |
| Digest | `sha256:7feb1ff073a85b022717a1f62fa943eaa706b962daa2faf99e4a6aadff0aa6fe` |
| Source commit | `2526ed7` (operator-closure branch; app code = main SF17) |
| Older digest (f8fabfb era) | `sha256:07df4c24a871a00b5e1011cca017bd40c5c37792a1ab9e42a7b2db59ee717784` |

## Why public pull failed

Repository `NiovArchitect/Opal` is **private**. GitHub Container packages associated with a private repository **cannot be made fully public** without making the repository public or disconnecting the package in the GitHub UI.

Anonymous pull result after visibility API attempts:

```
unauthorized
```

Render result when pointing at GHCR:

```
unable to fetch image with provided input
```

## Preferred founder path (private package)

1. GitHub → Settings → Developer settings → Personal access tokens (classic)  
2. Generate token with **only** `read:packages`  
3. Render → Account / service → Registry credentials → GHCR  
   - Registry: `ghcr.io`  
   - Username: `NiovArchitect` (or authorized account)  
   - Password: the `read:packages` token  
4. Service `opal-api` image:  
   `ghcr.io/niovarchitect/opal-api-runtime:sf17-final-2526ed7`  
   or digest form if accepted:  
   `ghcr.io/niovarchitect/opal-api-runtime@sha256:7feb1ff073a85b022717a1f62fa943eaa706b962daa2faf99e4a6aadff0aa6fe`  
5. Deploy / clear cache  
6. Confirm service imagePath no longer contains `ttl.sh`  
7. Restart once more from the same digest  

Do **not** paste the token into git, docs, or chat logs.

## Alternative founder path (public package)

1. Open GHCR package settings for `opal-api` or `opal-api-runtime`  
2. Disconnect package from private repository if required  
3. Set visibility **Public**  
4. Confirm: `docker logout ghcr.io && docker pull ghcr.io/niovarchitect/opal-api-runtime:sf17-final-2526ed7`  
5. Point Render at the tag/digest and deploy  

Image contents: compiled Elixir release only (no `.env`, no DB secrets, no tokens). Runtime secrets remain Render env vars.

## Current live service (risk)

| Field | Value |
|-------|--------|
| Still running | `ttl.sh/opal-api-sf17-rt-41fcfb0:24h` |
| Deploy ID | `dep-d9oggsnavr4c73f224ig` |
| Risk | After ttl expiry, restart/redeploy may fail |

## Env preserved (names only)

`OPAL_DEV_AUTH=false`, `OPAL_SYNTHETIC_FIXTURE_ONLY=true`, `OPAL_SYNTHETIC_EXPOSE_CODE` (preview), `DATABASE_URL`, `SECRET_KEY_BASE`, `OPAL_CORS_ORIGINS`, `PHX_*`, `POOL_SIZE`, `DATABASE_SSL`, `MIX_ENV`, `PORT`
EOF