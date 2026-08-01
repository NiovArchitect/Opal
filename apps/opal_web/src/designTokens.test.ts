import { describe, expect, it } from "vitest";
import { PRODUCT_COPY, tokens } from "./designTokens";

describe("product design tokens", () => {
  it("uses messenger-class dark shell colors from Pro Max filter", () => {
    expect(tokens.color.bg).toBe("#0B0F14");
    expect(tokens.color.accent).toBe("#2563EB");
    expect(tokens.color.online).toBe("#059669");
    expect(tokens.font.sans.toLowerCase()).toContain("inter");
  });

  it("has no demo language in product copy", () => {
    const blob = JSON.stringify(PRODUCT_COPY).toLowerCase();
    expect(blob).not.toMatch(/demo|synthetic|fixture|placeholder product/i);
    expect(PRODUCT_COPY.appName).toBe("Opal");
    expect(PRODUCT_COPY.composerPlaceholder).toBe("Message");
  });
});
