import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

describe("Extend private-first (P1 social flow)", () => {
  const app = readFileSync(resolve(root, "src/OpalApp.tsx"), "utf8");
  const css = readFileSync(resolve(root, "src/styles.css"), "utf8");

  it("does not setDraft a social proposal when selecting an extend option", () => {
    // Option click must select privately — not fill composer with a peer message.
    const optionBlock = app.slice(
      app.indexOf("data-testid={`extend-option-${opt.id}`}"),
      app.indexOf('data-testid="extend-selected"'),
    );
    expect(optionBlock).toMatch(/setExtendSelected/);
    expect(optionBlock).not.toMatch(/setDraft\(/);
    expect(optionBlock).not.toMatch(/\bsend\s*\(/);
  });

  it("only shares when Share is explicit", () => {
    const shareIdx = app.indexOf('data-testid="extend-share"');
    expect(shareIdx).toBeGreaterThan(0);
    const shareBlock = app.slice(shareIdx, shareIdx + 500);
    expect(shareBlock).toMatch(/setDraft\(/);
  });

  it("exposes ONLY YOU private plate grammar", () => {
    expect(app).toMatch(/private-opal-plate/);
    expect(app).toMatch(/PRODUCT_COPY\.onlyYou|ONLY YOU/);
  });

  it("Extend CTA toggles closed/open without forcing selection", () => {
    expect(app).toMatch(/aria-expanded=\{extendOpen\}/);
    expect(app).toMatch(/setExtendOpen\(\(open\) =>/);
    expect(app).toMatch(/data-testid="extend-collapse"/);
    expect(app).toMatch(/data-testid="extend-back-options"/);
  });

  it("Escape closes extend/curate disclosures", () => {
    expect(app).toMatch(/Escape/);
    expect(app).toMatch(/setExtendOpen\(false\)/);
  });

  it("chat thread and home field are scrollable flex children", () => {
    expect(css).toMatch(/\.thread\s*\{[^}]*min-height:\s*0/s);
    expect(css).toMatch(/\.scroll\s*\{[^}]*min-height:\s*0/s);
    expect(css).toMatch(/\.home-living-field\s*\{[^}]*overflow-y:\s*auto/s);
  });
});
