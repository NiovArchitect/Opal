# Render configuration + free-tier fitness audit

**Status:** HOLD-PERIOD — infrastructure truth only  
**Date:** 2026-10-13  
**Tip base:** `8e592c5c`  
**Pass 2:** LOCKED · No Fly deploy · No product/schema/intelligence changes  

```yaml
authority_class: RENDER_FREE_TIER_FITNESS_AUDIT
purpose: fact_based_hosting_decision_for_staging_testflight
migrate_product_code: FORBIDDEN
```

## Question answered

> Does Opal’s Phoenix + Postgres + Oban + realtime channel stack fit Render **free** for staging/TestFlight, or does it exceed free-tier limits?

## Verdict (fact-based)

| Path | Fit for Opal TestFlight / first-user smoke? |
|------|-----------------------------------------------|
| **Render Free web + Free Postgres** | **NO — insufficient** |
| **Restore paid Render (current host)** | **YES — preferred next step** |
| **Render cheapest always-on (~$7 web + paid Postgres)** | **YES — minimum viable hosted** |
| **Fly.io migration now** | **NOT required** — evaluate later as infra replacement only |

**Do not migrate because of fear.** The organism already has a Render-shaped deploy path. The blocker is **billing suspension**, not missing architecture.

---

## What the repo already assumes (inspected)

### Deploy artifacts present

| Artifact | Path | Role |
|----------|------|------|
| Prod Dockerfile | `apps/opal_core/Dockerfile.prod` | Elixir 1.17 OTP 27 Alpine release |
| Prod entrypoint | `apps/opal_core/docker-entrypoint.prod.sh` | `Release.migrate()` then `bin/opal_core start` |
| Runtime config | `apps/opal_core/config/runtime.exs` | `DATABASE_URL`, `SECRET_KEY_BASE`, `PHX_HOST`, `POOL_SIZE`, TLS Postgres |
| Hosted runtime doc | `docs/architecture/HOSTED_RUNTIME_SF16.md` | Render API + managed Postgres |
| Public web | Cloudflare Pages / static (`docs/release/PUBLIC_WEB_DEPLOY.md`) | Separate from API |
| `render.yaml` in repo | **Absent** | Dashboard-configured service (not IaC in tree) |
| `fly.toml` | **Absent** | No Fly migration started |

### How Phoenix starts (hosted)

```text
Docker build (monorepo context → Dockerfile.prod)
        ↓
ENTRYPOINT docker-entrypoint.prod.sh
        ↓
bin/opal_core eval "OpalCore.Release.migrate()"
        ↓
[optional OPAL_RUN_SEEDS=true — must stay false in production]
        ↓
bin/opal_core start   (PHX_SERVER=true, PORT from host)
```

Migrations run **on boot** via release eval. No separate migrate job required for current design.

### Process shape (one BEAM, not three services)

```text
Fly/Render App (single web service)
 |
Phoenix Endpoint (Bandit) — HTTP + WebSocket /socket
 |
Channels (realtime)
 |
Oban (in-process queues: ai, events, push + cron)
 |
Ecto → Postgres (one DATABASE_URL)
```

**Implication:** Opal does **not** need a separate Render Background Worker for Oban on day-one staging. One always-on web service + one Postgres is the minimum topology.

Entrypoint already records free-tier pain:

> free-tier deploy eval lacked reliable Application config/DB wiring

### Hosts (authority)

| Surface | Host | Status 2026-10-13 |
|---------|------|-------------------|
| Product API | `https://api.opal.niovlabs.com` | **503 suspended — payment** |
| Staging alias (docs) | `https://opal-api.onrender.com` | Historical SF16 host |
| Socket | `wss://…/socket` | Same service as API |
| Postgres | Render managed (TLS) | Behind suspended API |
| Mobile IPA (W9) | Bakes `api.opal.niovlabs.com` | Needs healthy API |
| Public web | `opal.niovlabs.com` (static) | Independent of API billing |

### Required secrets (never in Git)

From runtime + BLOCKED.md / SF16:

- `DATABASE_URL`
- `SECRET_KEY_BASE`
- `PHX_HOST` / `PORT`
- `OPAL_PHONE_VERIFY_MODE` + Twilio Verify (+ `OPAL_PHONE_LOOKUP_PEPPER` when `production_sms`)
- Deepgram / ElevenLabs / DeepSeek / Brave / OAuth / TURN / Expo push as wired locally in `~/.opal/r1a1.env`

Production must keep **`OPAL_RUN_SEEDS` unset/false** and founder seed **disabled** (Pass 1H law).

---

## Render Free tier vs Opal needs

Sources: [Render Free docs](https://render.com/docs/free) (2026) + current pricing ladder (~$7 always-on starter web).

| Free limit | Opal requirement | Fit? |
|------------|------------------|------|
| Web spins down after **15 min** idle (HTTP **and** WebSocket quiet) | Persistent channels, Attention, messaging, presence | **FAIL** — drops realtime mid-session |
| Cold start **~1 minute** | OTP / push / TestFlight open / call wake | **FAIL** — UX and webhook timing break |
| **750** free instance hours / month | Always-on TestFlight backend ≈ 720h | Borderline if kept awake; **spin-down still kills realtime** |
| Free web **512 MB / ~0.1 CPU**, single instance | Phoenix + Oban + channels | Tight; may OOM under soak — unproven on free |
| Free Postgres **expires 30 days**, **no backups**, 1 GB | Identity, sessions, plans, Attention — durable | **FAIL** — data fuse unacceptable for TestFlight continuity |
| No free **Background Worker** plan | Oban in-process on web | OK **if** web stays up |
| No SSH / one-off jobs on free | Ops / residue cleanup | Painful; entrypoint already notes this |
| Render: “Do not use Free for production” | TestFlight → real devices → first users | Aligns with **paid minimum** |

### Why free fails specifically for Opal

Opal is not a CRUD brochure site. It is:

```text
Device A ⇄ Phoenix Channel ⇄ BEAM ⇄ Channel ⇄ Device B
```

Free spin-down treats quiet WebSockets as idle → tears the channel plane → competing “offline / reconnect / missing Attention” realities. That reintroduces the fragmentation class Pass 1 closed.

Free Postgres 30-day expiry violates **one durable database authority** for any multi-week TestFlight.

---

## Minimum viable hosted (TestFlight-capable)

| Service | Plan | Approx | Why |
|---------|------|--------|-----|
| Web (Phoenix+Oban+Channels) | Always-on starter (e.g. 0.5c-512mb) | **~$7/mo** | No 15-min sleep |
| Postgres | Paid Hobby-class (not Free) | **~$6+/mo** | No 30-day delete fuse; backups exist on paid |
| **Total** | | **~$13+/mo** | Staging / TestFlight / first users |

If 512 MB proves tight under Oban+channels, step web to Standard (~$25) — measure after restore, do not guess.

Static web (`opal.niovlabs.com`) can stay on Cloudflare Pages free.

---

## Decision tree (hold-safe)

```text
Current blocker: Render payment suspended
        ↓
Preferred: restore Render billing on EXISTING service
        ↓
Verify api.opal.niovlabs.com /health = 200
        ↓
Confirm production_default seed OFF + OPAL_RUN_SEEDS false
        ↓
TestFlight upload → device smoke → push → two-device
        ↓
Only if Render remains untenable: draft Fly migration plan
   (infra replacement only — same Dockerfile.prod, same secrets model)
```

### Explicit non-goals now

- Do not abandon Render out of fear  
- Do not rewrite product for Fly  
- Do not split databases (one authority)  
- Do not unlock Pass 2  
- Do not enable founder seeds in production/staging-for-TestFlight  

---

## Environment posture (before any cutover)

| Env | Founder seed | OPAL_RUN_SEEDS | Phone verify | Purpose |
|-----|--------------|----------------|--------------|---------|
| development | allowed (lab) | optional | synthetic or production_sms local | Mac organism |
| staging | controlled / prefer off | **false** | production_sms or gated | Hosted parity |
| production | **disabled** | **false** | production_sms | TestFlight / users |

This encodes Pass 1H: production empty ≠ founder universe.

---

## Fly.io note (deferred)

Fly is a strong **future** fit for Elixir realtime. Treat as:

> Infrastructure replacement for Render — not a reason to change the application.

Before any Fly work: restore or replace hosting with **parity checklist** (health, migrate-on-boot, one DB, secrets, channels A↔B, integrations). **Plan first, deploy second.** No Fly config authored in this pass.

---

## Related

- `BLOCKED.md` — payment suspension truth  
- `docs/architecture/HOSTED_RUNTIME_SF16.md`  
- `apps/opal_core/Dockerfile.prod` · `docker-entrypoint.prod.sh`  
- `shots/steward/PRODUCTION_READINESS_CLOSURE_MATRIX.md`  
- `shots/steward/HOLD_PERIOD_CHECKPOINT.md`  
- `docs/TESTFLIGHT_UPLOAD.md`  
