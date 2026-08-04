# Social Flow 18 Hosted Deployment

## API

| Item | Value |
|------|--------|
| Image | `ghcr.io/niovarchitect/opal-api-runtime:sf18-main-95a7ef2` |
| Digest | `sha256:80d327296e7530960b518dc0533d6b87818345cdc0a399cdab0c742c2d70e66e` |
| Host | `https://api.opal.niovlabs.com` |
| Health | 200 ok |
| Service | `srv-d9nvji3m8hqs73f60tpg` |
| Deploy | `dep-d9ol5dbl550s73esap2g` live |

## Web

| Item | Value |
|------|--------|
| URL | `https://opal.niovlabs.com` |
| Asset | `assets/index-BpudI8sy.js` |
| CSS | `assets/index-BptXUmDn.css` |
| API bind | `https://api.opal.niovlabs.com` |
| gh-pages | `d66fe97` |

## Hosted product probes (no secrets)

- Activation challenge + verify: 200
- Session cookies: Secure, HttpOnly session, SameSite=Lax
- `GET /api/v1/product/people`: 200 with `no_follower_counts`
- Invitation create: `product_status=waiting_for_them`, `sms_sent=false`, share token present, no phone in URL
