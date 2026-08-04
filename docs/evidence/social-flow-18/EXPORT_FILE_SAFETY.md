# Outbox export file safety (development only)

**Status:** Documentation follow-up. Not an SF18 physical-device closure gate unless export is used during device testing.  
**Command:** `mix opal.export_outbox`  
**Allowlist (do not expand here):** `invitation.accepted`, `relationship.accepted`

## Guards (already on main)

| Guard | Behavior |
|-------|----------|
| `OPAL_FOUNDATION_INGRESS_URL` | must be set or command refuses |
| `--confirm-development-bridge` | required or refuses |
| `--dry-run` | no write, no HTTP, no state change |
| `--limit` | default 25, max 100 |
| Event types | allowlist only |

## Non-dry-run output

| Item | Policy |
|------|--------|
| Default path | `/tmp/opal_outbox_export.json` unless `--path` |
| Contents | allowlisted envelopes + event_ids + counts |
| Intended payload | IDs only (no phone/contact/message/token by DomainEvent + adapter privacy rules) |
| HTTP | **none** (file only; foundation script posts separately) |
| Hosted Opal | **do not run** export against production |
| Git | never commit export files; keep under `/tmp` or local gitignored paths |

## Recommended operator procedure

1. Prefer `--dry-run` first; review counts only.  
2. Export to a path under `/tmp/opal-bridge/` with a dated name.  
3. Restrict directory permissions (`700` dir, `600` file) on multi-user machines.  
4. After bridge smoke, **delete** the file (`rm` securely if required by policy).  
5. Retention: delete same day; do not email or upload exports.  
6. Encryption: not required for ID-only synthetic fixtures on a single-user laptop; required if ever used on shared hosts (still development only).  
7. Logs: event_id + type only; never full payload.

## Filename pattern (recommended)

```text
/tmp/opal-bridge/outbox-export-YYYYMMDD-HHMMSS.json
```

## Exclusion

- Do not add export paths to the repository.  
- Confirm `.gitignore` covers local export experiments if stored outside `/tmp`.  
- Do not expand the event allowlist in this follow-up.
