# Founder Setup Packet — Google Calendar free/busy

**Provide these only after OAuth security pass is green.**  
Do **not** put any of these values in GitHub, source, or PR comments.

## PROVIDER

Google Calendar API — FreeBusy query only.

## WHY

Real authenticated free/busy so Opal can eliminate “let me check my calendar” under the frozen UX. Minimum scope; no event titles retained.

## EXACT CONSOLE STEPS

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select a project (e.g. `opal-calendar`).
3. **APIs & Services → Library** → enable **Google Calendar API**.
4. **APIs & Services → OAuth consent screen**
   - User type: External (or Internal if Workspace-only).
   - App name: Opal (or internal test name).
   - Support email: founder email.
   - Developer contact: founder email.
   - Scopes → **Add or remove scopes** → add only:
     - `https://www.googleapis.com/auth/calendar.freebusy`
   - Test users (while in Testing): add the Gmail accounts you will use for live proof.
5. **APIs & Services → Credentials → Create credentials → OAuth client ID**
   - Application type: **Web application**
   - Name: `opal-core-calendar`
   - **Authorized redirect URIs** (exact match, no trailing slash unless you configure one):
     - Local: `http://127.0.0.1:4000/api/v1/product/connectors/google_calendar/callback`
     - Hosted (example): `https://<your-api-host>/api/v1/product/connectors/google_calendar/callback`
6. Copy **Client ID** and **Client secret**.

## EXACT API / SCOPES

- Endpoint: `POST https://www.googleapis.com/calendar/v3/freeBusy`
- Scope: `https://www.googleapis.com/auth/calendar.freebusy` only
- PKCE: S256 (server sends `code_challenge` / `code_verifier`)
- Token endpoint: `https://oauth2.googleapis.com/token`

## EXACT SECRET NAMES (SERVER-ONLY)

```bash
export GOOGLE_CALENDAR_CLIENT_ID="....apps.googleusercontent.com"
export GOOGLE_CALENDAR_CLIENT_SECRET="...."
export GOOGLE_CALENDAR_REDIRECT_URI="http://127.0.0.1:4000/api/v1/product/connectors/google_calendar/callback"
export OPAL_PROVIDER_TOKEN_SECRET="$(openssl rand -base64 48)"
```

## WHERE TO STORE THEM

| Secret | Where |
|--------|--------|
| All four | Server env / secret manager (Render/Fly/etc.) |
| `OPAL_PROVIDER_TOKEN_SECRET` | Server only — encrypts tokens at rest |
| Client ID | Server config (also appears in authorize URL — expected) |
| Client secret | **Server only** — never mobile bundle / frontend |

## WHICH MAY BE PUBLIC

- OAuth Client ID is semi-public (browser redirect).  
- Client secret and vault secret are **never** public.

## LOCAL TEST REQUIREMENTS

- Phoenix on port matching redirect URI (default 4000).
- Test Google account added as OAuth consent **test user** if app is in Testing.
- Controlled calendar: create a busy block, leave a free Thursday evening window.

## HOSTED VALUE REQUIREMENTS

- HTTPS redirect URI registered exactly.
- Same env vars on the API host.
- Production: consent screen may need verification for external users beyond test list.

## SECURITY WARNINGS

- Never commit secrets to git.
- Never paste secrets into PRs, screenshots, or chat logs that become artifacts.
- Rotate `OPAL_PROVIDER_TOKEN_SECRET` carefully (re-encrypt or re-auth users).
- Disconnect revokes stored tokens; free/busy authority stops immediately.

## HOW WE WILL VERIFY

1. `POST /connectors/google_calendar/start` → Google consent  
2. Callback with signed state + PKCE  
3. Status `connected: true`, tokens absent from JSON  
4. freeBusy → sufficiency → private intervention without titles  
5. Revoke → manual fallback works  

## COST / BILLING

Google Calendar API freeBusy is free under normal Google API quotas; Cloud project may need a billing account for some orgs even when Calendar API has no direct fee. Monitor quotas in Cloud Console.
