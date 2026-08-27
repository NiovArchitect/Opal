/**
 * P0-05 — Regression tests for founder-discovered rejected states.
 * Each expensive defect must become a durable test so it cannot silently return.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { isFounderSeedEnabled } from "./founderGraphSeed";

const root = resolve(__dirname, "../..");
const src = (...p: string[]) => readFileSync(resolve(root, "src", ...p), "utf8");
const pub = (...p: string[]) => resolve(root, "public", ...p);

describe("P0-05 rejected-state regressions", () => {
  it("Promise canonical SHA matches authority", () => {
    const buf = readFileSync(pub("brand/opal-graph/opal-promise-exact-941x1672.png"));
    const sha = createHash("sha256").update(buf).digest("hex");
    expect(sha).toBe("20c5210ff89e911368479463780eed37dce6fe2e994c61cda13982eaa2ddcf10");
  });

  it("Center Opal canonical asset exists", () => {
    const buf = readFileSync(pub("brand/opal-graph/opal-center-opal-645-3-rest-512.png"));
    expect(buf.byteLength).toBeGreaterThan(1000);
  });

  it("Direct Juniper is Figma 618:376 bytes (not gradient-only)", () => {
    const dated = src("opalUi/DatedConversationContent.tsx");
    expect(dated).toMatch(/opal-direct-juniper-618-376/);
    const jpg = readFileSync(pub("figma-v2/direct/opal-direct-juniper-618-376.jpg"));
    const sha = createHash("sha256").update(jpg).digest("hex");
    expect(sha).toBe("d6d8c288dc4176477c4fae90d9702863811fbb5030ba03ed65dfe029a0de4916");
  });

  it("founder seed is off by default (no query / env)", () => {
    const prev = window.location.href;
    // jsdom default location typically has no opal_founder_seed
    expect(isFounderSeedEnabled()).toBe(false);
    void prev;
  });

  it("Activity destination title is Activity, not Needs you", () => {
    const t = src("opalUi/ActivityDestination.tsx");
    expect(t).toMatch(/Activity/);
    expect(t).not.toMatch(/>Needs you</);
    expect(t).not.toMatch(/title=\{?["']Needs you["']/);
  });

  it("GraphsHome uses Action filter (not Needs you)", () => {
    const t = src("opalUi/GraphsHome.tsx");
    expect(t).toMatch(/Action/);
    expect(t).toMatch(/All/);
    expect(t).toMatch(/Ready/);
  });

  it("GraphDetailSheet has no Commit / Enter Journey CTA", () => {
    const t = src("opalUi/GraphDetailSheet.tsx");
    expect(t).not.toMatch(/>Enter Journey</);
    expect(t).not.toMatch(/>Commit/);
    expect(t).not.toMatch(/["']Enter Journey["']/);
  });

  it("ChatsHome has no Messages/Calls segmented tabs", () => {
    const t = src("opalUi/ChatsHome.tsx");
    expect(t).toMatch(/no Messages\/Calls/i);
    expect(t).not.toMatch(/<button[^>]*>\s*Messages\s*</);
  });

  it("CallSurfaces has no Flip", () => {
    const t = src("opalUi/CallSurfaces.tsx");
    expect(t).not.toMatch(/call-flip/);
    expect(t).not.toMatch(/>\s*Flip\s*</);
  });

  it("call surfaces are present as CallSurfaces module", () => {
    const t = src("opalUi/CallSurfaces.tsx");
    expect(t).toMatch(/data-testid=["']call-surface["']/);
    expect(t).toMatch(/call-end/);
  });

  it("Direct dated typography uses 17px/600 bodies (not 15/400)", () => {
    const css = src("styles.css");
    expect(css).toMatch(/\.dated-direct\s+\.dated-bubble-body\s*\{[^}]*font-size:\s*17px/s);
    expect(css).toMatch(/\.dated-direct\s+\.dated-bubble-body\s*\{[^}]*font-weight:\s*600/s);
  });

  it("Group dated typography uses 14px/600 bodies (not Direct 17)", () => {
    const css = src("styles.css");
    expect(css).toMatch(/\.dated-group\s+\.dated-bubble-body\s*\{[^}]*font-size:\s*14px/s);
    expect(css).toMatch(/\.dated-group\s+\.dated-bubble-body\s*\{[^}]*font-weight:\s*600/s);
  });

  it("Group send has no outlined border; Direct send remains distinct", () => {
    const css = src("styles.css");
    const group = css.match(
      /\[data-chat-kind="group"\][^\n]*\.composer-618\s+\.send-btn\s*\{[^}]+\}/s,
    );
    expect(group).toBeTruthy();
    expect(group![0]).not.toMatch(/border:\s*1px solid/);
    expect(css).toMatch(/send-glyph-group/);
    expect(css).toMatch(/\[data-chat-kind="direct"\][^\n]*\.send-btn/);
  });

  it("Option B dock geometry constants remain in CSS", () => {
    const css = src("styles.css");
    expect(css).toMatch(/tabbar-option-b/);
    expect(css).toMatch(/left:\s*146px/);
    expect(css).toMatch(/top:\s*-4px/);
  });

  it(".app > * excludes call-surface, tabbar, dated-conv", () => {
    const css = src("styles.css");
    const m = css.match(/\.app\s*>\s*\*(?::not\([^)]+\))+/);
    expect(m).toBeTruthy();
    const rule = m![0];
    expect(rule).toMatch(/call-surface/);
    expect(rule).toMatch(/tabbar/);
    expect(rule).toMatch(/dated-conv/);
    expect(rule).toMatch(/composer/);
  });

  it("brand registry lists superseded spectral screens", () => {
    const brand = src("brand/brand.ts");
    for (const n of ["539:5", "540:2", "541:8", "554:5"]) {
      expect(brand).toContain(`"${n}"`);
    }
    expect(brand).toContain('directConversation: "618:348"');
    expect(brand).toContain('groupConversation: "618:451"');
  });

  it("You settings destination exists distinct from person profile", () => {
    const you = src("opalUi/YouSettingsDestination.tsx");
    const person = src("opalUi/GraphProfilePage.tsx");
    expect(you.length).toBeGreaterThan(100);
    expect(person.length).toBeGreaterThan(100);
    expect(you).not.toEqual(person);
  });
});
