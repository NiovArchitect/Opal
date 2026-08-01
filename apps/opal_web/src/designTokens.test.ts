import { describe, expect, it } from "vitest";
import { PRODUCT_COPY, tokens } from "./designTokens";

describe("design tokens", () => {
  it("uses calm dark shell without AI purple gradients", () => {
    expect(tokens.color.bg).toBe("#0B0F14");
    expect(tokens.color.accent).toBe("#2563EB");
    // Accent is product blue — not purple/pink AI-gradient kitsch
    expect(tokens.color.accent).not.toMatch(/#a|#[cdef].*f|#f[0-9a-f]{2}[a-f]/i);
  });

  it("carries product honesty copy", () => {
    expect(PRODUCT_COPY.honesty).toMatch(/Elixir/i);
    expect(PRODUCT_COPY.notList.some((x) => /score/i.test(x))).toBe(true);
  });
});
