/**
 * First-run mobile reachability.
 * 844px Figma stages stay. The shell must scroll on a short visible viewport.
 * CTA coordinates are not relocated.
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

describe("first-run mobile scrollport", () => {
  it("uses dvh and lets the first-run shell scroll", () => {
    const law = block(css, "First-run scrollport.", "POST-R1B native shell law");
    expect(law).toMatch(/height:\s*100dvh/);
    expect(law).not.toMatch(/100vh/);
    expect(law).toMatch(/\.app\.app-first-run-splash[\s\S]*overflow-y:\s*auto/);
    expect(law).toMatch(/\.app\.app-first-run-promise/);
    expect(law).toMatch(/\.app\.app-premember:has\(\.first-run\)/);
    expect(law).toMatch(/flex-shrink:\s*0/);
  });

  it("does not move splash, promise, or auth CTA coordinates", () => {
    expect(css).toMatch(/\.fr-splash-tap\s*\{[^}]*top:\s*700px/);
    expect(css).toMatch(/\.fr-splash-returning\s*\{[^}]*top:\s*766px/);
    expect(css).toMatch(/\.first-run-promise-cta\s*\{[^}]*top:\s*590px/);
    expect(css).toMatch(/\.fr-auth-v4 \.fr-primary,\s*\n\.fr-auth-v4 \.btn\.primary\.fr-primary\s*\{[^}]*top:\s*720px/);
  });

  it("adds browser safe-area below the 844 stage without replacing native bottom anchors", () => {
    expect(css).toMatch(
      /html:not\(\.opal-native-host\) \.fr-splash[\s\S]*?env\(safe-area-inset-bottom, 0px\)/,
    );
    expect(css).toMatch(
      /html\.opal-native-host \.first-run-promise-cta[\s\S]*?bottom:\s*calc\(48px \+ env\(safe-area-inset-bottom, 0px\)\)/,
    );
  });
});
