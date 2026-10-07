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
    expect(chats).toMatch(/people · Group/);
    expect(chats).toMatch(/return "Direct connection"/);
    // Follow ≠ Connection — composition alone must not invent relationship truth
    expect(chats).not.toMatch(/Connection · Group/);
    expect(chats).not.toMatch(/Following · Direct/);
  });

  it("filters test residue conversations out of founder Chats", () => {
    const chats = readFileSync(resolve(root, "opalUi/ChatsHome.tsx"), "utf8");
    expect(chats).toMatch(/isTestResidueConversation/);
  });

  it("plan pills use tone classes and open plan via onOpenPlan", () => {
    const chats = readFileSync(resolve(root, "opalUi/ChatsHome.tsx"), "utf8");
    const css = readFileSync(resolve(root, "styles.css"), "utf8");
    const fixture = readFileSync(resolve(root, "opalUi/founderChatsPlanPills.ts"), "utf8");
    expect(chats).toMatch(/onOpenPlan/);
    expect(chats).toMatch(/chats-plan-pill/);
    expect(chats).toMatch(/data-plan-tone/);
    expect(chats).toMatch(/chats-home-connection/);
    expect(chats).toMatch(/stopPropagation/);
    expect(css).toMatch(/\.chats-plan-pill\.is-tone-dinner/);
    expect(css).toMatch(/\.chats-plan-pill\.is-tone-activity/);
    expect(css).toMatch(/\.chats-plan-pill\.is-tone-live/);
    expect(css).toMatch(/\.chats-home-connection[\s\S]*?#00E5FF/);
    expect(fixture).toMatch(/Juniper & Ivy · 7:30 PM/);
    expect(fixture).toMatch(/Farmers market \+ coast/);
    expect(fixture).toMatch(/3 of 4 going/);
    expect(fixture).toMatch(/Farmers market \+ coast/);
    expect(fixture).toMatch(/3 of 4 going/);
    expect(fixture).toMatch(/Live nearby/);
    expect(fixture).toMatch(/Trip Graph/);
    expect(fixture).toMatch(/Following/);
  });
});

