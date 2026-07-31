# Slice 2 Agent Assignments

**Program lead:** Agent Zero  
**Branch:** `build/slice-2-realtime-mobile-foundation`  
**Base:** main @ `8c018b9` (Slice 1 merged)

| Role | Ownership |
|------|-----------|
| Elixir/OTP Realtime Architect | Channel design, ordering, supervision |
| Phoenix Channels Engineer | UserSocket, ConversationChannel, events |
| Presence owner | OpalCoreWeb.Presence |
| Mobile / Expo Engineer | `apps/opal_mobile` |
| Offline/Sync | Local pending + reconciliation helpers |
| Realtime Test Architect | Channel/journey tests |
| Privacy/Auth Reviewer | DevAuth socket connect; membership |
| CI/CD | Workflow expansion if needed |

No parallel edits of the same files.
