/**
 * True two-client websocket E2E over Phoenix /socket transport.
 * Does not call channel callbacks directly.
 */
import { WebSocket } from "ws";
import { Socket } from "phoenix";

// Phoenix JS expects global WebSocket
globalThis.WebSocket = WebSocket;

const HTTP = process.env.OPAL_CORE_URL || "http://127.0.0.1:4000";
const WS = process.env.OPAL_WS_URL || "ws://127.0.0.1:4000/socket";

const ALEX = "a1111111-1111-4111-8111-111111111111";
const JORDAN = "a2222222-2222-4222-8222-222222222222";
const TAYLOR = "a3333333-3333-4333-8333-333333333333";
const CONV = "b1111111-1111-4111-8111-111111111111";
const CONV_AT = "b2222222-2222-4222-8222-222222222222";

const log = (...a) => console.log("[ws-e2e]", ...a);
const fail = (m) => {
  console.error("[ws-e2e] FAIL:", m);
  process.exit(1);
};

function connectUser(userId, deviceId) {
  return new Promise((resolve, reject) => {
    const socket = new Socket(WS, {
      params: {
        user_id: userId,
        device_id: deviceId,
        app_state: "foreground",
        client_version: "ws-e2e-0.1.0",
      },
      timeout: 10000,
    });
    socket.onOpen(() => resolve(socket));
    socket.onError((e) => reject(e || new Error("socket error")));
    socket.connect();
  });
}

function joinConversation(socket, conversationId) {
  return new Promise((resolve, reject) => {
    const channel = socket.channel(`conversation:${conversationId}`, {});
    channel
      .join()
      .receive("ok", (resp) => resolve({ channel, resp }))
      .receive("error", (err) => reject(err))
      .receive("timeout", () => reject(new Error("join timeout")));
  });
}

function push(channel, event, payload) {
  return new Promise((resolve, reject) => {
    channel
      .push(event, payload)
      .receive("ok", (resp) => resolve(resp))
      .receive("error", (err) => reject(err))
      .receive("timeout", () => reject(new Error(`${event} timeout`)));
  });
}

function waitEvent(channel, event, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout waiting ${event}`)), timeoutMs);
    channel.on(event, (payload) => {
      clearTimeout(t);
      resolve(payload);
    });
  });
}

async function main() {
  // Health
  const health = await fetch(`${HTTP}/health`).then((r) => r.json());
  if (health.status !== "ok") fail("core unhealthy");
  log("health ok");

  // --- negative: non-member join ---
  const taylorSock = await connectUser(TAYLOR, "taylor-ws");
  try {
    await joinConversation(taylorSock, CONV);
    fail("taylor should not join AJ conversation");
  } catch (e) {
    log("non-member join rejected:", JSON.stringify(e));
  }
  taylorSock.disconnect();

  // --- positive two-client path ---
  const alexSock = await connectUser(ALEX, "alex-ws-1");
  const jordanSock = await connectUser(JORDAN, "jordan-ws-1");
  log("both sockets connected");

  const alexJoin = await joinConversation(alexSock, CONV);
  const jordanJoin = await joinConversation(jordanSock, CONV);
  log("both joined", alexJoin.resp, jordanJoin.resp);

  const alexCh = alexJoin.channel;
  const jordanCh = jordanJoin.channel;

  const presenceAlex = await waitEvent(alexCh, "presence:state").catch(() => null);
  if (presenceAlex) log("presence:state keys", Object.keys(presenceAlex));

  // Sender override must fail
  try {
    await push(alexCh, "message:send", {
      schema_version: "0.1.0",
      client_message_id: `override-${Date.now()}`,
      body: "nope",
      sender_user_id: JORDAN,
      trace_id: "trace-ws-override-0001",
    });
    fail("sender override should be rejected");
  } catch (e) {
    if (e.error_code !== "sender_override_rejected") {
      log("override reject payload", e);
    }
    log("sender override rejected");
  }

  const jordanNewP = waitEvent(jordanCh, "message:new");
  const alexAcceptedP = waitEvent(alexCh, "message:accepted");

  const clientMsgId = `ws-msg-${Date.now()}`;
  const sendResp = await push(alexCh, "message:send", {
    schema_version: "0.1.0",
    client_message_id: clientMsgId,
    conversation_id: CONV,
    body: "hello over real websocket",
    trace_id: "trace-ws-happy-0000001",
  });

  if (!sendResp.message || sendResp.message.server_seq < 1) fail("missing server_seq");
  if (sendResp.message.sender_user_id !== ALEX) fail("sender not socket-derived");
  log("send ok seq=", sendResp.message.server_seq, "id=", sendResp.message.id);

  const accepted = await alexAcceptedP;
  if (accepted.message.id !== sendResp.message.id) fail("accepted mismatch");

  const newMsg = await jordanNewP;
  if (newMsg.message.id !== sendResp.message.id) fail("new mismatch");
  log("jordan received message:new");

  // Alex cannot ack own message
  try {
    await push(alexCh, "message:ack_delivered", {
      message_id: sendResp.message.id,
      trace_id: "trace-ws-self-ack-0001",
    });
    fail("sender self-ack should fail");
  } catch {
    log("sender self-ack rejected");
  }

  // Unknown message id
  try {
    await push(jordanCh, "message:ack_delivered", {
      message_id: "00000000-0000-4000-8000-000000000099",
      trace_id: "trace-ws-unknown-0001",
    });
    fail("unknown ack should fail");
  } catch {
    log("unknown message ack rejected");
  }

  // Cross-conversation ack: jordan joins AT? better: jordan tries ack of message while... 
  // Create message on AT as Alex, then Jordan on AJ tries - already covered by wrong conv.
  // Jordan ack of valid message:
  const deliveredP = waitEvent(alexCh, "message:delivered");
  const ack1 = await push(jordanCh, "message:ack_delivered", {
    message_id: sendResp.message.id,
    trace_id: "trace-ws-ack-0000000001",
  });
  if (ack1.origin !== "created") fail("expected created ack");
  const delivered = await deliveredP;
  if (delivered.message_id !== sendResp.message.id) fail("delivered mismatch");
  log("delivery ack ok");

  // Idempotent ack
  const ack2 = await push(jordanCh, "message:ack_delivered", {
    message_id: sendResp.message.id,
    trace_id: "trace-ws-ack-0000000002",
  });
  if (ack2.origin !== "idempotent") fail("expected idempotent ack");
  log("duplicate ack idempotent");

  // --- reconnect journey ---
  const lastSeq = sendResp.message.server_seq;
  log("jordan disconnecting...");
  jordanCh.leave();
  jordanSock.disconnect();
  await new Promise((r) => setTimeout(r, 800));

  // Alex sends while Jordan offline
  const missed = [];
  for (let i = 1; i <= 3; i++) {
    const r = await push(alexCh, "message:send", {
      schema_version: "0.1.0",
      client_message_id: `missed-${Date.now()}-${i}`,
      body: `missed-${i}`,
      trace_id: `trace-ws-missed-00000${i}`,
    });
    missed.push(r.message);
    log("missed msg seq", r.message.server_seq);
  }

  // Jordan reconnects with new socket
  const jordanSock2 = await connectUser(JORDAN, "jordan-ws-2");
  const jordanJoin2 = await joinConversation(jordanSock2, CONV);
  const jordanCh2 = jordanJoin2.channel;
  log("jordan reconnected");

  const sync = await push(jordanCh2, "history:sync", {
    after_server_seq: lastSeq,
  });
  if (!sync.messages || sync.messages.length < 3) {
    fail(`expected >=3 missed messages, got ${sync.messages?.length}`);
  }
  const bodies = sync.messages.map((m) => m.body);
  for (const m of missed) {
    if (!bodies.includes(m.body)) fail(`missing body ${m.body}`);
  }
  // order
  const seqs = sync.messages.map((m) => m.server_seq);
  for (let i = 1; i < seqs.length; i++) {
    if (seqs[i] <= seqs[i - 1]) fail("history not ordered");
  }
  // no duplicates by id
  const ids = sync.messages.map((m) => m.id);
  if (new Set(ids).size !== ids.length) fail("duplicate history ids");
  log("reconnect history sync ok", seqs);

  // non-member presence: Taylor cannot join (already tested)
  // Cross-conv: Alex creates on AT, Jordan AJ cannot ack
  const alexAt = await joinConversation(alexSock, CONV_AT);
  const atMsg = await push(alexAt.channel, "message:send", {
    client_message_id: `at-${Date.now()}`,
    body: "taylor thread",
    trace_id: "trace-ws-at-0000000001",
  });
  try {
    await push(jordanCh2, "message:ack_delivered", {
      message_id: atMsg.message.id,
      trace_id: "trace-ws-cross-ack-001",
    });
    fail("cross-conversation ack should fail");
  } catch {
    log("cross-conversation ack rejected");
  }

  alexSock.disconnect();
  jordanSock2.disconnect();
  log("=== ALL WEBSOCKET E2E CHECKS PASSED ===");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
