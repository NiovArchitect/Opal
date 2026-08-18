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
    const mark = resolve(root, "public/brand/opal-graph/symbol-160-2-transparent.png");
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
    expect(brand).toMatch(/graphSymbol:\s*"\/brand\/opal-graph\/symbol-160-2-transparent\.png"/);
    expect(brand).toMatch(/supersededMarkNode:\s*"77:8"/);
    expect(brand).toMatch(/DO NOT USE/);
    expect(html).toMatch(/Opal Graph/);
    expect(html).toMatch(/favicon-opal-graph\.png/);
    expect(BRAND_ASSETS.markCurrent).toMatch(/opal-graph\/symbol-160-2-transparent/);
  });

  it("shell documents deferred create without dead button", () => {
    const app = readFileSync(resolve(root, "src/OpalApp.tsx"), "utf8");
    expect(app).toMatch(/data-create-dock/);
    expect(app).toMatch(/CREATE_DOCK_EXPOSED/);
    expect(app).toMatch(/data-nav-model="home-people-plans-you"/);
    // No active create tab button with dead onClick stub
    expect(app).not.toMatch(/member-tab-create/);
  });

  it("Figma brand lock pointers: 160:2 colorful master; 168:2 defective/superseded", () => {
    expect(BRAND.figma.brandLock).toBe("159:2");
    expect(BRAND.figma.visualConvergence).toBe("201:2");
    expect(BRAND.figma.firstRun).toBe("217:2");
    expect(BRAND.figma.symbolVisualMaster).toBe("160:2");
    expect(BRAND.figma.symbolVectorMaster).toBe("160:2");
    expect(BRAND.figma.firstRunSymbolInstance).toBe("217:6");
    expect(BRAND.figma.symbolDefective168).toBe("168:2");
    expect(BRAND.figma.defective168Status).toMatch(/DEFECTIVE|SUPERSEDED/);
    expect(BRAND.figma.wordmarkOnly).toBe("161:3");
    expect(BRAND.figma.typePlusTagline).toBe("161:2");
    expect(BRAND.status.symbolVisualMaster).toBe("160:2");
    expect(BRAND_ASSETS.graphSymbol).toMatch(/symbol-160-2-transparent\.png/);
  });

  it("runtime 160:2 derivative is byte-identical to symbol-master and not defective 168 plate", () => {
    const runtime = resolve(root, "public/brand/opal-graph/symbol-160-2-transparent.png");
    const master = resolve(root, "public/brand/opal-graph/symbol-master.png");
    const defective = resolve(root, "public/brand/opal-graph/symbol-source-168-2-defective-black-plate.png");
    expect(existsSync(runtime)).toBe(true);
    expect(existsSync(master)).toBe(true);
    expect(sha256(runtime)).toBe(sha256(master));
    expect(sha256(runtime)).not.toBe(sha256(defective));
  });

  it("runtime symbol has true alpha and visible spectral color (not black plate)", () => {
    const zlib = require("node:zlib") as typeof import("node:zlib");
    const runtime = resolve(root, "public/brand/opal-graph/symbol-160-2-transparent.png");
    const buf = readFileSync(runtime);
    let i = 8;
    const idat: Buffer[] = [];
    let w = 0;
    let h = 0;
    let ct = 0;
    while (i < buf.length) {
      const ln = buf.readUInt32BE(i);
      const typ = buf.slice(i + 4, i + 8).toString();
      const d = buf.slice(i + 8, i + 8 + ln);
      i += 12 + ln;
      if (typ === "IHDR") {
        w = d.readUInt32BE(0);
        h = d.readUInt32BE(4);
        ct = d[9]!;
      }
      if (typ === "IDAT") idat.push(d);
    }
    expect(w).toBe(560);
    expect(h).toBe(560);
    expect(ct).toBe(6);
    const raw = zlib.inflateSync(Buffer.concat(idat));
    const bpp = 4;
    const stride = w * bpp;
    let prev = Buffer.alloc(stride);
    let off = 0;
    let a0 = 0;
    let colored = 0;
    let bright = 0;
    let maxc = 0;
    for (let y = 0; y < h; y++) {
      const f = raw[off++]!;
      const row = Buffer.from(raw.slice(off, off + stride));
      off += stride;
      if (f === 1) {
        for (let x = 0; x < stride; x++) row[x] = (row[x]! + (x >= bpp ? row[x - bpp]! : 0)) & 255;
      } else if (f === 2) {
        for (let x = 0; x < stride; x++) row[x] = (row[x]! + prev[x]!) & 255;
      } else if (f === 3) {
        for (let x = 0; x < stride; x++) {
          const left = x >= bpp ? row[x - bpp]! : 0;
          row[x] = (row[x]! + ((left + prev[x]!) >> 1)) & 255;
        }
      } else if (f === 4) {
        for (let x = 0; x < stride; x++) {
          const a = x >= bpp ? row[x - bpp]! : 0;
          const b = prev[x]!;
          const c = x >= bpp ? prev[x - bpp]! : 0;
          const p = a + b - c;
          const pa = Math.abs(p - a);
          const pb = Math.abs(p - b);
          const pc = Math.abs(p - c);
          row[x] = (row[x]! + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255;
        }
      }
      prev = row;
      for (let x = 0; x < w; x++) {
        const r = row[x * 4]!;
        const g = row[x * 4 + 1]!;
        const b = row[x * 4 + 2]!;
        const a = row[x * 4 + 3]!;
        if (a === 0) a0++;
        if (a > 20) {
          const s = r + g + b;
          if (s >= 200) bright++;
          if (Math.max(r, g, b) - Math.min(r, g, b) > 25 && s > 50) colored++;
          maxc = Math.max(maxc, r, g, b);
        }
      }
    }
    // Must not be the defective ecc9768b near-black opaque plate
    expect(a0).toBeGreaterThan(100_000);
    expect(colored).toBeGreaterThan(10_000);
    expect(bright).toBeGreaterThan(5_000);
    expect(maxc).toBeGreaterThan(200);
    expect(sha256(runtime)).not.toBe(
      "ecc9768b0105a33f297ff5782cd5c99b79ce40ed989261946f891c7ef52ffe4e",
    );
  });
});
