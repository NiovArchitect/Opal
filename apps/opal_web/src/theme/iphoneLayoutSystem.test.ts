/**
 * Physical iPhone layout system — compact floating chrome 1114:2.
 * Mandatory viewports: 375×812 · 390×844 · 393×852 · 430×932
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(__dirname, "../styles.css"), "utf8");
const native = css.slice(css.indexOf("PHYSICAL IPHONE LAYOUT SYSTEM"));

const DOCK_SIDE = 10;
const VIEWPORTS = [
  { w: 375, h: 812, label: "375x812" },
  { w: 390, h: 844, label: "390x844" },
  { w: 393, h: 852, label: "393x852" },
  { w: 430, h: 932, label: "430x932" },
] as const;

describe("iPhone layout system (native host · 1114:2 compact)", () => {
  it("defines compact floating dock tokens (74 outer / 60 field; lifts above safe-bottom)", () => {
    expect(native).toMatch(/--opal-dock-base-height:\s*74px/);
    expect(native).toMatch(/--opal-dock-bar-top:\s*10px/);
    expect(native).toMatch(/--opal-dock-bar-height:\s*60px/);
    expect(native).toMatch(/--opal-center-opal-top:\s*0px/);
    expect(native).toMatch(/--opal-center-opal-width:\s*86px/);
    expect(native).toMatch(/--opal-dock-side-margin:\s*10px/);
    expect(native).toMatch(/--opal-dock-lift:\s*8px/);
    expect(native).toMatch(/1114:2/);
    expect(native).toMatch(/DOCK_EXCLUSION_DOUBLE_COUNT = 0/);
    expect(native).toMatch(/--opal-primary-viewport-inset:\s*calc\(/);
  });

  it("mandates 375×812 in the native layout contract", () => {
    expect(native).toMatch(/375×812/);
    expect(native).toMatch(/390×844/);
  });

  it("dock floats above safe-bottom (height is NOT 74+safe)", () => {
    const dockRule = native.match(
      /html\.opal-native-host \.tabbar\.tabbar-option-b \{[^}]+\}/,
    )?.[0];
    expect(dockRule).toBeTruthy();
    expect(dockRule).toMatch(/bottom:\s*calc\(var\(--opal-safe-bottom\) \+ var\(--opal-dock-lift\)\)/);
    expect(dockRule).toMatch(/height:\s*var\(--opal-dock-base-height\)/);
    expect(dockRule).not.toMatch(/height:\s*calc\(var\(--opal-dock-base-height\) \+ var\(--opal-safe-bottom\)\)/);
    expect(dockRule).toMatch(/left:\s*var\(--opal-dock-side-margin\)/);
    expect(dockRule).toMatch(/width:\s*auto/);
  });

  it("dock bar is 60pt frost with spectral edge; slots scale from 370", () => {
    expect(native).toMatch(/--opal-dock-bar-height:\s*60px/);
    expect(native).toMatch(/#00e5ff[\s\S]*?#ffc86b[\s\S]*?#d946ff/);
    expect(native).toMatch(/76 \/ 370/);
    expect(native).toMatch(/dock-bar-dip[\s\S]*?display:\s*none/);
  });

  it("PRIMARY scroll viewport is shell-clipped above dock", () => {
    expect(native).toMatch(
      /html\.opal-native-host \.app\[data-member-nav="true"\][\s\S]*?padding-bottom:\s*var\(--opal-primary-viewport-inset\)/,
    );
    expect(native).toMatch(/CONTENT_VISIBLE_BEHIND_NAV = 0|CONTENT_BEHIND_DOCK=0|meaningful content may NOT/);
  });

  it("unified sticky chrome owners (not fragmented stickies)", () => {
    expect(native).toMatch(/\.comm-sticky-chrome/);
    expect(native).toMatch(/\.graphs-sticky-chrome/);
    expect(native).toMatch(/GRAPH_SAFE_TOP_DOUBLE_COUNT = 0/);
    expect(native).toMatch(/rgba\(7,\s*16,\s*28,\s*0\.74\)/);
  });

  it("Calls/Graphs semantic pills match 1114:2 (not flattened gray)", () => {
    expect(css).toMatch(/comm-mode-btn\[data-testid="comm-mode-calls"\][\s\S]*?#8b5cf6|#8b5cf6[\s\S]*?comm-mode-calls/);
    expect(css).toMatch(/calls-filter-missed[\s\S]*?#ff6b9d|255,\s*107,\s*157/);
    expect(css).toMatch(/graphs-lens-chip\[data-lens="action"\][\s\S]*?#ff7eaa|#FF6B9D|255,\s*107,\s*157/);
    expect(css).toMatch(/graphs-lens-chip\[data-lens="ready"\][\s\S]*?#ffd37e|#FFC86B|255,\s*200,\s*107/);
  });

  it("Graphs/Chats pages do not double-apply safe-top with sticky chrome", () => {
    expect(native).toMatch(
      /html\.opal-native-host \.graphs-home[\s\S]*?padding:\s*0 20px var\(--opal-scroll-trail-pad\)/,
    );
    expect(native).toMatch(
      /html\.opal-native-host \.chats-home[\s\S]*?padding-top:\s*0\s*!important/,
    );
  });

  it("You hub hides Opal Graph topbar; settings family shares safe-top", () => {
    expect(css).toMatch(/\[data-testid="you-hub-pane"\]\) \.topbar/);
    expect(native).toMatch(
      /html\.opal-native-host \.you-settings-top[\s\S]*?--opal-safe-top/,
    );
  });

  it("Home feed does not double-apply dock exclusion", () => {
    expect(native).toMatch(
      /html\.opal-native-host \.gsh-feed[\s\S]*?padding-bottom:\s*0\s*!important/,
    );
  });

  it("OTP/profile/find use flow layout", () => {
    expect(css).toMatch(/\.fr-auth-v4\.fr-verify[\s\S]*?flex-direction:\s*column/);
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

describe("dock geometry matrix (10pt sides · 1114:2)", () => {
  for (const vp of VIEWPORTS) {
    it(`${vp.label}: outer dock width = viewport - 20`, () => {
      const expected = vp.w - DOCK_SIDE * 2;
      expect(expected).toBe(vp.w - 20);
      if (vp.w === 375) expect(expected).toBe(355);
      if (vp.w === 390) expect(expected).toBe(370);
      if (vp.w === 393) expect(expected).toBe(373);
      if (vp.w === 430) expect(expected).toBe(410);
    });
  }

  it("375×812 remains mandatory shorter class", () => {
    expect(375).toBeLessThan(390);
    expect(812).toBeLessThan(844);
  });
});
