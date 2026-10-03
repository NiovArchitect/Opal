import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

describe("CHATS-00 + New chat contract", () => {
  it("dock Chats lands on ChatsHome 618:271; Chats|Calls mode is CURRENT 928:3", () => {
    const app = readFileSync(resolve(root, "OpalApp.tsx"), "utf8");
    const chats = readFileSync(resolve(root, "opalUi/ChatsHome.tsx"), "utf8");
    expect(app).toMatch(/tab === "chats"/);
    expect(app).toMatch(/ChatsHome/);
    expect(chats).toMatch(/618:271/);
    expect(chats).toMatch(/data-kind=\{r\.kind\}/);
    expect(chats).toMatch(/previewSender|Group/);
    expect(chats).toMatch(/unread/);
    expect(chats).not.toMatch(/role="tablist"/);
    expect(chats).toMatch(/Messages, calls, and what/);
    // P2 CURRENT — Calls Continuity mode switch (not Messages/Calls)
    expect(chats).toMatch(/comm-mode-bar/);
    expect(chats).toMatch(/The people you've been calling/);
    expect(app).toMatch(/onOpenCallGraph/);
    expect(app).toMatch(/onCallBack/);
  });

  it("New chat opens Search PEOPLE mode; picker remains for ensure_direct / group", () => {
    const app = readFileSync(resolve(root, "OpalApp.tsx"), "utf8");
    const picker = readFileSync(resolve(root, "opalUi/NewChatPicker.tsx"), "utf8");
    expect(app).toMatch(/NewChatPicker/);
    expect(app).toMatch(/ensureDirectConversation/);
    expect(app).toMatch(/createGroupConversation/);
    // 618:271 New + → Search PEOPLE (not modal-first)
    expect(app).toMatch(/setSearchInitialMode\(\"People\"\)/);
    expect(app).toMatch(/setSearchOpen\(true\)/);
    expect(picker).toMatch(/never widens a dyad/i);
    expect(picker).toMatch(/Open direct/);
    expect(picker).toMatch(/Create group/);
  });

  it("group cannot masquerade as person in list rows", () => {
    const chats = readFileSync(resolve(root, "opalUi/ChatsHome.tsx"), "utf8");
    expect(chats).toMatch(/· Group/);
    expect(chats).toMatch(/· Direct/);
  });

  it("filters test residue conversations out of founder Chats", () => {
    const chats = readFileSync(resolve(root, "opalUi/ChatsHome.tsx"), "utf8");
    expect(chats).toMatch(/isTestResidueConversation/);
  });
});
