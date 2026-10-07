# Going live — LAN → public tunnel (ngrok)

Cold-reader runbook: take Phoenix on a private Mac LAN and expose HTTPS for
Twilio webhooks and remote FE testing. Production later swaps only
`PUBLIC_BASE_URL` — webhook code stays the same.

## Prerequisites

- Phoenix listening on `:4000` (`mix phx.server` in `apps/opal_core`)
- Vite on `:5173` (optional for FE tunnel)
- `ngrok` installed (`brew install ngrok`)
- ngrok authtoken configured (`ngrok config add-authtoken <token>` from
  https://dashboard.ngrok.com). If missing → see `BLOCKED.md`.

## Steps

### 1. Start tunnels and write local env

```bash
chmod +x scripts/opal_tunnel_start.sh
./scripts/opal_tunnel_start.sh
```

This writes **`~/.opal/tunnel.env`** (never commit):

```
OPAL_PUBLIC_BASE_MODE=tunnel
OPAL_TUNNEL_API_URL=https://….ngrok-free.app
OPAL_PUBLIC_BASE_URL=https://….ngrok-free.app
OPAL_TWILIO_VERIFY_STATUS_CALLBACK=https://….ngrok-free.app/webhooks/twilio/verify
```

URLs change every ngrok restart unless you buy a static domain
(ngrok dashboard → Domains). Static domain is the upgrade path.

### 2. Restart Phoenix with tunnel mode

```bash
set -a && source ~/.opal/tunnel.env && set +a
cd apps/opal_core && mix phx.server
```

`runtime.exs` also auto-loads `~/.opal/tunnel.env` when present.

### 3. Verify from the public internet

```bash
curl -fsS "$(grep OPAL_TUNNEL_API_URL ~/.opal/tunnel.env | cut -d= -f2)/health"
# → {"status":"ok","db":"up",…}
```

### 4. Twilio debugger

Set Verify Service status callback to:

`{OPAL_TUNNEL_API_URL}/webhooks/twilio/verify`

Unsigned POSTs → **401**. Signed POSTs (Twilio HMAC-SHA1 with auth token) → **200**.

Without Twilio creds yet, synthetic probe:

```bash
curl -fsS -X POST "$API/webhooks/twilio/verify" \
  -H 'content-type: application/x-www-form-urlencoded' \
  -d 'OpalProbe=1&Status=delivered'
# needs OPAL_TWILIO_AUTH_TOKEN unset OR a valid signature
```

### 5. Invite links

`POST /api/v1/product/invites` returns `share_url` under `PUBLIC_BASE_URL`
(e.g. `https://….ngrok-free.app/invite/CODE`). Landing is HTML at that path.

### 6. Shutdown / revert

```bash
# stop ngrok
kill "$(cat ~/.opal/ngrok-api.pid)" 2>/dev/null || true
rm -f ~/.opal/tunnel.env
unset OPAL_PUBLIC_BASE_MODE OPAL_PUBLIC_BASE_URL OPAL_TUNNEL_API_URL
# restart Phoenix → mode falls back to lan
```

## Manual tunnel fallback (no ngrok)

If ngrok authtoken is blocked:

1. `cloudflared tunnel --url http://127.0.0.1:4000` (or localtunnel)
2. Write the HTTPS URL into `~/.opal/tunnel.env` as `OPAL_TUNNEL_API_URL` /
   `OPAL_PUBLIC_BASE_URL` and `OPAL_PUBLIC_BASE_MODE=tunnel`
3. Same Phoenix restart + curl health check

Webhook handler code is identical; only the base URL changes.

## Modes

| Mode | Env | Base URL source |
|------|-----|-----------------|
| `lan` (default) | `OPAL_PUBLIC_BASE_MODE=lan` | Mac LAN IP:`PORT` |
| `tunnel` | `=tunnel` | `~/.opal/tunnel.env` / `OPAL_PUBLIC_BASE_URL` |
| `production` | `=production` | `OPAL_PUBLIC_BASE_URL` or `https://opal.niovlabs.com` |

## Grep audit (hardcoded URL generators)

Replaced / routed through `OpalCore.PublicBaseUrl`:

- `OpalCore.Invites.share_url/1` — was `https://opal.app/join?invite=`
- Twilio status callback URL — `PublicBaseUrl.url("/webhooks/twilio/verify")`
- Invite landing FE continue link — `PublicBaseUrl.fe_base_url()`

Push deep links remain app-scheme `opal://…` (not LAN-bound). Docs/evidence
LAN IPs for founder walks are intentional and unchanged.
