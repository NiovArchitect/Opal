import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../..");
const read = (rel: string) => readFileSync(resolve(root, "src", rel), "utf8");
const readRoot = (rel: string) => readFileSync(resolve(root, "../..", rel), "utf8");

describe("founder physical closeout", () => {
  it("dismissHomeChildren / selectPrimaryTab close Graph Create (stale route = 0)", () => {
    const app = read("OpalApp.tsx");
    expect(app).toMatch(/setGraphCreateOpen\(false\)/);
    // selectPrimaryTab clears create before route change
    expect(app).toMatch(/const selectPrimaryTab[\s\S]*?setGraphCreateOpen\(false\)/);
  });

  it("New Call uses circular phone glyph assets, not telephone emoji", () => {
    const nc = read("opalUi/NewCallDestination.tsx");
    expect(nc).not.toMatch(/☎|📞/);
    expect(nc).toMatch(/callback-icon\.svg/);
    expect(nc).toMatch(/callback-shell\.svg/);
  });

  it("Calls overscroll protection exists on native host", () => {
    const css = read("styles.css");
    expect(css).toMatch(/FOUNDER PHYSICAL CLOSEOUT/);
    expect(css).toMatch(/calls-continuity-home[\s\S]*?overscroll-behavior-y:\s*none/);
  });

  it("global safe-top protection plane exists without double-count regression", () => {
    const css = read("styles.css");
    expect(css).toMatch(/app\[data-member-nav="true"\]::before/);
    expect(css).toMatch(/GRAPH_SAFE_TOP_DOUBLE_COUNT = 0/);
  });

  it("Search / New Call / Graph create / detail get safe-top ownership", () => {
    const css = read("styles.css");
    expect(css).toMatch(/new-call-dest[\s\S]*?--opal-safe-top/);
    expect(css).toMatch(/graph-create-back[\s\S]*?--opal-safe-top/);
    expect(css).toMatch(/search-destination[\s\S]*?--opal-safe-top|search-dest-373-261[\s\S]*?--opal-safe-top/);
    expect(css).toMatch(/ogsn-graph-detail[\s\S]*?--opal-safe-top/);
  });

  it("Create media sheet balances Camera/Library inside hero", () => {
    const create = read("opalUi/GraphCreateFlow.tsx");
    expect(create).toMatch(/graph-create-hero[\s\S]*?graph-create-media-actions/);
  });

  it("Center composer has Send vs Speak and plus context menu", () => {
    const c = read("opalUi/OpalCenterLifeGraph.tsx");
    expect(c).toMatch(/opal-center-send/);
    expect(c).toMatch(/Speak to Opal/);
    expect(c).toMatch(/opal-center-attach-menu/);
    expect(c).toMatch(/Photo library/);
    expect(c).toMatch(/Document/);
  });

  it("Home persistent chrome plane includes profile/search/Stories", () => {
    const home = read("opalUi/GraphSocialHome.tsx");
    const css = read("styles.css");
    expect(home).toMatch(/gsh-chrome-plane/);
    expect(home).toMatch(/data-stories-interactive="true"/);
    expect(home).toMatch(/onOpenStory/);
    expect(css).toMatch(/\.gsh-chrome-plane[\s\S]*?position:\s*sticky/);
    expect(css).toMatch(/FOUNDER CHROME HIERARCHY CORRECTION/);
  });

  it("Search chrome plane persists; results have scroll owner", () => {
    const search = read("opalUi/SearchDestination.tsx");
    const css = read("styles.css");
    expect(search).toMatch(/search-chrome-plane/);
    expect(search).toMatch(/search-results-scroll/);
    expect(css).toMatch(/\.search-results-scroll[\s\S]*?overflow-y:\s*auto/);
  });

  it("Center inputs use 16px to prevent iOS keyboard auto-zoom", () => {
    const css = read("styles.css");
    expect(css).toMatch(/\.opal-query[\s\S]*?font-size:\s*16px/);
    const html = readFileSync(resolve(root, "index.html"), "utf8");
    expect(html).toMatch(/maximum-scale=1/);
  });

  it("Story create exposes Camera + Photo library via media bridge", () => {
    const sc = read("opalUi/StoryCreateFlow.tsx");
    expect(sc).toMatch(/story-create-camera/);
    expect(sc).toMatch(/story-create-library/);
    expect(sc).toMatch(/acquireMedia/);
    expect(sc).not.toMatch(/capture="environment"/);
  });

  it("Story viewer / create sit above product chrome on native", () => {
    const css = read("styles.css");
    expect(css).toMatch(/story-viewer[\s\S]*?z-index:\s*10050/);
    expect(css).toMatch(/story-create-flow[\s\S]*?z-index:\s*10040/);
  });

  it("iOS AppIcon is wired in Expo app.json and asset exists", () => {
    const appJson = JSON.parse(readFileSync(resolve(root, "../opal_mobile/app.json"), "utf8"));
    expect(appJson.expo.icon).toMatch(/assets\/icon\.png/);
    expect(appJson.expo.ios.icon).toMatch(/assets\/icon\.png/);
    expect(existsSync(resolve(root, "../opal_mobile/assets/icon.png"))).toBe(true);
  });
});
