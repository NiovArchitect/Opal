# P0-05.1 COMMUNICATION SEED / RUNTIME REHYDRATION — HOLD RETURN

## A. HOLD

```
HOLD.
DO NOT MERGE.
permissionToStartLive = NO.
LIVE BLOCKED.
GLOBAL OPAL PAUSED.
```

---

## B. Starting Git state

| | |
|---|---|
| Branch | `build/v2-coded-experience-closure` |
| HEAD (start) | `f78d054` |
| Tree | clean |
| Authority guard | GREEN |

---

## C. Exact root cause of empty Chats

**Root cause #10 (primary):** `?opal_founder_seed=1` controlled **Home FOUNDER_FIXTURE only**. Chats always hydrate exclusively via `GET /api/v1/product/conversations` → `Messages.list_conversations`. The authenticated founder phone user had **zero** `ConversationMember` rows.

Also observed: no parallel founder chat UI existed (correct firewall), so missing seed data surfaced as “No conversations yet.”

Not: API 401 translating to []; not production fixture leak; not visual Chats redesign needed.

---

## D. Existing domain owners

| Concern | Owner |
|---|---|
| Direct / Group / list | `OpalCore.Messages` |
| HTTP | `ConversationController` + new `FounderSeedController` (thin) |
| Client list | `listConversations` → `ChatsHome` |
| Seed orchestration | `FounderCommunicationSeed.ensure!` → `ensure_direct_conversation` / `create_group_conversation` / `accept_message` |
| Calls | existing `CallSurfaces` |
| Shared Graph plate | existing `GraphPeopleThread` |

**PARALLEL_CHAT_OWNER = 0** · **PARALLEL_GROUP_OWNER = 0** · **PARALLEL_CALL_OWNER = 0**

---

## E. Production / founder firewall

| Check | Result |
|---|---|
| `?opal_founder_seed=0` → Chats rows | **0** |
| sticky seed session | null |
| seed without `explicit_opt_in` | **422** `explicit_opt_in_required` |
| `:allow_founder_communication_seed` | true in dev/test only (default false) |

**PRODUCTION_FIXTURE_LEAK = 0** · **FOUNDER_SEED_OPT_IN_ONLY = true**

---

## F. Seeded IDs (stable)

| Person | User ID |
|---|---|
| Chanelle | `f0c4a4e1-1111-4111-8111-c4a4e1100001` |
| Maya | `a4444444-4444-4444-8444-444444444444` |
| Jordan | `a2222222-2222-4222-8222-222222222222` |
| Sabrina | `f0c4a4e1-1111-4111-8111-c4a4e1100004` |

Direct peer: Chanelle · Group label: **Saturday Crew** (Founder + Chanelle + Maya + Jordan).  
Conversation IDs are idempotent per viewer (created on first ensure).

---

## G–J. Reopen proofs

From `REOPEN_PROOF.json` + screenshots:

| Surface | Result |
|---|---|
| Chats non-empty | PASS (seed → listConversations) |
| Direct | `data-chat-kind=direct`, Juniper img, Call/Video/Plan, composer, dock |
| Incoming / Audio / Video | dock=false, Flip=false, Speaker present on audio |
| Group | Shared Graph, send `↑`, Call/Video |
| Group call | kind=group, dock=false, Flip=false |
| Teardown | call cleared, dock restored, no Calls Request |

---

## K. Regression tests

- `apps/opal_core/test/opal_core/social_flow/founder_communication_seed_test.exs` — 3 PASS  
- `apps/opal_web/src/opalUi/founderCommunicationSeed.test.ts` — 4 PASS  

---

## L. Authority guard

**GREEN**

---

## M. Changed files (material)

- `apps/opal_core/lib/opal_core/social_flow/founder_communication_seed.ex` (new)
- `apps/opal_core/lib/opal_core_web/controllers/founder_seed_controller.ex` (new)
- `apps/opal_core/lib/opal_core_web/router.ex`
- `apps/opal_core/lib/opal_core/messages.ex` (human group label as title)
- `apps/opal_core/config/dev.exs`, `test.exs`
- `apps/opal_web/src/api/productClient.ts`
- `apps/opal_web/src/OpalApp.tsx`
- `apps/opal_web/src/opalUi/founderGraphSeed.ts` (sticky opt-in)
- tests + authority YAML updates + evidence

---

## N–O. Checkpoint

Committed on branch; tree clean after commit (see return tip).

---

## P. Runtime

Vite + Phoenix local; founder URL with `opal_founder_seed=1`.

---

## Q. Smoke matrix

Home · Graphs All/Action/Ready · Chats · Direct · Calls · Group · teardown — exercised in reopen proof.  
Activity icon untouched (**FOUNDER_REVIEW_REQUIRED**).

---

## R. Objective remaining defects

None for empty-Chats root cause.  
Activity icon remains founder judgment.

---

## S. Founder-only decisions

Activity icon.

---

## T. FOUNDER_WALK_READY

```
FOUNDER_WALK_READY = YES
```

---

## U. Founder URL

```
http://127.0.0.1:5173/?opal_reset_first_run=1&opal_founder_seed=1
```

---

## V. STOP

```
HOLD.
DO NOT MERGE.
NO LIVE.
NO GLOBAL OPAL.
permissionToStartLive = NO.
```
