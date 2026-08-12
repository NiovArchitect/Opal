import { describe, expect, it } from "vitest";
import { FORBIDDEN_COPY, PRODUCT_COPY, tokens } from "./designTokens";
import { BRAND } from "./brand/brand";

describe("design tokens + brand", () => {
  it("uses futuristic luminous palette (not WhatsApp green)", () => {
    expect(tokens.color.bg).toMatch(/^#0/i);
    expect(tokens.color.accent.toLowerCase()).not.toMatch(/#25d366|#128c7e/);
    expect(tokens.color.accent).toBe("#6EE7F5");
    expect(tokens.color.iris).toBeTruthy();
  });

  it("has no forbidden product copy", () => {
    const blob = Object.values(PRODUCT_COPY).join(" ").toLowerCase();
    for (const phrase of FORBIDDEN_COPY) {
      expect(blob).not.toContain(phrase);
    }
    expect(PRODUCT_COPY.composerPlaceholder).toBe("Message");
  });

  it("brand mark is ownable and futuristic", () => {
    expect(BRAND.markName).toBe("Lumen Lens");
    expect(BRAND.feel.toLowerCase()).toContain("futuristic");
    expect(BRAND.reject.join(" ")).toMatch(/whatsapp|speech-bubble/i);
  });
});
