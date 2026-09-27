import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  normalizeMessage,
  reconcileMessages,
  type ChannelMessage,
} from "./RealtimeClient";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function msg(partial: Partial<ChannelMessage> & Pick<ChannelMessage, "id" | "server_seq" | "body">): ChannelMessage {
  return {
    conversation_id: "c1",
    sender_user_id: "u1",
    client_message_id: partial.client_message_id,
    ...partial,
  };
}

describe("realtime client architecture", () => {
  it("depends on official phoenix package", () => {
    const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
    expect(pkg.dependencies.phoenix).toBeTruthy();
  });

  it("centralizes socket ticket and channel join", () => {
    const rt = readFileSync(resolve(root, "src/realtime/RealtimeClient.ts"), "utf8");
    expect(rt).toMatch(/fetchSocketTicket/);
    expect(rt).toMatch(/conversation:\$\{/);
    expect(rt).toMatch(/history:sync/);
    expect(rt).toMatch(/message:new/);
    expect(rt).toMatch(/inbox:message/);
    expect(rt).toMatch(/joinUserInbox\(\)/);
    expect(rt).not.toMatch(/localStorage\.setItem\([^)]*ticket/);
    expect(rt).toMatch(/sessionStorage/);
  });

  it("exposes raw socket diagnostics beyond UI debounce", () => {
    const rt = readFileSync(resolve(root, "src/realtime/RealtimeClient.ts"), "utf8");
    expect(rt).toMatch(/getDiagnostics/);
    expect(rt).toMatch(/reconnectScheduleCount/);
    expect(rt).toMatch(/connectCount/);
    expect(rt).toMatch(/closeCount/);
    expect(rt).toMatch(/connectedLifetimeMs/);
    expect(rt).toMatch(/joinedChannels/);
    expect(rt).toMatch(/lastServerSeqByConversation/);
    // Pass 26 join/auth trail (evidence-only)
    expect(rt).toMatch(/lastJoinAttempt/);
    expect(rt).toMatch(/socketAuthSuccess/);
    expect(rt).toMatch(/channelJoinAttemptCount/);
    // Debounce alone is not proof — metrics must exist for founder thrash gate.
    expect(rt).toMatch(/notePossibleOutage/);
  });

  it("clears loadError when reopening chat after prior join deny", () => {
    const app = readFileSync(resolve(root, "src/OpalApp.tsx"), "utf8");
    const idx = app.indexOf("const openChat = async");
    const slice = app.slice(idx, idx + 400);
    expect(slice).toMatch(/setLoadError\(null\)/);
  });

  it("sign-out clears invite continuation from sessionStorage", () => {
    const app = readFileSync(resolve(root, "src/OpalApp.tsx"), "utf8");
    // Continuation must not survive sign-out
    expect(app).toMatch(/onSignOut/);
    expect(app).toMatch(/sessionStorage\.removeItem\([\"']opal_invite_continuation[\"']\)/);
    // Present in sign-out path (after productRealtime.stop)
    const idx = app.indexOf("onSignOut");
    const slice = app.slice(idx, idx + 800);
    expect(slice).toMatch(/opal_invite_continuation/);
  });

  it("OpalApp starts realtime, joins, and stops on sign-out", () => {
    const app = readFileSync(resolve(root, "src/OpalApp.tsx"), "utf8");
    expect(app).toMatch(/productRealtime\.start/);
    expect(app).toMatch(/joinConversation/);
    expect(app).toMatch(/leaveConversation/);
    expect(app).toMatch(/productRealtime\.stop/);
    expect(app).toMatch(/data-testid=\"sign-out\"/);
  });

  it("HTTP product create path broadcasts message:new", () => {
    const ctrl = readFileSync(
      resolve(
        root,
        "../opal_core/lib/opal_core_web/controllers/conversation_controller.ex",
      ),
      "utf8",
    );
    expect(ctrl).toMatch(/message:new/);
    expect(ctrl).toMatch(/Inbox\.fanout_message/);
    expect(ctrl).toMatch(/Endpoint\.broadcast/);
  });
});

describe("message reconciliation", () => {
  it("dedupes by id and client_message_id, not text", () => {
    const a = msg({ id: "1", server_seq: 1, body: "hello", client_message_id: "cm-1" });
    const b = msg({ id: "1", server_seq: 1, body: "hello", client_message_id: "cm-1" });
    const c = msg({ id: "2", server_seq: 2, body: "hello", client_message_id: "cm-2" });
    const d = msg({ id: "3", server_seq: 3, body: "hello", client_message_id: "cm-1" });
    const out = reconcileMessages([a], [b, c, d]);
    expect(out.map((m) => m.id)).toEqual(["1", "2"]);
  });

  it("orders by server_seq when events arrive out of order", () => {
    const out = reconcileMessages(
      [],
      [
        msg({ id: "b", server_seq: 2, body: "second" }),
        msg({ id: "a", server_seq: 1, body: "first" }),
        msg({ id: "c", server_seq: 3, body: "third" }),
      ],
    );
    expect(out.map((m) => m.id)).toEqual(["a", "b", "c"]);
  });

  it("history:sync after live event does not duplicate", () => {
    const live = msg({ id: "x", server_seq: 5, body: "live", client_message_id: "cm-x" });
    const hist = msg({ id: "x", server_seq: 5, body: "live", client_message_id: "cm-x" });
    expect(reconcileMessages([live], [hist])).toHaveLength(1);
  });

  it("normalizes message:new envelope and bare message", () => {
    const env = normalizeMessage({
      schema_version: "0.1.0",
      message: {
        id: "m1",
        body: "hi",
        conversation_id: "c1",
        sender_user_id: "u1",
        server_seq: 9,
        client_message_id: "cm",
      },
    });
    expect(env?.id).toBe("m1");
    expect(env?.server_seq).toBe(9);
    const bare = normalizeMessage({
      id: "m2",
      body: "yo",
      conversation_id: "c1",
      sender_user_id: "u2",
      server_seq: 10,
    });
    expect(bare?.id).toBe("m2");
  });
});
