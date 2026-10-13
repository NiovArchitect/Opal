# Cloudflare founder staging tunnel

**Status:** HOLD-PERIOD — temporary hosted path while Render payment suspended  
**Date:** 2026-10-13  
**Not:** production cutover · Fly migration · Pass 2  

## Verified local organism

| Service | Port | Probe |
|---------|------|-------|
| Phoenix | `:4000` | `/health` → 200 · `db=up` · `phone_verify_mode=production_sms` |
| Vite | `:5173` | `/` → 200 |
| Postgres | local | via Phoenix health |
| Port 8000 | — | **down** (wrong tunnel target) |

## Correct tunnel target

Vite already proxies same-origin API/socket to Phoenix (`vite.config.ts`):

```text
/api /health /webhooks /invite /socket  →  127.0.0.1:4000
```

So **one** Cloudflare Quick Tunnel to Vite is enough:

```text
iPhone (anywhere)
        ↓
https://<trycloudflare>.trycloudflare.com
        ↓
cloudflared
        ↓
localhost:5173 (Vite)
        ↓
proxy → localhost:4000 (Phoenix)
        ↓
Postgres
```

Web client: on HTTPS non-production hosts, `getOpalApiBaseUrl()` uses `window.location.origin` — same-origin through the tunnel. No product code change.

## Live session (this machine)

| Item | Value |
|------|-------|
| Public URL | `https://economies-brunswick-band-penguin.trycloudflare.com` |
| Target | `http://127.0.0.1:5173` |
| PID file | `~/.opal/cloudflared-fe.pid` |
| Log | `~/.opal/cloudflared-fe.log` |
| Env | `~/.opal/tunnel.env` (mode=tunnel; never commit) |

Probes through tunnel:

- `GET …/health` → **200** (Phoenix via Vite proxy)
- `GET …/` → **200** (Vite shell)
- `GET …/api/v1/product/attention` → **401** (API reached; auth required — expected)

## One-command recovery

```bash
./scripts/opal_founder_staging_up.sh --with-tunnel --caffeinate
```

Brings up Postgres check → Phoenix → Vite (LAN) → optional Cloudflare + caffeinate.  
Phone walk: `shots/steward/FOUNDER_STAGING_REALITY_WALK.md`

## Ops (manual)

**Start**

```bash
nohup cloudflared tunnel --url http://127.0.0.1:5173 \
  >~/.opal/cloudflared-fe.log 2>&1 &
echo $! > ~/.opal/cloudflared-fe.pid
# copy trycloudflare URL from log into ~/.opal/tunnel.env
```

**Stop**

```bash
kill "$(cat ~/.opal/cloudflared-fe.pid)"
```

**Note:** Port `:8000` in older LOCAL_DEVELOPMENT docs is the optional Python AI worker — **not** the Opal web/API tunnel target.

**Twilio / invite absolute URLs:** restart Phoenix after `tunnel.env` exists so `OPAL_PUBLIC_BASE_URL` loads (`runtime.exs`). Phone browsing the web shell does **not** require that restart (same-origin API).

## Wrong path (do not repeat)

```bash
cloudflared tunnel --url http://localhost:8000   # NOT Opal
```

## Limits (honest)

- Quick Tunnel URL changes each restart  
- Mac must stay awake; Intel Mac can run this but is founder staging only  
- Not a substitute for paid always-on Render/TestFlight API host  
- Founder seed must stay off for honest production-like walks  

## Related

- `docs/GOING_LIVE.md` (ngrok / tunnel modes)
- `scripts/opal_tunnel_start.sh` (ngrok FE+proxy strategy)
- `shots/steward/RENDER_FREE_TIER_FITNESS_AUDIT.md`
- `BLOCKED.md` (Render payment)
