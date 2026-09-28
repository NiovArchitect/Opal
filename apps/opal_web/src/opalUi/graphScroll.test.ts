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
});
