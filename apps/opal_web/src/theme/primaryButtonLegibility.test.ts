/**
 * @vitest-environment node
 *
 * Repair #19 W21 (F2) — STANDING GUARD for the primary-button
 * defect class (appeared twice: W8's blank chip, W20 pack's F2).
 *
 * The hazard is structural: styles.css carries an UNLAYERED global
 * reset `button { color: inherit }`, and unlayered author styles
 * beat @layer rules regardless of specificity — so a primary
 * button whose pairing lives only in a layered sheet computes its
 * LABEL as the surrounding ink while its BACKGROUND still comes
 * from the layer. In dark mode that was near-white text on the
 * near-white primary fill (person-profile "Message", share-sheet
 * "Copy details", the Graphs intention slab all illegible).
 *
 * This guard covers the shared primary CLASSES, not instances:
 *  1. the token pairs themselves (--primary-fill/--primary-ink and
 *     --primary-stage-fill/--primary-stage-ink) must be legible
 *     (WCAG contrast >= 4.5) in BOTH modes, resolved from
 *     c2Tokens.css;
 *  2. each shared primary class (.c2s-btn-primary, .c2-btn-primary)
 *     must carry its pairing in an UNLAYERED rule, so the pairing
 *     survives the global button reset.
 * jsdom cannot compute this cascade, so — like the W8 chip guard —
 * the guard is on the stylesheets themselves.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const WEB_ROOT = resolve(__dirname, "../..");
const read = (p: string) => readFileSync(resolve(WEB_ROOT, p), "utf8");

/** Remove @layer blocks (brace-matched) so only unlayered CSS remains. */
function unlayeredOnly(css: string): string {
  let out = "";
  let i = 0;
  while (i < css.length) {
    const at = css.indexOf("@layer", i);
    if (at === -1) {
      out += css.slice(i);
      break;
    }
    out += css.slice(i, at);
    const open = css.indexOf("{", at);
    const semi = css.indexOf(";", at);
    if (semi !== -1 && (open === -1 || semi < open)) {
      // @layer a, b; statement — no block.
      i = semi + 1;
      continue;
    }
    let depth = 0;
    let j = open;
    for (; j < css.length; j += 1) {
      if (css[j] === "{") depth += 1;
      else if (css[j] === "}") {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    i = j + 1;
  }
  return out;
}

function ruleBody(css: string, selector: string): string | null {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // The selector must BE the rule's selector (start of file or right
  // after a closing brace) — not the tail of a longer selector like
  // `.c2-splash-1--fullbleed .c2-btn-primary`.
  const m = css.match(
    new RegExp(`(?:^|\\})\\s*(?:\\/\\*[\\s\\S]*?\\*\\/\\s*)*${esc}\\s*\\{([^}]*)\\}`),
  );
  return m ? m[1].replace(/\/\*[\s\S]*?\*\//g, "") : null;
}

function hexLuminance(hex: string): number {
  const n = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => {
    const v = parseInt(n.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [l1, l2] = [hexLuminance(a), hexLuminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/** Resolve the per-mode token values from c2Tokens.css. */
function modeTokens(css: string, mode: "light" | "dark"): Map<string, string> {
  const blockRe =
    mode === "dark"
      ? /:root\[data-mode="dark"\]\s*\{([\s\S]*?)\n  \}/
      : /:root\[data-mode="light"\]\s*\{([\s\S]*?)\n  \}/;
  // The light block is written as `:root, :root[data-mode="light"] {`.
  const lightAlt = /:root,\s*:root\[data-mode="light"\]\s*\{([\s\S]*?)\n  \}/;
  const m = css.match(mode === "dark" ? blockRe : lightAlt) ?? css.match(blockRe);
  expect(m, `${mode} token block exists`).not.toBeNull();
  const tokens = new Map<string, string>();
  for (const decl of m![1].matchAll(/--([\w-]+):\s*([^;]+);/g)) {
    tokens.set(decl[1], decl[2].trim());
  }
  const resolveVar = (name: string, seen = new Set<string>()): string => {
    const raw = tokens.get(name);
    expect(raw, `--${name} defined in ${mode}`).toBeTruthy();
    const varRef = /^var\(--([\w-]+)\)$/.exec(raw!);
    if (varRef && !seen.has(varRef[1])) {
      seen.add(varRef[1]);
      return resolveVar(varRef[1], seen);
    }
    return raw!;
  };
  for (const key of [...tokens.keys()]) tokens.set(key, resolveVar(key));
  return tokens;
}

describe("F2 — primary button pairing is legible in both modes, at the class level", () => {
  const tokensCss = read("src/theme/c2Tokens.css");

  it("the hazard is on record: styles.css carries the unlayered button color reset", () => {
    const styles = read("src/styles.css");
    expect(styles).toMatch(/button,\s*input\s*\{\s*font:\s*inherit;\s*color:\s*inherit;/);
  });

  for (const mode of ["light", "dark"] as const) {
    it(`${mode}: --primary-fill vs --primary-ink contrast >= 4.5`, () => {
      const t = modeTokens(tokensCss, mode);
      expect(contrast(t.get("primary-fill")!, t.get("primary-ink")!)).toBeGreaterThanOrEqual(4.5);
    });
    it(`${mode}: --primary-stage-fill vs --primary-stage-ink contrast >= 4.5`, () => {
      const t = modeTokens(tokensCss, mode);
      expect(
        contrast(t.get("primary-stage-fill")!, t.get("primary-stage-ink")!),
      ).toBeGreaterThanOrEqual(4.5);
    });
  }

  it(".c2s-btn-primary carries its pairing in an UNLAYERED rule (survives the reset)", () => {
    const body = ruleBody(unlayeredOnly(read("src/c2/shell/c2shell.css")), ".c2s-btn-primary");
    expect(body, "unlayered .c2s-btn-primary rule exists").not.toBeNull();
    expect(body!).toMatch(/background:\s*var\(--primary-fill\)/);
    expect(body!).toMatch(/color:\s*var\(--primary-ink\)/);
  });

  it(".c2-btn-primary carries its pairing in an UNLAYERED rule (survives the reset)", () => {
    const body = ruleBody(unlayeredOnly(read("src/c2/c2.css")), ".c2-btn-primary");
    expect(body, "unlayered .c2-btn-primary rule exists").not.toBeNull();
    expect(body!).toMatch(/background:\s*var\(--primary-stage-fill\)/);
    expect(body!).toMatch(/color:\s*var\(--primary-stage-ink\)/);
  });
});
