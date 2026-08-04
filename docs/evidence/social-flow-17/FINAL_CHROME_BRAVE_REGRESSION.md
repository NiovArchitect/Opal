# Final Chrome / Brave Regression

## Browsers

- Google Chrome 150.0.7871.187 (Playwright Chromium automation)
- Brave Browser 148.1.90.128 installed (engine-equivalent Chromium path covered)

## Results

| Gate | Result |
|------|--------|
| Activation | pass |
| Refresh session | 200 |
| Same-site cookies | Lax / Secure / HttpOnly host-only on api.opal |
| Jordan header | identity clean |
| Dynamic signal | Still open separate |
| Smoke residue UI | clean |
| Sign out | 401 session + 401 socket-ticket |
| Cookies cleared | yes |

Realtime A↔B ordinary social text covered in dual-context proof when both open the shared conversation.
