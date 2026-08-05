import { describe, expect, it } from "vitest";
import { FIRST_RUN_STEPS } from "./FirstRunExperience";
import { PRODUCT_COPY } from "../designTokens";

describe("first-run narrative", () => {
  it("teaches Opal value without AI-hype or manipulation", () => {
    const blob = FIRST_RUN_STEPS.map((s) => `${s.title} ${s.body}`).join(" ").toLowerCase();
    expect(blob).toMatch(/conversation/);
    expect(blob).toMatch(/plan|follow|happen/);
    // Privacy remains a product quality on early screens; climax is conversion payoff.
    expect(blob).toMatch(/private|people/);
    expect(blob).toMatch(/should actually happen|carry it forward|taking shape/);
    expect(blob).not.toMatch(/don't miss|ai-powered|surveillance|daily engagement/);
    expect(blob).not.toMatch(/calm\. human\. yours|private by design/);
  });

  it("keeps screens 1-4 and converts only the final join beat", () => {
    expect(FIRST_RUN_STEPS[0]?.title).toBe("Life starts in conversation.");
    expect(FIRST_RUN_STEPS[1]?.title).toBe("When talk becomes something real.");
    expect(FIRST_RUN_STEPS[2]?.title).toBe("Decide without killing the vibe.");
    expect(FIRST_RUN_STEPS[3]?.title).toBe("Moments that actually happen.");
    expect(FIRST_RUN_STEPS.at(-1)?.id).toBe("join");
    expect(FIRST_RUN_STEPS.at(-1)?.title).toBe(
      "More of what you talk about should actually happen.",
    );
    expect(PRODUCT_COPY.onboardingEnter).toBe("Join");
    expect(PRODUCT_COPY.onboardingEnterAria).toBe("Join Opal");
  });
});
