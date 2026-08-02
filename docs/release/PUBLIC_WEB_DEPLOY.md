# Opal Public Web Deploy — opal.niovlabs.com

## Artifact

- Source: `apps/opal_web`
- Build: `npm ci && npm run build` → `apps/opal_web/dist`
- Headers: `public/_headers` (Cloudflare Pages compatible)

## Target

- Public URL: `https://opal.niovlabs.com`
- Hosting: Cloudflare Pages (preferred) or any static HTTPS host
- DNS: CNAME `opal` → Pages project (operator-owned)

## Environment

| Variable | Purpose |
|----------|---------|
| none required for static product shell | Pure static; no API keys in bundle |

Optional later (authenticated path only, not in the static public shell):

- `VITE_OPAL_API_URL` — Elixir API (never embed secrets)

## Deploy steps

1. Build `apps/opal_web` on the release SHA.
2. Upload `dist/` to Pages project `opal-public`.
3. Attach custom domain `opal.niovlabs.com`.
4. Verify TLS, `/`, chats shell, security headers.
5. Record deployed SHA in evidence.

## Rollback

1. Redeploy previous `dist` artifact SHA.
2. Or point DNS back to prior Pages deployment.

## Health checks

- `GET /` → 200  
- `GET /robots.txt` → 200  
- Response includes `X-Frame-Options: DENY` (via `_headers`)  
- No source maps publicly served  

## Limitations

- This agent environment may not control DNS or Cloudflare credentials.
- Until operator attaches domain, public status remains **NOT LIVE** even if artifact builds green.
