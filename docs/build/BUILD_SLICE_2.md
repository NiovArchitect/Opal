# Build Slice 2

**Branch:** `build/slice-2-realtime-mobile-foundation`  
**Base:** main after Slice 1 merge (`8c018b9`)

## Objective

Two synthetic users connect via Phoenix Channels, exchange a realtime message with authoritative `server_seq`, delivery acknowledgement, presence, reconnect history sync, and a thin Expo shell.

## Delivered

- `/socket` UserSocket + `conversation:<id>` channel
- Events: `message:send`, `message:accepted`, `message:new`, `message:delivered`, `presence:state`, `history:sync`
- Delivery = recipient channel ack (not read, not push)
- Presence metas without PII
- `apps/opal_mobile` conversation shell with local pending + reconciliation
- Channel tests + Slice 1 regression suite

## Explicit non-claims

- Not WhatsApp-complete
- Not production auth / SMS
- Not push delivery
- Not relationship intelligence
