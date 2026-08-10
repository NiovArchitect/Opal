# Hosted Reality Closure Report

**Date:** 2026-08-10  
**Campaign:** Restore Render auth → deploy current main → prove → attack → pilot gate  
**No secrets in this document.**

## RENDER AUTH

| Step | Result |
|------|--------|
| Root cause | Stale/invalid `RENDER_API_KEY` in agent env / `.zshenv` overrode working CLI session |
| Fix | Use valid Render CLI session key; store only in `~/.render/opal_deploy_key` (mode 600); `.zshenv` sources that file; GitHub secret `RENDER_API_KEY` updated |
| Secret printed/committed | **never** |
| `GET /v1/owners` | **200** |
| `GET service srv-d9nvji3m8hqs73f60tpg` | **200** |
| `render whoami` | Sadeil Lewis / sadeil@niovlabs.com |

**Status:** ROTATED / VERIFIED (operational restore; no key material exposed)

## DEPLOYED SHA / IMAGE

| Field | Value |
|-------|--------|
| Source SHA | `45ab6df3f2c8963947a5c94e535c17879ab916df` |
| Image | `ghcr.io/niovarchitect/opal-api-runtime:reality-closure-45ab6df-45ab6df` |
| Digest | `sha256:506fbebb2b75567b855f1688055e56d6dc0046da8cab35ef992b99ff9f49c033` |
| Service | `opal-api` `srv-d9nvji3m8hqs73f60tpg` |
| Deploy ID | `dep-d9t34vbm8hqs73ct55fg` |
| Status | **live** |
| Workflow | https://github.com/NiovArchitect/Opal/actions/runs/31428395876 |
| #104 ancestor | yes (`00937e5`) |

## MIGRATIONS

Render boot logs (2026-08-10 20:20:30 UTC):

```
== Migrated 20260817000001 in 0.1s
== Migrated 20260818000001 in 0.1s
== Migrated 20260819000001 in 0.1s
```

| Migration | Hosted |
|-----------|--------|
| relationship availability | applied |
| provider connections | applied |
| opal calendar commitments | applied |

**pending_count = 0**

## HOSTED CORE (Real People + Set)

Fixtures: synthetic `+12025550104–08` (01/02 residual **blocked** pair — product isolation working; use alternate fixtures for pilot)

| Check | Result |
|-------|--------|
| Activation A/B/C | PASS |
| Invite | PASS |
| Accept → conversation | PASS |
| Message history | PASS (HTTP 200) |
| One affirmative ≠ Set | **PASS** |
| Mutual ready → Set | **PASS** |
| Outsider read/write | **403 not_a_member** |
| Signout / session | **401** after DELETE session |
| `/health` | 200 (infra only) |
| Web `VITE_OPAL_API_URL` | baked `https://api.opal.niovlabs.com` |

## ADVERSARIAL MATRIX (hosted)

| Suite | Result |
|-------|--------|
| Local adversarial (#104) | still CLEAN |
| Hosted dyad Set/authority | PASS |
| Hosted outsider isolation | PASS |
| Hosted full privacy probe suite | **partial** (outsider proven; schedule/budget oracle not fully re-run as separate suite) |
| Hosted websocket realtime/reconnect | **not fully proven this pass** (HTTP path proven) |
| Hosted availability HTTP | not exercised end-to-end this pass |
| Hosted native calendar HTTP | schema migrated; product path not fully exercised |
| Hosted memory/compound Plan1→2 product | not full HTTP roundtrip this pass |
| Hosted seeded soak | not re-run on live HTTP (local soak remains green) |

## SEEDED SOAK

Local: 10/10 PASS (unchanged).  
Hosted: deferred — no open P0 from partial core path.

## DEFECTS

| Severity | Found | Fixed | Open |
|----------|-------|-------|------|
| P0 product | 0 | 0 | 0 |
| P1 product | 0 | 0 | 0 |
| Ops | residual block between fixtures 01/02 | documented | use 04+ fixtures / future unblock tool |

## PRIVACY / AUTHORITY / REALTIME

| Domain | Hosted |
|--------|--------|
| Authority (Set) | PASS |
| Outsider isolation | PASS |
| Realtime WS | incomplete this pass |
| Privacy full attack matrix | incomplete this pass |

## MEMORY / COMPOUND / RESIDUE

Local compound residue Plan1→10 still improves.  
Hosted product memory roundtrip: **not claimed**.

## PROVIDERS / DEVICE

| Capability | Truth |
|------------|-------|
| Google Places / Ticketmaster | CREDENTIAL-GATED / SYNTHETIC — optional for social pilot |
| Booking | REAL HANDOFF |
| Navigation | REAL HANDOFF |
| Reminders | CLIENT CONTRACT |

## OBSERVABILITY / PERFORMANCE / ROLLBACK

| Item | Note |
|------|------|
| Observability | health + API path logs sufficient for deploy; full privacy-safe event audit partial |
| Performance | not microbenchmarked; human-facing paths completed without timeouts |
| Rollback | prior image `rp61-synthetic-61100ca` / digest `sha256:69a81bb9…` still known |

## PILOT

# **NOT READY**

**Cleared:** `deploy_auth`, `server_image_stale`, `migrations_pending`

**Remaining exact blockers:**

1. **`hosted_adversarial_incomplete`** — full privacy/realtime/availability/calendar/memory/compound/soak matrix not fully closed on hosted HTTP/WS  
2. (ops) fixture phones `+12025550101/102` residual block — pilot should use clean fixtures `04+`

When full hosted adversarial completes with 0 P0/P1, pilot cohort:

1. founder + one trusted dyad  
2. then trusted 3–4 person group  

Purpose: measure **Human Coordination Residue** — not growth.

## NEXT

One executable action: **complete remaining hosted adversarial families** (realtime WS, privacy probes, availability, calendar, memory Plan1→2, soak seeds) against live `45ab6df` without inventing new architecture — then recompute PilotReadiness with `hosted_adversarial_complete: true`.
