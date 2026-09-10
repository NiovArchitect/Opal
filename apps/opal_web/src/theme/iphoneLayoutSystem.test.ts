/**
 * Physical iPhone layout system — structural ownership tests.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(__dirname, "../styles.css"), "utf8");

describe("iPhone layout system (native host)", () => {
  it("defines canonical Figma dock tokens (86px frame; no second orb overhang)", () => {
    expect(css).toMatch(/--opal-dock-base-height:\s*86px/);
    expect(css).toMatch(/--opal-dock-bar-top:\s*22px/);
    expect(css).toMatch(/--opal-dock-bar-height:\s*62px/);
    expect(css).toMatch(/--opal-center-opal-top:\s*7px/);
    expect(css).toMatch(/--opal-dock-content-gap:\s*12px/);
    expect(css).toMatch(/DOCK_EXCLUSION_DOUBLE_COUNT = 0/);
    expect(css).toMatch(/--dock-clearance:\s*calc\(/);
  });

  it("You/settings family inherits shared safe-top (not hub-only)", () => {
    expect(css).toMatch(
      /html\.opal-native-host \.you-settings-top[\s\S]*?safe-area-inset-top|html\.opal-native-host \.you-settings-top[\s\S]*?--opal-safe-top/,
    );
    expect(css).toMatch(
      /html\.opal-native-host \.you-settings-title[\s\S]*?--opal-safe-top/,
    );
    expect(css).toMatch(
      /html\.opal-native-host \.you-settings-body[\s\S]*?--opal-safe-top/,
    );
  });

  it("Home feed does not double-apply dock-clearance", () => {
    expect(css).toMatch(
      /html\.opal-native-host \.gsh-feed[\s\S]*?padding-bottom:\s*14px\s*!important/,
    );
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
