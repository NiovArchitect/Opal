# Social Flow 17 final closure

**Decision:** SOCIAL FLOW 17 PARTIALLY COMPLETE  

**Date:** 2026-08-03  
**Continuation:** test residue cleanup, dynamic signals, social-intelligence presence model

## Continuation (this PR)

| Gate | Status |
|------|--------|
| Smoke residue detection + product filter | PASS (code + ExUnit) |
| `mix opal.cleanup_smoke_messages` | PASS (synthetic-only / force in test) |
| Dynamic journey signals (not identity subtitles) | PASS |
| Opal moment visual class vs human bubbles | PASS |
| Experience / nuance / location product truth docs | PASS |
| Safari full matrix | Still partial (cross-origin refresh) |
| Hosted DB cleanup applied on Render | Operator: run mix task with fixture-only env |

## What closed prior operator pass

### Durable API image (was blocked — now closed)

| Gate | Status |
|------|--------|
| GHCR package exists | PASS — `ghcr.io/niovarchitect/opal-api-runtime:sf17-final-2526ed7` |
| Digest | `sha256:7feb1ff073a85b022717a1f62fa943eaa706b962daa2faf99e4a6aadff0aa6fe` |
| Render private registry credential | PASS — `rgc-d9ohqc7lk1mc7397tjs0` (`GITHUB` / NiovArchitect) |
| Service imagePath | `ghcr.io/niovarchitect/opal-api-runtime:sf17-final-2526ed7` |
| No `ttl.sh` | **PASS** |
| Deploy live | `dep-d9ohqm2d0e5s73bkj4d0` then restart `dep-d9ohr837uimc739f0jgg` |
| Health | `GET /health` → 200 |
| Postgres survives redeploy | PASS — fixture A–B history still present |

### Chrome regression after durable deploy

| Gate | Status |
|------|--------|
| Fixture activation A/B/C | PASS |
| Refresh restoration | PASS |
| Realtime A↔B without reload | PASS |
| Offline reconnect, missed once | PASS |
| Sign-out + refresh stays out | PASS (You → Sign out) |
| User C isolation (UI empty list; no message leak) | PASS |
| Walkthrough / landing honesty | PASS |

### Other

| Gate | Status |
|------|--------|
| CI on main | Green (Elixir, web, mobile, docker, contracts) |
| Active workers | 0 |

## What still blocks full closure language

| Gate | Status |
|------|--------|
| Safari full product matrix | **PARTIAL** — real Safari 18.6 activation + send PASS; **refresh session restore FAIL** (cross-origin cookie/ITP); dual-browser realtime/offline not completed this pass |
| `safaridriver --enable` | Requires interactive macOS admin password |

## Full closure string — do not use yet

Only after Safari refresh restore + remaining Safari realtime/offline gates pass:

`SOCIAL FLOW 17 CLOSED FOR VALIDATED SOCIAL ACTIVATION AND EXPERIENCE COLLABORATION FOUNDATION`

## Current decision string

**SOCIAL FLOW 17 PARTIALLY COMPLETE**

## Do not claim

- Production SMS  
- Contact import  
- Mobile parity  
- Uncontrolled public launch  
- Full experience collaboration domain  
- Safari session parity with Chrome  

See also: `DURABLE_IMAGE_DEPLOYMENT.md`, `SAFARI_HUMAN_VALIDATION.md`, `POSTGRES_EXPIRATION_NOTICE.md`.
