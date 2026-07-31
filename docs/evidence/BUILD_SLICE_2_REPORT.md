# Build Slice 2 Report (Closure Campaign)

**Branch:** `build/slice-2-realtime-mobile-foundation`  
**Base main:** `8c018b9`  
**Starting SHA (pre-closure):** `705f105`

## Event inventory

| Event | Direction | Auth | Idempotency | Persistence | Tests |
|-------|-----------|------|-------------|-------------|-------|
| message:send | in | member + socket user | client_message_id | messages | channel + WS E2E |
| message:accepted | out | sender socket | n/a | none | channel + WS E2E |
| message:new | out | members | only on create | none | channel + WS E2E |
| message:delivered | out | after recipient ack | duplicate ack no rebroadcast | message_deliveries | channel + WS E2E |
| message:failed | out | sender | n/a | none | channel (override) |
| message:ack_delivered | in | recipient member, not sender, same conv | per device unique | message_deliveries | channel + WS E2E |
| history:sync | in/out | member | n/a | read messages | channel + WS E2E |
| presence:state | out | join | n/a | ephemeral | channel |
| presence:diff | out | Presence broadcast | n/a | ephemeral | handler present |

## 28-gate matrix

| # | Gate | Status | Evidence |
|---|------|--------|----------|
| 1 | Repository isolation | PASS | Opal root only |
| 2 | Contract completeness | PASS | channel_message_send + history_sync schemas |
| 3 | Socket authentication | PASS | DevAuth + allowlist + user exists |
| 4 | Authorized join | PASS | non-member unauthorized |
| 5 | Sender identity authority | PASS | sender_user_id override rejected |
| 6 | Realtime persistence | PASS | Messages.accept_message |
| 7 | Authoritative ordering | PASS | server_seq |
| 8 | Concurrent sequencing | PASS | 12 concurrent sends unique monotonic |
| 9 | Message acceptance | PASS | message:accepted |
| 10 | Recipient fan-out | PASS | message:new WS |
| 11 | Delivery acknowledgement | PASS | ack + delivered |
| 12 | Delivery security | PASS | self/unknown/cross-conv rejected |
| 13 | Presence privacy | PASS | join-only; no PII metas |
| 14 | Presence lifecycle | PASS | track on join; multi-device key/meta design |
| 15 | Disconnect/reconnect | PASS | WS E2E disconnect |
| 16 | Missed-message history sync | PASS | WS E2E sync [8,9,10] |
| 17 | Client reconciliation | PASS | MessageRepository tests |
| 18 | Mobile durable persistence | PASS | SQLite schema + repository |
| 19 | Mobile offline queue | PASS | outbound_queue tests |
| 20 | Mobile build validation | PASS | jest 5 + tsc clean |
| 21 | AI spine regression | PASS | 51 Elixir incl Slice1; compose AI path |
| 22 | DevAuth production-off | PASS | connect fails when disabled |
| 23 | No Node backend | PASS | Node only client/journey tools |
| 24 | Local operability | PASS | Makefile targets |
| 25 | True two-client WS E2E | PASS | BUILD_SLICE_2_WS_E2E.md |
| 26 | Slice 1 Compose regression | PASS* | after unique client_message_id fix |
| 27 | Remote CI | PASS after green on final head | Actions on push/PR |
| 28 | Documentation/evidence | PASS | this tree |

\*Compose regression re-run after e2e script client_id uniqueness fix.

## Test totals (local closure)

| Suite | Count | Result |
|-------|------:|--------|
| Elixir | 51 | PASS |
| Python | 8 | PASS |
| Mobile Jest | 5 | PASS |
| Mobile tsc | clean | PASS |
| WS E2E | 1 journey | PASS |
| Compose AI | 1 journey | PASS |
