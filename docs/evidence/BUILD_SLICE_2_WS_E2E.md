# Slice 2 — True Two-Client Websocket E2E

**Command:**

```bash
# with opal_core healthy on :4000
cd tests/journeys && npm install && node slice_2_two_client_websocket.mjs
```

**Date:** 2026-07-31  
**Transport:** real Phoenix `/socket` via `phoenix` + `ws` (not ChannelCase)

## Results

```
health ok
non-member join rejected
both sockets connected / joined
sender override rejected
send ok + jordan message:new
sender self-ack rejected
unknown message ack rejected
delivery ack ok + idempotent duplicate
jordan disconnect + 3 missed messages
reconnect + history:sync ordered [8,9,10]
cross-conversation ack rejected
ALL WEBSOCKET E2E CHECKS PASSED
```

Exit code: **0**
