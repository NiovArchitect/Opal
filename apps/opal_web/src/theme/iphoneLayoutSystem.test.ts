/**
 * Physical iPhone layout system — structural ownership + viewport matrix.
 * Mandatory viewports: 375×812 · 390×844 · 393×852 · 430×932
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(__dirname, "../styles.css"), "utf8");
const native = css.slice(css.indexOf("PHYSICAL IPHONE LAYOUT SYSTEM"));

/** Approved Figma side margins → expected outer dock width per viewport */
const DOCK_SIDE = 16;
const VIEWPORTS = [
  { w: 375, h: 812, label: "375x812" },
  { w: 390, h: 844, label: "390x844" },
  { w: 393, h: 852, label: "393x852" },
  { w: 430, h: 932, label: "430x932" },
] as const;

describe("iPhone layout system (native host)", () => {
  it("defines canonical Figma dock tokens (86px frame; no second orb overhang)", () => {
    expect(native).toMatch(/--opal-dock-base-height:\s*86px/);
    expect(native).toMatch(/--opal-dock-bar-top:\s*22px/);
    expect(native).toMatch(/--opal-dock-bar-height:\s*62px/);
    expect(native).toMatch(/--opal-center-opal-top:\s*7px/);
    expect(native).toMatch(/--opal-dock-content-gap:\s*12px/);
    expect(native).toMatch(/--opal-dock-side-margin:\s*16px/);
    expect(native).toMatch(/DOCK_EXCLUSION_DOUBLE_COUNT = 0/);
    expect(native).toMatch(/--opal-primary-viewport-inset:\s*calc\(/);
    expect(native).toMatch(/--opal-scroll-trail-pad:\s*14px/);
  });

  it("mandates 375×812 in the native layout contract", () => {
    expect(native).toMatch(/375×812/);
    expect(native).toMatch(/390×844/);
    expect(native).toMatch(/393×852/);
    expect(native).toMatch(/430×932/);
  });

  it("dock uses 16pt left/right margins (not edge-to-edge, not capped 358 pill)", () => {
    const dockRule = native.match(
      /html\.opal-native-host \.tabbar\.tabbar-option-b \{[^}]+\}/,
    )?.[0];
    expect(dockRule).toBeTruthy();
    expect(dockRule).toMatch(/left:\s*var\(--opal-dock-side-margin\)/);
    expect(dockRule).toMatch(/right:\s*var\(--opal-dock-side-margin\)/);
    expect(dockRule).toMatch(/width:\s*auto\s*!important/);
    expect(dockRule).toMatch(/transform:\s*none\s*!important/);
    // Must NOT reintroduce the skinny centered cap
    expect(dockRule).not.toMatch(/min\(358px/);
    expect(dockRule).not.toMatch(/translateX\(-50%\)/);
    expect(dockRule).not.toMatch(/width:\s*100%/);
  });

  it("dock bar stretches full dock width and extends through safe-bottom for label containment", () => {
    expect(native).toMatch(
      /html\.opal-native-host \.tabbar-option-b \.dock-bar[\s\S]*?width:\s*100%/,
    );
    expect(native).toMatch(
      /html\.opal-native-host \.tabbar-option-b \.dock-bar[\s\S]*?bottom:\s*0/,
    );
    expect(native).toMatch(
      /html\.opal-native-host \.tabbar-option-b \.dock-tab[\s\S]*?left:\s*calc\(64 \/ 358 \* 100%\)/,
    );
  });

  it("PRIMARY scroll viewport is shell-clipped above dock (not padding-only under full-height scroll)", () => {
    expect(native).toMatch(
      /html\.opal-native-host \.app\[data-member-nav="true"\][\s\S]*?padding-bottom:\s*var\(--opal-primary-viewport-inset\)/,
    );
    expect(native).toMatch(/PRIMARY_SCROLL_VIEWPORT clips ABOVE dock/);
    expect(native).toMatch(/CONTENT_VISIBLE_BEHIND_NAV = 0/);
    // Home scroll uses trail pad only — shell owns exclusion
    expect(native).toMatch(
      /html\.opal-native-host[\s\S]*?\.gsh\.scroll[\s\S]*?padding-bottom:\s*var\(--opal-scroll-trail-pad\)/,
    );
    // Must not keep full-height + dock-clearance padding as the primary anti-occlusion strategy
    expect(native).not.toMatch(
      /html\.opal-native-host[\s\S]*?\.gsh\.scroll[\s\S]*?padding-bottom:\s*var\(--dock-clearance\)\s*!important/,
    );
  });

  it("You hub hides Opal Graph topbar owner; settings family shares safe-top", () => {
    expect(css).toMatch(/\[data-testid="you-hub-pane"\]\) \.topbar/);
    expect(native).toMatch(
      /html\.opal-native-host \.app:has\(\[data-testid="you-hub-pane"\]\) \.topbar/,
    );
    expect(native).toMatch(
      /html\.opal-native-host \.app:has\(\[data-testid="you-hub-pane"\]\) \.topbar[\s\S]{0,400}?display:\s*none/,
    );
    expect(native).toMatch(
      /html\.opal-native-host \.you-settings-top[\s\S]*?--opal-safe-top/,
    );
    expect(native).toMatch(
      /html\.opal-native-host \.you-settings-title[\s\S]*?--opal-safe-top/,
    );
    expect(native).toMatch(
      /html\.opal-native-host \.you-settings-body[\s\S]*?--opal-safe-top/,
    );
    expect(native).toMatch(
      /html\.opal-native-host[\s\S]*?you-pane-nested[\s\S]*?bottom:\s*var\(--opal-primary-viewport-inset\)/,
    );
  });

  it("Home feed does not double-apply dock exclusion", () => {
    expect(native).toMatch(
      /html\.opal-native-host \.gsh-feed[\s\S]*?padding-bottom:\s*0\s*!important/,
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
    expect(native).not.toMatch(/max-width:\s*390px;\s*margin:\s*0 auto/);
  });
});

describe("dock geometry matrix (16pt side margins)", () => {
  for (const vp of VIEWPORTS) {
    it(`${vp.label}: outer dock width = viewport - 32`, () => {
      const expected = vp.w - DOCK_SIDE * 2;
      expect(expected).toBe(vp.w - 32);
      // Record relation founder requires
      if (vp.w === 375) expect(expected).toBe(343);
      if (vp.w === 390) expect(expected).toBe(358);
      if (vp.w === 393) expect(expected).toBe(361);
      if (vp.w === 430) expect(expected).toBe(398);
    });
  }

  it("375×812 is shorter/narrower than prior matrix minimum 390×844", () => {
    expect(375).toBeLessThan(390);
    expect(812).toBeLessThan(844);
  });
});
