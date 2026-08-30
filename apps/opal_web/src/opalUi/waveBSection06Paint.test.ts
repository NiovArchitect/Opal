/**
 * Wave B B7 — Section 06 deep paint (sparse semantic accents from actual Figma).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../..");
const read = (rel: string) => readFileSync(resolve(root, "src", rel), "utf8");

describe("Wave B Section 06 deep paint", () => {
  it("SECTION06_DEEP_PAINT law notes use semantic accent", () => {
    const css = read("styles.css");
    expect(css).toMatch(/\.you-settings-note[\s\S]*?color:\s*var\(--you-setting-accent\)/);
    expect(css).toMatch(/--you-aqua:\s*#00f0d1/i);
    expect(css).toMatch(/--you-gold:\s*#ffc86b/i);
    expect(css).toMatch(/--you-magenta:\s*#d946ff/i);
    expect(css).toMatch(/--you-violet:\s*#8b5cf6/i);
    expect(css).toMatch(/--you-coral:\s*#ff6b9d/i);
  });

  it("SECTION06_YOU_HUB_SPARSE_ACCENTS", () => {
    const app = read("OpalApp.tsx");
    expect(app).toMatch(/location-travel[\s\S]*?semantic:\s*"aqua"/);
    expect(app).toMatch(/engagement[\s\S]*?semantic:\s*"magenta"/);
    expect(app).toMatch(/calls-assist[\s\S]*?semantic:\s*"violet"/);
    expect(app).toMatch(/spending-fit[\s\S]*?semantic:\s*"gold"/);
    expect(app).toMatch(/data-semantic=\{row\.semantic/);
  });

  it("SECTION06_SETTING_SEMANTIC_MAP", () => {
    const you = read("opalUi/YouSettingsDestination.tsx");
    expect(you).toMatch(/privacy[\s\S]*?violet|setting === "privacy"[\s\S]*?"violet"/);
    expect(you).toMatch(/location-travel[\s\S]*?"aqua"/);
    expect(you).toMatch(/spending-fit[\s\S]*?"gold"/);
    expect(you).toMatch(/notifications[\s\S]*?"magenta"/);
    expect(you).toMatch(/delete-account[\s\S]*?"coral"/);
  });
});
