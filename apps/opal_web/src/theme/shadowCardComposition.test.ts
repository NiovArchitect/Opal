/**
 * R19 polish E2 — SHADOW COMPOSITION guard (latent defect, verified
 * REAL at source + in Chromium by cluster A2):
 *
 * In dark mode --shadow-card was the keyword `none`. `none` is a
 * valid box-shadow ONLY as the sole value; composed into a shadow
 * LIST it invalidates the entire declaration at computed-value
 * time. The one list consumer — the call-log state row
 * (opalUi/c1/CallLog.css: `0 0 10px <state glow>, var(--shadow-card)`)
 * — therefore computed to box-shadow: none in dark mode and its
 * state glow never painted there (light mode, where the token is a
 * real shadow list, was unaffected).
 *
 * Fix (theme/c2Tokens.css): the dark token is now a fully
 * transparent zero shadow — it paints exactly nothing, so the
 * dark register (shadowless by design, night budget) is unchanged,
 * and it composes safely as a list layer. These pins fail if the
 * token ever returns to `none` in either mode while any sheet
 * composes it into a list.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const tokens = readFileSync(resolve(__dirname, "c2Tokens.css"), "utf8");

function modeBlock(mode: "light" | "dark"): string {
  const marker =
    mode === "dark" ? ':root[data-mode="dark"] {' : ':root[data-mode="light"] {';
  const i = tokens.indexOf(marker);
  expect(i, `${mode} block exists`).toBeGreaterThanOrEqual(0);
  return tokens.slice(i, tokens.indexOf("\n  }", i));
}

function shadowCardOf(block: string): string {
  const m = block.match(/--shadow-card:\s*([^;]+);/);
  expect(m, "--shadow-card defined").not.toBeNull();
  return m![1]!.trim();
}

function* cssFiles(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* cssFiles(p);
    else if (name.endsWith(".css")) yield p;
  }
}

describe("shadow composition — a `none` shadow token cannot poison sibling layers", () => {
  it("neither mode's --shadow-card is the keyword `none`", () => {
    for (const mode of ["light", "dark"] as const) {
      const value = shadowCardOf(modeBlock(mode));
      expect(value, `${mode} --shadow-card`).not.toBe("none");
      expect(value).not.toMatch(/(^|,)\s*none\s*(,|$)/);
    }
  });

  it("both modes' registers are as designed: light keeps its real card shadow; dark paints nothing", () => {
    expect(shadowCardOf(modeBlock("light"))).toBe(
      "0 1px 2px rgba(28, 25, 23, 0.05), 0 8px 24px rgba(28, 25, 23, 0.05)",
    );
    // Dark: a single fully transparent zero shadow — visually `none`,
    // compositionally a valid list layer.
    expect(shadowCardOf(modeBlock("dark"))).toBe("0 0 0 0 rgba(0, 0, 0, 0)");
  });

  it("the list composition that exposed the defect still exists (call-log state row)", () => {
    const callLog = readFileSync(
      resolve(__dirname, "../opalUi/c1/CallLog.css"),
      "utf8",
    );
    const row = callLog.match(
      /\.c1-call-row\[data-call-state\] \{[^}]*\}/,
    )?.[0];
    expect(row).toBeTruthy();
    expect(row).toContain("0 0 10px color-mix(in srgb, var(--call-state) 12%, transparent)");
    expect(row).toContain("var(--shadow-card)");
  });

  it("every box-shadow list in src that composes --shadow-card is safe under both mode values", () => {
    const srcRoot = resolve(__dirname, "..");
    const compositions: string[] = [];
    for (const file of cssFiles(srcRoot)) {
      const css = readFileSync(file, "utf8");
      for (const decl of css.matchAll(/box-shadow:\s*([^;]+);/g)) {
        const value = decl[1]!;
        if (value.includes("var(--shadow-card)") && value.includes(",")) {
          compositions.push(`${file}: ${value.trim()}`);
        }
      }
    }
    // At least the call-log row composes it; the token law above is
    // what makes every such composition safe, in both modes.
    expect(compositions.length).toBeGreaterThanOrEqual(1);
    for (const mode of ["light", "dark"] as const) {
      expect(shadowCardOf(modeBlock(mode))).not.toBe("none");
    }
  });
});
