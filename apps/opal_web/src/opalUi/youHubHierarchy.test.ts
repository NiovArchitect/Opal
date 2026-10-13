import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "..");
const app = readFileSync(resolve(root, "OpalApp.tsx"), "utf8");
const dest = readFileSync(resolve(root, "opalUi/YouSettingsDestination.tsx"), "utf8");
const css = readFileSync(resolve(root, "styles.css"), "utf8");

describe("YOU hub hierarchy + trust fixes", () => {
  it("uses person-centered sections, not a flat settings list", () => {
    expect(app).toMatch(/YOU_HUB_SECTIONS/);
    expect(app).toMatch(/Your World/);
    expect(app).toMatch(/Your Relationships/);
    expect(app).toMatch(/How Opal Helps/);
    expect(app).toMatch(/Your Account/);
    expect(app).toMatch(/Grow Your Circle/);
    expect(app).not.toMatch(/More settings below/);
  });

  it("keeps Spending live on hub; Fit honestly hidden (no wellness seam)", () => {
    expect(app).toMatch(/key:\s*"spending"/);
    // FIT_PLACEHOLDER_PAGE = 0 / HONESTLY_HIDDEN — no hub row for Fit.
    expect(app).not.toMatch(/key:\s*"fit"/);
    expect(app).toMatch(/FIT_PLACEHOLDER_PAGE\s*=\s*0\s*\/\s*HONESTLY_HIDDEN/);
    expect(app).not.toMatch(/Spending & fit/);
    expect(dest).toMatch(/spending:\s*\{/);
    // Destination retained for inventory / tests; not consumer-listed.
    expect(dest).toMatch(/fit:\s*\{/);
    expect(dest).toMatch(/FIT_PLACEHOLDER_PAGE\s*=\s*0\s*\/\s*HONESTLY_HIDDEN/);
    expect(dest).not.toContain('"spending-fit"');
  });

  it("patches session after profile save", () => {
    expect(dest).toMatch(/onProfileSaved/);
    expect(app).toMatch(/onProfileSaved/);
    expect(app).toMatch(/saveSession\(next\)/);
  });

  it("YOU nested body is a constrained scroll surface", () => {
    expect(css).toMatch(/\.you-settings-body\s*\{[^}]*bottom:\s*24px/s);
    expect(css).toMatch(/touch-action:\s*pan-y/);
    expect(css).toMatch(/Do NOT set height:auto/);
  });
});
