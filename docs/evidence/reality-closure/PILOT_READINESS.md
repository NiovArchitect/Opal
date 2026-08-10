# Reality Closure — Pilot Readiness

**Date:** 2026-08-10  
**Main SHA (audit time):** `6a2cb6c` (post #100/#101)  
**Campaign:** Reality Closure — Hosted Parity + Live Providers + Real Dogfood  
**Machine report:** `OpalCore.SocialFlow.Execution.RealityClosure.report/0`  
**Recommendation API:** `OpalCore.SocialFlow.Execution.PilotReadiness.evaluate_current/0`

---

## Recommendation

# **NOT READY — exact blockers below**

No vague percentage.

Social pilot can later proceed **without** live Google Places/Ticketmaster  
**if** hosted image + migrations + core Real People path are current and green.  
RuntimeTruth must stay explicit about synthetic providers.

---

## Track A — Hosted parity (proven gap)

| Field | Truth |
|-------|--------|
| origin/main | `6a2cb6c` (+ ~127 commits since last hosted image tag) |
| Last hosted API image | `ghcr.io/niovarchitect/opal-api-runtime:rp61-synthetic-61100ca` |
| Last hosted source prefix | `61100ca` (Real People #61 era) |
| Evidence | `docs/evidence/real-people/HOSTED_DRESS_REHEARSAL_STATUS.md` (2026-08-08) |
| API health 2026-08-10 (later probe) | **ok** `{"status":"ok","service":"opal_core"}` — earlier probe timed out (cold start / flaky) |
| Web | `https://opal.niovlabs.com` → **HTTP 200**; privacy/terms 200 |
| Web API bake risk | Prior legal deploy dropped `VITE_OPAL_API_URL` — must verify every web deploy |

### Migrations after last hosted boot-migrate set (`20260816000002`)

| Migration | Risk | Local dry-run |
|-----------|------|---------------|
| `20260817000001_create_relationship_availability` | create tables — low lock | **PASS** |
| `20260818000001_create_provider_connections` | create tables — low lock | **PASS** |
| `20260819000001_create_opal_calendar_commitments` | create tables — low lock | **PASS** |

See `MIGRATION_DRY_RUN.md`. **Do not blindly run a pile on prod.** Hosted boot will migrate via `OpalCore.Release.migrate()` when main image deploys.

### Deploy priority

1. database migrations  
2. server/domain (one durable main image)  
3. web client (bake `VITE_OPAL_API_URL`)  
4. mobile/client capability  
5. provider env  
6. hosted functional proof (not only `/health`)

`HTTP /health 200` is **not** product proof.

---

## Track B — Providers / devices

| Capability | Class | Founder needed? |
|------------|-------|-----------------|
| Google Places | SYNTHETIC default / CREDENTIAL BLOCKED without key | Only billing/MFA/legal if new spend |
| Ticketmaster | SYNTHETIC default / CREDENTIAL BLOCKED | Only if account/MFA |
| Booking | REAL HANDOFF (code) | No for pilot social path |
| Navigation | REAL HANDOFF (code) | Device proof optional for social pilot |
| Reminder OS fire | CLIENT CONTRACT | Mobile build + optional APNs/FCM |
| Push | DISABLED / client | Not pilot-blocking for conversation-first |

Founder interrupt **only** for: billing authorization, MFA/password, legal/account-owner consent.

---

## Track C — Dogfood

| Rule | Status |
|------|--------|
| Do not manufacture Plan 1→10 | **LAW** |
| Cohort | founder + one 1:1 + optional 3–4 friends |
| Low-effort participant | flagship; no forms |
| Question ledger | implemented privacy-safe |
| Correction ledger | implemented + dependent invalidation |
| Human coordination residue | implemented taxonomy |

### Residue types

- irreducible_human_authority  
- missing_intelligence  
- missing_permission  
- missing_integration  
- execution_limitation  
- product_defect  
- user_preference  
- desirable_human_choice  

**Target:** avoidable residue ↓ while irreducible agency remains.

---

## Exact blockers (must clear)

1. **server_image_stale** — hosted still `rp61-synthetic-61100ca`; main carries #81–#101  
2. **migrations_pending** — three migrations after last hosted migrate set (local dry-run PASS; not yet on hosted)

Cleared / no longer blocking alone:

- **api_health** — later probe 2026-08-10 returned **ok** (earlier timeout was flaky/cold)

Optional (not pilot-blocking for social):

- Google Places / Ticketmaster credentials  
- Physical device push receipt  

---

## Rollback

Redeploy prior GHCR image tag; migrate down only if new tables empty / safe.

---

## Next engineering actions (no new intelligence)

1. Dry-run migrations 20260817–19  
2. `workflow_dispatch` deploy-opal-api from **main** with durable tag  
3. Redeploy web with baked `VITE_OPAL_API_URL`  
4. Hosted Real People regression matrix (not only health)  
5. Founder dogfood 1:1 with QuestionLedger + residue log  
6. Flip RuntimeTruth only after live proof  

---

## Machine commands

```elixir
OpalCore.SocialFlow.Execution.HostedParity.audit()
OpalCore.SocialFlow.Execution.PilotReadiness.evaluate_current()
OpalCore.SocialFlow.Execution.RealityClosure.report()
OpalCore.SocialFlow.Execution.CoordinationResidue.episode([...], %{...})
```
