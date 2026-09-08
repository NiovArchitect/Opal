# R3 Early-Stretch Founder Lock

**Date:** 2026-09-08  
**Evidence HEAD:** `35284f6` (proof STOP on `build/v2-coded-experience-closure`)  
**Founder decision:** **HOLD all new product code.** Resume **R1A.1** after Twilio `21608` / compliance clears.

## Locked state

```text
R0_COMPLETE = YES

R1A_IDENTITY_IMPLEMENTATION = COMPLETE
POSTGRES_TLS_CONFIG = GREEN
R1A_REAL_SMS_RUNTIME_PROOF = BLOCKED
R1A_COMPLETE = NO

R1B_AUTHORIZED = NO

R3_FORMALLY_AUTHORIZED = NO
R3_EARLY_STRETCH_IMPLEMENTED = YES

CALL_SIGNALING_LOCAL_REAL = GREEN
WEBRTC_AUDIO_LOCAL_REAL = GREEN
WEBRTC_MEDIA_LOCAL_PROOF = GREEN

REAL_TWO_VERIFIED_USER_CALL = BLOCKED_BY_R1A
PHYSICAL_TWO_DEVICE_BROWSER_PROOF = BLOCKED_BY_SECURE_DEV_ORIGIN

STUN_LOCAL_PROOF = GREEN
TURN_IMPLEMENTED = NO
TURN_PRODUCTION_READY = NO

VIDEO_TRANSPORT = NOT_IMPLEMENTED

CALL_CONTINUITY_LIVE_HYDRATION = NOT_COMPLETE

TIME_MATERIALITY_LOCAL_REAL = GREEN
TIME_NOOP_SILENCE = GREEN
LEAVE_BY_WORLD_TRUTH = PARTIAL
BACKGROUND_TIME_DELIVERY = NOT_BUILT

P2_FROZEN = YES
P3_FROZEN = YES
P4_COMPLETE = YES

STORE_READY = NO
MERGE = NO
LIVE = NO
```

## What the proof earned (without promotion)

- WebRTC is no longer merely code: **actual media packets** moved between two independent browser peers (`SAME_HOST_TWO_BROWSER_PROOF`, synthetic fixtures).
- Boundaries preserved: not real verified users, not TURN, not video, not Continuity live hydration, not R3 formal authority.
- Material Time behaves like Opal: **too early** and **already notified** → silence (not a countdown).

## Explicit HOLD — do not start next

| Item | Disposition |
|------|-------------|
| Continuity hydration | Real gap; **not** next — P2 frozen; identity gate is in front |
| Video transport | **Not** next — audio crossed first media boundary; needs TURN/native/device reality later |
| Leave-by push / background time delivery | **Not** next — smears R4; materiality concept stays server-side only |
| Ringing timeout → missed | On **future R3 closure list**; do **not** fix in isolation now |
| TURN purchase / vendor / deploy | **NO** — design-only parallel track already recorded |

## Parallel architecture track (allowed, non-blocking)

**TURN design only** — justified now that direct/STUN media is proven.  
Still: no purchase, no vendor lock, no deployment.  
Authority: `docs/architecture/R3_TURN_REQUIREMENTS_FROM_PROOF.md`

## Release critical path (unchanged from R0)

```text
R1A → real identity → native (R1B) → real calls → push
```

### Immediate founder action

1. Clear Twilio **`21608`** (verify test handset and/or account compliance).  
2. Resume **R1A.1** and earn: real SMS → real OTP → real user → session → revoke → cold start.  
3. Only then: `R1A_COMPLETE = YES`.  
4. After R1A closes: authorize **R1B**.  
5. Next major reality boundary to aim at: **two real Opal users + two real devices + one real audio call.**

## Future R3 closure list (parked)

- Ringing timeout: `ringing → unanswered/missed → durable history → caller/callee convergence`
- Continuity hydration from durable call rows (no P2 chrome reopen)
- TURN implementation after design + founder GO
- Physical two-device HTTPS media proof
- Real two-verified-user call (requires R1A)
- Video after audio architecture has TURN/native/device reality

## STOP

No new product implementation square authorized.  
Preserve stretch code as early implementation.  
Do not silently promote to release authority.
