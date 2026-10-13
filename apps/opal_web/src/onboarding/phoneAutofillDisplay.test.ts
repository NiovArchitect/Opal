import { describe, expect, it } from "vitest";
import { normalizePhoneInput } from "../api/productClient";
import { PHONE_DIAL_OPTIONS, splitPhoneForDisplay } from "./FirstRunExperience";

describe("phone autofill display split", () => {
  it("keeps national digits when +1 already selected (8585551212)", () => {
    const split = splitPhoneForDisplay("8585551212", "+1");
    expect(split.dial).toBe("+1");
    expect(split.national).toBe("8585551212");
    expect(normalizePhoneInput(split.national, split.dial)).toBe("+18585551212");
  });

  it("strips leading country digit when autofill inserts 18585551212", () => {
    const split = splitPhoneForDisplay("18585551212", "+1");
    expect(split.dial).toBe("+1");
    expect(split.national).toBe("8585551212");
    expect(split.national.startsWith("1")).toBe(false);
    expect(normalizePhoneInput(split.national, split.dial)).toBe("+18585551212");
  });

  it("adopts dial and strips prefix for +18585551212", () => {
    const split = splitPhoneForDisplay("+18585551212", "+1");
    expect(split.dial).toBe("+1");
    expect(split.national).toBe("8585551212");
    expect(normalizePhoneInput(split.national, split.dial)).toBe("+18585551212");
  });

  it("handles formatted (858) 555-1212", () => {
    const split = splitPhoneForDisplay("(858) 555-1212", "+1");
    expect(split.dial).toBe("+1");
    expect(split.national).toBe("8585551212");
    expect(normalizePhoneInput(split.national, split.dial)).toBe("+18585551212");
  });

  it("supports another dial (+52) without duplicating country code", () => {
    const split = splitPhoneForDisplay("+525512345678", "+1");
    expect(split.dial).toBe("+52");
    expect(split.national).toBe("5512345678");
    expect(normalizePhoneInput(split.national, split.dial)).toBe("+525512345678");
  });

  it("exports dial options used by the phone field", () => {
    expect(PHONE_DIAL_OPTIONS.some((o) => o.dial === "+1")).toBe(true);
    expect(PHONE_DIAL_OPTIONS.some((o) => o.dial === "+44")).toBe(true);
  });
});
