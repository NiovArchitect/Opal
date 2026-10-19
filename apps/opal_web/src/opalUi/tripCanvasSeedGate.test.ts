/**
 * Repair #18 FALSE-fix F-12 — the Mexico City canvas seed must not be
 * wired into the shipping client as a product action, and the canvas
 * must load the real trip instead of POSTing the seed endpoint.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../..");
const read = (rel: string) => readFileSync(resolve(root, "src", rel), "utf8");

describe("F-12 Mexico City seed is not a product wiring", () => {
  it("productClient exposes no seed endpoint call", () => {
    const client = read("api/productClient.ts");
    expect(client).not.toMatch(/\/seed_mexico_city_canvas/);
    expect(client).not.toMatch(/export async function seedMexicoCityCanvas/);
  });

  it("TripCanvasView loads the real trip via getTrip, never the seed", () => {
    const view = read("opalUi/TripCanvasView.tsx");
    expect(view).not.toMatch(/seedMexicoCityCanvas/);
    expect(view).toMatch(/getTrip\(tripId, bearer\)/);
  });
});
