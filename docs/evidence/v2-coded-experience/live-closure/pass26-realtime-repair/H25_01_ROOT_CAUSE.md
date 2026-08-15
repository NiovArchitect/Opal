# H-25-01 Root Cause — Channel Join

**Pass:** 26  
**Baseline Pass 25:** `86518e8`  
**Status:** **REPAIRED + RE-SMOKED**

---

## Symptom (Pass 25)

Six OTP-authenticated browsers reached member shell.

`channel_joined = false` for all six.

HTTP multi-client matrix PASS.

Realtime multi-client FAIL.

---

## Trace (live, Pass 26)

| Step | Input | Expected | Actual (pre-repair harness) | Actual (post-repair) |
|------|-------|----------|-----------------------------|----------------------|
| OTP activation | phone + code | session bearer | ok | ok |
| Session storage | bearer | memory via ProductClient | ok (not localStorage inject) | ok |
| Socket ticket | POST `/socket-ticket` + bearer | ticket 120s | 200 | 200 |
| Socket URL | `ws://127.0.0.1:4000/socket` | WS open | open | open |
| UserSocket.connect | `socket_ticket` + `device_id` | auth success | ok | ok |
| Topic | `conversation:<uuid>` | join | **join never attempted** | join ok |
| Membership | ConversationMember | authorize | N/A (no join) | member ok |
| Diagnostics | `joinedChannels` | includes id | **[]** | **[id]** |

### Live proof that transport was healthy

Manual OTP login + People-tab open of conversation `c7f47a18-…`:

- `rawState: connected`
- `socketAuthSuccess: true`
- WS `phx_join` → `phx_reply status=ok`
- `joinedChannels: [conversationId]`

**Phoenix auth + channel membership were never the broken layer.**

---

## Root cause

### Primary: conversation open path never reached `joinConversation`

Product realtime joins **only** when the UI opens a conversation (`openChat` → `productRealtime.joinConversation(id)`).

The six-client soak harness used:

```js
tabbar.locator("button", { hasText: /Chat|Chats|Home/i }).first().click()
```

Product tab bar labels:

| id | label |
|----|-------|
| home | Home |
| chats | **People** |
| plans | Plans |
| you | You |

Regex `/Chat|Chats|Home/i` matches **Home first**.  
Harness stayed on Home. New group conversations often lack Home presence/awaken cards (no consequential signal yet), so `[data-conversation-id="<id>"]` was missing.  
`openChat` never ran → **join never attempted** → `joinedChannels: []` for all six.

### Secondary: F-25-04 selector seam

- People list rows already had `data-conversation-id`
- Home `AwakenSurface` did **not** expose `data-conversation-id` (only PresenceSurface did)
- Token localStorage inject ≠ OTP auth (Pass 25 correct; no second auth mechanism)

### Not the cause

- UserSocket ticket auth
- Topic naming (`conversation:` prefix matches server)
- Membership authorization logic
- SocialReality / domain intelligence

---

## Repair

1. **Harness:** `openConversation` uses **People** tab first (`/^People$/i`), then Home, then People retry.
2. **Product UI:** `AwakenSurface` accepts `conversationId` → `data-conversation-id` for identity continuity.
3. **Diagnostics (evidence-only):** `lastJoinAttempt`, `socketAuthSuccess`, `channelJoinAttemptCount/Ok/Error` on `getDiagnostics()`.
4. **Soak guard:** abort message matrix if pre-matrix channel joins fail (no thrash loops).

No intelligence redesign. No second auth mechanism. No Phoenix config thrash.

---

## Verification

`SOAK_MINUTES=1` six-client soak episode `soak7-msttsy5h`:

- pre_matrix_channel_joins: **all true**
- realtime_message_matrix: **all peers realtime**
- private curate isolation PASS
- explicit share realtime PASS
- network interruption recovery PASS
- stranger 403 PASS
- product_fail: **0**

Full 20-minute soak: run id recorded in PASS26_RESULTS.

---

## Classification

| Item | Verdict |
|------|---------|
| H-25-01 | **CLOSED** (root cause + repair + re-smoke) |
| F-25-04 | **CLOSED** for People-list open; AwakenSurface identity added |
| F-25-02 dyad min-3 | **INTENTIONAL** group API; dyads via invitation/establishment — P2 doc |
| F-25-03 /follows | **P2 OPEN** — durable FollowGraph exists; product HTTP not required for realtime P1 |

HOLD. DO NOT MERGE.
