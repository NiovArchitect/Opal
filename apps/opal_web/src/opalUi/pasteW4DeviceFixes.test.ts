/**
 * Paste W4 Phases 3–5 device fixes — focused source contracts.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "..");
const read = (rel: string) => readFileSync(resolve(root, rel), "utf8");

describe("Paste W4 Phase 3 thread header + contact sheet", () => {
  it("header is one clean row with History + call + video (no gpt-plan)", () => {
    const header = read("opalUi/GraphPeopleThread.tsx");
    const css = read("styles.css");
    expect(header).toMatch(/data-testid="gpt-history"/);
    expect(header).toMatch(/aria-label="History"/);
    expect(header).toMatch(/clock-rewind|HistoryIcon|gpt-history-icon/);
    expect(header).toMatch(/data-testid="gpt-call"/);
    expect(header).toMatch(/data-testid="gpt-video"/);
    expect(header).not.toMatch(/data-testid="gpt-plan"/);
    expect(header).toMatch(/gpt-avatar-hit/);
    expect(css).toMatch(/\.gpt-avatar-hit\s*\{[^}]*position:\s*relative/s);
    expect(css).toMatch(/member-conversation[\s\S]*chats-home[\s\S]*display:\s*none/s);
  });

  it("ContactProfileSheet is a foreground sheet with memories + call", () => {
    const sheet = read("opalUi/ContactProfileSheet.tsx");
    const css = read("styles.css");
    expect(sheet).toMatch(/contact-profile-backdrop/);
    expect(sheet).toMatch(/contact-profile-card/);
    expect(sheet).toMatch(/Memories together/);
    expect(sheet).toMatch(/contact-profile-call/);
    expect(css).toMatch(/\.contact-profile-sheet/);
    expect(css).toMatch(/\.contact-profile-backdrop/);
    expect(css).toMatch(/backdrop-filter/);
  });
});

describe("Paste W4 Phase 4 PlanComposer", () => {
  it("Idea Start planning opens PlanComposer with no camera", () => {
    const composer = read("opalUi/PlanComposer.tsx");
    const app = read("OpalApp.tsx");
    const detail = read("opalUi/GraphDetailSheet.tsx");
    expect(composer).toMatch(/data-testid="plan-composer"/);
    expect(composer).toMatch(/Who/);
    expect(composer).toMatch(/Vibe/);
    expect(composer).toMatch(/When/);
    expect(composer).toMatch(/Where/);
    expect(composer).toMatch(/Looks good/);
    expect(composer).toMatch(/Tweak/);
    expect(composer).toMatch(/OpalPresenceOrb/);
    expect(composer).not.toMatch(/acquireMedia|Take a photo/i);
    expect(composer).not.toMatch(/getUserMedia|input type=["']file["']/i);
    expect(app).toMatch(/openPlanComposer/);
    expect(app).toMatch(/PlanComposer/);
    expect(detail).toMatch(/onStartPlanning/);
    expect(app).toMatch(/onStartPlanning=\{\(g\) => \{\s*openPlanComposer/s);
  });
});

describe("Paste W4 Phase 5 notifications / composer / New / add-someone / detail", () => {
  it("Attention empty copy replaces not found", () => {
    const act = read("opalUi/ActivityDestination.tsx");
    const client = read("api/productClient.ts");
    expect(act).toMatch(/Nothing yet\. When your people move, you'll see it here\./);
    expect(act).not.toMatch(/>not found</i);
    expect(client).toMatch(/case "not_found"/);
    expect(client).toMatch(/Nothing yet\. When your people move/);
  });

  it("Home composer exposes Post and Story", () => {
    const home = read("opalUi/GraphSocialHome.tsx");
    expect(home).toMatch(/gsh-home-composer/);
    expect(home).toMatch(/gsh-compose-post/);
    expect(home).toMatch(/gsh-compose-story/);
    expect(home).toMatch(/gsh-compose-post[\s\S]{0,200}Post/);
    expect(home).toMatch(/gsh-compose-story[\s\S]{0,200}Story/);
  });

  it("Graphs New menu offers plan trip idea", () => {
    const graphs = read("opalUi/GraphsHome.tsx");
    expect(graphs).toMatch(/aria-label="New"/);
    expect(graphs).toMatch(/New plan/);
    expect(graphs).toMatch(/New trip/);
    expect(graphs).toMatch(/New idea/);
    expect(graphs).toMatch(/graphs-create-menu/);
    expect(graphs).toMatch(/Create/);
  });

  it("add_members select lands in conversation with inviter as plan owner", () => {
    const app = read("OpalApp.tsx");
    expect(app).toMatch(/searchContext === "add_members"/);
    expect(app).toMatch(/You're the plan owner with/);
    expect(app).toMatch(/you'll own the plan/);
    expect(app).toMatch(/openChat\(existing\.id\)/);
  });

  it("GraphDetailSheet drops graph-back-law and uses thin journey block", () => {
    const detail = read("opalUi/GraphDetailSheet.tsx");
    expect(detail).not.toMatch(/graph-back-law/);
    expect(detail).not.toMatch(/Back returns to the Graph list/);
    expect(detail).toMatch(/graph-journey-block/);
    expect(detail).toMatch(/graph-detail-state-line/);
    expect(detail).toMatch(/Open directions/);
  });
});
