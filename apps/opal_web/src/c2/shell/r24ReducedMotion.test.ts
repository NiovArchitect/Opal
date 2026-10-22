/**
 * Repair #24 (WS-7) - REDUCED MOTION BY CONSTRUCTION, pinned.
 *
 * The R22 fragility (repair22-handoff WS-2, declared): c2shell's
 * reduced rule (.c2s-stone-orbit { animation: none }, specificity
 * 0-1-0) LOSES the animation-name cascade to the per-state orbit
 * rules (0-3-0); the spec was met only because styles.css carries
 * a global !important collapse (animation-duration 0.01ms). The
 * R24 hardening gates EVERY per-state orbit animation behind
 * @media (prefers-reduced-motion: no-preference), so under
 * reduce no animation is ever assigned to the orbit at all.
 *
 * These pins are a specificity / cascade audit over the shipped
 * stylesheet (the r22StreamRhythm CSS-text precedent): they parse
 * c2shell.css with its media context, and FAIL if any future
 * state rule assigns a non-none animation to .c2s-stone-orbit
 * outside the no-preference gate - at ANY specificity, in any
 * later file position. The gate, not a cascade fight, is what
 * the pin binds.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const rawCss = readFileSync(resolve(__dirname, "c2shell.css"), "utf8");
const css = rawCss.replace(/\/\*[\s\S]*?\*\//g, "");

type Rule = { selector: string; body: string; media: string[] };

function parseRules(text: string): Rule[] {
  const rules: Rule[] = [];
  type Frame = { prelude: string; bodyStart: number; media: string[] };
  const stack: Frame[] = [];
  let preludeStart = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (ch === "{") {
      const prelude = text.slice(preludeStart, i).trim().replace(/\s+/g, " ");
      const parentMedia = stack.length > 0 ? stack[stack.length - 1]!.media : [];
      const media = prelude.startsWith("@media")
        ? [...parentMedia, prelude]
        : parentMedia;
      stack.push({ prelude, bodyStart: i + 1, media });
      preludeStart = i + 1;
    } else if (ch === "}") {
      const frame = stack.pop();
      if (frame && !frame.prelude.startsWith("@")) {
        rules.push({
          selector: frame.prelude,
          body: text.slice(frame.bodyStart, i),
          media: frame.media,
        });
      }
      preludeStart = i + 1;
    } else if (ch === ";" && stack.length === 0) {
      preludeStart = i + 1;
    }
  }
  return rules;
}

/** (a, b, c) specificity: ids, classes/attrs/pseudo-classes,
 *  elements/pseudo-elements. Good enough for the selectors this
 *  surface ships (no :not/:is arguments in c2shell orbit rules). */
function specificity(selector: string): [number, number, number] {
  const s = selector.replace(/"[^"]*"/g, '""');
  const a = (s.match(/#[\w-]+/g) ?? []).length;
  const pseudoElements = (s.match(/::[\w-]+/g) ?? []).length;
  const withoutPseudoElements = s.replace(/::[\w-]+/g, "");
  const b =
    (withoutPseudoElements.match(/\.[\w-]+/g) ?? []).length +
    (withoutPseudoElements.match(/\[[^\]]*\]/g) ?? []).length +
    (withoutPseudoElements.match(/:[\w-]+/g) ?? []).length;
  const elements = withoutPseudoElements
    .replace(/#[\w-]+/g, " ")
    .replace(/\.[\w-]+/g, " ")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/:[\w-]+(\([^)]*\))?/g, " ")
    .split(/[\s>+~*,]+/)
    .filter((t) => /^[a-zA-Z][\w-]*$/.test(t)).length;
  return [a, b, elements + pseudoElements];
}

const rules = parseRules(css);
const orbitRules = rules.filter((r) => r.selector.includes(".c2s-stone-orbit"));
const animationOf = (r: Rule): string | null => {
  const m = r.body.match(/(?:^|;)\s*animation\s*:\s*([^;]+);/);
  return m ? m[1]!.trim() : null;
};
const NO_PREFERENCE = "@media (prefers-reduced-motion: no-preference)";
const REDUCE = "@media (prefers-reduced-motion: reduce)";

describe("R24 WS-7 - the orbit rests under reduced motion by construction", () => {
  it("every non-none orbit animation is assigned inside the no-preference gate, and nowhere else", () => {
    const assigned = orbitRules.filter((r) => {
      const a = animationOf(r);
      return a !== null && a !== "none";
    });
    // The four state motions exist (the design did not die)...
    expect(assigned.length).toBe(4);
    // ...and every one of them is gated.
    for (const rule of assigned) {
      expect(rule.media, rule.selector).toContain(NO_PREFERENCE);
      expect(rule.media, rule.selector).not.toContain(REDUCE);
    }
  });

  it("the resting/attention motion design is byte-identical under no-preference (Live 7s / New 26s / Loved 44s / Nearby 34s)", () => {
    const byState = new Map<string, string>();
    for (const rule of orbitRules) {
      const a = animationOf(rule);
      if (!a || a === "none") continue;
      const state = rule.selector.match(/\[data-state="(\w+)"\]/)?.[1];
      if (state) byState.set(state, a);
    }
    expect(byState.get("happening")).toBe("c2s-stone-orbit 7s linear infinite");
    expect(byState.get("new")).toBe("c2s-stone-orbit 26s linear infinite");
    expect(byState.get("loved")).toBe("c2s-stone-orbit 44s linear infinite");
    expect(byState.get("nearby")).toBe("c2s-stone-orbit 34s linear infinite");
    expect(css).toContain("@keyframes c2s-stone-orbit");
  });

  it("the reduced rule still exists as defense in depth - and the pin proves the gate does not depend on it winning", () => {
    const reduced = orbitRules.filter(
      (r) => animationOf(r) === "none" && r.media.includes(REDUCE),
    );
    expect(reduced.length).toBeGreaterThanOrEqual(1);
    // The historical losing fight, stated as a fact of the sheet:
    // the reduced rule (0-1-0) is WEAKER than every gated state
    // rule (0-3-0). If a future change un-gates a state rule,
    // the first test above fails - this one documents why that
    // failure matters: the cascade alone would not save it.
    const reducedSpec = specificity(reduced[0]!.selector);
    expect(reducedSpec).toEqual([0, 1, 0]);
    for (const rule of orbitRules) {
      const a = animationOf(rule);
      if (a && a !== "none") expect(specificity(rule.selector)).toEqual([0, 3, 0]);
    }
  });

  it("no orbit rule smuggles motion through the animation longhands outside the gate", () => {
    for (const rule of orbitRules) {
      if (rule.media.includes(NO_PREFERENCE)) continue;
      expect(rule.body, rule.selector).not.toMatch(/animation-name\s*:\s*c2s-stone-orbit/);
      expect(rule.body, rule.selector).not.toMatch(
        /animation-duration\s*:\s*(?!0\.01ms|0s|0ms)[^;]+/,
      );
    }
  });
});
