/**
 * Wave B B2 — Chats 618:271 exact paints + New+ → Search PEOPLE
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../..");
const read = (rel: string) => readFileSync(resolve(root, "src", rel), "utf8");

describe("Wave B Chats exact authority", () => {
  it("CHATS_CURRENT_AUTHORITY_618_271", () => {
    const chats = read("opalUi/ChatsHome.tsx");
    expect(chats).toMatch(/data-figma="618:271"|data-figma-authority="618:271"/);
    expect(chats).toMatch(/data-chats-tabs="none"/);
    expect(chats).not.toMatch(/chats-home-segment/);
    const css = read("styles.css");
    expect(css).toMatch(/\.chats-home[\s\S]*?#050816/);
    expect(css).toMatch(/\.chats-home-search[\s\S]*?#03060C/);
    expect(css).toMatch(/\.chats-home-search[\s\S]*?#1F2E47/);
    expect(css).toMatch(/\.chats-home-row[\s\S]*?#03060C/);
    expect(css).toMatch(/\.chats-home-row[\s\S]*?#1F2E47/);
  });

  it("CHATS_NEW_ROUTES_SEARCH_PEOPLE_MODE", () => {
    const app = read("OpalApp.tsx");
    expect(app).toMatch(/setSearchInitialMode\("People"\)/);
    expect(app).toMatch(/setSearchContext\("people"\)/);
    expect(app).toMatch(/setSearchOpen\(true\)/);
    // New chat from Chats must not open NewChatPicker as primary
    const chatsHandler = app.slice(
      app.indexOf("onNewChat={() => {"),
      app.indexOf("onNewChat={() => {") + 350,
    );
    expect(chatsHandler).toMatch(/setSearchOpen\(true\)/);
    expect(chatsHandler).not.toMatch(/setNewChatOpen\(true\)/);
    const search = read("opalUi/SearchDestination.tsx");
    expect(search).toMatch(/data-figma-node="618:2299"/);
    expect(search).toMatch(/initialMode/);
  });

  it("GROUP_ADD_PEOPLE_ROUTES_SEARCH_PEOPLE_MODE", () => {
    const app = read("OpalApp.tsx");
    expect(app).toMatch(/setSearchContext\("add_members"\)/);
    const idx = app.indexOf("onAddPeople={() => {");
    expect(idx).toBeGreaterThan(-1);
    const handler = app.slice(idx, idx + 280);
    expect(handler).toMatch(/setSearchOpen\(true\)/);
    expect(handler).not.toMatch(/setFindPeopleOpen\(true\)/);
  });
});
