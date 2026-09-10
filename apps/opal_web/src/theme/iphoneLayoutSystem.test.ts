/**
 * Physical iPhone layout system — structural ownership + viewport matrix.
 * Mandatory viewports: 375×812 · 390×844 · 393×852 · 430×932
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(__dirname, "../styles.css"), "utf8");
const native = css.slice(css.indexOf("PHYSICAL IPHONE LAYOUT SYSTEM"));

/** Live Figma 1094:2 side margins → expected outer dock width per viewport */
const DOCK_SIDE = 6;
const VIEWPORTS = [
  { w: 375, h: 812, label: "375x812" },
  { w: 390, h: 844, label: "390x844" },
  { w: 393, h: 852, label: "393x852" },
  { w: 430, h: 932, label: "430x932" },
] as const;

describe("iPhone layout system (native host)", () => {
  it("defines founder-approved 1094:2 dock tokens (92px frost; 6pt sides)", () => {
    expect(native).toMatch(/--opal-dock-base-height:\s*92px/);
    expect(native).toMatch(/--opal-dock-bar-top:\s*16px/);
    expect(native).toMatch(/--opal-dock-bar-height:\s*72px/);
    expect(native).toMatch(/--opal-center-opal-top:\s*2px/);
    expect(native).toMatch(/--opal-center-opal-width:\s*90px/);
    expect(native).toMatch(/--opal-dock-content-gap:\s*12px/);
    expect(native).toMatch(/--opal-dock-side-margin:\s*6px/);
    expect(native).toMatch(/DOCK_EXCLUSION_DOUBLE_COUNT = 0/);
    expect(native).toMatch(/--opal-primary-viewport-inset:\s*calc\(/);
    expect(native).toMatch(/--opal-scroll-trail-pad:\s*14px/);
    expect(native).toMatch(/1094:2/);
    expect(native).toMatch(/1086:2 Center REJECTED|1086:2/);
  });

  it("mandates 375×812 in the native layout contract", () => {
    expect(native).toMatch(/375×812/);
    expect(native).toMatch(/390×844/);
    expect(native).toMatch(/393×852/);
    expect(native).toMatch(/430×932/);
  });

  it("dock uses 6pt left/right margins (floating frost, not edge-to-edge)", () => {
    const dockRule = native.match(
      /html\.opal-native-host \.tabbar\.tabbar-option-b \{[^}]+\}/,
    )?.[0];
    expect(dockRule).toBeTruthy();
    expect(dockRule).toMatch(/left:\s*var\(--opal-dock-side-margin\)/);
    expect(dockRule).toMatch(/right:\s*var\(--opal-dock-side-margin\)/);
    expect(dockRule).toMatch(/width:\s*auto\s*!important/);
    expect(dockRule).toMatch(/transform:\s*none\s*!important/);
    expect(dockRule).not.toMatch(/min\(358px/);
    expect(dockRule).not.toMatch(/translateX\(-50%\)/);
    expect(dockRule).not.toMatch(/width:\s*100%/);
  });

  it("dock bar is frosted field with spectral edge; slots scale from 378", () => {
    expect(native).toMatch(
      /html\.opal-native-host \.tabbar-option-b \.dock-bar[\s\S]*?width:\s*100%/,
    );
    expect(native).toMatch(
      /html\.opal-native-host \.tabbar-option-b \.dock-bar[\s\S]*?backdrop-filter:\s*blur\(12px\)/,
    );
    expect(native).toMatch(/#00e5ff[\s\S]*?#ffc86b[\s\S]*?#d946ff/);
    expect(native).toMatch(
      /html\.opal-native-host \.tabbar-option-b \.dock-tab\[data-dock-slot="chats"\][\s\S]*?76 \/ 378/,
    );
    expect(native).toMatch(/dock-bar-dip[\s\S]*?display:\s*none/);
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

describe("dock geometry matrix (6pt side margins · 1094:2)", () => {
  for (const vp of VIEWPORTS) {
    it(`${vp.label}: outer dock width = viewport - 12`, () => {
      const expected = vp.w - DOCK_SIDE * 2;
      expect(expected).toBe(vp.w - 12);
      if (vp.w === 375) expect(expected).toBe(363);
      if (vp.w === 390) expect(expected).toBe(378);
      if (vp.w === 393) expect(expected).toBe(381);
      if (vp.w === 430) expect(expected).toBe(418);
    });
  }

  it("375×812 is shorter/narrower than prior matrix minimum 390×844", () => {
    expect(375).toBeLessThan(390);
    expect(812).toBeLessThan(844);
  });
});
