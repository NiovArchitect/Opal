import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../..");
const read = (rel: string) => readFileSync(resolve(root, "src", rel), "utf8");

describe("call entry", () => {
  it("CALL_BUTTON_CLICK_SUITE", () => {
    const thread = read("opalUi/GraphPeopleThread.tsx");
    const button = thread.slice(
      thread.indexOf("aria-label={`Call ${peerName}`}"),
      thread.indexOf('data-testid="gpt-video"'),
    );
    expect(button).toContain('data-testid="gpt-call"');
    expect(button).toContain("onCall?.()");
    expect(button).not.toContain("disabled");
    expect(button).not.toContain("pointer-events");
    // Paste W 2.3: calendar/plan icon removed from thread header
    expect(thread).not.toContain('data-testid="gpt-plan"');
  });

  it("CALL_CREATE_NO_SILENT_GUARD_SUITE", () => {
    const app = read("OpalApp.tsx");
    const start = app.indexOf("onCall={() => {");
    const handler = app.slice(start, start + 1800);
    expect(handler).toMatch(/setCallsGateNote\(/);
    expect(handler).toContain("createConversationCall");
    expect(handler).not.toMatch(/assist|Deepgram|transcription/i);
    // Every early return in the thread call path must set a visible gate note.
    const returns = handler.split("return;");
    expect(returns.length).toBeGreaterThan(1);
    for (const part of returns.slice(0, -1)) {
      expect(part).toMatch(/setCallsGateNote\(/);
    }
  });

  it("CALL_CREATE_COOKIE_AUTH_SUITE", () => {
    const client = read("api/productClient.ts");
    const fn = client.slice(
      client.indexOf("export async function createConversationCall"),
      client.indexOf("export type ProductCallHistory"),
    );
    expect(fn).toContain("bearer?: string");
    expect(fn).toContain("conversation_id: conversationId");
    const request = client.slice(client.indexOf("async function request"), client.indexOf("async function request") + 900);
    expect(request).toContain('credentials: "include"');
  });

  it("CALL_CREATE_AFTER_RECONNECT_SUITE does not let Assist own the button", () => {
    const app = read("OpalApp.tsx");
    const start = app.indexOf("onCall={() => {");
    const handler = app.slice(start, start + 1800);
    expect(handler).not.toMatch(/placingCallRef\.current = true[\s\S]*assist/i);
    expect(handler).toContain("createConversationCall");
  });
});
