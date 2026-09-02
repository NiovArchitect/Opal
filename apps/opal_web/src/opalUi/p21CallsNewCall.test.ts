import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

describe("P2.1 New Call 928:276 + destination coherence", () => {
  it("Calls + opens New Call destination, not global Search", () => {
    const app = readFileSync(resolve(root, "OpalApp.tsx"), "utf8");
    expect(app).toMatch(/setNewCallOpen\(true\)/);
    expect(app).toMatch(/NewCallDestination/);
    // onNewCall must not route to Search PEOPLE for Calls intent
    const onNewCallBlock = app.slice(app.indexOf("onNewCall={() =>"), app.indexOf("onOpenCallGraph"));
    expect(onNewCallBlock).toMatch(/setNewCallOpen\(true\)/);
    expect(onNewCallBlock).not.toMatch(/setSearchOpen\(true\)/);
  });

  it("New Call is people+groups scoped — no Places/Experiences taxonomy", () => {
    const nc = readFileSync(resolve(root, "opalUi/NewCallDestination.tsx"), "utf8");
    expect(nc).toMatch(/928:276/);
    expect(nc).toMatch(/Search people and groups/);
    expect(nc).toMatch(/Recent history should never be required/);
    expect(nc).not.toMatch(/Places/);
    expect(nc).not.toMatch(/Experiences/);
    expect(nc).not.toMatch(/Top \/ People/);
  });

  it("one-tap dial controls exist for people and groups", () => {
    const nc = readFileSync(resolve(root, "opalUi/NewCallDestination.tsx"), "utf8");
    expect(nc).toMatch(/new-call-dial-/);
    expect(nc).toMatch(/onCallPerson/);
    expect(nc).toMatch(/onCallGroup/);
  });

  it("Call Continuity has Call / Video / Chat", () => {
    const cc = readFileSync(resolve(root, "opalUi/CallContinuityDestination.tsx"), "utf8");
    expect(cc).toMatch(/928:158/);
    expect(cc).toMatch(/call-cont-call/);
    expect(cc).toMatch(/call-cont-video/);
    expect(cc).toMatch(/call-cont-chat/);
  });

  it("Search and Activity are mutually exclusive mounts", () => {
    const app = readFileSync(resolve(root, "OpalApp.tsx"), "utf8");
    expect(app).toMatch(/searchOpen && !activityOpen/);
    expect(app).toMatch(/activityOpen && !searchOpen/);
    expect(app).toMatch(/setActivityOpen\(false\); \/\/ destination exclusivity/);
    expect(app).toMatch(/setSearchOpen\(false\); \/\/ destination exclusivity/);
  });

  it("story ring is explicit — no false affordance without hasStory", () => {
    const chats = readFileSync(resolve(root, "opalUi/ChatsHome.tsx"), "utf8");
    const seed = readFileSync(resolve(root, "opalUi/callsContinuitySeed.ts"), "utf8");
    expect(chats).toMatch(/has-story-ring/);
    expect(chats).toMatch(/data-story-ring/);
    expect(seed).toMatch(/hasStory: true/);
  });

  it("stage destinations center on desktop — no viewport-left trap alone", () => {
    const css = readFileSync(resolve(root, "styles.css"), "utf8");
    expect(css).toMatch(/\.new-call-dest/);
    expect(css).toMatch(/\.profile-person-overlay/);
    expect(css).toMatch(/@media \(min-width: 391px\)/);
    expect(css).toMatch(/translateX\(-50%\)/);
  });
});
