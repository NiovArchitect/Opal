# Hosted audit — Reality Closure Track A

**Date:** 2026-08-10  
**Method:** Prove, do not infer from Git alone.

## SHAs / images

| Layer | Truth |
|-------|--------|
| origin/main | `6a2cb6c` Merge #101 |
| Commits main ahead of hosted tag prefix `61100ca` | **127** |
| Last hosted API image | `ghcr.io/niovarchitect/opal-api-runtime:rp61-synthetic-61100ca` |
| Last hosted digest | `sha256:69a81bb9a64389001d216901e2e6f17e9f6ba06a3f72fef9dde7e0b1286b9b5c` |
| Evidence date for image | 2026-08-08 dress rehearsal |
| Service | `opal-api` `srv-d9nvji3m8hqs73f60tpg` |

## Live probes (2026-08-10)

| Probe | Result |
|-------|--------|
| `GET https://api.opal.niovlabs.com/health` | **200** `{"status":"ok","service":"opal_core","schema_version":"0.1.0"}` (earlier timeout — cold/flaky) |
| `https://opal.niovlabs.com` | **200** |
| `/privacy` `/terms` | **200** |
| Web bundle | `index-fwLzjnR-.js` |
| `VITE_OPAL_API_URL` baked | **yes** → `https://api.opal.niovlabs.com` (string present; `api_not_configured` also in bundle as fallback path) |

## Migrations

| Item | Status |
|------|--------|
| Last hosted boot migrate set | through `20260816000002` |
| Pending on hosted | 20260817, 20260818, 20260819 |
| Local dry-run | **PASS** (see MIGRATION_DRY_RUN.md) |
| Hosted apply path | `OpalCore.Release.migrate()` on container boot |

## Render CLI / API from this agent env

| Check | Result |
|-------|--------|
| `RENDER_API_KEY` in env | present but **Unauthorized** |
| `render whoami` | unauthorized |
| Deploy path | GitHub Actions `deploy-opal-api.yml` with repo secret `RENDER_API_KEY` |

**Founder interrupt if:** local Render key reauth needed for ad-hoc CLI; workflow secrets may still work.

## Providers

| Provider | Local env | Founder boundary |
|----------|-----------|------------------|
| Google Places | no key in agent env | billing + Places API key |
| Ticketmaster | no key in agent env | free dev key / account MFA |

RuntimeTruth remains SYNTHETIC / CREDENTIAL BLOCKED until live proof.

## Deploy command (after main merge)

```bash
gh workflow run deploy-opal-api.yml \
  --ref main \
  -f image_tag=reality-closure-main \
  -f make_public=true
```

Record: image tag, digest, main SHA, deploy id, health, then **functional** Real People regression — not health alone.

## Gap class summary (from HostedParity.capability_gaps/0)

Primarily: `server_deploy_needed`, `migration_needed`, some `merged_only`, `provider_credential_needed`, `mobile_build_needed`.

**Health 200 is not product proof.**
