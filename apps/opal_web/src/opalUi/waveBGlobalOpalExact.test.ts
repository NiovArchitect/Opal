/**
 * Wave B B4 — Global Opal 618:902 full-screen + paints
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../..");
const read = (rel: string) => readFileSync(resolve(root, "src", rel), "utf8");

describe("Wave B Global Opal exact authority", () => {
  it("GLOBAL_OPAL_FULL_SCREEN_NOT_MODAL", () => {
    const app = read("OpalApp.tsx");
    expect(app).toMatch(/opal-ambient-destination/);
    expect(app).toMatch(/data-opal-mount="full-screen"/);
    const css = read("styles.css");
    expect(css).toMatch(/\.opal-ambient-destination[\s\S]*?position:\s*fixed/);
    expect(css).toMatch(/data-opal-mount="full-screen"/);
  });

  it("GLOBAL_OPAL_CURRENT_AUTHORITY_618_902", () => {
    const ambient = read("opalUi/OpalAmbient.tsx");
    expect(ambient).toMatch(/618:902|data-figma.*902/);
    expect(ambient).toMatch(/People/);
    expect(ambient).toMatch(/Places/);
    expect(ambient).toMatch(/Vibe/);
    expect(ambient).toMatch(/Budget/);
    expect(ambient).toMatch(/Date ideas/);
    expect(ambient).toMatch(/Refine/);
    const css = read("styles.css");
    expect(css).toMatch(/#050913|#050816/);
    expect(css).toMatch(/#1A2338/);
    expect(css).toMatch(/#2E548C/);
    expect(css).toMatch(/#612E8A/);
  });

  it("NO_PARALLEL_OPAL_ENGINE", () => {
    const ambient = read("opalUi/OpalAmbient.tsx");
    expect(ambient).not.toMatch(/openai|anthropic|new OpalEngine/i);
  });
});
