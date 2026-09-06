# R0 Release Critical Path

**HEAD:** `e52d095` · **North star:** two real phones · real call · consequence → DI

## Hard sequence (do not scramble)

```text
R0  Release Reality Lock (THIS PASS)
 │
 ├─► R1A  Security + Production Identity
 │         TLS verify_peer · Twilio production_sms · auth adversarial
 │
 ├─► R1B  Native Shell Authority          ┐ parallelizable with late R1A
 │         EAS internal RC · profile truth │ once API URL reachable
 │         secure storage · deep-link scaffold
 │
 ├─► R2   Native Product Spine
 │         Chat · find people · session on two devices
 │
 ├─► R3   Call Media Reality              ★ transformative milestone
 │         Elixir signaling · WebRTC · TURN · 1:1 audio
 │
 ├─► R4   Push / Background               hard for real incoming ring
 │         APNs · FCM · tokens · wake
 │
 ├─► R5   Production Intelligence Ops     OFF critical path for first call
 │         Sentry · runbooks · Kafka/Python if claimed
 │
 ├─► R6   Provider / World Depth          POST spine
 │
 ├─► R7   Privacy + Store Convergence
 │
 ├─► FOUNDER_PRODUCTION_WALK
 │
 └─► STORE_SUBMISSION_AUTHORIZED (separate GO)
```

## Why this order (architecture)

| Edge | Reason |
|------|--------|
| TLS before SMS | Do not put real identity on unverified DB transport |
| SMS before native proof of “real users” | Accounts are phone-network |
| Native before WebRTC | Mic/cam OS permissions + real device media |
| Signaling before media | Elixir owns session; media is plane |
| Push after device registration | Tokens need installable app + identity |
| Kafka/Python after call spine | Phoenix can signal first call; durable bus is ops claim |
| Store last | Never submit claiming Calls/push that are fake |

## Milestone definitions

| Milestone | Pass when |
|-----------|-----------|
| **M1 Identity** | Two real E.164 users OTP on hosted API; TLS verified |
| **M2 Two phones chat** | Internal RC A↔B messaging without founder seed |
| **M3 Two phones call** | Real WebRTC audio A↔B; Continuity metadata real |
| **M4 Offline ring** | B woken via push for incoming call |
| **M5 Store RC** | Claimed surfaces real + privacy/signing complete |

## Off-path (important, not first)

- Production Kafka  
- Google Places / Ticketmaster completeness  
- Live booking  
- Activity icon `1046:2`  
- Group video calls  
- IAP  

## Parallel windows

- **R1B** after API reachable (scaffold binaries while Twilio account pending).  
- **R5 observability** (Sentry) can start after R1A.  
- **R6** anytime after R1A for key signup — implement after M3.  
- **Legal draft** for R7 can start early; submit only after M4+.
