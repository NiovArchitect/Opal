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

  it("offers manual testing fallback only under opal_lives=1", () => {
    const src = read("LivesGoLivePanel.tsx");
    expect(src).toMatch(/Enter venue manually \(testing\)/);
    expect(src).toMatch(/opal_lives/);
    expect(src).toMatch(/testingSurface/);
    expect(src).toMatch(/provisional:\s*true/);
    expect(src).toMatch(/TEST VENUE/);
  });

  it("productClient exposes lives search + go-live + pay", () => {
    const client = read("../api/productClient.ts");
    expect(client).toMatch(/\/api\/v1\/product\/lives\/go-live/);
    expect(client).toMatch(/\/api\/v1\/product\/lives\/venue-search/);
    expect(client).toMatch(/\/api\/v1\/product\/lives\/stickers/);
    expect(client).toMatch(/\/api\/v1\/product\/venues\/pay/);
    expect(client).toMatch(/OPAL_STICKER_LIVE_MONEY|live_money_flag/);
  });
});
