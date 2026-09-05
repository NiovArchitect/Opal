# P3.1 Realtime Intelligence Architecture Addendum

**Date:** 2026-09-05  
**Parent:** P3.1 Founder Correction (liveness + Global Opal geometry + interaction truth)  
**Authority:** `docs/authority/OPAL_REALTIME_INTELLIGENCE_ARCHITECTURE.md`

```text
THIS ADDS ARCHITECTURAL TRUTH TO THE EXISTING P3.1 PASTE.
IT DOES NOT EXPAND P3.1 INTO P4 IMPLEMENTATION.
IT DOES NOT AUTHORIZE KAFKA IMPLEMENTATION.
IT DOES NOT REOPEN P2.
```

## Locked planes

1. Elixir / OTP / BEAM — authenticated product truth  
2. Phoenix Channels — live authenticated client communication  
3. Phoenix PubSub — current internal realtime fanout  
4. Phoenix Presence — ephemeral participant/presence state  
5. Postgres Outbox — current durable event handoff  
6. Kafka / durable event bus — **planned** scalable/replayable backbone (does not replace Phoenix)  
7. WebRTC — live media plane (Elixir owns signaling/auth around session)  
8. Python intelligence services — understand; do not own truth  
9. APNs / FCM — background/offline wake  
10. Local device state — offline queue / reconnect / recovery  

## Readiness audit obligation

Extend `OPAL_REALITY_READINESS_MATRIX.md` with per-domain realtime fields listed in the authority doc.

## Explicit

- REALTIME ≠ ANIMATION  
- REALTIME = REALITY CHANGED AND OPAL KNOWS SOON ENOUGH TO HELP  
- ELIXIR OWNS TRUTH · PYTHON PRODUCES INTELLIGENCE  
- Design **for** Kafka; do not require Kafka for first store submission  
- Call UI ≠ production media transport  
