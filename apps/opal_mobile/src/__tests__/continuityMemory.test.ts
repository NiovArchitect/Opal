import {
  isProhibitedContinuityCopy,
  silenceIsNotConsent,
  traditionAllowsSkip,
} from "../socialFlow/continuityMemory";

describe("continuityMemory", () => {
  test("blocks retention and guilt copy", () => {
    expect(isProhibitedContinuityCopy("Save Harbor Table as a tradition?")).toBe(false);
    expect(isProhibitedContinuityCopy("Keep the tradition alive!")).toBe(true);
    expect(isProhibitedContinuityCopy("You are losing touch")).toBe(true);
    expect(isProhibitedContinuityCopy("relationship score")).toBe(true);
  });

  test("silence is not consent", () => {
    expect(silenceIsNotConsent(1, 2)).toBe(true);
    expect(silenceIsNotConsent(2, 2)).toBe(false);
  });

  test("traditions allow skip without pressure", () => {
    expect(traditionAllowsSkip()).toBe(true);
  });
});
