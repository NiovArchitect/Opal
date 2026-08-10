# Hosted Adversarial Closure — BLOCKED (deploy auth)

**Date:** 2026-08-10  
**Campaign:** Hosted Adversarial Closure — **NO NEW PRODUCT WORK**  
**Local adversarial gate:** CLEAN (PR #104 @ `00937e5`)  
**Pilot:** **NOT READY**

## Law

Local clean was necessary. It is **not** sufficient.  
Hosted proof is **not** faked while Render auth fails.

## 0. Deploy auth recovery (proven fail)

| Check | Result |
|-------|--------|
| `RENDER_API_KEY` present in agent env | yes |
| `GET https://api.render.com/v1/owners?limit=1` | **HTTP 401** `{"message":"Unauthorized"}` |
| `render whoami` | unauthorized |
| GitHub Actions secret `RENDER_API_KEY` | **same Unauthorized** on PATCH service |
| Key value printed | **never** |
| Unrelated credentials rotated | **no** |

Deployment path **stops here** until founder refreshes Render API key into:

1. Local env (optional for CLI)
2. GitHub Actions secret `RENDER_API_KEY` (required for workflow)

## 1. Source SHA (proven)

| Field | Value |
|-------|--------|
| `origin/main` | `00937e5920c250680c3676a12ecf20fc4d67f40e` |
| PR #104 on main | **yes** (adversarial human reality) |
| PR #102/#103 on main | yes (reality closure + deploy evidence) |

## 2–4. Image built from main; Render not updated

Workflow: https://github.com/NiovArchitect/Opal/actions/runs/31426276589  

| Step | Result |
|------|--------|
| Build production image from main | **PASS** |
| Push GHCR durable | **PASS** |
| Image | `ghcr.io/niovarchitect/opal-api-runtime:hosted-adversarial-closure-00937e5` |
| Digest | `sha256:804c936430a7628c49139c119c97e6345780b248b3f991d726284cd29cfc199f` |
| Source SHA | `00937e5…` |
| Set package visibility / verify pull | ran (`public_pull=false` on anonymous check) |
| PATCH Render imagePath | **FAIL** Unauthorized |
| Deploy ID | **none** (not requested after failed PATCH) |

**Live service still prior image** (last known: `rp61-synthetic-61100ca` era) — **not** current main.

## 5–6. Boot / migrations / health

| Check | Hosted current |
|-------|----------------|
| Boot migrate of 20260817–19 | **NOT PROVEN** (new image never activated) |
| `/health` | **200** ok (stale image infrastructure only) |
| Product proof | **NOT RUN** on current main |

## 7. RuntimeTruth (honest)

| Class | Hosted reality |
|-------|----------------|
| MERGED_ONLY | #81–#104 capabilities vs live image gap |
| HOSTED | Real People core on **stale** image only |
| REAL LIVE providers | Places/Ticketmaster still credential-gated |
| REAL HANDOFF | booking/nav code path; needs current deploy for product-level re-proof |
| CLIENT CONTRACT | reminders/device |
| SYNTHETIC | world providers default |

Do **not** inflate classes from GHCR push alone.

## Phases A–C (hosted adversarial)

| Phase | Status |
|-------|--------|
| A Core hosted regression | **BLOCKED** — not on current SHA |
| B Hosted adversarial human reality | **BLOCKED** |
| C Seeded hosted soak | **BLOCKED** |

Local matrices remain green; they do not waive hosted.

## Defects (hosted campaign)

| Severity | Found | Fixed | Open |
|----------|-------|-------|------|
| P0 product | 0 | 0 | 0 |
| P1 product | 0 | 0 | 0 |
| Infrastructure | 1 | 0 | **Render API Unauthorized** |

## Pilot gate

# **NOT READY — EXACT BLOCKERS**

1. **deploy_auth** — Render API key Unauthorized (local + GH Actions)  
2. **server_image_stale** — live API not on `00937e5`  
3. **migrations_pending** until current image boots  
4. **hosted_adversarial_not_run** — matrix not executed against live product  

Optional non-blockers for later social pilot: Places/Ticketmaster credentials.

## Founder interrupt (only)

Refresh Render API key → set GitHub secret `RENDER_API_KEY` (and local if used).

Then Grok continues autonomously:

```text
DEPLOY current main image already built (or rebuild)
→ boot migrate proof
→ Real People + Set P0 + privacy
→ hosted adversarial matrix + soak
→ residue classification
→ PilotReadiness
```

**No design questions. No new modules while waiting.**

## Alternate path (if preferred)

In Render dashboard for `opal-api` `srv-d9nvji3m8hqs73f60tpg`:

set image to:

`ghcr.io/niovarchitect/opal-api-runtime:hosted-adversarial-closure-00937e5`

digest `sha256:804c936430a7628c49139c119c97e6345780b248b3f991d726284cd29cfc199f`

registry credential `rgc-d9ohqc7lk1mc7397tjs0` (existing), deploy, then notify Grok to run hosted matrix.

## Rollback

Prior image tag remains deployable once auth works: `rp61-synthetic-61100ca` (or last known good).

## NEXT (one executable action)

**Founder:** restore Render API authorization (dashboard key → GH secret).  
**Grok (immediately after):** hosted adversarial closure end-to-end — no product invention.
