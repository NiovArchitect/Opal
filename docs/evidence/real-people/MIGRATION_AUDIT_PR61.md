# PR #61 migration audit

**Branch:** `build/real-people-first-alignment`  
**Date:** 2026-08-06

## Migrations introduced by Real People vertical

### `20260816000001_create_invitation_continuations.exs`

| Item | Detail |
|------|--------|
| Table | `invitation_continuations` |
| Purpose | Ephemeral opaque continuation after share-token strip |
| Key columns | `continuation_digest`, invitation binding, user binding, expiry, consumed_at |
| Uniqueness | Digest unique |
| Privacy | Raw share token **not** stored; only digest |
| Rollback | Drop table |

### `20260816000002_create_alignment_private_participations.exs`

| Item | Detail |
|------|--------|
| Table | `alignment_private_participations` |
| Purpose | Authoritative private answers for alignment |
| Key columns | conversation_id, user_id, proposal_key, response_key, invalidates_set |
| Uniqueness | Per (conversation, user, proposal) via application upsert |
| Privacy | Never projected to shared HTTP/socket; only shared-safe labels leave Elixir |
| Rollback | Drop table |

## Shared-state isolation

Private `response_key` lives only in `alignment_private_participations`.  
Shared signals use `ProductSignals` message evidence + shared-safe labels.  
OTP codes are never stored (synthetic returns code once; production uses provider-managed).

## Existing SF tables

SF17/SF18 tables are not destructively altered by these two migrations.

## Local procedure

```bash
cd apps/opal_core
MIX_ENV=test mix ecto.drop
MIX_ENV=test mix ecto.create
MIX_ENV=test mix ecto.migrate
mix test
```
