# Final Deployment Parity

| Component | Value |
|-----------|-------|
| main HEAD | 4d9c9aa (merge PR #33) |
| PR #32 | same-site cookies + temporary cleanup (merged) |
| PR #33 | remove cleanup endpoint (merged) |
| API image | ghcr.io/niovarchitect/opal-api-runtime:sf17-clean-4d9c9aa |
| API digest | sha256:2db4ae372e07ef0be9887d837904fb4d04f9e7c188c54b7a45d0cb7a2f15afd9 |
| API host | https://api.opal.niovlabs.com (verified TLS) |
| Rollback host | https://opal-api-ao0c.onrender.com (retained) |
| Render service | srv-d9nvji3m8hqs73f60tpg |
| Web | https://opal.niovlabs.com |
| Web asset | assets/index-COLOzy6I.js |
| Web CSP connect-src | includes api.opal HTTPS + WSS |
| ttl.sh | not used |
| Durable GHCR | yes |
| OPAL_DEV_AUTH | false |
| OPAL_SYNTHETIC_FIXTURE_ONLY | true |
| Cleanup flags | removed after use |
| Cleanup route | 404 (removed) |
