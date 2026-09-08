# R3 Early-Stretch Authority Reconciliation

**HEAD at reconciliation start:** `5fcefb0`  
**Branch:** `build/v2-coded-experience-closure`  
**Classification:** **EARLY_STRETCH_IMPLEMENTATION** — not release authority  
**Date:** 2026-09-08

## Authority truth (mandatory)

| Gate | Value |
|------|-------|
| `R0_COMPLETE` | YES |
| `R1A_IDENTITY_IMPLEMENTATION` | COMPLETE |
| `POSTGRES_TLS_CONFIG` | GREEN |
| `R1A_REAL_SMS_RUNTIME_PROOF` | BLOCKED_BY_TWILIO_ACCOUNT_RESTRICTION |
| `R1A_COMPLETE` | **NO** |
| `R1B_AUTHORIZED` | **NO** |
| `R3_FORMALLY_AUTHORIZED` | **NO** |
| `R3_EARLY_STRETCH_IMPLEMENTED` | **YES** |
| `R3_COMPLETE` | **NOT CLAIMED** |
| `P2_FROZEN` | YES |
| `P3_FROZEN` | YES |
| `P4_COMPLETE` | YES |
| `MERGE` / `LIVE` / `STORE` | **NO** |
| `TURN PURCHASE` | **NO** |

Do **not** retroactively claim: `R3_COMPLETE`, `WEBRTC_PRODUCTION_READY`, `TWO_DEVICE_MEDIA_GREEN`, `TURN_GREEN`, `STORE_READY`.

## Implementation inventory at `5fcefb0`

| Capability | State |
|------------|--------|
| CALL SESSION DOMAIN (`OpalCore.Calls` / `call_sessions`) | **IMPLEMENTED** (code + migration) |
| Phoenix `call:<id>` | **IMPLEMENTED** (`CallChannel`) |
| Phoenix `user:<id>` inbox | **IMPLEMENTED** (`UserChannel`) |
| SDP exchange (channel `signal` offer/answer) | **IMPLEMENTED** (ephemeral) |
| ICE exchange (channel `signal` ice) | **IMPLEMENTED** (ephemeral) |
| browser WebRTC (`CallClient.ts`) | **IMPLEMENTED** (audio + STUN) |
| public STUN | **IMPLEMENTED** (Google public STUN URLs) |
| TURN | **NOT IMPLEMENTED / NOT CONFIGURED** |
| `needs_turn` | **IMPLEMENTED** as honest ICE-failed classification |
| outgoing ringing | **IMPLEMENTED** (API + broadcasts) |
| answer / decline / hangup | **IMPLEMENTED** (API + state machine) |
| `ActiveCallOverlay` | **IMPLEMENTED** (under Continuity chrome) |
| `call_invite` filament | **IMPLEMENTED** (message type + filament render) |
| durable lifecycle Outbox `call.*` | **IMPLEMENTED** (IDs/status; topic `opal.call.events`) |
| Call Continuity hydration from durable rows | **NOT_COMPLETE** — still `FOUNDER_CALLS_CONTINUITY_ROWS` seed |
| two-browser media | **PROVEN GREEN** (2026-09-08 same-host soak; synthetic fixtures) — see evidence |
| two-physical-device media | **NOT PROVEN** (`BLOCKED_BY_SECURE_DEV_ORIGIN`) |
| production media | **NO** |
| native call integration | **NO** |
| R3 authority promotion | **NOT PROMOTED** |

### Proof pass addendum (2026-09-08)

- `WEBRTC_MEDIA_LOCAL_PROOF = GREEN` (bidirectional packets; STUN host+srflx)
- `REAL_TWO_VERIFIED_USER_CALL = BLOCKED_BY_R1A`
- Objective defect fixed: `peer_ready` renegotiation when answerer joins after offer
- Call Continuity live hydration remains **NOT_COMPLETE** (seed rows)

## Plane separation (law held in code)

| Plane | Role |
|-------|------|
| WebRTC | audio media |
| Phoenix `call:<id>` | ephemeral SDP/ICE/control |
| Phoenix `user:<id>` | ringing / user-directed delivery |
| Postgres | durable call session rows |
| Outbox → Kafka | consequential lifecycle IDs/status only |

**Required:** `RAW_SDP_KAFKA_COUNT = 0`, `RAW_ICE_KAFKA_COUNT = 0`, `MEDIA_KAFKA_COUNT = 0` (payload contract excludes SDP/ICE/media).

## Identity classes for proofs

| Class | Use in this pass |
|-------|------------------|
| `REAL_VERIFIED_USER` | **Unavailable** — R1A SMS proof blocked |
| `LOCAL_REAL_TEST_USER` | Possible if host has non-fixture DB users |
| `FOUNDER_FIXTURE_USER` / `SYNTHETIC_TEST_USER` | **Used for media soak** (Alex/Jordan fixtures) |

Therefore: **`REAL_TWO_VERIFIED_USER_CALL = BLOCKED_BY_R1A`** regardless of local media results.

## Realtime law (preserved)

```
REALITY CHANGED → OPAL KNOWS → MATERIALITY → USER VALUE CHANGED?
  NO  → SILENCE
  YES → ONE PRECISE CONSEQUENCE
```

Realtime ≠ animation. Socket alive ≠ UI noise.
