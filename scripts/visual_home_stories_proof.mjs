#!/usr/bin/env node
/**
 * Visual convergence — Home Stories ONE ROW proof (Figma 287:20).
 * HOLD. DO NOT MERGE. DO NOT START LIVE.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WEB = (process.env.WEB_BASE || "http://127.0.0.1:5173").replace(/\/$/, "");
const OUT = resolve(
  ROOT,
  "docs/evidence/v2-coded-experience/social-flow-final-convergence/visual-convergence",
);
mkdirSync(resolve(OUT, "runtime"), { recursive: true });
mkdirSync(resolve(OUT, "diffs"), { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function login(page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${WEB}/?opal_reset_first_run=1`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await sleep(800);
  if (
    await page
      .getByTestId("fr00-already-account")
      .isVisible({ timeout: 5000 })
      .catch(() => false)
  ) {
    await page.getByTestId("fr00-already-account").click();
  } else if (await page.getByTestId("fr00-skip-intro").isVisible().catch(() => false)) {
    await page.getByTestId("fr00-skip-intro").click();
    await sleep(400);
    if (await page.getByTestId("fr05-already-account").isVisible().catch(() => false)) {
      await page.getByTestId("fr05-already-account").click();
    } else if (await page.getByTestId("fr05-continue-phone").isVisible().catch(() => false)) {
      await page.getByTestId("fr05-continue-phone").click();
    }
  }
  await sleep(500);
  let devCode = "111111";
  page.on("response", async (res) => {
    try {
      if (
        res.url().includes("/product/activation/challenges") &&
        res.request().method() === "POST"
      ) {
        const j = await res.json();
        if (j.development_code) devCode = j.development_code;
      }
    } catch {
      /* ignore */
    }
  });
  await page.waitForSelector('[data-testid="fr06-phone-input"], #phone', { timeout: 20000 });
  if (await page.getByTestId("fr06-phone-input").isVisible().catch(() => false)) {
    await page.fill('[data-testid="fr06-phone-input"]', "+12025550101");
  } else await page.fill("#phone", "+12025550101");
  const consent = page.locator("#otp-consent, [data-testid='fr06-otp-consent']");
  if (await consent.first().isVisible().catch(() => false)) {
    await consent.first().check().catch(() => {});
  }
  if (await page.getByTestId("fr06-continue").isVisible().catch(() => false)) {
    await page.getByTestId("fr06-continue").click();
  } else {
    await page.getByRole("button", { name: /Text me a code/i }).first().click();
  }
  await page.waitForSelector('[data-testid="fr07-code-input"], #code', { timeout: 25000 });
  await sleep(400);
  if (await page.getByTestId("fr07-code-input").isVisible().catch(() => false)) {
    await page.fill('[data-testid="fr07-code-input"]', devCode);
    await page.getByTestId("fr07-submit").click();
  } else {
    await page.fill("#code", devCode);
    await page.getByRole("button", { name: /Continue|Verify/i }).first().click();
  }
  for (let i = 0; i < 40; i++) {
    if (await page.getByTestId("member-shell").isVisible().catch(() => false)) return;
    if (await page.getByTestId("fr08-profile").isVisible().catch(() => false)) break;
    await sleep(250);
  }
  if (await page.getByTestId("fr08-profile").isVisible().catch(() => false)) {
    if (await page.getByTestId("fr08-name-input").isVisible().catch(() => false)) {
      const v = await page.getByTestId("fr08-name-input").inputValue().catch(() => "");
      if (!v) await page.fill('[data-testid="fr08-name-input"]', "Founder Review");
    }
    for (let i = 0; i < 30; i++) {
      const btn = page.getByTestId("fr08-continue");
      if (!(await btn.isDisabled().catch(() => true))) {
        await btn.click();
        break;
      }
      await sleep(200);
    }
  }
  for (let i = 0; i < 20; i++) {
    if (await page.getByTestId("member-shell").isVisible().catch(() => false)) return;
    if (await page.getByTestId("fr09-not-now").isVisible().catch(() => false)) {
      await page.getByTestId("fr09-not-now").click();
      await sleep(300);
      continue;
    }
    await sleep(300);
  }
  await page.waitForSelector('[data-testid="member-shell"]', { timeout: 30000 });
}

async function main() {
  const require = createRequire(resolve(ROOT, "apps/opal_web/package.json"));
  const { chromium } = require("playwright");
  const result = {
    at: new Date().toISOString(),
    figma: { home: "287:6", stories: "287:20", storiesExact: "390x122 one row" },
    assertions: {},
    verdict: "HOLD",
  };
  const assert = (name, ok, detail) => {
    result.assertions[name] = { ok: !!ok, detail: detail ?? null };
    console.log(`${ok ? "PASS" : "FAIL"} ${name}`, detail ?? "");
  };

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  try {
    await login(page);
    // Ensure Home dock
    const homeTab = page.locator('[data-testid="dock-home"], [aria-label="Home"]').first();
    if (await homeTab.count()) await homeTab.click().catch(() => {});
    await page.getByRole("button", { name: /^Home$/i }).first().click().catch(() => {});
    await sleep(1200);
    await page.waitForSelector('[data-testid="graph-social-home"]', { timeout: 20000 });

    const stories = page.locator('[data-testid="gsh-stories"]');
    await stories.waitFor({ timeout: 10000 });
    const rows = await stories.getAttribute("data-stories-rows");
    const box = await stories.boundingBox();
    const rail = page.locator('[data-testid="gsh-stories-rail"]');
    const railMetrics = await rail.evaluate((el) => {
      const cs = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return {
        flexWrap: cs.flexWrap,
        flexDirection: cs.flexDirection,
        overflowX: cs.overflowX,
        overflowY: cs.overflowY,
        height: Math.round(rect.height),
        width: Math.round(rect.width),
        childCount: el.children.length,
      };
    });
    const pulse = await page.locator('[data-testid="gsh-people-pulse"]').count();
    const tagline = await page.locator('[data-testid="gsh-tagline"]').textContent();
    const topBox = await page.locator('[data-testid="gsh-top"]').boundingBox();

    assert("stories_present", (await stories.count()) === 1);
    assert("stories_rows_attr_1", rows === "1", rows);
    assert(
      "stories_height_122",
      box && Math.abs(box.height - 122) <= 4,
      box,
    );
    assert("stories_nowrap", railMetrics.flexWrap === "nowrap", railMetrics);
    assert("stories_row_direction", railMetrics.flexDirection === "row", railMetrics);
    assert("stories_overflow_x_auto", /auto|scroll/.test(railMetrics.overflowX), railMetrics);
    assert("stories_overflow_y_hidden", railMetrics.overflowY === "hidden", railMetrics);
    assert("no_people_pulse_second_row", pulse === 0, { pulse });
    assert(
      "header_tagline",
      /your social world, in motion/i.test(tagline || ""),
      tagline,
    );
    assert(
      "header_height_58",
      topBox && Math.abs(topBox.height - 58) <= 4,
      topBox,
    );
    assert("story_cells_count_5", railMetrics.childCount === 5, railMetrics);

    await stories.screenshot({
      path: resolve(OUT, "runtime/RUNTIME_STORIES_RAIL.png"),
    });
    await page.screenshot({
      path: resolve(OUT, "runtime/RUNTIME_HOME_390.png"),
      fullPage: false,
    });

    const failed = Object.values(result.assertions).filter((a) => !a.ok).length;
    result.verdict =
      failed === 0
        ? "HOLD_STORIES_ONE_ROW_PASS"
        : "HOLD_STORIES_VISUAL_FAIL";
    result.failed = failed;
  } finally {
    await browser.close();
  }

  writeFileSync(resolve(OUT, "15_BROWSER_VISUAL_PROOF.json"), JSON.stringify(result, null, 2));
  writeFileSync(resolve(OUT, "03_STORIES_ONE_ROW.md"), `# Stories one-row proof\n\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\`\n`);
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
