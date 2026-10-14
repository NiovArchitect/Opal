# Physical path founder social world — Repair #3 follow-on

**Baseline rejected:** `ce00c150` — automation PROVEN (Playwright **inject**), founder phone **NOT ACCEPTED** (empty/insufficient Chat world).  
**Freeze:** HOLD · **Pass 2:** LOCKED · **FOUNDER ACCEPTED:** PENDING  

## PHYSICAL_PATH vs inject

| Path | How member shell is reached | Seed enable | Proof |
|---|---|---|---|
| **A — inject** | `addInitScript` mints session + `opal.firstRun.v14.completed=1` + seed keys | Storage + URL | `verify_repair_3.mjs` (prior GREEN) |
| **B — physical** | URL `?opal_founder_seed=1&opal_native_host=1` → session restore → onboarding → member shell → Chats | URL / native_host+lan / persisted opt-in (LAN Vite only) | This tranche: compose + BE seed + diagnostics |

`A ∩ ¬B ⇒ overall RED` for founder phone acceptance. This work targets **B**.

## What was empty / insufficient

1. **BE communication seed** only provisioned Chanelle direct + Saturday Crew — Maya/Sabrina/Alex had no live Messages conversations for remap on device after `ensureFounderCommunicationSeed`.
2. **FE chat fixtures** lacked unread variety; diagnostics did not record `seedEnabled / liveRows / fixtureRows / composedRows / paintedRows` for phone forensics.
3. **Maya Saturday market** disagreed across Graphs temporal / person seed (`Coast walk · Tonight`) vs Chats/authority (`Farmers market + coast · Saturday`).
4. **Calls** lacked cancelled + completed variety and Graphing use≠disclose derived signals.
5. **Stories** captions were generic — not market / crew / outing / travel coherent with the chat world.

## What was fixed

| Surface | Fix |
|---|---|
| Chats | `composeChatsList` always paints ≥5 when seed on (hard fallback); unread variety; diagnostics on `__opalSeedPipeline` / console only |
| BE seed | Directs for Chanelle, Maya, Sabrina, Alex + Saturday Crew group; coherent sample bodies |
| Calls | completed / missed / cancelled / audio / video / group; **two** Graphing rows (`Dinner Saturday`, `Prefers morning markets`) with `usePermission=true`, `disclosurePermission=false` |
| Graphs | Maya = Saturday after 10 farmers market + coast everywhere; Chanelle = Saturday 7:30; Jordan Oceanside distinct |
| Stories | Maya market, Jordan crew, Sabrina outing, Alex travel |
| Live | Other-person Live fixture remains `seed-live-sabrina`; YOU Go live ungated (normal-user path) |
| Production | Seed OFF compose stays EMPTY / live-only; production build still requires explicit `opal_founder_seed=1` |

## Physical compose chain

```
URL ?opal_founder_seed=1
  → persistFounderSeedOptIn (session + local)
  → isFounderSeedEnabled() true (LAN Vite / explicit URL)
  → refreshLive → ensureFounderCommunicationSeed (4 directs + group)
  → listConversations → overlayFounderSeedNamesOnChats
  → composeChatsList({ seedOn, liveRows })
  → remapFounderChatRowsToLive(FOUNDER_CHATS_PLAN_PILL_ROWS, live)
  → if painted < 5 → hard fallback fixtures
  → ChatsHome paints FOUNDER_PHONE_CHAT_ROWS ≥ 5
```

Diagnostics (never consumer UI): `window.__opalSeedPipeline.chatsCompose` = `{ seedEnabled, liveRows, fixtureRows, composedRows, paintedRows, hardFallback, path, names }`.

## Caps (this tranche — code + unit)

```
FOUNDER_PHONE_CHAT_ROWS >= 5     YES (compose + fixtures)
PHYSICAL_COMPOSE_DIAGNOSTICS     YES (logs / __opalSeedPipeline)
CALLS_GRAPHING_USE_NE_DISCLOSE   YES (≥2 rows)
MAYA_SATURDAY_COHERENT           YES (Chats/Graphs/temporal/story)
PRODUCTION_SEED_OFF_CLEAN        YES (compose seed-off EMPTY)
PASS2_UNLOCKED                   NO
FREEZE                           HOLD
FOUNDER_ACCEPTED                 PENDING (phone walk)
```

## Remaining gaps (Live / Stories E2E)

- **Stories E2E:** Your Story / Add Story opens `StoryCreateFlow` (camera/library) — unit/path present; full phone share→ring refresh not re-proven this tranche.
- **Live E2E:** Configure / start / end against Lives API on device still phone PENDING; fixture Live (Sabrina) paints under seed; do not fake TikTok livestream.
- Dual browser proof script: `verify_physical_seed_compose.mjs` (URL seed, **no** seed-storage inject).

## Proof commands

```bash
cd apps/opal_web && npx vitest run src/opalUi/chatsHydration.test.ts src/opalUi/callsContinuity.test.ts src/opalUi/founderSeedGate.test.ts src/opalUi/graphSocialHome.test.ts
cd apps/opal_core && mix test test/opal_core/social_flow/founder_communication_seed_test.exs
node docs/evidence/founder_reality_repair_3/verify_physical_seed_compose.mjs
```
