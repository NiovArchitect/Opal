# Google Cloud setup for Opal (founder click-through)

**Audience:** founder only (you must click; Grok cannot).  
**Goal:** Places API (New) + Calendar API + Gmail API + OAuth client, then hand three env values to Grok.  
**Code authority (do not invent URIs):**  
`apps/opal_core/lib/opal_core/social_flow/real_world/calendar/google_adapter.ex`  
`apps/opal_core/lib/opal_core_web/router.ex`  
`apps/opal_mobile/app.json` → `ios.bundleIdentifier = local.opal.mobile`

---

## 0. Before you start

- Use the **company** Google account (not a personal throwaway if this is production-bound).
- Have billing ready on the Google Cloud project (Places needs a billing account; OAuth itself is free).
- You will end with these env vars for `~/.opal/r1a1.env` (paste to Grok or add yourself — **never commit**):
  - `GOOGLE_PLACES_API_KEY`
  - `GOOGLE_OAUTH_CLIENT_ID`
  - `GOOGLE_OAUTH_CLIENT_SECRET`
  - `GOOGLE_OAUTH_REDIRECT_URI` (required for **local** Mac Phoenix; see §5)

---

## 1. Create / open the project (≈1 min)

1. Open https://console.cloud.google.com/
2. Top bar → project picker → **New Project**
3. Name: `Opal` (or `Opal Production`) → **Create**
4. Select that project

---

## 2. Enable APIs (≈2 min)

1. Left nav → **APIs & Services** → **Library**
2. Search and **Enable** each of these (one at a time):
   - **Places API (New)** — product name in Library: “Places API (New)”
   - **Google Calendar API**
   - **Gmail API**
3. Confirm all three show as Enabled under **APIs & Services → Enabled APIs**

---

## 3. Billing + Places API key (≈3 min)

1. **Billing** → link a billing account to this project (required for Places)
2. **APIs & Services → Credentials → Create credentials → API key**
3. Copy the key → this is `GOOGLE_PLACES_API_KEY`
4. Click **Edit API key**:
   - **Application restrictions:** prefer **IP addresses** for server-side (add this Mac’s public IP if stable), or leave unrestricted only while testing
   - **API restrictions:** Restrict key → check **Places API (New)** only → **Save**

---

## 4. OAuth consent screen (≈3 min)

1. **APIs & Services → OAuth consent screen**
2. User type: **External** → **Create**
3. App name: `Opal`  
   User support email: your company email  
   Developer contact: same → **Save and Continue**
4. **Scopes → Add or remove scopes** → add exactly:
   - `https://www.googleapis.com/auth/calendar.readonly`
   - `https://www.googleapis.com/auth/gmail.readonly`  
   (These match `GoogleAdapter.oauth_scopes/0`.) → **Update** → **Save and Continue**
5. **Test users** (while Publishing status = **Testing**):
   - **Add users** → add **your** Google account (and any other founder test accounts)
   - Without this step, only Google’s “test users” can finish consent — everyone else sees an error
6. **Save and Continue** through summary

**Publish later:** when ready for non-test users, return here → **Publish app**. Until then, stay in Testing + test users.

---

## 5. Create OAuth client — Web application (≈3 min)

Backend exchange uses a **Web application** client (authorization code + secret).

1. **APIs & Services → Credentials → Create credentials → OAuth client ID**
2. Application type: **Web application**
3. Name: `Opal Phoenix`
4. **Authorized redirect URIs** — paste **all four** from [`docs/GOOGLE_OAUTH_URIS.md`](GOOGLE_OAUTH_URIS.md) (code authority — do not type from memory):

```
https://api.opal.niovlabs.com/api/v1/product/connectors/google_calendar/callback
https://api.opal.niovlabs.com/api/v1/product/oauth/google/callback
http://127.0.0.1:4000/api/v1/product/connectors/google_calendar/callback
http://127.0.0.1:4000/api/v1/product/oauth/google/callback
```

Router (GET + POST on both callbacks — Google browser return is GET):

- `/api/v1/product/oauth/google/start` → start  
- `/api/v1/product/oauth/google/callback` → callback  
- `/api/v1/product/connectors/google_calendar/start` → start  
- `/api/v1/product/connectors/google_calendar/callback` → same adapter callback  

5. **Create** → copy **Client ID** → `GOOGLE_OAUTH_CLIENT_ID`  
6. Copy **Client secret** → `GOOGLE_OAUTH_CLIENT_SECRET`

### Local Mac redirect env

On the founder Mac BEAM, set explicitly (otherwise code defaults to the **hosted** connector URI):

```bash
GOOGLE_OAUTH_REDIRECT_URI=http://127.0.0.1:4000/api/v1/product/connectors/google_calendar/callback
```

That value must match **one** of the Authorized redirect URIs above.

---

## 6. Optional — iOS OAuth client (native ASWebAuthenticationSession later)

Bundle ID from `apps/opal_mobile/app.json`:

```text
local.opal.mobile
```

1. **Credentials → Create credentials → OAuth client ID**
2. Application type: **iOS**
3. Bundle ID: `local.opal.mobile`
4. Create → keep the iOS client ID for a later native paste (v1 connect flow can use the Web client + system browser / deep link back into the app)

No iOS client secret (public client). Do **not** put the Web client secret in the mobile app.

---

## 7. Hand off to Grok

Put these into `~/.opal/r1a1.env` (or paste presence-confirmed values to Grok to wire):

```bash
GOOGLE_PLACES_API_KEY=...
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
GOOGLE_OAUTH_REDIRECT_URI=http://127.0.0.1:4000/api/v1/product/connectors/google_calendar/callback
OPAL_PROVIDER_TOKEN_SECRET=...   # openssl rand -base64 48  (local; not from Google)
```

Then tell Grok: “Google Cloud batch ready.” Grok will restart Phoenix **once** and verify Places + OAuth start (no key values in chat/logs/commits).

---

## 8. Quick smoke (founder, after Grok restarts Phoenix)

1. `curl -s http://127.0.0.1:4000/health` → `status: ok`
2. In app: Connect calendar → Google consent → back to app → “Calendar connected”
3. Ask Opal for a venue near a real city → real Places ratings (not seed-labeled demo)

If consent fails with “access blocked”: you are not on the Test users list, or the redirect URI does not match §5 exactly.
