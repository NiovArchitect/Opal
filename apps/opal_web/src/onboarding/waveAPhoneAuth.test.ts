/**
 * P0-05.11A — international phone + auth chrome laws.
 */
import { describe, expect, it } from "vitest";
import { normalizePhoneInput } from "../api/productClient";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const fr = readFileSync(resolve(__dirname, "FirstRunExperience.tsx"), "utf8");
const css = readFileSync(resolve(__dirname, "../styles.css"), "utf8");

describe("P0-05.11A phone international + auth chrome", () => {
  it("PHONE_NOT_FORCED_TO_US / PHONE_ACCEPTS_E164", () => {
    expect(normalizePhoneInput("5550100001", "+1")).toBe("+15550100001");
    expect(normalizePhoneInput("5512345678", "+52")).toBe("+525512345678");
    expect(normalizePhoneInput("7700900123", "+44")).toBe("+447700900123");
    expect(normalizePhoneInput("9171234567", "+63")).toBe("+639171234567");
    expect(normalizePhoneInput("+525512345678", "+1")).toBe("+525512345678");
  });

  it("COUNTRY_CODE_SELECTABLE", () => {
    expect(fr).toMatch(/fr06-dial-select/);
    expect(fr).toMatch(/PHONE_DIAL_OPTIONS/);
    expect(fr).toMatch(/\+52/);
    expect(fr).toMatch(/\+44/);
    expect(fr).toMatch(/\+63/);
  });

  it("PHONE_HELPER_BELOW_INPUT", () => {
    expect(css).toMatch(/\.fr-auth-v4 \.fr-phone-hint[\s\S]*?top:\s*354px/);
    expect(fr).toMatch(/fr06-phone-hint/);
  });

  it("SKIP_FOR_NOW_NO_BORDER", () => {
    expect(css).toMatch(/\.fr-auth-v4 \.fr-skip-for-now[\s\S]*?border:\s*0\s*!important/);
    expect(css).toMatch(/\.fr-auth-v4 \.fr-skip-for-now[\s\S]*?background:\s*transparent\s*!important/);
  });

  it("VERIFY_CHANGE_NUMBER_TEXT_ONLY", () => {
    expect(fr).toMatch(/fr-text-action fr-change-number/);
    expect(css).toMatch(/\.fr-auth-v4 \.fr-change-number[\s\S]*?border:\s*0\s*!important/);
  });

  it("PREVIEW_CODE_NOT_IN_PRODUCT_UI", () => {
    expect(fr).not.toMatch(/Preview code:/);
    expect(fr).not.toMatch(/fr07-dev-code/);
    expect(fr).not.toMatch(/className="dev-code"/);
    expect(fr).toMatch(/OPAL_DEV_OTP/);
  });
});
