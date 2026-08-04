# API Custom Domain Deployment

## Domain

- Preferred: `api.opal.niovlabs.com`
- Service: `srv-d9nvji3m8hqs73f60tpg` (opal-api)
- DNS: CNAME `api.opal` → `opal-api-ao0c.onrender.com`
- Render custom domain status: verified
- TLS: HTTPS health 200 after certificate issuance

## Health

```
GET https://api.opal.niovlabs.com/health → 200
{"schema_version":"0.1.0","service":"opal_core","status":"ok"}
```

## Rollback

Keep `https://opal-api-ao0c.onrender.com` until same-site client cutover is stable.
Do not remove the onrender host until Safari and Chrome regression pass.
