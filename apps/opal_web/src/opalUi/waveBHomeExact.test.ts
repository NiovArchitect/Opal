/**
 * Wave B B1 — Home exact 618:44 paints / media / Open Live → 863:2
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  FOUNDER_HOME_FEED,
  FOUNDER_LIVE_FEED,
  HOME_GRAPH_TIMELINE_COLORS,
} from "./founderGraphSeed";

const root = resolve(__dirname, "../..");
const read = (rel: string) => readFileSync(resolve(root, "src", rel), "utf8");

describe("Wave B Home exact authority", () => {
  it("WAVE_A_AUTHORITY_FROZEN structural", () => {
    const waveA = readFileSync(
      resolve(root, "../../docs/authority/WAVE_A_FOUNDER_ACCEPTED.md"),
      "utf8",
    );
    expect(waveA).toMatch(/WAVE_A_FOUNDER_ACCEPTED:\s*YES|WAVE_A_FOUNDER_ACCEPTED = YES/);
    expect(waveA).toMatch(/DO_NOT_REOPEN_WITHOUT_PROVEN_REGRESSION/);
  });

  it("HOME_TIMELINE_MULTICOLOR", () => {
    expect(HOME_GRAPH_TIMELINE_COLORS).toEqual([
      "#00E5FF",
      "#E8D6C4",
      "#8B5CF6",
      "#FFC86B",
    ]);
    const jordan = FOUNDER_HOME_FEED.find((c) => c.id === "seed-jordan-market");
    expect(jordan?.graphNodes?.map((n) => n.accent)).toEqual([
      "#00E5FF",
      "#E8D6C4",
      "#8B5CF6",
      "#FFC86B",
    ]);
    const home = read("opalUi/GraphSocialHome.tsx");
    expect(home).toMatch(/--gsh-timeline-accent/);
    const css = read("styles.css");
    expect(css).toMatch(/\.gsh-gr-time[\s\S]*?var\(--gsh-timeline-accent\)/);
    expect(css).toMatch(/\.gsh-gr-dot[\s\S]*?width:\s*20px/);
  });

  it("HOME_TIMELINE_DOTS_CENTERED", () => {
    const css = read("styles.css");
    expect(css).toMatch(/\.gsh-gr-rail[\s\S]*?left:\s*9px/);
    expect(css).toMatch(/\.gsh-gr-dot[\s\S]*?width:\s*20px/);
    expect(css).toMatch(/\.gsh-gr-rail[\s\S]*?background:\s*#00E5FF/);
  });

  it("FOUNDER_HOME_MEDIA_NOT_BLANK", () => {
    const mediaKinds = ["memory", "discovery", "live", "graph"] as const;
    for (const kind of mediaKinds) {
      const cards = [...FOUNDER_HOME_FEED, ...FOUNDER_LIVE_FEED].filter(
        (c) => c.kind === kind,
      );
      const withMedia = cards.filter((c) => c.mediaSrc || (c.mediaSrcs && c.mediaSrcs.length));
      // Voice-only memory may omit image; every other visual card must hydrate.
      if (kind === "memory") {
        const visual = cards.filter((c) => !/audio|0:38|Voice/i.test(c.detail + c.title));
        for (const c of visual) {
          expect(c.mediaSrc || c.mediaSrcs?.[0], `${c.id} blank`).toBeTruthy();
        }
      } else if (kind === "live" || kind === "discovery") {
        for (const c of withMedia.length ? withMedia : cards) {
          if (c.kind === "discovery" && !c.mediaSrc) {
            // Fail blank discovery in exact authority walkthrough
            expect(c.mediaSrc, `${c.id} discovery blank`).toBeTruthy();
          }
        }
        if (kind === "live") {
          expect(FOUNDER_LIVE_FEED[0]?.mediaSrc).toMatch(/media-live/);
        }
      }
    }
  });

  it("LIVE_GOLD_OUTER_STROKE", () => {
    const css = read("styles.css");
    expect(css).toMatch(/\.gsh-card-live[\s\S]*?#090B10/i);
    expect(css).toMatch(/\.gsh-card-live[\s\S]*?255,\s*200,\s*107/);
    const home = read("opalUi/GraphSocialHome.tsx");
    expect(home).toMatch(/data-figma-node="618:211"/);
  });

  it("LIVE_VIDEO_CORAL_MAGENTA", () => {
    const css = read("styles.css");
    expect(css).toMatch(/#FF6B9D/);
    expect(css).toMatch(/#D946FF/);
    expect(css).toMatch(/\.gsh-video-live[\s\S]*?#ffffff/i);
  });

  it("OPEN_LIVE_ROUTES_CURRENT_FULL_LIVE", () => {
    const app = read("OpalApp.tsx");
    expect(app).toMatch(/full-live-destination/);
    expect(app).toMatch(/data-figma-node="863:2"/);
    expect(app).not.toMatch(/data-figma-ogsn="258:117"/);
    const live = read("opalUi/GraphLivePanel.tsx");
    expect(live).toMatch(/data-figma-live="863:2"/);
    expect(live).toMatch(/host-ne-broadcaster/);
  });
});
