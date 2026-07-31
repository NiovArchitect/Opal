# Build Slice 2 Report

**Branch tip:** see git  
**Starting SHA:** `8c018b996616733c7da534e6be1d9b386f26ca0b`

## Gate matrix (local)

| # | Gate | Status | Evidence |
|---|------|--------|----------|
| 1 | Repository | PASS | Isolated Opal; slice-2 branch |
| 2 | Channels | PASS | UserSocket + ConversationChannel |
| 3 | Join auth | PASS | member join / non-member reject tests |
| 4 | Message send + ordering | PASS | server_seq + idempotent client_message_id |
| 5 | Delivery ack | PASS | ack_delivered → message:delivered broadcast |
| 6 | Presence | PASS | presence:state after join |
| 7 | History sync | PASS | history:sync after_server_seq |
| 8 | Mobile shell | PASS | Expo TS conversation + local store |
| 9 | Local reconciliation | PASS | upsertMessage unit test |
| 10 | AI regression | PASS | Slice 1 suite still green |
| 11 | DevAuth exclusion | PASS | socket connect fails when DevAuth off |
| 12 | No Node backend | PASS | only mobile client package.json |
| 13 | Local operability | PASS | mix test |
| 14 | Remote CI | PARTIAL_PASS until Actions green on PR |

## Tests

| Suite | Count (approx) |
|-------|----------------|
| Elixir total | 44 (38 slice1 + 6 channel) |
| Python | 8 (unchanged) |
| Mobile unit | 1 |

## Delivery model limitation

`delivered` means the recipient’s authenticated active channel acknowledged the server message.  
It does **not** mean device push, offline APNs/FCM, or “read.”
