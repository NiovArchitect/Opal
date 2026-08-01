import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

describe("static security headers", () => {
  it("declares CSP and framing protection", () => {
    const headers = readFileSync(resolve(root, "public/_headers"), "utf8");
    expect(headers).toMatch(/X-Frame-Options:\s*DENY/i);
    expect(headers).toMatch(/Content-Security-Policy:/i);
    expect(headers).toMatch(/frame-ancestors 'none'/);
    expect(headers).toMatch(/X-Content-Type-Options:\s*nosniff/i);
  });

  it("does not enable source maps in vite production config", () => {
    const cfg = readFileSync(resolve(root, "vite.config.ts"), "utf8");
    expect(cfg).toMatch(/sourcemap:\s*false/);
  });
});
