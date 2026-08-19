import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

describe("CHATS-00 + New chat contract", () => {
  it("dock Chats lands on ChatsHome 476:2", () => {
    const app = readFileSync(resolve(root, "OpalApp.tsx"), "utf8");
    const chats = readFileSync(resolve(root, "opalUi/ChatsHome.tsx"), "utf8");
    expect(app).toMatch(/tab === "chats"/);
    expect(app).toMatch(/ChatsHome/);
    expect(chats).toMatch(/476:2/);
    expect(chats).toMatch(/data-kind=\{r\.kind\}/);
    expect(chats).toMatch(/previewSender|Group/);
    expect(chats).toMatch(/unread/);
  });

  it("New chat uses NewChatPicker with ensure_direct / explicit group", () => {
    const app = readFileSync(resolve(root, "OpalApp.tsx"), "utf8");
    const picker = readFileSync(resolve(root, "opalUi/NewChatPicker.tsx"), "utf8");
    expect(app).toMatch(/NewChatPicker/);
    expect(app).toMatch(/ensureDirectConversation/);
    expect(app).toMatch(/createGroupConversation/);
    expect(app).toMatch(/setNewChatOpen\(true\)/);
    expect(picker).toMatch(/never widens a dyad/i);
    expect(picker).toMatch(/Open direct/);
    expect(picker).toMatch(/Create group/);
  });

  it("group cannot masquerade as person in list rows", () => {
    const chats = readFileSync(resolve(root, "opalUi/ChatsHome.tsx"), "utf8");
    expect(chats).toMatch(/· Group/);
    expect(chats).toMatch(/· Direct/);
  });
});
