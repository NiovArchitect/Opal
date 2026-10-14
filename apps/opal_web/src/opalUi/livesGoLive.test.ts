import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname);

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

describe("Paste K Lives go-live honesty", () => {
  it("requires venue confirmation with no skip path", () => {
    const src = read("LivesGoLivePanel.tsx");
    expect(src).toMatch(/Where are you\?/);
    expect(src).toMatch(/no skip/i);
    expect(src).toMatch(/lives-place-id|lives-venue-search/);
    expect(src).not.toMatch(/just go live/i);
    expect(src).not.toMatch(/unplaced/i);
  });

  it("states sticker test-credit honesty and anti-mercenary law", () => {
    const src = read("LivesGoLivePanel.tsx");
    expect(src).toMatch(/Stickers use test credits for now/);
    expect(src).toMatch(/celebratory, never required/);
    expect(src).toMatch(/zero stickers is/);
  });

  it("offers manual testing fallback under opal_lives=1 or allowTestingFallback", () => {
    const src = read("LivesGoLivePanel.tsx");
    expect(src).toMatch(/Enter venue manually \(testing\)/);
    expect(src).toMatch(/opal_lives/);
    expect(src).toMatch(/testingSurface/);
    expect(src).toMatch(/allowTestingFallback/);
    expect(src).toMatch(/provisional:\s*true/);
    expect(src).toMatch(/TEST VENUE/);
  });

  it("includes audience + location precision privacy choices (no GPS)", () => {
    const src = read("LivesGoLivePanel.tsx");
    expect(src).toMatch(/lives-audience-friends/);
    expect(src).toMatch(/lives-audience-close/);
    expect(src).toMatch(/lives-precision-venue/);
    expect(src).toMatch(/lives-precision-area/);
    expect(src).toMatch(/never shares live GPS/i);
    expect(src).toMatch(/lives-end-submit/);
    expect(src).toMatch(/lives-active-pill/);
  });

  it("founder-seed YOU hub opens LivesGoLivePanel without query flag", () => {
    const app = readFileSync(join(root, "../OpalApp.tsx"), "utf8");
    expect(app).toMatch(/you-go-live/);
    expect(app).toMatch(/livesGoLiveOpen/);
    expect(app).toMatch(/lives-go-live-overlay/);
    expect(app).toMatch(/setLivesGoLiveOpen\(true\)/);
    expect(app).toMatch(/getLivesVisible/);
    expect(app).toMatch(/visibleLiveCards/);
  });

  it("productClient exposes lives search + go-live + end + visible + pay", () => {
    const client = read("../api/productClient.ts");
    expect(client).toMatch(/\/api\/v1\/product\/lives\/go-live/);
    expect(client).toMatch(/\/api\/v1\/product\/lives\/venue-search/);
    expect(client).toMatch(/\/api\/v1\/product\/lives\/stickers/);
    expect(client).toMatch(/\/api\/v1\/product\/lives\/visible/);
    expect(client).toMatch(/\/api\/v1\/product\/lives\/mine/);
    expect(client).toMatch(/postLivesEnd/);
    expect(client).toMatch(/\/api\/v1\/product\/venues\/pay/);
    expect(client).toMatch(/OPAL_STICKER_LIVE_MONEY|live_money_flag/);
  });
});
