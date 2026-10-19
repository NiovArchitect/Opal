/**
 * R19 polish P7 - AT-REST ambient legibility guards.
 *
 * The founder's ask (2026-10-19 16:27): ambience must read in a
 * STILL frame, not only in motion. The fix raised rest intensities
 * to the TOP of the Ambient Rulebook envelope (AR-00.2: fills
 * 6-20%, border mixes 42-55%, glows <= 18px at <= 55% strength) -
 * and never past it. These pins make the envelope load-bearing:
 * a future edit that dims rest back down, or pushes any ambient
 * value past the envelope, or spends a state hue as room light,
 * fails here by name.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const unify = readFileSync(resolve(__dirname, "unifyChats.css"), "utf8");
const shell = readFileSync(
  resolve(__dirname, "../c2/shell/c2shell.css"),
  "utf8",
);
const c1 = readFileSync(resolve(__dirname, "../opalUi/c1/c1.css"), "utf8");

describe("P7 at-rest - rest glows sit at the envelope top, derived from the state token", () => {
  it("chats rows (legacy + C1) glow 16px at 55% of the state's own glow token", () => {
    for (const st of ["action", "ready", "forming", "happening"]) {
      const needle = `box-shadow: 0 0 16px color-mix(in srgb, var(--orb-indicator-${st}-glow) 55%, transparent);`;
      // section 2 (legacy rows) + section 5 (C1 rows)
      expect(unify.split(needle).length - 1).toBe(2);
    }
  });

  it("the C2 register: action border joins the other states at 52%, action/ready glows are 18px at 55%", () => {
    expect(unify).toContain(
      "border: 1px solid color-mix(in srgb, var(--orb-indicator-action) 52%, transparent);",
    );
    expect(unify).toContain(
      "box-shadow: 0 0 18px color-mix(in srgb, var(--orb-indicator-action-glow) 55%, transparent);",
    );
    expect(unify).toContain(
      "box-shadow: 0 0 18px color-mix(in srgb, var(--orb-indicator-ready-glow) 55%, transparent);",
    );
  });

  it("forming/ready tinted grounds are 12% (fill envelope), plan-awareness fill is 14%", () => {
    expect(unify).toContain(
      "color-mix(in srgb, var(--orb-indicator-forming) 12%, var(--surface-1))",
    );
    expect(unify).toContain(
      "color-mix(in srgb, var(--orb-indicator-ready) 12%, var(--surface-1))",
    );
    expect(unify).toContain(
      "background: color-mix(in srgb, var(--pa-state) 14%, transparent);",
    );
  });
});

describe("P7 at-rest - the AR-00.2 envelope is a ceiling, not a target to exceed", () => {
  it("no indicator-glow mix in unifyChats.css exceeds 55%, and no ambient glow exceeds 18px", () => {
    const mixes = [...unify.matchAll(/--orb-indicator-\w+-glow\) (\d+)%/g)].map(
      (m) => Number(m[1]),
    );
    expect(mixes.length).toBeGreaterThan(0);
    expect(Math.max(...mixes)).toBeLessThanOrEqual(55);
    const glows = [...unify.matchAll(/box-shadow: 0 0 (\d+)px color-mix\(in srgb, var\(--orb-indicator/g)].map(
      (m) => Number(m[1]),
    );
    expect(glows.length).toBeGreaterThan(0);
    expect(Math.max(...glows)).toBeLessThanOrEqual(18);
  });

  it("past still rests: its C2 card and chats rows carry no glow token", () => {
    const pastBlocks = unify.match(
      /\[data-plan-state="past"\] \{[^}]*\}/g,
    ) ?? [];
    expect(pastBlocks.length).toBeGreaterThan(0);
    for (const block of pastBlocks) {
      expect(block).not.toContain("-glow");
    }
  });

  it("the AT-10 capped card still sheds its glow (coalescence untouched by the rest raise)", () => {
    expect(unify).toContain(
      '.c2s-root .c2-plan-card[data-lit="capped"] {\n  box-shadow: none;',
    );
  });
});

describe("P7 at-rest - room light is presence (ring metal), never a state hue", () => {
  it("Home's room light and the Center presence halo derive from --orb-ring-metal only", () => {
    expect(shell).toContain(
      '.c2s-scroll[data-testid="c2-home-scroll"]',
    );
    const homeRule = shell.match(
      /\.c2s-scroll\[data-testid="c2-home-scroll"\] \{[^}]*\}/,
    )?.[0];
    expect(homeRule).toContain("var(--orb-ring-metal) 10%");
    expect(homeRule).not.toContain("--orb-indicator");
    expect(homeRule).not.toContain("--state-");
    expect(shell).toContain("var(--orb-ring-metal) 14%, transparent");
  });

  it("the C1 happening halo (its pattern channel) derives from the state token at 45%", () => {
    expect(c1).toContain(
      "0 0 0 3px color-mix(in srgb, var(--state-happening) 45%, transparent)",
    );
  });
});
