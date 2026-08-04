/**
 * Social desirability + persona smoke (SF14) — evidence for stickiness without manipulation.
 */
import { describe, expect, it } from "vitest";
import { CHATS, INITIAL_NEEDS, PLANS, THREADS } from "./data";
import { FIRST_RUN_STEPS } from "./onboarding/FirstRunExperience";
import { PRODUCT_COPY } from "./designTokens";
import { BRAND } from "./brand/brand";

describe("social stickiness smoke", () => {
  it("first-time desirability: intro teaches medium in under ~60s of reading", () => {
    const words = FIRST_RUN_STEPS.map((s) => `${s.title} ${s.body}`).join(" ").split(/\s+/);
    expect(words.length).toBeLessThan(220);
    expect(FIRST_RUN_STEPS.length).toBeLessThanOrEqual(6);
    expect(FIRST_RUN_STEPS.some((s) => /plan|dinner|thursday/i.test(s.body))).toBe(true);
    expect(FIRST_RUN_STEPS.some((s) => /private|calm/i.test(`${s.title} ${s.body}`))).toBe(true);
  });

  it("friend-pair: dinner spark → journey signal is dynamic (not an identity subtitle)", () => {
    const jordan = CHATS.find((c) => c.id === "jordan");
    // After availability reply the demo surface shows "Still open", not a permanent name label.
    expect(jordan?.signal).toBe("open_loop");
    expect(jordan?.signalLabel).toMatch(/still open|becoming a plan/i);
    expect(jordan?.contextLine).toBeFalsy();
    expect(THREADS.jordan?.[0]?.signal?.label).toMatch(/plan/i);
    expect(THREADS.jordan?.[1]?.signal?.label).toMatch(/still open/i);
  });

  it("group: open loop without dashboard chrome", () => {
    const group = CHATS.find((c) => c.id === "group");
    expect(group?.signal).toBe("open_loop");
    // Group chats may show participant context; 1:1 must not use signal as name subtitle.
    expect(group?.contextLine).toBeTruthy();
  });

  it("quiet conversation may show no journey signal", () => {
    const quiet = CHATS.find((c) => c.id === "quiet");
    expect(quiet?.signalLabel).toBeUndefined();
    expect(THREADS.quiet?.every((m) => !m.signal)).toBe(true);
  });

  it("family: pickup readiness is legible", () => {
    const marcus = CHATS.find((c) => c.id === "marcus");
    expect(marcus?.signal).toBe("ready");
    expect(PLANS.some((p) => /pickup/i.test(p.title))).toBe(true);
  });

  it("romantic/close pair: shared moment framing exists", () => {
    const maya = CHATS.find((c) => c.id === "maya");
    expect(maya?.signalLabel?.toLowerCase()).toMatch(/moment|harbor/);
  });

  it("skeptical user: no ranking, no engagement bait, no public feed pitch", () => {
    const blob = [
      ...Object.values(PRODUCT_COPY),
      ...FIRST_RUN_STEPS.map((s) => `${s.title} ${s.body}`),
      BRAND.tagline,
    ]
      .join(" ")
      .toLowerCase();
    expect(blob).not.toMatch(/streak|follower|leaderboard|don't miss|limited time/);
    expect(blob).toMatch(/private|calm|conversation/);
  });

  it("repeat-user: needs-you and coming-up give momentum without guilt", () => {
    expect(INITIAL_NEEDS.length).toBeGreaterThan(0);
    expect(PRODUCT_COPY.emptyNeedsYou.toLowerCase()).not.toMatch(/miss|guilt|behind/);
    expect(PRODUCT_COPY.needsYouLabel).toBe("Needs you");
  });

  it("aha + coolness signals are product-native not gimmick", () => {
    expect(BRAND.feel.toLowerCase()).toMatch(/futuristic/);
    expect(CHATS.filter((c) => c.signalLabel).length).toBeGreaterThanOrEqual(3);
    expect(FIRST_RUN_STEPS[0]?.title).toMatch(/conversation/i);
  });
});
