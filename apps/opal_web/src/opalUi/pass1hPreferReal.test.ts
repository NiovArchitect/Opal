/**
 * Pass 1H — Prefer-real remediation regression.
 * Seed ON still works; production seed OFF stays honest empty.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { personNodeTemporal } from "./graphCalendaring";
import { resolveHomeStories } from "./socialAuthority";
import { FOUNDER_STORIES } from "./founderGraphSeed";
import { PRODUCT_COPY } from "../designTokens";

const root = resolve(__dirname);

describe("Pass 1H prefer-real remediation", () => {
  it("stories: seed on → FOUNDER_STORIES; seed off empty → []", () => {
    expect(
      resolveHomeStories({
        mode: "FOUNDER_FIXTURE",
        productionStories: [],
        founderSeedEnabled: true,
      }),
    ).toEqual(FOUNDER_STORIES);

    expect(
      resolveHomeStories({
        mode: "PRODUCTION_HYDRATION",
        productionStories: [],
        founderSeedEnabled: false,
      }),
    ).toEqual([]);

    expect(
      resolveHomeStories({
        mode: "EMPTY",
        productionStories: [],
        founderSeedEnabled: false,
      }),
    ).toEqual([]);
  });

  it("person temporal: seed on has chrome; seed off is empty", () => {
    const on = personNodeTemporal("Chanelle", { founderSeedEnabled: true });
    expect(on.upcomingPlans.length).toBeGreaterThan(0);
    expect(on.nextOpenLoop).not.toBeNull();

    const off = personNodeTemporal("Chanelle", { founderSeedEnabled: false });
    expect(off.upcomingPlans).toEqual([]);
    expect(off.nextOpenLoop).toBeNull();
  });

  it("Full Live does not default to seed-live-sabrina when seed off", () => {
    const app = readFileSync(resolve(root, "../OpalApp.tsx"), "utf8");
    expect(app).toMatch(/Pass 1H: Full Live implies presence reality/);
    expect(app).toMatch(/full-live-empty/);
    expect(app).toMatch(/Live isn't available yet/);
    // onOpenLive must gate before setting seed-live-sabrina
    expect(app).toMatch(
      /onOpenLive=\{\(\) => \{\s*\n\s*\/\/ Pass 1H: Full Live implies presence reality[\s\S]*?if \(!isFounderSeedEnabled\(\)\)/,
    );
  });

  it("GraphSocialHome passes founderSeedEnabled into resolveHomeStories", () => {
    const home = readFileSync(resolve(root, "GraphSocialHome.tsx"), "utf8");
    expect(home).toMatch(/resolveHomeStories\(\{[\s\S]*?founderSeedEnabled:\s*seedOn/);
  });
});

describe("Pass 1I Attention empty copy authority", () => {
  it("PRODUCT_COPY owns Attention empty strings", () => {
    expect(PRODUCT_COPY.emptyNeedsYou).toBe(
      "Nothing needs your attention right now.",
    );
    expect(PRODUCT_COPY.emptyAttention).toBe(PRODUCT_COPY.emptyNeedsYou);
    expect(PRODUCT_COPY.emptyPresence).not.toBe(PRODUCT_COPY.emptyNeedsYou);
  });

  it("ActivityDestination projects PRODUCT_COPY; no competing hardcoded empty", () => {
    const src = readFileSync(resolve(root, "ActivityDestination.tsx"), "utf8");
    expect(src).toMatch(/PRODUCT_COPY\.emptyAttention/);
    expect(src).toMatch(/PRODUCT_COPY\.emptyNeedsYou/);
    expect(src).not.toMatch(/Nothing yet\. When your people move/);
    expect(src).not.toMatch(/You're all caught up/);
  });

  it("Home presence uses emptyPresence not Attention copy", () => {
    const app = readFileSync(resolve(root, "../OpalApp.tsx"), "utf8");
    expect(app).toMatch(/PRODUCT_COPY\.emptyPresence/);
  });
});
