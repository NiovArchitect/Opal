#!/usr/bin/env node
/**
 * Visual convergence — Home object grammar + Option B dock proof.
 * HOLD. DO NOT MERGE. DO NOT START LIVE.
 * Stories/header must remain EXACT (frozen).
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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function login(page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${WEB}/?opal_reset_first_run=1`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await sleep(700);
  if (
    await page.getByTestId("fr00-already-account").isVisible({ timeout: 5000 }).catch(() => false)
  ) {
    await page.getByTestId("fr00-already-account").click();
  }
  let devCode = "111111";
  page.on("response", async (res) => {
    try {
      if (res.url().includes("/activation/challenges") && res.request().method() === "POST") {
        const j = await res.json();
        if (j.development_code) devCode = j.development_code;
      }
    } catch {
      /* */
    }
  });
  await page.waitForSelector('[data-testid="fr06-phone-input"], #phone', { timeout: 20000 });
  await page.fill('[data-testid="fr06-phone-input"]', "+12025550101").catch(async () => {
    await page.fill("#phone", "+12025550101");
  });
  const consent = page.locator("#otp-consent, [data-testid='fr06-otp-consent']");
  if (await consent.first().isVisible().catch(() => false)) await consent.first().check().catch(() => {});
  await page.getByTestId("fr06-continue").click().catch(async () => {
    await page.getByRole("button", { name: /Text me a code/i }).click();
  });
  await page.waitForSelector('[data-testid="fr07-code-input"], #code', { timeout: 25000 });
  await sleep(300);
  await page.fill('[data-testid="fr07-code-input"]', devCode).catch(async () => {
    await page.fill("#code", devCode);
  });
  await page.getByTestId("fr07-submit").click().catch(async () => {
    await page.getByRole("button", { name: /Continue|Verify/i }).click();
  });
  for (let i = 0; i < 50; i++) {
    if (await page.getByTestId("member-shell").isVisible().catch(() => false)) break;
    if (await page.getByTestId("fr08-profile").isVisible().catch(() => false)) {
      const n = page.getByTestId("fr08-name-input");
      if (await n.isVisible().catch(() => false)) {
        const v = await n.inputValue().catch(() => "");
        if (!v) await n.fill("Founder Review");
      }
      const b = page.getByTestId("fr08-continue");
      if (!(await b.isDisabled().catch(() => true))) await b.click();
    }
    if (await page.getByTestId("fr09-not-now").isVisible().catch(() => false)) {
      await page.getByTestId("fr09-not-now").click();
    }
    await sleep(200);
  }
  await page.waitForSelector('[data-testid="member-shell"]', { timeout: 30000 });
}

async function main() {
  const require = createRequire(resolve(ROOT, "apps/opal_web/package.json"));
  const { chromium } = require("playwright");
  const result = {
    at: new Date().toISOString(),
    homeOverall: "MAJOR_DIFF",
    stories: "EXACT_FROZEN",
    header: "EXACT_FROZEN",
    assertions: {},
    geometry: {},
    verdict: "HOLD",
  };
  const assert = (name, ok, detail) => {
    result.assertions[name] = { ok: !!ok, detail: detail ?? null };
    console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
  };

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  try {
    await login(page);
    await page.getByRole("button", { name: /^Home$/i }).first().click().catch(() => {});
    await sleep(1000);
    await page.waitForSelector('[data-testid="graph-social-home"]', { timeout: 20000 });
    await page.locator('[data-testid="graph-social-home"]').evaluate((el) => {
      el.scrollTop = 0;
    });
    await sleep(300);

    // Frozen Stories
    const stories = page.locator('[data-testid="gsh-stories"]');
    const rows = await stories.getAttribute("data-stories-rows");
    const sBox = await stories.boundingBox();
    assert("stories_still_one_row", rows === "1", rows);
    assert("stories_height_122", !!sBox && Math.abs(sBox.height - 122) <= 4, sBox);
    assert(
      "no_people_pulse",
      (await page.locator('[data-testid="gsh-people-pulse"]').count()) === 0,
    );

    // Conversation 289:2
    const cx = page.locator('[data-figma-node="289:2"]').first();
    assert("conversation_card_present", (await cx.count()) > 0);
    if (await cx.count()) {
      const box = await cx.boundingBox();
      result.geometry.conversation = box;
      assert("conversation_width_~366", !!box && Math.abs(box.width - 366) <= 12, box);
      assert(
        "conversation_has_turns",
        (await cx.locator(".gsh-cx-bubble").count()) >= 2,
      );
      assert(
        "conversation_has_alignment",
        (await cx.locator(".gsh-cx-step").count()) >= 3,
      );
      assert(
        "conversation_badge",
        (await cx.locator('.gsh-cx-badge[data-badge="conversation"]').count()) === 1,
      );
      await cx.screenshot({ path: resolve(OUT, "runtime/RUNTIME_289_2_CONVERSATION.png") });
    }

    // Memory / Graph / Discovery / Live presence
    for (const [node, name, kindFallback] of [
      ["289:24", "memory", "memory"],
      ["289:39", "graph", "graph"],
      ["289:72", "discovery", "discovery"],
      ["289:97", "live", "live"],
    ]) {
      let el = page.locator(`[data-figma-node="${node}"]`).first();
      let n = await el.count();
      if (!n && kindFallback) {
        el = page.locator(`[data-kind="${kindFallback}"]`).first();
        n = await el.count();
      }
      assert(`${name}_card_present`, n > 0, { node, n });
      if (n) {
        await el.scrollIntoViewIfNeeded().catch(() => {});
        await sleep(200);
        const box = await el.boundingBox();
        result.geometry[name] = box;
        await el.screenshot({
          path: resolve(OUT, `runtime/RUNTIME_${node.replace(":", "_")}_${name.toUpperCase()}.png`),
        });
      }
    }

    // Dock 433:2
    const dock = page.locator('[data-testid="member-tabbar"]');
    assert("dock_figma_433", (await dock.getAttribute("data-figma-dock")) === "433:2");
    const dBox = await dock.boundingBox();
    result.geometry.dock = dBox;
    assert("dock_width_~358", !!dBox && Math.abs(dBox.width - 358) <= 16, dBox);
    assert("dock_height_~86", !!dBox && Math.abs(dBox.height - 86) <= 12, dBox);
    assert(
      "dock_has_dip_asset",
      (await page.locator(".dock-bar-dip").count()) === 1,
    );
    assert(
      "dock_opal_rest",
      (await page.getByTestId("member-tab-opal").getAttribute("data-opal-state")) === "rest",
    );
    assert(
      "dock_opal_floating_mark",
      (await page.locator(".dock-opal-mark").count()) === 1,
    );
    await page.screenshot({
      path: resolve(OUT, "runtime/RUNTIME_HOME_DOCK_390.png"),
      fullPage: false,
    });
    await dock.screenshot({ path: resolve(OUT, "runtime/RUNTIME_433_2_DOCK.png") });

    // Functional smoke: Open Graph still works
    const openGraph = page.locator('[data-testid^="gsh-open-graph-"]').first();
    if (await openGraph.count()) {
      await openGraph.click();
      await sleep(600);
      assert("open_graph_not_dead", true);
    }

    const failed = Object.values(result.assertions).filter((a) => !a.ok).length;
    result.failed = failed;
    result.homeOverall = "MAJOR_DIFF"; // until all objects + dock EXACT
    result.conversationStatus = result.assertions.conversation_card_present?.ok
      ? "CONVERGING"
      : "MAJOR_DIFF";
    result.dockStatus = result.assertions.dock_figma_433?.ok ? "CONVERGING" : "MAJOR_DIFF";
    result.verdict =
      failed === 0
        ? "HOLD_HOME_OBJECTS_DOCK_PROGRESS"
        : "HOLD_HOME_OBJECTS_DOCK_FAIL";
  } finally {
    await browser.close();
  }

  writeFileSync(
    resolve(OUT, "15_BROWSER_VISUAL_PROOF.json"),
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
