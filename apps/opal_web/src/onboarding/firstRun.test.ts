import { describe, expect, it } from "vitest";
import { FIRST_RUN_STEPS } from "./FirstRunExperience";

describe("first-run narrative", () => {
  it("teaches Opal value without AI-hype or manipulation", () => {
    const blob = FIRST_RUN_STEPS.map((s) => `${s.title} ${s.body}`).join(" ").toLowerCase();
    expect(blob).toMatch(/conversation/);
    expect(blob).toMatch(/plan|follow/);
    expect(blob).toMatch(/private|calm/);
    expect(blob).not.toMatch(/don't miss|ai-powered|surveillance|daily engagement/);
    expect(blob).toMatch(/no ranking|no pressure|no public feed/);
  });

  it("has a clear enter beat", () => {
    expect(FIRST_RUN_STEPS.at(-1)?.id).toBe("calm");
  });
});
