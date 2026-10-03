# Chat dock badge authority (9+)

## Diagnosis

| Key | Value |
|-----|--------|
| CURRENT_SERVER_UNREAD_COUNT_WALK_A | **395** (92/121 convs with unread, pre-hygiene) → **0** after hygiene |
| CURRENT_SERVER_UNREAD_COUNT_WALK_B | **184** (34/47 convs with unread, pre-hygiene) → **0** after hygiene |
| CLIENT_BADGE_SOURCE | `dockUnreadCount(chats, activeChatId)` (`realtime/inboxState.ts`) fed into `DockUnread` (`OpalApp.tsx`); per-row unread from server `unread_count` |
| 9_PLUS_SOURCE | `formatUnread(count)` in `opalUi/dockUnreadDisplay.ts` (`count > 9 ? "9+" : String(count)`); used by dock + `ChatsHome` |
| IS_9_PLUS_FIXTURE | **NO** |
| IS_9_PLUS_STALE | **NO** |
| IS_9_PLUS_REAL_UNREAD | **YES** (soak/lab residue: Multi speaker, Soak soak7, Founder Review, Deep Smoke, Collective proof, Friends Saturday, etc.) |
| HARDCODED_9_PLUS_AS_PRODUCT_TRUTH | **0** |

## What 9+ is not

- Not a hardcoded product-truth badge independent of server unread.
- Not a stale client cache inventing unread.
- Not Attention Center badge (separate Needs You / `AttentionAuthority` count).

## Hygiene

`scripts/shell_unread_hygiene.mjs` POSTs `/api/v1/product/conversations/:id/read` for every conversation with `unread_count > 0` except Fort Oak `ace99adc-db67-4258-9d95-f612246c6c84` (kept as-is). Evidence: `UNREAD_HYGIENE.json`.

## Proofs

- Unit: `apps/opal_web/src/opalUi/dockUnreadDisplay.test.ts` (GREEN)
- Browser geometry + badge: `scripts/mobile_shell_geometry_proof.mjs` → `MOBILE_SHELL_GEOMETRY_PROOF.json` (GREEN; `CHAT_BADGE_CHANGES_WITH_READ_STATE` PASS)
