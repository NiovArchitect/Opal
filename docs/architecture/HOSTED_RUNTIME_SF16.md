# Hosted Authoritative Runtime (Social Flow 16)

## Hosts

| Surface | Host | Notes |
|---------|------|-------|
| Public web | `https://opal.niovlabs.com` | GitHub Pages static |
| Product API | `https://opal-api.onrender.com` (staging host) | Phoenix Bandit |
| Product socket | `wss://opal-api.onrender.com/socket/websocket` | Same service |
| PostgreSQL | Render managed Postgres | TLS preferred |

Custom `api.opal.niovlabs.com` may be attached later via DNS; not required for SF16 closure if HTTPS onrender host is live.

## Trust boundary

- Web is non-authoritative; Elixir owns identity, sessions, relationships, messages.
- Origins allowed: `https://opal.niovlabs.com`, local Vite origins.
- CORS: credentialed, no wildcard with credentials.
- Synthetic SMS only; `OPAL_SYNTHETIC_PROVIDER=true`; production SMS blocked (B001).

## Session (SF16)

- HttpOnly cookie `opal_session` holds signed session token (DeviceSession-backed).
- `Secure` on HTTPS; `SameSite=None` for cross-site API host.
- Readable CSRF cookie `opal_csrf` + header `x-csrf-token` on cookie-authenticated mutations.
- Socket: short-lived ticket from `POST /api/v1/product/socket-ticket`.
- Bearer still accepted for local automation tests only.

## Deploy

- Image: monorepo `Dockerfile.prod` (Elixir 1.17 release).
- Boot: migrate then start release (no automatic demo seed in prod unless `OPAL_RUN_SEEDS=true`).
- Secrets: `DATABASE_URL`, `SECRET_KEY_BASE`, `PHX_HOST`, provider flags.

## Rollback

1. Redeploy previous Render deploy ID.
2. Or point DNS/client `VITE_OPAL_API_URL` back.
3. DB forward-only migrations preferred; restore from Render backup if required.

## Logging

Do not log raw phones, codes, session cookies, message bodies, or CSRF secrets.
