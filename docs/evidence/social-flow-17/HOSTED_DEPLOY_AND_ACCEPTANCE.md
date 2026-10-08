# SF17 hosted deploy and acceptance (PR #27 continuation)

**Date:** 2026-08-04  
**Overall Social Flow 17 decision:** **PARTIALLY COMPLETE** (Safari refresh still open)

## Merges

| PR | Merge commit | Notes |
|----|--------------|--------|
| #27 | `9ed5031` | Smoke filter, dynamic signals, Opal moments, docs |
| #28 | `6d78e42` | Attempted synthetic boot cleanup (later reverted path) |
| #29 | `bf25b97` | Boot cleanup force path (deploy failed) |
| #30 | `9c393bf` | Remove boot cleanup; stabilize free-tier deploys |

**Main HEAD at acceptance:** `9c393bf18494dc81661119d56dbf7552d6aaa123`

CI green on merge paths (Elixir core, Public web, Docker build, Mobile, Contracts).

## API image

| Field | Value |
|-------|--------|
| Package | `ghcr.io/niovarchitect/opal-api-runtime` |
| Tag | `sf17-main-9c393bf` |
| Digest | `sha256:cfec7e7db4395013da38e59d3de3d49f68e863e163dd27cf22ad17093f2b4e1a` |
| Source | main `9c393bf` (includes PR #27 product code; no boot cleanup) |
| Workflow | Deploy Opal API run `30865712078` (push succeeded; Render step skipped private package) |
| Registry credential | `rgc-d9ohqc7lk1mc7397tjs0` GITHUB / NiovArchitect |

## Render

| Field | Value |
|-------|--------|
| Service | `srv-d9nvji3m8hqs73f60tpg` |
| Deploy | `dep-d9oj5dht0dsc73b6h8ug` **live** |
| imagePath | `ghcr.io/niovarchitect/opal-api-runtime:sf17-main-9c393bf` |
| Digest on deploy | `sha256:cfec7e7db4395013da38e59d3de3d49f68e863e163dd27cf22ad17093f2b4e1a` |
| Health | `GET /health` → 200 |
| Env preserved | `OPAL_SYNTHETIC_FIXTURE_ONLY=true`, `OPAL_DEV_AUTH` set, no DB reset |
| No ttl.sh | confirmed |

Failed intermediate deploys (`6d78e42`, `bf25b97`) left service on prior live image until `9c393bf` succeeded.

## Public web

| Field | Value |
|-------|--------|
| URL | https://opal.niovlabs.com |
| Source commit | `9ed5031` (PR #27 UI) |
| gh-pages | `52a5fcc` |
| Asset | `assets/index-CNIrZDUQ.js` + `index-CX9VSXRf.css` |
| CSS | contains `.opal-moment` |

## Smoke cleanup

### Logical (proven live)

Product history and previews filter smoke bodies. Hosted API validation:

- Conversation preview shows human text (`I am free after 6:30.`) not SF17/RT/OFF/REG
- History for A–B conversation returned only non-smoke messages (`msg_count=2` while `latest_server_seq=13` implies filtered rows still existed physically)
- After new human messages: no smoke labels in history

### Physical (not completed from this agent)

| Attempt | Result |
|---------|--------|
| External `psql` / psycopg | SSL closed unexpectedly to Render external host |
| `render jobs create` | **400 free tier plans are not supported for jobs** |
| `render ssh` | requires interactive TTY only |
| Boot-time cleanup in entrypoint | caused `update_failed` deploys; reverted in PR #30 |

**Operator physical cleanup (interactive):**

```bash
# On a shell that can reach the synthetic service with full env:
bin/opal_core eval 'IO.inspect(OpalCore.SocialFlow.SmokeResidue.cleanup!(force: true))'
# second run must delete 0
bin/opal_core eval 'IO.inspect(OpalCore.SocialFlow.SmokeResidue.cleanup!(force: true))'
```

Requires `OPAL_SYNTHETIC_FIXTURE_ONLY=true`. Do not run outside synthetic.

## Dynamic signal acceptance (API)

| State | Result |
|-------|--------|
| Home signals | `Still open` (conversation already had plan+availability evidence) |
| After plan message | signal label in `Still open` / plan family; `not_identity_label=true` |
| After B availability | `Still open` |
| User C history | **403** |
| Sign-out | session 401 after DELETE |

## Visual / browser

Playwright Chrome channel timed out in this environment; Chromium package unsupported on host macOS version. Public HTML/CSS asset verification passed. Full visual Jordan-header DOM proof deferred to human spot-check on https://opal.niovlabs.com with fixtures.

Expected when opened in Chrome:

- Jordan name is identity only
- Journey uses `.opal-moment` / journey bar, not `.chat-header-sub` as Becoming a plan
- No SF17/RT/OFF/REG visible (logical filter)

## Safari residual

Unchanged: activation/send can work; full refresh session restore fails under cross-origin cookies. Do not close SF17 fully.

## Private guidance / location

Rules only. Not live product features.

## Tests (merge CI)

Elixir core, Public web, Docker build, Mobile shell, Contracts + Python: green on PR #27 / #30 paths.

## Residual risks

1. Physical smoke rows may still exist until interactive cleanup.  
2. Browser E2E harness flaky on this Mac (Chrome launch timeout).  
3. Safari refresh.  
4. Free-tier cannot run one-off jobs for cleanup automation.
