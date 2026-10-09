# Google OAuth — Authorized redirect URIs (copy-paste)

**Authority:** `OpalCore.SocialFlow.RealWorld.Calendar.GoogleAdapter.authorized_redirect_uris/0`  
**Router:** `apps/opal_core/lib/opal_core_web/router.ex`  
**Do not invent URIs.** A `redirect_uri_mismatch` is the #1 OAuth setup failure.

Add **every** line below to Google Cloud Console → **APIs & Services → Credentials → your Web OAuth client → Authorized redirect URIs**.

```
https://api.opal.niovlabs.com/api/v1/product/connectors/google_calendar/callback
https://api.opal.niovlabs.com/api/v1/product/oauth/google/callback
http://127.0.0.1:4000/api/v1/product/connectors/google_calendar/callback
http://127.0.0.1:4000/api/v1/product/oauth/google/callback
```

## Which URI the Mac BEAM sends today

Runtime `redirect_uri` resolution order:

1. `GOOGLE_OAUTH_REDIRECT_URI` (or legacy `GOOGLE_CALENDAR_REDIRECT_URI`)
2. else **hosted** connectors callback (production default)

On the founder Mac, `~/.opal/r1a1.env` should include:

```bash
export GOOGLE_OAUTH_REDIRECT_URI="http://127.0.0.1:4000/api/v1/product/connectors/google_calendar/callback"
```

That value must match **one** of the Authorized redirect URIs above.

## Routes that must exist (GET + POST)

| Method | Path | Handler |
|--------|------|---------|
| POST | `/api/v1/product/connectors/google_calendar/start` | `ConnectorController.google_start` |
| GET, POST | `/api/v1/product/connectors/google_calendar/callback` | `ConnectorController.google_callback` |
| GET, POST | `/api/v1/product/oauth/google/start` | `ConnectorController.oauth_google_start` |
| GET, POST | `/api/v1/product/oauth/google/callback` | `ConnectorController.oauth_google_callback` |

Google’s browser redirect is **GET** `?code=&state=`. Cookie (or Bearer) product auth is required on callback.

## Consent scopes (exact)

```
https://www.googleapis.com/auth/calendar.readonly
https://www.googleapis.com/auth/gmail.readonly
```

## After client ID + secret land

Hand Grok (or append to `~/.opal/r1a1.env`):

```bash
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
```

Then Grok restarts Phoenix **once** and verifies OAuth start URL generation.
