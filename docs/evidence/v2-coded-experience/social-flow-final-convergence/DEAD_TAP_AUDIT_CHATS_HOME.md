# Dead-tap audit — Chats + Home + Create tranche

**HOLD.** Modes: ACTIVE | INFO | GESTURE | CONDITIONAL | DEPENDENCY

## CHATS-00 (`476:2`)

| Control | Mode | Notes |
|---------|------|-------|
| Chats list row | ACTIVE | Opens real conversation via `openChat` |
| Search | ACTIVE | Filters real rows |
| New | ACTIVE | Opens `NewChatPicker` |
| New → Open direct | ACTIVE | `ensureDirectConversation` / existing dyad |
| New → Create group | ACTIVE | `createGroupConversation` (2+ peers) |
| New → Invite someone | ACTIVE | Falls back to `FindPeopleFlow` |
| Calls segment | DEPENDENCY | Gate note — no fake call UI |
| Direct / Group labels | INFO | Prevents group masquerading as person |
| Unread badge | INFO | When backend/session tracks unread |

## Direct / group conversation

| Control | Mode | Notes |
|---------|------|-------|
| Back | ACTIVE | Returns to Chats list |
| Plan | ACTIVE | WHO skip → `GraphCreateFlow` with known WHO |
| Composer / send | ACTIVE | Phoenix + BEAM |
| Call / Video | DEPENDENCY | Hidden unless capability (`showCallVideo`) |
| Opal filament / consequence | INFO | Visually separate from human bubbles |
| Sender name in bubble | CONDITIONAL | Groups: explicit; direct: header + direction |

## OGX Home (`287:6` partial)

| Control | Mode | Notes |
|---------|------|-------|
| Author / avatar | ACTIVE | Profile |
| Memory media | DEPENDENCY | Memory detail gated honestly |
| Heart / Like | ACTIVE | In-place like |
| Comment / Repost / Forward | DEPENDENCY | Honest gate note |
| Save | ACTIVE | Local private save |
| Graph body / Open Graph | ACTIVE | `GraphDetailSheet` |
| I'd go | ACTIVE | Soft interest only (not WHO, not attendance) |
| Live Open | ACTIVE | Live overlay surface |
| Discovery Follow | ACTIVE | FollowGraph only — Follow ≠ Connection |
| Story cell | DEPENDENCY | Temporary viewer note |
| Story + | DEPENDENCY | STORY-02 create |
| People Pulse | ACTIVE | Routes MEMORY/GRAPH/LIVE |

## GRAPHS-00 / Create

| Control | Mode | Notes |
|---------|------|-------|
| Create Graph | ACTIVE | → 149:31 |
| Library / recent | ACTIVE | → 145:216 |
| Camera | DEPENDENCY | Web capture gated |
| Add to graph | ACTIVE | Local lineage + return Graphs |
| Lenses | ACTIVE | Filter only |

## Dock (`473:17` Option B)

| Control | Mode | Notes |
|---------|------|-------|
| Home / Chats / Graphs / You | ACTIVE | |
| Opal float | ACTIVE | Rest / Listening ambient |
| Permanent + | — | **Not present** (`deferred`) |

## Rule honored

No visible ACTIVE control routes to Home solely because its real destination is missing. DEPENDENCY controls show honest gate copy.
