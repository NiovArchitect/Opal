# SF17 P0: Browser activation did not advance

## Reproduction (hosted)

1. Open https://opal.niovlabs.com
2. Complete or skip walkthrough
3. Enter approved fixture `+12025550101`
4. Request code; development code shown (e.g. `111111`)
5. Submit code
6. **Observed (SF16):** network verify returned 200; UI remained on code step or failed silently after session/list calls

## Root causes

| Layer | Defect | Effect |
|-------|--------|--------|
| Auth transport | Cookie-only session after verify; GitHub Pages origin cannot store third-party cookies from Render (`SameSite=None` still blocked as third-party in many browsers) | Subsequent `/session` and product calls unauthorized |
| Client | Verify did not always request/use in-memory bearer | UI never reached authenticated shell |
| Client | Invite discovery failure after verify blocked advance | Silent stuck after valid code |
| CSP | `connect-src` lacked `https://opal-api-ao0c.onrender.com` | Browser could block API fetch entirely on strict CSP |
| Honesty | Personal numbers accepted with synthetic code `000000` | Misleading preview (user thought SMS path worked) |

## Fix (SF17)

1. Always send `include_bearer: true` on verify; keep access token **memory-only** for the tab.
2. Call `onAuthenticated` immediately after successful verify (invite path optional, never blocks entry).
3. Explicit activation states and human-readable errors; never silent-stuck.
4. Client + optional server fixture-only gate; preview copy states approved test numbers only, no SMS.
5. CSP allows Render API host.
6. Recommended infrastructure residual: same-site API (`api.opal.niovlabs.com` or reverse proxy `/api`) so cookies are first-party.

## Fixture policy

**Option A chosen for hosted validation:** approved synthetic fixtures only. Real SMS is a later authorized slice.
