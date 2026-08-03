# SF17 Hosted proof (post gh-pages deploy)

## Live web

| Check | Result |
|-------|--------|
| URL | https://opal.niovlabs.com |
| Deploy commit | `a5794d6` on `gh-pages` |
| Source SHA | `12831b7` |
| Asset | `/assets/index-RKcz_ysQ.js` |
| CSP connect-src includes | `https://opal-api-ao0c.onrender.com` |
| Bundle includes | `include_bearer`, `approved test numbers`, `Life starts in conversation` |

## Hosted API path (browser-equivalent fetch)

```
POST /api/v1/product/activation/challenges {phone:+12025550101} → 201, development_code 111111
POST /api/v1/product/activation/verify include_bearer=true → 200, access_token, auth_transport cookie_and_bearer
GET  /api/v1/product/session Authorization: Bearer → 200
GET  /api/v1/product/conversations Bearer → 200
```

## UI behavior expected after deploy

1. Skip or complete walkthrough (SF14 titles).
2. Activation shows: "This preview uses approved test numbers. No SMS will be sent."
3. Enter `+12025550101`, continue.
4. Enter development code.
5. UI advances to product shell (does not stay on code step).

## Operator residual

- Set `OPAL_SYNTHETIC_FIXTURE_ONLY=true` on Render after API image includes SF17.
- Redeploy API service with branch/image containing `12831b7+`.
- Manual Chrome/Safari visual pass on real device remains recommended for full closure.
EOF