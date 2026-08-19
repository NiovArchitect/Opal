# Adversarial notes — Chats / Home tranche

**HOLD.** Multi-human authority must deny bad actors in the BEAM, not only hide UI.

## Pair (A ↔ B)

| Check | Expected | Status |
|-------|----------|--------|
| Direct thread A↔B | Exact dyad via `ensure_direct` | Supported by `ensureDirectConversation` |
| Send both directions | Phoenix channel + BEAM messages | Existing realtime path |
| Plan from B | WHO skipped; `data-who-skip`; GraphCreate with known WHO | Wired in `OpalApp` Plan handler |
| Context preserved | knownWho survives create entry | `graphCreateContext` |

## Group (A/B/C/D)

| Check | Expected | Status |
|-------|----------|--------|
| Multi speaker attribution | `messageSpeaker` + sender header | Existing |
| Group title ≠ dyad | composition/member_count gates | Existing + NewChatPicker refuse |
| Explicit group create | `createGroupConversation` | Wired from New chat |
| Unauthorized E denied | Server membership | Domain authority (not UI-only) |

## Home

| Check | Expected | Status |
|-------|----------|--------|
| Distinct profiles/memories/graphs | Person-scoped cards; no leakage | Founder seed + filters |
| Follow ≠ Connection | Discovery/Follow → FollowGraph only | Gate copy + handlers |
| Interest ≠ attendance | I'd go soft interest | Covered by tests |
| Host ≠ broadcaster | Live card lines | `Live by X · hosted by Y` |
| No 5-card repeat loop | ≥12 stream objects | Seed expanded |

## Bad actor E

| Attempt | Expected |
|---------|----------|
| Read direct / send / subscribe | DENIED by conversation membership |
| Open private Graph / invite-only join | DENIED by Graph joinability / ACL |
| Read private Memory | DENIED by privacy class |
| Spoof `sender_user_id` / participant | DENIED — server authoritative sender |

UI must not claim success for denied actions. Full dual-browser multi-fixture soak remains a known dependency before Level 5 / P31 final.
