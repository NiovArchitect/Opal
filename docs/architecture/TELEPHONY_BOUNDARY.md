# Telephony Boundary

**Status:** Phase 0 — deferred implementation; design fence only  
**MVP:** no production calls

---

## Scope later

- 1:1 audio calls  
- Signaling state machines on BEAM  
- Media via specialized SFU/TURN providers  
- Optional recording with consent  
- Future: real-time speech translation  
- Future GOVERNED: outbound PSTN / call-as-user  

---

## BEAM ownership

Elixir should own:

- Call session state machine (ringing, answered, ended, failed)  
- Authorization (who may call whom; block enforcement)  
- Consent checks for recording  
- Durable call metadata (not necessarily media)  
- Integration timeouts and retries  

Media plane should **not** be naive BEAM RTP.

---

## Explicitly not MVP

- Voice cloning into live calls  
- Autonomous outbound calls  
- Silent call recording  

---

## Provider

EXTERNAL_PROVIDER + FOUNDER approval before any paid telephony.
