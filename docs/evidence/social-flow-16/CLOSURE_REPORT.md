# Social Flow 16 Closure

## Status

**SOCIAL FLOW 16 CLOSED FOR HOSTED SYNTHETIC PRODUCT VALIDATION**

## Hosted

- API: https://opal-api-ao0c.onrender.com
- DB: Render Postgres (private network)
- Sessions: cookie + CSRF + optional bearer for automation
- Socket tickets: available at POST /api/v1/product/socket-ticket

## Not claimed

- Production SMS (B001)
- Uncontrolled public registration
- GHCR permanent image registry (deploy image via ttl.sh / Docker release path)
- GitHub-native Render repo deploy (repo not linked; image deploy used)
