# Frontend Tranche — SURFACE_MAP

**Branch:** `muse/packet-b-batch-2`  
**Tip at map write:** `09b4280`  
**UI freeze lift:** reminder cards · memory transparency · mediation approval · proactive threads/weekly briefing · broadcast choreography · polish only.

## Existing surfaces (compose — do not reinvent)

| Role | Real component / module | Path |
|---|---|---|
| "Opal noticed" / Attention | `ActivityDestination` ("For you" = needs_you) | `apps/opal_web/src/opalUi/ActivityDestination.tsx` |
| Attention feed API | `fetchAttention` / `resolveAttentionItem` / `markAttentionSeen` | `apps/opal_web/src/api/productClient.ts` |
| Attention authority | `attentionAuthority.ts` | `apps/opal_web/src/opalUi/attentionAuthority.ts` |
| You hub memory list | `WhatOpalRemembersSection` (DurablePreferenceMemory facts) | `apps/opal_web/src/opalUi/YouSettingsDestination.tsx` |
| Celebrations (birthdays UI store) | `CelebrationsSection` | same file |
| Planning CTA entry | `OpalCenterChat` chip "Plan something" → `postOpalMessage` | `apps/opal_web/src/opalUi/OpalCenterChat.tsx` |
| Thread list RT | `applyInboxMessage` + `RealtimeClient` `inbox:message` | `apps/opal_web/src/realtime/inboxState.ts`, `RealtimeClient.ts` |
| User channel RT | `RealtimeClient` user topic `inbox:attention` | `RealtimeClient.ts` |
| Brand tokens | `BRAND.palette.opalCyan` `#00E5FF`, `electricAqua` `#00F0D1` | `apps/opal_web/src/brand/brand.ts` |
| CHANNEL_CONTRACT events | see below | `shots/intelligence/CHANNEL_CONTRACT.md` |

## CHANNEL_CONTRACT.md events (exact names — every handler must list these)

1. `intelligence:conflict_alert` — conversation topic; shared members
2. `intelligence:plan_update_suggestion` — conversation topic
3. `intelligence:nudge` — `user:<account_id>` **private**
4. `intelligence:presence_nudge` — `user:<account_id>` **private**
5. `intelligence:commitment_reminder` — `user:<account_id>` **private**

Payload keys (contract): `schema_version`, `event_id`, `intent_type`, `account_id`, `ref_ids`, `reason`, `priority`, `summary`, `conversation_id`, `plan_id`, `person_id`.

## Surface → compose → API/event → files

### 1. Reminder cards (temporal anchors)

- **Compose:** Attention Center row pattern in `ActivityDestination` + celebration calm-copy patterns from `CelebrationsSection` / Attention ingest `source_type: celebration`. Lifecycle states as card variants inside Activity / Center feed — not a new top-level screen.
- **Data:** Backend nudges already land via `MemoryHourlyWorker` → `AttentionCenter.ingest` and SurfacedNudge. FE reads `GET /api/v1/product/attention` (`fetchAttention`). Reminder presentation filters/projects items with temporal/celebration source types + optional typed mock when fields missing (see BLOCKED.md).
- **CTAs:** `[Plan something]` → `postOpalMessage` with person+date prefilled (existing Center planning path). `[Dismiss]` → `resolveAttentionItem` (existing suppression).
- **Realtime:** `intelligence:nudge` / `intelligence:commitment_reminder` via Phase 5 choreography → refresh attention store.
- **Create/modify:**
  - `apps/opal_web/src/opalUi/intelligence/ReminderCard.tsx` (compose activity-row; comment if bespoke bits needed)
  - `apps/opal_web/src/opalUi/intelligence/reminderLifecycle.ts`
  - Extend `ActivityDestination.tsx` to render ReminderCard for matching items
  - `apps/opal_web/src/opalUi/intelligence/ReminderCard.test.tsx`

### 2. Memory transparency ("What Opal remembers" per person)

- **Compose:** You hub list/row styles from `WhatOpalRemembersSection`; person header from existing relationship/people patterns (`listRelationships`).
- **Entry points:** (a) thread header / GroupInfo / existing About affordance — wire into person detail without new header button; (b) You hub People/Memory row → open person memory view.
- **API:** Prefer social-memory person view. **Missing product API** → typed mock + BLOCKED.md (`GET/PATCH/DELETE` person memory). When Paste E adds provenance fields, render them.
- **Create/modify:**
  - `apps/opal_web/src/opalUi/intelligence/PersonMemoryView.tsx`
  - `apps/opal_web/src/api/intelligenceClient.ts` (typed client + mock fallback)
  - Wire entry from `YouSettingsDestination.tsx` / thread About (`GroupInfoDestination` or conversation header in `OpalApp.tsx` — minimal hook only)
  - tests under `opalUi/intelligence/`

### 3. Mediation approval

- **Compose:** ActivityDestination "For you" card (same surface as Opal noticed).
- **Backend today:** `GroupCoordinator.maybe_mediate_to_owner` posts draft to **Opal Center 1:1** (`OpalConversations`), delivery `:owner_center`. Dismiss via `GroupDecision.dismiss_mediation/2`. **No product HTTP** to list mediation cards / send-to-group / edit-send.
- **FE approach:** Card UI against typed mock + BLOCKED endpoints. Send path: open compose / `postOpalMessage` with draft when backend is owner-draft; document backend mechanism in code comment (`delivery: :owner_center` — owner sends, Opal never auto-posts to group).
- **Create/modify:**
  - `apps/opal_web/src/opalUi/intelligence/MediationCard.tsx`
  - `apps/opal_web/src/opalUi/intelligence/mediationActions.ts`
  - Extend ActivityDestination for `source_type` mediation / consensus

### 4. Proactive threads + weekly briefing

- **Proactive threads:** Backend `ProactiveConversation` creates normal threads / Center messages. FE uses existing `inbox:message` + `applyInboxMessage` (top, unread). No special badge. Opening message reason rendered verbatim from message body.
- **Weekly briefing:** Rich card in ActivityDestination / Attention. Schema `weekly_briefings` exists; **no product list API** → mock + BLOCKED. Past weeks list via existing list pattern.
- **Create/modify:**
  - `apps/opal_web/src/opalUi/intelligence/WeeklyBriefingCard.tsx`
  - Verify push/inbox path in `RealtimeClient` / `notificationDelivery.ts` (no crash on backend-initiated thread)

### 5. Broadcast choreography

- **Module:** `apps/opal_web/src/realtime/intelligenceChoreography.ts` (+ tests)
- **Header comment:** list exact CHANNEL_CONTRACT event names (no paraphrase).
- **Handlers:** store-first, audience check (`account_id`), dedupe last 500 `event_id`, timestamp LWW.
- **Wire:** `RealtimeClient` user + conversation channel `ch.on(...)` for the five events.
- **Sequences 1–5:** integration tests with mocked events → store → UI state.
- **Degraded:** reconnect targeted refresh (Center + thread list + open thread) documented in comment.

### 6. Polish

- Dedupe reminder vs nudge by `(person_id, date)` in FE store.
- Existing animations only / fade 200ms gap note.
- a11y labels + `aria-live="polite"`.
- Empty/loading via existing activity-empty / skeleton patterns.

## Inventories checked (zero invented components)

- No new Attention Center product — extend `ActivityDestination`.
- No new planning flow — `postOpalMessage` / Center chips.
- No new thread type — proactive = normal threads via inbox.
- Brand: `BRAND.palette` only — no hardcoded hex in new UI beyond token imports.

## Review checklist (Phase 0 self-review)

- [x] Every surface cites real file paths that exist today
- [x] CHANNEL_CONTRACT event names copied exactly
- [x] Missing HTTP APIs listed only in BLOCKED.md (not invented as live)
- [x] Mediation backend delivery is owner Center draft (documented)
- [x] AssistancePreference / AttentionCenter / SurfacedNudge are backend — FE reads product attention + mocks for gaps
