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
    // Truth change (R23 WS-23-6 disposition): ChatsHome became a
    // dual-mode surface (Chats 618:271 / Calls 928:3), so the
    // authority attribute is a mode-conditional expression rather
    // than a literal. 618:271 remains the Chats authority.
    expect(chats).toMatch(/data-figma=\{isCalls \? "928:3" : "618:271"\}/);
    expect(chats).toMatch(/data-figma-authority=\{isCalls \? "928:9" : "618:271"\}/);
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
    // Truth change (R23 WS-23-6 disposition): the Wave B routing
    // (New+ -> Search People mode) was deliberately superseded by
    // Slice #1 - the Chats New door now opens the New Chat picker
    // with message-by-phone (real peer addressability), recorded
    // in the handler's own comment ("Search People remains
    // available elsewhere; do not use seed rows as DM targets").
    const chatsHandler = app.slice(
      app.indexOf("onNewChat={() => {"),
      app.indexOf("onNewChat={() => {") + 460,
    );
    expect(chatsHandler).toMatch(/setNewChatOpen\(true\)/);
    expect(chatsHandler).toMatch(/setSearchOpen\(false\)/);
    expect(chatsHandler).not.toMatch(/setSearchOpen\(true\)/);
    const search = read("opalUi/SearchDestination.tsx");
    expect(search).toMatch(/data-figma-node="618:2299"/);
    expect(search).toMatch(/initialMode/);
  });

  it("GROUP_ADD_PEOPLE_ROUTES_SEARCH_PEOPLE_MODE", () => {
    const app = read("OpalApp.tsx");
    expect(app).toMatch(/setSearchContext\("add_members"\)/);
    const idx = app.indexOf("onAddPeople={() => {");
    expect(idx).toBeGreaterThan(-1);
    // Instrument fix (R23 WS-23-6): the handler gained a comment
    // line and one more setter, pushing setSearchOpen(true) to
    // offset ~329 - outside the original 280-char window. The
    // routing behavior itself never changed; window widened to
    // cover the full handler body.
    const handler = app.slice(idx, idx + 420);
    expect(handler).toMatch(/setSearchOpen\(true\)/);
    expect(handler).not.toMatch(/setFindPeopleOpen\(true\)/);
  });
});
