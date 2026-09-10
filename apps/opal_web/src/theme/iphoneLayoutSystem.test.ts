/**
 * Physical iPhone layout system — structural ownership tests.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(__dirname, "../styles.css"), "utf8");

describe("iPhone layout system (native host)", () => {
  it("defines canonical dock exclusion tokens including safe bottom", () => {
    expect(css).toMatch(/--opal-dock-exclusion-height/);
    expect(css).toMatch(/--opal-dock-shell-height:\s*86px/);
    expect(css).toMatch(/--dock-clearance:\s*calc\(/);
  });

  it("centers Option B dock on full-width native stage", () => {
    expect(css).toMatch(
      /html\.opal-native-host \.tabbar\.tabbar-option-b[\s\S]*?translateX\(-50%\)/,
    );
  });

  it("Home scroll uses dock clearance instead of fixed 844 on native host", () => {
    expect(css).toMatch(
      /html\.opal-native-host[\s\S]*?\.gsh\.scroll[\s\S]*?padding-bottom:\s*var\(--dock-clearance\)/,
    );
  });

  it("OTP/profile/find use flow layout so wrapping text cannot collide", () => {
    expect(css).toMatch(/\.fr-auth-v4\.fr-verify[\s\S]*?flex-direction:\s*column/);
    expect(css).toMatch(/\.fr-auth-v4\.fr-profile[\s\S]*?flex-direction:\s*column/);
    expect(css).toMatch(/\.fr-auth-v4\.fr-find[\s\S]*?flex-direction:\s*column/);
  });

  it("Opal Center composer sits above dock exclusion", () => {
    expect(css).toMatch(
      /html\.opal-native-host \.opal-composer[\s\S]*?bottom:\s*calc\(var\(--dock-clearance\)/,
    );
  });

  it("does not reintroduce 390 letterbox card on native host", () => {
    const native = css.slice(css.indexOf("PHYSICAL IPHONE LAYOUT SYSTEM"));
    expect(native).not.toMatch(/max-width:\s*390px;\s*margin:\s*0 auto/);
  });
});
