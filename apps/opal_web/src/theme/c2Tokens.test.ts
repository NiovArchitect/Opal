import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(__dirname, "c2Tokens.css"), "utf8");

function blockFor(selector: string): string {
  const i = css.indexOf(selector);
  if (i < 0) throw new Error(`selector not found: ${selector}`);
  const open = css.indexOf("{", i);
  // blocks here contain no nested braces after the first declaration run
  // except rgba() parens - find the matching close by depth counting.
  let depth = 0;
  for (let j = open; j < css.length; j++) {
    if (css[j] === "{") depth++;
    if (css[j] === "}") {
      depth--;
      if (depth === 0) return css.slice(open + 1, j);
    }
  }
  throw new Error("unterminated block");
}

function tokensIn(block: string): Map<string, string> {
  const m = new Map<string, string>();
  for (const match of block.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
    m.set(match[1]!.toLowerCase(), match[2]!.trim());
  }
  return m;
}

const light = tokensIn(blockFor(':root[data-mode="light"]'));
const dark = tokensIn(blockFor(':root[data-mode="dark"]'));

const SEMANTIC = [
  "--canvas", "--canvas-stage", "--chrome-glass-tint", "--surface-1", "--surface-2",
  "--line-1", "--line-2", "--ink-1", "--ink-2", "--ink-3",
  "--scrim", "--shadow-card", "--accent-1", "--accent-1-ink",
  "--accent-press", "--accent-quiet", "--primary-fill", "--primary-ink",
  "--grad-current", "--pattern-lines",
  "--state-forming", "--state-forming-tint", "--state-forming-ink",
  "--state-action", "--state-action-tint", "--state-action-ink",
  "--state-ready", "--state-ready-tint", "--state-ready-ink",
  "--state-happening", "--state-happening-tint", "--state-happening-ink",
  "--state-happening-ring",
  "--state-past", "--state-past-tint", "--state-past-ink",
];

function hslLightness(hex: string): number {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  return ((Math.max(r, g, b) + Math.min(r, g, b)) / 2) * 100;
}

describe("c2Tokens (track-c2 sections 2.6 and 2.7)", () => {
  it("defines every semantic token in BOTH modes - no cross-mode fallback", () => {
    for (const t of SEMANTIC) {
      expect(light.has(t), `light missing ${t}`).toBe(true);
      expect(dark.has(t), `dark missing ${t}`).toBe(true);
    }
  });

  it("grounds match the section 2.7 per-mode table", () => {
    expect(light.get("--canvas")).toBe("#fffefb");
    expect(light.get("--canvas-stage")).toBe("#f5f0e8");
    expect(dark.get("--canvas")).toBe("#18141c"); // harmony-0: the sampled orb field (--orb-field) is the dark ground
    expect(dark.get("--canvas-stage")).toBe("#0d0b12");
    expect(dark.get("--surface-1")).toBe("#201a27"); // harmony-0: quiet step of the sampled field
    expect(dark.get("--surface-2")).toBe("#2a2333"); // harmony-0: quiet step of the sampled field
  });

  it("harmony-0: accents and gradient are the sampled orb fire, never canonical state hexes", () => {
    expect(dark.get("--accent-1")).toContain("#7d4dce"); // sampled violet peak
    expect(light.get("--accent-1")).toContain("#5d398a"); // sampled violet median
    for (const mode of [light, dark]) {
      const grad = mode.get("--grad-current")!;
      for (const stateHex of ["#8b5cf6", "#00e5ff", "#ffc86b", "#ff4d5e"]) {
        expect(grad.toLowerCase()).not.toContain(stateHex); // indicator hues are meaning only
      }
    }
    expect(dark.get("--grad-current")).toContain("#7d4dce");
    expect(light.get("--grad-current")).toContain("#5d398a");
  });

  it("dark grounds obey the night budget lightness caps", () => {
    expect(hslLightness(dark.get("--canvas")!)).toBeLessThanOrEqual(10); // harmony-0: the sampled field #18141c is 9.4% - the master sets the budget here
    expect(hslLightness(dark.get("--canvas-stage")!)).toBeLessThanOrEqual(9);
    expect(hslLightness(dark.get("--surface-1")!)).toBeLessThanOrEqual(13);
    expect(hslLightness(dark.get("--surface-2")!)).toBeLessThanOrEqual(17);
    expect(hslLightness(dark.get("--ink-2")!)).toBeLessThanOrEqual(82);
    expect(hslLightness(dark.get("--ink-3")!)).toBeLessThanOrEqual(65);
  });

  it("state hues are canon aliases in BOTH modes (R19 W27 AT-02 convergence)", () => {
    // The pre-W27 per-mode derivative table (light #6d5df0/#0a7c6e,
    // grey past, dark tints) is dead: --state-* now alias the canon
    // --orb-indicator-* tokens, so the resolved hue is PLAN_STATE_HEX
    // in both modes. Only the *-ink text derivatives stay per-mode.
    for (const mode of [light, dark]) {
      expect(mode.get("--state-forming")).toBe("var(--orb-indicator-forming)");
      expect(mode.get("--state-action")).toBe("var(--orb-indicator-action)");
      expect(mode.get("--state-ready")).toBe("var(--orb-indicator-ready)");
      expect(mode.get("--state-happening")).toBe("var(--orb-indicator-happening)");
      expect(mode.get("--state-past")).toBe("var(--orb-indicator-past)");
    }
    expect(light.get("--state-forming-ink")).toBe("#5546d8");
    expect(light.get("--state-action-ink")).toBe("#c81e2b");
    expect(light.get("--state-ready-ink")).toBe("#8a5e00");
    expect(light.get("--state-happening-ink")).toBe("#07758c");
    expect(light.get("--state-past-ink")).toBe("#57534e");
    expect(dark.get("--state-forming-ink")).toBe("#c4beff");
    expect(dark.get("--state-action-ink")).toBe("#ffb0b7");
    expect(dark.get("--state-ready-ink")).toBe("#ffd88a");
    expect(dark.get("--state-happening-ink")).toBe("#8be9f7");
    expect(dark.get("--state-past-ink")).toBe("#d6d0c8");
  });

  it("the five state hues are five distinct families in each mode", () => {
    for (const mode of [light, dark]) {
      const hues = ["forming", "action", "ready", "happening", "past"].map((s) =>
        mode.get(`--state-${s}`),
      );
      expect(new Set(hues).size).toBe(5);
    }
  });

  it("carries the layer registry additions from section 2.6", () => {
    expect(css).toContain("--layer-dock: 50");
    expect(css).toContain("--layer-destination: 60");
    expect(css).toContain("--layer-stage: 90");
    expect(css).toContain("--layer-call: 100");
  });

  it("dark primary is the paper fill - the one brightest action at night", () => {
    expect(dark.get("--primary-fill")).toBe("#faf7f2");
    expect(dark.get("--primary-ink")).toBe("#1c1917");
    expect(dark.get("--primary-stage-fill")).toBe("#faf7f2");
  });
});
