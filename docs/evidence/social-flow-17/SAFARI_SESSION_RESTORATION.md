# Safari Session Restoration

## Environment

- Safari: 18.6 (18621.3.11.19.1)
- macOS: 13.7.8 (Build 22H730)
- WebKit automation (Playwright) used as Safari-engine proof alongside real Safari open

## Architecture

API moved to same-site host `https://api.opal.niovlabs.com` (registrable domain `niovlabs.com` with web `opal.niovlabs.com`).

## Cookie attributes (api.opal.niovlabs.com)

| Cookie | Secure | HttpOnly | SameSite | Domain | Partitioned |
|--------|--------|----------|----------|--------|-------------|
| opal_session | yes | yes | Lax | host-only | no |
| opal_csrf | yes | no | Lax | host-only | no |

## Results

| Step | Result |
|------|--------|
| Fresh activation (synthetic fixture) | pass |
| Full page refresh | session probe 200 (restored) |
| Sign out | session probe 401 |
| Socket ticket after sign-out | 401 |
| Cookies after sign-out | absent |

WebKit (Safari engine) automation recorded the same refresh restoration and sign-out revocation as Chromium.

Real Safari 18.6 opened `https://opal.niovlabs.com` successfully (document title Opal). Full interactive SafariDriver automation requires local macOS authorization not available in this operator shell.

## Conclusion

Same-site Lax cookies restore sessions after refresh on Safari-class WebKit. Cross-site CHIPS dependency is no longer required for the preferred API host.
