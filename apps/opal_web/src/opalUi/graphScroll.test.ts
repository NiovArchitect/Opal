import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(__dirname, "../styles.css"), "utf8");
const graphs = readFileSync(resolve(__dirname, "GraphsHome.tsx"), "utf8");

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
    expect(graphs).toMatch(/past:\s*5/);
    expect(graphs).toMatch(/STATUS_RANK\[a\.status\]/);
    expect(css).toMatch(/\.graphs-lenses[\s\S]*?flex-wrap:\s*nowrap/);
    expect(css).toMatch(/\.graphs-lenses[\s\S]*?overflow-x:\s*auto/);
    expect(css).toMatch(/\.graphs-lens-chip[\s\S]*?flex:\s*0 0 auto/);
  });

  it("demotes past below live/seeds in All via STATUS_RANK sort of combined list", () => {
    expect(graphs).toMatch(/\[\.\.\.live,\s*\.\.\.seeds\]\.sort/);
    expect(graphs).toMatch(/past ranks last|STATUS_RANK/);
  });
});
