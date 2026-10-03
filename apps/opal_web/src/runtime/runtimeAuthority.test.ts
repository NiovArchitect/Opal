import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("runtime authority helper", () => {
  it("installs window.__opalRuntimeAuthority from Vite SHA + server merge", () => {
    const src = readFileSync(resolve(__dirname, "runtimeAuthority.ts"), "utf8");
    const main = readFileSync(resolve(__dirname, "../main.tsx"), "utf8");
    expect(src).toMatch(/window\.__opalRuntimeAuthority/);
    expect(src).toMatch(/\/api\/dev\/runtime-authority/);
    expect(src).toMatch(/__OPAL_GIT_HEAD__/);
    expect(src).toMatch(/installRuntimeAuthority/);
    expect(main).toMatch(/installRuntimeAuthority\(\)/);
  });
});
