/**
 * Solo Opal — additive same-system state (not a parallel assistant).
 * Lineage: 1075:644 Solo → Center V2 Life Graph 1094:161 (founder-approved).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../..");
const read = (rel: string) => readFileSync(resolve(root, "src", rel), "utf8");

describe("Solo Opal / Center Life Graph", () => {
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
    expect(app).toMatch(/1075:644|1094:161/);
    expect(app).toMatch(/setOpalAmbientMode\("solo"\)/);
  });

  it("native host CSS removes 390 letterbox", () => {
    const css = read("styles.css");
    expect(css).toMatch(/html\.opal-native-host/);
    expect(css).toMatch(/max-width:\s*none\s*!important/);
  });

  it("solo Center defaults to Life Graph V2 (1094:161), not rejected 1086:2", () => {
    const app = read("OpalApp.tsx");
    const center = read("opalUi/OpalCenterLifeGraph.tsx");
    expect(app).toMatch(/OpalCenterLifeGraph/);
    expect(app).toMatch(/1094:161/);
    expect(app).toMatch(/data-rejected-center="1086:2"|1086:2/);
    expect(center).toMatch(/1094:161/);
    expect(center).toMatch(/Your day has room/);
    expect(center).not.toMatch(/neural-field/);
  });
});

describe("chrome correction #3 sticky owners", () => {
  it("ChatsHome uses one comm-sticky-chrome owner", () => {
    const chats = read("opalUi/ChatsHome.tsx");
    expect(chats).toMatch(/comm-sticky-chrome/);
    expect(chats).toMatch(/1114:96/);
  });

  it("GraphsHome uses one graphs-sticky-chrome owner", () => {
    const graphs = read("opalUi/GraphsHome.tsx");
    expect(graphs).toMatch(/graphs-sticky-chrome/);
    expect(graphs).toMatch(/1114:124/);
  });

  it("Home uses Opal Lens + Opal Signal controls", () => {
    const home = read("opalUi/GraphSocialHome.tsx");
    const brand = read("brand/brand.ts");
    expect(home).toMatch(/opal-lens/);
    expect(home).toMatch(/opal-signal/);
    expect(brand).toMatch(/opal-lens-search\.svg/);
    expect(brand).toMatch(/opal-signal-needs-you\.svg/);
  });
});
