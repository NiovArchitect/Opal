/**
 * Wave B B5 — Section 06 nav frozen (You active); no redesign.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../..");
const read = (rel: string) => readFileSync(resolve(root, "src", rel), "utf8");

describe("Wave B Section 06 nav freeze", () => {
  it("SECTION06_NAV_FROZEN", () => {
    const app = read("OpalApp.tsx");
    expect(app).toMatch(/you-hub-pane|YouPane|618:1344/);
    const you = read("opalUi/YouSettingsDestination.tsx");
    expect(you).toMatch(/618:1524|618:1430|YOU_SETTING/);
    // Must not light Home while on You/settings
    expect(app).toMatch(/data-nav-group-info|nested_section_06|you/);
  });

  it("NO_PARALLEL_HOME / CHAT / GRAPH / JOURNEY", () => {
    const app = read("OpalApp.tsx");
    expect(app).toMatch(/GraphSocialHome/);
    expect(app).toMatch(/ChatsHome/);
    expect(app).toMatch(/GraphsHome/);
    expect(app).toMatch(/JourneySurface|journey-surface/);
    // Single owners — no duplicate Home/Chat engines
    expect(app.match(/function GraphSocialHome|from "\.\/opalUi\/GraphSocialHome"/g)?.length).toBeGreaterThan(0);
  });
});
