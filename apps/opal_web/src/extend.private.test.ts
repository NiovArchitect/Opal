import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

describe("Extend private-first (P1 social flow)", () => {
  const app = readFileSync(resolve(root, "src/OpalApp.tsx"), "utf8");

  it("does not setDraft a social proposal when selecting an extend option", () => {
    // Option click must select privately — not fill composer with a peer message.
    const optionBlock = app.slice(
      app.indexOf("data-testid={`extend-option-${opt.id}`}"),
      app.indexOf("data-testid=\"extend-selected\""),
    );
    expect(optionBlock).toMatch(/setExtendSelected/);
    expect(optionBlock).not.toMatch(/setDraft\(/);
    // Must not invoke the send action (allow comment text "never send").
    expect(optionBlock).not.toMatch(/\bsend\s*\(/);
    expect(optionBlock).toMatch(/opalPrivate:\s*true/);
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
});
