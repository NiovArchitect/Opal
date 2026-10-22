import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(__dirname, "../styles.css"), "utf8");
const graphs = readFileSync(resolve(__dirname, "GraphsHome.tsx"), "utf8");
// Truth change (R23 WS-23-6 disposition): the STATUS_RANK table and
// the combined-list sort moved out of GraphsHome.tsx into
// graphsHydration.ts (composeGraphsList, which GraphsHome
// consumes). The pins below follow the wiring; behavior unchanged.
const hydration = readFileSync(resolve(__dirname, "graphsHydration.ts"), "utf8");

describe("graph list scroll", () => {
  it("gives the graph list one scroll owner under persistent chrome", () => {
    expect(graphs).toMatch(/data-testid="graphs-scroll"/);
    expect(graphs).toMatch(/data-testid="graphs-sticky-chrome"/);
    expect(css).toMatch(/\.graphs-home[\s\S]*?overflow:\s*hidden/);
    expect(css).toMatch(/\.graphs-scroll[\s\S]*?overflow-y:\s*auto/);
    expect(css).toMatch(/\.graphs-scroll[\s\S]*?touch-action:\s*pan-y/);
  });

  it("keeps Past lens chip in source and horizontally reachable", () => {
    expect(graphs).toMatch(/\["past", "Past"\]/);
    expect(graphs).toMatch(/data-testid=\{`graphs-lens-\$\{id\}`\}|graphs-lens-past/);
    expect(hydration).toMatch(/past:\s*5/);
    expect(hydration).toMatch(/STATUS_RANK\[a\.status\]/);
    expect(graphs).toMatch(/composeGraphsList/);
    expect(css).toMatch(/\.graphs-lenses[\s\S]*?flex-wrap:\s*nowrap/);
    expect(css).toMatch(/\.graphs-lenses[\s\S]*?overflow-x:\s*auto/);
    expect(css).toMatch(/\.graphs-lens-chip[\s\S]*?flex:\s*0 0 auto/);
  });

  it("demotes past below live/seeds in All via STATUS_RANK sort of combined list", () => {
    // The combined list is composed and sorted in graphsHydration:
    // sortGraphs applies STATUS_RANK (past: 5, last) over the
    // combined live + created + seed cards.
    expect(hydration).toMatch(/sortGraphs\(\[\.\.\.live,\s*\.\.\.createdExtras,\s*\.\.\.seeds\]\)/);
    expect(hydration).toMatch(/past ranks last|STATUS_RANK/);
    expect(graphs).toMatch(/composeGraphsList/);
  });
});
