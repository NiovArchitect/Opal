import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const fr = readFileSync(resolve(__dirname, "FirstRunExperience.tsx"), "utf8");

describe("auth error arbitration", () => {
  it("fr06 renders error XOR status — never both", () => {
    const fr06 = fr.slice(fr.indexOf('step === "fr06"'), fr.indexOf('step === "fr07"'));
    expect(fr06).toMatch(/error \? \(/);
    expect(fr06).toMatch(/: statusLine \? \(/);
    // Must not independently render both blocks in sequence without ternary
    expect(fr06).not.toMatch(/\{statusLine \?[\s\S]*?\}\{error \?/);
  });

  it("skip-for-now clears error before status helper", () => {
    const skip = fr.slice(fr.indexOf("founderSkipForNow"), fr.indexOf("const start = async"));
    expect(skip).toMatch(/setError\(null\)/);
    expect(skip).toMatch(/Phone verification is required to continue/);
  });
});
