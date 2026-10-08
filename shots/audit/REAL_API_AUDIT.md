# REAL API Audit — Five Intelligence Surfaces

**Worktree:** `/Users/genghishameha/Developer/NIOVI-Architect/worktrees/opal-grok-real-people`  
**Branch:** `muse/packet-b-batch-2`  
**Tip at audit:** `ef3294f4` (phase6 verify tip was `b8184b86`)  
**Date:** 2026-10-08  
**Scope:** FE flags → client → Phoenix router → controller → context → DB  
**Post-audit (Bring-to-life Phase 2):** Defaults flipped to `real`; weekly_briefing structured fields filled from open loops / conflicts; choreography flag gates interim nudge mapping. Mocks retained as fallback (`?opal_intel_mock=1`).

**Sources:**  
- `apps/opal_web/src/opalUi/intelligence/intelligenceDataSource.ts`  
- `apps/opal_web/src/api/intelligenceClient.ts`  
- `shots/intelligence/PASTE_F_ENDPOINT_INVENTORY.md`  
- `shots/intelligence/phase6_real/PHASE6_REAL_VERIFY.json` (+ screenshots)  
- `apps/opal_core/lib/opal_core/intelligence/product_surface.ex`  
- `apps/opal_core/lib/opal_core_web/controllers/intelligence_product_controller.ex`

**Verdict rule:** REAL = account-scoped reads/writes of real tables. STUB = mock/fixture/hardcoded deeper than the FE flag. A flag that only remocks on miss while the BE path is live still counts as REAL for the HTTP→DB path.

---

## Global FE flag machinery

| Item | Detail |
|---|---|
| File | `apps/opal_web/src/opalUi/intelligence/intelligenceDataSource.ts` |
| Surfaces | `person_memory`, `mediation`, `weekly_briefing`, `reminder_attention`, `choreography_events` |
| Modes | `mock` \| `real` \| `auto` |
| **Default** | **`mock` for every surface** (`DEFAULT_MODE = "mock"`) — unchanged; do not flip |
| Overrides (highest wins) | (1) test override (2) `?opal_intel_real=1\|all\|surface[,surface]` (3) `localStorage["opal.intelligence.data_source.v1"]` |
| `allowsMockFallback` | true for `mock` and `auto` (identical today) |
| `requiresRealData` | true only for `real` (honest empty/error; never remock) |

Phase 6 evidence (`shots/intelligence/phase6_real/`): walked with `?opal_intel_real=1`, defaults remain mock, mocks retained. GREEN at tip `b8184b86`.

---

## 1. `person_memory`

### Verdict: **REAL**

### FE flag
- Surface key: `person_memory`
- Default: `mock`
- Used by: `fetchPersonMemory` / `patchPersonFact` / `deletePersonFact` via `allowsMockFallback("person_memory")`
- UI: `PersonMemoryView.tsx` → `fetchPersonMemory(personId)`

### FE client → HTTP
| Client fn | Method + path |
|---|---|
| `fetchPersonMemory` | `GET /api/v1/product/intelligence/people/:person_id/memory` |
| `patchPersonFact` | `PATCH …/people/:person_id/facts/:key` |
| `deletePersonFact` | `DELETE …/people/:person_id/facts/:key` (+ `confirm`) |
| (API also exposes) | `POST …/facts/:key/confirm` |

On miss: mock → `PERSON_MEMORY_MOCK` / `mockForPerson`; real → honest empty + `_error`.

### Phoenix
- Router (`router.ex` ~266–273, `product_auth` scope `/api/v1/product`):  
  `IntelligenceProductController` `:person_memory` / `:patch_fact` / `:delete_fact` / `:confirm_fact`
- Controller → `OpalCore.Intelligence.ProductSurface.get_person_memory/2` (+ patch/delete/confirm)
- Privacy: foreign account → **404** (never 403)

### Context → DB
`ProductSurface.get_person_memory/2`:
1. `Repo.get_by(PersonMemory, account_id:, person_id:)` → table **`person_memories`**
2. Rhythms: `Routine` → **`routines`**
3. Dates: `TemporalAnchor` → **`temporal_anchors`**
4. Open loops: `person_memories.open_loops` JSON
5. Learned: `OutcomeSignal` → **`outcome_signals`** (filtered by person)
6. Display name: `User` → **`users`**
7. Vibe: `RelationshipBehaviorProfile` → **`relationship_behavior_profiles`**

Writes (`patch_fact` / `delete_fact` / `confirm_fact`) update `person_memories.known_facts` (archive via `archived_at`, not hard delete).

### Stub check
No deeper mock. Inventory lists `Recall` as an owner; **Recall is not called** from `ProductSurface` (inventory aspirational). Not a stub — unused join.

### Phase 6
Hit `GET …/people/b599fcd7-…/memory`; `person_memory_real_facts` ok (`knows=true err=false`). Screenshot: `01_person_memory_real.png`.

---

## 2. `reminder_attention` (reminder cards)

### Verdict: **REAL**

### FE flag
- Surface key: `reminder_attention`
- Default: `mock`
- Gates **mock seed injection only**, not the attention HTTP call:
  - `ActivityDestination.tsx`: `allowReminderSeed = !requiresRealData("reminder_attention")`
  - `reminderLifecycle.mergeReminderFeed`: never appends `REMINDER_MOCK_SEED` when mode is `real`

### FE client → HTTP
| Client fn | Method + path |
|---|---|
| `fetchAttention` (`productClient.ts`) | `GET /api/v1/product/attention` |
| `resolveAttentionItem` | `POST /api/v1/product/attention/resolve` |
| `markAttentionSeen` | `POST /api/v1/product/attention/seen` |

No dedicated `/intelligence/reminders` route. Paste F contract: enrichment fields on attention items.

Projection: `projectReminder` prefers BE `lifecycle` / `person_name` / `anchor_*` / `days_until` / `plan_*`. Title-guess helpers remain as fallback when enrichment sparse (not a remock).

### Phoenix
- `AttentionCenterController.show` → `AttentionCenter.feed(user_id)`
- Feed refreshes temporal + pending plans, then maps `AttentionCenterItem.to_contract/1`
- Contract calls `ProductSurface.enrich_attention_metadata/2` for `source_type` in `temporal_anchor|celebration|reminder|commitment_reminder`

### Context → DB
| Step | Module / table |
|---|---|
| Active feed rows | `attention_center_items` |
| Temporal refresh | `TemporalFollowThrough.attention_for_user` → upserts into attention items |
| Enrichment | `temporal_anchors`, `plan_memories`, `users` (display name) |
| Budget / slots (writers) | `attention_slots`, `surfaced_nudges` |

### Stub check
`REMINDER_MOCK_SEED` in `reminderLifecycle.ts` is FE-only and **disabled under `real`**. BE path is live tables.  
`POST /attention/ingest` is documented as “dev/test + internal fixtures” — fixture **ingress**, not the GET product path.

### Phase 6
Multiple `GET /api/v1/product/attention`; `reminder_attention_cards` ok (`reminders=1`). Screenshot: `02_reminder_attention_real.png`.

---

## 3. `mediation`

### Verdict: **REAL**

### FE flag
- Surface key: `mediation`
- Default: `mock`
- Client: `fetchMediationItems`, `sendMediationDraft`, `dismissMediation`, `createPlanFromMediation`
- UI: `IntelligenceForYouExtras` → `MediationCard`

### FE client → HTTP
| Client fn | Method + path |
|---|---|
| `fetchMediationItems` | `GET /api/v1/product/intelligence/mediation` |
| `sendMediationDraft` | `POST …/mediation/:id/send` |
| `dismissMediation` | `POST …/mediation/:id/dismiss` |
| `createPlanFromMediation` | `POST …/mediation/:id/create_plan` |

Also routed (no FE client yet): `GET …/mediation/:id`, `GET …/groups/:conversation_id/mediation`.

On miss: mock → `MEDIATION_MOCK_ITEMS`; real → `{ items: [], _error }`.

### Phoenix
- `IntelligenceProductController` `:list_mediation` / `:show_mediation` / `:show_group_mediation` / `:send_mediation` / `:dismiss_mediation` / `:create_plan_mediation`
- → `ProductSurface.list_mediation/1` etc.

### Context → DB
| Op | Module / table |
|---|---|
| List/get | `GroupDecisionState` → **`group_decision_states`** (`consensus_status in blocked\|reached`) |
| Draft | `GroupDecision.mediate/1` (LLM if ready, else `rules_mediation/1` from **real proposals**) |
| Send | Updates `mediation_meta`, `Publisher.record` outbox, `GroupCoordinator.maybe_mediate_to_owner`, `BroadcastChoreography.broadcast_named("intelligence:group_blocked", …)` |
| Dismiss | `GroupDecision.dismiss_mediation/2` → `mediation_dismissed_until` (+7d) |
| Create plan | `SocialFlow.create_tentative_plan_from_conversation` → real SharedPlan + `intelligence:group_consensus` |

### Stub check
No fixture list behind the controller. Empty `items: []` when none is honest empty, not a typed mock. `rules_mediation` is deterministic copy from DB proposals (LLM floor), not FE `MEDIATION_MOCK_ITEMS`.

### Phase 6
`GET …/mediation` hit; `mediation_card` ok (`count=1`). Screenshot: `03_mediation_real.png`.

---

## 4. `weekly_briefing` / briefing

### Verdict: **REAL** (with **partial stub fields** in structured generation — see below)

### FE flag
- Surface key: `weekly_briefing`
- Default: `mock`
- Client: `fetchCurrentBriefing`, `fetchPastBriefings`, `dismissBriefing`
- UI: `IntelligenceForYouExtras` → `WeeklyBriefingCard`

### FE client → HTTP
| Client fn | Method + path |
|---|---|
| `fetchCurrentBriefing` | `GET /api/v1/product/intelligence/briefings?current=1` |
| `fetchPastBriefings` | `GET /api/v1/product/intelligence/briefings` |
| `dismissBriefing` | `POST …/briefings/:id/dismiss` |

Also: `GET …/briefings/:id`.

On miss: mock → `WEEKLY_BRIEFING_MOCK` / `WEEKLY_BRIEFING_PAST_MOCK`; real → throw `realMissError`.

### Phoenix
- `IntelligenceProductController.list_briefings` / `:show_briefing` / `:dismiss_briefing`
- → `ProductSurface.current_briefing/1`, `list_past_briefings/1`, `get_briefing/2`, `dismiss_briefing/2`
- Current missing/dismissed → **404** + `next_briefing_at`

### Context → DB
| Op | Module / table |
|---|---|
| Read/dismiss | `WeeklyBriefing` → **`weekly_briefings`** (`structured` map + `content` + `dismissed_at`) |
| Generate (worker) | `WeeklyBriefingWorker.generate_for/1` inserts row from `PlanMemory` / `SurfacedNudge` / `SocialMemory`, then `BroadcastChoreography.broadcast_named("intelligence:weekly_briefing", …)` + Center message |

### Partial stub / empty fields (not whole-surface STUB)
Inside **real** worker/adapters:

1. `WeeklyBriefingWorker.build_structured/1`  
   - `still_open` **always `[]`**  
   - `tight_spots` **always `[]`**  
   - `question` **hardcoded** template (`"Want Opal to draft weekend options?"` + `plan_create` link)  
   - `confirmed` **is real** (from `plan_memories`)  
   - `suggestion` template when `length(confirmed) >= 2`

2. `ProductSurface.briefing_summary/1` (past list) always returns empty `confirmed` / `still_open` / `tight_spots` (strips body).

HTTP still reads/writes account-scoped `weekly_briefings` — hence REAL, not STUB.

### Phase 6
`GET …/briefings?current=1` hit; `weekly_briefing_card` ok (`count=1`). Screenshot: `04_weekly_briefing_real.png`.

---

## 5. `choreography_events`

### Verdict: **REAL** (BE emit + FE handlers). **Flag is a no-op** for behavior.

### FE flag
- Surface key: `choreography_events`
- Default: `mock`
- **No runtime gate:** `requiresRealData("choreography_events")` / `allowsMockFallback("choreography_events")` are **never consulted** by `intelligenceChoreography.ts` or `RealtimeClient.ts`.
- Phase 6 “proof” only asserted query param covers the surface name (`choreography_flag_real`), **not** that a first-class event was received live.

### FE “client” → transport
Not HTTP. Phoenix channel on `user:<account_id>` (and conversation topics for non-private intents).

| Layer | Path |
|---|---|
| Bind | `IntelligenceChoreography.bindChannel` listens to all `INTELLIGENCE_EVENTS` (core + first-class) |
| First-class | `intelligence:group_blocked`, `group_consensus`, `weekly_briefing`, `temporal_anchor` |
| Interim fallback (always on) | `intelligence:nudge` reason mapping + `inbox:attention` refresh |

### Backend emit
| Event | Emitter | Topic |
|---|---|---|
| `intelligence:group_blocked` | `GroupCoordinator` / `ProductSurface.send_mediation` via `BroadcastChoreography.broadcast_named/3` | `user:<account_id>` (owner-only) |
| `intelligence:group_consensus` | `GroupCoordinator` / `ProductSurface.lock_in_plan` / `create_plan_from_mediation` | owner `user:` |
| `intelligence:weekly_briefing` | `WeeklyBriefingWorker` | owner `user:` |
| `intelligence:temporal_anchor` | `MemoryHourlyWorker` | owner `user:` |

`BroadcastChoreography.broadcast_named/3` → `Endpoint.broadcast("user:#{account_id}", event, body)` with `event_id` + `account_id`. Real channel path — not a fixture bus.

### DB (indirect)
Events are derived from real rows (`group_decision_states`, `weekly_briefings`, `temporal_anchors`, attention/nudge writers). Payloads are IDs + summaries only (CHANNEL_CONTRACT).

### Stub check
No mock event injector gated by the flag. Caveat: **flag flip does nothing**; interim nudge fallback remains until founder “good” + explicit removal (`CHANNEL_CONTRACT.md`, `BLOCKED.md`).

### Phase 6
Screenshot `06_choreography_flag_activity_real.png`; verify detail = flag coverage only. No first-class event in `api_hits`.

---

## Related endpoints that look real but return empty / fixture-shaped fields

| Endpoint / path | Behavior | Notes |
|---|---|---|
| `GET /intelligence/briefings` (past) | 200 with rows, but `confirmed`/`still_open`/`tight_spots` always `[]` | `ProductSurface.briefing_summary/1` |
| `GET /intelligence/briefings?current=1` structured | Often empty `still_open`/`tight_spots`; stock `question` | `WeeklyBriefingWorker.build_structured/1` |
| `GET /intelligence/mediation` | 200 `{items:[]}` when none | Honest empty (controller also maps unexpected errors → `[]`) |
| `GET /intelligence/people/:id/memory` | 404 if no `person_memories` row | Not empty fixture; requires prior ingest/seed |
| `POST /attention/ingest` | Accepts synthetic events | Fixture-friendly ingress; GET feed remains table-backed |
| Opportunity / DynamicIntelligence dinner routes | Separate `DynamicIntelligence.Fixtures` | **Not** on Paste F intelligence product paths |

---

## Phase 6 evidence cross-check

| Surface | HTTP observed under `opal_intel_real=1` | UI assert | Shot |
|---|---|---|---|
| person_memory | `GET …/people/…/memory` | facts present | `01_…` |
| reminder_attention | `GET …/attention` | reminders=1 | `02_…` |
| mediation | `GET …/mediation` | count=1 | `03_…` |
| weekly_briefing | `GET …/briefings?current=1` | count=1 | `04_…` |
| choreography_events | (none — flag name only) | flag covers surface | `06_…` |
| composition | — | — | `05_…` |

Defaults remain mock; mocks retained pending founder “good” per surface.

---

## Summary counts

| Verdict | Count | Surfaces |
|---|---|---|
| **REAL** | **5** | person_memory, reminder_attention, mediation, weekly_briefing, choreography_events |
| **STUB** (whole surface) | **0** | — |
| Partial stub / no-op caveats | 2 | weekly_briefing structured fields; choreography_events flag no-op |

---

## Fixes needed

No whole-surface STUB implementations required for the five HTTP/channel paths — Paste F facades already hit real tables. Parent should harden the following (do **not** flip product defaults here):

### A. `weekly_briefing` — fill structured stub fields
- **Where:** `OpalCore.SocialMemory.Workers.WeeklyBriefingWorker.build_structured/1`  
  (`apps/opal_core/lib/opal_core/social_memory/workers/weekly_briefing_worker.ex`)
- **Do:** Populate `still_open` / `tight_spots` from real open loops / conflicts / unconfirmed plans (`SocialMemory`, `PlanMemory`, open `person_memories.open_loops`); derive `question.link` from actual open items instead of the hardcoded weekend template.
- **Also:** `ProductSurface.briefing_summary/1` — either return real truncated sections or document past-list as metadata-only (today always empty arrays).

### B. `choreography_events` — make the flag mean something
- **Where:** `apps/opal_web/src/realtime/intelligenceChoreography.ts` (+ `RealtimeClient.ts` bind site)
- **Do:** When `getIntelligenceDataSource("choreography_events") === "real"`, prefer first-class events and **disable** interim `intelligence:nudge` reason mapping (keep `inbox:attention` reconnect path until founder says otherwise, per CHANNEL_CONTRACT). When `mock`/`auto`, keep current dual handlers.
- **Verify:** Live emit proof (e.g. mediation send → `intelligence:group_blocked` on `user:`), not only `?opal_intel_real=` coverage.

### C. Optional cleanup (not blockers for REAL verdict)
- Wire or drop unused Paste F inventory owner `Recall` on person-memory assembly (`ProductSurface.build_person_memory_view/2`).
- Distinguish `mock` vs `auto` in `intelligenceClient` if product intent differs (today identical: always try HTTP, remock on miss).
- After founder “good” per surface: delete that surface’s typed mock in `intelligenceClient.ts` / `REMINDER_MOCK_SEED` and flip default only then.

### D. Not required (already REAL)
- Person memory GET/PATCH/DELETE/confirm → `person_memories` (+ related tables)  
- Mediation list/send/dismiss/create_plan → `group_decision_states` + outbox + SharedPlan  
- Attention enrichment → `attention_center_items` + `temporal_anchors` / `plan_memories`  
- `BroadcastChoreography.broadcast_named/3` owner `user:` emits for the four first-class events
