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

  it("brand mark is ownable and premium void grammar", () => {
    expect(BRAND.markName.toLowerCase()).toMatch(/graph|symbol|mark|opal|168/i);
    expect(BRAND.feel.toLowerCase()).toMatch(/void|steel|cyan|premium|futuristic/);
    expect(BRAND.reject.join(" ")).toMatch(/whatsapp|speech-bubble/i);
    // Authority corrected: 160:2 colorful master; 168:2 defective/superseded.
    expect(BRAND.figma.symbolVisualMaster).toBe("160:2");
    expect(BRAND.figma.symbolDefective168).toBe("168:2");
    expect(BRAND.figma.brandLock).toBe("159:2");
    expect(BRAND.figma.firstRun).toBe("217:2");
    expect(BRAND.figma.visualConvergence).toBe("201:2");
    expect(BRAND.figma.supersededMarkNode).toBe("77:8");
    expect(BRAND.status.productBrandSource).toBe("VALID");
    expect(BRAND.status.figmaBrandSource).toBe("VALID");
    expect(BRAND.figma.implementFromFigma).toBe(true);
    expect(BRAND.status.symbolVisualMaster).toBe("160:2");
    expect(BRAND.reject.join(" ")).toMatch(/77:8|center spike|opposing arcs|168:2|black plate/i);
  });
});
