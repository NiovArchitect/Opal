import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  BRAND,
  BRAND_ASSETS,
  CREATE_DOCK_EXPOSED,
  PRODUCT_PUBLIC_NAME,
  PRODUCT_TAGLINE,
} from "./brand";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

const REJECTED_ARCS_SPIKE =
  "7b38bbaa130f319b8922a98406ab1806c76ea8261cd70ea8206996d3ad51e933";

describe("S0 Opal Graph brand foundation", () => {
  it("public product name is Opal Graph", () => {
    expect(PRODUCT_PUBLIC_NAME).toBe("Opal Graph");
    expect(PRODUCT_TAGLINE).toBe("PEOPLE. EXPERIENCES. CONNECTED.");
    expect(BRAND.name).toBe("Opal Graph");
  });

  it("ships Opal Graph symbol assets from Figma brand lock", () => {
    for (const key of ["graphSymbol", "graphSymbolMaster", "graphAppIcon180"] as const) {
      const rel = BRAND_ASSETS[key].replace(/^\//, "public/");
      const abs = resolve(root, rel);
      expect(existsSync(abs), abs).toBe(true);
      const buf = readFileSync(abs);
      expect(buf[0]).toBe(0x89);
      expect(buf[1]).toBe(0x50);
      expect(buf.length).toBeGreaterThan(1000);
    }
    expect(existsSync(resolve(root, "public/favicon-opal-graph.png"))).toBe(true);
  });

  it("create dock is not customer-exposed until Graph create (S5)", () => {
    expect(CREATE_DOCK_EXPOSED).toBe(false);
    expect(BRAND.status.createDock).toMatch(/DEFERRED/);
  });

  it("current mark is not the rejected arcs+spike raster", () => {
    const mark = resolve(root, "public/brand/opal-graph/symbol-transparent.png");
    expect(sha256(mark)).not.toBe(REJECTED_ARCS_SPIKE);
  });

  it("production components load Opal Graph symbol, not Opposing arcs", () => {
    const logo = readFileSync(resolve(root, "src/brand/OpalLogo.tsx"), "utf8");
    const brand = readFileSync(resolve(root, "src/brand/brand.ts"), "utf8");
    const html = readFileSync(resolve(root, "index.html"), "utf8");
    expect(logo).toMatch(/BRAND_ASSETS\.graphSymbol|graphSymbol/);
    expect(logo).toMatch(/OpalMark/);
    expect(logo).toMatch(/OpalWordmark/);
    expect(logo).toMatch(/OpalLockup/);
    expect(brand).toMatch(/Opal Graph/);
    expect(brand).toMatch(/graphSymbol:\s*"\/brand\/opal-graph\/symbol-transparent\.png"/);
    expect(brand).toMatch(/supersededMarkNode:\s*"77:8"/);
    expect(brand).toMatch(/DO NOT USE/);
    expect(html).toMatch(/Opal Graph/);
    expect(html).toMatch(/favicon-opal-graph\.png/);
    expect(BRAND_ASSETS.markCurrent).toMatch(/opal-graph\/symbol-transparent/);
  });

  it("shell documents deferred create without dead button", () => {
    const app = readFileSync(resolve(root, "src/OpalApp.tsx"), "utf8");
    expect(app).toMatch(/data-create-dock/);
    expect(app).toMatch(/CREATE_DOCK_EXPOSED/);
    expect(app).toMatch(/data-nav-model="home-people-create-plans-you"/);
    // No active create tab button with dead onClick stub
    expect(app).not.toMatch(/member-tab-create/);
  });

  it("Figma brand lock pointers are present", () => {
    expect(BRAND.figma.brandLock).toBe("159:2");
    expect(BRAND.figma.visualConvergence).toBe("201:2");
    expect(BRAND.figma.firstRun).toBe("217:2");
    expect(BRAND.figma.symbolTransparent).toBe("160:2");
  });
});
