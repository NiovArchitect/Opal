# Social Flow 17 Closure Report

## Status language

**SOCIAL FLOW 17 PARTIALLY COMPLETE**

P0 browser activation fix, walkthrough restoration, product-truth foundation, and tests are implemented on branch. Full hosted browser re-proof and Render fixture flag require deploy + operator env after merge.

## Executive decision

Treat SF16 hosted “API journey green” as insufficient. SF17 fixes the real user-visible stuck verification path by:

1. Requesting memory bearer on verify (cross-origin cookie unreliable)
2. Advancing UI immediately after successful verify
3. Fixture-honest preview (no fake personal SMS)
4. Restoring SF14 walkthrough copy (em dashes removed only)
5. Recording experience-collaboration product truth

## Repository

| Item | Value |
|------|--------|
| Branch | `build/social-flow-17-activation-recovery` |
| Base | `2190b9f` (main / SF16 closure) |

## P0 activation

See `P0_ACTIVATION_ROOT_CAUSE.md`. Hosted API verify + bearer session proven:

- challenge `+12025550101` → development_code `111111`
- verify with `include_bearer=true` → user + access_token
- `GET /api/v1/product/session` with Bearer → authenticated profile

## Walkthrough

See `WALKTHROUGH_RESTORATION.md`. Source commit `53f1540`.

## Product truth

- `docs/product/OPAL_EXPERIENCE_COLLABORATION.md`
- Linked from `OPAL_SOCIAL_FLOW_PRODUCT_TRUTH.md`
- Contact onboarding: `OPAL_CONTACT_ONBOARDING.md`

## Tests

| Suite | Result |
|-------|--------|
| `apps/opal_web` vitest | 29 passed |
| `product_activation_test.exs` | 4 passed |

## Operator actions remaining

1. Merge PR; CI green
2. Redeploy web to `gh-pages` with `VITE_OPAL_API_URL=https://opal-api-ao0c.onrender.com`
3. Set Render env `OPAL_SYNTHETIC_FIXTURE_ONLY=true` (and keep `OPAL_SYNTHETIC_EXPOSE_CODE=true` for preview)
4. Browser smoke: Chrome + Safari + mobile viewport on fixture path
5. Plan same-site API (`api.opal.niovlabs.com`) for cookie-first auth

## Residual risks

- Render free-tier cold starts
- Third-party cookies still unreliable until same-site API
- Mobile native contact picker not shipped (docs + web manual invite only)
- Full multi-persona UI smoke after deploy still required for full closure

## Workers

Active workers: 0
EOF