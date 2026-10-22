/**
 * Repair #22 (WS-4) - THE STREAM RHYTHM LAW, pinned.
 *
 * Founder charge: Flows cards were "either too far apart or
 * literally stacked on top of each other even though they have
 * their own lighting." The audit found the column's rhythm was
 * accumulated padding accident (block transitions of 20 / 20 / 0 /
 * 20px, occasions stacked at 0px, Lives double-guttered to a
 * narrower berth, a legacy .c2s-feed rule overriding the braid's
 * direction by cascade order, and glow reaches of 16-46px against
 * gaps of 0-12px).
 *
 * The law, in theme/c2Tokens.css: --stream-gap (the one inter-card
 * gap), --stream-inset (the one card padding), --stream-stagger
 * (the braid's offset, half the gap), --stream-glow-room (the max
 * light reach beyond a card edge, half the gap). These tests read
 * the CSS as text (the c2Tokens.test.ts precedent) and fail if any
 * stream surface goes back to improvising its own spacing or lets
 * its light leak past the glow room.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const tokens = readFileSync(resolve(__dirname, "../../theme/c2Tokens.css"), "utf8");
const shell = readFileSync(resolve(__dirname, "c2shell.css"), "utf8");
const c2 = readFileSync(resolve(__dirname, "../c2.css"), "utf8");

function ruleBody(css: string, selector: string): string {
  const i = css.indexOf(selector);
  if (i < 0) throw new Error(`selector not found: ${selector}`);
  const open = css.indexOf("{", i);
  let depth = 0;
  for (let j = open; j < css.length; j++) {
    if (css[j] === "{") depth++;
    if (css[j] === "}") {
      depth--;
      if (depth === 0) return css.slice(open + 1, j);
    }
  }
  throw new Error(`unterminated rule: ${selector}`);
}

/** Max box-shadow reach (max |offset| + blur) in px across a CSS
 *  fragment, resolving the stream tokens to their values. */
function maxShadowReach(fragment: string): number {
  const resolved = fragment
    .replaceAll("var(--stream-glow-room)", "8px")
    .replaceAll("var(--stream-gap)", "16px");
  let max = 0;
  for (const m of resolved.matchAll(/box-shadow:\s*([^;]+);/g)) {
    for (const shadow of m[1]!.split(/,(?![^()]*\)) /)) {
      const nums = [...shadow.matchAll(/(-?\d+(?:\.\d+)?)px/g)].map((x) => Number(x[1]));
      if (nums.length >= 3) {
        const reach = Math.max(Math.abs(nums[0]!), Math.abs(nums[1]!)) + nums[2]!;
        max = Math.max(max, reach);
      }
    }
  }
  return max;
}

describe("R22 WS-4 stream rhythm law", () => {
  it("defines the four rhythm tokens, derived from the space scale", () => {
    expect(tokens).toContain("--stream-gap: var(--space-4);");
    expect(tokens).toContain("--stream-inset: var(--space-4);");
    expect(tokens).toContain("--stream-stagger: calc(var(--stream-gap) / 2);");
    expect(tokens).toContain("--stream-glow-room: calc(var(--stream-gap) / 2);");
  });

  it("one block rhythm: every Flows block transition is one stream gap", () => {
    const body = ruleBody(shell, '.c2s-scroll[data-testid="c2-home-scroll"] > * + *');
    expect(body).toContain("margin-top: var(--stream-gap);");
  });

  it("the braided stream consumes the gap and carries no private padding", () => {
    const body = ruleBody(shell, ".c2s-stream {");
    expect(body).toContain("gap: var(--stream-gap);");
    expect(body).toContain("padding: 0;");
    expect(body).toContain("flex-direction: row;");
  });

  it("the legacy .c2s-feed rule no longer overrides the braid by cascade order", () => {
    expect(shell).not.toMatch(/\.c2s-feed\s*\{[^}]*flex-direction/);
    expect(shell).not.toMatch(/\.c2s-feed\s*\{[^}]*padding-top/);
  });

  it("the happening strip shares the stream's berth and beat (no double gutter)", () => {
    const body = ruleBody(shell, ".c2s-happening {");
    expect(body).toContain("gap: var(--stream-gap);");
    expect(body).toContain("padding: 0;");
    expect(body).not.toContain("--gutter");
  });

  it("occasions are stream citizens: the stream gap, never a 0px stack", () => {
    const body = ruleBody(shell, '[data-testid="c2-home-occasions"]');
    expect(body).toContain("gap: var(--stream-gap);");
  });

  it("one card inset across card kinds: shell card, plan stone, trivia poster", () => {
    expect(ruleBody(shell, ".c2s-card {")).toContain("padding: var(--stream-inset);");
    const planRegion = c2.slice(c2.indexOf("Reference plan card"));
    expect(ruleBody(planRegion, ".c2-plan-card {")).toContain("padding: var(--stream-inset);");
    expect(ruleBody(shell, ".c2s-trivia-poster {")).toContain("padding: var(--stream-inset);");
  });

  it("the braid's stagger and wide-stone breath are tokenized, never raw px", () => {
    expect(shell).toContain("margin-top: var(--stream-stagger);");
    expect(shell).not.toContain("margin-top: 14px");
    expect(ruleBody(shell, ".c2s-stream > .c2-plan-card:nth-child(3n)")).toContain(
      "margin-right: var(--stream-gap);",
    );
  });

  it("glow containment: no stream card's light reaches past the glow room (8px)", () => {
    const live = ruleBody(shell, ".c2s-live-card {");
    expect(live).toContain("var(--stream-glow-room)");
    const happeningStone = ruleBody(shell, '.c2s-stream > .c2-plan-card[data-plan-state="happening"]');
    expect(happeningStone).toContain("var(--stream-glow-room)");
    // The trivia spectacle, its keyframes and its frozen stacks:
    // every shadow in the whole trivia region stays within reach.
    const triviaRegion = shell.slice(shell.indexOf(".c2s-trivia-spectacle {"));
    expect(maxShadowReach(triviaRegion)).toBeLessThanOrEqual(8);
    expect(maxShadowReach(live)).toBeLessThanOrEqual(8);
    expect(maxShadowReach(happeningStone)).toBeLessThanOrEqual(8);
  });

  it("the trivia poster carries no private bottom margin", () => {
    expect(ruleBody(shell, ".c2s-trivia-poster {")).toContain("margin-bottom: 0;");
  });
});
