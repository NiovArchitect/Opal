/**
 * P0-05.12A — Full Live 863:2 same-Reality exactness
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  FULL_LIVE_HOME_NODE,
  FULL_LIVE_MEDIA_FIGMA_HASH,
  FULL_LIVE_MEDIA_SRC,
} from "./GraphLivePanel";

const root = resolve(__dirname, "../..");
const read = (rel: string) => readFileSync(resolve(root, "src", rel), "utf8");

describe("P0-05.12A Full Live exact 863:2", () => {
  it("FULL_LIVE_SAME_REALITY_AS_HOME_618_211", () => {
    expect(FULL_LIVE_HOME_NODE).toBe("618:211");
    expect(FULL_LIVE_MEDIA_FIGMA_HASH).toBe("1fd39e009e4f6e8f17bcbb4f4bc07e69fccd9190");
    expect(FULL_LIVE_MEDIA_SRC).toMatch(/media-live-city/);
    const live = read("opalUi/GraphLivePanel.tsx");
    expect(live).toMatch(/data-same-reality-home-live=\{FULL_LIVE_HOME_NODE\}|data-same-reality-home-live/);
    expect(live).toMatch(/data-figma-live="863:2"/);
    expect(live).toMatch(/host-ne-broadcaster/);
    const app = read("OpalApp.tsx");
    expect(app).toMatch(/data-same-reality-home-live="618:211"/);
    expect(app).toMatch(/broadcaster=\{liveCard\?\.broadcaster/);
    expect(app).toMatch(/host=\{liveCard\?\.host/);
    expect(app).toMatch(/mediaSrc=\{liveCard\?\.mediaSrc/);
  });

  it("FULL_LIVE_CURRENT_IDENTITY_COPY", () => {
    const live = read("opalUi/GraphLivePanel.tsx");
    expect(live).toMatch(/Rooftop jazz|place/);
    expect(live).toMatch(/Downtown/);
    expect(live).toMatch(/Sadeil \+ 3 are here/);
    expect(live).toMatch(/Maya is on the way/);
    expect(live).toMatch(/Table ready · Great news|tableReadyLabel/);
    expect(live).toMatch(/I'm on my way/);
    expect(live).toMatch(/VIDEO LIVE/);
    expect(live).not.toMatch(/Then it actually happens/);
    expect(live).not.toMatch(/Juniper & Ivy/);
  });

  it("HOME_LIVE_MEDIA_EQUALS_FULL_LIVE_MEDIA", () => {
    const seed = read("opalUi/founderGraphSeed.ts");
    expect(seed).toMatch(/seed-live-sabrina[\s\S]*?media-live-city-1728\.png/);
    expect(seed).toMatch(/broadcaster:\s*"Sabrina"/);
    expect(seed).toMatch(/host:\s*"Jordan"/);
  });
});
