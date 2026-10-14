# Person / Call → Chat — ID-stable routing + privacy-correct profile

**Freeze:** HOLD · **Pass 2:** LOCKED · **CAPABILITY_LOSS:** 0  
**States:** IMPLEMENTED → PROVEN (Playwright) · FOUNDER ACCEPTED = PENDING (phone)

## Root cause

`openChatForPersonName` treated **display-name fuzzy matching** (`includes` both ways) as primary authority for Message / Continuity → Chat. Call Continuity and Person Profile only carried names — no `conversationId` / `peerUserId`. When seed remapping, empty live inbox, or name mismatch occurred on device, Message could land on **generic Chats home** (or New Chat sheet) instead of that person's thread. Automation that only asserted “Maya” somewhere in the DOM was insufficient.

## Fix — ID-stable flow

```text
PersonChatTarget { conversationId?, peerUserId?, displayName? }
  → resolvePersonChatTarget (pure)
      1. conversationId (remap seed-chat-* → live UUID when present)
      2. peerUserId → existing direct dyad
      3. founder seed key (seed on) → seed-chat-* / remapped
      4. exact display-name dyad only (no substring fuzzy)
      5. new_chat intent for that person (never bare Chats home)
  → openChat(conversationId) OR ensureDirectConversation(peerUserId) → openChat
```

Wiring:

- `FOUNDER_CALLS_CONTINUITY_ROWS` carry `conversationId` (`seed-chat-maya`, `seed-chat-chanelle`, …)
- `callContinuity` state carries `conversationId` + `peerUserId`
- Person profile resolves `profileConversationId` / `profileContactId` before Message
- Message captures IDs **before** clearing overlay state

## Privacy boundary (contact fields)

| Field | Visible to owner | Relationship / peer |
|---|---|---|
| Avatar, display name, @handle | Yes | Public Opal identity when known |
| Relationship / context label | Yes (user-set) | User's own RU-1 type |
| Shared Graphs / plans | Yes | Membership-gated |
| `sharedPhone` | Yes when authorized | Only when relationship-shared |
| `ownerPrivatePhone` / email / notes | Yes — “Only visible to you” | **Never** written into `communication_bounds` / relationship templates from address-book import |
| Address | Not inferred | Not shown |

Saving a phone on Person Profile writes **owner-private local meta only** — it does not promote into relationship bounds.

## Proof

| Journey | Result |
|---|---|
| CALL_TO_CHAT_THREAD (Maya Continuity → Chat) | YES |
| PERSON_PROFILE_TO_CHAT_MAYA (profile Message) | YES |
| PERSON_CALL_TO_CHAT_CHANELLE | YES |
| LIVE_IDENTITY_CHAT_PATH (documented) | YES — `peerUserId` → ensure → openChat |
| CAPABILITY_LOSS / PASS2_UNLOCKED / FAKE_SUCCESS | 0 / NO / 0 |

Unit: `apps/opal_web/src/opalUi/openPersonChat.test.ts`  
Runtime: `docs/evidence/founder_reality_repair_3/VERIFY.json` via `verify_repair_3.mjs`

### Live / non-fixture identity path

For a real connected peer (not founder seed):

1. Continuity / profile must pass `peerUserId` and/or live `conversationId`
2. `resolvePersonChatTarget` opens existing dyad when present
3. Else `ensureDirectConversation(peerUserId)` creates permitted direct and opens it
4. Display name is label-only — never the open authority

## Files changed

- `apps/opal_web/src/opalUi/openPersonChat.ts` (+ test)
- `apps/opal_web/src/opalUi/callsContinuitySeed.ts`
- `apps/opal_web/src/opalUi/relationshipTypes.ts` — owner-private vs shared phone
- `apps/opal_web/src/opalUi/GraphProfilePage.tsx` — handle, Audio/Video Call, privacy phone
- `apps/opal_web/src/opalUi/ContactProfileSheet.tsx` — handle, Video, Plan, privacy phone
- `apps/opal_web/src/OpalApp.tsx` — `openChatForPerson`, continuity/profile ID wiring
- `apps/opal_web/src/styles.css` — handle / privacy chrome
- `docs/evidence/founder_reality_repair_3/verify_repair_3.mjs`
