/**
 * Repair #24 - V2DOCK DEAD RULE, retired and pinned.
 *
 * The R22 WS-8 declaration (repair22-handoff): technicolorProduction
 * .css carried an 18x3 cyan bar rule for .tab.active::after whose
 * only matching component, V2Dock in v2Primitives.tsx, was exported
 * but never rendered anywhere in src. Verified at the R23 tip:
 * grep for V2Dock across src returned only its own definition;
 * the live docks cannot match the rule (OpalApp renders
 * .tabbar.tabbar-option-b - excluded by the rule's own
 * :not(.tabbar-option-b) - with .dock-tab children, never .tab;
 * C2Shell's pad is .c2s-dock). The rule and the dead export are
 * removed together in R24; these pins keep both dead, and keep
 * the live docks' own rules untouched (over-deletion guard).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const cssRaw = readFileSync(resolve(__dirname, "technicolorProduction.css"), "utf8");
// Rules only: the R24 removal is documented in a comment in the
// sheet that names the dead selector in prose - comments are not
// cascade, so the pins below read the sheet with comments off.
const css = cssRaw.replace(/\/\*[\s\S]*?\*\//g, "");
const primitives = readFileSync(
  resolve(__dirname, "../opalUi/v2Primitives.tsx"),
  "utf8",
);
const app = readFileSync(resolve(__dirname, "../OpalApp.tsx"), "utf8");

describe("R24 V2Dock - the dead bar rule and the dead export stay dead", () => {
  it("technicolorProduction.css carries no ::after bar for .tab.active / .tab.on", () => {
    expect(css).not.toMatch(/\.tab\.(active|on)::after/);
    // The bar's own dimensions are gone with it (18px x 3px cyan
    // pill under a tab) - no other rule in this sheet is 18x3.
    expect(css).not.toMatch(/width:\s*18px;\s*\n\s*height:\s*3px;/);
  });

  it("v2Primitives.tsx no longer exports or defines V2Dock", () => {
    expect(primitives).not.toMatch(/export function V2Dock/);
    expect(primitives).not.toMatch(/export \{[^}]*\bV2Dock\b/);
    // The primitives the live app DOES import stay exported.
    expect(primitives).toMatch(/export function SharedRealityPlate/);
  });

  it("over-deletion guard: the live docks are intact and never carried .tab buttons", () => {
    // OpalApp's live legacy dock: option-b tabbar, dock-tab items.
    expect(app).toContain('className="tabbar tabbar-option-b"');
    expect(app).toContain("dock-tab");
    // The generic .tab.active color rule is a different rule from
    // the removed bar (no ::after, no dimensions) and stays - it
    // is part of the legacy .tab family in styles.css, not the
    // V2Dock-specific bar construction.
    expect(css).toMatch(
      /\[data-technicolor="controlled"\] \.tab\.active \{\s*\n?\s*color: var\(--tc-ivory\);/,
    );
  });
});
