/**
 * Repair #18 (W4-01) — client send idempotency.
 *
 * Walk #4: five presses of send on one composed message produced
 * five stored messages because every HTTP call minted a fresh
 * random client_message_id. The contract now:
 *  - one idempotency key per COMPOSED message (per conversation +
 *    body), minted once and reused by every delivery attempt of
 *    that message (double-tap while in flight, retry after failure);
 *  - a successful delivery releases the slot, so a later genuinely
 *    new send of the same words gets a fresh key;
 *  - a failed delivery keeps the slot, so the honest retry reuses
 *    the same key and the server can dedupe it;
 *  - the composer locks while a send is in flight (OpalApp send
 *    guard + disabled send button).
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { pendingSendKey, settleSendKey } from "./productClient";

const CONV = "conv-w4-01";
const BODY = "Schedule 7 am church at Awaken";

describe("W4-01 send idempotency key registry", () => {
  it("mints one key per composed message and reuses it across attempts", () => {
    const first = pendingSendKey(CONV, BODY);
    const second = pendingSendKey(CONV, BODY);
    expect(first).toBeTruthy();
    expect(second).toBe(first);
    settleSendKey(CONV, BODY, true);
  });

  it("a failed delivery keeps the key so the retry reuses it", () => {
    const first = pendingSendKey(CONV, BODY);
    settleSendKey(CONV, BODY, false);
    expect(pendingSendKey(CONV, BODY)).toBe(first);
    settleSendKey(CONV, BODY, true);
  });

  it("a successful delivery releases the slot: the next send of the same words is a new message", () => {
    const first = pendingSendKey(CONV, BODY);
    settleSendKey(CONV, BODY, true);
    const next = pendingSendKey(CONV, BODY);
    expect(next).not.toBe(first);
    settleSendKey(CONV, BODY, true);
  });

  it("different bodies and different conversations get different keys", () => {
    const a = pendingSendKey(CONV, BODY);
    const b = pendingSendKey(CONV, "a different message");
    const c = pendingSendKey("conv-other", BODY);
    expect(b).not.toBe(a);
    expect(c).not.toBe(a);
    expect(c).not.toBe(b);
    settleSendKey(CONV, BODY, true);
    settleSendKey(CONV, "a different message", true);
    settleSendKey("conv-other", BODY, true);
  });
});

describe("W4-01 send path wiring (source-level)", () => {
  const clientSrc = fs.readFileSync(path.join(__dirname, "productClient.ts"), "utf8");
  const appSrc = fs.readFileSync(path.join(__dirname, "..", "OpalApp.tsx"), "utf8");

  it("sendMessage sends the composed message's pending key, not a per-call random one", () => {
    const sendSrc = clientSrc.slice(
      clientSrc.indexOf("export async function sendMessage"),
      clientSrc.indexOf("export async function sendVoiceMessage"),
    );
    expect(sendSrc).toContain("pendingSendKey(conversationId, body)");
    expect(sendSrc).toContain("client_message_id: clientMessageId");
    expect(sendSrc).toContain("settleSendKey(conversationId, body, true)");
    expect(sendSrc).toContain("settleSendKey(conversationId, body, false)");
    expect(sendSrc).not.toContain("Date.now()");
  });

  it("the composer send is locked in flight", () => {
    const sendFn = appSrc.slice(
      appSrc.indexOf("const send = async () => {"),
      appSrc.indexOf("Brand V4 / Direct open"),
    );
    expect(sendFn).toContain("if (sendInFlightRef.current) return;");
    expect(sendFn).toContain("releaseSendLock()");
    expect(appSrc).toContain('data-send-in-flight={sendInFlight ? "true" : "false"}');
    expect(appSrc).toContain("disabled={!draft.trim() || sendInFlight}");
  });

  it("the failed bubble carries the composed message's key for its retry", () => {
    expect(appSrc).toContain("clientMessageId: pendingSendKey(activeChatId, body)");
  });
});
