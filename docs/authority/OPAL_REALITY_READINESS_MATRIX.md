# Opal Reality Readiness Matrix

**Status:** CURRENT ledger (docs) · P3.1 locked · **P4.0 domain lock 2026-09-05**  
**Law:** Fixture ≠ production. Visual GREEN ≠ App Store ready. Local Kafka ≠ production Kafka.  
**Architecture:** `docs/authority/OPAL_REALTIME_INTELLIGENCE_ARCHITECTURE.md` · `docs/architecture/KAFKA_ACTIVATION_ADR.md`  
**Ownership:** Elixir owns truth · Python produces intelligence · Phoenix live · Outbox + Kafka (P4 local target) · WebRTC media

## Surface readiness

| Surface | User intent | Runtime | Data | Persistence | Multi-user | Store readiness | Blocker? |
|---------|-------------|---------|------|-------------|------------|-----------------|----------|
| Auth / phone identity | Sign in | REAL_BACKEND (productClient) | phone/session | yes | n/a | PARTIAL | carrier/SMS deps |
| Contacts discovery | Find people | FIXTURE + optional system | founder seed / contacts API | partial | no | NOT_READY | Contacts permission + sync |
| Chats | Message | REAL_BACKEND + fixture seed | conversations | yes (API) | yes when backend | PARTIAL | offline/push |
| Calls Continuity UI | Call people | REAL_ACTIVE UI · P2 FROZEN | continuity seed + owners | UI state | n/a | UI READY | **AV transport** |
| Calls AV transport | Audio/video | SYSTEM_DEPENDENCY / fixture | media | no | yes needed | **NOT_READY** | WebRTC/CallKit/FCM |
| Opal Assist | Assist preference | LOCAL_UI + settings | prefs | partial | n/a | PARTIAL | consent≠processing |
| Graphs | Shared Reality | REAL_BACKEND + fixture | graphs | yes | partial | PARTIAL | sync edge cases |
| Journey | Live plan | REAL_BACKEND + fixture | journey | yes | partial | PARTIAL | location/background |
| Global Opal Center | Decide / ask | LOCAL_UI + seed path | fixture ideas | session | no | **FIXTURE for DI** | **P4 in progress (P4.0 lock)** |
| DecisionContext aggregate | Persist/revise decisions | NOT_BUILT (P4.1) | — | — | yes needed | **NOT_BUILT** | P4.1 schema |
| Decision engine ladder | One answer/question/tradeoff | NOT_BUILT (P4.2–3) | — | — | yes | **NOT_BUILT** | P4.2–P4.3 |
| Kafka durable bus | Cross-service events | Stub adapter | outbox | yes | n/a | **LOCAL GREEN P4.1a · further convergence P4.5** | local≠prod |
| Kafka production cluster | Prod fanout | NOT_DEPLOYED | — | — | n/a | **NO** | infra separate |
| Search | Find entities | LOCAL_UI + seed routing | fixture entities | no | n/a | PARTIAL | live index |
| Activity | Needs me / changed | LOCAL_UI fixture rows | fixture | no | n/a | FIXTURE | live activity feed |
| Create / media | Capture | SYSTEM_DEPENDENCY | camera/library | yes when captured | n/a | PARTIAL | camera perms |
| Location | Where | SYSTEM_DEPENDENCY | geolocation | session | n/a | PARTIAL | OS permission |
| Push / notifications | Alert | SYSTEM_DEPENDENCY | push tokens | yes | n/a | **NOT_READY** | APNs/FCM + CallKit |
| Account deletion | Delete | REAL when wired | account | yes | n/a | PARTIAL | confirm legal flow |
| Privacy controls | Audience | REAL_ACTIVE UI | settings | yes | n/a | PARTIAL | enforcement audit |

## Realtime domain readiness (P3.1 addendum)

Fields: source · truth owner · persistence · ordering · idempotency · fanout · latency · offline · reconnect · consent · failure · AI consumer · UI consequence · readiness

| Domain | Source event | Truth owner | Persistence | Fanout now | Offline / reconnect | Consent | AI consumer | User-visible consequence rule | Readiness |
|--------|--------------|-------------|-------------|------------|---------------------|---------|-------------|-------------------------------|-----------|
| Presence | connect/disconnect/focus | Elixir Presence | ephemeral | PubSub | recover on reconnect | session | none direct | show available / in-call only when useful | PARTIAL |
| Messages | message.created/edited | Elixir | Postgres | Channels + Outbox | queue + replay | audience | retrieval later | delivery/read only if permitted | PARTIAL |
| Delivery / reconnect | ack / gap fill | Elixir | Postgres + client queue | Channels | mandatory | n/a | none | invisible unless failed | PARTIAL |
| Call signaling | call.* state machine | Elixir | Postgres + Presence | Channels | recover state | call consent | none | ring/join/end UI | PARTIAL (UI GREEN · media NO) |
| Call media | WebRTC tracks | Client + SFU (planned) | no (media) | P2P/SFU | renegotiate | mic/cam | ASR when consented | audio/video itself | **NOT_READY** |
| Call participant state | join/leave/mute | Elixir | session + audit | Channels | restore roster | call | Assist later | roster/mute truth | PARTIAL |
| Consented speech intelligence | partial transcript events | Elixir validates; Python ASR | Outbox candidates | Outbox→consumers | drop if no consent | **explicit** | ASR + understanding | **only threshold-crossing consequences** | NOT_BUILT |
| Live translation | speech/text translate | Elixir gate; Python MT | optional | session | best-effort | explicit | MT models | show translation only when opted | NOT_BUILT |
| Graph recomposition | graph.context_changed | Elixir | Postgres | Channels + Outbox | replay | graph audience | DI (P4) | status/label only if value changed | PARTIAL |
| Decision recomposition | decision.recomputed | Elixir + DI (P4) | Postgres | Channels + Outbox + Kafka (P4.5) | replay | graph | Decision Intelligence | one answer / question / tradeoff | **P4.2–P4.4 ladder REAL · continuous recompose HOLD P4.5** |
| Journey state | journey.* / ETA | Elixir | Postgres | Channels | resume | location | routing models | Leave-time only if material | PARTIAL |
| Availability | availability.changed | Elixir | Postgres | PubSub/Outbox | sync | self | DI | only if plan viability changes | PARTIAL |
| Location / ETA | location.context_changed | Elixir (permissioned) | short-lived | Outbox | degrade | **OS + product** | traffic/ETA | material journey change only | PARTIAL |
| Provider / reservation | provider.reservation_* | Elixir | Postgres | Outbox | retry idempotent | user action | none/DI | Ready / failed consequence | PARTIAL / deps |
| Activity | meaningful consequence | Elixir | Postgres feed | Channels + push | catch-up | audience | filters noise | human-readable consequence log — not dump | FIXTURE |
| Notifications | wake when offline | APNs/FCM + Elixir | tokens + outbox | push | critical | OS notif | none | only earned signals | **NOT_READY** |
| Offline recovery | local queue flush | Client + Elixir | local + server | on reconnect | **required** | n/a | none | silent unless conflict | PARTIAL |

### Event backbone posture

| Stage | Backbone | Status |
|-------|----------|--------|
| Now | Phoenix PubSub + Postgres Outbox | REAL_DEV (partial) |
| P4 local | Outbox Relay → KafkaAdapter + local broker | **P4.1a GREEN · further world-truth convergence HOLD P4.5** |
| Production Kafka | Managed cluster | **NOT claimed by local proof** |
| Never | Python owning delivery/presence/auth/Graph/call/decision truth | FORBIDDEN |
| Never | Kafka as source of truth / client transport | FORBIDDEN |

## Production blockers (honest)

1. Real-time Calls AV + system call integration (WebRTC + CallKit-class)  
2. Push / background ringing (APNs/FCM)  
3. Decision Intelligence engine (P4) behind Global Opal Center  
4. Persistent multi-device Activity + Opal conversation history  
5. Live Search index / contacts sync  
6. Consented speech intelligence pipeline (ASR → structured events → Elixir validate)  
7. Durable cross-service event fanout at scale (Outbox maturity → Kafka when justified)  

## Counts (approximate)

| Class | Count |
|-------|-------|
| Production-ready UI owners | several (P2 Calls Continuity UI frozen) |
| Fixture-backed | Global Opal DI answers, Activity rows, Search fixtures |
| System-dependency | AV/WebRTC, ASR, camera, push, location |
| Not-built | Full P4 DI, CallKit-class calling, live Activity feed, speech→consequence pipeline, Kafka |
| Realtime domains audited | 17 |
| Kafka implemented | **NO** (by design for this stage) |
