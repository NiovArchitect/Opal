# SF16 Hosted Parity

| Component | Identity |
|-----------|----------|
| Source branch | build/social-flow-16-hosted-authoritative-runtime |
| API service | srv-d9nvji3m8hqs73f60tpg |
| API URL | https://opal-api-ao0c.onrender.com |
| Postgres | dpg-d9nu39e1egvs738q1jlg-a (Render free oregon) |
| Image | Dockerfile.prod (Elixir 1.17 OTP27 alpine release) |
| Health | GET /health → 200 |
| Synthetic | OPAL_SYNTHETIC_EXPOSE_CODE=true (controlled staging) |
| Provider | synthetic_development |
| Production SMS | B001 blocked |
