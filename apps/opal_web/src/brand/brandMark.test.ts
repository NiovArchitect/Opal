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
    for (const key of [
      "opalGraphEmblem",
      "opalGraphEmblemMaster",
      "opalGraphEmblemHero",
      "opalGraphEmblemDock",
      "graphAppIcon180",
    ] as const) {
      const rel = BRAND_ASSETS[key].replace(/^\//, "public/");
      const abs = resolve(root, rel);
      expect(existsSync(abs), abs).toBe(true);
      const buf = readFileSync(abs);
      expect(buf[0]).toBe(0x89);
      expect(buf[1]).toBe(0x50);
      expect(buf.length).toBeGreaterThan(1000);
    }
    expect(existsSync(resolve(root, "public/favicon-opal-graph-spectral.png"))).toBe(true);
  });

  it("create dock is not customer-exposed until Graph create (S5)", () => {
    expect(CREATE_DOCK_EXPOSED).toBe(false);
    expect(BRAND.status.createDock).toMatch(/DEFERRED/);
  });

  it("current mark is not the rejected arcs+spike raster", () => {
    const mark = resolve(root, "public/brand/opal-graph/opal-graph-emblem-master.png");
    expect(sha256(mark)).not.toBe(REJECTED_ARCS_SPIKE);
  });

  it("production components load Opal Graph symbol, not Opposing arcs", () => {
    const logo = readFileSync(resolve(root, "src/brand/OpalLogo.tsx"), "utf8");
    const brand = readFileSync(resolve(root, "src/brand/brand.ts"), "utf8");
    const html = readFileSync(resolve(root, "index.html"), "utf8");
    expect(logo).toMatch(/BRAND_ASSETS\.opalGraphEmblem|opalGraphEmblem/);
    expect(logo).toMatch(/OpalMark/);
    expect(logo).toMatch(/OpalWordmark/);
    expect(logo).toMatch(/OpalLockup/);
    expect(brand).toMatch(/Opal Graph/);
    expect(brand).toMatch(/opalGraphEmblem:\s*"\/brand\/opal-graph\/opal-graph-emblem-(512|2240-derivative)\.png"/);
    expect(brand).toMatch(/supersededMarkNode:\s*"77:8"/);
    expect(brand).toMatch(/DO NOT USE/);
    expect(html).toMatch(/Opal Graph/);
    expect(html).toMatch(/favicon-opal-graph-spectral\.png/);
    expect(BRAND_ASSETS.markCurrent).toMatch(/opal-graph\/opal-graph-emblem/);
    expect(BRAND.figma.coherenceLock).toBe("570:7");
    expect(BRAND.figma.recoveryLock).toBe("562:162");
    expect(BRAND.figma.homeHeader).toMatch(/618:48|287:7/);
    expect(BRAND.figma.promise).toBe("646:2");
    expect(BRAND.figma.splash).toMatch(/618:19|327:5/);
    expect(BRAND.figma.dockMicroEmblem).toBe("568:2"); // lineage only
    expect(BRAND.figma.centerOpalRest).toBe("645:3");
    expect(BRAND.figma.supersededSpectralScreens).toContain("554:5");
    expect(BRAND_ASSETS.opalCenterOpalRest645).toMatch(/opal-center-opal-645-3-rest-512\.png/);
    expect(BRAND_ASSETS.opalDockOrbTrio).toMatch(/opal-center-opal-645-3-rest-512\.png/);
    expect(BRAND.figma.p0RuntimeCoherenceRecovery).toBe("594:2");
    expect(BRAND.figma.frozenAssetProvenanceLock).toBe("615:2");
    expect(BRAND.figma.promiseExact || BRAND.figma.promise).toMatch(/646:2/);
    expect(BRAND.status.trioVisualAuthority).toBe("645:3");
    expect(BRAND.figma.datedAuthorityPage).toBe("618:2");
    expect(BRAND.figma.globalOpal).toBe("618:902");
    expect(BRAND.figma.journey).toBe("618:816");
  });

  it("shell documents deferred create without dead button", () => {
    const app = readFileSync(resolve(root, "src/OpalApp.tsx"), "utf8");
    expect(app).toMatch(/data-create-dock/);
    expect(app).toMatch(/CREATE_DOCK_EXPOSED/);
    expect(app).toMatch(/data-nav-model="home-chats-opal-graphs-you"/);
    // No active create tab button with dead onClick stub
    expect(app).not.toMatch(/member-tab-create/);
  });

  it("Figma brand lock pointers: 570:7 coherence; 160:2 symbol; 645:3 Center Opal", () => {
    expect(BRAND.figma.coherenceLock).toBe("570:7");
    expect(BRAND.figma.recoveryLock).toBe("562:162");
    expect(BRAND.figma.brandV4).toBe("528:25");
    expect(BRAND.figma.symbolVisualMaster).toBe("160:2");
    expect(BRAND.figma.symbolOnlyMaster).toBe("160:2");
    expect(BRAND.figma.dockMicroEmblem).toBe("568:2"); // superseded lineage
    expect(BRAND.figma.centerOpalRest).toBe("645:3");
    expect(BRAND.figma.dockOptionB).toBe("433:2");
    expect(BRAND.figma.splash).toMatch(/618:19|327:5/);
    expect(BRAND.figma.promise).toBe("646:2");
    expect(BRAND.figma.homeFeed).toMatch(/618:44|287:6/);
    expect(BRAND.figma.homeHeader).toMatch(/618:48|287:7/);
    expect(BRAND.figma.wordmarkOnly).toBe("161:3");
    expect(BRAND.figma.symbolDefective168).toBe("168:2");
    expect(BRAND.figma.defective168Status).toMatch(/DEFECTIVE|SUPERSEDED/);
    expect(BRAND.status.symbolVisualMaster).toBe("160:2");
    expect(BRAND_ASSETS.opalGraphEmblem).toMatch(/opal-graph-emblem-(512|2240-derivative)\.png/);
    expect(BRAND_ASSETS.opalCenterOpalRest645).toMatch(/opal-center-opal-645-3-rest-512\.png/);
    expect(BRAND_ASSETS.opalDockOrbTrio).toMatch(/opal-center-opal-645-3-rest-512\.png/);
    expect(BRAND_ASSETS.opalGraphEmblemHero).toMatch(/splash-2080-derivative|2240-derivative|emblem/);
    expect(BRAND_ASSETS.opalPromiseExact941).toMatch(/opal-promise-exact-941x1672\.png/);
    expect(BRAND.figma.p0RuntimeCoherenceRecovery).toBe("594:2");
    expect(BRAND.figma.frozenAssetProvenanceLock).toBe("615:2");
    expect(BRAND.figma.promise).toBe("646:2");
    expect(BRAND.status.trioOpenDefect).toMatch(/645_3|NONE_CURRENT/);
    expect(BRAND.status.trioSourceStatus).toMatch(/645_3|CANONICAL/);
  });

  it("canonical emblem master is not defective 168 plate and not legacy low-res alias", () => {
    const runtime = resolve(root, "public/brand/opal-graph/opal-graph-emblem-master.png");
    const dock112 = resolve(root, "public/brand/opal-graph/opal-dock-orb-trio-112.png");
    const dock256 = resolve(root, "public/brand/opal-graph/opal-dock-orb-trio-256.png");
    const dock512 = resolve(root, "public/brand/opal-graph/opal-dock-orb-trio-512.png");
    const defective = resolve(
      root,
      "public/brand/opal-graph/symbol-source-168-2-defective-black-plate.png",
    );
    const legacy = resolve(root, "public/brand/opal-graph/symbol-160-2-transparent.png");
    expect(existsSync(runtime)).toBe(true);
    expect(existsSync(dock112)).toBe(true);
    expect(existsSync(dock256)).toBe(true);
    expect(existsSync(dock512)).toBe(true);
    // P0.1: master points at 602:2 high-density DERIVATIVE (2240) — not native-proven
    expect(sha256(runtime)).toBe(
      "42cb7a672e42b2d6d1903e3b35a783ce8d45fb0cbe57b31e7b9fc279c917ee6c",
    );
    expect(sha256(runtime)).not.toBe(sha256(defective));
    expect(sha256(runtime)).not.toBe(sha256(legacy));
  });

  it("runtime symbol has true alpha and visible spectral color (not black plate)", () => {
    const zlib = require("node:zlib") as typeof import("node:zlib");
    const runtime = resolve(root, "public/brand/opal-graph/opal-graph-emblem-master.png");
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
    expect(w).toBe(2240);
    expect(h).toBe(2240);
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
