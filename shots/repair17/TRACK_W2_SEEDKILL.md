# Repair #17 — Track W2 (P0): Kill the scripted seed layer

Branch: `muse/repair-17-w2` at R16 tip `2c1bdcd2`. Web only (`apps/opal_web`);
no backend changes were needed (see §3). Not pushed — coordinator integrates.

## 1. The law

The walk path IS the product. Seed/demo content is DATA, never behavior:
with `opal_founder_seed=1`, the app behaves exactly like the normal app
against the real backend. No local paint, no scripted replies, no
`seed-chat-*` conversation is ever minted, opened, or sent to.

## 2. What was removed

### Deleted outright
- **`src/opalUi/seedThreadIntelligence.ts` (412 lines) — DELETED.** All
  scripted responders: `interpretSeedThreadReply` (fake peer replies under
  real people's names — Chanelle "Can't wait. see you there.", Maya
  "Sounds good ✌️", the sticky "You mentioned Maya earlier"-class Opal
  filaments, the scripted Juniper & Ivy lock-in, the scripted date-night
  non-completion), plus `isSeedDemoChatTarget`, `seedChatKeyFrom`,
  `seedChatIdForPersonName`, `seedPeerAttribution`, `SeedSimulatedBanner`.
- **`seedThreadIntelligence.test.ts` — DELETED**, replaced by
  `seedKillGuard.test.ts` (§5). Its Alex trip-data assertions were carried
  over unchanged (that module is DATA and survives).
- **Scripted thread content in `founderChatsPlanPills.ts` — DELETED:**
  `SEED_THREADS_BY_KEY` (five fully scripted conversations painted as real
  threads), `resolveFounderSeedThread`, `founderSeedThreadMessages`,
  `seedKeyFromName`, the `FounderSeedThreadTurn` type. What remains in
  that module is DATA only: the five plan-pill rows, avatars, plan-pill
  tones, and the name→live-id remap used to bind fixture chrome onto real
  conversations.

### OpalApp.tsx (surgical — send path, open path, seed wiring, imports only)
- **Send path:** the DEMO SHIM branch (`isSeedDemoChatTarget(...)` →
  local paint + scripted intelligence, no network) is deleted.
  `applySeedThreadIntelligence` and `collectSeedLocalExtras` are deleted,
  along with all three call sites (seed branch, post-real-send, and the
  unauthenticated path). `send()` now has exactly one authenticated path:
  `await sendMessage(activeChatId, body, session.access_token)`. The
  unauthenticated preview still paints the user's OWN bubble locally —
  identical with the flag on or off, and it never produced replies again.
- **Open path (`openChat`):** all three seed-paint blocks are deleted
  (~245 lines): the `seed-chat-*` local hydrate, the "remapped live id
  gets the designed walk thread" paint, and the "already-painted seed
  thread wins over live fetch" block — plus the matching guard inside the
  live `setThreads` that refused to let a live fetch overwrite a seed
  thread. `openChat` has one path: `listMessages` → interleave real
  filaments → `productRealtime.joinConversation`.
- **Person resolution wiring:** `openChatForPerson` calls
  `resolvePersonChatTarget(target, chats)` — no seed flag exists to pass.
  The profile effect no longer falls back to a minted seed conversation
  id or a fabricated `@handle`; both come only from real chats.
- **Calls continuity wiring:** the three sites that minted seed ids
  (`founderSeedConversationIdForName` for person/group continuity and
  the Calls row open) are removed; a fixture row's `seed-chat-*`
  `conversationId` is explicitly nulled before it can enter continuity
  state, so Message resolves through the peer's real dyad / exact-name /
  new-chat path.
- **Chats list:** the render-time hard fallback that painted raw
  `FOUNDER_CHATS_PLAN_PILL_ROWS` (seed-chat ids) when composition
  under-delivered is deleted.
- **Banner:** all 8 `<SeedSimulatedBanner />` renders removed — seed mode
  no longer simulates anything, so a "SIMULATED" banner would be a lie.
- **Kept deliberately (honest gates, not behavior):** the
  `isFounderSeedChatId(...)` guards that refuse backend call/voice/mute
  operations for fixture ids. They fabricate nothing; they stay as
  defense-in-depth. Also kept: `founderSeedDisplayNameForId` header/list
  name overlay and `overlayFounderSeedNamesOnChats` — display DATA bound
  to real conversations (the conversations, sends, and plans are real).

### openPersonChat.ts (rewritten)
- Ladder is now: explicit real conversation id → peer dyad → exact-name
  dyad → new-chat/ensure. The `founder_seed` rung, the seed remap branch,
  `founderSeedConversationIdForName`, and the `founderSeedEnabled` option
  are deleted.
- Central quarantine: an explicit `seed-chat-*` id is treated as absent
  and resolution falls through to the real rungs; a chat row that itself
  carries a `seed-chat-*` id is never name-matched. The resolver cannot
  return a `seed-chat-*` id under any input (adversarial matrix in tests).

### chatsHydration.ts (`composeChatsList`)
- Seed-on composition keeps ONLY fixture rows that remapped onto a real
  conversation id; unbound rows (still `seed-chat-*`) are dropped, and
  the hard fallback to pure fixture rows is gone. Seed on + no matching
  live conversations → `EMPTY`, exactly like production.

### OpalCenterChat.tsx + graphSurfaceInterop.ts (second scripted responder found)
- **`planFromLocalConfirm` — DELETED** from `graphSurfaceInterop.ts`,
  and its three seed-gated call sites in `OpalCenterChat` are deleted:
  the `useEffect` that synthesized a plan when the user said "yes" after
  a plan-ask, the post-send fallback that emitted a local plan when the
  backend returned generic chat, and the send-failure fallback that
  painted a fabricated Opal reply ("Done. … is on your Graph.") and
  marked the failed send as sent. A failed Center send is now an honest
  failure state; plans surface only from backend `plan_confirm` metadata
  via `planFromOpalMetadata`. The now-dead `lastUserPlanAsk` /
  `surfacedPlanIds` tracking is removed with them.

## 3. What the seed flag does now, end to end

1. `?opal_founder_seed=1` persists the opt-in (`founderGraphSeed.ts`,
   unchanged) and tags the shell `data-opal-founder-seed="1"`.
2. On `refreshLive`, with the flag on, the app calls the EXISTING backend
   seed endpoints through the product client —
   `ensureFounderCommunicationSeed` → `POST /api/v1/product/dev/founder-communication-seed`
   and `ensureFounderGraphCommitmentSeed` → `.../founder-graph-commitment-seed`.
   No new wiring was needed; this bootstrap already existed and was kept.
3. The backend seed (`OpalCore.SocialFlow.FounderCommunicationSeed`,
   server-gated by `allow_founder_communication_seed` + explicit opt-in)
   provisions REAL peer users (Chanelle, Maya, Sabrina, Alex, Jordan) and
   REAL conversations through the existing Messages owner
   (`ensure_direct_conversation` / `create_group_conversation` /
   `accept_message`), with the walk messages stored as real DB messages.
   The commitment seed likewise creates a real shared plan.
4. `listConversations` then returns those real conversations; the
   plan-pill fixture rows remap onto their real ids (fixture chrome,
   real ids). Rows that cannot bind are not shown.
5. From there the flag changes NOTHING: opening a chat hydrates via
   `listMessages` + Channel join, sending traverses `sendMessage`,
   person-open resolves real dyads, Center plans come from backend
   metadata. The founder's walk now exercises the repaired backend —
   real channel, real intents, real plan state — which was the point.

If the backend seed is disabled server-side, the flag degrades to the
plain production app (empty reality), never to a local simulation.

## 4. Other scripted/fake responders found in the sweep

- `planFromLocalConfirm` + OpalCenterChat fallbacks — removed (§2).
- Swept for hardcoded reply strings, `seed-peer-*`/`seed-opal-*`/
  `local-opal-*` message ids, and `humanSpeaker: false` fabrications
  across `apps/opal_web/src`: nothing else paints a fake person. The two
  remaining `humanSpeaker: false` constructions in OpalApp are Opal
  SYSTEM filaments derived from the user's own plan actions (moment
  execution consequence; plan-composer result), labeled
  `opalFilament`/`opalSystemConsequence` — not peer speech; lawful, kept.
- Out of this track's scope (display DATA fixtures, no send/open
  behavior; flagged for the coordinator): `FOUNDER_HOME_FEED` /
  `FOUNDER_LIVE_FEED` / `FOUNDER_STORIES` home fixtures and the seed-on
  suppression of production Home owners in OpalApp, `FOUNDER_CALLS_CONTINUITY_ROWS`
  (+ `defaultPersonRecent`/`defaultGroupRecent`) on the Calls surface,
  and `alexTripMemories` / `mexicoCityCanvasSeed` trip data. None of them
  can mint a conversation id, answer a message, or fabricate a plan
  after this track: every open/send path they feed routes through the
  seedless resolver and the single real send path.

## 5. Proof tests

- **`src/opalUi/seedKillGuard.test.ts` (new, 15 tests)** —
  (a) grep-guards: `seedThreadIntelligence.ts` provably absent; OpalApp /
  openPersonChat / OpalCenterChat / graphSurfaceInterop / founderChatsPlanPills
  reference none of the 12 responder symbols; the scripted thread bodies
  are gone from the data module. (b) send-path: the `send()` slice calls
  the `sendMessage` client boundary exactly once, contains no seed gate,
  no demo shim, no `seed-chat` reference, and its authenticated branch
  paints only from the network result or an honest `failed` state;
  `openChat` slice hydrates only via `listMessages` + Channel join; the
  fixture hard-fallback is absent; the backend seed bootstrap calls are
  still wired. (c) shell wiring: `openChatForPerson` uses the seedless
  resolver; the profile effect mints nothing.
- **`src/opalUi/openPersonChat.test.ts` (rewritten, 11 tests)** —
  behavioral: real-id / peer / exact-name resolution; a named seed person
  with no live conversation is `new_chat`, never a seed id; explicit
  seed ids fall through to real rungs; seed-id chat rows are never
  name-matched; an adversarial matrix proves no input combination yields
  a `seed-chat-*` id and every ok result is an id present in the live
  chat set.
- **`src/opalUi/OpalCenterChat.planSurface.test.tsx` (rewritten, 2 tests)** —
  behavioral with the client boundary mocked: plan-ask → "Yes" with a
  generic backend reply emits NO plan and paints no fabricated
  confirmation (both sends verifiably traversed `postOpalMessage`); a
  real backend `plan_confirm` metadata reply still surfaces the plan.
- **`src/opalUi/chatsHydration.test.ts` (updated)** — seed-on binds
  fixture rows onto real ids only; seed-on + no matching live = EMPTY
  with zero painted rows and `hardFallback: false`.
- Lawfully updated with the deleted behavior: `founderChatsPlanPills.test.tsx`
  (scripted-thread cases removed; data/remap cases kept),
  `graphSurfaceInterop.test.ts` and `onboarding/identityVoice.test.ts`
  (`planFromLocalConfirm` cases removed with the function).

## 6. Results

- Affected files run during development: all green (seedKillGuard 15,
  openPersonChat 11, chatsHydration 7, founderChatsPlanPills 8,
  graphSurfaceInterop 7, identityVoice, founderCommunicationSeed 5,
  founderSeedGate 6, OpalCenterChat.planSurface 2).
- Full web suite, this branch: 1,129 tests, 1,104 passed, **25 failed**.
  The sorted failing-test-name list is **byte-identical to the pristine
  baseline** (`diff` empty; lists saved alongside this report as
  `web-failures-r17w2.txt` / `web-failures-pristine-r16.txt`). One
  suite-level line in the raw log (`AppearanceThemeSection`) was an
  `ENOSPC: no space left on device` environment error while parallel
  workers filled the /tmp tmpfs — that file passes standalone on this
  branch (1/1) and is not among the 25 failed tests.
- Full web suite, pristine R16 tip (same session, own worktree):
  1,163 tests, 1,138 passed, **25 failed** — byte-identical to
  `shots/repair16/VERIFY.json`. The one baseline failure touching this
  track's files (`OpalCenterChat > shows send error and keeps typed text
  on failure`) was verified to fail identically on the pristine tip.
- TypeScript: pristine tip has the documented 7 errors; this branch has
  4 — the 3 deleted seed-paint blocks carried 3 of the pre-existing
  errors with them; the remaining 4 are the same errors at shifted
  lines. Zero new errors.
- Net test-count delta vs baseline is negative by design: the deleted
  `seedThreadIntelligence.test.ts` (~45 quarantine cases for a layer that
  no longer exists) and the scripted-thread cases were replaced by the
  15 seed-kill guards + rewritten resolver/Center/compose contracts.

FOUNDER_ACCEPTED=NO · FREEZE=HOLD · PASS2=NO (unchanged; no merge, no push).
