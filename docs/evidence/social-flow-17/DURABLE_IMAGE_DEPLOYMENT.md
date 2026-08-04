# SF17 Durable image deployment

**Date:** 2026-08-03  
**Status:** **PROVEN** — Render pulls private GHCR image; service no longer references `ttl.sh`

## Built durable artifacts

| Field | Value |
|-------|--------|
| Package | `ghcr.io/niovarchitect/opal-api-runtime` |
| Tag | `sf17-final-2526ed7` |
| Digest | `sha256:7feb1ff073a85b022717a1f62fa943eaa706b962daa2faf99e4a6aadff0aa6fe` |
| Source commit | `2526ed7` (operator-closure; app code = main SF17) |

## Operator path completed (private package)

1. `gh auth refresh -s read:packages` completed for `NiovArchitect` (device code flow).
2. Render registry credential created:
   - ID: `rgc-d9ohqc7lk1mc7397tjs0`
   - Name: `ghcr-t-GITHUB-authToken`
   - Registry type: `GITHUB` (Render API enum; not the string `ghcr.io`)
   - Username: `NiovArchitect`
   - Auth: packages-read token (value **not** stored in repo/docs)
3. Service `srv-d9nvji3m8hqs73f60tpg` patched:
   ```json
   {"image":{"imagePath":"ghcr.io/niovarchitect/opal-api-runtime:sf17-final-2526ed7","registryCredentialId":"rgc-d9ohqc7lk1mc7397tjs0"}}
   ```
4. Deploy `dep-d9ohqm2d0e5s73bkj4d0` → **live** with digest `sha256:7feb1ff0…`
5. Second restart `dep-d9ohr837uimc739f0jgg` → **live** from same digest
6. Health: `GET /health` → `200` `{"service":"opal_core","status":"ok"}`

## Current live service

| Field | Value |
|-------|--------|
| imagePath | `ghcr.io/niovarchitect/opal-api-runtime:sf17-final-2526ed7` |
| Contains `ttl.sh` | **No** |
| Live deploy | `dep-d9ohr837uimc739f0jgg` |
| Registry credential | `ghcr-t-GITHUB-authToken` |
| Postgres survival | Fixture conversations/messages still present after redeploys (e.g. prior SF17 markers visible in A–B chat) |

## Env preserved (names only)

`OPAL_DEV_AUTH=false`, `OPAL_SYNTHETIC_FIXTURE_ONLY=true`, `OPAL_SYNTHETIC_EXPOSE_CODE` (preview), `DATABASE_URL`, `SECRET_KEY_BASE`, `OPAL_CORS_ORIGINS`, `PHX_*`, `POOL_SIZE`, `DATABASE_SSL`, `MIX_ENV`, `PORT`

## Notes

- Public GHCR pull remains blocked for private-repo-linked packages without credentials; private pull via Render credential is the validated path.
- Do **not** paste tokens into git, docs, or chat logs.
