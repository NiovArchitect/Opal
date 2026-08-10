# Reality Closure — Migration dry-run

**Date:** 2026-08-10  
**Environment:** local Postgres (`opal_core_dev`), MIX_ENV=dev  
**Main frontier:** post-#101 (`6a2cb6c` base)  
**Hosted last migrate set:** through `20260816000002`

## Result

**PASS** — all migrations including post-hosted set applied cleanly.

| Version | Migration | Result | Locking risk |
|---------|-----------|--------|--------------|
| 20260817000001 | create_relationship_availability | OK ~0.0s | low (CREATE TABLE + indexes) |
| 20260818000001 | create_provider_connections | OK ~0.0s | low |
| 20260819000001 | create_opal_calendar_commitments | OK ~0.0s | low |

## Tables created (additive only)

### availability_windows / availability_shares
- FKs to `users`, `conversations`, `availability_windows`
- Partial unique on active share `(conversation_id, availability_window_id)`
- Backward compatible: conversations valid with zero availability rows

### provider_connections
- Ciphertext token columns only
- Unique `(user_id, provider)`
- No plaintext secrets in schema

### opal_calendar_commitments
- FKs to conversations / shared_plans / users
- Partial unique active plan owner version
- Supersession fields present

## App boot

```
boot_ok true  # Code.ensure_loaded?(OpalCore.Repo)
```

## Hosted deploy note

Production entrypoint runs:

```
OpalCore.Release.migrate()
```

on boot (`docker-entrypoint.prod.sh`). Deploying a main-built image will apply these three migrations automatically. Do not hand-run a pile against production without this dry-run evidence.

## Rollback

`change/0` migrations — standard `ecto.rollback` if tables empty / safe. Prefer redeploy prior GHCR image tag if app-level issues; leave empty new tables if no data written.

## What this does NOT prove

- Production data volume / lock contention under load
- Hosted image currently still `rp61-synthetic-61100ca` until deploy
- Functional compound product paths on hosted
