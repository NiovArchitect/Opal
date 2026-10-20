/**
 * R19 polish N5 — CONTROL AMBIENCE guards (founder, 2026-10-19
 * 17:50 PDT): behavior-changing toggles answer with ambient state
 * lighting when flipped — ON = the controlled behavior's canon
 * state color lit, OFF = settled — inside the Ambient Rulebook
 * envelopes (AR-00.2 QUIET: glows <= 18px at <= 55%; AR-00.6
 * reduced-motion parity: instant swap, same colors).
 *
 * The treatment lives in the shared token layer (theme/
 * c2Tokens.css: --control-on / --control-on-glow) and the two
 * shared toggle components the surfaces actually use:
 *   - .you-settings-toggle (styles.css) — every Settings switch,
 *     including the founder's example, the Opal Assist switch in
 *     Calls & Opal Assist (YouSettingsDestination row id "assist");
 *   - .c2s-toggle (c2/shell/c2shell.css) — the C2 You/shell switches.
 * These pins fail if a future edit re-spends a decorative/brand hue
 * on a toggle, pushes the glow past the envelope, slows the flip
 * past the QUIET motion cap, or drops reduced-motion parity.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (rel: string) =>
  readFileSync(resolve(__dirname, rel), "utf8");

const tokens = read("c2Tokens.css");
const orbTokens = read("orbTokens.css");
const shell = read("../c2/shell/c2shell.css");
const styles = read("../styles.css");
const settingsTsx = read("../opalUi/YouSettingsDestination.tsx");
const c2YouTsx = read("../c2/shell/C2You.tsx");

/** The declaration block for an exact selector occurrence. */
function blockFor(css: string, selector: string): string {
  const i = css.indexOf(selector);
  expect(i, `selector present: ${selector}`).toBeGreaterThanOrEqual(0);
  const open = css.indexOf("{", i);
  const close = css.indexOf("}", open);
  return css.slice(open + 1, close);
}

const STATES = ["action", "ready", "forming", "happening", "past"];

describe("N5 control ambience — the token layer", () => {
  it("defines --control-on / --control-on-glow exactly once each, as canon aliases", () => {
    expect(tokens.match(/--control-on:/g)).toHaveLength(1);
    expect(tokens.match(/--control-on-glow:/g)).toHaveLength(1);
    expect(tokens).toContain("--control-on: var(--orb-indicator-happening);");
    expect(tokens).toContain(
      "--control-on-glow: var(--orb-indicator-happening-glow);",
    );
  });

  it("the tokens are mode-invariant: defined in the base :root, never redefined per mode", () => {
    const base = tokens.slice(
      tokens.indexOf(":root {"),
      tokens.indexOf(':root[data-mode="light"]'),
    );
    expect(base).toContain("--control-on:");
    const afterBase = tokens.slice(tokens.indexOf(':root[data-mode="light"]'));
    expect(afterBase).not.toContain("--control-on:");
    expect(afterBase).not.toContain("--control-on-glow:");
  });

  it("the glow chain resolves in BOTH modes (orbTokens defines the happening glow per mode)", () => {
    const defs = orbTokens.match(/--orb-indicator-happening-glow:/g) ?? [];
    expect(defs).toHaveLength(2); // dark block + light block
  });
});

describe("N5 control ambience — the shared C2 toggle (.c2s-toggle)", () => {
  it("ON lights the controlled behavior's color with an envelope glow; OFF is settled", () => {
    const on = blockFor(shell, '.c2s-toggle[data-on="1"] {');
    expect(on).toContain("background: var(--control-on);");
    expect(on).toContain("border-color: var(--control-on);");
    expect(on).toContain(
      "box-shadow: 0 0 12px color-mix(in srgb, var(--control-on-glow) 55%, transparent);",
    );
    expect(on).not.toContain("--accent-1"); // the pre-N5 decorative violet is gone
    const off = blockFor(shell, ".c2s-toggle {");
    expect(off).toContain("box-shadow: none;");
    expect(off).not.toContain("--control-on");
  });

  it("every canon state can re-key the control via data-control-state", () => {
    for (const st of STATES) {
      const rule = blockFor(shell, `.c2s-toggle[data-control-state="${st}"] {`);
      expect(rule).toContain(`--control-on: var(--orb-indicator-${st});`);
      expect(rule).toContain(
        `--control-on-glow: var(--orb-indicator-${st}-glow);`,
      );
    }
  });

  it("the flip transition is the QUIET token, and reduced motion swaps instantly", () => {
    const off = blockFor(shell, ".c2s-toggle {");
    expect(off).toContain("background var(--motion-tab)");
    expect(off).toContain("box-shadow var(--motion-tab)");
    const reduce = shell.slice(
      shell.indexOf("@media (prefers-reduced-motion: reduce)"),
    );
    expect(reduce).toMatch(
      /\.c2s-toggle,\s*\.c2s-toggle::after \{\s*\/\*[^*]*\*\/\s*transition: none;/,
    );
  });
});

describe("N5 control ambience — the shared Settings toggle (.you-settings-toggle)", () => {
  it("ON uses the canon token (hex only as its own fallback); the aria-checked twin rule agrees", () => {
    const on = blockFor(styles, ".you-settings-toggle.on {");
    expect(on).toContain("background: var(--control-on, #00E5FF);");
    expect(on).toContain("border-color: var(--control-on, #00E5FF);");
    expect(on).toContain(
      "0 0 12px color-mix(in srgb, var(--control-on-glow, rgba(0, 229, 255, 0.45)) 55%, transparent)",
    );
    const aria = blockFor(styles, '.you-settings-toggle[aria-checked="true"],');
    expect(aria).toContain("var(--control-on-glow");
    expect(aria).toContain("160ms");
    expect(aria).not.toContain("280ms");
    const consent = blockFor(styles, ".you-hub-consent .you-settings-toggle.on {");
    expect(consent).toContain("background: var(--control-on, #00E5FF);");
    // No toggle rule paints a raw hex background anymore.
    expect(styles).not.toMatch(/\.you-settings-toggle[^{]*\{[^}]*background: #00E5FF/);
  });

  it("every canon state can re-key the control via data-control-state", () => {
    for (const st of STATES) {
      const rule = blockFor(
        styles,
        `.you-settings-toggle[data-control-state="${st}"] {`,
      );
      expect(rule).toContain(`--control-on: var(--orb-indicator-${st});`);
      expect(rule).toContain(
        `--control-on-glow: var(--orb-indicator-${st}-glow);`,
      );
    }
  });

  it("reduced motion swaps instantly, same colors", () => {
    expect(styles).toMatch(
      /@media \(prefers-reduced-motion: reduce\) \{\s*\/\* N5[^*]*\*\/\s*\.you-settings-toggle,\s*\.you-settings-toggle-knob \{\s*transition: none;/,
    );
  });

  it("the founder's example is on the shared component: the Opal Assist switch is a .you-settings-toggle row", () => {
    expect(settingsTsx).toContain('id: "assist"');
    expect(settingsTsx).toContain("you-settings-toggle${on ? \" on\" : \"\"}");
    expect(c2YouTsx).toContain('className="c2s-toggle"');
  });
});

describe("N5 control ambience — the AR-00.2 envelope holds in both shared sheets", () => {
  it("no control glow exceeds 18px blur or a 55% mix of the glow token", () => {
    for (const css of [shell, styles]) {
      const glows = [
        ...css.matchAll(
          /0 0 (\d+)px color-mix\(in srgb, var\(--control-on-glow[\s\S]*?\) (\d+)%/g,
        ),
      ].map((m) => ({ blur: Number(m[1]), mix: Number(m[2]) }));
      expect(glows.length).toBeGreaterThan(0);
      for (const g of glows) {
        expect(g.blur).toBeLessThanOrEqual(18);
        expect(g.mix).toBeLessThanOrEqual(55);
      }
    }
  });
});
