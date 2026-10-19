/**
 * Repair #18 THEME UNIFICATION - indicator-drift checks for the
 * unified surfaces (communication-model section 9 / MP-11):
 *  - the SAME state renders the SAME token on the ChatsHome family
 *    (row / strip / call), on Home's plan cards, and everywhere else:
 *    every state treatment in unifyChats.css derives from
 *    --orb-indicator-<state>, and those tokens equal PLAN_STATE_HEX;
 *  - ambient intensity is achieved by MIXING the canonical token
 *    (color-mix from var(--pa-state) / var(--orb-indicator-*)), never
 *    by introducing a look-alike hue: the unify sheet contains no raw
 *    state hex at all;
 *  - decorative treatments carry NO canonical state hex: the retired
 *    neon treatments (per-name call-row borders, ear-gradient
 *    avatars, saturated bubble borders, the dock's cyan/gold/magenta
 *    ring) are gone from the unified surfaces' sources;
 *  - the dock halo break exists in BOTH shells' pads.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { PLAN_STATE_HEX } from "./planStateColors";

const unify = readFileSync(resolve(__dirname, "unifyChats.css"), "utf8");
const orbTokens = readFileSync(resolve(__dirname, "orbTokens.css"), "utf8");
const c2shell = readFileSync(
  resolve(__dirname, "../c2/shell/c2shell.css"),
  "utf8",
);
const chatsHome = readFileSync(
  resolve(__dirname, "../opalUi/ChatsHome.tsx"),
  "utf8",
);
const main = readFileSync(resolve(__dirname, "../main.tsx"), "utf8");

const STATES = ["forming", "action", "ready", "happening", "past"] as const;

describe("unify: indicator drift - one token source", () => {
  it("orb indicator tokens equal PLAN_STATE_HEX for every state", () => {
    for (const s of STATES) {
      const m = orbTokens.match(
        new RegExp(`--orb-indicator-${s}:\\s*(#[0-9a-fA-F]{6})`),
      );
      expect(m, `--orb-indicator-${s}`).not.toBeNull();
      expect(m![1]!.toLowerCase()).toBe(PLAN_STATE_HEX[s].toLowerCase());
    }
  });

  it("PlanAwareness ambient treatment mixes FROM --pa-state (the component's PLAN_STATE_HEX value)", () => {
    expect(unify).toContain("color-mix(in srgb, var(--pa-state) 52%, transparent)");
    expect(unify).toContain("color-mix(in srgb, var(--pa-state) 9%, transparent)");
  });

  it("Home plan-card treatments derive every state from its --orb-indicator token", () => {
    for (const s of STATES) {
      if (s === "past") continue; // past = the stone at rest: no indicator spent
      expect(unify).toContain(`var(--orb-indicator-${s})`);
    }
    expect(unify).toContain('.c2-plan-card[data-plan-state="past"]');
  });

  it("the unify sheet introduces NO raw canonical state hex (ambient = mixes of tokens only)", () => {
    for (const s of STATES) {
      expect(unify.toLowerCase()).not.toContain(PLAN_STATE_HEX[s].toLowerCase());
    }
  });

  it("unify sheet is imported in main.tsx after the Layout Contract", () => {
    expect(main.indexOf("unifyChats.css")).toBeGreaterThan(
      main.indexOf("layoutContract.css"),
    );
  });
});

describe("unify: retired loud treatments stay retired", () => {
  it("ChatsHome no longer paints a per-person borderColor from avatarTone", () => {
    expect(chatsHome).not.toContain("borderColor: r.avatarTone");
    expect(chatsHome).not.toContain("{ borderColor:");
  });

  it("call rows: per-name border rules are overridden and the missed edge is the action token", () => {
    expect(unify).toContain(".calls-continuity-row");
    expect(unify).toContain("var(--orb-indicator-action)");
    expect(unify).toContain("inset 3px 0 0");
  });

  it("ambient audit: the retired washes paint nothing (no wallpaper ambience)", () => {
    expect(unify).toContain(".chats-home .chats-ambient");
    expect(unify).toMatch(/\.chats-home \.chats-ambient \{\s*background: none;/);
    expect(unify).not.toContain("radial-gradient(ellipse 75% 52%");
    expect(unify).not.toContain("radial-gradient(ellipse 75% 40%");
  });

  it("legacy thread bubbles are borderless surface steps in the unify sheet", () => {
    expect(unify).toContain('.bubble-row.in .bubble.in');
    expect(unify).toContain('.bubble-row.out .bubble.out');
  });

  it("thread self label: the cyan ::before 'You' is quieted to ink", () => {
    expect(unify).toContain(".bubble-row.out .bubble-stack::before");
  });

  it("thread composer: the spectral gradient shell is overridden in-layer, scoped to the thread", () => {
    // The brand composer rule is !important inside @layer
    // brand-v4-components; the retirement must live in that layer
    // and target the real composer classes, scoped to the thread.
    expect(unify).toContain("@layer brand-v4-components");
    expect(unify).toContain(
      '[data-testid="member-conversation"] .composer-618.opal-composer-brand',
    );
    expect(unify).not.toContain("--opal-composer-gradient");
  });
});

describe("unify: dock halo break in both shells", () => {
  it("C2 dock: own border top is transparent; segments terminate at the disc edge", () => {
    expect(c2shell).toContain("border-top-color: transparent");
    expect(c2shell).toContain(".c2s-dock::before");
    expect(c2shell).toContain(".c2s-dock::after");
    expect(c2shell).toContain("calc(50% - 36px)");
  });

  it("legacy dock: the ring is ring-metal ambient, segmented around the center device", () => {
    expect(unify).toContain(".tabbar-option-b .dock-bar::before");
    expect(unify).toContain(".tabbar-option-b .dock-bar::after");
    expect(unify).toContain("var(--orb-ring-metal) 42%");
    expect(unify).toContain("border-top-color: transparent");
    expect(unify).toContain("width: 33%"); // top segments end before the device zone
    expect(unify.toLowerCase()).not.toContain("#00e5ff 0%");
  });
});
