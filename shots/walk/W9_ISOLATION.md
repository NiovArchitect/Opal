# Paste W9 Phase 3 — Two real accounts isolation + messaging

- **Worktree:** `opal-grok-real-people`
- **Tip:** `81276ef8`
- **Proved (UTC):** 2026-10-11T02:45:36Z
- **Runtime:** Phoenix `:4000` · `/health` → `phone_verify_mode: "production_sms"` · `db: up`
- **Rules:** No SMS burns. No invented accounts. Tokens redacted. No commit.

## Accounts (real product user IDs — not seed-UI)

| Role | User ID | Handle / name (DB) | Phone fixture (not OTP'd) |
|------|---------|--------------------|---------------------------|
| Walk A | `47aa5856-8c56-4b18-a4d4-6a9b456516a8` | `jordan` / Jordan | `+12025550101` |
| Walk B | `b599fcd7-7a97-4736-8221-86e0a6d8dc7a` | `s11_c_msy0uy9n` / Walk B | `+12025550102` |

Sessions: Mix-minted `DeviceSession` + `ProductSession.issue` (device labels `w9-isolation-a` / `w9-isolation-b`). Session IDs `f2de01cb-…` / `1de635b8-…`. Access tokens **REDACTED**.

Private marker: `W9ISO_PRIVATE_d627448c` · Shared marker: `W9ISO_SHARED_4740369d`

## Matrix

| Item | Status | Evidence | Notes |
|------|--------|----------|-------|
| **3a** Two real OTP signups (production_sms) | **GATED** | `POST /api/v1/product/activation/challenges` for `+12025550101` and `+12025550102` → **422** `number_not_enabled` ("This number is not enabled for the preview…"). `/health` = `production_sms`. | True dual OTP signup requires burning Twilio Verify SMS on approved live lines. Policy: do not burn SMS. Fixture activate blocked under production_sms. |
| **3b** Account isolation (A private → B invisible) | **PASS** | See isolation table below. Distinct Center conversation IDs; B **403** `not_a_member` on A's Center thread. | Real Walk A/B account IDs + product Bearer sessions (Mix DeviceSession mint, not seed-UI). |
| **3c** Messaging A→B with real timestamps | **PASS** | Direct conversation `ace99adc-db67-4258-9d95-f612246c6c84` (Fort Oak dyad). Message `7cf92508-…` body contains `W9ISO_SHARED_4740369d`; `created_at=2026-10-11T02:44:08.357460Z`; `sender_user_id=47aa5856-…`; visible to A and B with same timestamp; B unread≥1. | Explicit shared fact = shared conversation message. |

## Isolation detail (3b)

| Surface | A (owner) | B (peer) | Result |
|---------|-----------|----------|--------|
| Assist preference (`PATCH/GET …/preferences/assist`) | `assist_calls_enabled=false` after A patch | still `true` | **isolated** |
| Celebration (`POST/GET …/celebrations`) | birthday id `24a2c147-…` person `Secret Aunt W9ISO_PRIVATE_d627448c` visible | celebrations hit **0** for marker | **isolated** |
| Reminder (`POST/GET …/reminders`) | id `64d0919e-…` task contains marker | reminders hit **0** | **isolated** |
| Solo Opal Center plan (`POST …/opal/plans`) | plan `7a7581f4-…` created_by A, `conversation_id=null` | `GET …/journeys/{plan}` → **403 DENIED** | **isolated** |
| Opal Center context (`GET …/opal/conversation`) | id `b1cf9c3c-…`; marker present after private Center message | id `beb6c998-…` (**distinct**); marker **absent** | **isolated** |
| Chats list (`GET …/conversations`) | private marker absent (Center-only) | private marker **absent** | **isolated** |
| Memory facts (`GET …/memory/facts`) | 1 fact `a10ae225-…` label contains marker (`visibility=private` via DurablePreferenceMemory) | facts **0**, marker absent | **isolated** |
| Person memory (`GET …/intelligence/people/{A}/memory` as B) | — | marker **absent** | **isolated** |
| Search-like: venue-search `q=MARKER` | — | empty candidates; no private product leak | **no leak** |
| Search-like: bookings/search | — | 422 provider validation; marker not returned as product data | **no leak** |
| Cross-read Center as chat (`GET …/conversations/{A_center}/messages` as B) | — | **403** `not_a_member` | **isolated** |
| Home feed / Attention | marker not required on A | marker absent on B | **no leak** |

## Shared fact (visible both)

| Fact | ID / value | A | B |
|------|------------|---|---|
| Direct conversation | `ace99adc-db67-4258-9d95-f612246c6c84` (existing Walk A/B dyad) | member | member |
| Message A→B | id `7cf92508-c4a1-40f9-9c9c-6d2a544e286b` · `created_at` **2026-10-11T02:44:08.357460Z** · body `W9ISO_SHARED_4740369d hello from Walk A isolation proof` · `sender_user_id=47aa5856-…` · `server_seq=91` | visible | visible (preview + messages; unread 1 before read) |

Private Center marker remains absent from B's Center after shared messaging (Center ≠ dyad chat).

## Auth path used (no SMS)

1. Confirmed `production_sms` blocks fixture OTP (`number_not_enabled`) — **no Twilio challenge send for approved lines**.
2. `MIX_ENV=dev mix run` inserted active `device_sessions` for Walk A/B and issued `ProductSession` Bearer tokens.
3. All product probes used `Authorization: Bearer` against `/api/v1/product/*`.
4. `GET /api/v1/product/session` → 200 for both; provider label `production_sms`; users match canonical IDs.

## Intentionally not done

- Live Twilio Verify OTP on founder/real phones (would burn SMS) — **3a GATED**.
- No commit.

## Summary

| Phase item | Verdict |
|------------|---------|
| 3a dual real OTP | **GATED** (production_sms + no-SMS policy) |
| 3b isolation | **PASS** |
| 3c messaging + timestamps | **PASS** |
