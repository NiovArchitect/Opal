# Telephony Boundary

**Status:** Phase 1 — **signaling + WebRTC/STUN in progress** (R3-early, 2026-09-07)  
**Prior:** Phase 0 deferred · **TURN/SFU:** still EXTERNAL_PROVIDER (founder cost)

---

## Scope now (web)

- 1:1 **audio** calls  
- Signaling state machine on **BEAM** (`initiated|ringing|answered|ended|failed|missed|canceled`)  
- Media via **browser WebRTC** + public **STUN**  
- Durable call metadata + Outbox `call.*` (IDs/status only)  
- ICE failure → honest `needs_turn` (no fake connected media)

## Scope later

- Specialized **TURN/SFU** providers (paid / self-host — founder GO)  
- Native CallKit / ConnectionService  
- Optional recording with consent  
- Future: real-time speech translation  
- Future GOVERNED: outbound PSTN / call-as-user  
- Group / video

---

## BEAM ownership

Elixir owns:

- Call session state machine  
- Authorization (who may call whom; block enforcement)  
- Consent checks for recording (later)  
- Durable call metadata (not media bits)  
- Integration timeouts and retries  
- Outbox → Kafka-ready `opal.call.events`

Media plane must **not** be naive BEAM RTP. SDP/ICE stay on Phoenix channel (ephemeral).

---

## Explicitly not MVP

- Voice cloning into live calls  
- Autonomous outbound calls  
- Silent call recording  

---

## Provider

TURN/SFU: EXTERNAL_PROVIDER + FOUNDER approval before paid telephony.
