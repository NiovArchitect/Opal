/**
 * First-run mobile reachability — fluid phone shell laws.
 * FIXED_844_STAGE_AS_APP_SHELL = 0
 * Phone physical experience is authority (100dvh + safe-area).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(__dirname, "../styles.css"), "utf8");

function block(haystack: string, startMarker: string, endMarker: string) {
  const i = haystack.indexOf(startMarker);
  expect(i).toBeGreaterThan(-1);
  const j = haystack.indexOf(endMarker, i + startMarker.length);
  return j > i ? haystack.slice(i, j) : haystack.slice(i);
}

function baseRule(selector: string) {
  // Anchor at line start so compound selectors (e.g. `.app … .fr-auth-v4`) do not win.
  const re = new RegExp(
    `(?:^|\\n)${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{[^}]*\\}`,
  );
  const m = css.match(re);
  expect(m, `missing base rule for ${selector}`).toBeTruthy();
  return m![0];
}

describe("first-run fluid phone shell", () => {
  it("FIXED_844_STAGE_AS_APP_SHELL=0 for .fr-splash / .fr-auth-v4", () => {
    const splash = baseRule(".fr-splash");
    const auth = baseRule(".fr-auth-v4");
    expect(splash).not.toMatch(/height:\s*844px/);
    expect(splash).not.toMatch(/min-height:\s*844px/);
    expect(auth).not.toMatch(/height:\s*844px/);
    expect(auth).not.toMatch(/min-height:\s*844px/);
    expect(css).not.toMatch(
      /html:not\(\.opal-native-host\) \.fr-splash[\s\S]*?height:\s*calc\(844px/,
    );
  });

  it("uses 100dvh for first-run stages and scrollport (not 100vh)", () => {
    const law = block(css, "First-run scrollport.", "POST-R1B native shell law");
    expect(law).toMatch(/height:\s*100dvh/);
    expect(law).not.toMatch(/100vh/);
    expect(law).toMatch(/\.app\.app-first-run-splash[\s\S]*overflow-y:\s*auto/);
    expect(law).toMatch(/\.app\.app-first-run-promise/);
    expect(law).toMatch(/\.app\.app-premember:has\(\.first-run\)/);

    expect(baseRule(".fr-splash")).toMatch(/height:\s*100dvh/);
    expect(baseRule(".fr-auth-v4")).toMatch(/height:\s*100dvh/);
    expect(css).toMatch(/\.first-run-promise-page\s*\{[^}]*height:\s*100dvh/);
  });

  it("bottom-anchors primary CTAs with safe-area on phone widths", () => {
    const phone = block(
      css,
      "Fluid phone first-run / auth (browser + native).",
      ".app-first-run-splash .app-ambient",
    );
    expect(phone).toMatch(/@media\s*\(max-width:\s*519px\)/);
    expect(phone).toMatch(
      /\.fr-auth-v4 \.fr-primary[\s\S]*?bottom:\s*calc\(66px \+ env\(safe-area-inset-bottom, 0px\)\)/,
    );
    expect(phone).toMatch(
      /\.fr-splash-tap[\s\S]*?bottom:\s*calc\(100px \+ env\(safe-area-inset-bottom, 0px\)\)/,
    );
    expect(phone).toMatch(
      /\.first-run-promise-cta[\s\S]*?bottom:\s*calc\(48px \+ env\(safe-area-inset-bottom, 0px\)\)/,
    );
    expect(phone).toMatch(/env\(safe-area-inset-top, 0px\)/);
  });

  it("keeps native-host bottom anchors (no double safe-area stage padding)", () => {
    expect(css).toMatch(
      /html\.opal-native-host \.first-run-promise-cta[\s\S]*?bottom:\s*calc\(48px \+ env\(safe-area-inset-bottom, 0px\)\)/,
    );
    expect(css).not.toMatch(
      /html:not\(\.opal-native-host\) \.fr-splash[\s\S]{0,200}?padding-bottom:\s*env\(safe-area-inset-bottom/,
    );
  });
});
