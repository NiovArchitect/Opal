# R3 Early-Stretch Reconciliation + Media Soak — STOP

**Evidence HEAD (pre-commit):** working tree on branch `build/v2-coded-experience-closure`  
**Implementation basis:** `5fcefb0` + surgical `peer_ready` SDP renegotiation fix (objective defect)  
**Date:** 2026-09-08  
**Pass type:** PROOF / RECONCILIATION ONLY — no feature expansion

---

## A. Runtime

| Service | URL | Status |
|---------|-----|--------|
| Phoenix | `http://127.0.0.1:4000` | healthy (`/health` ok) |
| Vite | `http://127.0.0.1:5173/` | healthy |
| Websocket | `ws://127.0.0.1:4000/socket` | auth-gated (bare connect refused — expected) |

Launch: existing `mix phx.server` + `npm run dev -- --host 127.0.0.1 --port 5173` with host `~/.opal/r1a1.env`.

---

## Authority (not promoted)

| Gate | Value |
|------|-------|
| `R0_COMPLETE` | YES |
| `R1A_COMPLETE` | **NO** |
| `R1A_REAL_SMS_RUNTIME_PROOF` | **BLOCKED** |
| `R1B_AUTHORIZED` | **NO** |
| `R3_FORMALLY_AUTHORIZED` | **NO** |
| `R3_EARLY_STRETCH_IMPLEMENTED` | **YES** |
| `R3_COMPLETE` | **NOT CLAIMED** |
| `P2_FROZEN` / `P3_FROZEN` | YES |
| `P4_COMPLETE` | YES |
| `MERGE` / `LIVE` / `STORE` | **NO** |
| `permissionToStartLive` | **NO** |

Docs: `docs/authority/R3_EARLY_STRETCH_AUTHORITY_RECONCILIATION.md`

---

## Call plane separation

| Check | Result |
|-------|--------|
| `RAW_SDP_KAFKA_COUNT` | **0** (30 recent `call.*` envelopes) |
| `RAW_ICE_KAFKA_COUNT` | **0** |
| `MEDIA_KAFKA_COUNT` | **0** |
| topic family | `opal.call.events` |

---

## Media proof (`SAME_HOST_TWO_BROWSER_PROOF`)

| Field | Value |
|-------|-------|
| Identity class | `SYNTHETIC_TEST_USER_FIXTURE` (Alex/Jordan) |
| `REAL_TWO_VERIFIED_USER_CALL` | **BLOCKED_BY_R1A** |
| `WEBRTC_MEDIA_LOCAL_PROOF` | **GREEN** |
| `SIGNALING_CONNECTED` | true |
| `MEDIA_FLOWING` | **true** (bidirectional packets) |
| Caller ICE | connected · ~97 packets sent/received |
| Callee ICE | connected · ~98 packets sent/received |
| `STUN_LOCAL_PROOF` | **GREEN** (`host` + `srflx`) |
| `TURN_IMPLEMENTED` | **NO** |
| Video transport | **NOT IMPLEMENTED** — CallSurface video chrome ≠ media (objective mismatch recorded) |
| `PHYSICAL_TWO_DEVICE_BROWSER_PROOF` | **BLOCKED_BY_SECURE_DEV_ORIGIN** (http localhost only) |
| Decline | GREEN (ended/declined) |
| Caller cancel | GREEN (canceled); stale answer **409 rejected** |
| Ringing timeout / miss expiration | **NOT_IMPLEMENTED** (audited — not invented this pass) |

Evidence: `docs/evidence/r3-early-stretch-recon/WEBRTC_MEDIA_SOAK.json`

### Objective defect repaired

Missed SDP when offer broadcast before callee joined `call:<id>`.  
Surgical fix: answerer emits `signal ready`; offerer (re)offers; CallChannel allows `ready`.  
**No P2/P3 redesign.**

---

## Time services

| Field | Value |
|-------|-------|
| `TIME_MATERIALITY_LOCAL_REAL` | **GREEN** (ExUnit 8/0 + vitest 4/0) |
| `TIME_NOOP_SILENCE` | **GREEN** (too_early / already_notified) |
| `OVERLAP_REALTIME_LOCAL_REAL` | **PARTIAL** (broadcast implemented; full UI soak not separate browser proof this pass) |
| `BACKGROUND_TIME_DELIVERY` | **NOT_BUILT** |
| `LEAVE_BY_WORLD_TRUTH` | **PARTIAL** (static/default travel — not live traffic) |
| Countdown UI | **ABSENT** |

Doc: `docs/authority/TIME_SERVICES_EARLY_STRETCH_RECONCILIATION.md`

---

## Continuity / Assist

| Field | Value |
|-------|-------|
| `CALL_CONTINUITY_LIVE_HYDRATION` | **NOT_COMPLETE** / **RED** — still seed `FOUNDER_CALLS_CONTINUITY_ROWS` |
| `OPAL_ASSIST_LIVE_MEDIA_INTELLIGENCE` | **NOT_COMPLETE** |

---

## Remaining gaps

### Calls
1. TURN for production NAT  
2. Durable Continuity hydration (surgical data owner — no P2 chrome change)  
3. Ringing timeout → missed  
4. Physical two-device HTTPS proof  
5. Real verified two-user call (blocked on R1A)  
6. Video transport vs chrome mismatch  
7. Mute wiring to `RTCRtpSender` (UI toggle exists; soak did not assert track.enabled)

### Time
1. Live travel/ETA provider truth  
2. Background/push delivery  
3. Production scheduling worker for leave-by  
4. Shared-now delivery path beyond classifier  

---

## Founder decisions (recommended order)

1. **R1A** remains the critical **release** blocker (Twilio restriction).  
2. Parallel technical square after proof: **TURN design** (no purchase yet) **or** Continuity hydration.  
3. Do **not** promote `R3_COMPLETE` until formal R3 GO + proofs above.

TURN requirements: `docs/architecture/R3_TURN_REQUIREMENTS_FROM_PROOF.md`

---

## STOP

Restarted. Reconciled. Proved media packets on same-host two-browser synthetic users. Proved time silence/materiality locally. Did not buy TURN. Did not wire push. Did not claim R3 complete.

**PRESERVE → EXTEND → COMPOUND.**
