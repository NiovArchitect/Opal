/**
 * Solo Opal 1075:644 — additive same-system state (not a parallel assistant).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../..");
const read = (rel: string) => readFileSync(resolve(root, "src", rel), "utf8");

describe("Solo Opal 1075:644 additive", () => {
  it("OpalAmbient supports solo participantMode without parallel architecture", () => {
    const ambient = read("opalUi/OpalAmbient.tsx");
    expect(ambient).toMatch(/participantMode/);
    expect(ambient).toMatch(/1075:644/);
    expect(ambient).toMatch(/People", value: "Solo"/);
    expect(ambient).toMatch(/I've got two hours/);
    expect(ambient).not.toMatch(/SoloBrain|PersonalAssistant2/);
  });

  it("OpalApp mounts Solo as zero-network default for Center Opal", () => {
    const app = read("OpalApp.tsx");
    expect(app).toMatch(/opalAmbientMode/);
    expect(app).toMatch(/1075:644/);
    expect(app).toMatch(/setOpalAmbientMode\("solo"\)/);
  });

  it("native host CSS removes 390 letterbox", () => {
    const css = read("styles.css");
    expect(css).toMatch(/html\.opal-native-host/);
    expect(css).toMatch(/max-width:\s*none\s*!important/);
  });
});
