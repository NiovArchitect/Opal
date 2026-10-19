/**
 * Repair #19 W21 (F1) — the CSP pin for the authenticated image
 * path. AuthedImage renders blob: object URLs; the served CSP
 * (index.html meta + public/_headers, kept in lockstep) must
 * allow blob: in img-src or every authed image is blocked by the
 * platform gate and the wells silently fall back — the exact
 * failure the first W21 capture round proved (fetches 200,
 * wells still monograms). Pin both carriers.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const WEB_ROOT = resolve(__dirname, "../..");

function imgSrcOf(csp: string): string {
  const m = csp.match(/img-src\s+([^;]+);/);
  return m ? m[1] : "";
}

describe("F1 CSP pin — blob: images allowed in both CSP carriers", () => {
  it("index.html meta CSP allows blob: in img-src", () => {
    const html = readFileSync(resolve(WEB_ROOT, "index.html"), "utf8");
    expect(imgSrcOf(html)).toContain("blob:");
  });

  it("public/_headers CSP allows blob: in img-src", () => {
    const headers = readFileSync(resolve(WEB_ROOT, "public/_headers"), "utf8");
    expect(imgSrcOf(headers)).toContain("blob:");
  });
});
