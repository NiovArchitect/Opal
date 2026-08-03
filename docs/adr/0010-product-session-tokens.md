# ADR-0010: Product session tokens for SF15

**Status:** Accepted  
**Date:** 2026-08-03

## Context

Product clients must authenticate without `X-Opal-Dev-User-Id`. DeviceSession already exists.

## Decision

Issue Phoenix.Token signed access tokens bound to an active `DeviceSession` (`session_ref` + `user_id` + `session_id`). ProductAuth plug validates Bearer tokens. UserSocket accepts `session_token`. Revocation invalidates the DeviceSession so tokens fail on next use.

## Consequences

- No third-party IdP.
- Synthetic phone verification remains development-only.
- DevAuth remains available for internal/dev fixtures only.
