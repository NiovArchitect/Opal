# SF17 Safari human validation

**Status:** PARTIAL (real Safari 18.6 on this Mac; not full matrix)

## Environment

| Item | Value |
|------|--------|
| Safari | 18.6 (18621.3.11.19.1) |
| Automation | AppleScript `do JavaScript` (enabled) |
| `safaridriver --enable` | **Blocked** — interactive macOS admin password (`Password is not valid` when non-interactive) |

## Results (real Safari app — not Chrome/WebKit substitute)

| Gate | Result | Notes |
|------|--------|--------|
| Open https://opal.niovlabs.com | PASS | Real Safari |
| Walkthrough → activation honesty | PASS | Preview / approved test numbers copy |
| Fixture `+12025550101` / `111111` advances | **PASS** | Reached LIVE shell; existing A–B conversation visible |
| Full refresh preserves session | **FAIL** | After reload returns to activation form (cross-origin cookie / ITP likely; `document.cookie` empty; memory bearer lost) |
| Open conversation + send | **PASS** | Composer present; message visible in Safari thread |
| Safari → Chrome without reload | Not fully automated this pass | Chrome peer harness flaked on activation Continue; Chrome↔Chrome realtime already proven post-GHCR |
| Chrome → Safari without reload | Not fully automated this pass | Same |
| Offline reconnect / missed once | Not completed in Safari this pass | Proven in Chrome post-GHCR |
| Sign-out | Partial | When already on activation, stays signed out; in-shell You → Sign out not re-proven after refresh failure |
| Refresh remains signed out | PASS when on activation | |

## Cookie observations

| Item | Result |
|------|--------|
| `document.cookie` in Safari product origin | empty (HttpOnly / cross-site session expected) |
| localStorage | `opal.product.csrf.v17`, `opal.firstRun.v14.completed`, `opal.product.profile.v17` |
| sessionStorage | `opal.product.device_id.v17` |
| Refresh restore | **Fails** in Safari while **passes** in Chrome — same-site API (`api.opal.niovlabs.com` or `/api` proxy) still recommended |

Do not paste cookie values.

## Residual to finish Safari gate

1. Same-site API host **or** Safari-compatible session strategy so refresh restore works.
2. Complete dual-browser realtime Safari↔Chrome and offline reconnect checklist once session sticky.
3. Optional: founder runs `sudo safaridriver --enable` with admin password if WebDriver harness is desired (not required if AppleScript JS path is accepted).
