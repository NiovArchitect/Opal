/**
 * Slice #1 — source contracts for two-user chat substrate.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "..");
const read = (rel: string) => readFileSync(resolve(root, rel), "utf8");

describe("Slice #1 two-user chat wiring", () => {
  it("maps server unread_count into Chats list", () => {
    const app = read("OpalApp.tsx");
    expect(app).toMatch(/unread:\s*typeof c\.unread_count === "number"/);
    expect(app).toMatch(/markConversationRead/);
  });

  it("New Chat supports message-by-phone resolve path", () => {
    const picker = read("opalUi/NewChatPicker.tsx");
    const app = read("OpalApp.tsx");
    expect(picker).toMatch(/onMessageByPhone/);
    expect(picker).toMatch(/new-chat-message-by-phone/);
    expect(app).toMatch(/resolveContactPhone/);
    expect(app).toMatch(/onMessageByPhone/);
    expect(app).toMatch(/setNewChatOpen\(true\)/);
  });

  it("productClient exposes markConversationRead + resolveContactPhone", () => {
    const client = read("api/productClient.ts");
    expect(client).toMatch(/markConversationRead/);
    expect(client).toMatch(/conversations\/\$\{.*\}\/read/);
    expect(client).toMatch(/resolveContactPhone/);
    expect(client).toMatch(/contacts\/resolve/);
  });
});
