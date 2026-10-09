# Paste H Phase 3 — Realtime / Outbox / Kafka Audit

**Worktree:** `/Users/genghishameha/Developer/NIOVI-Architect/worktrees/opal-grok-real-people`  
**Audited:** 2026-10-08  
**Scope:** user-facing completion paths vs `event_outbox` / `Publisher.record`; Kafka/Brod need; AttentionBudget under load; reconnect/ordering notes.  

Law (CHANNEL_CONTRACT + EventSubscriber + OPAL_REALTIME_INTELLIGENCE_ARCHITECTURE):
- Phoenix `Endpoint.broadcast` / BroadcastChoreography = live client immediacy (ephemeral).
- Durable fanout for system consumers = same-tx `event_outbox` → `PublishOutboxWorker` → LocalAdapter (+ KafkaAdapter when enabled).
- Gap = completion that **broadcasts or confirms to the user** without writing an outbox row.

---

## 1. OUTBOX

### 1A. Suspects — confirm / broadcast WITHOUT `Publisher.record` / `event_outbox`

#### Plan created / locked

| Path | File:line | What happens | Gap |
|------|-----------|--------------|-----|
| Tentative SharedPlan from conversation (Phase 11A) | `apps/opal_core/lib/opal_core/social_flow.ex:1082–1154` | Inserts plan + participants in tx; **no** outbox, **no** channel broadcast | Plan created with no durable event |
| Proposal → agreed SharedPlan | `apps/opal_core/lib/opal_core/social_flow.ex:502–579` | Inserts agreed plan; PubSub `social_flow:plan` via private `broadcast/4` (`:1043–1053`); **no** `Publisher.record` | Live fanout only (not outbox) |
| Alignment → inbox plan projection | `apps/opal_core/lib/opal_core/messaging/inbox.ex:135–154` | `Endpoint.broadcast` `inbox:plan` / `plan.projected`; AttentionCenter side-effect; **no** outbox | Ephemeral only (Inbox moduledoc: Kafka not on path; API truth after reconnect) |
| Intelligence `plan.confirm` execute | `apps/opal_core/lib/opal_core/intelligence/executor.ex:103–124` | Posts “Locked in!” thread message (or logs); **no** plan outbox event | Confirm UX without durable plan event |
| Mediation lock-in prompt (pre-create) | `apps/opal_core/lib/opal_core/intelligence/product_surface.ex:497–520` | `BroadcastChoreography.broadcast_named("intelligence:group_consensus", …)` only | Broadcast without outbox |
| GroupCoordinator consensus prompt | `apps/opal_core/lib/opal_core/intelligence/group_coordinator.ex:90–119` | Center message + `broadcast_named("intelligence:group_consensus")`; **no** outbox | Same |

#### Reminder set / delivered

| Path | File:line | What happens | Gap |
|------|-----------|--------------|-----|
| HTTP create | `apps/opal_core/lib/opal_core_web/controllers/reminder_controller.ex:32–43` → `reminders.ex:17–48` | Inserts `reminders` row + Oban schedule; HTTP 201; **no** outbox | Confirm without durable event |
| Conversational `set_reminder` | `apps/opal_core/lib/opal_core/social_memory/ingest.ex:103–143` | Calls `Reminders.create`; reasoner may reply “I'll remind you”; **no** outbox | Same |
| Delivery notify | `apps/opal_core/lib/opal_core/reminders.ex:118–133` → `reminder_delivery_worker.ex:42–74` | Push + `AttentionCenter.ingest` → `inbox:attention` (`attention_center.ex:786`); **no** outbox | Fire-time UX without durable event |
| Legacy SF private reminder | `apps/opal_core/lib/opal_core/social_flow.ex:623–682` | Insert + PubSub `social_flow:reminder`; **no** `Publisher.record` | Live-only |

#### Booking confirmed

| Path | File:line | What happens | Gap |
|------|-----------|--------------|-----|
| Confirm service | `apps/opal_core/lib/opal_core/bookings/service.ex:93–159` | Provider book → update booking → `write_plan_memory` / `write_commitment` (`:134–135`, `:442–456`); **no** `Publisher.record` for `booking.confirmed` | Authoritative confirm with no outbox |
| HTTP confirm | `apps/opal_core/lib/opal_core_web/controllers/booking_controller.ex:29–37` | JSON confirmation to client only | Same |
| Note | Wallet spend (if `pay_from_wallet`) records outbox via Wallets — **booking row itself still has no outbox event** | Partial side-effect only |

#### Memory corrected / removed

| Path | File:line | What happens | Gap |
|------|-----------|--------------|-----|
| Confirm / wrong fact | `apps/opal_core/lib/opal_core/intelligence/product_surface.ex:135–178` + controller `:115–119` | Updates `PersonMemory.known_facts`; HTTP contract return; **no** outbox | Correction without durable event |
| Delete/archive fact | `product_surface.ex:94–132` + `intelligence_product_controller.ex:96–105` | Archives fact; **no** outbox | Same |
| Transparency forget | `memory_controller.ex:25–31` → `durable_preference_memory.ex:161–216` | Forget + candidate cleanup; **no** outbox | Same |
| MemoryIntelligence correction | `memory_intelligence.ex:125–151` | User correction path; **no** `Publisher.record` | Same |

#### Related intelligence completions (broadcast, no outbox)

| Path | File:line | Event |
|------|-----------|-------|
| Mediation draft to owner | `group_coordinator.ex:62–81` | `intelligence:group_blocked` (send path in ProductSurface **does** outbox — see 1B) |
| Weekly briefing generated | `weekly_briefing_worker.ex:76–84` | `intelligence:weekly_briefing` (dismiss **does** outbox) |
| Temporal anchor nudge | `memory_hourly_worker.ex:323–334` | `intelligence:temporal_anchor` + AttentionCenter |
| Attention changed | `attention_center.ex:786–790` | `inbox:attention` |
| Celebration reminder | `celebration_reminder_worker.ex:81–113` | AttentionCenter only (budget-gated); no outbox |

### 1B. Paths that correctly use outbox (`Publisher.record` / EventOutbox)

| Domain | File:line | Event types (representative) |
|--------|-----------|------------------------------|
| Wallet load/spend/refund (same tx) | `wallets.ex:250`, `:313`, `:393` | `wallet.loaded`, `wallet.spent`, `wallet.refunded` |
| Mediation send | `product_surface.ex:424–438` (+ broadcast `:443`) | `intelligence.mediation.sent` |
| Mediation dismiss | `product_surface.ex:479–488` | `intelligence.mediation.dismissed` |
| Plan from mediation | `product_surface.ex:554–568` (+ broadcast `:570`) | `intelligence.mediation.plan_created` |
| Briefing dismiss | `product_surface.ex:712–721` | `intelligence.briefing.dismissed` |
| Intelligence choreography intents | `event_subscriber.ex:309–332` | `action.intelligence_intent` then BroadcastChoreography |
| Presence open-loop | `presence_aware.ex:124–159` | `action.presence_nudge` then broadcast |
| Journey withdraw / material change / im_going | `journey_authority.ex:114`, `:222`, `:402` | `journey.*` / `graph.participant_going` |
| Call lifecycle | `calls.ex:535–553` (+ separate channel broadcast `:556–559`) | call status events |
| Consequential message accept | `messages.ex:651–665` | `conversation.message_accepted` |
| Alignment actions on SharedPlan | `conversation_alignment.ex:1583–1605` | alignment event types |
| Alignment availability events | `alignment_events.ex:59` | allowlisted alignment types |
| Live transcription consequence | `live_transcription_consumer.ex:86` | transcription-related |
| Decision / recomposer | `decision_intelligence.ex` / `recomposer.ex` (direct EventOutbox insert) | `decision.*` |
| Assist / social-flow misc | `calls/assist.ex:265`, `real_world/events.ex:42`, `temporary_story_publishing.ex:46`, `intervention_telemetry.ex:75/104`, `leave_by_materiality.ex:57`, `social_moment_engagement.ex:335`, `onboarding.ex` DomainPublisher | various |

**Relay:** `apps/opal_core/lib/opal_core/events/publisher.ex` → `event_outbox` → `PublishOutboxWorker` (`publish_outbox_worker.ex:19–82`) → LocalAdapter always; KafkaAdapter only if `operational?`.

---

## 2. KAFKA / BROD

### Code / infra references (absolute)

| Role | Path |
|------|------|
| Producer adapter (brod) | `/Users/genghishameha/Developer/NIOVI-Architect/worktrees/opal-grok-real-people/apps/opal_core/lib/opal_core/events/adapters/kafka_adapter.ex` |
| Outbox relay → Kafka | `.../events/workers/publish_outbox_worker.ex` |
| Consumer | `.../events/consumers/decision_recomposition_consumer.ex` |
| Brod handler | `.../events/consumers/decision_recomposition_brod_handler.ex` |
| Dep | `apps/opal_core/mix.exs` `{:brod, "~> 4.3"}` |
| Config | `apps/opal_core/config/config.exs` `:kafka_brokers` |
| Local broker | `infra/local/docker-compose.yml` (Redpanda; comment: not production, not source of truth) |
| ADR / law | `docs/architecture/KAFKA_ACTIVATION_ADR.md`, `docs/authority/OPAL_REALTIME_INTELLIGENCE_ARCHITECTURE.md` |
| EventSubscriber honesty | `event_subscriber.ex:43–45` — Kafka exists; `operational?` false by default |
| Verify note | `shots/intelligence/EVENT_DRIVEN_VERIFY.json` — `"kafka": "not built; schemas versioned schema_version=1"` (schemas ready; prod bus not required) |

Gate: `OPAL_KAFKA_ENABLED` in `true|1|yes` **and** brokers configured. Default = off. Domain code never calls Kafka directly.

### Honest verdict — does single-user baseline NEED Kafka now?

**No.**

Single-user Paste H baseline is served by:
1. Postgres truth + same-tx outbox (when written),
2. Oban `PublishOutboxWorker` → LocalAdapter PubSub,
3. Phoenix Channels for connected clients,
4. HTTP list/GET as reconnect truth (Inbox / Attention / reminders / bookings).

Kafka is a **durable cross-service** plane (Python intelligence, multi-node replay, production multi-service claims). It is implemented for local proof (P4.1a) and correctly optional.

### Criteria for when Kafka *would* be needed

1. A second service (e.g. Python DI) must consume versioned domain events independently of BEAM PubSub.
2. Multi-node / multi-region durable fanout with replay/offset semantics is claimed in production.
3. Outbox volume or consumer isolation requires a broker (not only Oban + LocalAdapter).
4. Explicit product claim: “production Kafka deployed” (today: **NOT_DEPLOYED** per authority docs).

Until then: close **outbox gaps** first; keep Kafka off for founder single-user walks.

---

## 3. AttentionBudget — binding under load

**File:** `/Users/genghishameha/Developer/NIOVI-Architect/worktrees/opal-grok-real-people/apps/opal_core/lib/opal_core/intelligence/attention_budget.ex`

### Caps / gates (founder-tunable constants)

| Cap | Value | Lines |
|-----|-------|-------|
| Daily budget (counts against) | **5** granted slots / local day | `@daily_budget 5` (`:27`, enforced `:192–193`) |
| Quiet hours | **22:00–08:00** owner TZ | `@quiet_start 22`, `@quiet_end 8` |
| Quiet bypass | `time_critical` only if active in last **30** min | `@active_window_minutes 30` |
| Dedup window | **24h** on `(person_id,topic)` or `(person_id,date)` | `:164–187` |
| Weekly briefing | Does **not** count against daily 5; still quiet-hours deferred | `:14–15`, `:190` |
| Priority rank | time_critical > mediation > reminder > proactive_thread > weekly_briefing > routine_break | `@priority_rank` `:33–40` |
| Maturity | `:new` → only time_critical/mediation; `:learning` → +reminder; `:established` → all | `:319–325` |
| Travel | Blocks `routine_break` while TravelMode active | `:328–337` |
| Inferred-only | Hard deny (`provenance: inferred`) | `:66–68`, `:310–316` |
| Default TZ | `America/Los_Angeles` if unset | `@default_tz` |

### Call sites that bind under load

| Surface | File | Behavior when denied |
|---------|------|----------------------|
| Memory nudges | `memory_hourly_worker.ex:272` | Skip surface; log |
| Weekly briefing | `weekly_briefing_worker.ex:52` | Defer (`{:ok, {:deferred, reason}}`) |
| Proactive thread | `proactive_conversation.ex:63` | `{:suppressed, {:attention_budget, reason}}` |
| Mediation | `group_coordinator.ex:62` | Suppressed |
| Celebration reminders | `celebration_reminder_worker.ex:81` | No AttentionCenter ingest |

**Exempt by product law (must still fire when budget exhausted):**
- User-command reminders — `reminders.ex`, `reminder_delivery_worker.ex` (explicitly never call `request_slot`).

Under load: after 5 counting grants/day, further nudge/mediation/reminder-priority/proactive/celebration slots return `{:denied, :daily_budget}` (or quiet/maturity/dedupe). User reminders and wallet/booking/plan HTTP completions are **not** gated by this budget.

---

## 4. Reconnection / ordering notes

### CHANNEL_CONTRACT (`shots/intelligence/CHANNEL_CONTRACT.md`)
- BroadcastChoreography = in-process `Endpoint.broadcast`; p95 **< 3s** (typically < 50ms).
- Durable fanout still via `event_outbox` → `PublishOutboxWorker` for system consumers (`:55`).
- FE one-release fallback: still accept interim `intelligence:nudge` + `inbox:attention` until choreography_events real path validated (`:51`).

### EventOutbox / Publisher
- Same-tx insert; unique `event_id` idempotency (`publisher.ex:50–54`, `event_outbox.ex:75`).
- Statuses: `pending|publishing|published|failed|dead` (`event_outbox.ex:15`).
- Failure backoff: exponential up to 300s; dead after **8** attempts (`publisher.ex:103–120`).
- Kafka publish uses partition **0**; `partition_key` travels in envelope for future ordering (`kafka_adapter.ex:26–28`).

### Client reconnect (`RealtimeClient.ts`)
- Message catch-up: `history:sync` with `after_server_seq` (`:711+`).
- On reconnect (`connectCount > 1`): `intelligence.markReconnectRefresh()` — Center + thread list + open thread (`:794–797`).
- Inbox law (`inbox.ex:5–8`): Phoenix fast path; **conversation list API remains truth** after reconnect/relaunch; Kafka not on this path.

### Implication of outbox gaps
Completions that only HTTP-confirm or only `Endpoint.broadcast` leave **no durable domain event** for:
- EventSubscriber / LocalAdapter consumers,
- future Kafka consumers,
- audit/replay after crash.

Connected-client UX may look fine; multi-surface / reconnect / intelligence bus consistency relies on re-fetch APIs — which works for single-user baseline **if** those APIs are authoritative (bookings, reminders, memory GET). Gaps matter most when something else must *react* to the completion asynchronously.

---

## 5. Paste H Phase 3 priority (suggested)

1. **Highest product completions missing outbox:** booking.confirmed, reminder.created (+ optionally reminder.delivered), plan.created/agreed (tentative + proposal paths), memory.fact_corrected / fact_archived.
2. **Wallet already green** — pattern to copy (same-tx `Multi.run(:outbox, …)`).
3. **Do not enable Kafka** for single-user baseline; close outbox first.
4. AttentionBudget already binds proactive load; do not put user-command reminders or money/booking confirms behind it.

---

## Phase 1 closure (Paste H) — outbox gaps fixed

The following user-facing completions now call `Publisher.record` (same transaction or immediately after durable write):

| Completion | Event type | Module |
|------------|------------|--------|
| Reminder set | `reminder.created` | `Reminders.create/2` |
| Booking confirmed | `booking.confirmed` | `Bookings.Service.confirm/3` |
| Tentative plan created | `plan.created` | `SocialFlow.create_tentative_plan_from_conversation/3` |
| Plan agreed from proposal | `plan.agreed` | SocialFlow proposal→agreed path |
| Memory fact corrected | `memory.fact_corrected` | `ProductSurface.patch_fact/5` |
| Memory fact archived/deleted/confirmed/wrong | `memory.fact_*` | `ProductSurface.delete_fact` / `confirm_fact` |

DomainEvent topic families added: `reminder.*`, `memory.*`, `intelligence.*`.

False-commitment guards: `Extractor.may_commit?/2` + ingest/reasoner gates for negation, hypothetical, quote, conditional, reminder retract.

### Latency budgets (single-user)

| Interaction | Budget | Honest loading |
|-------------|--------|----------------|
| Message send → visible | <300ms | Optimistic UI; server_seq sync on ack |
| Extraction → intent | <2s | Rules floor when LLM slow; never fake confirm |
| LLM first token | <3s | “Working on it” / escalate.user — no invented done |
| Channel broadcast → UI | <500ms | Reconnect refetch is truth (CHANNEL_CONTRACT) |

Evidence tests: pressure harness P8 (outbox/reconnect), event_driven_test, scenario_harness.

### Kafka verdict (final)

**Not needed until** a second service must consume durable events independently of BEAM PubSub, multi-region replay is a shipping claim, or production Kafka is explicitly deployed. Until then: Phoenix Channels + Postgres outbox + Oban LocalAdapter.

## Phase 3 acceptance stamp

- Reconnection/order/presence: CHANNEL_CONTRACT + P8 PASS
- Zero non-outbox user-facing completions for reminder/booking/plan/memory (Phase 1 fixes)
- Kafka: not needed until second service / multi-region / explicit prod claim
- Latency budgets documented; honest loading required when over budget
- Stamped: 2026-10-09T06:16:49Z
