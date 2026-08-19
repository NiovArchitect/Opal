import { describe, expect, it } from "vitest";
import { readFileSync, existsSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { FOUNDER_HOME_FEED, HOME_ICONS, FOUNDER_GRAPH_SEED_ID } from "./founderGraphSeed";
import { BRAND } from "../brand/brand";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = resolve(root, "../public");

describe("coherence reset: FR09 lands on 201:5 Graph Home", () => {
  it("brand authority points FR09 destination to 201:5", () => {
    expect(BRAND.figma.memberHome).toBe("201:5");
    expect(BRAND.figma.firstRunRouteLock).toBe("217:393");
    expect(BRAND.figma.homeEndlessScroll).toBe("145:46");
    expect(BRAND.figma.visualConvergence).toBe("201:2");
  });

  it("OpalApp authenticated Home uses GraphSocialHome not legacy-only shell", () => {
    const app = readFileSync(resolve(root, "OpalApp.tsx"), "utf8");
    expect(app).toMatch(/GraphSocialHome/);
    expect(app).toMatch(/data-figma-home|201:5|graph-social-home/);
    // Authenticated path returns GraphSocialHome before legacy home-living-field shell
    const authBlock = app.slice(app.indexOf("if (authenticated)"));
    expect(authBlock).toMatch(/return \(\s*<GraphSocialHome/);
  });

  it("founder seed feed matches OGSN social grammar cards", () => {
    expect(FOUNDER_GRAPH_SEED_ID).toMatch(/founder-graph-seed/);
    expect(FOUNDER_HOME_FEED.some((c) => /Juniper/.test(c.title))).toBe(true);
    expect(FOUNDER_HOME_FEED.some((c) => /Fletcher/.test(c.title))).toBe(true);
    expect(FOUNDER_HOME_FEED.some((c) => /Rooftop jazz/.test(c.title))).toBe(true);
    expect(FOUNDER_HOME_FEED.some((c) => c.ctaAction === "open_graph")).toBe(true);
    expect(FOUNDER_HOME_FEED.find((c) => c.ctaAction === "id_go")?.cta).toBe("I'd go");
  });

  it("Home source locks OGSN People Pulse and social actions", () => {
    const home = readFileSync(resolve(root, "opalUi/GraphSocialHome.tsx"), "utf8");
    expect(home).toMatch(/gsh-people-pulse|PeoplePulse/);
    expect(home).toMatch(/287:6|287:2/);
    expect(home).toMatch(/partial-ogx|OGX/);
    expect(home).toMatch(/Open Graph|open_graph/);
    expect(home).toMatch(/FollowGraph|Follow|gsh-follow/);
    expect(home).toMatch(/Live by|hosted by|videoLive|gsh-stories/);
    expect(home).toMatch(/consequence|Conversation became/);
    expect(home).toMatch(/discovery|Follow ≠ Connection/);
  });

  it("founder stream mixes memory/graph/consequence/discovery without tiny repeat set", () => {
    const kinds = new Set(FOUNDER_HOME_FEED.map((c) => c.kind));
    expect(kinds.has("memory")).toBe(true);
    expect(kinds.has("graph")).toBe(true);
    expect(kinds.has("consequence")).toBe(true);
    expect(kinds.has("discovery")).toBe(true);
    expect(FOUNDER_HOME_FEED.length).toBeGreaterThanOrEqual(12);
    const people = new Set(FOUNDER_HOME_FEED.map((c) => c.person));
    expect(people.has("Chanelle")).toBe(true);
    expect(people.has("Maya")).toBe(true);
    expect(people.has("Jordan")).toBe(true);
  });

  it("production hydration seam is distinct from founder fixture", () => {
    const seam = readFileSync(resolve(root, "opalUi/homeHydration.ts"), "utf8");
    expect(seam).toMatch(/founder_fixture/);
    expect(seam).toMatch(/production_owners/);
    expect(seam).toMatch(/FollowGraph/);
  });

  it("201:5 icon and media assets exist and are non-zero", () => {
    for (const src of Object.values(HOME_ICONS)) {
      const p = resolve(publicDir, src.replace(/^\//, ""));
      expect(existsSync(p), src).toBe(true);
      expect(statSync(p).size, src).toBeGreaterThan(40);
    }
    for (const card of FOUNDER_HOME_FEED) {
      for (const src of [card.avatarSrc, card.mediaSrc, card.thumbSrc]) {
        if (!src) continue;
        const p = resolve(publicDir, src.replace(/^\//, ""));
        expect(existsSync(p), src).toBe(true);
        expect(statSync(p).size, src).toBeGreaterThan(100);
      }
    }
  });

  it("I'd go is soft interest in-feed (155:2) and must not open WHO", () => {
    const app = readFileSync(resolve(root, "OpalApp.tsx"), "utf8");
    expect(app).toMatch(/onIdGoSoftInterest/);
    expect(app).toMatch(/soft interest/i);
    // Must not wire soft interest directly to WHO opener
    expect(app).not.toMatch(/onIdGo=\{onMomentDoWithPeople\}/);
    const home = readFileSync(resolve(root, "opalUi/GraphSocialHome.tsx"), "utf8");
    expect(home).toMatch(/onIdGoSoftInterest/);
    expect(home).toMatch(/stay in feed|soft interest/i);
  });

  it("runtime brand remains 160:2 colorful mark on Home chrome", () => {
    const home = readFileSync(resolve(root, "opalUi/GraphSocialHome.tsx"), "utf8");
    expect(home).toMatch(/OpalMark/);
    expect(BRAND.figma.symbolVisualMaster).toBe("160:2");
  });
});
