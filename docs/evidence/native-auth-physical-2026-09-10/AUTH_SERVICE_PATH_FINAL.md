# AUTH SERVICE PATH — FINAL P0

**Date:** 2026-09-10  
**Starting HEAD:** `743e33a`  
**UI frozen:** PHYSICAL_AUTH_UI = GREEN (no design changes this pass)

## Root cause (proven)

Physical Continue failed with “Could not connect to Opal services” **after** the loopback→LAN rewrite because:

1. **CSP `connect-src`** in `index.html` only allowed `http://127.0.0.1:4000` / `localhost:4000` — not `http://<LAN>:4000`.
2. **Phoenix CORS** only allowed Vite on localhost/127.0.0.1 — not `http://<LAN>:5173`.

So even a correct LAN API URL was blocked in WKWebView as a failed fetch → generic connection error.

Classification: **G. CSP/CORS network policy** (not Twilio).

## Fix (canonical, no hardcoded IPs)

1. **Vite same-origin proxy** (`vite.config.ts`): `/api` and `/socket` → `127.0.0.1:4000`.
2. **`getOpalApiBaseUrl()`**: on native-host LAN pages, resolve API to `window.location.origin` so fetches are same-origin (`'self'` in CSP).
3. **Dev-only CORS**: private-LAN Vite origins (5173–5176) allowed when `MIX_ENV=dev`.
4. **`AUTH_API_RESOLVER_VERSION = native-same-origin-proxy-v1`** (+ console marker on challenge).

## Pre-founder proof (no SMS sent)

| Check | Result |
|-------|--------|
| CURRENT_MAC_LAN_IP | `192.168.86.156` |
| Vite Network | `http://192.168.86.156:5173/` |
| Proxy `GET /api/v1/product/session` via LAN:5173 | **401** (Phoenix reached) |
| Proxy `POST .../challenges` without consent | **422** `otp_consent_required` (Phoenix reached, no Twilio) |
| Direct CORS OPTIONS Origin=LAN:5173 | **204** + allow-origin |
| OPAL_PHONE_VERIFY_MODE | `production_sms` |
| Twilio SIDs / token / pepper | SET (presence only) |

## Expected physical Continue destination

```text
page:  http://192.168.86.156:5173/?opal_native_host=1&...
fetch: http://192.168.86.156:5173/api/v1/product/activation/challenges
proxy → http://127.0.0.1:4000/api/v1/product/activation/challenges
```

## Gates before founder interrupt

```text
PHYSICAL_WEB_API_RESOLVER = GREEN
PHOENIX_LAN_HEALTH = GREEN
PHOENIX_PRODUCTION_SMS_ENV = GREEN
PHONE_CHALLENGE_ENDPOINT = READY
NO_STALE_LOOPBACK_AUTH_PATH = GREEN
```
