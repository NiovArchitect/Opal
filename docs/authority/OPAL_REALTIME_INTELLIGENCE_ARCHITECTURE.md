# Opal Realtime Intelligence Architecture

**Status:** CURRENT architectural law (docs) · locked under P3.1 addendum 2026-09-05  
**Scope:** Architecture truth for Reality Readiness Audit. **Not** P4 implementation. **Not** Kafka prerequisite for first store submission. **Not** P2 reopen.

## Plane separation

| Layer | Technology / role | What Opal gets |
|-------|-------------------|---------------|
| **Live interaction plane** | Elixir / BEAM + Phoenix Channels + PubSub + Presence | Messages, presence, call state, Graph changes, live UI state, synchronized participants |
| **Durable event plane** | **Postgres Outbox now → Kafka later** | Replayable events, cross-service reliability, intelligence events, auditability, recovery |
| **Live media plane** | WebRTC / real-time AV transport | Actual voice/video calls, audio streams, group calls |
| **Intelligence plane** | Python services | ASR, translation, embeddings, retrieval, conversation understanding, context extraction, inference |
| **Persistence / truth** | Postgres + durable jobs | Graph truth, relationships, decisions, consent, delivery states |
| **Offline / device plane** | Local storage / queueing + secure device state | Reconnect, offline actions, recovery |
| **Wake-up plane** | APNs / FCM | Background/offline notifications and incoming-event wakeup |

## Ownership law

> **Python can understand. Elixir owns truth.**

Python may own: ASR, voice processing, translation, embeddings, semantic retrieval, conversation understanding, context extraction, decision-model inference, safety inference, evaluation, batch processing.

Python does **not** own: messaging truth, presence truth, authorization, consent truth, delivery truth, Graph truth, call truth.

## Kafka vs Phoenix (explicit)

- **Phoenix** = live authenticated interaction / immediate shared state for connected clients.
- **Kafka (planned)** = durable, replayable, cross-service event backbone.
- Kafka does **not** replace Phoenix.
- Current direction: **Postgres Outbox + Phoenix PubSub now.** Design event contracts so Kafka can be introduced without rewriting product semantics.
- Do **not** implement Kafka merely to satisfy this addendum.

## WebRTC vs call UI

Phoenix/Elixir owns signaling, authenticated session state, authorization.  
WebRTC owns high-bandwidth audio/video media.  
Working call **UI** ≠ working production **media transport**.

## Realtime product law

**REALTIME ≠ ANIMATION.**  
**REALTIME = reality changed and Opal knows soon enough to help.**

Pipeline:

```text
EVENT → VALIDATE → PERSIST → RECOMPUTE CONTEXT
  → DETERMINE CONSEQUENCE
  → SIGNAL ONLY IF USER VALUE CHANGED
  → UPDATE SAME REALITY ACROSS CONNECTED CLIENTS
```

An internal realtime event does **not** automatically earn UI.  
100 internal changes may legitimately produce **0** UI changes or **1** meaningful consequence.  
Do not expose intermediate model noise.

## Speed to alignment (metric)

Not “Is Opal realtime?” but:

> Does Opal know meaningful reality sooner than I could manually reconstruct it?

Realtime should give the user an unfair advantage: less remembering, less checking, less asking again, less coordination, faster shared understanding, faster legitimate decisions, fewer steps.

## Required realtime domains (readiness audit)

presence · messages · delivery/reconnect · call signaling · call media · call participant state · consented speech intelligence · live translation · Graph recomposition · decision recomposition · Journey state · availability · location/ETA (permissioned) · provider/reservation outcomes · Activity · notifications · offline recovery

For each domain in `OPAL_REALITY_READINESS_MATRIX.md`, record:

source event · truth owner · event schema · persistence · ordering · idempotency · fanout · latency target · offline behavior · reconnect behavior · consent/privacy · failure behavior · AI consumer(s) · user-visible consequence rule · production readiness

## Non-goals of this addendum

- Do not implement Kafka now  
- Do not implement P4 Decision Intelligence engine  
- Do not reopen P2 (frozen)  
- Do not freeze P3 yet  

**Realtime should make Opal smarter before it makes Opal louder.**
