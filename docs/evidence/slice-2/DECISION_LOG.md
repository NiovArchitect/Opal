# Slice 2 Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-07-31 | Topic `conversation:<id>` | Membership-scoped realtime |
| 2026-07-31 | `delivered` = recipient channel ack | Not read, not push |
| 2026-07-31 | Presence metas: user_id, device_id, connected_at, app_state, client_version | No PII |
| 2026-07-31 | Socket connect uses X-Opal-Dev-User-Id equivalent params under DevAuth | Same synthetic identity boundary |
