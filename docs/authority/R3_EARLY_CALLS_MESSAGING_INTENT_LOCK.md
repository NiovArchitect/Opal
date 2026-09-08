# R3-EARLY — Calls Media Foundation + Messaging + Opal Time

**Date:** 2026-09-07  
**Starting HEAD:** `1211441`  
**Branch:** `build/v2-coded-experience-closure`  
**Founder GO:** Autonomous stretch — calls, messaging, realtime, novel time UX; regular GitHub saves.

```
R1A_COMPLETE = YES
R1B_AUTHORIZED = NO
P2_UI_FIGMA = FROZEN · P3 = FROZEN · P4 = COMPLETE
MERGE = NO · LIVE = NO · STORE = NO
TURN = DEPENDENCY (public STUN only this stretch)
```

## Thesis

Realtime and time **delete steps** and protect **silence**. Calls Continuity chrome stays; media + signaling become real under it.

## Deliver

1. Elixir call session state machine + `call.*` Outbox (`opal.call.events`)  
2. Product API + `call:<id>` Phoenix channel (SDP/ICE ephemeral — not Kafka)  
3. WebRTC audio + public STUN; honest `needs_turn`  
4. Messaging: optional `call_invite` message type  
5. Time: availability overlap broadcast + leave-by materiality (no clock spam)  

## Non-goals

Native CallKit/APNs · paid TURN · group/video · Figma redesign · 1046:2 · prod Kafka cluster · merge/live
