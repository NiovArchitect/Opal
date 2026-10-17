import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const fr = readFileSync(resolve(__dirname, "FirstRunExperience.tsx"), "utf8");

describe("auth error arbitration", () => {
  it("fr06 renders error XOR status - never both", () => {
    const fr06 = fr.slice(fr.indexOf('step === "fr06"'), fr.indexOf('step === "fr07"'));
    expect(fr06).toMatch(/error \? \(/);
    expect(fr06).toMatch(/: statusLine \? \(/);
    // Must not independently render both blocks in sequence without ternary
    expect(fr06).not.toMatch(/\{statusLine \?[\s\S]*?\}\{error \?/);
  });

  it("skip-for-now clears error before status helper", () => {
    // Repair #16-W2: the non-seed branch that only displayed "Phone
    // verification is required to continue." is removed, and the control
    // itself is rendered only on founder-seed builds. On the seed path the
    // arbitration still holds: the error is cleared before any status line
    // is set, so the two never collide in the fr06 message slot.
    const skip = fr.slice(fr.indexOf("founderSkipForNow"), fr.indexOf("const start = async"));
    expect(fr).toMatch(/founderReview \? \(/);
    expect(fr).toMatch(/data-testid="fr06-verify-required"/);
    const errIdx = skip.indexOf("setError(null)");
    const statusIdx = skip.indexOf("setStatusLine(");
    expect(errIdx).toBeGreaterThan(-1);
    expect(statusIdx).toBeGreaterThan(errIdx);
    expect(skip).not.toMatch(/Phone verification is required to continue/);
  });
});
