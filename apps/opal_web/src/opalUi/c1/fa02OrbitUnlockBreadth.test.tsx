/**
 * @vitest-environment node
 *
 * Repair #19 W25 (FA-02) — SERVED-BREADTH RENDERED CASE for the
 * orbit unlock prompt.
 *
 * W22 J7 charged the prompt as rendered-broken on the served
 * build: TopLayer portals it to body level, outside the
 * [data-design="r18"] wrappers, so its only CSS rule (c1.css's
 * scoped .c1-rail-scrim) never matched — position:static,
 * in-flow under the rail, submit untappable (elementFromPoint at
 * the input/submit centers was NOT those elements; a Playwright
 * tap timed out on actionability, twice). The keyboard-submit
 * path worked, which is how the defect hid.
 *
 * This pin runs the REAL served composition in real Chromium at
 * 390×844, in BOTH modes: the real CenterSessionList inside a
 * [data-design="r18"] host wrapper (as C1ShellHosts mounts it),
 * the real OrbitUnlockPrompt portaled out of it by the real
 * TopLayer, the production stylesheets in served order, and the
 * host's gate wiring (requestUnlock opens the prompt; only a
 * successful verify joins the unlocked set). It then TAPS —
 * header tap -> prompt visible AND hittable (computed position
 * fixed; elementFromPoint at the input and submit centers
 * returns those elements) -> wrong code shows the error line ->
 * right code unlocks and the group expands.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { build } from "esbuild";
import { chromium } from "playwright-core";
import { describe, expect, it } from "vitest";

const WEB_ROOT = resolve(__dirname, "../../..");
const SRC = resolve(WEB_ROOT, "src");

/** The production sheets that govern this surface, in served order. */
const SHEETS = [
  "src/theme/layerTokens.css",
  "src/theme/c2Tokens.css",
  "src/opalUi/c1/c1.css",
  "src/opalUi/c1/OrbitUnlockPrompt.css",
];

function chromiumPath(): string {
  const base = resolve(homedir(), ".cache/ms-playwright");
  return resolve(
    base,
    "chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell",
  );
}

const HARNESS_ENTRY = `
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { CenterSessionList, type OrbitGate } from ${JSON.stringify(resolve(SRC, "opalUi/c1/C1Surfaces"))};
import { OrbitUnlockPrompt } from ${JSON.stringify(resolve(SRC, "opalUi/c1/OrbitUnlockPrompt"))};
import type { PersonOpalSessionRow } from ${JSON.stringify(resolve(SRC, "opalUi/c1/opalChatScope"))};

const SESSIONS: PersonOpalSessionRow[] = [
  {
    id: "o1",
    title: "Cy secret one",
    preview: "cy latest secret",
    timeLabel: "1h",
    isActive: false,
    context: null,
    updatedAt: "2026-10-18T19:00:00Z",
    anchor: { type: "person", id: "user-c", label: "Cy", private: true },
  },
];

function Harness() {
  const [unlocked, setUnlocked] = useState<ReadonlySet<string>>(new Set());
  const [promptKey, setPromptKey] = useState<string | null>(null);
  const gate: OrbitGate = {
    isUnlocked: (k) => unlocked.has(k),
    requestUnlock: (k) => setPromptKey(k),
  };
  return (
    <div data-design="r18">
      <CenterSessionList
        sessions={SESSIONS}
        orbitGate={gate}
        onNewChat={() => undefined}
        onOpen={() => undefined}
      />
      {promptKey ? (
        <OrbitUnlockPrompt
          orbitLabel="Cy"
          passcodeSet={true}
          onVerify={async (code) => code === "2468"}
          onSetPasscode={async () => false}
          onUnlocked={() => {
            setUnlocked((prev) => new Set(prev).add(promptKey));
            setPromptKey(null);
          }}
          onClose={() => setPromptKey(null)}
        />
      ) : null}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<Harness />);
`;

async function bundleHarness(): Promise<string> {
  const dir = resolve(WEB_ROOT, "node_modules/.cache/fa02-harness");
  mkdirSync(dir, { recursive: true });
  const entry = resolve(dir, "entry.tsx");
  writeFileSync(entry, HARNESS_ENTRY);
  const outfile = resolve(dir, "bundle.js");
  await build({
    entryPoints: [entry],
    bundle: true,
    format: "iife",
    platform: "browser",
    jsx: "automatic",
    outfile,
    loader: { ".css": "css", ".png": "dataurl", ".svg": "dataurl", ".jpg": "dataurl" },
    logLevel: "silent",
  });
  return outfile;
}

describe("FA-02 — the orbit unlock prompt renders as a hittable modal at served breadth", () => {
  it("header tap -> prompt fixed + hittable -> wrong code errors -> right code unlocks + group expands (both modes)", async () => {
    const bundlePath = await bundleHarness();
    const css = SHEETS.map((f) => readFileSync(resolve(WEB_ROOT, f), "utf8")).join("\n");
    const bundleCssPath = bundlePath.replace(/\.js$/, ".css");
    const bundleCss = existsSync(bundleCssPath) ? readFileSync(bundleCssPath, "utf8") : "";

    const browser = await chromium.launch({ executablePath: chromiumPath() });
    try {
      for (const mode of ["dark", "light"] as const) {
        const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
        await page.setContent(
          `<!doctype html><html data-mode="${mode}"><head><meta charset="utf-8"><style>
            html, body { margin: 0; padding: 0; }
            ${css}
            ${bundleCss}
          </style></head><body><div id="root"></div></body></html>`,
        );
        await page.addScriptTag({ path: bundlePath });

        const header = page.locator('[data-testid="orbit-group-header"]');
        await header.waitFor({ state: "visible" });
        expect(await header.textContent()).toContain("Opal chats hidden");
        expect(await page.locator("body").textContent()).not.toContain("cy latest secret");

        // Header TAP opens the prompt (Playwright actionability is
        // itself part of the exercise).
        await header.click();
        const prompt = page.locator('[data-testid="orbit-unlock-prompt"]');
        await prompt.waitFor({ state: "visible" });

        const geo = await page.evaluate(() => {
          const root = document.querySelector('[data-testid="orbit-unlock-prompt"]')!;
          const cs = getComputedStyle(root);
          const r = root.getBoundingClientRect();
          const hit = (sel: string) => {
            const el = document.querySelector(sel)!;
            const b = el.getBoundingClientRect();
            const cx = b.left + b.width / 2;
            const cy = b.top + b.height / 2;
            const hitEl = document.elementFromPoint(cx, cy);
            return {
              rect: { x: b.x, y: b.y, width: b.width, height: b.height },
              hitIsSelf: hitEl === el || el.contains(hitEl),
            };
          };
          return {
            position: cs.position,
            scrimRect: { x: r.x, y: r.y, width: r.width, height: r.height },
            input: hit('[data-testid="orbit-unlock-code"]'),
            submit: hit('[data-testid="orbit-unlock-submit"]'),
          };
        });

        // The designed modal: fixed overlay covering the viewport,
        // input + submit actually hittable at their centers (the
        // exact checks that FAILED in W22: position was static,
        // rect y=681 h=163, elementFromPoint missed both).
        expect(geo.position).toBe("fixed");
        expect(geo.scrimRect).toEqual({ x: 0, y: 0, width: 390, height: 844 });
        expect(geo.input.hitIsSelf).toBe(true);
        expect(geo.submit.hitIsSelf).toBe(true);
        expect(geo.input.rect.width).toBeGreaterThan(200);
        expect(geo.submit.rect.width).toBeGreaterThan(100);

        // Wrong code, submitted by TAPPING submit: the error line
        // shows, the prompt stays, the orbit stays locked.
        await page.locator('[data-testid="orbit-unlock-code"]').click();
        await page.keyboard.type("1111");
        await page.locator('[data-testid="orbit-unlock-submit"]').click();
        const error = page.locator('[data-testid="orbit-unlock-error"]');
        await error.waitFor({ state: "visible" });
        expect(await error.textContent()).toContain("That code did not open it.");
        await prompt.waitFor({ state: "visible" });
        expect(await page.locator("body").textContent()).not.toContain("cy latest secret");

        // Right code by tap: prompt closes, group unlocks, and a
        // header tap now EXPANDS it to reveal the orbit's rows.
        await page.locator('[data-testid="orbit-unlock-code"]').click();
        await page.keyboard.type("2468");
        await page.locator('[data-testid="orbit-unlock-submit"]').click();
        await prompt.waitFor({ state: "detached" });
        expect(await header.textContent()).not.toContain("Opal chats hidden");
        await header.click();
        const group = page.locator('[data-testid="orbit-group"]');
        await page.waitForFunction(
          () =>
            document
              .querySelector('[data-testid="orbit-group"]')
              ?.getAttribute("data-expanded") === "true",
        );
        expect(await group.getAttribute("data-expanded")).toBe("true");
        expect(await page.locator("body").textContent()).toContain("Cy secret one");

        await page.close();
      }
    } finally {
      await browser.close();
    }
  }, 180_000);
});
