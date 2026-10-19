/**
 * @vitest-environment node
 *
 * Repair #19 W21 (F4) — Center NEEDS YOU queue titles must never
 * clip mid-phrase without ellipsis. The deck title treatment is
 * pinned on the stylesheet (jsdom cannot compute text overflow):
 * .reveal-title is single-line with hidden overflow and the
 * designed ellipsis.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const WEB_ROOT = resolve(__dirname, "../../..");

describe("F4 — reveal (Center queue) titles ellipsize, never clip silently", () => {
  it(".reveal-title is single-line nowrap + overflow hidden + text-overflow ellipsis", () => {
    const css = readFileSync(resolve(WEB_ROOT, "src/opalUi/c1/RevealCard.css"), "utf8");
    const block = css.match(/\.reveal-title\s*\{([^}]*)\}/);
    expect(block, ".reveal-title rule exists").not.toBeNull();
    const decls = block![1].replace(/\/\*[\s\S]*?\*\//g, "");
    expect(decls).toMatch(/white-space:\s*nowrap/);
    expect(decls).toMatch(/overflow:\s*hidden/);
    expect(decls).toMatch(/text-overflow:\s*ellipsis/);
  });
});
