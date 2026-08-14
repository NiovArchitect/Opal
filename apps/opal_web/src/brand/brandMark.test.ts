import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { BRAND, BRAND_ASSETS } from "./brand";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

const REJECTED_ARCS_SPIKE =
  "7b38bbaa130f319b8922a98406ab1806c76ea8261cd70ea8206996d3ad51e933";
const FOUNDER_SOURCE =
  "39a0f3b30eb4ef7714cfd1abd1ad1508dbf83eb704dc98ba4b8ecc32b4e9965c";

describe("brand mark source of truth (founder continuous orbital)", () => {
  it("ships semantic current mark / wordmark / lockup rasters", () => {
    for (const key of ["markCurrent", "wordmarkCurrent", "lockupCurrent"] as const) {
      const rel = BRAND_ASSETS[key].replace(/^\//, "public/");
      const abs = resolve(root, rel);
      expect(existsSync(abs), abs).toBe(true);
      const buf = readFileSync(abs);
      expect(buf[0]).toBe(0x89);
      expect(buf[1]).toBe(0x50);
      expect(buf.length).toBeGreaterThan(20_000);
    }
  });

  it("lockup current is byte-identical to founder source lockup", () => {
    const lockup = resolve(root, "public/brand/opal-lockup-current.png");
    const source = resolve(
      root,
      "public/brand/_source/a_clean_minimal_futuristic_brand_logo_layout_on.png",
    );
    expect(existsSync(source)).toBe(true);
    expect(sha256(lockup)).toBe(sha256(source));
    expect(sha256(lockup)).toBe(FOUNDER_SOURCE);
  });

  it("current mark is not the rejected arcs+spike raster", () => {
    const mark = resolve(root, "public/brand/opal-mark-current.png");
    expect(sha256(mark)).not.toBe(REJECTED_ARCS_SPIKE);
    // Legacy alias must also not be rejected family
    const legacy = resolve(root, "public/brand/opal-current-mark.png");
    if (existsSync(legacy)) {
      expect(sha256(legacy)).not.toBe(REJECTED_ARCS_SPIKE);
    }
  });

  it("production components do not load superseded asset paths", () => {
    const logo = readFileSync(resolve(root, "src/brand/OpalLogo.tsx"), "utf8");
    const brand = readFileSync(resolve(root, "src/brand/brand.ts"), "utf8");
    const prim = readFileSync(resolve(root, "src/opalUi/v2Primitives.tsx"), "utf8");
    const html = readFileSync(resolve(root, "index.html"), "utf8");
    // Runtime loaders must not point at clean-circle / lumen SVGs
    for (const body of [logo, prim, html]) {
      expect(body).not.toMatch(/opal-mark-current\.svg/);
      expect(body).not.toMatch(/opal-mark\.svg/);
      expect(body).not.toMatch(/lumen/i);
    }
    // brand.ts may document 77:8 as SUPERSEDED only
    expect(brand).toMatch(/supersededMarkNode:\s*"77:8"/);
    expect(brand).toMatch(/DO NOT USE/);
    expect(BRAND_ASSETS.markCurrent).toMatch(/opal-mark-current/);
    expect(BRAND_ASSETS.wordmarkCurrent).toBe("/brand/opal-wordmark-current.png");
    expect(BRAND_ASSETS.lockupCurrent).toBe("/brand/opal-lockup-current.png");
    // Presentation may use void-blend derivative; opaque master remains
    expect(existsSync(resolve(root, "public/brand/opal-mark-current.png"))).toBe(true);
    // Explicit semantic roles
    expect(logo).toMatch(/OpalMark/);
    expect(logo).toMatch(/OpalWordmark/);
    expect(logo).toMatch(/OpalLockup/);
    expect(prim).toMatch(/lockupCurrent|opal-lockup-current/);
    expect(html).toMatch(/favicon-mark\.png/);
  });

  it("Figma authority pointers remain 93:5/7/9; product valid; Figma pending", () => {
    expect(BRAND.figma.markNode).toBe("93:5");
    expect(BRAND.figma.wordmarkNode).toBe("93:7");
    expect(BRAND.figma.fullLockupNode).toBe("93:9");
    expect(BRAND.figma.brandAuthority).toBe("93:2");
    expect(BRAND.figma.supersededMarkNode).toBe("77:8");
    expect(BRAND.status.productBrandSource).toBe("VALID");
    expect(BRAND.status.figmaBrandSource).toBe("VALID");
    expect(BRAND.figma.implementFromFigma).toBe(true);
    expect(BRAND.figma.implementFromRepoAssets).toBe(true);
    expect(BRAND.figma.markNodeStatus).toMatch(/VALID/i);
    expect(BRAND.figma.wordmarkNodeStatus).toMatch(/VALID/i);
    expect(BRAND.figma.fullLockupNodeStatus).toMatch(/VALID/i);
  });

  it("rejects clean-circle as current product mark", () => {
    const circle = resolve(root, "public/brand/opal-mark-current.svg");
    if (existsSync(circle)) {
      expect(BRAND_ASSETS.markCurrent).not.toContain("opal-mark-current.svg");
    }
  });

  it("quarantines known rejected arcs+spike hash", () => {
    const q = resolve(root, "public/brand/_quarantine/REJECTED-arcs-spike-opal-current-mark.png");
    expect(existsSync(q)).toBe(true);
    expect(sha256(q)).toBe(REJECTED_ARCS_SPIKE);
  });
});
