import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CHATS, THREADS } from "./data";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

describe("product surface language", () => {
  it("source UI does not advertise demo", () => {
    const files = [
      "src/App.tsx",
      "src/OpalApp.tsx",
      "src/designTokens.ts",
      "src/data.ts",
      "index.html",
    ];
    for (const f of files) {
      const text = readFileSync(resolve(root, f), "utf8").toLowerCase();
      expect(text, f).not.toMatch(/\bdemo\b/);
      expect(text, f).not.toMatch(/\bsynthetic\b/);
    }
  });

  it("has real conversation fixtures", () => {
    expect(CHATS.length).toBeGreaterThanOrEqual(3);
    expect(THREADS.jordan?.length).toBeGreaterThanOrEqual(2);
  });
});
