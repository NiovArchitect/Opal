import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

describe("Create Graph approved journey 863:284 → 863:338", () => {
  it("Graphs Create opens GraphCreateFlow, not FindTime as primary UX", () => {
    const app = readFileSync(resolve(root, "OpalApp.tsx"), "utf8");
    const create = readFileSync(resolve(root, "opalUi/GraphCreateFlow.tsx"), "utf8");
    const graphs = readFileSync(resolve(root, "opalUi/GraphsHome.tsx"), "utf8");
    expect(graphs).toMatch(/New plan|Create graph|graphs-create/i);
    expect(app).toMatch(/GraphCreateFlow|PlanComposer/);
    expect(app).toMatch(/setGraphCreateOpen\(true\)|openPlanComposer/);
    // Must not wire Create Graph primary path to FindTime alone
    expect(app).not.toMatch(/onCreateGraph=\{\(\) => \{\s*setFindTimeOpen\(true\)/);
    expect(create).toMatch(/863:284/);
    expect(create).toMatch(/863:338/);
    expect(create).toMatch(/choose_media|compose/);
    expect(create).toMatch(/Add to graph/);
  });

  it("Plan from direct conversation skips WHO and opens create with known WHO", () => {
    const app = readFileSync(resolve(root, "OpalApp.tsx"), "utf8");
    const header = readFileSync(resolve(root, "opalUi/GraphPeopleThread.tsx"), "utf8");
    // Paste W 2.3: calendar/plan icon removed from thread header (L5 keeps GraphCreateFlow).
    expect(header).not.toMatch(/data-testid="gpt-plan"/);
    expect(app).toMatch(/setMomentPeopleOpen\(false\)/);
    expect(app).toMatch(/setGraphCreateOpen\(true\)/);
    expect(app).toMatch(/who: activeChat\.name/);
    // Conversation early-return must also mount GraphCreateFlow (not only tab shell).
    const conv = app.slice(
      app.indexOf('data-testid="member-conversation"'),
      app.indexOf("S1 first-run"),
    );
    expect(conv).toMatch(/GraphCreateFlow/);
    expect(conv).toMatch(/knownWho=\{graphCreateContext\.who\}/);
  });

  it("Create Graph does not expose permanent + dock", () => {
    const app = readFileSync(resolve(root, "OpalApp.tsx"), "utf8");
    expect(app).toMatch(/data-create-dock=\{CREATE_DOCK_EXPOSED \? "exposed" : "deferred"\}/);
    expect(app).toMatch(/graphs-create|onCreateGraph/);
  });
});
