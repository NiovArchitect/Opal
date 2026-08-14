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
    expect(BRAND.markName.toLowerCase()).toMatch(/orbital|arc|mark|opal/i);
    expect(BRAND.feel.toLowerCase()).toContain("futuristic");
    expect(BRAND.reject.join(" ")).toMatch(/whatsapp|speech-bubble/i);
    // Authority points at 93:5 — product uses repo rasters; Figma still pending fill
    expect(BRAND.figma.markNode).toBe("93:5");
    expect(BRAND.figma.brandAuthority).toBe("93:2");
    expect(BRAND.figma.wordmarkNode).toBe("93:7");
    expect(BRAND.figma.fullLockupNode).toBe("93:9");
    expect(BRAND.figma.supersededMarkNode).toBe("77:8");
    expect(BRAND.status.productBrandSource).toBe("VALID");
    expect(BRAND.status.figmaBrandSource).toMatch(/PENDING/i);
    expect(BRAND.figma.implementFromFigma).toBe(false);
    expect(BRAND.figma.implementFromRepoAssets).toBe(true);
    expect(BRAND.figma.finalMaster).toBe(false);
    expect(BRAND.reject.join(" ")).toMatch(/77:8|center spike|opposing arcs/i);
  });
});
