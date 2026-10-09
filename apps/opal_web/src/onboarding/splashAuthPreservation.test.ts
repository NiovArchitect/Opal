/**
 * P0-05.10 — Splash spectral stroke + Auth FR06–FR09 geometry preservation.
 * Brand V4 = colors + logo treatment only. No redesign.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(__dirname, "../styles.css"), "utf8");
const fr = readFileSync(resolve(__dirname, "FirstRunExperience.tsx"), "utf8");

function block(haystack: string, startMarker: string, endMarker: string) {
  const i = haystack.indexOf(startMarker);
  expect(i).toBeGreaterThan(-1);
  const j = haystack.indexOf(endMarker, i + startMarker.length);
  return j > i ? haystack.slice(i, j) : haystack.slice(i);
}

describe("P0-05.10 Splash primary stroke (631:7 actual paint)", () => {
  it("SPLASH_PRIMARY_STROKE_NOT_SOLID_CYAN", () => {
    const tap = block(css, ".fr-splash-tap {", "\n.fr-splash-returning");
    expect(tap).toMatch(/\.fr-splash-tap::before/);
    expect(tap).toMatch(/padding:\s*1\.25px/);
    expect(tap).toMatch(/linear-gradient/);
    // Must not implement as plain cyan border only
    expect(tap).not.toMatch(/border:\s*1(?:\.0)?px\s+solid\s+#00e5ff/i);
  });

  it("SPLASH_PRIMARY_STROKE_HAS_3_STOPS", () => {
    const stroke = block(css, ".fr-splash-tap::before {", "\n.fr-splash-tap >");
    expect(stroke).toMatch(/#00e5ff/i);
    expect(stroke).toMatch(/#ffc86b/i);
    expect(stroke).toMatch(/#d946ff/i);
    expect(stroke).toMatch(/50%/);
  });
});

describe("P0-05.10 Auth preserves FR06–FR09 geometry", () => {
  it("AUTH_PHONE_PRESERVES_FR06_GEOMETRY", () => {
    // Paste W4 — phone is a scrolling document-flow column (zero overlaps).
    expect(css).toMatch(/\.fr-auth-v4\.fr-phone\.fr-screen[\s\S]*?overflow-y:\s*auto/);
    expect(css).toMatch(/\.fr-auth-v4\.fr-phone \.fr-phone-field[\s\S]*?position:\s*relative/);
    expect(css).toMatch(/\.fr-auth-v4\.fr-phone \.fr-phone-field[\s\S]*?max-width:\s*346px/);
    expect(css).toMatch(/\.fr-auth-v4\.fr-phone \.fr-primary[\s\S]*?position:\s*relative/);
    expect(css).toMatch(/\.fr-auth-v4\.fr-phone \.fr-primary[\s\S]*?height:\s*58px/);
    expect(css).toMatch(/\.fr-auth-v4\.fr-phone \.fr-skip-for-now[\s\S]*?position:\s*relative/);
    expect(css).toMatch(/border-radius:\s*18px/);
    expect(css).toMatch(/border-radius:\s*28px/);
  });

  it("AUTH_VERIFY_PRESERVES_FR07_GEOMETRY", () => {
    expect(css).toMatch(/\.fr-auth-v4 \.fr-code-cell[\s\S]*?width:\s*48px/);
    expect(css).toMatch(/\.fr-auth-v4 \.fr-code-cell[\s\S]*?height:\s*56px/);
    expect(css).toMatch(/\.fr-auth-v4 \.fr-code-cell[\s\S]*?border-radius:\s*14px/);
    expect(css).toMatch(/fr07-resend[\s\S]*?top:\s*340px/);
  });

  it("AUTH_PROFILE_PRESERVES_FR08_GEOMETRY", () => {
    expect(css).toMatch(/\.fr-auth-v4 \.fr-profile-ring[\s\S]*?left:\s*147px/);
    expect(css).toMatch(/\.fr-auth-v4 \.fr-profile-ring[\s\S]*?top:\s*228px/);
    expect(css).toMatch(/\.fr-auth-v4 \.fr-profile-ring[\s\S]*?width:\s*96px/);
    expect(css).toMatch(/\.fr-auth-v4 \.fr-profile-edit[\s\S]*?left:\s*214px/);
    expect(css).toMatch(/\.fr-auth-v4 \.fr-profile-edit[\s\S]*?top:\s*294px/);
    expect(css).toMatch(/#fr-name[\s\S]*?top:\s*424px/);
    expect(css).toMatch(/#fr-username[\s\S]*?top:\s*534px/);
  });

  it("AUTH_FIND_PEOPLE_PRESERVES_FR09_GEOMETRY", () => {
    // fr09 Assist is off the W4 first-run path; keep card chrome + relative CTAs.
    expect(css).toMatch(/\.fr-auth-v4 \.fr-find-card[\s\S]*?top:\s*250px/);
    expect(css).toMatch(/\.fr-auth-v4 \.fr-find-card[\s\S]*?width:\s*346px/);
    expect(css).toMatch(/\.fr-auth-v4 \.fr-find-card[\s\S]*?height:\s*92px/);
    expect(css).toMatch(/fr-find-actions \.fr-primary[\s\S]*?position:\s*relative/);
    expect(css).toMatch(/\.fr-auth-v4 \.fr-not-now[\s\S]*?top:\s*720px/);
    expect(css).toMatch(/\.fr-auth-v4 \.fr-not-now[\s\S]*?height:\s*54px/);
  });

  it("AUTH_NO_EXTRA_AMBIENT_CIRCLES", () => {
    const auth = block(css, "P0-05.10 Auth", "S1 Final First Run");
    expect(auth).toMatch(/content:\s*none\s*!important/);
    expect(auth).not.toMatch(/radial-gradient\(circle/);
    expect(fr).not.toMatch(/fr-auth-ambient/);
  });

  it("AUTH_NO_HEADER_DIVIDER", () => {
    expect(css).toMatch(/AUTH_NO_HEADER_DIVIDER/);
    expect(css).toMatch(/\.fr-auth-divider[\s\S]*?display:\s*none/);
  });

  it("AUTH_PROFILE_NO_EXTRA_RING", () => {
    const ring = block(css, ".fr-auth-v4 .fr-profile-ring {", "\n.fr-auth-v4 .fr-profile-initials");
    expect(ring).toMatch(/box-shadow:\s*none/);
    expect(ring).toMatch(/width:\s*96px/);
    expect(ring).not.toMatch(/118px/);
  });

  it("auth header uses compact FR footprint not hero logo", () => {
    expect(fr).toMatch(/fr-auth-header/);
    expect(fr).toMatch(/width=\{39\}/);
    expect(css).toMatch(/\.fr-auth-header-emblem[\s\S]*?39\.2px/);
    expect(css).not.toMatch(/\.fr-auth-hero-mark img[\s\S]*?120px/);
  });
});
